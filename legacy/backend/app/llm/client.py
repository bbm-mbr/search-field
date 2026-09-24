"""Anthropic vertex-format client for the corporate LLM Farm.

The farm exposes Claude via Google Vertex AI rawPredict:
  POST {base}/api/google/v1/publishers/anthropic/models/{model}:rawPredict

Vertex API rules (different from the direct Anthropic API):
  - "system" must be a TOP-LEVEL string field, NOT a role in messages[].
  - messages[] must contain only "user" / "assistant" roles.
  - Body: {"anthropic_version": "vertex-2023-10-16", "system": "...", "messages": [...], ...}
  - Response: {"content": [{"type": "text", "text": "..."}], ...}
"""
import json
import logging
import httpx
from ..config import get_settings

log = logging.getLogger(__name__)
_settings = get_settings()

_MODEL_ALIASES: dict[str, str] = {
    "claude-haiku-4-5": "claude-haiku-4-5@20251001",
}

_JSON_SUFFIX = (
    "\n\nIMPORTANT: Your ENTIRE response must be a single valid JSON object. "
    "No markdown fences, no explanation outside the JSON object."
)


def _url(model: str) -> str:
    aliased = _MODEL_ALIASES.get(model, model)
    return (
        f"{_settings.model_farm_base_url}"
        f"/api/google/v1/publishers/anthropic/models/{aliased}:rawPredict"
    )


def _headers() -> dict[str, str]:
    return {
        "Authorization": f"Bearer {_settings.model_farm_api_key}",
        "Content-Type": "application/json",
    }


def _split_messages(messages: list[dict]) -> tuple[str | None, list[dict]]:
    """Extract role='system' entries into a top-level system string.

    Vertex format forbids system inside messages[]; it must be a top-level key.
    """
    system_parts: list[str] = []
    conversation: list[dict] = []
    for m in messages:
        if m["role"] == "system":
            system_parts.append(m["content"])
        else:
            conversation.append(m)
    return ("\n\n".join(system_parts) if system_parts else None), conversation


def chat(
    messages: list[dict],
    model: str | None = None,
    temperature: float = 0.2,
    json_mode: bool = False,
    max_tokens: int = 4000,
) -> str:
    model = model or _settings.analysis_model
    system, conversation = _split_messages(messages)

    if json_mode:
        system = (system or "") + _JSON_SUFFIX

    payload: dict = {
        "anthropic_version": "vertex-2023-10-16",
        "max_tokens": max_tokens,
        "messages": conversation,
    }
    if system:
        payload["system"] = system
    # Only send temperature if non-default (some proxy configs reject the field)
    if temperature != 1.0:
        payload["temperature"] = temperature

    try:
        resp = httpx.post(_url(model), headers=_headers(), json=payload, timeout=120)
        if not resp.is_success:
            # Always log the body so we can debug farm-side errors
            log.error(
                "LLM farm %s — HTTP %s\nURL: %s\nBody: %s",
                resp.status_code, model, _url(model), resp.text[:2000],
            )
        resp.raise_for_status()
        return resp.json()["content"][0]["text"]
    except httpx.HTTPStatusError:
        raise
    except Exception as exc:
        log.error("LLM farm connection error (%s): %s", type(exc).__name__, exc)
        raise


def chat_json(
    messages: list[dict],
    model: str | None = None,
    temperature: float = 0.1,
) -> dict:
    """Request strict JSON and parse defensively (strips code fences)."""
    raw = chat(messages, model=model, temperature=temperature, json_mode=True)
    cleaned = (
        raw.strip()
        .removeprefix("```json")
        .removeprefix("```")
        .removesuffix("```")
        .strip()
    )
    return json.loads(cleaned)

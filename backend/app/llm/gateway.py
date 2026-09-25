"""One client for every model on the Bosch LLM Farm.

Three wire formats sit behind the one farm domain:

  Claude   POST /api/google/v1/publishers/anthropic/models/{id}:rawPredict
           Bearer auth; `system` is a top-level string, never a message role.
           Server-side web search: {"type": "web_search_20250305", "name": "web_search"}
  Gemini   POST /api/google/v1/publishers/google/models/{id}:generateContent
           `genaiplatform-farm-subscription-key` header.
           Grounding: {"google_search": {}}
  OpenAI   POST /api/openai/deployments/{id}/chat/completions?api-version=...
           Bearer auth; `max_completion_tokens`, not `max_tokens`.

The pipeline calls `run(task, ...)`, which walks the tier's fallback chain and
puts every web-searching call through the monthly cap in quota.py.
"""
from __future__ import annotations

import time
from dataclasses import dataclass, field
from typing import List, Optional

import httpx

from ..config import get_settings
from . import quota
from .routing import CLAUDE, EMBED, GEMINI, OPENAI, TASK_EFFORT, Model, chain_for


@dataclass
class LLMResult:
    model: str
    text: str
    input_tokens: int = 0
    output_tokens: int = 0
    latency_s: float = 0.0
    citations: List[dict] = field(default_factory=list)
    searches: int = 0
    raw: dict = field(default_factory=dict, repr=False)   # full response, for grounding metadata
    truncated: bool = False                               # hit the token limit: re-ask, never repair
    thinking_tokens: int = 0                              # part of output_tokens: billed, never shown


class FarmError(RuntimeError):
    pass


def _client() -> httpx.Client:
    get_settings()  # exports HTTPS_PROXY before httpx reads the environment
    return httpx.Client(timeout=httpx.Timeout(300, connect=20), trust_env=True)


def call(model: Model, prompt: str, *, system: Optional[str] = None, max_tokens: int = 1024,
         temperature: Optional[float] = 0.2, web_search: bool = False,
         effort: Optional[str] = None) -> LLMResult:
    s = get_settings()
    if not s.farm_api_key:
        raise FarmError("LLM_FARM_API_KEY is not set in backend/.env")
    if web_search and not model.web_search:
        raise FarmError(f"{model.id} cannot search the web under the Bosch org policy")
    base = s.farm_base_url.rstrip("/")
    t0 = time.perf_counter()

    with _client() as c:
        if model.family == CLAUDE:
            body = {"anthropic_version": s.anthropic_version, "max_tokens": max_tokens,
                    "messages": [{"role": "user", "content": prompt}]}
            if system:
                body["system"] = system
            if temperature is not None and model.temperature:
                body["temperature"] = temperature
            if effort and model.effort:
                body["output_config"] = {"effort": effort}
            if web_search:
                body["tools"] = [{"type": "web_search_20250305", "name": "web_search", "max_uses": 3}]
            r = c.post(f"{base}/api/google/v1/publishers/anthropic/models/{model.id}:rawPredict",
                       headers={"Authorization": f"Bearer {s.farm_api_key}"}, json=body)
            _raise(r, model)
            d = r.json()
            blocks = d.get("content", [])
            text = "".join(b.get("text", "") for b in blocks if b.get("type") == "text")
            cites = [{"url": ci.get("url"), "title": ci.get("title")}
                     for b in blocks if b.get("type") == "text" for ci in (b.get("citations") or [])]
            u = d.get("usage", {})
            return LLMResult(model.id, text, u.get("input_tokens", 0), u.get("output_tokens", 0),
                             time.perf_counter() - t0, cites,
                             (u.get("server_tool_use") or {}).get("web_search_requests", 0), d,
                             d.get("stop_reason") == "max_tokens",
                             (u.get("output_tokens_details") or {}).get("thinking_tokens", 0))

        if model.family == GEMINI:
            body = {"contents": [{"role": "user", "parts": [{"text": prompt}]}],
                    "generation_config": {"max_output_tokens": max_tokens}}
            if system:
                body["system_instruction"] = {"parts": [{"text": system}]}
            if web_search:
                body["tools"] = [{"google_search": {}}]
            r = c.post(f"{base}/api/google/v1/publishers/google/models/{model.id}:generateContent",
                       headers={"genaiplatform-farm-subscription-key": s.farm_api_key}, json=body)
            _raise(r, model)
            d = r.json()
            cand = (d.get("candidates") or [{}])[0]
            text = "".join(p.get("text", "") for p in (cand.get("content") or {}).get("parts", []))
            gm = cand.get("groundingMetadata") or cand.get("grounding_metadata") or {}
            cites = [{"url": (ch.get("web") or {}).get("uri"), "title": (ch.get("web") or {}).get("title")}
                     for ch in gm.get("groundingChunks") or gm.get("grounding_chunks") or []]
            u = d.get("usageMetadata") or d.get("usage_metadata") or {}
            # Thinking tokens count against max_output_tokens on Gemini 3.x (a
            # 260-token answer spent 925 thinking), so callers must budget for both.
            return LLMResult(model.id, text, u.get("promptTokenCount", 0),
                             u.get("candidatesTokenCount", 0) + u.get("thoughtsTokenCount", 0),
                             time.perf_counter() - t0, cites,
                             len(gm.get("webSearchQueries") or gm.get("web_search_queries") or []), d,
                             (cand.get("finishReason") or cand.get("finish_reason")) == "MAX_TOKENS")

        if model.family == OPENAI:
            msgs = ([{"role": "system", "content": system}] if system else []) + [{"role": "user", "content": prompt}]
            r = c.post(f"{base}/api/openai/deployments/{model.id}/chat/completions",
                       params={"api-version": s.azure_api_version},
                       headers={"Authorization": f"Bearer {s.farm_api_key}"},
                       json={"messages": msgs, "max_completion_tokens": max_tokens})
            _raise(r, model)
            d = r.json()
            u = d.get("usage", {})
            ch = d["choices"][0]
            return LLMResult(model.id, ch["message"].get("content") or "",
                             u.get("prompt_tokens", 0), u.get("completion_tokens", 0), time.perf_counter() - t0,
                             raw=d, truncated=ch.get("finish_reason") == "length")

        if model.family == EMBED:
            r = c.post(f"{base}/api/openai/deployments/{model.id}/embeddings",
                       params={"api-version": "2024-10-21"},
                       headers={"Authorization": f"Bearer {s.farm_api_key}"}, json={"input": [prompt]})
            _raise(r, model)
            d = r.json()
            return LLMResult(model.id, f"{len(d['data'][0]['embedding'])} dims",
                             (d.get("usage") or {}).get("prompt_tokens", 0), 0, time.perf_counter() - t0)

    raise FarmError(f"unknown model family {model.family}")


def run(task: str, prompt: str, *, run_id: Optional[int] = None, **kw) -> LLMResult:
    """Walk the task's fallback chain; the first model that answers wins.

    Web-searching calls go through the monthly cap: searches are reserved before
    the call and settled to the real count after it. A model whose provider is
    over its cap is skipped, so Gemini running out falls through to Haiku's
    (separately capped) search rather than failing the run."""
    grounded = kw.pop("web_search", task.startswith(("research.search", "verify", "size")))
    kw.setdefault("effort", TASK_EFFORT.get(task))
    errors = []
    for m in chain_for(task):
        ledger_id = None
        try:
            if grounded:
                ledger_id = quota.reserve(m, run_id)
            r = call(m, prompt, web_search=grounded, **kw)
            if ledger_id is not None:
                quota.settle(ledger_id, r.searches)
            return r
        except quota.QuotaExceeded as e:
            errors.append(str(e))
        except (FarmError, httpx.HTTPError) as e:
            # A failed request is not billed; keep the ledger honest.
            if ledger_id is not None:
                quota.release(ledger_id)
            errors.append(f"{m.id}: {e}")
    if errors and all("monthly cap" in e for e in errors):
        raise quota.QuotaExceeded(" | ".join(errors))
    raise FarmError(f"every model failed for task '{task}': " + " | ".join(errors))


def _raise(r: httpx.Response, model: Model) -> None:
    if r.status_code >= 400:
        raise FarmError(f"{model.id} HTTP {r.status_code}: {r.text[:300]}")

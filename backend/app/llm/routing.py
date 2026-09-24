"""Which model does which job — the cost policy, in one place.

Policy (agreed 2026-09-24): premium models only where the judgement genuinely
needs them, and sparingly; the best general-purpose model everywhere else.

  premium   Opus 5. The 18 field-level verdicts and AI Analyst syntheses, plus
            escalation when the critic and the author disagree on something
            material. Roughly 20-30 calls per full portfolio pass.
  standard  Sonnet 5. Framework writing (PESTEL, SWOT, market, Porter,
            competency, horizons, landscape) for fields AND the 83 sub-fields,
            and rubric scoring. The workhorse.
  fast      Haiku 4.5. News triage and tagging, JSON repair, short extraction.
  grounded  The only models the Bosch org policy lets search the web:
            Gemini 3.7 Flash, then Gemini 2.5 Pro, then Haiku 4.5. Sonnet and
            Opus return HTTP 400 on a grounded call regardless of capability.
  second    GPT-5.5. The blind second scorer and the critic — deliberately a
            different model family from the author, so it does not simply
            agree with itself.
  embed     text-embedding-3-small. Deduplication and matching news to fields.

Each task names a tier; each tier is an ordered fallback chain. Changing the
policy means editing this file only.
"""
from dataclasses import dataclass
from typing import Dict, List

CLAUDE, GEMINI, OPENAI, EMBED = "claude", "gemini", "openai", "embed"


@dataclass(frozen=True)
class Model:
    id: str            # identifier the farm expects in the URL
    family: str        # claude | gemini | openai | embed
    web_search: bool = False
    # Opus 5 and Sonnet 5 reject `temperature` on the farm ("deprecated",
    # HTTP 400, found by the smoke test 2026-09-24). Determinism for them comes
    # from the prompt and the validator, not from a sampling parameter.
    temperature: bool = True


OPUS_5 = Model("claude-opus-5", CLAUDE, temperature=False)
SONNET_5 = Model("claude-sonnet-5", CLAUDE, temperature=False)
SONNET_46 = Model("claude-sonnet-4-6", CLAUDE)
HAIKU_45 = Model("claude-haiku-4-5@20251001", CLAUDE, web_search=True)
GEMINI_37_FLASH = Model("gemini-3.7-flash", GEMINI, web_search=True)
GEMINI_25_PRO = Model("gemini-2.5-pro", GEMINI, web_search=True)
GPT_55 = Model("gpt-5.5-2026-04-24", OPENAI)
GPT_54 = Model("gpt-5.4-2026-03-05", OPENAI)
EMBED_3_SMALL = Model("askbosch-prod-farm-openai-text-embedding-3-small", EMBED)

TIERS: Dict[str, List[Model]] = {
    "premium": [OPUS_5, SONNET_5],
    "standard": [SONNET_5, SONNET_46, HAIKU_45],
    "fast": [HAIKU_45, GPT_54],
    "grounded": [GEMINI_37_FLASH, GEMINI_25_PRO, HAIKU_45],
    "second": [GPT_55, GPT_54],
    "embed": [EMBED_3_SMALL],
}

# Task → tier. The pipeline asks for a task; it never names a model.
TASKS: Dict[str, str] = {
    "research.plan": "fast",
    "research.relevance": "fast",
    "research.search": "grounded",
    "verify.claim": "grounded",
    "size.market": "grounded",
    "write.framework": "standard",
    "write.subfield": "standard",
    "score.rubric": "standard",
    "score.blind": "second",
    "critic": "second",
    "write.verdict": "premium",
    "escalate": "premium",
    "triage.news": "fast",
    "repair.json": "fast",
    "embed": "embed",
}


def chain_for(task: str) -> List[Model]:
    return TIERS[TASKS[task]]

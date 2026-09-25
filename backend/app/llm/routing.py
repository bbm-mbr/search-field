"""Which model does which job — the cost policy, in one place.

Aim: the best output for the least money. Premium models only where the
judgement needs them; every other choice below was measured, not assumed.

Farm prices, USD per 1M tokens in / out (2026-09-25; thinking bills as output):
  Opus 5 5/25 · Sonnet 5 2/10 · Haiku 4.5 1/5 · Gemini 3.7 Flash 0.75/3.75
  (promo to 2026-12-31, then 1.50/7.50) · Gemini 2.5 Pro 1.25/10 ·
  GPT-5.5 5/30 · GPT-5.6 Terra 2/12 · GPT-5.6 Luna 0.20/1.20 · GPT-5.4 2.5/15

  premium   Opus 5. The field verdict, and reconciling the two scorers when
            they disagree materially. Two to three calls per field pass.
  standard  Sonnet 5 at effort "medium" (routing.TASK_EFFORT). All framework
            writing and the rubric scoring — the workhorse.
  fast      Haiku 4.5. Research planning, relevance filtering, JSON repair.
  grounded  The only models the Bosch org policy lets search the web:
            Gemini 3.7 Flash, then Gemini 2.5 Pro, then Haiku 4.5.
  blind     Gemini 3.7 Flash. The independent second scorer: a third model
            family, so neither the author's nor the critic's family scores
            twice. Measured on Manufacturing: valid rubric, MGI 0.12 against
            GPT-5.5's 0.13, at $0.03 a call against $0.20.
  critic    GPT-5.6 Terra. Measured on the same Manufacturing proposal: found
            every serious defect GPT-5.5 found plus the TAM double-count GPT-5.5
            missed, at $0.10 a call against $0.28. Gemini 3.7 Flash and 2.5 Pro
            both returned PASS with no defects on that proposal — never use
            them as the critic.
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
    # Accepts output_config.effort (Opus 5, Sonnet 5, Sonnet 4.6; not Haiku 4.5).
    effort: bool = False


OPUS_5 = Model("claude-opus-5", CLAUDE, temperature=False, effort=True)
SONNET_5 = Model("claude-sonnet-5", CLAUDE, temperature=False, effort=True)
SONNET_46 = Model("claude-sonnet-4-6", CLAUDE, effort=True)
HAIKU_45 = Model("claude-haiku-4-5@20251001", CLAUDE, web_search=True)
GEMINI_37_FLASH = Model("gemini-3.7-flash", GEMINI, web_search=True)
GEMINI_25_PRO = Model("gemini-2.5-pro", GEMINI, web_search=True)
GPT_55 = Model("gpt-5.5-2026-04-24", OPENAI)
GPT_54 = Model("gpt-5.4-2026-03-05", OPENAI)
GPT_56_TERRA = Model("gpt-5.6-terra-2026-07-09", OPENAI)
GPT_56_LUNA = Model("gpt-5.6-luna-2026-07-09", OPENAI)
EMBED_3_SMALL = Model("askbosch-prod-farm-openai-text-embedding-3-small", EMBED)

TIERS: Dict[str, List[Model]] = {
    "premium": [OPUS_5, SONNET_5],
    "standard": [SONNET_5, SONNET_46, HAIKU_45],
    "fast": [HAIKU_45, GPT_54],
    "grounded": [GEMINI_37_FLASH, GEMINI_25_PRO, HAIKU_45],
    "blind": [GEMINI_37_FLASH, GPT_56_TERRA],
    "critic": [GPT_56_TERRA, GPT_55],
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
    "score.blind": "blind",
    "critic": "critic",
    "write.verdict": "premium",
    "escalate": "premium",
    "triage.news": "fast",
    "repair.json": "fast",
    "embed": "embed",
}


# Thinking depth per task. Opus 5 and Sonnet 5 think adaptively by default at
# effort "high", and thinking is billed as output. Measured on the Manufacturing
# market stage (2026-09-25), same prompt: high 22,153 output tokens (17,889 of
# them thinking), medium 9,106 (4,484) with a valid answer, low 5,042 (1,322)
# with six shape defects. Medium is the setting for bulk writing and scoring;
# the premium judgement calls keep the default.
TASK_EFFORT: Dict[str, str] = {
    "write.framework": "medium",
    "write.subfield": "medium",
    "score.rubric": "medium",
    "write.verdict": "high",
    "escalate": "high",
}


def chain_for(task: str) -> List[Model]:
    return TIERS[TASKS[task]]

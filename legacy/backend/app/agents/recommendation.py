"""Right-to-Play decision matrix.

The score is COMPUTED in code (confidence-weighted average). The LLM only
writes reasoning + sub-field portfolio, and may shift the verdict ±0.5 max.
If the LLM call fails the computed verdict is still returned with an error note.
"""
import json
import logging
from pathlib import Path
from ..llm.client import chat_json
from .prompts import PERSONA, RECOMMENDATION_PROMPT

log = logging.getLogger(__name__)

_CRITERIA = json.loads(
    (Path(__file__).parent.parent / "data" / "criteria.json").read_text()
)

# criterion_id → framework_name (mirrors orchestrator.CRITERION_TO_FRAMEWORK)
CRITERION_TO_FRAMEWORK = {
    "competency": "competency",
    "swot": "swot",
    "market-sizing": "market_sizing",
    "attractiveness": "porter",
    "tech-growth": "three_horizons",
}


def compute_matrix(criterion_results: dict[str, dict]) -> dict:
    """Deterministic score — identical formula for every field, every run.

        effective_weight_i = weight_i × max(confidence_i, 0.2)
        contribution_i     = score_i  × effective_weight_i
        weighted_score     = Σ contribution_i / Σ effective_weight_i
        verdict_confidence = Σ(confidence_i × weight_i) / Σ weight_i
    """
    rows, total_w, weighted, conf_num, w_sum = [], 0.0, 0.0, 0.0, 0.0
    for c in _CRITERIA["criteria"]:
        if not c["in_decision_matrix"]:
            continue
        fw = CRITERION_TO_FRAMEWORK.get(c["id"], c["id"])
        res = criterion_results.get(fw, {})
        score = float(res.get("score", 0) or 0)
        conf = float(res.get("confidence", 0) or 0)
        eff_w = c["weight"] * max(conf, 0.2)
        contribution = score * eff_w
        rows.append({
            "criterion": c["name"],
            "framework": c["framework"],
            "weight": c["weight"],
            "score": score,
            "confidence": conf,
            "effective_weight": round(eff_w, 4),
            "contribution": round(contribution, 4),
        })
        weighted += contribution
        total_w += eff_w
        conf_num += conf * c["weight"]
        w_sum += c["weight"]

    final = round(weighted / total_w, 2) if total_w else 0.0
    verdict = next(
        b["verdict"] for b in _CRITERIA["verdict_bands"] if final >= b["min_score"]
    )
    return {
        "rows": rows,
        "sum_effective_weight": round(total_w, 4),
        "sum_contribution": round(weighted, 4),
        "weighted_score": final,
        "computed_verdict": verdict,
        "verdict_confidence": round(conf_num / w_sum, 2) if w_sum else 0.0,
        "formula": (
            "weighted_score = SUM(score × weight × max(conf, 0.2)) / "
            "SUM(weight × max(conf, 0.2)); "
            "verdict: ≥7.5 ENTER, ≥6.0 EXPLORE, ≥4.5 WATCH, else NO-GO; "
            "LLM adjustment clamped ±0.5."
        ),
    }


def recommend(
    field: dict,
    criterion_results: dict[str, dict],
    subfield_results: dict[str, dict],
) -> dict:
    matrix = compute_matrix(criterion_results)
    sub_summary = {
        name: {k: v.get("summary", "") for k, v in res.items() if isinstance(v, dict)}
        for name, res in subfield_results.items()
    }
    prompt = RECOMMENDATION_PROMPT.format(
        field=field["name"],
        matrix=json.dumps(matrix, indent=1),
        subfields=json.dumps(sub_summary, indent=1)[:6000],
        ma=", ".join(field.get("bsf_ma_partnership", [])) or "none mapped",
        bbm=", ".join(field.get("bbm_innovation", [])) or "none mapped",
    )

    try:
        rec = chat_json(
            [{"role": "system", "content": PERSONA}, {"role": "user", "content": prompt}]
        )
    except Exception as exc:
        log.error("recommend LLM call failed: %s", exc)
        # Return a graceful fallback so the computed matrix still reaches the UI
        rec = {
            "verdict": matrix["computed_verdict"],
            "adjusted_score": matrix["weighted_score"],
            "reasoning": [
                f"LLM reasoning unavailable — farm error: {type(exc).__name__}. "
                "Verdict is the raw computed score only."
            ],
            "entry_mode": "Analysis incomplete — see framework tabs for partial data.",
            "subfield_portfolio": [],
            "key_risks": [],
            "next_steps": ["Retry once the LLM farm is reachable."],
            "confidence": matrix["verdict_confidence"],
        }

    # Hard guardrail: clamp any LLM score drift to ±0.5 of the computed score
    drift = (
        float(rec.get("adjusted_score", matrix["weighted_score"]))
        - matrix["weighted_score"]
    )
    rec["adjusted_score"] = round(
        matrix["weighted_score"] + max(-0.5, min(0.5, drift)), 2
    )
    rec["score_adjustment"] = round(rec["adjusted_score"] - matrix["weighted_score"], 2)
    rec["confidence"] = matrix["verdict_confidence"]
    rec["decision_matrix"] = matrix
    return rec

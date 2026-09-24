"""Smoke tests — all LLM and search calls are mocked by conftest.py.

Tests verify:
  - Field list loads with the expected 16 search fields
  - Decision matrix scoring is deterministic and correct
  - compute_matrix correctly maps framework names to criteria
  - Verdict banding works for each threshold
  - PPTX export produces a non-empty bytes object
  - Cache path generation is reproducible
"""
import json
import sys
from pathlib import Path

# Make 'app' importable from the backend directory
sys.path.insert(0, str(Path(__file__).parent.parent))

import pytest
from app.agents.recommendation import compute_matrix, CRITERION_TO_FRAMEWORK
from app.agents.orchestrator import _FIELDS, _CRITERIA, _cache_path


# ── Field catalogue ─────────────────────────────────────────────────────────

def test_16_search_fields():
    assert len(_FIELDS) == 16, f"Expected 16, got {len(_FIELDS)}"


def test_all_fields_have_subfields():
    for f in _FIELDS:
        assert f["sub_fields"], f"Field {f['id']} has no sub_fields"


def test_criteria_weights_sum():
    """The 5 matrix criteria weights must sum to 1.0."""
    total = sum(c["weight"] for c in _CRITERIA if c["in_decision_matrix"])
    assert abs(total - 1.0) < 1e-6, f"Weights sum to {total}, expected 1.0"


# ── Decision matrix ──────────────────────────────────────────────────────────

def _build_results(score: float, confidence: float) -> dict:
    """Fake criterion_results keyed by framework name."""
    return {fw: {"score": score, "confidence": confidence} for fw in CRITERION_TO_FRAMEWORK.values()}


def test_compute_matrix_enter():
    res = compute_matrix(_build_results(score=9.0, confidence=0.85))
    assert res["computed_verdict"] == "ENTER"
    assert res["weighted_score"] >= 7.5


def test_compute_matrix_explore():
    res = compute_matrix(_build_results(score=6.5, confidence=0.8))
    assert res["computed_verdict"] == "EXPLORE"
    assert 6.0 <= res["weighted_score"] < 7.5


def test_compute_matrix_watch():
    res = compute_matrix(_build_results(score=5.0, confidence=0.7))
    assert res["computed_verdict"] == "WATCH"
    assert 4.5 <= res["weighted_score"] < 6.0


def test_compute_matrix_no_go():
    res = compute_matrix(_build_results(score=2.0, confidence=0.5))
    assert res["computed_verdict"] == "NO-GO"
    assert res["weighted_score"] < 4.5


def test_compute_matrix_all_intermediate_fields():
    """Every row must carry weight, score, confidence, effective_weight, contribution."""
    res = compute_matrix(_build_results(8.0, 0.9))
    for row in res["rows"]:
        for field in ("weight", "score", "confidence", "effective_weight", "contribution"):
            assert field in row, f"Row missing '{field}': {row}"


def test_compute_matrix_effective_weight_floor():
    """Low-confidence scores use max(conf, 0.2) — verify floor applied."""
    res = compute_matrix(_build_results(score=8.0, confidence=0.0))
    for row in res["rows"]:
        # effective_weight = weight * max(0, 0.2) = weight * 0.2
        expected = round(row["weight"] * 0.2, 4)
        assert abs(row["effective_weight"] - expected) < 1e-3, row


def test_verdict_confidence_computed():
    """verdict_confidence must equal sum(conf*weight)/sum(weight) for the 5 criteria."""
    conf = 0.75
    res = compute_matrix(_build_results(8.0, conf))
    weights = [c["weight"] for c in _CRITERIA if c["in_decision_matrix"]]
    expected = sum(conf * w for w in weights) / sum(weights)
    assert abs(res["verdict_confidence"] - round(expected, 2)) < 1e-3


# ── Cache path ───────────────────────────────────────────────────────────────

def test_cache_path_reproducible():
    p1 = _cache_path("energy", "battery")
    p2 = _cache_path("energy", "battery")
    assert p1 == p2


def test_cache_path_varies_by_field():
    assert _cache_path("energy", None) != _cache_path("software", None)


def test_cache_path_varies_by_sub():
    assert _cache_path("energy", "battery") != _cache_path("energy", "v2g-charging")


# ── PPTX export ──────────────────────────────────────────────────────────────

def test_pptx_export_smoke():
    """build_pptx must return non-empty bytes without errors."""
    from app.services.export import build_pptx
    from tests.conftest import (
        MOCK_PESTEL, MOCK_SWOT, MOCK_COMPETENCY, MOCK_PORTER,
        MOCK_MARKET, MOCK_THREE_HORIZONS, MOCK_RECOMMENDATION, MOCK_SEARCH_RESULTS,
    )

    field = _FIELDS[0]
    rec = dict(MOCK_RECOMMENDATION)
    rec["decision_matrix"] = {
        "rows": [{"criterion": "c", "framework": "f", "weight": 0.25,
                  "score": 7.0, "confidence": 0.8, "effective_weight": 0.2,
                  "contribution": 1.4}],
        "weighted_score": 7.0,
        "sum_effective_weight": 0.2,
        "sum_contribution": 1.4,
        "verdict_confidence": 0.8,
        "formula": "test formula",
    }
    data = {
        "field": field,
        "sub_field": None,
        "analysis": {
            "pestel": {**MOCK_PESTEL, "_sources": MOCK_SEARCH_RESULTS},
            "swot": {**MOCK_SWOT, "_sources": MOCK_SEARCH_RESULTS},
            "competency": {**MOCK_COMPETENCY, "_sources": MOCK_SEARCH_RESULTS},
            "porter": {**MOCK_PORTER, "_sources": MOCK_SEARCH_RESULTS},
            "market_sizing": {**MOCK_MARKET, "_sources": MOCK_SEARCH_RESULTS},
            "three_horizons": {**MOCK_THREE_HORIZONS, "_sources": MOCK_SEARCH_RESULTS},
        },
        "recommendation": rec,
        "recent_activity": [],
    }
    pptx_bytes = build_pptx(data)
    assert isinstance(pptx_bytes, bytes)
    assert len(pptx_bytes) > 10_000, "PPTX is suspiciously small"

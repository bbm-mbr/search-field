"""Shared fixtures — mocks the LLM and search layers so tests never hit the network."""
import pytest
from unittest.mock import patch, MagicMock


MOCK_PESTEL = {
    "political": [{"point": "FAME III subsidies", "reasoning": "Govt EV push", "implication_for_bosch": "Demand boost", "impact": "high", "citations": [1]}],
    "economic": [], "social": [], "technological": [], "environmental": [], "legal": [],
    "summary": "Positive macro environment.", "confidence": 0.75,
}
MOCK_SWOT = {
    "strengths": [{"point": "Strong India R&D", "why": "Bengaluru centre", "so_what": "Local talent", "citations": []}],
    "weaknesses": [], "opportunities": [], "threats": [],
    "targeted_strategy": "Build local.", "score": 7.0,
    "score_rationale": "Strong position.", "summary": "Positive overall.", "confidence": 0.70,
}
MOCK_COMPETENCY = {
    "required": [{"competency": "SW Engineering", "bosch_level": 7, "required_level": 8,
                  "why_required_level": "Complex SW", "why_bosch_level": "Large team",
                  "gap_closure": "hire", "gap_closure_rationale": "Targeted hiring", "citations": []}],
    "score": 7, "score_rationale": "Moderate gap.", "summary": "Manageable.", "confidence": 0.72,
}
MOCK_PORTER = {
    "forces": {
        "competitive_rivalry": {"intensity": 6, "reasoning": "Several players.", "drivers": ["price"], "citations": []},
        "supplier_power": {"intensity": 5, "reasoning": "Multiple suppliers.", "drivers": [], "citations": []},
        "buyer_power": {"intensity": 7, "reasoning": "OEM leverage.", "drivers": [], "citations": []},
        "threat_of_substitution": {"intensity": 4, "reasoning": "Low.", "drivers": [], "citations": []},
        "threat_of_new_entry": {"intensity": 5, "reasoning": "Moderate barriers.", "drivers": [], "citations": []},
    },
    "score": 6, "score_rationale": "Moderate attractiveness.", "summary": "OK.", "confidence": 0.71,
}
MOCK_MARKET = {
    "derivation_steps": [{"step": "Vehicle sales", "value": "4M/yr", "source_or_estimate": "estimate", "citations": []}],
    "tam_usd_m": {"value": 1500.0, "year": 2025, "basis": "all vehicles", "citations": []},
    "sam_usd_m": {"value": 400.0, "year": 2025, "basis": "Bosch-addressable", "citations": []},
    "cagr_pct": {"value": 18.5, "period": "2025-2030", "drivers": ["EV growth"], "citations": []},
    "cross_check": "Analyst reports align.", "customer_segments": [],
    "score": 8, "score_rationale": "Large market.", "summary": "Big TAM.", "confidence": 0.68,
}
MOCK_THREE_HORIZONS = {
    "h1_core_now": [{"item": "EV charging HW", "reasoning": "Deployed today", "citations": []}],
    "h2_emerging_2_5y": [{"item": "V2G", "reasoning": "Policy maturing", "trigger": "Grid regulations", "citations": []}],
    "h3_future_5y_plus": [{"item": "Solid state battery", "reasoning": "Long R&D", "trigger": "Cost parity", "citations": []}],
    "inflection_triggers": ["Grid policy"], "score": 8,
    "score_rationale": "Strong pipeline.", "summary": "Good growth.", "confidence": 0.70,
}
MOCK_RECOMMENDATION = {
    "verdict": "EXPLORE",
    "adjusted_score": 7.1,
    "reasoning": ["Strong market growth", "Bosch has relevant assets"],
    "entry_mode": "Partnership with Indian OEMs",
    "subfield_portfolio": [],
    "key_risks": ["Regulatory uncertainty"],
    "next_steps": ["Pilot with one OEM"],
    "confidence": 0.70,
}
MOCK_SEARCH_RESULTS = [
    {"title": "EV India 2025", "url": "https://example.com/ev", "snippet": "India EV market growing."}
]


def mock_framework_result(framework: str) -> dict:
    mapping = {
        "pestel": MOCK_PESTEL,
        "swot": MOCK_SWOT,
        "competency": MOCK_COMPETENCY,
        "porter": MOCK_PORTER,
        "market_sizing": MOCK_MARKET,
        "three_horizons": MOCK_THREE_HORIZONS,
        "opportunity_risk": {"opportunities": [], "risks": [], "summary": "OK", "confidence": 0.6},
        "stakeholder": {"stakeholders": [], "summary": "OK", "confidence": 0.6},
        "competitor": {"competitors": [], "white_space": "none", "summary": "OK", "confidence": 0.6},
        "supplier": {"items": [], "summary": "OK", "confidence": 0.6},
    }
    result = dict(mapping.get(framework, {"summary": "mock", "confidence": 0.5}))
    result["_sources"] = MOCK_SEARCH_RESULTS
    result["_framework"] = framework
    return result


@pytest.fixture(autouse=True)
def mock_llm_and_search(monkeypatch):
    """Patch chat_json and search so no network calls happen."""
    def fake_chat_json(messages, **kwargs):
        return MOCK_RECOMMENDATION

    def fake_search(query, **kwargs):
        return MOCK_SEARCH_RESULTS

    def fake_run_framework(framework, field, sub_field=None):
        return mock_framework_result(framework)

    monkeypatch.setattr("app.llm.client.chat_json", fake_chat_json)
    monkeypatch.setattr("app.tools.web_search.search", fake_search)
    monkeypatch.setattr("app.agents.framework_agents.run_framework", fake_run_framework)
    monkeypatch.setattr("app.agents.framework_agents.search", fake_search)
    monkeypatch.setattr("app.rag.playbook_store.query", lambda *a, **k: [])

    yield

"""Criterion agents. One generic runner + a registry — adding a framework is
adding a prompt, not a class. Each run is: targeted web search -> playbook
retrieval -> grounded LLM call -> JSON validated -> citations attached."""
import logging
from ..llm.client import chat_json
from ..tools.web_search import search
from ..rag.playbook_store import query as playbook_query
from .prompts import PERSONA, GROUNDING_BLOCK, FRAMEWORK_PROMPTS

log = logging.getLogger(__name__)

# Per-framework search recipes: what evidence each analysis needs.
SEARCH_RECIPES = {
    "pestel": ["{q} India policy regulation 2026", "{q} India market trends"],
    "opportunity_risk": ["{q} India opportunity market", "{q} India risks challenges"],
    "competency": ["{q} required capabilities technology stack", "Bosch {q} India capability"],
    "swot": ["Bosch Mobility India {q}", "{q} India competitors market share"],
    "market_sizing": ["{q} India market size TAM forecast CAGR", "{q} India market report 2026"],
    "porter": ["{q} India competitive landscape players", "{q} India suppliers buyers"],
    "stakeholder": ["{q} India regulator ministry stakeholders", "{q} India OEM partnerships"],
    "competitor": ["{q} India companies startups competitors", "{q} global players India entry"],
    "supplier": ["{q} supply chain India components", "{q} India localisation suppliers"],
    "three_horizons": ["{q} technology roadmap future", "{q} emerging technology India 2030"],
}


def _gather_sources(framework: str, topic: str, max_per_query: int = 5) -> list[dict]:
    sources, seen = [], set()
    for template in SEARCH_RECIPES.get(framework, ["{q} India"]):
        for r in search(template.format(q=topic), max_results=max_per_query):
            if r["url"] not in seen:
                seen.add(r["url"])
                sources.append(r)
    return sources[:12]


def _fmt_sources(sources: list[dict]) -> str:
    if not sources:
        return "(no web evidence retrieved — be explicit about uncertainty)"
    return "\n".join(f"[{i+1}] {s['title']} — {s['snippet']} ({s['url']})"
                     for i, s in enumerate(sources))


def run_framework(framework: str, field: dict, sub_field: dict | None = None) -> dict:
    topic = f"{field['name']} {sub_field['name']}" if sub_field else field["name"]
    sources = _gather_sources(framework, topic)
    playbook = playbook_query(f"{framework} methodology {topic}", k=4)
    grounding = GROUNDING_BLOCK.format(
        sources=_fmt_sources(sources),
        playbook="\n---\n".join(p["text"][:800] for p in playbook) or "(playbook not ingested)",
        ma=", ".join(field.get("bsf_ma_partnership", [])) or "none mapped",
        bbm=", ".join(field.get("bbm_innovation", [])) or "none mapped",
    )
    sub = f' — sub-field "{sub_field["name"]}" ({sub_field.get("scope","")})' if sub_field else ""
    user_prompt = FRAMEWORK_PROMPTS[framework].format(field=field["name"], sub=sub)
    try:
        result = chat_json([
            {"role": "system", "content": PERSONA},
            {"role": "user", "content": grounding + "\n\n" + user_prompt},
        ])
    except Exception as exc:  # surface failures transparently, never fabricate
        log.exception("framework %s failed", framework)
        result = {"error": str(exc), "confidence": 0.0}
    result["_sources"] = sources
    result["_framework"] = framework
    return result

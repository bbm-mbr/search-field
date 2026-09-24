"""Deep-dive orchestrator.

Flow for one request (field or field+subfield):
  1. Run every framework agent in parallel (each independently grounded).
  2. For full-field requests, also run the five matrix frameworks per
     subfield concurrently (semaphore-capped) for the portfolio roll-up.
  3. Compute the decision matrix and ask the LLM for the final,
     clamped recommendation + 'where to play' subfield portfolio.

analysis dict is keyed by FRAMEWORK NAME (pestel, porter, market_sizing …)
so the React frontend can access it directly as a.pestel, a.porter, etc.
"""
import json
import hashlib
import asyncio
import logging
from datetime import date
from pathlib import Path
from .framework_agents import run_framework, SEARCH_RECIPES
from .recommendation import recommend
from ..tools.news_feed import recent_activity
from ..config import get_settings

log = logging.getLogger(__name__)
_settings = get_settings()

_FIELDS = json.loads(
    (Path(__file__).parent.parent / "data" / "search_fields.json").read_text()
)["search_fields"]
_CRITERIA = json.loads(
    (Path(__file__).parent.parent / "data" / "criteria.json").read_text()
)["criteria"]

# criterion_id -> framework_name (for the 5 matrix criteria)
CRITERION_TO_FRAMEWORK = {
    "competency": "competency",
    "swot": "swot",
    "market-sizing": "market_sizing",
    "attractiveness": "porter",
    "tech-growth": "three_horizons",
}

# All frameworks to run per analysis
ALL_FRAMEWORKS = list(SEARCH_RECIPES.keys())

MATRIX_CRITERIA = [c["id"] for c in _CRITERIA if c["in_decision_matrix"]]


def get_field(field_id: str) -> dict:
    return next(f for f in _FIELDS if f["id"] == field_id)


# ---- disk cache --------------------------------------------------------

def _cache_path(field_id: str, sub_id: str | None) -> Path:
    today = date.today().isoformat()
    key = f"{field_id}|{sub_id or 'all'}|{today}"
    digest = hashlib.md5(key.encode()).hexdigest()
    d = Path(_settings.cache_dir)
    d.mkdir(parents=True, exist_ok=True)
    return d / f"{digest}.json"


def _load_cache(path: Path) -> dict | None:
    if path.exists():
        try:
            return json.loads(path.read_text(encoding="utf-8"))
        except Exception:
            pass
    return None


def _save_cache(path: Path, data: dict) -> None:
    try:
        path.write_text(json.dumps(data, ensure_ascii=False, indent=1), encoding="utf-8")
    except Exception:
        pass


# ---- core orchestration ------------------------------------------------

async def _run(framework: str, field: dict, sub: dict | None):
    return await asyncio.to_thread(run_framework, framework, field, sub)


async def deep_dive(
    field_id: str,
    sub_field_id: str | None = None,
    include_rollup: bool = True,
    max_concurrency: int = 4,
) -> dict:
    # Check disk cache first
    cache_path = _cache_path(field_id, sub_field_id)
    cached = _load_cache(cache_path)
    if cached:
        return cached

    field = get_field(field_id)
    sub = (
        next((s for s in field["sub_fields"] if s["id"] == sub_field_id), None)
        if sub_field_id
        else None
    )
    sem = asyncio.Semaphore(max_concurrency)

    async def guarded(fw: str, f: dict, s: dict | None):
        async with sem:
            return fw, (s["id"] if s else None), await _run(fw, f, s)

    # Run all frameworks for the primary field/subfield target
    tasks = [guarded(fw, field, sub) for fw in ALL_FRAMEWORKS]
    # framework_name -> result dict
    criterion_results: dict[str, dict] = {}
    for fw, _, res in await asyncio.gather(*tasks):
        criterion_results[fw] = res

    # Roll-up: run the 5 matrix frameworks for every subfield
    per_sub: dict[str, dict] = {}
    if include_rollup and sub is None:
        sub_tasks = [
            guarded(CRITERION_TO_FRAMEWORK[cid], field, s)
            for s in field["sub_fields"]
            for cid in MATRIX_CRITERIA
        ]
        for fw, sid, res in await asyncio.gather(*sub_tasks):
            per_sub.setdefault(sid, {})[fw] = res

    rec = await asyncio.to_thread(recommend, field, criterion_results, per_sub)
    try:
        news = await asyncio.to_thread(
            recent_activity, field["name"], sub["name"] if sub else None
        )
    except Exception as exc:
        log.warning("news feed failed: %s", exc)
        news = []

    result = {
        "field": field,
        "sub_field": sub,
        "analysis": criterion_results,
        "subfield_analysis": per_sub,
        "recommendation": rec,
        "recent_activity": news,
    }
    _save_cache(cache_path, result)
    return result

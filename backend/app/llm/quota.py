"""The monthly web-search cap.

Every web-searching call reserves its searches in search_ledger BEFORE it is
made, and the reservation is corrected to the real count afterwards. A run
that crashes half way therefore still counts what it spent, and two runs in
parallel cannot both slip under the cap.
"""
from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import delete, func, insert, select, update

from ..config import get_settings
from ..db import get_engine, search_ledger
from .routing import CLAUDE, GEMINI, Model

GOOGLE, ANTHROPIC = "google_grounding", "anthropic_web_search"
# Worst case per call: Claude's web-search tool is capped at max_uses=3 in the
# gateway; a grounded Gemini call bills as one grounded prompt.
RESERVE = {GOOGLE: 1, ANTHROPIC: 3}


class QuotaExceeded(RuntimeError):
    pass


def provider_of(model: Model) -> str:
    return {GEMINI: GOOGLE, CLAUDE: ANTHROPIC}[model.family]


def cap(provider: str) -> int:
    s = get_settings()
    return s.grounded_monthly_cap if provider == GOOGLE else s.anthropic_search_monthly_cap


def _month() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m")


def used(provider: str, month: str | None = None) -> int:
    with get_engine().connect() as c:
        return int(c.execute(select(func.coalesce(func.sum(search_ledger.c.searches), 0))
                             .where(search_ledger.c.month == (month or _month()),
                                    search_ledger.c.provider == provider)).scalar())


def reserve(model: Model, run_id: int | None) -> int:
    """Reserve one call's worst-case searches; returns the ledger row id."""
    p = provider_of(model)
    n = RESERVE[p]
    if used(p) + n > cap(p):
        raise QuotaExceeded(f"{p}: monthly cap {cap(p)} reached ({used(p)} used)")
    with get_engine().begin() as c:
        return c.execute(insert(search_ledger).values(
            month=_month(), provider=p, model=model.id, searches=n, run_id=run_id,
            created_at=datetime.now(timezone.utc).isoformat(timespec="seconds"))).inserted_primary_key[0]


def settle(ledger_id: int, searches: int) -> None:
    """Correct the reservation to what the call actually billed (at least 1 for
    a grounded call that returned: the prompt is billed even without queries)."""
    with get_engine().begin() as c:
        c.execute(update(search_ledger).where(search_ledger.c.id == ledger_id)
                  .values(searches=max(1, searches)))


def release(ledger_id: int) -> None:
    """Drop a reservation whose call failed before anything was billed."""
    with get_engine().begin() as c:
        c.execute(delete(search_ledger).where(search_ledger.c.id == ledger_id))


def status() -> dict:
    m = _month()
    return {"month": m, **{p: {"used": used(p, m), "cap": cap(p)} for p in (GOOGLE, ANTHROPIC)}}

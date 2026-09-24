"""Run grounded research for one field or sub-field and print what it found.

    python -m scripts.research semis
    python -m scripts.research semis:power-semiconductors --max-queries 4
    python -m scripts.research --list          # entity ids
    python -m scripts.research --retier        # re-apply tiers.py to stored sources

Web-searching calls count against the monthly cap (GROUNDED_MONTHLY_CAP).
"""
import argparse
import json
import sys

from sqlalchemy import select

from app.db import create_all, entity, evidence, get_engine
from app.evidence.research import research, retier
from app.llm import quota

TIER = {1: "primary", 2: "analyst", 3: "press", 4: "unrated", 9: "rejected type"}


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("entity", nargs="?")
    ap.add_argument("--max-queries", type=int, default=6)
    ap.add_argument("--list", action="store_true")
    ap.add_argument("--retier", action="store_true")
    a = ap.parse_args()
    create_all()
    if a.retier:
        print(retier(a.entity))
        return 0
    if a.list or not a.entity:
        with get_engine().connect() as c:
            for r in c.execute(select(entity.c.id, entity.c.kind, entity.c.name)
                               .where(entity.c.kind != "macro").order_by(entity.c.id)):
                print(f"  {r.id:48} {r.kind:9} {r.name}")
        return 0

    print(f"quota before: {json.dumps(quota.status())}")
    s = research(a.entity, max_queries=a.max_queries)
    print(json.dumps(s, indent=2, ensure_ascii=False))
    with get_engine().connect() as c:
        rows = c.execute(select(evidence).where(evidence.c.entity_id == a.entity)
                         .order_by(evidence.c.status, evidence.c.tier, evidence.c.domain)).mappings().all()
    print(f"\nevidence for {a.entity}: {len(rows)} sources")
    for r in rows:
        mark = "  " if r["status"] == "kept" else "x "
        extra = "" if r["status"] == "kept" else f"   <- {r['reject_reason']}"
        print(f"{mark}[{r['tier']} {TIER[r['tier']]:13}] {r['domain']:38} seen {r['times_seen']}x{extra}")
    print(f"\nquota after:  {json.dumps(quota.status())}")
    return 0 if s["status"] in ("done", "partial") else 1


if __name__ == "__main__":
    sys.exit(main())

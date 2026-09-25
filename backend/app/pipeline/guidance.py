"""Standing guidance: portfolio rules, field charters, reviewer notes.

Loaded from seed/guidance.json (matched on `key`, so re-loading updates text in
place and never duplicates) and handed to every author stage it applies to.
A review note stays `open` until a published proposal addresses it; rules and
charters stay `open` (active) until retired.
"""
from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path
from typing import List, Optional

from sqlalchemy import insert, or_, select, update

from ..config import get_settings
from ..db import entity, get_engine, guidance


def load_seed(path: Optional[Path] = None) -> dict:
    path = path or (get_settings().seed_dir / "guidance.json")
    items = json.loads(Path(path).read_text(encoding="utf-8"))["items"]
    now = datetime.now(timezone.utc).isoformat(timespec="seconds")
    added = updated = 0
    with get_engine().begin() as c:
        for it in items:
            row = c.execute(select(guidance.c.id, guidance.c.text, guidance.c.stage, guidance.c.source)
                            .where(guidance.c.key == it["key"])).first()
            vals = {"entity_id": it["entity_id"], "kind": it["kind"], "stage": it.get("stage"),
                    "text": it["text"], "source": it.get("source")}
            if row is None:
                c.execute(insert(guidance).values(key=it["key"], status="open", created_at=now, **vals))
                added += 1
            elif (row.text, row.stage, row.source) != (it["text"], it.get("stage"), it.get("source")):
                c.execute(update(guidance).where(guidance.c.id == row.id).values(**vals))
                updated += 1
    return {"added": added, "updated": updated, "total": len(items)}


def for_entity(entity_id: str, stage: Optional[str] = None) -> List[dict]:
    """Active guidance for an entity: portfolio rules, then the field's charter
    and notes (a sub-field also inherits its parent field's), filtered to one
    stage when given (entries with no stage apply to every stage)."""
    with get_engine().connect() as c:
        parent = c.execute(select(entity.c.parent_id).where(entity.c.id == entity_id)).scalar()
        ids = ["*", entity_id] + ([parent] if parent else [])
        q = select(guidance).where(guidance.c.entity_id.in_(ids), guidance.c.status == "open")
        if stage:
            q = q.where(or_(guidance.c.stage.is_(None), guidance.c.stage == stage))
        rows = [dict(r) for r in c.execute(q.order_by(guidance.c.id)).mappings()]
    order = {"rule": 0, "charter": 1, "review": 2}
    return sorted(rows, key=lambda r: (order.get(r["kind"], 9), r["id"]))


def render(rows: List[dict]) -> str:
    if not rows:
        return "(none)"
    heads = {"rule": "Portfolio rule", "charter": "Scope charter for this field", "review": "Reviewer note"}
    return "\n".join(f"[G{r['id']}] {heads.get(r['kind'], r['kind'])}"
                     f"{' — ' + r['source'] if r.get('source') else ''}: {r['text']}" for r in rows)

"""Load the seed into the database, and assemble the board back out of it.

assemble_board() must return exactly what tools/extract.cjs wrote — same
values, same key order. tests/test_roundtrip.py checks that by comparing the
serialised JSON strings, which is stricter than comparing dicts because it also
catches reordering.
"""
from __future__ import annotations

import hashlib
import json
import re
from datetime import datetime, timezone
from typing import Dict

from sqlalchemy import delete, insert, select, func

from .db import board_meta, entity, get_engine, section_doc

LAYERS = ("DATA", "V6", "V7", "V8")
MACRO_ENTITY = "india"


def _dump(v) -> str:
    return json.dumps(v, ensure_ascii=False, separators=(",", ":"))


def _fp(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def _slug(name: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")


def sub_id(field_id: str, sub_name: str) -> str:
    return f"{field_id}:{_slug(sub_name)}"


def seed_from_board(board: dict) -> Dict[str, int]:
    """Replace the database content with the board. Idempotent."""
    now = datetime.now(timezone.utc).isoformat(timespec="seconds")
    as_of = board.get("asOf")
    ents, docs = [], []

    ents.append({"id": MACRO_ENTITY, "kind": "macro", "parent_id": None, "name": "India macro context", "position": -1})
    for fi, f in enumerate(board["FIELDS"]):
        ents.append({"id": f["id"], "kind": "field", "parent_id": None, "name": f["name"], "position": fi})
        for si, s in enumerate(f["subs"]):
            ents.append({"id": sub_id(f["id"], s), "kind": "subfield", "parent_id": f["id"], "name": s, "position": si})
    known_subs = {e["id"] for e in ents if e["kind"] == "subfield"}

    def doc(layer, eid, section, layer_pos, pos, value):
        text = _dump(value)
        docs.append({"layer": layer, "entity_id": eid, "section": section, "layer_pos": layer_pos,
                     "position": pos, "version": 1, "status": "published", "content": text,
                     "fingerprint": _fp(text), "authored_by": "human", "as_of": as_of, "created_at": now})

    for pos, (k, v) in enumerate(board["MACRO"].items()):
        doc("MACRO", MACRO_ENTITY, k, 0, pos, v)
    for layer in LAYERS:
        for lp, (fid, body) in enumerate(board[layer].items()):
            for pos, (k, v) in enumerate(body.items()):
                doc(layer, fid, k, lp, pos, v)
    for lp, (fid, subs) in enumerate(board["SUB"].items()):
        for pos, (name, body) in enumerate(subs.items()):
            sid = sub_id(fid, name)
            if sid not in known_subs:
                raise ValueError(f"SUB entry '{name}' in {fid} is not a sub-field listed in FIELDS")
            doc("SUB", sid, "_", lp, pos, body)

    eng = get_engine()
    with eng.begin() as c:
        c.execute(delete(section_doc))
        c.execute(delete(entity))
        c.execute(delete(board_meta))
        c.execute(insert(entity), ents)
        c.execute(insert(section_doc), docs)
        c.execute(insert(board_meta), [{"key": "asOf", "value": as_of or ""},
                                       {"key": "seeded_at", "value": now}])
    return {"entities": len(ents), "sections": len(docs)}


def _latest_published(c):
    """Highest published version of each (layer, entity, section)."""
    latest = (select(section_doc.c.layer, section_doc.c.entity_id, section_doc.c.section,
                     func.max(section_doc.c.version).label("v"))
              .where(section_doc.c.status == "published")
              .group_by(section_doc.c.layer, section_doc.c.entity_id, section_doc.c.section)
              .subquery())
    q = (select(section_doc)
         .join(latest, (section_doc.c.layer == latest.c.layer)
               & (section_doc.c.entity_id == latest.c.entity_id)
               & (section_doc.c.section == latest.c.section)
               & (section_doc.c.version == latest.c.v))
         .order_by(section_doc.c.layer, section_doc.c.layer_pos, section_doc.c.position))
    return c.execute(q).mappings().all()


def assemble_board() -> dict:
    eng = get_engine()
    with eng.connect() as c:
        ents = c.execute(select(entity).order_by(entity.c.position)).mappings().all()
        rows = _latest_published(c)
        meta = {r["key"]: r["value"] for r in c.execute(select(board_meta)).mappings()}

    fields = [e for e in ents if e["kind"] == "field"]
    subs_of: Dict[str, list] = {}
    for e in ents:
        if e["kind"] == "subfield":
            subs_of.setdefault(e["parent_id"], []).append(e)
    sub_name = {e["id"]: (e["parent_id"], e["name"]) for e in ents if e["kind"] == "subfield"}

    board = {"asOf": meta.get("asOf") or None,
             "FIELDS": [{"id": f["id"], "name": f["name"],
                         "subs": [s["name"] for s in sorted(subs_of.get(f["id"], []), key=lambda s: s["position"])]}
                        for f in sorted(fields, key=lambda f: f["position"])],
             "MACRO": {}}
    for L in LAYERS + ("SUB",):
        board[L] = {}

    # rows are ordered by layer, layer_pos, position, so inserting in order
    # rebuilds every object in its original key order.
    by_layer = {}
    for r in rows:
        by_layer.setdefault(r["layer"], []).append(r)
    for r in sorted(by_layer.get("MACRO", []), key=lambda r: r["position"]):
        board["MACRO"][r["section"]] = json.loads(r["content"])
    for L in LAYERS:
        for r in sorted(by_layer.get(L, []), key=lambda r: (r["layer_pos"], r["position"])):
            board[L].setdefault(r["entity_id"], {})[r["section"]] = json.loads(r["content"])
    for r in sorted(by_layer.get("SUB", []), key=lambda r: (r["layer_pos"], r["position"])):
        fid, name = sub_name[r["entity_id"]]
        board["SUB"].setdefault(fid, {})[name] = json.loads(r["content"])

    # Match the seed's top-level key order exactly.
    return {k: board[k] for k in ("asOf", "FIELDS", "MACRO", "DATA", "V6", "V7", "V8", "SUB")}


def board_stats() -> dict:
    eng = get_engine()
    with eng.connect() as c:
        kinds = dict(c.execute(select(entity.c.kind, func.count()).group_by(entity.c.kind)).all())
        layers = dict(c.execute(select(section_doc.c.layer, func.count())
                                .where(section_doc.c.status == "published")
                                .group_by(section_doc.c.layer)).all())
        meta = {r["key"]: r["value"] for r in c.execute(select(board_meta)).mappings()}
    return {"entities": kinds, "sections_by_layer": layers, **meta}

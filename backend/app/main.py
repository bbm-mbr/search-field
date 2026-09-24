"""Search-Field Intelligence API — read-only.

Serves the board from the database, scores computed by the Python engine, and
(Phase 1) the evidence store that grounded research fills. Nothing here writes;
research runs from the CLI (python -m scripts.research) until the scheduler
arrives in a later phase.
"""
import hashlib
import json
from functools import lru_cache

from typing import Optional

from fastapi import FastAPI, HTTPException, Request, Response
from sqlalchemy import func, select
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware

from .config import get_settings
from .db import create_all, entity, evidence, evidence_support, get_engine, research_run
from .llm import quota
from .engine import scoring as E
from .repository import assemble_board, board_stats

settings = get_settings()
app = FastAPI(title="Search-Field Intelligence API", version="0.1.0")
app.add_middleware(GZipMiddleware, minimum_size=2048)
app.add_middleware(CORSMiddleware, allow_origins=settings.cors_origins, allow_methods=["GET"], allow_headers=["*"])


@app.on_event("startup")
def _startup():
    """Create tables; on an empty database (first boot in Docker or Azure),
    load the seed so the board is never served empty."""
    create_all()
    if not board_stats()["entities"] and (settings.seed_dir / "board.json").exists():
        import json
        from .repository import seed_from_board
        seed_from_board(json.loads((settings.seed_dir / "board.json").read_text(encoding="utf-8")))


@lru_cache(maxsize=1)
def _board_cached():
    board = assemble_board()
    body = json.dumps(board, ensure_ascii=False, separators=(",", ":")).encode("utf-8")
    return board, body, hashlib.sha256(body).hexdigest()[:32]


def _board():
    board, _, _ = _board_cached()
    if not board["FIELDS"]:
        raise HTTPException(503, "Board is empty — run: python -m scripts.seed")
    return board


@lru_cache(maxsize=1)
def _scores():
    b = _board()
    return E.score_portfolio([f["id"] for f in b["FIELDS"]], b["V8"], b["DATA"])


@app.get("/api/health")
def health():
    st = board_stats()
    return {"status": "ok", "engine": E.ENGINE_VERSION, "db": settings.database_url.split(":")[0], **st}


@app.get("/api/board")
def board(request: Request):
    """The whole board in the exact shape the UI was built on. ETag lets the
    browser skip the download when nothing has changed."""
    _board()
    _, body, etag = _board_cached()
    if request.headers.get("if-none-match") == etag:
        return Response(status_code=304)
    return Response(content=body, media_type="application/json", headers={"ETag": etag, "Cache-Control": "no-cache"})


@app.get("/api/fields")
def fields():
    b, s = _board(), _scores()
    return [{"id": f["id"], "name": f["name"], "subs": f["subs"],
             "mgi": (s["portfolio"].get(f["id"]) or {}).get("mgi"),
             "band": ((s["portfolio"].get(f["id"]) or {}).get("band") or {}).get("v"),
             "rank": s["stats"]["mgi"]["rankOf"].get(f["id"])} for f in b["FIELDS"]]


@app.get("/api/fields/{field_id}")
def field(field_id: str):
    b = _board()
    if field_id not in b["DATA"]:
        raise HTTPException(404, f"Unknown field '{field_id}'")
    return {L: b[L].get(field_id) for L in ("DATA", "V6", "V7", "V8", "SUB")}


@app.get("/api/fields/{field_id}/subfields/{sub_name}")
def subfield(field_id: str, sub_name: str):
    sub = (_board()["SUB"].get(field_id) or {}).get(sub_name)
    if sub is None:
        raise HTTPException(404, f"No drill-down for '{sub_name}' in '{field_id}'")
    return sub


@app.get("/api/scores")
def scores():
    return _scores()


@app.get("/api/scores/{field_id}")
def field_scores(field_id: str):
    s = _scores()
    if field_id not in s["fields"]:
        raise HTTPException(404, f"Unknown field '{field_id}'")
    ranks = {k: E.index_rank(s["stats"], k, field_id) for k, _, _ in E.INDEX_KEYS}
    return {**s["fields"][field_id], "ranks": ranks}


# ── Phase 1: evidence store ──────────────────────────────────────────────────
@app.get("/api/evidence/{entity_id}")
def evidence_for(entity_id: str, status: Optional[str] = "kept", tier: Optional[int] = None, claims: int = 3):
    """Sources for one field or sub-field, best tier first. status=all includes
    rejected sources with the reason they were rejected."""
    eng = get_engine()
    with eng.connect() as c:
        if c.execute(select(entity.c.id).where(entity.c.id == entity_id)).first() is None:
            raise HTTPException(404, f"Unknown entity '{entity_id}'")
        q = select(evidence).where(evidence.c.entity_id == entity_id)
        if status and status != "all":
            q = q.where(evidence.c.status == status)
        if tier is not None:
            q = q.where(evidence.c.tier == tier)
        rows = [dict(r) for r in c.execute(q.order_by(evidence.c.tier, evidence.c.times_seen.desc(),
                                                       evidence.c.id)).mappings()]
        for r in rows:
            # Distinct sentences, most recently cited first: the same sentence
            # cited on every run is one claim, not one per sighting.
            r["claims"] = [x.claim for x in c.execute(
                select(evidence_support.c.claim).where(evidence_support.c.evidence_id == r["id"])
                .group_by(evidence_support.c.claim).order_by(func.max(evidence_support.c.id).desc())
                .limit(max(0, min(claims, 20))))]
        by_tier = dict(c.execute(select(evidence.c.tier, func.count()).where(
            evidence.c.entity_id == entity_id, evidence.c.status == "kept").group_by(evidence.c.tier)).all())
    return {"entity": entity_id, "count": len(rows), "kept_by_tier": by_tier, "sources": rows}


@app.get("/api/research/runs")
def research_runs(entity_id: Optional[str] = None, limit: int = 50):
    q = select(research_run).order_by(research_run.c.id.desc()).limit(max(1, min(limit, 500)))
    if entity_id:
        q = q.where(research_run.c.entity_id == entity_id)
    with get_engine().connect() as c:
        rows = [dict(r) for r in c.execute(q).mappings()]
    for r in rows:
        r["plan"] = json.loads(r["plan"]) if r["plan"] else None
    return rows


@app.get("/api/quota")
def search_quota():
    return quota.status()

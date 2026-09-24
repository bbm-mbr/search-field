"""Search-Field Intelligence API — Phase 0: read-only.

Serves the board from the database, and scores computed by the Python engine.
Nothing here writes content; agents, refresh and review arrive in later phases.
"""
import hashlib
import json
from functools import lru_cache

from fastapi import FastAPI, HTTPException, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware

from .config import get_settings
from .db import create_all
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

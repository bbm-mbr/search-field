"""API smoke tests against a fresh database that seeds itself on startup."""
import json
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

SEED = Path(__file__).resolve().parents[1] / "seed"


@pytest.fixture(scope="module")
def client(tmp_path_factory):
    url = f"sqlite:///{(tmp_path_factory.mktemp('api') / 'api.db').as_posix()}"
    mp = pytest.MonkeyPatch()
    from app import config, db, main
    mp.setattr(config.Settings, "database_url", url)
    db._engine = None
    main._board_cached.cache_clear()
    main._scores.cache_clear()
    with TestClient(main.app) as c:
        yield c
    mp.undo()
    db._engine = None
    main._board_cached.cache_clear()
    main._scores.cache_clear()


def test_health_reports_full_board(client):
    h = client.get("/api/health").json()
    assert h["entities"] == {"field": 18, "macro": 1, "subfield": 83}


def test_board_equals_seed(client):
    seed = json.loads((SEED / "board.json").read_text(encoding="utf-8"))
    assert client.get("/api/board").json() == seed


def test_board_etag_revalidates(client):
    etag = client.get("/api/board").headers["etag"]
    assert client.get("/api/board", headers={"If-None-Match": etag}).status_code == 304


def test_leaderboard_matches_golden(client):
    golden = json.loads((SEED / "golden.json").read_text(encoding="utf-8"))
    rows = {r["id"]: r for r in client.get("/api/fields").json()}
    for fid, g in golden["portfolio"].items():
        assert rows[fid]["mgi"] == g["mgi"] and rows[fid]["band"] == g["band"]
        assert rows[fid]["rank"] == golden["stats"]["mgi"]["rankOf"][fid]


def test_field_and_subfield_and_404s(client):
    assert client.get("/api/fields/semis").json()["V8"]["techVelocity"] == "High"
    assert client.get("/api/fields/sustainability/subfields/Battery Second Life").json()["play"] == "LEAD"
    assert client.get("/api/fields/nope").status_code == 404
    assert client.get("/api/scores/semis").json()["ranks"]["mgi"]["rank"] == 6

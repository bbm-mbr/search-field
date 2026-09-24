"""The database must give back exactly what was put in — values AND key order.

Compared as serialised JSON strings, not dicts: dict equality ignores key
order, and key order decides what the UI renders first.
"""
import json
from pathlib import Path

import pytest

SEED = Path(__file__).resolve().parents[1] / "seed" / "board.json"


@pytest.fixture(scope="module")
def db(tmp_path_factory, monkeypatch_module):
    url = f"sqlite:///{(tmp_path_factory.mktemp('db') / 't.db').as_posix()}"
    monkeypatch_module.setenv("DATABASE_URL", url)
    from app import config, db as dbm
    config.get_settings.cache_clear()
    monkeypatch_module.setattr(config.Settings, "database_url", url)
    dbm._engine = None
    dbm.create_all()
    return dbm


@pytest.fixture(scope="module")
def monkeypatch_module():
    mp = pytest.MonkeyPatch()
    yield mp
    mp.undo()


def test_roundtrip_is_byte_identical(db):
    from app.repository import assemble_board, seed_from_board
    board = json.loads(SEED.read_text(encoding="utf-8"))
    seed_from_board(board)
    assert json.dumps(assemble_board(), ensure_ascii=False) == json.dumps(board, ensure_ascii=False)


def test_every_sub_field_drilldown_maps_to_an_entity(db):
    from sqlalchemy import select, func
    from app.db import get_engine, section_doc
    with get_engine().connect() as c:
        n = c.execute(select(func.count()).select_from(section_doc).where(section_doc.c.layer == "SUB")).scalar()
    assert n == 83

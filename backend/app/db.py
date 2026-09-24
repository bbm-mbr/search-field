"""Storage for the board.

Two tables carry everything in Phase 0:

  entity       the 18 search fields and their 83 sub-fields (sub-fields have a
               parent_id), plus one 'india' entity for the shared macro block
  section_doc  one row per (layer, entity, section, version). A section is a
               top-level key of a field's layer — DATA.energy.pestel,
               V8.energy.iai, SUB for one sub-field, and so on. This is the
               granularity the agents will later refresh at, one section at a time.

Content is stored as JSON TEXT, never as Postgres JSONB. JSONB reorders object
keys, and the UI renders several objects in key order (the PESTEL dimensions,
the Porter sub-factors, the SWOT quadrants). A column type that silently
reorders them would change what the board shows while every value stayed
correct — the hardest kind of defect to notice.

Works unchanged on SQLite (local smoke test) and Postgres (Docker, Azure).
"""
from sqlalchemy import (Column, Integer, MetaData, String, Table, Text, UniqueConstraint,
                        create_engine, Index)

from .config import get_settings

metadata = MetaData()

entity = Table(
    "entity", metadata,
    Column("id", String(160), primary_key=True),
    Column("kind", String(16), nullable=False),          # field | subfield | macro
    Column("parent_id", String(160)),
    Column("name", String(200), nullable=False),
    Column("position", Integer, nullable=False),
)

section_doc = Table(
    "section_doc", metadata,
    Column("id", Integer, primary_key=True, autoincrement=True),
    Column("layer", String(16), nullable=False),         # DATA V6 V7 V8 SUB MACRO
    Column("entity_id", String(160), nullable=False),
    Column("section", String(80), nullable=False),
    Column("layer_pos", Integer, nullable=False),        # entity order within the layer
    Column("position", Integer, nullable=False),         # section order within the entity
    Column("version", Integer, nullable=False, default=1),
    Column("status", String(16), nullable=False, default="published"),  # draft proposed published
    Column("content", Text, nullable=False),             # JSON text, key order preserved
    Column("fingerprint", String(64), nullable=False),
    Column("authored_by", String(16), nullable=False),   # human | model | hybrid
    Column("as_of", String(40)),
    Column("created_at", String(40), nullable=False),
    UniqueConstraint("layer", "entity_id", "section", "version", name="uq_section_version"),
)
Index("ix_section_published", section_doc.c.status, section_doc.c.layer)

board_meta = Table(
    "board_meta", metadata,
    Column("key", String(80), primary_key=True),
    Column("value", Text, nullable=False),
)

_engine = None


def get_engine():
    global _engine
    if _engine is None:
        url = get_settings().database_url
        kw = {"connect_args": {"check_same_thread": False}} if url.startswith("sqlite") else {"pool_pre_ping": True}
        _engine = create_engine(url, future=True, **kw)
    return _engine


def create_all():
    metadata.create_all(get_engine())

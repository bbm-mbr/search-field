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

# ── Phase 1: the evidence store ──────────────────────────────────────────────
# One row per source per entity. A source cited by many runs stays one row and
# accumulates evidence_support rows — one per sentence it was used to support.
research_run = Table(
    "research_run", metadata,
    Column("id", Integer, primary_key=True, autoincrement=True),
    Column("entity_id", String(160), nullable=False),
    Column("kind", String(32), nullable=False),            # research | discovery | verify
    Column("status", String(16), nullable=False),          # running | done | failed | partial
    Column("started_at", String(40), nullable=False),
    Column("finished_at", String(40)),
    Column("plan", Text),                                  # JSON: queries, guardrail, must_resolve
    Column("model_calls", Integer, default=0),
    Column("searches", Integer, default=0),
    Column("tokens_in", Integer, default=0),
    Column("tokens_out", Integer, default=0),
    Column("kept", Integer, default=0),
    Column("rejected", Integer, default=0),
    Column("error", Text),
)

evidence = Table(
    "evidence", metadata,
    Column("id", Integer, primary_key=True, autoincrement=True),
    Column("entity_id", String(160), nullable=False),
    Column("canonical_url", String(1000), nullable=False),
    Column("resolved_url", String(2000)),
    Column("redirect_url", String(2000)),
    Column("domain", String(255), nullable=False),
    Column("title", String(500)),
    Column("tier", Integer, nullable=False),               # 1 primary · 2 analyst · 3 press · 4 unrated · 9 rejected source type
    Column("tier_reason", String(200)),
    Column("status", String(16), nullable=False),          # kept | rejected
    Column("reject_reason", String(300)),
    Column("first_run_id", Integer),
    Column("first_seen_at", String(40), nullable=False),
    Column("last_seen_at", String(40), nullable=False),
    Column("times_seen", Integer, nullable=False, default=1),
    UniqueConstraint("entity_id", "canonical_url", name="uq_evidence_entity_url"),
)

evidence_support = Table(
    "evidence_support", metadata,
    Column("id", Integer, primary_key=True, autoincrement=True),
    Column("evidence_id", Integer, nullable=False),
    Column("run_id", Integer, nullable=False),
    Column("query", Text),
    Column("claim", Text, nullable=False),                 # the sentence this source was used to support
    Column("model", String(80)),
    Column("created_at", String(40), nullable=False),
)
Index("ix_support_evidence", evidence_support.c.evidence_id)

# Every web-searching call is recorded here BEFORE its result is used, so the
# monthly cap holds even if a run crashes half way. Google's free grounded
# allowance is shared with Mobility Intelligence, so this app has its own cap.
search_ledger = Table(
    "search_ledger", metadata,
    Column("id", Integer, primary_key=True, autoincrement=True),
    Column("month", String(7), nullable=False),            # 2026-09
    Column("provider", String(32), nullable=False),        # google_grounding | anthropic_web_search
    Column("model", String(80), nullable=False),
    Column("searches", Integer, nullable=False),
    Column("run_id", Integer),
    Column("created_at", String(40), nullable=False),
)

# ── Phase 2: guidance and proposals ──────────────────────────────────────────
# Guidance is what humans tell the authors, and it outlives any one run: a
# reviewer's note on a field, a field's scope charter, or a portfolio-wide
# rule (entity_id '*'). Every author stage receives the guidance that applies to
# it, and the critic checks each open note was actually addressed. That is how
# a review comment changes the board for good instead of being fixed once and
# regenerated away by the next refresh.
guidance = Table(
    "guidance", metadata,
    Column("id", Integer, primary_key=True, autoincrement=True),
    Column("entity_id", String(160), nullable=False),      # field id, sub-field id, or '*'
    Column("kind", String(16), nullable=False),            # rule | charter | review
    Column("stage", String(32)),                           # pestel | swot | ... ; NULL = every stage
    Column("text", Text, nullable=False),
    Column("source", String(200)),                         # who / which review
    Column("status", String(16), nullable=False),          # open | addressed | retired
    Column("created_at", String(40), nullable=False),
    Column("key", String(80)),                             # stable id for seeded guidance
    UniqueConstraint("key", name="uq_guidance_key"),
)

# A proposal is one authoring pass over one field. Its sections live in
# proposal_section until a human publishes them; the live board never reads
# this table.
proposal = Table(
    "proposal", metadata,
    Column("id", Integer, primary_key=True, autoincrement=True),
    Column("entity_id", String(160), nullable=False),
    Column("status", String(16), nullable=False),          # drafting | ready | review | blocked | failed | superseded | published | rejected
    Column("created_at", String(40), nullable=False),
    Column("finished_at", String(40)),
    Column("stages", Text),                                # JSON: per stage model, tokens, attempts, defects
    Column("checks", Text),                                # JSON: mechanical validation results
    Column("critic", Text),                                # JSON: second-model review
    Column("blind", Text),                                 # JSON: blind second scoring and its comparison
    Column("scores", Text),                                # JSON: before/after for this field and the portfolio
    Column("guidance_check", Text),                        # JSON: each open note, addressed or not
    Column("sources", Text),                               # JSON: the numbered source list the sections cite
    Column("usage", Text),                                 # JSON: calls and tokens by model
    Column("error", Text),
)

proposal_section = Table(
    "proposal_section", metadata,
    Column("id", Integer, primary_key=True, autoincrement=True),
    Column("proposal_id", Integer, nullable=False),
    Column("layer", String(16), nullable=False),
    Column("section", String(80), nullable=False),
    Column("content", Text, nullable=False),               # JSON text, key order preserved
    Column("fingerprint", String(64), nullable=False),
    Column("changed", Text),                               # JSON: the author's own list of what moved and why
    UniqueConstraint("proposal_id", "layer", "section", name="uq_proposal_section"),
)

# Each finished stage is checkpointed, so a failure later in the pass resumes
# instead of paying for the finished stages again (scripts.propose --resume).
proposal_draft = Table(
    "proposal_draft", metadata,
    Column("id", Integer, primary_key=True, autoincrement=True),
    Column("proposal_id", Integer, nullable=False),
    Column("stage", String(32), nullable=False),
    Column("content", Text),                               # JSON: the stage's parsed output
    Column("meta", Text, nullable=False),                  # JSON: status, attempts, defects, model
    Column("created_at", String(40), nullable=False),
    UniqueConstraint("proposal_id", "stage", name="uq_proposal_draft"),
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

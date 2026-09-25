"""Phase 1 evidence store: tiers, JSON handling, the search cap, and a full
research run against a fake LLM Farm (no network, no cost)."""
import json
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select

from app.evidence.tiers import canonical_url, classify
from app.llm import jsonutil

SEED = Path(__file__).resolve().parents[1] / "seed" / "board.json"
R = "https://vertexaisearch.cloud.google.com/grounding-api-redirect/"


# ── tiers ────────────────────────────────────────────────────────────────────
@pytest.mark.parametrize("url,tier", [
    ("https://www.pib.gov.in/PressRelease.aspx?id=1", 1),
    ("https://ism.gov.in/", 1),
    ("https://www.siam.in/statistics.aspx", 1),
    ("https://www.infineon.com/cms/en/", 1),
    ("https://www.mordorintelligence.com/industry-reports/x", 2),
    ("https://auto.economictimes.indiatimes.com/news/x", 3),
    ("https://www.eetimes.com/x", 3),
    ("https://some-new-site.in/article", 4),
    ("https://www.facebook.com/somepage/posts/1", 9),
    ("https://in.linkedin.com/pulse/x", 9),
    ("https://chipguy.blogspot.com/2026/01/x.html", 9),
    ("https://medium.com/@someone/x", 9),
])
def test_classify(url, tier):
    assert classify(url)[0] == tier


def test_classify_falls_back_to_title_domain_for_unresolved_redirect():
    assert classify(R + "abc", "pib.gov.in")[0] == 1
    assert classify("", "www.facebook.com")[0] == 9
    # a prefix strip, not a character strip: "web.in" must stay "web.in"
    assert classify("", "web.in")[1] == "unrated: web.in"


def test_canonical_url_dedupes_tracking_and_trivia():
    a = canonical_url("http://www.Example.com/news/x/?utm_source=g&id=7#top")
    b = canonical_url("https://example.com/news/x?id=7&fbclid=abc")
    assert a == b == "https://example.com/news/x?id=7"


# ── JSON ─────────────────────────────────────────────────────────────────────
def test_extract_handles_fences_prose_and_braces_in_strings():
    assert jsonutil.extract('Sure!\n```json\n{"a": 1}\n```') == {"a": 1}
    assert jsonutil.extract('Here: {"a": "x}y", "b": [1, {"c": 2}]} done') == {"a": "x}y", "b": [1, {"c": 2}]}
    assert jsonutil.extract('[{"q": "a"}]') == [{"q": "a"}]


def test_parse_repairs_once_then_fails_loudly():
    calls = []

    def repair(t):
        calls.append(t)
        return '{"fixed": true}'
    assert jsonutil.parse("{'fixed': True}", repair) == {"fixed": True}
    assert len(calls) == 1
    with pytest.raises(jsonutil.JSONError):
        jsonutil.parse("not json", lambda t: "still not json")
    with pytest.raises(jsonutil.JSONError):
        jsonutil.parse('{"truncated": [1, 2')


# ── fixtures: isolated database + fake farm ──────────────────────────────────
@pytest.fixture(scope="module")
def env(tmp_path_factory):
    url = f"sqlite:///{(tmp_path_factory.mktemp('ev') / 'ev.db').as_posix()}"
    mp = pytest.MonkeyPatch()
    from app import config, db
    from app.repository import seed_from_board
    mp.setattr(config.Settings, "database_url", url)
    mp.setattr(config.Settings, "grounded_monthly_cap", 1000)
    db._engine = None
    db.create_all()
    seed_from_board(json.loads(SEED.read_text(encoding="utf-8")))
    yield mp
    mp.undo()
    db._engine = None


def _gemini_raw(n):
    chunks = [
        {"web": {"uri": R + f"gov{n}", "title": "pib.gov.in"}},
        {"web": {"uri": R + f"et{n}", "title": "economictimes.indiatimes.com"}},
        {"web": {"uri": R + f"fb{n}", "title": "facebook.com"}},
        {"web": {"uri": R + f"solar{n}", "title": "solarquarter.com"}},
    ]
    supports = [
        {"segment": {"text": "ISM approved four OSAT units in 2025."}, "groundingChunkIndices": [0, 1]},
        {"segment": {"text": "A Facebook post claims otherwise."}, "groundingChunkIndices": [2]},
        {"segment": {"text": "Solar wafer capacity is growing."}, "groundingChunkIndices": [3]},
    ]
    return {"candidates": [{"content": {"parts": [{"text": "prose answer"}]}, "finishReason": "STOP",
                            "groundingMetadata": {"webSearchQueries": ["q1", "q2"], "groundingChunks": chunks,
                                                  "groundingSupports": supports}}],
            "usageMetadata": {"promptTokenCount": 100, "candidatesTokenCount": 200, "thoughtsTokenCount": 50}}


class FakeFarm:
    def __init__(self):
        self.calls = []
        self.n = 0

    def __call__(self, model, prompt, *, system=None, max_tokens=1024, temperature=0.2, web_search=False, effort=None):
        from app.llm.gateway import LLMResult
        self.calls.append((model.id, web_search))
        if "Write up to" in prompt:
            return LLMResult(model.id, json.dumps({"scope": "Automotive semiconductors in India",
                                                   "not_this": ["solar wafers"],
                                                   "queries": [{"q": "size?", "purpose": "size"},
                                                               {"q": "policy?", "purpose": "policy"}]}), 10, 10)
        if "Mark a source off-topic" in prompt:
            i = next(line.split(".")[0] for line in prompt.splitlines() if "solarquarter.com" in line)
            return LLMResult(model.id, '```json\n{"off_topic": [{"i": %s, "reason": "solar, not automotive"}]}\n```'
                             % i, 10, 10)
        assert web_search, "search must be grounded"
        self.n += 1
        raw = _gemini_raw(self.n)
        return LLMResult(model.id, "prose answer", 100, 250, 0.1, [], 2, raw)


class FakeResolver:
    # Two different redirects land on the same article (with tracking noise): dedupe.
    def resolve(self, url):
        key = url.rsplit("/", 1)[1].rstrip("0123456789")
        return {"gov": "https://pib.gov.in/PressRelease.aspx?PRID=1",
                "et": "https://auto.economictimes.indiatimes.com/news/ism-osat?utm_source=x",
                "fb": "https://www.facebook.com/somepage/posts/1",
                "solar": "https://solarquarter.com/2026/wafers/"}[key]

    def close(self):
        pass


@pytest.fixture(scope="module")
def ran(env):
    from app.evidence import research as R_
    from app.llm import gateway
    farm = FakeFarm()
    env.setattr(gateway, "call", farm)
    first = R_.research("semis", max_queries=2, resolver=FakeResolver())
    second = R_.research("semis", max_queries=2, resolver=FakeResolver())
    return farm, first, second


def test_plan_adds_adversarial_query_when_missing(ran):
    from app.db import get_engine, research_run
    with get_engine().connect() as c:
        plan = json.loads(c.execute(select(research_run.c.plan).where(research_run.c.id == ran[1]["run_id"])).scalar())
    assert [q["purpose"] for q in plan["queries"]] == ["size", "adversarial"]
    assert plan["not_this"] == ["solar wafers"]


def test_run_summary(ran):
    _, first, second = ran
    assert first["status"] == "done" and first["answered"] == 2
    assert first["sources"] == 4                         # 8 chunks over 2 answers → 4 canonical URLs
    assert (first["kept"], first["rejected"], first["new"]) == (2, 2, 4)
    assert second["new"] == 0                            # second run adds sightings, not rows


def test_evidence_rows_tiered_deduped_and_filtered(ran):
    from app.db import evidence, get_engine
    with get_engine().connect() as c:
        rows = {r["domain"]: r for r in c.execute(select(evidence).where(evidence.c.entity_id == "semis")).mappings()}
    assert set(rows) == {"pib.gov.in", "auto.economictimes.indiatimes.com", "facebook.com", "solarquarter.com"}
    assert rows["pib.gov.in"]["tier"] == 1 and rows["pib.gov.in"]["status"] == "kept"
    assert rows["auto.economictimes.indiatimes.com"]["tier"] == 3
    assert rows["auto.economictimes.indiatimes.com"]["canonical_url"] == \
        "https://auto.economictimes.indiatimes.com/news/ism-osat"
    assert rows["facebook.com"]["status"] == "rejected" and rows["facebook.com"]["tier"] == 9
    assert rows["solarquarter.com"]["status"] == "rejected"
    assert rows["solarquarter.com"]["reject_reason"].startswith("off-topic")
    assert all(r["times_seen"] == 2 for r in rows.values())


def test_support_records_the_sentence_each_source_backed(ran):
    from app.db import evidence, evidence_support, get_engine
    with get_engine().connect() as c:
        eid = c.execute(select(evidence.c.id).where(evidence.c.domain == "pib.gov.in")).scalar()
        claims = {r.claim for r in c.execute(select(evidence_support.c.claim)
                                              .where(evidence_support.c.evidence_id == eid))}
    assert claims == {"ISM approved four OSAT units in 2025."}


def test_every_search_is_in_the_ledger(ran):
    from app.llm import quota
    farm = ran[0]
    grounded = sum(1 for _, ws in farm.calls if ws)
    assert grounded == 4
    assert quota.status()["google_grounding"]["used"] == 4 * 2   # settled to webSearchQueries count


def test_quota_exhausted_falls_through_then_refuses(env):
    from app.llm import gateway, quota
    from app.llm.gateway import LLMResult
    env.setattr(type(gateway.get_settings()), "grounded_monthly_cap", 0)
    env.setattr(type(gateway.get_settings()), "anthropic_search_monthly_cap", 100000)
    used = []
    env.setattr(gateway, "call", lambda m, p, **kw: used.append(m.id) or LLMResult(m.id, "ok", searches=1))
    r = gateway.run("research.search", "q")
    assert used == ["claude-haiku-4-5@20251001"]            # both Gemini models skipped by the cap
    assert r.model == "claude-haiku-4-5@20251001"
    env.setattr(type(gateway.get_settings()), "anthropic_search_monthly_cap", 0)
    with pytest.raises(quota.QuotaExceeded):
        gateway.run("research.search", "q")
    env.setattr(type(gateway.get_settings()), "grounded_monthly_cap", 1000)


def test_failed_call_releases_its_reservation(env):
    from app.llm import gateway, quota

    def boom(m, p, **kw):
        raise gateway.FarmError("down")
    env.setattr(gateway, "call", boom)
    before = quota.status()
    with pytest.raises(gateway.FarmError):
        gateway.run("research.search", "q")
    assert quota.status() == before


def test_api_evidence_endpoints(ran):
    from app import main
    main._board_cached.cache_clear()
    main._scores.cache_clear()
    with TestClient(main.app) as c:
        ev = c.get("/api/evidence/semis").json()
        assert [s["domain"] for s in ev["sources"]] == ["pib.gov.in", "auto.economictimes.indiatimes.com"]
        assert ev["kept_by_tier"] == {"1": 1, "3": 1}
        assert ev["sources"][0]["claims"] == ["ISM approved four OSAT units in 2025."]
        assert c.get("/api/evidence/semis", params={"status": "all"}).json()["count"] == 4
        assert c.get("/api/evidence/nope").status_code == 404
        runs = c.get("/api/research/runs", params={"entity_id": "semis"}).json()
        assert len(runs) == 2 and runs[0]["plan"]["scope"]
        assert "google_grounding" in c.get("/api/quota").json()
    main._board_cached.cache_clear()
    main._scores.cache_clear()


def test_academic_and_derivative_sources():
    assert classify("https://www.iitm.ac.in/news/x")[0] == 2
    assert classify("https://5.imimg.com/data5/x.pdf")[0] == 9
    assert classify("https://www.drishtiias.com/daily-updates/x")[0] == 9


def test_retier_applies_list_changes_to_stored_rows(ran, env):
    from app.db import evidence, get_engine
    from app.evidence import research as R_, tiers
    env.setattr(tiers, "PRESS_DOMAINS", tiers.PRESS_DOMAINS - {"economictimes.indiatimes.com",
                                                               "auto.economictimes.indiatimes.com"})
    assert R_.retier("semis") == {"changed": 1}
    with get_engine().connect() as c:
        row = c.execute(select(evidence).where(evidence.c.domain == "auto.economictimes.indiatimes.com")).mappings().one()
        solar = c.execute(select(evidence).where(evidence.c.domain == "solarquarter.com")).mappings().one()
    assert (row["tier"], row["status"]) == (4, "kept")
    assert solar["status"] == "rejected"          # off-topic rejection survives a retier

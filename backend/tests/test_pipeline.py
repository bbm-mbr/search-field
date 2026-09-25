"""Phase 2 author pipeline against a fake LLM Farm: stage routing, the
corrective retry, source renumbering, blind scoring and escalation, the sizing
gate, and that nothing reaches the live board."""
import json
import re
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app.pipeline import context, validate

SEED = Path(__file__).resolve().parents[1] / "seed" / "board.json"
BOARD = json.loads(SEED.read_text(encoding="utf-8"))
FID = "semis"
SUBS = next(f["subs"] for f in BOARD["FIELDS"] if f["id"] == FID)
PWS = lambda t: {"p": f"{t} point", "why": f"{t} because [2]", "sowhat": f"{t} so Bosch acts"}


def gen(stage, sam=700):
    if stage == "pestel":
        dims = validate.DIMS
        pts = {d: [{"cat": "c", **PWS(d), "i": "medium", "subs": [SUBS[(i * 2 + j) % len(SUBS)]], "c": [2]}
                   for j in range(2)] for i, d in enumerate(dims)}
        fa = {k: {"for": [PWS(k)] * 3, "against": [PWS(k)] * 3} for k in validate.FA}
        return {"pestel": pts, "pestelFA": fa}
    if stage == "swot":
        q = lambda t: [{"area": "Market", **PWS(t)} for _ in range(5)]
        return {"swot": {"S": q("S"), "W": q("W"), "O": q("O"), "T": q("T"),
                         "tows": {k: f"{k} using [1]" for k in ("SO", "ST", "WO", "WT")},
                         "targetStrategy": {"growth": [{"lever": "l", "action": "a"}],
                                            "improvement": [{"gap": "g", "action": "partner"}]},
                         "strategy": "s", "scoreRationale": "r"},
                "swot5": {k: q(k) for k in "SWOT"}}
    if stage == "market":
        parts = [sam // 4, sam // 4, sam // 4, sam - 3 * (sam // 4)]
        return {"market": {"tam": sam * 3, "sam": sam, "cagr": 18, "year": 2030,
                           "derivation": [{"step": "s", "value": "v", "src": "[3]"}] * 3,
                           "buildup": {"tamNote": "n", "tam": [{"k": "a", "v": sam, "why": "w"}] * 3,
                                       "samNote": "n", "sam": [{"k": f"s{i}", "v": v, "why": "w", "sub": SUBS[i]}
                                                               for i, v in enumerate(parts)]},
                           "crossCheck": "corridor [3]", "customers": [{"s": "OEM", "buy": "chips", "note": "n"}],
                           "attractiveness": {"maturity": "m", "histCagr": "h", "fwdCagr": "f", "drivers": ["d"],
                                              "constraints": ["c"], "access": {"channels": "c"}, "valuePool": "v",
                                              "whiteSpace": [{"p": "p", "why": "w", "sub": SUBS[0]}],
                                              "profitability": "p"},
                           "scoreRationale": "r"},
                "marketModel": {"scurve": "s", "bizModel": "b", "revenue": [{"k": "k", "v": "v", "note": "n"}]}}
    if stage == "porter":
        return {"porter": [{"force": f, "why": "w [4]", "drivers": ["d"], "c": [4]} for f in validate.FORCES],
                "porterRationale": "Rivalry dominates [4]",
                "porterDetail": {f: [{"k": "k", "v": "v"}] for f in validate.FORCES}}
    if stage == "competency":
        return {"competency": [{"name": f"c{i}", "bosch": 7, "req": 8, "whyReq": "r", "whyBosch": "b",
                                "gap": "build", "gapWhy": "g"} for i in range(5)],
                "competencyAssessment": [{"cat": c, "need": "n", "current": 6, "target": 8, "priority": "High"}
                                         for c in validate.CA_CATS],
                "competencyRemark": "Talent binds"}
    if stage == "horizons":
        return {"horizons": {"h1": [{"item": "i", "why": "w"}],
                             "h2": [{"item": "i", "why": "w", "trigger": "t"}],
                             "h3": [{"item": "i", "why": "w", "trigger": "t"}], "rationale": "r"},
                "techGrowth": {"proven": "p", "maturity": [], "adoption": "a", "innovation": [], "evolution": "e",
                               "ecosystem": "e", "risks": []},
                "research": {"note": "n", "gap": "g"}}
    if stage == "landscape":
        comps = ["Infineon", "Tata Electronics", validate.BOSCH]
        return {"stakeholders": [{"name": f"S{i}", "type": "oem", "influence": 7, "interest": 7, "stance": "ally",
                                  "reasoning": "r"} for i in range(4)],
                "competitors": [{"name": n, "type": "global", "x_price_position": 6, "y_tech_depth": 7, "moat": "m",
                                 "reasoning": f"competes in {SUBS[0]}"} for n in comps],
                "competitorProfiles": [{"name": n, "radar": {k: 6 for k in ("tech", "price", "indiaPresence", "service",
                                                                          "innovation", "ecosystem")}} for n in comps],
                "competitorWhiteSpace": "qualification [5]", "competitorDynamics": {"count": "few"},
                "competitorAssessment": {"strengths": "s"}}
    if stage == "suppliers":
        return {"suppliers": [{"input": f"i{k}", "supply_risk": 5, "profit_impact": 5, "quadrant": "leverage",
                               "reasoning": "r"} for k in range(3)], "supplierAnalysis": {"tech": "t"}}
    raise KeyError(stage)


def v8(sam, level=3, momentum="Medium", hostile=False):
    if hostile:
        fo, ag = {"impact": 1, "certainty": 1}, {"impact": 5, "certainty": 5}
    else:
        fo, ag = {"impact": 5, "certainty": 5}, {"impact": 3, "certainty": 3}
    return {"pestel": {k: {"for": [fo] * 3, "against": [ag] * 3} for k in validate.FA},
            "swot": {q: [{"impact": level, "probability": level}] * 5 for q in "SWOT"},
            "market": {"samUSD": sam * 1_000_000, "cagrPct": 18, "scurveScore": 4, "scurveWhy": "w",
                       "revenueQualityScore": 3, "revenueQualityWhy": "w", "profitabilityScore": 3, "profitabilityWhy": "w"},
            "iai": {f: [3] * n for f, n in validate.IAI_COUNTS.items()},
            "competency": {"profile": "hardwareMechatronic",
                           "areas": {a: {"required": 3, "current": 2} for a in validate.COMP_AREAS}, "narrative": "n"},
            "stakeholders": [{"name": f"S{i}", "category": "Customers & End-Users", "power": 5, "stance": 1,
                              "boschInfluence": 3, "boschInfluenceWhy": "w"} for i in range(4)],
            "competitors": [{"name": n, "marketPosition": "High", "futureMomentum": momentum, "why": "w"}
                            for n in ("Infineon", "Tata Electronics")],
            "boschStrength": "High", "boschStrengthWhy": "w", "marketGapSignificance": "High", "marketGapWhy": "w",
            "supplyChainMaturity": "Medium", "supplyChainWhy": "w", "boschControl": "High", "boschControlWhy": "w",
            "techVelocity": "High", "commReadiness": "Medium", "techTrendWhy": "TRL 7"}


class Farm:
    """Answers by task marker. The first PESTEL answer is unbalanced on purpose."""

    def __init__(self, sam=700, blind_level=3):
        self.sam, self.blind_level = sam, blind_level
        self.calls, self.pestel_asks = [], []

    def __call__(self, model, prompt, *, system=None, max_tokens=1024, temperature=0.2, web_search=False, effort=None):
        from app.llm.gateway import LLMResult
        m = re.search(r"TASK: (\w+)", prompt)
        task = m.group(1).lower() if m else "critic"
        self.calls.append((task, model.id))
        R = lambda o: LLMResult(model.id, json.dumps(o), 1000, 500)
        if "two independent scorers" in prompt:
            return R({**v8(self.sam, 3), "_reconcile": [{"path": "swot", "chosen": 3, "why": "evidence"}]})
        if task == "pestel":
            self.pestel_asks.append(prompt)
            out = gen("pestel")
            if len(self.pestel_asks) == 1:                         # everything tagged to one sub-field
                for pts in out["pestel"].values():
                    for p in pts:
                        p["subs"] = [SUBS[0]]
            return R({**out, "_changed": ["G1: rebalanced"], "confidence": 0.7})
        if task == "score":
            if model.family != "claude" and self.blind_level != 3:      # a genuinely different reading
                return R(v8(self.sam, self.blind_level, "High", hostile=True))
            return R(v8(self.sam))
        if task == "the":                                          # "TASK: the field verdict"
            return R({"verdict": {"entry": "e", "reasoning": ["drag: talent", "b", "c"],
                                  "portfolio": [{"sub": s, "play": "LEAD", "what": "w", "why": "y",
                                                 "winCondition": "c", "ifWrong": "i"} for s in reversed(SUBS)],
                                  "risks": ["r"], "aiAnalyst": {"whereWeWin": ["w"], "exposure": ["e"],
                                                                "narrative": "n", "bottomLine": "INVEST in qualification"}},
                      "confidence": 0.7})
        if task in ("swot", "top", "porter", "what", "mckinsey", "stakeholders", "supplier"):
            stage = {"top": "market", "what": "competency", "mckinsey": "horizons", "stakeholders": "landscape",
                     "supplier": "suppliers"}.get(task, task)
            return R({**gen(stage, self.sam), "_changed": [], "confidence": 0.7})
        return R({"verdict": "PASS_WITH_NOTES", "defects": [],
                  "guidance": [{"id": "G1", "addressed": True, "where": "pestel"}], "reviewer_note": "fine"})


@pytest.fixture()
def env(tmp_path, monkeypatch):
    url = f"sqlite:///{(tmp_path / 'p.db').as_posix()}"
    from app import config, db
    from app.pipeline import guidance
    from app.repository import seed_from_board
    monkeypatch.setattr(config.Settings, "database_url", url)
    db._engine = None
    db.create_all()
    seed_from_board(BOARD)
    guidance.load_seed()
    yield monkeypatch
    db._engine = None


def run(env, farm):
    from app.llm import gateway
    from app.pipeline.author import propose
    env.setattr(gateway, "call", farm)
    return propose(FID, as_of="25 September 2026")


def test_every_task_routes_to_the_policy_tier(env):
    farm = Farm()
    s = run(env, farm)
    assert s["status"] == "ready", s
    by = {}
    for task, model in farm.calls:
        by.setdefault(task, set()).add(model)
    assert by["pestel"] == {"claude-sonnet-5"}                 # standard tier authors
    assert by["the"] == {"claude-opus-5"}                      # premium only for the verdict
    assert by["score"] == {"claude-sonnet-5", "gemini-3.7-flash"}     # two families score independently
    assert by["critic"] == {"gpt-5.6-terra-2026-07-09"}               # and a third family critiques
    assert "claude-opus-5" not in {m for t, m in farm.calls if t != "the"}


def test_unbalanced_pestel_is_sent_back_with_its_defects(env):
    farm = Farm()
    run(env, farm)
    assert len(farm.pestel_asks) == 2
    assert "pestel covers no point for sub-field" in farm.pestel_asks[1]
    assert "Your previous answer" in farm.pestel_asks[1]


def test_guidance_reaches_the_author(env):
    farm = Farm()
    run(env, farm)
    p = farm.pestel_asks[0]
    assert "labour cost is a cost ADVANTAGE" in p            # portfolio rule, pestel stage
    assert "Market figures" not in p


def test_market_is_sized_blind(env):
    farm = Farm()
    from app.llm import gateway
    seen = []
    orig = farm.__call__

    def spy(model, prompt, **kw):
        if "TASK: top-down market sizing" in prompt:
            seen.append(prompt)
        return orig(model, prompt, **kw)
    env.setattr(gateway, "call", spy)
    from app.pipeline.author import propose
    propose(FID, as_of="25 September 2026")
    pub = BOARD["DATA"][FID]["market"]
    assert seen and f'"sam":{pub["sam"]}' not in seen[0].replace(" ", "") and "Existing content" not in seen[0]


def test_proposal_is_stored_and_live_board_untouched(env):
    s = run(env, Farm())
    from app.repository import assemble_board
    assert json.dumps(assemble_board(), ensure_ascii=False) == json.dumps(BOARD, ensure_ascii=False)
    from app import main
    main._board_cached.cache_clear()
    main._scores.cache_clear()
    with TestClient(main.app) as c:
        d = c.get(f"/api/proposals/{s['proposal_id']}").json()
        lst = c.get("/api/proposals").json()
    main._board_cached.cache_clear()
    main._scores.cache_clear()
    assert lst[0]["id"] == s["proposal_id"] and lst[0]["status"] == "ready"
    secs = {(x["layer"], x["section"]): x for x in d["sections"]}
    assert ("DATA", "pestel") in secs and ("V8", "swot") in secs and ("DATA", "sources") in secs
    # porter carries the engine-derived intensity, in the published key order
    por = secs[("DATA", "porter")]["after"]
    assert list(por[0])[:2] == ["force", "v"] and por[0]["v"] == 5.0
    assert d["guidance_check"]["items"] and d["critic"]["verdict"] == "PASS_WITH_NOTES"
    golden = json.loads((SEED.parent / "golden.json").read_text(encoding="utf-8"))
    assert d["scores"]["before"]["mgi"] == golden["portfolio"][FID]["mgi"]


def test_sources_are_renumbered_across_all_sections(env):
    s = run(env, Farm())
    from app.db import get_engine, proposal_section
    from sqlalchemy import select
    with get_engine().connect() as c:
        rows = {(r.layer, r.section): json.loads(r.content) for r in c.execute(
            select(proposal_section).where(proposal_section.c.proposal_id == s["proposal_id"]))}
    labels = rows[("DATA", "sources")]
    urls = rows[("V7", "sources")]
    assert len(labels) == len(urls)
    # first citation in pestel order becomes [1]; every reference resolves inside the list
    assert rows[("DATA", "pestel")]["Political"][0]["c"] == [1]
    everything = json.dumps([v for k, v in rows.items() if k[0] != "V8" and k[1] != "sources"])
    refs = {int(i) for m in context.REF.finditer(everything) for i in m.group(1).split(",")}
    assert refs and max(refs) <= len(labels)
    # a top-level string section is renumbered too
    assert re.search(r"\[\d+\]", rows[("DATA", "porterRationale")])


def test_blind_disagreement_escalates_to_premium(env):
    farm = Farm(blind_level=5)
    s = run(env, farm)
    assert s["blind"]["escalated"] is True
    assert any(m == "claude-opus-5" for t, m in farm.calls if t == "score")   # reconcile ran on premium
    from app.db import get_engine, proposal
    from sqlalchemy import select
    with get_engine().connect() as c:
        blind = json.loads(c.execute(select(proposal.c.blind).where(proposal.c.id == s["proposal_id"])).scalar())
    assert blind["reconciled"]["by"] == "claude-opus-5" and blind["reconciled"]["notes"]


def _critic_of(pid):
    from app.db import get_engine, proposal
    from sqlalchemy import select
    with get_engine().connect() as c:
        return json.loads(c.execute(select(proposal.c.critic).where(proposal.c.id == pid)).scalar())


def test_sizing_gate_blocks_a_change_of_definition(env):
    s = run(env, Farm(sam=5000))           # published semis SAM is 720: 6.9x
    d = _critic_of(s["proposal_id"])["defects"][0]
    assert s["status"] == "blocked" and d["severity"] == "block" and "change of what the market is" in d["problem"]


def test_sizing_gate_flags_an_unsupported_move(env):
    s = run(env, Farm(sam=1100))           # +53%, cited only to a prior (untiered) source
    d = _critic_of(s["proposal_id"])["defects"][0]
    assert d["severity"] == "major" and "without a tier-1 or tier-2" in d["problem"]


def test_market_sees_the_definition_but_no_figures(env):
    from app.pipeline.author import _market_definition
    m = BOARD["DATA"][FID]["market"]
    d = json.dumps(_market_definition(m), ensure_ascii=False)
    assert str(m["sam"]) not in d and str(m["tam"]) not in d
    assert [x["sub"] for x in _market_definition(m)["samComponents"]] == [x["sub"] for x in m["buildup"]["sam"]]


def test_critic_defects_go_back_to_the_owning_stage_once(env):
    farm = Farm()
    orig = farm.__call__
    state = {"critic": 0, "pestel_fb": None}

    def call(model, prompt, **kw):
        if "TASK:" not in prompt and "two independent scorers" not in prompt:      # the critic
            state["critic"] += 1
            from app.llm.gateway import LLMResult
            if state["critic"] == 1:
                return LLMResult(model.id, json.dumps({"verdict": "BLOCK", "defects": [
                    {"severity": "major", "location": "DATA.pestel.Legal / V7.pestelFA.L",
                     "problem": "IATF 16949 is not a law", "fix": "move it out of Legal"}]}), 10, 10)
            return orig(model, prompt, **kw)
        if "TASK: PESTEL" in prompt and "A reviewer found these defects" in prompt:
            state["pestel_fb"] = prompt
        return orig(model, prompt, **kw)
    from app.llm import gateway
    env.setattr(gateway, "call", call)
    from app.pipeline.author import propose
    s = propose(FID, as_of="25 September 2026")
    assert state["critic"] == 2 and "IATF 16949 is not a law" in state["pestel_fb"]
    assert s["revision"]["stages"] == ["pestel"] and s["status"] == "ready"
    swot_calls = [t for t, _ in farm.calls if t == "swot"]
    assert len(swot_calls) == 1                                  # stages without defects are not re-run


def test_critic_sees_sources_in_the_final_numbering(env):
    farm = Farm()
    seen = []
    orig = farm.__call__

    def call(model, prompt, **kw):
        if "TASK:" not in prompt and "two independent scorers" not in prompt:
            seen.append(prompt)
        return orig(model, prompt, **kw)
    from app.llm import gateway
    env.setattr(gateway, "call", call)
    from app.pipeline.author import propose
    s = propose(FID, as_of="25 September 2026")
    from app.db import get_engine, proposal
    from sqlalchemy import select
    with get_engine().connect() as c:
        srcs = json.loads(c.execute(select(proposal.c.sources).where(proposal.c.id == s["proposal_id"])).scalar())
    block = seen[-1].split("### Numbered sources")[1].split("###")[0]
    assert f"[1] (already cited by this field) {srcs[0]['label']}" in block
    assert f"[{len(srcs) + 1}]" not in block


def test_effort_is_sent_per_task_and_only_to_models_that_take_it(monkeypatch):
    from app.llm import gateway
    from app.llm.routing import HAIKU_45, SONNET_5
    bodies = []

    class Resp:
        status_code = 200
        text = ""

        def json(self):
            return {"content": [{"type": "text", "text": "{}"}], "usage": {"input_tokens": 1, "output_tokens": 1,
                    "output_tokens_details": {"thinking_tokens": 7}}, "stop_reason": "end_turn"}

    class Client:
        def __enter__(self): return self
        def __exit__(self, *a): return False
        def post(self, url, headers=None, json=None, params=None):
            bodies.append(json)
            return Resp()
    monkeypatch.setattr(gateway, "_client", lambda: Client())
    monkeypatch.setattr(gateway.get_settings(), "farm_api_key", "x", raising=False)
    r = gateway.run("write.framework", "p")
    assert bodies[-1]["output_config"] == {"effort": "medium"} and r.thinking_tokens == 7
    gateway.call(HAIKU_45, "p", effort="medium")
    assert "output_config" not in bodies[-1]
    gateway.call(SONNET_5, "p")
    assert "output_config" not in bodies[-1]


def test_finalise_sources_drops_unknown_and_rewrites_strings():
    srcs = [{"n": i, "label": f"L{i}", "url": f"https://x/{i}", "origin": "prior", "claims": []} for i in (1, 2, 3)]
    holder = {"a": "top [3] and [9]", "b": {"c": [2, 3], "t": "see [2, 3]"}}
    labels, urls, _ = context.finalise_sources(holder, srcs)
    assert labels == ["L3", "L2"] and urls == [{"url": "https://x/3"}, {"url": "https://x/2"}]
    assert holder == {"a": "top [1] and", "b": {"c": [2, 1], "t": "see [2, 1]"}}


def test_malformed_answer_is_a_defect_not_a_crash(env):
    """Live failure 2026-09-25: Sonnet returned IAI sub-factors as objects."""
    farm = Farm()
    bad = {"n": 0}
    orig = farm.__call__

    def call(model, prompt, **kw):
        r = orig(model, prompt, **kw)
        if "TASK: score" in prompt and model.family == "claude" and bad["n"] == 0:
            bad["n"] += 1
            o = json.loads(r.text)
            o["iai"]["Rivalry"] = [{"factor": "number", "score": 3}] * 6
            r.text = json.dumps(o)
        return r
    from app.llm import gateway
    env.setattr(gateway, "call", call)
    from app.pipeline.author import propose
    s = propose(FID, as_of="25 September 2026")
    assert s["status"] == "ready" and bad["n"] == 1


def test_failed_pass_resumes_without_re_authoring_finished_stages(env):
    from app.llm import gateway
    from app.pipeline.author import propose
    farm = Farm()
    orig = farm.__call__

    def dies_at_verdict(model, prompt, **kw):
        if "TASK: the field verdict" in prompt:
            raise gateway.FarmError("farm down")
        return orig(model, prompt, **kw)
    env.setattr(gateway, "call", dies_at_verdict)
    with pytest.raises(gateway.FarmError):
        propose(FID, as_of="25 September 2026")
    first_calls = len(farm.calls)
    env.setattr(gateway, "call", farm)
    s = propose(FID, as_of="25 September 2026", resume=1)
    again = [t for t, _ in farm.calls[first_calls:]]
    assert s["proposal_id"] == 1 and s["status"] == "ready"
    assert "pestel" not in again and "score" not in again     # checkpointed stages were reused
    assert "the" in again and "critic" in again                # only what had not finished ran


def test_truncation_jumps_straight_to_the_ceiling(env):
    from app.llm import gateway
    from app.pipeline import author
    seen = []

    def call(model, prompt, *, max_tokens=1024, **kw):
        from app.llm.gateway import LLMResult
        seen.append(max_tokens)
        if len(seen) == 1:
            return LLMResult(model.id, '{"pestel": {', 10, max_tokens, truncated=True)
        return LLMResult(model.id, json.dumps(gen("pestel")), 10, 10)
    env.setattr(gateway, "call", call)
    out, meta = author._ask("pestel", "write.framework", "s", "p", {"subs": SUBS, "n_sources": 9},
                            author.Usage(), validate.pestel)
    assert seen == [author.MAX_TOKENS["pestel"], author.TRUNCATION_CEILING]
    assert meta["status"] == "ok" and meta["attempts"] == 1


def test_unsupported_claims_are_web_checked_before_revision(env):
    farm = Farm()
    orig = farm.__call__
    state = {"critic": 0, "fb": None, "checked": None}

    def call(model, prompt, **kw):
        if "TASK:" not in prompt and "two independent scorers" not in prompt:
            state["critic"] += 1
            from app.llm.gateway import LLMResult
            if state["critic"] == 1:
                return LLMResult(model.id, json.dumps({"verdict": "BLOCK", "defects": [
                    {"severity": "major", "location": "DATA.swot.S[0]",
                     "problem": "The 17 IATF-certified plants claim is not supported by cited sources",
                     "fix": "cite or drop"}]}), 10, 10)
            return orig(model, prompt, **kw)
        if "TASK: SWOT" in prompt and "A reviewer found these defects" in prompt:
            state["fb"] = prompt
        return orig(model, prompt, **kw)

    def fake_verify(entity_id, claims, scope, resolver=None):
        state["checked"] = claims
        return {"run_id": 9, "status": "done", "tokens_in": 5, "tokens_out": 5,
                "findings": [{"claim": claims[0], "finding": "Bosch reports IATF 16949 at its India plants [PIB].",
                              "evidence_ids": []}]}
    from app.llm import gateway
    from app.pipeline import author
    env.setattr(gateway, "call", call)
    env.setattr(author.evidence_research, "verify_claims", fake_verify)
    s = author.propose(FID, as_of="25 September 2026")
    assert state["checked"] == ["The 17 IATF-certified plants claim is not supported by cited sources"]
    assert "Web check of this point: Bosch reports IATF 16949" in state["fb"]
    assert s["revision"]["verified"][0]["sources"] == []


def test_resume_keeps_the_source_numbering_even_if_evidence_grew(env):
    """Live bug 2026-09-25: a resume rebuilt the numbered source list from an
    evidence store that verification had grown, so reused drafts cited the
    wrong sources."""
    from datetime import datetime, timezone
    from sqlalchemy import insert
    from app.db import evidence, get_engine
    from app.llm import gateway
    from app.pipeline.author import _load_drafts, propose
    env.setattr(gateway, "call", Farm())
    propose(FID, as_of="25 September 2026")
    frozen = _load_drafts(1)["_sources"][0]
    now = datetime.now(timezone.utc).isoformat()
    with get_engine().begin() as c:            # a tier-1 source arrives: it would sort to the top
        c.execute(insert(evidence).values(entity_id=FID, canonical_url="https://pib.gov.in/new", domain="pib.gov.in",
                                          tier=1, tier_reason="primary", status="kept", first_seen_at=now,
                                          last_seen_at=now, times_seen=9))
    propose(FID, as_of="25 September 2026", resume=1, revise=False)
    assert _load_drafts(1)["_sources"][0] == frozen

"""One authoring pass over one search field → a proposal.

    frameworks   eight bounded stages on the standard tier (Sonnet 5), in
                 parallel: pestel, swot, market (blind to the current sizing),
                 porter, competency, horizons, landscape, suppliers
    score        rubric inputs only (standard tier), and — independently and in
                 parallel — the same rubric from a different model family
                 (second tier, GPT-5.5) that never sees the first scorer's inputs
    engine       the V9 engine computes both; if they differ materially (band
                 changes or MGI moves ≥ 0.15) the premium tier reconciles them
    verdict      premium tier (Opus 5), shown the computed indices, writes prose
                 only — it cannot move a number
    critic       second tier: consistency, balance, evidence, depth, and every
                 open guidance item addressed or not — shown the sources in
                 the same numbering the sections cite
    revision     one round: each block/major defect goes back to the stage that
                 owns it, then scoring, verdict and critic run again

Nothing here touches the live board. Sections are written to
proposal_section; a human publishes them (not built yet — review first).
"""
from __future__ import annotations

import copy
import hashlib
import json
import re
import traceback
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
from typing import Dict, List, Optional, Tuple

from sqlalchemy import delete, insert, select, update

from ..db import get_engine, proposal, proposal_draft, proposal_section
from ..engine import scoring as E
from ..llm import gateway, jsonutil
from ..repository import assemble_board
from . import context, guidance, prompts, validate

# stage → {output key: (layer, section)}
OUTPUTS: Dict[str, Dict[str, Tuple[str, str]]] = {
    "pestel": {"pestel": ("DATA", "pestel"), "pestelFA": ("V7", "pestelFA")},
    "swot": {"swot": ("DATA", "swot"), "swot5": ("V7", "swot5")},
    "market": {"market": ("DATA", "market"), "marketModel": ("V6", "market")},
    "porter": {"porter": ("DATA", "porter"), "porterRationale": ("DATA", "porterRationale"),
               "porterDetail": ("V6", "porterDetail")},
    "competency": {"competency": ("DATA", "competency"), "competencyAssessment": ("V6", "competencyAssessment"),
                   "competencyRemark": ("V6", "competencyRemark")},
    "horizons": {"horizons": ("DATA", "horizons"), "techGrowth": ("V6", "techGrowth"), "research": ("V6", "research")},
    "landscape": {"stakeholders": ("DATA", "stakeholders"), "competitors": ("DATA", "competitors"),
                  "competitorWhiteSpace": ("DATA", "competitorWhiteSpace"),
                  "competitorProfiles": ("V7", "competitorProfiles"),
                  "competitorDynamics": ("V6", "competitorDynamics"),
                  "competitorAssessment": ("V6", "competitorAssessment")},
    "suppliers": {"suppliers": ("DATA", "suppliers"), "supplierAnalysis": ("V6", "supplierAnalysis")},
    "verdict": {"verdict": ("DATA", "verdict")},
}
FRAMEWORKS = ["pestel", "swot", "market", "porter", "competency", "horizons", "landscape", "suppliers"]
# Budgets cover the visible JSON (~2.6 characters per token, about the board's
# own section sizes) AND the hidden thinking, which counts against max_tokens.
# Measured on Manufacturing, 2026-09-25, at effort "medium": thinking ran
# 1.5k–7k tokens a stage on top of 4k–10k visible. Every truncation is a call
# paid for twice, so these err generous.
MAX_TOKENS = {"pestel": 22000, "swot": 16000, "market": 12000, "porter": 8000, "competency": 8000,
              "horizons": 8000, "landscape": 16000, "suppliers": 6000, "score": 16000, "verdict": 12000,
              "blind": 24000, "critic": 24000, "reconcile": 16000}
TRUNCATION_CEILING = 32000
BLIND_MODEL_TASK = "score.blind"
ESCALATE_MGI = 0.15
SIZING_MOVE = 0.35          # SAM moving more than this needs tier-1/2 evidence behind it
PARALLEL = 4


def _now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def _dump(v) -> str:
    return json.dumps(v, ensure_ascii=False, separators=(",", ":"))


class Usage:
    def __init__(self):
        self.calls: List[dict] = []

    def add(self, stage: str, r):
        self.calls.append({"stage": stage, "model": r.model, "in": r.input_tokens, "out": r.output_tokens,
                           "thinking": r.thinking_tokens, "s": round(r.latency_s, 1), "truncated": r.truncated})

    def summary(self) -> dict:
        by = {}
        for c in self.calls:
            m = by.setdefault(c["model"], {"calls": 0, "in": 0, "out": 0, "thinking": 0})
            m["calls"] += 1
            m["in"] += c["in"]
            m["out"] += c["out"]
            m["thinking"] += c.get("thinking", 0)
        return {"by_model": by, "calls": self.calls}


def _ask(stage: str, task: str, system: str, prompt: str, ctx: dict, usage: Usage,
         validator=None, attempts: int = 2) -> Tuple[Optional[dict], dict]:
    """One stage: call, parse, validate; on defects, one corrective retry with
    the previous answer and its defects. A truncated answer is re-asked with a
    bigger budget rather than repaired."""
    mt = MAX_TOKENS.get(stage, 8000)
    meta = {"stage": stage, "attempts": 0, "defects": [], "model": None, "status": "failed"}
    ask, out = prompt, None
    tries, grew = 0, False
    while tries < attempts:
        tries += 1
        meta["attempts"] = tries
        r = gateway.run(task, ask, system=system, max_tokens=mt, temperature=0.3)
        usage.add(stage, r)
        meta["model"] = r.model
        if r.truncated:
            meta["defects"] = [f"answer truncated at {mt} tokens"]
            mt = TRUNCATION_CEILING
            if not grew:                     # the first truncation gets a re-ask that does not count
                grew, tries = True, tries - 1
            continue
        try:
            out = jsonutil.parse(r.text, jsonutil.farm_repair)
        except jsonutil.JSONError as e:
            meta["defects"] = [f"not valid JSON: {e}"]
            continue
        if not isinstance(out, dict):
            meta["defects"] = ["answer must be a JSON object"]
            continue
        try:
            defects = validator(out, ctx) if validator else []
        except Exception as e:                   # a malformed answer is a defect, never a crash
            defects = [f"the answer does not follow the required shape ({type(e).__name__}: {e}); "
                       f"follow the shape exactly, with plain values where the shape shows them"]
        meta["defects"] = defects
        if not defects:
            meta["status"] = "ok"
            break
        ask = (prompt + "\n\n### Your previous answer\n" + _dump(out)
               + "\n\n### It failed these checks — fix every one and return the COMPLETE corrected JSON\n- "
               + "\n- ".join(defects))
    return out, meta


# ── checkpoints ──────────────────────────────────────────────────────────────
def _save_draft(pid: int, stage: str, out, meta: dict) -> None:
    with get_engine().begin() as c:
        c.execute(proposal_draft.delete().where(proposal_draft.c.proposal_id == pid,
                                                proposal_draft.c.stage == stage))
        c.execute(insert(proposal_draft).values(proposal_id=pid, stage=stage,
                                                content=_dump(out) if out is not None else None,
                                                meta=_dump(meta), created_at=_now()))


def _load_drafts(pid: int) -> Dict[str, Tuple[dict, dict]]:
    """Stages that finished cleanly in an earlier attempt of this proposal."""
    with get_engine().connect() as c:
        rows = c.execute(select(proposal_draft).where(proposal_draft.c.proposal_id == pid)).mappings().all()
    out = {}
    for r in rows:
        meta = json.loads(r["meta"])
        if meta.get("status") == "ok" and r["content"]:
            out[r["stage"]] = (json.loads(r["content"]), {**meta, "resumed": True})
    return out


def _checkpointed(pid: int, drafts: dict, stage: str, fn):
    """Return a finished stage from its checkpoint, or run it and checkpoint it."""
    if stage in drafts:
        return copy.deepcopy(drafts[stage])
    out, meta = fn()
    _save_draft(pid, stage, out, meta)
    return out, meta


# ── helpers over the analysis ───────────────────────────────────────────────
def _analysis_for_scoring(new: Dict[str, dict]) -> dict:
    g = lambda st, k: (new.get(st) or {}).get(k)
    return {"pestelFA": g("pestel", "pestelFA"), "swot5": g("swot", "swot5"), "market": g("market", "market"),
            "marketModel": g("market", "marketModel"), "porter": g("porter", "porter"),
            "porterDetail": g("porter", "porterDetail"), "competency": g("competency", "competency"),
            "competencyAssessment": g("competency", "competencyAssessment"),
            "stakeholders": g("landscape", "stakeholders"), "competitors": g("landscape", "competitors"),
            "competitorDynamics": g("landscape", "competitorDynamics"), "suppliers": g("suppliers", "suppliers"),
            "supplierAnalysis": g("suppliers", "supplierAnalysis"), "horizons": g("horizons", "horizons"),
            "techGrowth": g("horizons", "techGrowth")}


def _v8_ordered(v8: dict, template: dict) -> dict:
    """Rubric inputs in the published key order (the UI reads by key, but the
    stored document should look like the ones it replaces)."""
    keys = list(template) + [k for k in v8 if k not in template]
    return {k: v8[k] for k in keys if k in v8}


def _score_board(board: dict, fid: str, v8: dict, horizons: dict) -> dict:
    V8 = {**board["V8"], fid: v8}
    DATA = {**board["DATA"], fid: {**board["DATA"][fid], "horizons": horizons}}
    return E.score_portfolio([f["id"] for f in board["FIELDS"]], V8, DATA)


def _flat(p: dict, fid: str) -> dict:
    row = p["portfolio"][fid]
    return {**{k: row[k] for k, _, _ in E.INDEX_KEYS}, "band": (row.get("band") or {}).get("v"),
            "rank": p["stats"]["mgi"]["rankOf"].get(fid)}


def _compare(a: dict, b: dict) -> dict:
    return {"mgi_delta": round((b["mgi"] or 0) - (a["mgi"] or 0), 3), "band_changed": a["band"] != b["band"],
            "index_deltas": {k: round((b[k] or 0) - (a[k] or 0), 3) for k, _, _ in E.INDEX_KEYS}}


def _bands(scored_field: dict) -> dict:
    out = {}
    for k, v in scored_field.items():
        if isinstance(v, dict) and isinstance(v.get("band"), dict):
            out[k] = v["band"].get("v")
    return out


# ── the pass ─────────────────────────────────────────────────────────────────
def propose(field_id: str, board: Optional[dict] = None, as_of: Optional[str] = None,
            stages: Optional[List[str]] = None, resume: Optional[int] = None,
            redo: Optional[List[str]] = None, revise: bool = True) -> dict:
    """Author a proposal. `resume` continues an earlier proposal of the same
    field, reusing every stage that finished cleanly; `redo` re-runs named
    stages (and, for a framework stage, the scoring and verdict that depend on
    it). `revise` allows one revision round on the critic's serious defects."""
    board = board or assemble_board()
    field = next((f for f in board["FIELDS"] if f["id"] == field_id), None)
    if field is None:
        raise KeyError(f"unknown field '{field_id}'")
    eng = get_engine()
    with eng.begin() as c:
        if resume:
            row = c.execute(select(proposal.c.entity_id, proposal.c.status).where(proposal.c.id == resume)).first()
            if row is None or row.entity_id != field_id:
                raise KeyError(f"proposal {resume} is not a proposal for '{field_id}'")
            if row.status in ("published", "rejected"):
                raise ValueError(f"proposal {resume} is {row.status}; start a new one")
            pid = resume
            c.execute(delete(proposal_section).where(proposal_section.c.proposal_id == pid))
            c.execute(update(proposal).where(proposal.c.id == pid).values(status="drafting", error=None,
                                                                          finished_at=None))
        else:
            pid = c.execute(insert(proposal).values(entity_id=field_id, status="drafting",
                                                    created_at=_now())).inserted_primary_key[0]
    usage = Usage()
    try:
        return _run(pid, field, board, as_of, stages or FRAMEWORKS, usage, redo=redo, revise=revise)
    except Exception as e:
        with eng.begin() as c:
            c.execute(update(proposal).where(proposal.c.id == pid).values(
                status="failed", finished_at=_now(), error=f"{type(e).__name__}: {e}\n{traceback.format_exc()[-2000:]}",
                usage=_dump(usage.summary())))
        raise


DOWNSTREAM = ["score", "blind", "reconcile", "verdict"]      # depend on every framework stage
DEFINITION_MOVE = 3.0       # SAM moving by more than this factor is a change of definition, not of market
_NUM = re.compile(r"[$₹€]?\d[\d,.]*\s*(?:%|bn|billion|mn|million|M|B|cr|crore|lakh)?", re.I)


def _market_definition(m: Optional[dict]) -> Optional[dict]:
    """What the board's market IS, with every figure removed. The sizer is
    blind to the numbers (so it cannot anchor on them) but not to the
    definition (so it sizes the same market). Without the definition, the
    first live pass sized the whole Indian auto-component industry for
    Manufacturing: a 22x jump that was a change of definition, not of market."""
    if not m:
        return None
    strip = lambda t: _NUM.sub("#", t or "")
    b = m.get("buildup") or {}
    return {"note": "Figures removed on purpose. Size THIS market, or say explicitly why the definition must change.",
            "tamNote": strip(b.get("tamNote")), "samNote": strip(b.get("samNote")),
            "tamComponents": [strip(x.get("k")) for x in b.get("tam") or []],
            "samComponents": [{"k": strip(x.get("k")), "sub": x.get("sub")} for x in b.get("sam") or []],
            "derivationSteps": [strip(x.get("step")) for x in m.get("derivation") or []]}


def _stages_for(location: str) -> List[str]:
    """Which stage owns a critic defect's location, e.g. 'DATA.pestel.Legal /
    V7.pestelFA.L' → ['pestel']."""
    owners = []
    names = sorted(((sec, st) for st, outs in OUTPUTS.items() for _, sec in outs.values()),
                   key=lambda x: -len(x[0]))
    for sec, st in names:
        if re.search(rf"\b{re.escape(sec)}\b", location or "") and st not in owners:
            owners.append(st)
    if re.search(r"\bV8\b", location or "") and "score" not in owners:
        owners.append("score")
    return owners


def _sizing_gate(old_market: dict, new_market: dict, srcs: List[dict]) -> Optional[dict]:
    """Deterministic plausibility gate on SAM.
      > DEFINITION_MOVE x either way: a change of market definition → block,
        whatever the citations say; a human decides.
      > SIZING_MOVE: must rest on tier-1/2 evidence cited in the derivation or
        cross-check (in the numbering the author used) → otherwise major."""
    o, n = (old_market or {}).get("sam"), (new_market or {}).get("sam")
    if not o or not n:
        return None
    ratio = n / o
    if ratio > DEFINITION_MOVE or ratio < 1 / DEFINITION_MOVE:
        return {"severity": "block", "location": "DATA.market.sam",
                "problem": f"SAM moves {ratio:.1f}x (from {o} to {n} USD M). A move this large is a change of what the "
                           f"market is, not of how big it is.",
                "fix": "Size the market the board defines (see its definition), or state the new definition explicitly "
                       "in tamNote/samNote so a reviewer can accept it."}
    if abs(ratio - 1) <= SIZING_MOVE:
        return None
    text = _dump([new_market.get("derivation"), new_market.get("crossCheck")])
    refs = {int(i) for m in context.REF.finditer(text) for i in m.group(1).split(",")}
    if any(s["n"] in refs and s.get("tier") in (1, 2) for s in srcs):
        return None
    return {"severity": "major", "location": "DATA.market.sam",
            "problem": f"SAM moves {ratio - 1:+.0%} (from {o} to {n} USD M) without a tier-1 or tier-2 source in the "
                       f"derivation or cross-check.",
            "fix": "cite tier-1/2 sizing evidence or keep the published SAM"}


def _run(pid: int, field: dict, board: dict, as_of: Optional[str], stage_names: List[str], usage: Usage,
         redo: Optional[List[str]] = None, revise: bool = True) -> dict:
    fid = field["id"]
    D, V6, V7, V8 = (board[L][fid] for L in ("DATA", "V6", "V7", "V8"))
    srcs = context.source_list(fid, board)
    ctx = {"id": fid, "name": field["name"], "subs": field["subs"], "ma": D.get("ma") or [],
           "bbm": D.get("bbm") or [], "as_of": as_of or datetime.now(timezone.utc).strftime("%d %B %Y").lstrip("0"),
           "n_sources": len(srcs)}
    src_text = context.render_sources(srcs)
    system = prompts.PERSONA
    before = E.score_portfolio([f["id"] for f in board["FIELDS"]], board["V8"], board["DATA"])

    drafts = _load_drafts(pid)
    redo = list(redo or [])
    for s in redo:
        drafts.pop(s, None)
    if set(redo) & set(FRAMEWORKS):
        for s in DOWNSTREAM:
            drafts.pop(s, None)

    def prior_of(stage):
        if stage == "market":
            return None
        return {k: board[L][fid].get(sec) for k, (L, sec) in OUTPUTS[stage].items()}

    def feedback_text(defects: List[dict], previous) -> str:
        lines = "\n".join(f"- [{d.get('severity')}] {d.get('location')}: {d.get('problem')} — fix: {d.get('fix')}"
                          for d in defects)
        return ("\n\n### Your previous answer\n" + _dump(previous)
                + "\n\n### A reviewer found these defects in it. Fix every one, keep everything else that is sound, "
                  "and return the COMPLETE corrected JSON\n" + lines)

    # ── phase 1: framework stages ───────────────────────────────────────────
    new: Dict[str, dict] = {}
    metas: Dict[str, dict] = {}

    def framework(stage, fb=None):
        g = guidance.for_entity(fid, stage)
        head = prompts.context_block(ctx, src_text, guidance.render(g), prior_of(stage))
        if stage == "market":
            head += ("\n\n### The market this board sizes (definition only — figures withheld on purpose)\n"
                     + _dump(_market_definition(D.get("market"))))
        prompt = head + "\n\n" + prompts.STAGES[stage] + "\n\n" + prompts.FOOTER
        run = lambda: _ask(stage, "write.framework", system, prompt + (fb or ""), ctx, usage, validate.VALIDATORS[stage])
        if fb:                                   # a revision is always a fresh call, then re-checkpointed
            out, meta = run()
            _save_draft(pid, stage, out, meta)
            return stage, out, meta
        return stage, *_checkpointed(pid, drafts, stage, run)

    def run_frameworks(stages, fbs=None):
        with ThreadPoolExecutor(PARALLEL) as pool:
            futs = [pool.submit(framework, s, (fbs or {}).get(s)) for s in stages]
            for f in futs:
                stage, out, meta = f.result()
                metas[stage] = meta
                if meta["status"] == "ok":
                    new[stage] = out
        for stage in FRAMEWORKS:            # not re-authored (or failed): the published content stands in
            if stage not in new:
                new[stage] = {k: copy.deepcopy(board[L][fid].get(sec)) for k, (L, sec) in OUTPUTS[stage].items()}

    # ── phase 2: two independent scorers, the engine, the verdict ────────────
    def score_and_verdict(fbs=None):
        fbs = fbs or {}
        analysis = _analysis_for_scoring(new)
        score_ctx = {**ctx, "analysis": analysis}
        score_prompt = (prompts.context_block(ctx, "", "(see analysis)", None) + "\n\n### The analysis to score\n"
                        + _dump(analysis) + "\n\n" + prompts.SCORE)
        with ThreadPoolExecutor(2) as pool:
            fa = pool.submit(_checkpointed, pid, drafts, "score", lambda: _ask(
                "score", "score.rubric", system, score_prompt + fbs.get("score", ""), score_ctx, usage, validate.score))
            fb = pool.submit(_checkpointed, pid, drafts, "blind", lambda: _ask(
                "blind", BLIND_MODEL_TASK, system, score_prompt, score_ctx, usage, validate.score))
            (a_out, a_meta), (b_out, b_meta) = fa.result(), fb.result()
        metas["score"], metas["blind"] = a_meta, b_meta
        horizons_new = new["horizons"]["horizons"]
        blind = {"model": b_meta["model"], "status": b_meta["status"]}
        final_v8, after = None, before
        if a_meta["status"] == "ok":
            a_v8 = _v8_ordered(a_out, V8)
            pa = _score_board(board, fid, a_v8, horizons_new)
            final_v8, after = a_v8, pa
            if b_meta["status"] == "ok":
                b_v8 = _v8_ordered(b_out, V8)
                pb = _score_board(board, fid, b_v8, horizons_new)
                cmp_ = _compare(_flat(pa, fid), _flat(pb, fid))
                blind.update(scorer_a=_flat(pa, fid), scorer_b=_flat(pb, fid), **cmp_,
                             escalated=cmp_["band_changed"] or abs(cmp_["mgi_delta"]) >= ESCALATE_MGI)
                if blind["escalated"]:
                    rec_prompt = (prompts.context_block(ctx, "", "(see analysis)", None)
                                  + "\n\n### The analysis\n" + _dump(analysis)
                                  + "\n\n### Scorer A rubric inputs\n" + _dump(a_v8)
                                  + "\n\n### Scorer B rubric inputs\n" + _dump(b_v8)
                                  + "\n\n" + prompts.SCORE + "\n\n" + prompts.RECONCILE)
                    r_out, r_meta = _checkpointed(pid, drafts, "reconcile", lambda: _ask(
                        "reconcile", "escalate", system, rec_prompt, score_ctx, usage, validate.score))
                    metas["reconcile"] = r_meta
                    if r_meta["status"] == "ok":
                        r_out = copy.deepcopy(r_out)
                        notes = r_out.pop("_reconcile", [])
                        final_v8 = _v8_ordered(r_out, V8)
                        after = _score_board(board, fid, final_v8, horizons_new)
                        blind["reconciled"] = {"by": r_meta["model"], "notes": notes, "result": _flat(after, fid)}
        if final_v8 is not None:
            computed = {"this_field": _flat(after, fid), "of_fields": len(board["FIELDS"]),
                        "bands": _bands(after["fields"][fid])}
            v_prompt = (prompts.context_block(ctx, src_text, guidance.render(guidance.for_entity(fid, "verdict")),
                                              {"verdict": D.get("verdict")})
                        + "\n\n### The analysis\n" + _dump(analysis)
                        + "\n\n### Computed by the engine (read-only)\n" + _dump(computed)
                        + "\n\n" + prompts.VERDICT + fbs.get("verdict", ""))
            v_out, v_meta = _checkpointed(pid, drafts, "verdict", lambda: _ask(
                "verdict", "write.verdict", system, v_prompt, ctx, usage, validate.verdict))
            metas["verdict"] = v_meta
            if v_meta["status"] == "ok":
                new["verdict"] = v_out
        return final_v8, after, blind

    # ── phase 3: assemble the field and renumber its sources ─────────────────
    def assemble(final_v8):
        sections: Dict[Tuple[str, str], object] = {}
        changed: Dict[Tuple[str, str], list] = {}
        for stage, out in new.items():
            if metas.get(stage, {}).get("status") != "ok":
                continue
            for k, (L, sec) in OUTPUTS[stage].items():
                sections[(L, sec)] = copy.deepcopy(out.get(k))
                changed[(L, sec)] = out.get("_changed") or []
        if final_v8 is not None:
            derived = E.porter_from_sub_factors(final_v8["iai"])
            por = sections.get(("DATA", "porter")) or copy.deepcopy(D["porter"])
            sections[("DATA", "porter")] = [{"force": p["force"], "v": derived[p["force"]],
                                             **{k: v for k, v in p.items() if k not in ("force", "v")}} for p in por]
            sections[("V8", "_all")] = final_v8
        citing = {}
        for L in ("DATA", "V6", "V7"):
            for sec, val in board[L][fid].items():
                if sec == "sources":
                    continue
                citing[(L, sec)] = sections[(L, sec)] if (L, sec) in sections else copy.deepcopy(val)
        holder = {f"{L}.{s}": v for (L, s), v in citing.items()}
        labels, url_objs, kept = context.finalise_sources(holder, srcs)
        for k, v in holder.items():
            key = tuple(k.split(".", 1))
            if key in sections or _dump(v) != _dump(board[key[0]][fid].get(key[1])):
                sections[key] = v
        sections[("DATA", "sources")] = labels
        sections[("V7", "sources")] = url_objs
        final_srcs = [{**s, "n": i + 1, "label": labels[i]} for i, s in enumerate(kept)]
        return sections, changed, final_srcs

    # ── phase 4: the critic, shown the sources in the SAME numbering ─────────
    open_g = guidance.for_entity(fid)

    def critique(sections, final_srcs, after, gate, changed):
        checks = {s: {"status": m["status"], "attempts": m["attempts"], "defects": m["defects"], "model": m["model"],
                      "resumed": m.get("resumed", False)}
                  for s, m in metas.items()}
        prompt = (prompts.context_block(ctx, context.render_sources(final_srcs), guidance.render(open_g), None)
                  + "\n\n### The proposed analysis (it cites the numbered sources above)\n"
                  + _dump({f"{L}.{s}": v for (L, s), v in sections.items() if L != "V8" and s != "sources"})
                  + "\n\n### The authors' change notes, per section (their `_changed` lists)\n"
                  + _dump({f"{L}.{s}": v for (L, s), v in changed.items() if v})
                  + "\n\n### Computed indices\n" + _dump(_flat(after, fid))
                  + "\n\n### Mechanical check results\n" + _dump(checks)
                  + (f"\n\n### Sizing gate\n{gate['problem']}" if gate else "")
                  + "\n\n" + prompts.CRITIC)
        crit, _ = _ask("critic", "critic", system, prompt, ctx, usage, None, attempts=1)
        crit = crit or {"verdict": "BLOCK", "defects": [{"severity": "block", "location": "critic",
                                                         "problem": "critic returned no parseable review",
                                                         "fix": "re-run"}]}
        if gate:
            crit.setdefault("defects", []).insert(0, gate)
            if gate["severity"] == "block":
                crit["verdict"] = "BLOCK"
        return crit, checks

    run_frameworks(stage_names)
    final_v8, after, blind = score_and_verdict()
    gate = _sizing_gate(D.get("market"), new["market"].get("market"), srcs) \
        if metas.get("market", {}).get("status") == "ok" else None
    sections, changed, final_srcs = assemble(final_v8)
    crit, checks = critique(sections, final_srcs, after, gate, changed)

    # ── phase 5: one revision round on the critic's serious defects ─────────
    revision = None
    serious = [d for d in crit.get("defects") or [] if d.get("severity") in ("block", "major")]
    if revise and serious:
        by_stage: Dict[str, List[dict]] = {}
        for d in serious:
            for st in _stages_for(d.get("location", "")):
                by_stage.setdefault(st, []).append(d)
        fw = [s for s in by_stage if s in FRAMEWORKS]
        if by_stage:
            revision = {"round": 1, "critic_before": crit.get("verdict"), "defects_before": len(crit.get("defects") or []),
                        "stages": sorted(by_stage), "fed_back": sum(len(v) for v in by_stage.values())}
            fbs = {s: feedback_text(ds, new.get(s)) for s, ds in by_stage.items()}
            if fw:
                run_frameworks(fw, fbs)
            for s in DOWNSTREAM:             # re-score and re-write the verdict against the revised analysis
                drafts.pop(s, None)
            final_v8, after, blind = score_and_verdict(fbs)
            gate = _sizing_gate(D.get("market"), new["market"].get("market"), srcs) \
                if metas.get("market", {}).get("status") == "ok" else None
            sections, changed, final_srcs = assemble(final_v8)
            crit, checks = critique(sections, final_srcs, after, gate, changed)

    # ── store ────────────────────────────────────────────────────────────────
    failed = [s for s, m in checks.items() if m["status"] != "ok" and s != "blind"]
    status = "blocked" if failed or crit.get("verdict") == "BLOCK" else "ready"
    before_row, after_row = _flat(before, fid), _flat(after, fid)
    moves = {f["id"]: {"before": before["stats"]["mgi"]["rankOf"].get(f["id"]),
                       "after": after["stats"]["mgi"]["rankOf"].get(f["id"])} for f in board["FIELDS"]}
    scores = {"field": fid, "before": before_row, "after": after_row, **_compare(before_row, after_row),
              "rank_moves": {k: v for k, v in moves.items() if v["before"] != v["after"]},
              "engine": E.ENGINE_VERSION}
    rows = []
    for (L, sec), val in sections.items():
        if (L, sec) == ("V8", "_all"):
            for k, v in val.items():
                if _dump(v) != _dump(V8.get(k)):
                    rows.append((L, k, v, []))
            continue
        rows.append((L, sec, val, changed.get((L, sec), [])))
    with get_engine().begin() as c:
        c.execute(delete(proposal_section).where(proposal_section.c.proposal_id == pid))
        for L, sec, val, ch in rows:
            text = _dump(val)
            c.execute(insert(proposal_section).values(proposal_id=pid, layer=L, section=sec, content=text,
                                                      fingerprint=hashlib.sha256(text.encode()).hexdigest(),
                                                      changed=_dump(ch)))
        c.execute(update(proposal).where(proposal.c.id == pid).values(
            status=status, finished_at=_now(), stages=_dump(checks),
            checks=_dump({"sizing_gate": gate, "revision": revision}),
            critic=_dump(crit), blind=_dump(blind), scores=_dump(scores),
            guidance_check=_dump({"items": [{"id": f"G{g['id']}", "kind": g["kind"], "text": g["text"],
                                             "source": g.get("source")} for g in open_g],
                                  "critic": crit.get("guidance") or []}),
            sources=_dump([{"n": s["n"], "label": s["label"], "url": s["url"], "tier": s.get("tier"),
                            "origin": s["origin"]} for s in final_srcs]),
            usage=_dump(usage.summary())))
    return {"proposal_id": pid, "field": fid, "status": status, "sections": len(rows),
            "failed_stages": failed, "critic": crit.get("verdict"), "revision": revision, "scores": scores,
            "blind": {k: blind.get(k) for k in ("status", "mgi_delta", "band_changed", "escalated")},
            "usage": usage.summary()["by_model"]}

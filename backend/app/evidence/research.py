"""Grounded research for one entity (a field or a sub-field) → the evidence store.

    plan       fast tier (Haiku). Writes the search questions, including at
               least one adversarial one, and a guardrail naming what this
               field is NOT — the wrong-domain failure of the first attempt
               (e.g. "semiconductors" research returning solar-wafer news).
    search     grounded tier (Gemini 3.7 Flash → 2.5 Pro → Haiku). Prose only,
               never JSON: grounding attaches sources to prose sentences, and
               asking for JSON in the same call degrades both.
    sources    each grounding chunk → redirect resolved → canonical URL →
               tier (tiers.py) → the answer sentences it was cited for.
    relevance  fast tier, one batched call per run: drop sources about another
               domain, judged against the guardrail.
    store      one evidence row per (entity, canonical URL), deduplicated
               across runs; one evidence_support row per sentence supported.

The planner is shown the entity's name, its sub-fields, market areas and
business models — never the board's current numbers or verdict. A model that
has seen the incumbent figure tends to find it again.
"""
from __future__ import annotations

import hashlib
import json
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
from typing import Dict, List, Optional

from sqlalchemy import insert, select, update

from ..db import entity, evidence, evidence_support, get_engine, research_run
from ..llm import gateway, jsonutil
from ..llm.quota import QuotaExceeded
from ..repository import assemble_board
from .resolve import Resolver
from .tiers import canonical_url, classify, domain_of

SEARCH_MAX_TOKENS = 4096     # Gemini 3.x spends thinking tokens from this budget
PARALLEL_SEARCHES = 3


def _now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


# ── context ──────────────────────────────────────────────────────────────────
def entity_context(entity_id: str, board: Optional[dict] = None) -> dict:
    with get_engine().connect() as c:
        row = c.execute(select(entity).where(entity.c.id == entity_id)).mappings().first()
    if row is None or row["kind"] not in ("field", "subfield"):
        raise KeyError(f"unknown field or sub-field: {entity_id}")
    board = board or assemble_board()
    fid = row["parent_id"] or row["id"]
    field = next(f for f in board["FIELDS"] if f["id"] == fid)
    data = board["DATA"].get(fid, {})
    ctx = {"id": entity_id, "kind": row["kind"], "name": row["name"], "field": field["name"],
           "subfields": field["subs"], "market_areas": data.get("ma") or [],
           "business_models": data.get("bbm") or []}
    return ctx


def _describe(ctx: dict) -> str:
    if ctx["kind"] == "subfield":
        head = f"Sub-field: {ctx['name']} (within the search field '{ctx['field']}')"
        siblings = [s for s in ctx["subfields"] if s != ctx["name"]]
        return f"{head}\nSibling sub-fields, out of scope here: {', '.join(siblings) or 'none'}"
    return (f"Search field: {ctx['field']}\nSub-fields: {', '.join(ctx['subfields'])}\n"
            f"Market areas: {', '.join(ctx['market_areas']) or 'n/a'}\n"
            f"Bosch business models: {', '.join(ctx['business_models']) or 'n/a'}")


# ── plan ─────────────────────────────────────────────────────────────────────
PLAN_SYSTEM = ("You plan web research for Bosch's India market-intelligence board, which assesses "
               "automotive and mobility search fields for the Indian market. You write search questions; "
               "you do not answer them.")


def _charter(ctx: dict) -> str:
    """The field's scope charter, if one exists: research must cover the field
    the charter describes, not its most searchable corner."""
    try:
        from ..pipeline import guidance
        rows = [g for g in guidance.for_entity(ctx["id"]) if g["kind"] in ("charter", "review") and g["stage"] is None]
    except Exception:
        return ""
    if not rows:
        return ""
    lines = "\n".join(f"- {g['text']}" for g in rows)
    return f"\nScope set by the field owner — the questions must follow it:\n{lines}"


def plan(ctx: dict, max_queries: int = 6) -> dict:
    prompt = f"""{_describe(ctx)}{_charter(ctx)}

Write up to {max_queries} web-research questions about this {'sub-field' if ctx['kind'] == 'subfield' else 'search field'} in India.
Spread the questions across the sub-fields rather than concentrating on one.
Cover, as far as the count allows: market size and growth with a source year; policy and regulation;
the main competitors and suppliers active in India; Bosch's own position; and AT LEAST ONE adversarial
question that looks for evidence AGAINST this being an attractive market (delays, failures, shrinking
demand, cancelled projects).

Also write a guardrail: the neighbouring domains a web search for this topic commonly drifts into but
which are NOT this topic (for example, for automotive semiconductors: solar wafers, consumer-phone chips,
chip-design education). A source about those is off-topic.

Return JSON only:
{{"scope": "<one sentence: what is in scope>",
  "not_this": ["<off-topic domain>", ...],
  "queries": [{{"q": "<question>", "purpose": "size|growth|policy|competitors|bosch|adversarial|other"}}]}}"""
    r = gateway.run("research.plan", prompt, system=PLAN_SYSTEM, max_tokens=2048, temperature=0.2)
    p = jsonutil.parse(r.text, jsonutil.farm_repair)
    qs = [q for q in (p.get("queries") or []) if isinstance(q, dict) and q.get("q")][:max_queries]
    if not qs:
        raise ValueError("research plan came back with no queries")
    if not any(q.get("purpose") == "adversarial" for q in qs):
        # The planner is told to write one; if it did not, the last slot becomes one.
        qs[-1] = {"q": f"Evidence against the {ctx['name']} market in India: delays, failures, "
                       f"cancelled projects or weakening demand", "purpose": "adversarial"}
    return {"scope": p.get("scope", ""), "not_this": p.get("not_this") or [], "queries": qs,
            "_usage": (r.model, r.input_tokens, r.output_tokens)}


# ── search ───────────────────────────────────────────────────────────────────
SEARCH_SYSTEM = ("You are a market researcher for India. Answer from current web sources. State every "
                 "figure with its year and the organisation that published it. Say plainly when sources "
                 "disagree or when no reliable figure exists. Never estimate a figure yourself.")


def search(query: str, scope: str, run_id: int):
    prompt = (f"{query}\n\nScope: {scope}\n\nAnswer in plain prose, 150-350 words. No JSON, no tables.")
    return gateway.run("research.search", prompt, system=SEARCH_SYSTEM, max_tokens=SEARCH_MAX_TOKENS,
                       temperature=0.2, run_id=run_id)


def sources_from(result) -> List[dict]:
    """[{redirect_url, title, claims: [sentence, ...]}] from either grounding format."""
    raw = result.raw or {}
    out: List[dict] = []
    if "candidates" in raw:                              # Gemini
        cand = (raw.get("candidates") or [{}])[0]
        gm = cand.get("groundingMetadata") or cand.get("grounding_metadata") or {}
        chunks = gm.get("groundingChunks") or gm.get("grounding_chunks") or []
        out = [{"redirect_url": (ch.get("web") or {}).get("uri"), "title": (ch.get("web") or {}).get("title"),
                "claims": []} for ch in chunks]
        for s in gm.get("groundingSupports") or gm.get("grounding_supports") or []:
            text = ((s.get("segment") or {}).get("text") or "").strip()
            for i in s.get("groundingChunkIndices") or s.get("grounding_chunk_indices") or []:
                if text and 0 <= i < len(out) and text not in out[i]["claims"]:
                    out[i]["claims"].append(text)
    elif "content" in raw:                               # Claude web search
        by_url: Dict[str, dict] = {}
        for b in raw.get("content") or []:
            if b.get("type") != "text":
                continue
            text = (b.get("text") or "").strip()
            for ci in b.get("citations") or []:
                u = ci.get("url")
                if not u:
                    continue
                e = by_url.setdefault(u, {"redirect_url": u, "title": ci.get("title"), "claims": []})
                if text and text not in e["claims"]:
                    e["claims"].append(text)
        out = list(by_url.values())
    return [s for s in out if s["redirect_url"]]


# ── relevance ────────────────────────────────────────────────────────────────
def off_topic(ctx: dict, the_plan: dict, cands: List[dict]) -> Dict[int, str]:
    """{candidate index: reason} for sources about another domain. One call."""
    if not cands:
        return {}
    lines = [f"{i}. {c['domain']} | {c['title'] or ''} | cited for: "
             + " / ".join(x[:160] for x in c["claims"][:2]) for i, c in enumerate(cands)]
    prompt = f"""{_describe(ctx)}
In scope: {the_plan['scope']}
NOT this topic: {', '.join(the_plan['not_this']) or 'n/a'}

Below are sources a web search returned. Mark a source off-topic ONLY if it is clearly about a
different domain (for example one of the NOT-this topics, or a different country's market with no
bearing on India). General news that mentions this topic in passing is on-topic.

{chr(10).join(lines)}

Return JSON only: {{"off_topic": [{{"i": <index>, "reason": "<short reason>"}}]}}"""
    r = gateway.run("research.relevance", prompt, max_tokens=2048, temperature=0)
    p = jsonutil.parse(r.text, jsonutil.farm_repair)
    out = {}
    for x in p.get("off_topic") or []:
        try:
            i = int(x.get("i"))
        except (TypeError, ValueError):
            continue
        if 0 <= i < len(cands):
            out[i] = str(x.get("reason") or "off-topic")[:300]
    return out


# ── store ────────────────────────────────────────────────────────────────────
def _store(entity_id: str, run_id: int, cands: List[dict], rejected: Dict[int, str]) -> Dict[str, int]:
    now, kept, rej, new = _now(), 0, 0, 0
    with get_engine().begin() as c:
        for i, cd in enumerate(cands):
            status, reason = "kept", None
            if cd["tier"] == 9:
                status, reason = "rejected", cd["tier_reason"]
            elif i in rejected:
                status, reason = "rejected", f"off-topic: {rejected[i]}"
            row = c.execute(select(evidence.c.id, evidence.c.status, evidence.c.reject_reason,
                                   evidence.c.times_seen)
                            .where(evidence.c.entity_id == entity_id,
                                   evidence.c.canonical_url == cd["canonical_url"])).first()
            if row is None:
                eid = c.execute(insert(evidence).values(
                    entity_id=entity_id, canonical_url=cd["canonical_url"], resolved_url=cd["resolved_url"],
                    redirect_url=cd["redirect_url"], domain=cd["domain"], title=(cd["title"] or "")[:500],
                    tier=cd["tier"], tier_reason=cd["tier_reason"][:200], status=status, reject_reason=reason,
                    first_run_id=run_id, first_seen_at=now, last_seen_at=now, times_seen=1,
                )).inserted_primary_key[0]
                new += 1
            else:
                eid = row.id
                # A source once judged off-topic stays rejected; tier rules are
                # re-applied every time so an edit to tiers.py takes effect.
                if row.status == "rejected" and (row.reject_reason or "").startswith("off-topic"):
                    status, reason = "rejected", row.reject_reason
                c.execute(update(evidence).where(evidence.c.id == eid).values(
                    last_seen_at=now, times_seen=row.times_seen + 1, tier=cd["tier"],
                    tier_reason=cd["tier_reason"][:200], status=status, reject_reason=reason,
                    resolved_url=cd["resolved_url"]))
            kept += status == "kept"
            rej += status == "rejected"
            rows = [{"evidence_id": eid, "run_id": run_id, "query": q, "claim": cl, "model": m, "created_at": now}
                    for (q, m, cl) in cd["support"]]
            if rows:
                c.execute(insert(evidence_support), rows)
    return {"kept": kept, "rejected": rej, "new": new}


def retier(entity_id: Optional[str] = None) -> Dict[str, int]:
    """Re-apply tiers.py to stored sources — after the domain lists change.
    Tier-9 sources become rejected; a source rejected only for its type becomes
    kept again if it is no longer tier 9. Off-topic rejections are untouched."""
    changed = 0
    with get_engine().begin() as c:
        q = select(evidence.c.id, evidence.c.resolved_url, evidence.c.domain, evidence.c.tier,
                   evidence.c.status, evidence.c.reject_reason)
        if entity_id:
            q = q.where(evidence.c.entity_id == entity_id)
        for row in c.execute(q).all():
            tier, why = classify(row.resolved_url or "", row.domain)
            status, reason = row.status, row.reject_reason
            if tier == 9:
                status, reason = "rejected", why
            elif row.tier == 9 and status == "rejected" and not (reason or "").startswith("off-topic"):
                status, reason = "kept", None
            if (tier, status) != (row.tier, row.status):
                c.execute(update(evidence).where(evidence.c.id == row.id).values(
                    tier=tier, tier_reason=why[:200], status=status, reject_reason=reason))
                changed += 1
    return {"changed": changed}


# ── run ──────────────────────────────────────────────────────────────────────
def research(entity_id: str, max_queries: int = 6, resolver: Optional[Resolver] = None) -> dict:
    ctx = entity_context(entity_id)
    eng = get_engine()
    with eng.begin() as c:
        run_id = c.execute(insert(research_run).values(entity_id=entity_id, kind="research",
                                                        status="running", started_at=_now())).inserted_primary_key[0]
    stats = {"model_calls": 0, "searches": 0, "tokens_in": 0, "tokens_out": 0}
    own_resolver = resolver is None
    resolver = resolver or Resolver()
    errors: List[str] = []
    try:
        the_plan = plan(ctx, max_queries)
        _, ti, to = the_plan.pop("_usage")
        stats.update(model_calls=1, tokens_in=ti, tokens_out=to)
        with eng.begin() as c:
            c.execute(update(research_run).where(research_run.c.id == run_id)
                      .values(plan=json.dumps(the_plan, ensure_ascii=False)))

        def one(q):
            try:
                return q, search(q["q"], the_plan["scope"], run_id), None
            except QuotaExceeded as e:
                return q, None, f"quota: {e}"
            except Exception as e:                       # one failed question must not sink the run
                return q, None, f"{type(e).__name__}: {e}"

        with ThreadPoolExecutor(PARALLEL_SEARCHES) as pool:
            answers = list(pool.map(one, the_plan["queries"]))

        merged: Dict[str, dict] = {}
        for q, r, err in answers:
            if err:
                errors.append(f"{q['q'][:80]}: {err}")
                continue
            stats["model_calls"] += 1
            stats["searches"] += max(1, r.searches)
            stats["tokens_in"] += r.input_tokens
            stats["tokens_out"] += r.output_tokens
            for s in sources_from(r):
                resolved = resolver.resolve(s["redirect_url"])
                if resolved:
                    canon, dom = canonical_url(resolved), domain_of(resolved)
                else:
                    dom = (s["title"] or "unknown").lower().removeprefix("www.")
                    tag = hashlib.sha1("|".join([s["title"] or ""] + s["claims"][:1]).encode()).hexdigest()[:12]
                    canon = f"https://{dom}/#unresolved-{tag}"
                tier, why = classify(resolved or "", s["title"] or "")
                cd = merged.setdefault(canon, {"canonical_url": canon, "resolved_url": resolved,
                                               "redirect_url": s["redirect_url"], "domain": dom,
                                               "title": s["title"], "tier": tier, "tier_reason": why,
                                               "claims": [], "support": []})
                for cl in s["claims"]:
                    cd["support"].append((q["q"], r.model, cl))
                    if cl not in cd["claims"]:
                        cd["claims"].append(cl)

        cands = list(merged.values())
        judged = [i for i, cd in enumerate(cands) if cd["tier"] != 9]
        rejected: Dict[int, str] = {}
        if judged:
            sub = [cands[i] for i in judged]
            rejected = {judged[k]: v for k, v in off_topic(ctx, the_plan, sub).items()}
            stats["model_calls"] += 1
        counts = _store(entity_id, run_id, cands, rejected)

        answered = sum(1 for _, r, _ in answers if r is not None)
        status = "done" if not errors else ("partial" if answered else "failed")
        summary = {"run_id": run_id, "entity": entity_id, "status": status, "queries": len(answers),
                   "answered": answered, "sources": len(cands), **counts, **stats, "errors": errors}
        with eng.begin() as c:
            c.execute(update(research_run).where(research_run.c.id == run_id).values(
                status=status, finished_at=_now(), kept=counts["kept"], rejected=counts["rejected"],
                error="\n".join(errors) or None, **stats))
        return summary
    except Exception as e:
        with eng.begin() as c:
            c.execute(update(research_run).where(research_run.c.id == run_id).values(
                status="failed", finished_at=_now(), error=f"{type(e).__name__}: {e}", **stats))
        raise
    finally:
        if own_resolver:
            resolver.close()

"""What an author stage is shown: the numbered source list, and the field's
current content.

Sources are numbered once per proposal and every stage cites the same numbers,
so `c: [n]` means the same thing across all sections. The field's existing
sources come first (so a claim that remains true keeps its citation), then the
evidence store's kept sources for the field and its sub-fields, best tier
first. After authoring, only cited sources are kept and renumbered — see
finalise_sources().
"""
from __future__ import annotations

import copy
import re
from typing import Dict, List

from sqlalchemy import or_, select

from ..db import evidence, evidence_support, get_engine
from ..evidence.tiers import canonical_url, domain_of

TIER_NAME = {1: "primary", 2: "analyst", 3: "press", 4: "unrated"}


def source_list(field_id: str, board: dict, limit: int = 45) -> List[dict]:
    d = board["DATA"][field_id]
    labels, urls = d.get("sources") or [], board["V7"][field_id].get("sources") or []
    out, seen = [], set()
    for i, label in enumerate(labels):
        url = (urls[i] if i < len(urls) else {}).get("url")
        out.append({"label": label, "url": url, "domain": domain_of(url) if url else "", "tier": None,
                    "origin": "prior", "claims": []})
        if url:
            seen.add(canonical_url(url))
    with get_engine().connect() as c:
        rows = c.execute(select(evidence).where(
            or_(evidence.c.entity_id == field_id, evidence.c.entity_id.like(f"{field_id}:%")),
            evidence.c.status == "kept").order_by(evidence.c.tier, evidence.c.times_seen.desc(),
                                                   evidence.c.id)).mappings().all()
        for r in rows:
            if r["canonical_url"] in seen or len(out) >= limit:
                continue
            seen.add(r["canonical_url"])
            claims = [x.claim for x in c.execute(
                select(evidence_support.c.claim).where(evidence_support.c.evidence_id == r["id"])
                .group_by(evidence_support.c.claim).order_by(evidence_support.c.claim).limit(3))]
            out.append({"label": None, "url": r["resolved_url"] or r["canonical_url"], "domain": r["domain"],
                        "tier": r["tier"], "origin": "evidence", "claims": claims, "evidence_id": r["id"]})
    for n, s in enumerate(out, 1):
        s["n"] = n
    return out


def render_sources(srcs: List[dict]) -> str:
    lines = []
    for s in srcs:
        if s["origin"] == "prior":
            lines.append(f"[{s['n']}] (already cited by this field) {s['label']}"
                         + (f" — {s['domain']}" if s['domain'] else ""))
        else:
            said = " | ".join(c[:220] for c in s["claims"][:2])
            lines.append(f"[{s['n']}] ({TIER_NAME.get(s['tier'], '?')}) {s['domain']} — cited for: {said}")
    return "\n".join(lines)


def _label(s: dict) -> str:
    if s.get("label"):
        return s["label"]
    claim = (s["claims"] or [""])[0]
    claim = re.sub(r"\s+", " ", claim).strip()
    if len(claim) > 110:
        claim = claim[:107].rsplit(" ", 1)[0] + "…"
    return f"{s['domain']} — {claim}" if claim else s["domain"]


REF = re.compile(r"\[(\d+(?:\s*,\s*\d+)*)\]")


def _walk(node, on_c, on_text):
    """Visit every `c` list and every string (for inline [n] references)."""
    if isinstance(node, dict):
        for k, v in node.items():
            if k == "c" and isinstance(v, list):
                node[k] = on_c(v)
            elif isinstance(v, str):
                node[k] = on_text(v)
            else:
                _walk(v, on_c, on_text)
    elif isinstance(node, list):
        for i, x in enumerate(node):
            if isinstance(x, str):
                node[i] = on_text(x)
            else:
                _walk(x, on_c, on_text)


def cited(sections: Dict[str, object]) -> List[int]:
    """Source numbers in first-cited order, from `c` lists and inline [n]."""
    order: List[int] = []

    def note(i):
        if isinstance(i, int) and not isinstance(i, bool) and i not in order:
            order.append(i)

    def on_c(v):
        for i in v:
            note(i)
        return v

    def on_text(t):
        for m in REF.finditer(t):
            for i in m.group(1).split(","):
                note(int(i))
        return t
    _walk(copy.deepcopy(sections), on_c, on_text)
    return order


def finalise_sources(sections: Dict[str, object], srcs: List[dict]):
    """Keep only cited sources, renumber 1..k in first-cited order, and rewrite
    every `c` list and inline [n] in place in `sections` (a dict of section
    name → content). References to numbers that are not in the source list are
    dropped. Returns (labels, url objects, kept source dicts)."""
    by_n = {s["n"]: s for s in srcs}
    order = [n for n in cited(sections) if n in by_n]
    remap = {n: i for i, n in enumerate(order, 1)}

    def on_c(v):
        return [remap[i] for i in v if i in remap]

    def on_text(t):
        def sub(m):
            ns = [remap[int(i)] for i in m.group(1).split(",") if int(i) in remap]
            return "[" + ", ".join(map(str, ns)) + "]" if ns else ""
        return REF.sub(sub, t).replace(" .", ".").rstrip() if REF.search(t) else t
    _walk(sections, on_c, on_text)          # the container itself, so top-level string sections are rewritten too
    kept = [by_n[n] for n in order]
    return [_label(s) for s in kept], [{"url": s["url"]} if s["url"] else {} for s in kept], kept

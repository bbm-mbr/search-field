"""Mechanical checks — no judgement, no model.

Each check returns a list of defects as plain sentences. A stage whose output
has defects is sent back to its author once, with the defects listed; if the
second attempt still fails, the proposal is blocked and the defects are shown
to the reviewer. A sum that does not add up is a bug, not an opinion.
"""
from __future__ import annotations

from typing import Callable, Dict, List

DIMS = ["Political", "Economic", "Social", "Technological", "Environmental", "Legal"]
FA = ["P", "E", "S", "T", "En", "L"]
FORCES = ["Rivalry", "Supplier power", "Buyer power", "Substitutes", "New entrants"]
IAI_COUNTS = {"New entrants": 7, "Buyer power": 6, "Supplier power": 5, "Substitutes": 4, "Rivalry": 6}
AREAS = ["People", "Technology", "Process", "Market", "Leadership"]
CA_CATS = ["R&D Infra", "IP", "Manufacturing", "Supply Chain", "G2M", "Talent", "Organization",
           "Leadership", "Collaboration"]
COMP_AREAS = ["rdInfra", "ip", "manufacturing", "supplyChain", "g2m", "talent", "organization"]
PROFILES = ("softwareDigital", "hardwareMechatronic", "dataPlatform", "hybrid")
# Tuples, not sets: membership then compares with ==, so a malformed answer (a
# dict where a number belongs) becomes a defect instead of a TypeError.
CATEGORIES = ("Government & Regulatory", "Customers & End-Users", "Supply Chain & Ecosystem Partners",
              "Internal Bosch Stakeholders", "Financial & Investment Community", "Public & Media")
HML = ("High", "Medium", "Low")
R135 = (1, 3, 5)
MAX_WORDS = 70          # the board's style is ~20 words a part; this only catches runaway prose
BOSCH = "Bosch (target position)"


class Check:
    def __init__(self):
        self.defects: List[str] = []

    def __call__(self, ok: bool, msg: str) -> bool:
        if not ok:
            self.defects.append(msg)
        return ok


def _is_int(v) -> bool:
    return isinstance(v, int) and not isinstance(v, bool)


def _num(v) -> bool:
    return isinstance(v, (int, float)) and not isinstance(v, bool)


def _text(v) -> bool:
    return isinstance(v, str) and v.strip() != ""


def _in_range(v, lo, hi) -> bool:
    return _num(v) and lo <= v <= hi


def _cites(ck: Check, c, path: str, n_sources: int):
    if c is None:
        return
    if ck(isinstance(c, list) and all(_is_int(i) for i in c), f"{path}.c must be a list of source numbers"):
        bad = [i for i in c if not 1 <= i <= n_sources]
        ck(not bad, f"{path}.c cites {bad}, which are not in the numbered source list (1..{n_sources})")


def _pwsw(ck: Check, x, path: str):
    for k in ("p", "why", "sowhat"):
        if ck(isinstance(x, dict) and _text(x.get(k)), f"{path}.{k} is missing or empty"):
            n = len(x[k].split())
            ck(n <= MAX_WORDS, f"{path}.{k} is {n} words; keep it under 40")


# ── stages ───────────────────────────────────────────────────────────────────
def pestel(out: dict, ctx: dict) -> List[str]:
    ck, subs = Check(), set(ctx["subs"])
    p = out.get("pestel")
    if ck(isinstance(p, dict) and list(p.keys()) == DIMS, f"pestel must have exactly the keys {DIMS} in order"):
        tags, points = {}, 0
        for d in DIMS:
            pts = p[d]
            if not ck(isinstance(pts, list) and 2 <= len(pts) <= 3, f"pestel.{d} must have 2–3 points"):
                continue
            for i, x in enumerate(pts):
                path = f"pestel.{d}[{i}]"
                _pwsw(ck, x, path)
                if not isinstance(x, dict):
                    continue
                ck(_text(x.get("cat")), f"{path}.cat is missing")
                ck(x.get("i") in ("high", "medium", "low"), f"{path}.i must be high|medium|low")
                ck("enabler" not in x or x["enabler"] is True, f"{path}.enabler must be true or omitted")
                s = x.get("subs")
                if ck(isinstance(s, list) and s, f"{path}.subs must list at least one sub-field"):
                    unknown = [t for t in s if t not in subs]
                    ck(not unknown, f"{path}.subs has {unknown}, not sub-fields of this field")
                    for t in s:
                        tags[t] = tags.get(t, 0) + 1
                _cites(ck, x.get("c"), path, ctx["n_sources"])
                points += 1
        missing = [s for s in ctx["subs"] if s not in tags]
        ck(not missing, f"pestel covers no point for sub-field(s) {missing}; every sub-field needs at least one")
        if len(ctx["subs"]) >= 3 and points:
            heavy = [t for t, n in tags.items() if n > points / 2]
            ck(not heavy, f"pestel is dominated by {heavy} (tagged on more than half of {points} points)")
    fa = out.get("pestelFA")
    if ck(isinstance(fa, dict) and list(fa.keys()) == FA, f"pestelFA must have exactly the keys {FA} in order"):
        for d in FA:
            for side in ("for", "against"):
                lst = (fa[d] or {}).get(side) if isinstance(fa[d], dict) else None
                if ck(isinstance(lst, list) and len(lst) == 3, f"pestelFA.{d}.{side} must have exactly 3 entries"):
                    for i, x in enumerate(lst):
                        _pwsw(ck, x, f"pestelFA.{d}.{side}[{i}]")
    return ck.defects


def swot(out: dict, ctx: dict) -> List[str]:
    ck = Check()
    s = out.get("swot")
    if ck(isinstance(s, dict), "swot is missing"):
        for q in "SWOT":
            lst = s.get(q)
            if ck(isinstance(lst, list) and 2 <= len(lst) <= 5, f"swot.{q} must have 2–5 factors"):
                for i, x in enumerate(lst):
                    _pwsw(ck, x, f"swot.{q}[{i}]")
                    ck(isinstance(x, dict) and x.get("area") in AREAS, f"swot.{q}[{i}].area must be one of {AREAS}")
        t = s.get("tows")
        ck(isinstance(t, dict) and all(_text(t.get(k)) for k in ("SO", "ST", "WO", "WT")), "swot.tows needs SO, ST, WO, WT")
        ts = s.get("targetStrategy") or {}
        ck(isinstance(ts.get("growth"), list) and ts["growth"] and all(_text(g.get("lever")) and _text(g.get("action")) for g in ts["growth"]),
           "swot.targetStrategy.growth needs entries with lever and action")
        ck(isinstance(ts.get("improvement"), list) and ts["improvement"] and all(_text(g.get("gap")) and _text(g.get("action")) for g in ts["improvement"]),
           "swot.targetStrategy.improvement needs entries with gap and action")
        ck(_text(s.get("strategy")) and _text(s.get("scoreRationale")), "swot.strategy and swot.scoreRationale are required")
    s5 = out.get("swot5")
    if ck(isinstance(s5, dict), "swot5 is missing"):
        for q in "SWOT":
            lst = s5.get(q)
            if ck(isinstance(lst, list) and len(lst) == 5, f"swot5.{q} must have exactly 5 factors"):
                for i, x in enumerate(lst):
                    _pwsw(ck, x, f"swot5.{q}[{i}]")
    return ck.defects


def market(out: dict, ctx: dict) -> List[str]:
    ck, subs = Check(), set(ctx["subs"])
    m = out.get("market")
    if not ck(isinstance(m, dict), "market is missing"):
        return ck.defects
    for k in ("tam", "sam", "year"):
        ck(_is_int(m.get(k)) and m[k] > 0, f"market.{k} must be a positive integer")
    ck(_num(m.get("cagr")), "market.cagr must be a number")
    if _is_int(m.get("tam")) and _is_int(m.get("sam")):
        ck(m["sam"] <= m["tam"], f"market.sam ({m['sam']}) exceeds tam ({m['tam']})")
    ck(isinstance(m.get("derivation"), list) and len(m["derivation"]) >= 3, "market.derivation needs at least 3 steps")
    b = m.get("buildup") or {}
    for side in ("tam", "sam"):
        lst = b.get(side)
        if ck(isinstance(lst, list) and 3 <= len(lst) <= 7, f"market.buildup.{side} needs 3–7 components"):
            if ck(all(_is_int(x.get("v")) for x in lst), f"market.buildup.{side} values must be integers"):
                total = sum(x["v"] for x in lst)
                ck(total == m.get(side), f"market.buildup.{side} components sum to {total}, not market.{side} = {m.get(side)}")
        ck(_text(b.get(f"{side}Note")), f"market.buildup.{side}Note is required")
    for i, x in enumerate(b.get("sam") or []):
        ck(x.get("sub") in subs, f"market.buildup.sam[{i}].sub '{x.get('sub')}' is not a sub-field of this field")
    a = m.get("attractiveness") or {}
    for i, x in enumerate(a.get("whiteSpace") or []):
        ck(x.get("sub") in subs, f"market.attractiveness.whiteSpace[{i}].sub '{x.get('sub')}' is not a sub-field")
    ck(isinstance(a.get("access"), dict), "market.attractiveness.access is required")
    ck(_text(m.get("crossCheck")), "market.crossCheck is required")
    mm = out.get("marketModel")
    ck(isinstance(mm, dict) and _text(mm.get("scurve")) and _text(mm.get("bizModel"))
       and isinstance(mm.get("revenue"), list) and mm["revenue"], "marketModel needs scurve, bizModel and revenue")
    return ck.defects


def porter(out: dict, ctx: dict) -> List[str]:
    ck = Check()
    p = out.get("porter")
    if ck(isinstance(p, list) and [x.get("force") for x in p if isinstance(x, dict)] == FORCES,
          f"porter must be exactly 5 forces in the order {FORCES}"):
        for i, x in enumerate(p):
            ck("v" not in x, f"porter[{i}] must not carry an intensity 'v' — the engine derives it")
            ck(_text(x.get("why")), f"porter[{i}].why is required")
            ck(isinstance(x.get("drivers"), list) and x["drivers"], f"porter[{i}].drivers is required")
            _cites(ck, x.get("c"), f"porter[{i}]", ctx["n_sources"])
    ck(_text(out.get("porterRationale")), "porterRationale is required")
    d = out.get("porterDetail")
    ck(isinstance(d, dict) and set(d) == set(FORCES) and all(isinstance(v, list) and v for v in d.values()),
       "porterDetail needs a non-empty list for each of the five forces")
    return ck.defects


def competency(out: dict, ctx: dict) -> List[str]:
    ck = Check()
    c = out.get("competency")
    if ck(isinstance(c, list) and 4 <= len(c) <= 8, "competency needs 4–8 entries"):
        for i, x in enumerate(c):
            ck(_text(x.get("name")), f"competency[{i}].name is required")
            ck(_in_range(x.get("bosch"), 1, 10) and _in_range(x.get("req"), 1, 10), f"competency[{i}] bosch/req must be 1–10")
            for k in ("whyReq", "whyBosch", "gap", "gapWhy"):
                ck(_text(x.get(k)), f"competency[{i}].{k} is required")
    a = out.get("competencyAssessment")
    if ck(isinstance(a, list) and [x.get("cat") for x in a] == CA_CATS, f"competencyAssessment must be the 9 categories {CA_CATS} in order"):
        for i, x in enumerate(a):
            ck(_in_range(x.get("current"), 0, 10) and _in_range(x.get("target"), 0, 10),
               f"competencyAssessment[{i}] current/target must be 0–10 (0 only where the category does not apply)")
            ck(x.get("priority") in HML, f"competencyAssessment[{i}].priority must be High|Medium|Low")
    ck(_text(out.get("competencyRemark")), "competencyRemark is required")
    return ck.defects


def horizons(out: dict, ctx: dict) -> List[str]:
    ck = Check()
    h = out.get("horizons")
    if ck(isinstance(h, dict), "horizons is missing"):
        for k in ("h1", "h2", "h3"):
            lst = h.get(k)
            if ck(isinstance(lst, list), f"horizons.{k} must be a list"):
                for i, x in enumerate(lst):
                    ck(_text(x.get("item")) and _text(x.get("why")), f"horizons.{k}[{i}] needs item and why")
                    if k != "h1":
                        ck(_text(x.get("trigger")), f"horizons.{k}[{i}] needs an observable trigger")
        ck(_text(h.get("rationale")), "horizons.rationale is required")
    t = out.get("techGrowth")
    ck(isinstance(t, dict) and isinstance(t.get("maturity"), list) and isinstance(t.get("innovation"), list)
       and isinstance(t.get("risks"), list), "techGrowth needs maturity, innovation and risks lists")
    r = out.get("research")
    ck(isinstance(r, dict) and _text(r.get("note")), "research.note is required")
    return ck.defects


def landscape(out: dict, ctx: dict) -> List[str]:
    ck = Check()
    st = out.get("stakeholders")
    if ck(isinstance(st, list) and 3 <= len(st) <= 8, "stakeholders needs 3–8 entries"):
        for i, x in enumerate(st):
            ck(_text(x.get("name")), f"stakeholders[{i}].name is required")
            ck(_in_range(x.get("influence"), 1, 10) and _in_range(x.get("interest"), 1, 10), f"stakeholders[{i}] influence/interest must be 1–10")
            ck(x.get("stance") in ("ally", "neutral", "blocker"), f"stakeholders[{i}].stance must be ally|neutral|blocker")
    co = out.get("competitors")
    names = []
    if ck(isinstance(co, list) and 3 <= len(co) <= 7, "competitors needs 3–7 entries"):
        names = [x.get("name") for x in co]
        ck(names.count(BOSCH) == 1, f"competitors must include exactly one entry named '{BOSCH}'")
        ck(len([n for n in names if n != BOSCH]) >= 2, "competitors needs at least 2 real players")
        for i, x in enumerate(co):
            ck(x.get("type") in ("global", "indian-incumbent", "startup"), f"competitors[{i}].type must be global|indian-incumbent|startup")
            ck(_in_range(x.get("x_price_position"), 1, 10) and _in_range(x.get("y_tech_depth"), 1, 10), f"competitors[{i}] positions must be 1–10")
            ck(_text(x.get("reasoning")), f"competitors[{i}].reasoning is required")
    pr = out.get("competitorProfiles")
    if ck(isinstance(pr, list), "competitorProfiles is missing"):
        ck([x.get("name") for x in pr] == names, "competitorProfiles must match competitors one-to-one, same names, same order")
        for i, x in enumerate(pr):
            r = x.get("radar") or {}
            ck(all(_in_range(r.get(k), 1, 10) for k in ("tech", "price", "indiaPresence", "service", "innovation", "ecosystem")),
               f"competitorProfiles[{i}].radar needs tech, price, indiaPresence, service, innovation, ecosystem, each 1–10")
    ck(_text(out.get("competitorWhiteSpace")), "competitorWhiteSpace is required")
    ck(isinstance(out.get("competitorDynamics"), dict), "competitorDynamics is required")
    ck(isinstance(out.get("competitorAssessment"), dict), "competitorAssessment is required")
    return ck.defects


def suppliers(out: dict, ctx: dict) -> List[str]:
    ck = Check()
    s = out.get("suppliers")
    if ck(isinstance(s, list) and 3 <= len(s) <= 7, "suppliers needs 3–7 entries"):
        for i, x in enumerate(s):
            ck(x.get("quadrant") in ("strategic", "leverage", "bottleneck", "non-critical"),
               f"suppliers[{i}].quadrant must be strategic|leverage|bottleneck|non-critical")
            ck(_in_range(x.get("supply_risk"), 1, 10) and _in_range(x.get("profit_impact"), 1, 10), f"suppliers[{i}] risk/impact must be 1–10")
    ck(isinstance(out.get("supplierAnalysis"), dict), "supplierAnalysis is required")
    return ck.defects


def score(out: dict, ctx: dict) -> List[str]:
    """V8 rubric inputs, checked against the analysis they rate."""
    ck, a = Check(), ctx["analysis"]
    p = out.get("pestel")
    if ck(isinstance(p, dict) and list(p) == FA, f"pestel ratings must have keys {FA}"):
        for d in FA:
            for side in ("for", "against"):
                lst = (p.get(d) or {}).get(side)
                if ck(isinstance(lst, list) and len(lst) == 3, f"pestel.{d}.{side} needs exactly 3 ratings"):
                    ck(all(x.get("impact") in R135 and x.get("certainty") in R135 for x in lst),
                       f"pestel.{d}.{side} ratings must be 1|3|5")
    s = out.get("swot")
    if ck(isinstance(s, dict), "swot ratings missing"):
        for q in "SWOT":
            lst = s.get(q)
            if ck(isinstance(lst, list) and len(lst) == 5, f"swot.{q} needs exactly 5 ratings"):
                ck(all(x.get("impact") in R135 and x.get("probability") in R135 for x in lst), f"swot.{q} ratings must be 1|3|5")
    m = out.get("market") or {}
    am = a.get("market") or {}
    ck(m.get("samUSD") == (am.get("sam") or 0) * 1_000_000, f"market.samUSD must equal sam × 1,000,000 = {(am.get('sam') or 0) * 1_000_000}")
    ck(m.get("cagrPct") == am.get("cagr"), f"market.cagrPct must equal the analysis cagr ({am.get('cagr')})")
    ck(m.get("scurveScore") in (1, 2, 3, 4, 5), "market.scurveScore must be 1–5")
    ck(m.get("revenueQualityScore") in R135 and m.get("profitabilityScore") in R135, "revenueQuality/profitability scores must be 1|3|5")
    for k in ("scurveWhy", "revenueQualityWhy", "profitabilityWhy"):
        ck(_text(m.get(k)), f"market.{k} is required")
    iai = out.get("iai")
    if ck(isinstance(iai, dict) and set(iai) == set(IAI_COUNTS), "iai needs the five forces"):
        for f, n in IAI_COUNTS.items():
            ck(isinstance(iai[f], list) and len(iai[f]) == n and all(v in R135 for v in iai[f]),
               f"iai['{f}'] needs exactly {n} values, each 1|3|5")
    c = out.get("competency") or {}
    ck(c.get("profile") in PROFILES, f"competency.profile must be one of {sorted(PROFILES)}")
    ar = c.get("areas") or {}
    ck(list(ar) == COMP_AREAS and all(isinstance(v, dict) and v.get("required") in (1, 2, 3, 4) and v.get("current") in (1, 2, 3, 4) for v in ar.values()),
       f"competency.areas must be {COMP_AREAS}, each required/current 1–4")
    sh = out.get("stakeholders")
    want = [x.get("name") for x in a.get("stakeholders") or []]
    if ck(isinstance(sh, list) and [x.get("name") for x in sh] == want, f"stakeholder ratings must be one per stakeholder, same names and order: {want}"):
        for i, x in enumerate(sh):
            ck(x.get("category") in CATEGORIES, f"stakeholders[{i}].category must be one of {sorted(CATEGORIES)}")
            ck(x.get("power") in R135 and x.get("boschInfluence") in R135 and x.get("stance") in (-1, 0, 1),
               f"stakeholders[{i}] power/boschInfluence must be 1|3|5 and stance -1|0|1")
    co = out.get("competitors")
    real = [x.get("name") for x in a.get("competitors") or [] if x.get("name") != BOSCH]
    if ck(isinstance(co, list) and co, "competitor ratings missing"):
        names = [x.get("name") for x in co]
        ck(all(n in real for n in names) and len(names) == len({str(n) for n in names}),
           f"competitor ratings must name real competitors from the analysis only: {real}")
        ck(all(x.get("marketPosition") in HML and x.get("futureMomentum") in HML for x in co), "competitor ratings must be High|Medium|Low")
    for k in ("boschStrength", "marketGapSignificance", "supplyChainMaturity", "boschControl", "techVelocity", "commReadiness"):
        ck(out.get(k) in HML, f"{k} must be High|Medium|Low")
    for k in ("boschStrengthWhy", "marketGapWhy", "supplyChainWhy", "boschControlWhy", "techTrendWhy"):
        ck(_text(out.get(k)), f"{k} is required")
    return ck.defects


def verdict(out: dict, ctx: dict) -> List[str]:
    ck = Check()
    v = out.get("verdict")
    if not ck(isinstance(v, dict), "verdict is missing"):
        return ck.defects
    ck(_text(v.get("entry")), "verdict.entry is required")
    ck(isinstance(v.get("reasoning"), list) and 3 <= len(v["reasoning"]) <= 5, "verdict.reasoning needs 3–5 lines")
    pf = v.get("portfolio")
    got = [x.get("sub") for x in pf] if isinstance(pf, list) else []
    if ck(sorted(got) == sorted(ctx["subs"]), f"verdict.portfolio must cover every sub-field exactly once: {ctx['subs']}"):
        for i, x in enumerate(pf):
            ck(x.get("play") in ("LEAD", "PARTNER", "WATCH", "SKIP"), f"verdict.portfolio[{i}].play must be LEAD|PARTNER|WATCH|SKIP")
            for k in ("what", "why", "winCondition", "ifWrong"):
                ck(_text(x.get(k)), f"verdict.portfolio[{i}].{k} is required")
    ai = v.get("aiAnalyst") or {}
    ck(isinstance(ai.get("whereWeWin"), list) and isinstance(ai.get("exposure"), list) and _text(ai.get("narrative")),
       "verdict.aiAnalyst needs whereWeWin, exposure and narrative")
    ck(_text(ai.get("bottomLine")) and ai["bottomLine"].split()[0].strip(":—-").upper() in ("INVEST", "PARTNER", "WATCH", "AVOID"),
       "verdict.aiAnalyst.bottomLine must start with INVEST, PARTNER, WATCH or AVOID")
    return ck.defects


VALIDATORS: Dict[str, Callable[[dict, dict], List[str]]] = {
    "pestel": pestel, "swot": swot, "market": market, "porter": porter, "competency": competency,
    "horizons": horizons, "landscape": landscape, "suppliers": suppliers, "score": score, "verdict": verdict,
}

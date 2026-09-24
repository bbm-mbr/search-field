"""V9 scoring engine — Python port of the static board's engine.

Implements the Bosch BBM Search-Field Scoring Document v2: nine component
indices normalised to -1..+1, rolled into one Master Growth Index per field.

THIS IS A PORT, NOT A REIMPLEMENTATION. Every function mirrors its JavaScript
original line for line, including two numeric details that matter:

  * JavaScript's `+x.toFixed(n)` is reproduced by `_fx`, which rounds the
    exact binary value half-away-from-zero. Python's round() is banker's
    rounding and would disagree on ties.
  * Averages are summed strictly left to right. Python 3.12+ sum() uses
    compensated summation for floats, which can differ from JS reduce() in
    the last bit and then flip a rounding.

tests/test_parity.py checks every value against backend/seed/golden.json,
which is produced by running the original JavaScript. If the two ever
disagree, this file is wrong.

Where the scoring document is internally inconsistent it is implemented
literally and marked DOC NOTE, exactly as in the original.
"""
from __future__ import annotations

import math
from decimal import Decimal, ROUND_HALF_UP
from functools import reduce
from typing import Any, Dict, List, Optional

ENGINE_VERSION = "v9.0"


# ── numeric helpers that match JavaScript ────────────────────────────────────
def _fx(x: float, n: int) -> float:
    """Equivalent of JavaScript `+x.toFixed(n)`."""
    q = Decimal(x).quantize(Decimal(1).scaleb(-n), rounding=ROUND_HALF_UP)
    return float(q)


def _sum(xs) -> float:
    return reduce(lambda a, b: a + b, xs, 0)


def avg(xs: List[float]) -> float:
    xs = list(xs)
    return _sum(xs) / len(xs)


def js_round(x: float) -> int:
    """JavaScript Math.round: halves round toward +infinity."""
    return math.floor(x + 0.5)


def pick_band(bands: List[dict], score: float) -> dict:
    return next((b for b in bands if score >= b["min"]), bands[-1])


# ── horizons ─────────────────────────────────────────────────────────────────
def compute_horizon_score(h: dict) -> dict:
    n1, n2, n3 = len(h.get("h1") or []), len(h.get("h2") or []), len(h.get("h3") or [])
    total = (n1 + n2 + n3) or 1
    depth = min(10, 2 * n1 + 1.5 * n2 + 1 * n3 + (1 if (n1 and n2 and n3) else 0))
    return {"n1": n1, "n2": n2, "n3": n3,
            "p1": js_round(100 * n1 / total), "p2": js_round(100 * n2 / total),
            "p3": js_round(100 * n3 / total), "depth": _fx(depth, 1)}


# ── Porter reconciliation ────────────────────────────────────────────────────
def porter_from_sub_factors(iai_scores: Optional[dict]) -> Optional[dict]:
    if not iai_scores:
        return None
    out = {}
    for force, arr in iai_scores.items():
        mean = _sum(arr) / len(arr)
        out[force] = _fx(((mean - 1) / 4) * 10, 1)
    return out


# ── 1. PESTEL Index ──────────────────────────────────────────────────────────
PESTEL_BANDS = [
    {"v": "Macro-Accelerator", "min": 0.3, "color": "#16A34A"},
    {"v": "Transitional Gale", "min": -0.3, "color": "#D97706"},
    {"v": "High-Resistance Environment", "min": -1.01, "color": "#DC2626"},
]


def compute_pestel_index(pestel_scores: Optional[dict]) -> dict:
    tail = head = tail_n = head_n = 0
    for letter in (pestel_scores or {}).values():
        for pt in (letter or {}).get("for") or []:
            tail += pt["impact"] * pt["certainty"]; tail_n += 1
        for pt in (letter or {}).get("against") or []:
            head += pt["impact"] * pt["certainty"]; head_n += 1
    index = _fx((tail - head) / (tail + head), 2) if (tail + head) > 0 else None
    return {"tail": tail, "head": head, "tailN": tail_n, "headN": head_n, "index": index,
            "band": None if index is None else pick_band(PESTEL_BANDS, index)}


# ── 2. SWOT Posture ──────────────────────────────────────────────────────────
SWOT_QUADRANTS = [
    {"key": "I", "name": "Aggressive Growth", "mandate": "INVEST TO LEAD", "cond": lambda i, e: i >= 0 and e >= 0},
    {"key": "II", "name": "Turnaround or Partner", "mandate": "BUY OR BUILD", "cond": lambda i, e: i < 0 and e >= 0},
    {"key": "III", "name": "Divest or Exit", "mandate": "KILL THE PROJECT", "cond": lambda i, e: i < 0 and e < 0},
    {"key": "IV", "name": "Diversify or Defend", "mandate": "HARVEST VALUE", "cond": lambda i, e: i >= 0 and e < 0},
]
SPI_BANDS = [
    {"v": "High Priority / Core Bet", "min": 0.4, "color": "#16A34A"},
    {"v": "Contested / Situational Play", "min": -0.4, "color": "#D97706"},
    {"v": "Low Priority / Divest", "min": -1.01, "color": "#DC2626"},
]


def compute_swot_posture(swot_scores: Optional[dict]) -> dict:
    def s(arr):
        return _sum(p["impact"] * p["probability"] for p in (arr or []))
    sw = swot_scores or {}
    S, W, O, T = s(sw.get("S")), s(sw.get("W")), s(sw.get("O")), s(sw.get("T"))
    iri = _fx((S - W) / (S + W), 2) if (S + W) > 0 else None
    eai = _fx((O - T) / (O + T), 2) if (O + T) > 0 else None
    spi = _fx(0.3 * iri + 0.7 * eai, 2) if (iri is not None and eai is not None) else None
    quadrant = None
    if iri is not None and eai is not None:
        quadrant = next((q for q in SWOT_QUADRANTS if q["cond"](iri, eai)), None)
    strategies = sorted([
        {"k": "SO", "v": S + O}, {"k": "ST", "v": S + T},
        {"k": "WO", "v": W + O}, {"k": "WT", "v": W + T},
    ], key=lambda x: -x["v"])  # stable, like Array.prototype.sort
    return {"S": S, "W": W, "O": O, "T": T, "iri": iri, "eai": eai, "spi": spi,
            "quadrant": None if quadrant is None else {k: v for k, v in quadrant.items() if k != "cond"},
            "band": None if spi is None else pick_band(SPI_BANDS, spi),
            "strategies": strategies}


# ── 3. Market Attractiveness ─────────────────────────────────────────────────
MAI_BANDS = [
    {"v": "Tier-1 / Aspiration Anchor Market", "min": 0.4, "color": "#16A34A", "code": "GO"},
    {"v": "Tier-2 / Standard Automotive Market", "min": -0.4, "color": "#D97706", "code": "PROCEED WITH CAUTION"},
    {"v": "Tier-3 / Portfolio Distractor Market", "min": -1.01, "color": "#DC2626", "code": "NO-GO"},
]


def sam_score_from_usd(sam_usd: float) -> int:
    return 5 if sam_usd > 500e6 else 3 if sam_usd > 100e6 else 1


def cagr_score_from_pct(cagr_pct: float) -> int:
    return 5 if cagr_pct > 20 else 3 if cagr_pct >= 10 else 1


def compute_mas(m: dict) -> dict:
    sam_score = sam_score_from_usd(m["samUSD"])
    cagr_score = cagr_score_from_pct(m["cagrPct"])
    scale_velocity = (sam_score + cagr_score) / 2
    mas = _fx(0.35 * scale_velocity + 0.2 * m["scurveScore"] + 0.2 * m["revenueQualityScore"]
              + 0.25 * m["profitabilityScore"], 2)
    mai = _fx((mas - 3) / 2, 2)
    return {**m, "samScore": sam_score, "cagrScore": cagr_score, "scaleVelocity": scale_velocity,
            "mas": mas, "mai": mai, "band": pick_band(MAI_BANDS, mai)}


# ── 4. Industry Attractiveness (Porter) ──────────────────────────────────────
IAI_BANDS = [
    {"v": "Structurally Attractive Industry (Blue Ocean)", "min": 0.4, "color": "#16A34A", "code": "GO"},
    {"v": "Moderately Competitive Industry (Choppy Waters)", "min": -0.4, "color": "#D97706", "code": "PROCEED WITH CAUTION"},
    {"v": "Structurally Unattractive Industry (Red Ocean)", "min": -1.01, "color": "#DC2626", "code": "NO-GO"},
]


def compute_iai(iai_scores: Optional[dict]) -> dict:
    force_avgs = {k: _fx(avg(v), 2) for k, v in (iai_scores or {}).items()}
    vals = list(force_avgs.values())
    iai_raw = _fx(avg(vals), 2) if vals else None
    iai = None if iai_raw is None else _fx((3 - iai_raw) / 2, 2)
    return {"forceAvgs": force_avgs, "iaiRaw": iai_raw, "iai": iai,
            "band": None if iai is None else pick_band(IAI_BANDS, iai)}


# ── 5. Competency Gap ────────────────────────────────────────────────────────
COMPETENCY_AREAS = [
    ("rdInfra", "R&D Infra"), ("ip", "IP"), ("manufacturing", "Manufacturing"),
    ("supplyChain", "Supply Chain"), ("g2m", "Go-To-Market (G2M)"),
    ("talent", "Talent"), ("organization", "Organization"),
]
COMPETENCY_WEIGHT_PROFILES = {
    "softwareDigital": {"rdInfra": 0.15, "ip": 0.20, "manufacturing": 0.05, "supplyChain": 0.05, "g2m": 0.15, "talent": 0.25, "organization": 0.15},
    "hardwareMechatronic": {"rdInfra": 0.15, "ip": 0.15, "manufacturing": 0.25, "supplyChain": 0.20, "g2m": 0.10, "talent": 0.10, "organization": 0.05},
    "dataPlatform": {"rdInfra": 0.10, "ip": 0.20, "manufacturing": 0.05, "supplyChain": 0.05, "g2m": 0.25, "talent": 0.20, "organization": 0.15},
    "hybrid": {"rdInfra": 0.15, "ip": 0.15, "manufacturing": 0.15, "supplyChain": 0.15, "g2m": 0.15, "talent": 0.15, "organization": 0.10},
}
CGI_BANDS = [
    {"v": "Core Strength / Natural Fit", "min": 0.4, "color": "#16A34A"},
    {"v": "Manageable Fit", "min": -0.4, "color": "#D97706"},
    {"v": "Fatal Flaw / Unnatural Fit", "min": -1.01, "color": "#DC2626"},
]


def compute_cgi(competency: Optional[dict]) -> Optional[dict]:
    if not competency or not competency.get("areas"):
        return None
    weights = COMPETENCY_WEIGHT_PROFILES.get(competency.get("profile")) or COMPETENCY_WEIGHT_PROFILES["hybrid"]
    weighted = 0
    rows = []
    for k, label in COMPETENCY_AREAS:
        a = competency["areas"].get(k) or {"required": 2, "current": 2}
        gap = a["current"] - a["required"]
        w = weights.get(k, 0)
        weighted += gap * w
        rows.append({"k": k, "label": label, "required": a["required"], "current": a["current"],
                     "gap": gap, "weight": w})
    cgi = _fx(weighted / 3, 2)
    return {"rows": rows, "weights": weights, "cgi": cgi, "band": pick_band(CGI_BANDS, cgi)}


# ── 6. Stakeholder Viability ─────────────────────────────────────────────────
SVI_BANDS = [
    {"v": "Favorable Ecosystem", "min": 0.3, "color": "#16A34A"},
    {"v": "Contested / Volatile", "min": -0.3, "color": "#D97706"},
    {"v": "Hostile Ecosystem", "min": -1.01, "color": "#DC2626"},
]


def compute_svi(stakeholders: Optional[list]) -> Optional[dict]:
    if not stakeholders:
        return None
    total_power = _sum(s["power"] for s in stakeholders)
    if total_power == 0:
        return None
    tes = tet = neutral = 0
    for s in stakeholders:
        bim = (s["boschInfluence"] - 1) / 4
        if s["stance"] == 1:
            tes += s["power"] * (1 + bim * 0.5)
        elif s["stance"] == -1:
            tet += s["power"] * (1 - bim * 0.5)
        else:
            neutral += s["power"]
    base = (tes - tet) / (tes + tet) if (tes + tet) > 0 else 0
    vsf = 1 - (neutral / total_power)
    svi = _fx(base * vsf, 2)
    return {"TES": _fx(tes, 2), "TET": _fx(tet, 2), "baseSVI": _fx(base, 2), "vsf": _fx(vsf, 2),
            "neutralPower": neutral, "totalPower": total_power, "svi": svi,
            "band": pick_band(SVI_BANDS, svi)}


# ── 7. Competitive Posture ───────────────────────────────────────────────────
THREAT_MATRIX = {
    "High": {"High": (5, "Apex Predator"), "Medium": (4, "Incumbent at Risk"), "Low": (3, "Fading Giant")},
    "Medium": {"High": (4, "Rising Star"), "Medium": (3, "Steady Competitor"), "Low": (2, "Stagnant Player")},
    "Low": {"High": (3, "Disruptor"), "Medium": (2, "Niche Contender"), "Low": (1, "Minor Threat")},
}
ADVANTAGE_MATRIX = {
    "High": {"High": (5, "Perfect Opportunity"), "Medium": (4, "Strong Position"), "Low": (2, "Trapped Strength")},
    "Medium": {"High": (4, "Growth Bet"), "Medium": (3, "Standard Battle"), "Low": (1, "Uphill Fight")},
    "Low": {"High": (2, "Capability Challenge"), "Medium": (1, "Losing Proposition"), "Low": (1, "Avoid")},
}
SVS_LABELS = {
    1: {5: "Unwinnable War", 4: "Supplier Play Only", 3: "Dangerous Ground", 2: "Losing Proposition", 1: "Wasteland"},
    2: {5: "Retreat & Defend", 4: "High-Risk Gambit", 3: "Tough Slog", 2: "Capability Challenge", 1: "Low-Priority Play"},
    3: {5: "Guerrilla Warfare", 4: "Calculated Skirmish", 3: "Standard Battle", 2: "Opportunity Knocks", 1: "Untapped Potential"},
    4: {5: "Strategic Standoff", 4: "Focused Attack", 3: "Lead the Pack", 2: "Build the Platform", 1: "Easy Win"},
    5: {5: "Battle of Titans", 4: "Targeted Takedown", 3: "Market Rollup", 2: "Blitz & Dominate", 1: "Create the Market"},
}
CPI_BANDS = [
    {"v": "Advantaged", "min": 0.2, "color": "#16A34A"},
    {"v": "Contested", "min": -0.2, "color": "#D97706"},
    {"v": "Hostile", "min": -1.01, "color": "#DC2626"},
]


def _cell(matrix, a, b):
    c = (matrix.get(a) or {}).get(b)
    return None if c is None else {"s": c[0], "label": c[1]}


def competitor_threat(position: str, momentum: str) -> Optional[dict]:
    return _cell(THREAT_MATRIX, position, momentum)


def bosch_advantage(strength: str, gap: str) -> Optional[dict]:
    return _cell(ADVANTAGE_MATRIX, strength, gap)


def compute_cpi(avg_threat: float, advantage: int) -> Optional[dict]:
    if not avg_threat or not advantage:
        return None
    svs = _fx(advantage + advantage * (5 - avg_threat) / 5, 2)
    cpi = _fx((svs - 5) / 4, 2)
    label = (SVS_LABELS.get(advantage) or {}).get(js_round(avg_threat))
    return {"avgThreatScore": avg_threat, "advantageScore": advantage, "svs": svs, "cpi": cpi,
            "label": label, "band": pick_band(CPI_BANDS, cpi)}


# ── 8. Supply Chain Viability ────────────────────────────────────────────────
SCVI_MATRIX = {
    "High": {"High": (5, "Strategic Asset"), "Medium": (4, "Managed Ecosystem"), "Low": (3, "Missed Opportunity")},
    "Medium": {"High": (4, "Advantaged Position"), "Medium": (3, "Standard Sourcing"), "Low": (2, "High-Risk Sourcing")},
    "Low": {"High": (2, "Co-Development Risk"), "Medium": (1, "Extreme Dependency"), "Low": (1, "Unviable")},
}
SCVI_BANDS = [
    {"v": "Resilient / Localized", "min": 0.4, "color": "#16A34A"},
    {"v": "Manageable Friction", "min": -0.4, "color": "#D97706"},
    {"v": "Severe Vulnerability", "min": -1.01, "color": "#DC2626"},
]


def compute_scvi(maturity: str, control: str) -> Optional[dict]:
    m = _cell(SCVI_MATRIX, maturity, control)
    if not m:
        return None
    scvi = _fx((m["s"] - 3) / 2, 2)
    return {"scvs": m["s"], "label": m["label"], "scvi": scvi, "band": pick_band(SCVI_BANDS, scvi)}


# ── 9. Technology Prognosis ──────────────────────────────────────────────────
TPS_MATRIX = {
    "High": {"High": (4, "Disruptive Incumbent"), "Medium": (5, "Growth Frontier"), "Low": (3, "High-Potential Bet")},
    "Medium": {"High": (3, "Cash Cow"), "Medium": (4, "Strategic Bet"), "Low": (2, "Watch & Wait")},
    "Low": {"High": (2, "Legacy Tech"), "Medium": (1, "Niche Trap"), "Low": (1, "Academic Curiosity")},
}
TPI_BANDS = [
    {"v": "Future-Proof / Standardized", "min": 0.4, "color": "#16A34A"},
    {"v": "Transitional / Emerging", "min": -0.4, "color": "#D97706"},
    {"v": "Obsolete / Highly Volatile", "min": -1.01, "color": "#DC2626"},
]


def compute_tpi(velocity: str, readiness: str) -> Optional[dict]:
    m = _cell(TPS_MATRIX, velocity, readiness)
    if not m:
        return None
    tpi = _fx((m["s"] - 3) / 2, 2)
    return {"tps": m["s"], "label": m["label"], "tpi": tpi, "band": pick_band(TPI_BANDS, tpi)}


# ── 10. Master Growth Index ──────────────────────────────────────────────────
# DOC NOTE: Execution Viability weights sum to 1.05 in the source document.
# Implemented as written, not silently rebalanced.
MGI_BANDS = [
    {"v": "Core Bet (Tier-1)", "min": 0.3, "color": "#16A34A"},
    {"v": "Horizon Play (Tier-2)", "min": -0.3, "color": "#D97706"},
    {"v": "Portfolio Distractor (Tier-3)", "min": -1.06, "color": "#DC2626"},
]


def compute_mgi(mai, pi, cgi, spi, cpi, scvi, svi, tpi) -> Optional[dict]:
    if any(v is None for v in (mai, pi, cgi, spi, cpi, scvi, svi, tpi)):
        return None
    mp = _fx(0.65 * mai + 0.35 * pi, 2)
    rtw = _fx(0.4 * cgi + 0.35 * spi + 0.25 * cpi, 2)
    ev = _fx(0.45 * scvi + 0.4 * svi + 0.2 * tpi, 2)
    mgi = _fx(0.4 * mp + 0.35 * rtw + 0.25 * ev, 2)
    return {"marketPotential": mp, "rightToWin": rtw, "executionViability": ev, "mgi": mgi,
            "band": pick_band(MGI_BANDS, mgi)}


# ── Field and portfolio roll-up ──────────────────────────────────────────────
def score_field(v8: Optional[dict], horizons: Optional[dict] = None) -> Optional[Dict[str, Any]]:
    """Every index for one field. CPI uses the portfolio call site's rounding
    (average threat rounded to 2dp before the matrix), which is the value the
    leaderboard ranks on. The field card in the static UI does not round; see
    the note in tests/test_parity.py."""
    if not v8:
        return None
    pi = compute_pestel_index(v8["pestel"]) if v8.get("pestel") else None
    sw = compute_swot_posture(v8["swot"]) if v8.get("swot") else None
    mas = compute_mas(v8["market"]) if v8.get("market") else None
    iai = compute_iai(v8["iai"]) if v8.get("iai") else None
    cgi = compute_cgi(v8.get("competency"))
    svi = compute_svi(v8.get("stakeholders"))
    threats = [t for t in (competitor_threat(c["marketPosition"], c["futureMomentum"])
                           for c in v8.get("competitors") or []) if t]
    adv = bosch_advantage(v8["boschStrength"], v8["marketGapSignificance"]) \
        if v8.get("boschStrength") and v8.get("marketGapSignificance") else None
    cpi = compute_cpi(_fx(avg([t["s"] for t in threats]), 2), adv["s"]) if threats and adv else None
    scvi = compute_scvi(v8["supplyChainMaturity"], v8["boschControl"]) \
        if v8.get("supplyChainMaturity") and v8.get("boschControl") else None
    tpi = compute_tpi(v8["techVelocity"], v8["commReadiness"]) \
        if v8.get("techVelocity") and v8.get("commReadiness") else None
    mgi = None
    if all(x is not None for x in (mas, pi, cgi, sw, cpi, scvi, svi, tpi)):
        mgi = compute_mgi(mas["mai"], pi["index"], cgi["cgi"], sw["spi"], cpi["cpi"],
                          scvi["scvi"], svi["svi"], tpi["tpi"])
    return {
        "engineVersion": ENGINE_VERSION,
        "pestel": pi, "swot": sw, "mas": mas, "iai": iai, "cgi": cgi, "svi": svi,
        "threats": threats, "advantage": adv, "cpi": cpi, "scvi": scvi, "tpi": tpi, "mgi": mgi,
        "porterDerived": porter_from_sub_factors(v8.get("iai")),
        "horizon": compute_horizon_score(horizons) if horizons else None,
    }


INDEX_KEYS = [
    ("mgi", "Master Growth Index", "MGI"), ("pi", "PESTEL Index", "PI"),
    ("spi", "SWOT Posture", "SPI"), ("mai", "Market Attractiveness", "MAI"),
    ("iai", "Industry Attractiveness", "IAI"), ("cgi", "Competency Gap", "CGI"),
    ("svi", "Stakeholder Viability", "SVI"), ("cpi", "Competitive Posture", "CPI"),
    ("scvi", "Supply Chain Viability", "SCVI"), ("tpi", "Technology Prognosis", "TPI"),
]


def _flat(s: dict) -> dict:
    m = s["mgi"]
    g = lambda o, k: None if o is None else o.get(k)  # noqa: E731
    return {
        "mgi": g(m, "mgi"), "pi": g(s["pestel"], "index"), "spi": g(s["swot"], "spi"),
        "mai": g(s["mas"], "mai"), "iai": g(s["iai"], "iai"), "cgi": g(s["cgi"], "cgi"),
        "svi": g(s["svi"], "svi"), "cpi": g(s["cpi"], "cpi"), "scvi": g(s["scvi"], "scvi"),
        "tpi": g(s["tpi"], "tpi"), "mp": g(m, "marketPotential"), "rtw": g(m, "rightToWin"),
        "ev": g(m, "executionViability"), "band": None if m is None else m["band"],
    }


def score_portfolio(field_ids: List[str], v8: dict, data: dict) -> dict:
    """Every field, plus the portfolio-relative lens (range, rank, separating
    power). Ranks are relative: one field's change moves the others, so the
    portfolio is always computed as a whole."""
    fields = {}
    for fid in field_ids:
        s = score_field(v8.get(fid), (data.get(fid) or {}).get("horizons"))
        if s:
            fields[fid] = s
    flat = {fid: _flat(s) for fid, s in fields.items()}

    stats = {}
    for k, label, short in INDEX_KEYS:
        rows = [{"id": fid, "v": flat[fid][k]} for fid in field_ids if fid in flat and flat[fid][k] is not None]
        vals = [r["v"] for r in rows]
        lo, hi = min(vals), max(vals)
        mean = avg(vals)
        sd = math.sqrt(avg([(v - mean) ** 2 for v in vals]))
        spread = (hi - lo) / 2
        ranked = sorted(rows, key=lambda r: -r["v"])
        stats[k] = {
            "label": label, "short": short, "min": _fx(lo, 2), "max": _fx(hi, 2),
            "mean": _fx(mean, 2), "sd": _fx(sd, 3), "spread": _fx(spread, 2), "n": len(rows),
            "rankOf": {r["id"]: i + 1 for i, r in enumerate(ranked)},
            "power": "Strong separator" if spread >= 0.6 else "Moderate separator" if spread >= 0.35 else "Weak separator",
        }
    return {"engineVersion": ENGINE_VERSION, "fields": fields, "portfolio": flat, "stats": stats}


def index_rank(stats: dict, key: str, field_id: str) -> Optional[dict]:
    st = stats.get(key)
    if not st or field_id not in st["rankOf"]:
        return None
    rank, n = st["rankOf"][field_id], st["n"]
    return {"rank": rank, "of": n, "pct": js_round(100 * (n - rank) / (n - 1))}

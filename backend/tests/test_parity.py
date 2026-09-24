"""Golden parity: the Python engine must reproduce the JavaScript engine exactly.

golden.json is produced by tools/extract.cjs running the original static app's
engine. Every comparison here is exact equality — no tolerance. A tolerance
would let the two engines drift apart one rounding at a time, which is how the
Porter radar and its sub-factor scores ended up disagreeing on 16 of 90 scorings.

Known pre-existing inconsistency, preserved deliberately in Phase 0: the static
UI computes CPI two ways. The leaderboard rounds the average competitor threat
to 2dp before the matrix; the field card does not. They differ for exactly one
field today (sustainability, 0.01 vs 0.02). The Python engine follows the
leaderboard, and test_cpi_field_view_divergence_is_known pins the one known
difference so any new one is caught.
"""
import json
from pathlib import Path

import pytest

from app.engine import scoring as E

SEED = Path(__file__).resolve().parents[1] / "seed"
GOLDEN = json.loads((SEED / "golden.json").read_text(encoding="utf-8"))
BOARD = json.loads((SEED / "board.json").read_text(encoding="utf-8"))
FIELD_IDS = [f["id"] for f in BOARD["FIELDS"]]


def bn(band):
    return None if band is None else band["v"]


def strip(o):
    if o is None:
        return None
    return {**{k: v for k, v in o.items() if k != "band"}, "band": bn(o.get("band"))}


@pytest.fixture(scope="module")
def scored():
    return {fid: E.score_field(BOARD["V8"].get(fid), (BOARD["DATA"].get(fid) or {}).get("horizons"))
            for fid in FIELD_IDS}


@pytest.mark.parametrize("fid", FIELD_IDS)
def test_field_indices_match_golden(fid, scored):
    g = GOLDEN["perField"][fid]
    s = scored[fid]

    assert strip(s["pestel"]) == g["pestel"]

    sw = s["swot"]
    assert {k: sw[k] for k in ("S", "W", "O", "T", "iri", "eai", "spi")} == \
        {k: g["swot"][k] for k in ("S", "W", "O", "T", "iri", "eai", "spi")}
    assert bn(sw["band"]) == g["swot"]["band"]
    assert (sw["quadrant"] or {}).get("key") == g["swot"]["quadrant"]
    assert [[x["k"], x["v"]] for x in sw["strategies"]] == g["swot"]["strategies"]

    m = s["mas"]
    assert {k: m[k] for k in ("samScore", "cagrScore", "scaleVelocity", "mas", "mai")} == \
        {k: g["mas"][k] for k in ("samScore", "cagrScore", "scaleVelocity", "mas", "mai")}
    assert bn(m["band"]) == g["mas"]["band"]

    assert strip(s["iai"]) == g["iai"]

    c = s["cgi"]
    assert c["cgi"] == g["cgi"]["cgi"] and bn(c["band"]) == g["cgi"]["band"]
    assert [[r["k"], r["required"], r["current"], r["gap"], r["weight"]] for r in c["rows"]] == g["cgi"]["rows"]

    assert strip(s["svi"]) == g["svi"]
    assert [[t["s"], t["label"]] for t in s["threats"]] == g["threats"]
    assert s["advantage"] == g["advantage"]
    assert strip(s["cpi"]) == g["cpiPortfolio"]
    assert strip(s["scvi"]) == g["scvi"]
    assert strip(s["tpi"]) == g["tpi"]
    assert s["porterDerived"] == g["porterDerived"]
    assert s["horizon"] == g["horizon"]


def test_cpi_field_view_divergence_is_known():
    diverging = sorted(fid for fid, g in GOLDEN["perField"].items()
                       if g["cpiPortfolio"] and g["cpiFieldView"]
                       and g["cpiPortfolio"]["cpi"] != g["cpiFieldView"]["cpi"])
    assert diverging == ["sustainability"], f"CPI call sites now diverge for: {diverging}"


@pytest.fixture(scope="module")
def portfolio():
    return E.score_portfolio(FIELD_IDS, BOARD["V8"], BOARD["DATA"])


def test_portfolio_matches_golden(portfolio):
    got = {fid: {**{k: v for k, v in row.items() if k != "band"}, "band": bn(row["band"])}
           for fid, row in portfolio["portfolio"].items()}
    assert got == GOLDEN["portfolio"]


def test_portfolio_stats_match_golden(portfolio):
    for k, g in GOLDEN["stats"].items():
        s = portfolio["stats"][k]
        assert {x: s[x] for x in ("min", "max", "mean", "sd", "spread", "n", "power", "rankOf")} == g, k


def test_ranks_match_golden(portfolio):
    for k, per in GOLDEN["ranks"].items():
        for fid, r in per.items():
            assert E.index_rank(portfolio["stats"], k, fid) == r, (k, fid)

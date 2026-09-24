/* The board, held as live ES-module bindings.

   main.jsx fetches /api/board and calls hydrate() once before the first
   render. Every module that imported DATA, V8, PORTFOLIO... then sees the
   loaded values, so the UI code reads them exactly as it did when they were
   literals in the static file. */
import { GRAD, INK, computeHorizonScore, porterFromSubFactors, pickBand, avg, PESTEL_IMPACT_LABELS, PESTEL_CERTAINTY_LABELS, PESTEL_BANDS, computePESTELIndex, SWOT_IMPACT_LABELS, SWOT_PROB_LABELS, SWOT_QUADRANTS, SPI_BANDS, computeSWOTPosture, SCURVE_LABELS, REVENUE_QUALITY_LABELS, PROFITABILITY_LABELS, MAI_BANDS, samScoreFromUSD, cagrScoreFromPct, computeMAS, IAI_BANDS, computeIAI, COMPETENCY_AREAS, COMPETENCY_LEVEL_LABELS, COMPETENCY_WEIGHT_PROFILES, CGI_BANDS, computeCGI, STAKEHOLDER_CATEGORIES, SVI_BANDS, computeSVI, THREAT_MATRIX, competitorThreat, THREAT_LEVEL_DEFS, POSITION_RANK, THREAT_LEVEL_LEGEND, threatTone, ADVANTAGE_MATRIX, boschAdvantage, SVS_LABELS, CPI_BANDS, computeCPI, SCVI_MATRIX, SCVI_BANDS, computeSCVI, TPS_MATRIX, TPI_BANDS, computeTPI, MGI_BANDS, computeMGI, PORTER_FRAMEWORK, KRALJIC_LEGEND, SCURVE, COMPETENCY_CATS } from "./engine.js";

export let FIELDS = [], MACRO = {}, DATA = {}, V6 = {}, V7 = {}, V8 = {}, SUB = {};
export let PORTFOLIO = {}, PORTFOLIO_STATS = {};
export let BOARD_AS_OF = null;

/* ═══════════════════════════════════════════════════════════════════════════
   PORTFOLIO CALIBRATION — computed once, across all 15 fields.

   Reviewer finding: most index values sit close to 0, which makes fields hard
   to tell apart. That observation is correct, and it is a property of the
   formulas rather than a scoring error:

     • PESTEL Index is (ΣTailwind − ΣHeadwind) / (ΣTailwind + ΣHeadwind) over 36
       scored points. Summing 18 products on each side pulls the ratio toward the
       ratio of the means — every field has both good and bad macro forces, so the
       result gravitates to the middle. Observed spread is only ~18% of the scale.
     • SPI blends two such ratios, so it inherits the same compression.
     • MGI is a weighted average of averages, which compresses once more.

   Changing the arithmetic would break compliance with the scoring document. So
   instead we keep the absolute scale exactly as specified and add a portfolio-
   relative lens on top: rank, percentile and the observed range per index. The
   absolute value answers "is this good?"; the relative position answers "is this
   better than the alternatives?" — which is the actual investment question.
   ═══════════════════════════════════════════════════════════════════════════ */
export function computeAllIndices(id) {
  const v8 = V8[id];
  if (!v8) return null;
  const pi = v8.pestel ? computePESTELIndex(v8.pestel) : null;
  const sw = v8.swot ? computeSWOTPosture(v8.swot) : null;
  const mas = v8.market ? computeMAS(v8.market) : null;
  const iai = v8.iai ? computeIAI(v8.iai) : null;
  const cgi = v8.competency ? computeCGI(v8.competency) : null;
  const svi = v8.stakeholders?.length ? computeSVI(v8.stakeholders) : null;
  const threats = (v8.competitors || []).map(c => competitorThreat(c.marketPosition, c.futureMomentum)).filter(Boolean);
  const adv = v8.boschStrength && v8.marketGapSignificance ? boschAdvantage(v8.boschStrength, v8.marketGapSignificance) : null;
  const cpi = threats.length && adv ? computeCPI(+avg(threats.map(t => t.s)).toFixed(2), adv.s) : null;
  const scvi = v8.supplyChainMaturity && v8.boschControl ? computeSCVI(v8.supplyChainMaturity, v8.boschControl) : null;
  const tpi = v8.techVelocity && v8.commReadiness ? computeTPI(v8.techVelocity, v8.commReadiness) : null;
  const mgi = (mas && pi && cgi && sw && cpi && scvi && svi && tpi)
    ? computeMGI({ mai: mas.mai, pi: pi.index, cgi: cgi.cgi, spi: sw.spi, cpi: cpi.cpi, scvi: scvi.scvi, svi: svi.svi, tpi: tpi.tpi })
    : null;
  return {
    mgi: mgi?.mgi ?? null, pi: pi?.index ?? null, spi: sw?.spi ?? null, mai: mas?.mai ?? null,
    iai: iai?.iai ?? null, cgi: cgi?.cgi ?? null, svi: svi?.svi ?? null, cpi: cpi?.cpi ?? null,
    scvi: scvi?.scvi ?? null, tpi: tpi?.tpi ?? null,
    mp: mgi?.marketPotential ?? null, rtw: mgi?.rightToWin ?? null, ev: mgi?.executionViability ?? null,
    band: mgi?.band ?? null,
  };
}

export const INDEX_KEYS = [
  { k: "mgi", label: "Master Growth Index", short: "MGI" },
  { k: "pi", label: "PESTEL Index", short: "PI" },
  { k: "spi", label: "SWOT Posture", short: "SPI" },
  { k: "mai", label: "Market Attractiveness", short: "MAI" },
  { k: "iai", label: "Industry Attractiveness", short: "IAI" },
  { k: "cgi", label: "Competency Gap", short: "CGI" },
  { k: "svi", label: "Stakeholder Viability", short: "SVI" },
  { k: "cpi", label: "Competitive Posture", short: "CPI" },
  { k: "scvi", label: "Supply Chain Viability", short: "SCVI" },
  { k: "tpi", label: "Technology Prognosis", short: "TPI" },
];

/* Every field's every index, computed once at module load (pure arithmetic). */
function computePortfolio() {
  PORTFOLIO = Object.fromEntries(FIELDS.map(f => [f.id, computeAllIndices(f.id)]).filter(([, v]) => v));

  /* Per-index observed range across the portfolio, plus a discrimination read.
     "Spread" is the share of the −1..+1 scale the fields actually occupy —
     a low spread means that index separates fields weakly and small differences
     in it should not drive a decision on their own. */
  PORTFOLIO_STATS = Object.fromEntries(INDEX_KEYS.map(({ k, label, short }) => {
    const rows = Object.entries(PORTFOLIO).map(([id, v]) => ({ id, v: v[k] })).filter(r => r.v != null);
    const vals = rows.map(r => r.v);
    const min = Math.min(...vals), max = Math.max(...vals);
    const mean = avg(vals);
    const sd = Math.sqrt(avg(vals.map(v => (v - mean) ** 2)));
    const spread = (max - min) / 2; // share of the full −1..+1 scale in use
    const ranked = [...rows].sort((a, b) => b.v - a.v);
    return [k, {
      label, short, min: +min.toFixed(2), max: +max.toFixed(2), mean: +mean.toFixed(2),
      sd: +sd.toFixed(3), spread: +spread.toFixed(2), n: rows.length,
      rankOf: Object.fromEntries(ranked.map((r, i) => [r.id, i + 1])),
      rows: ranked,
      power: spread >= 0.6 ? "Strong separator" : spread >= 0.35 ? "Moderate separator" : "Weak separator",
    }];
  }));

}

export function indexRank(key, fieldId) {
  const st = PORTFOLIO_STATS[key];
  if (!st || !st.rankOf[fieldId]) return null;
  const rank = st.rankOf[fieldId];
  return { rank, of: st.n, pct: Math.round(100 * (st.n - rank) / (st.n - 1)) };
}


export function hydrate(board) {
  FIELDS = board.FIELDS; MACRO = board.MACRO;
  DATA = board.DATA; V6 = board.V6; V7 = board.V7; V8 = board.V8; SUB = board.SUB;
  BOARD_AS_OF = board.asOf;
  computePortfolio();
}

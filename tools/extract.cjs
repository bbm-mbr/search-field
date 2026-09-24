/* Extract the static board into seed data, plus the golden scores.

   Reads the data + scoring-engine half of the static app's SearchField.jsx
   (everything above the "UI atoms" marker), evaluates it in plain Node, and
   writes two things:

     backend/seed/board.json   every content layer, key order preserved
     backend/seed/golden.json  every score the static engine computes today

   The golden file is the contract for Phase 0: the live system is correct
   only when its Python engine reproduces every value in it exactly, and when
   the frontend, hydrated from the API, reproduces PORTFOLIO exactly.

   Usage:  node tools/extract.cjs <path-to-static SearchField.jsx>
*/
const fs = require("fs");
const path = require("path");

const src = process.argv[2];
if (!src) throw new Error("usage: node tools/extract.cjs <SearchField.jsx>");
const lines = fs.readFileSync(src, "utf8").split("\n");
const cut = lines.findIndex(l => l.includes("UI atoms"));
if (cut < 0) throw new Error("UI atoms marker not found");
const code = lines.slice(0, cut).join("\n").replace(/^import[\s\S]*?from "recharts";/m, "");

/* Evaluate and hand back every binding we need. */
const harvest = new Function(code + `
  return { FIELDS, MACRO, DATA, V6, V7, V8, SUB, U, PORTFOLIO, PORTFOLIO_STATS, INDEX_KEYS,
    computePESTELIndex, computeSWOTPosture, computeMAS, computeIAI, computeCGI, computeSVI,
    competitorThreat, boschAdvantage, computeCPI, computeSCVI, computeTPI, computeMGI,
    porterFromSubFactors, computeHorizonScore, indexRank, avg };`);
const B = harvest();

/* ── seed ───────────────────────────────────────────────────────────────── */
const board = {
  asOf: B.MACRO.asOf,
  FIELDS: B.FIELDS, MACRO: B.MACRO,
  DATA: B.DATA, V6: B.V6, V7: B.V7, V8: B.V8, SUB: B.SUB,
};
const outDir = path.join(__dirname, "..", "backend", "seed");
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, "board.json"), JSON.stringify(board));

/* ── golden ─────────────────────────────────────────────────────────────── */
const bandName = b => (b ? b.v : null);
const strip = o => o == null ? null : Object.fromEntries(
  Object.entries(o).filter(([k]) => k !== "band").concat([["band", bandName(o.band)]]));

const perField = {};
for (const f of B.FIELDS) {
  const v8 = B.V8[f.id];
  const d = B.DATA[f.id];
  if (!v8) continue;
  const pi = v8.pestel ? B.computePESTELIndex(v8.pestel) : null;
  const sw = v8.swot ? B.computeSWOTPosture(v8.swot) : null;
  const mas = v8.market ? B.computeMAS(v8.market) : null;
  const iai = v8.iai ? B.computeIAI(v8.iai) : null;
  const cgi = v8.competency ? B.computeCGI(v8.competency) : null;
  const svi = v8.stakeholders?.length ? B.computeSVI(v8.stakeholders) : null;
  const threats = (v8.competitors || []).map(c => B.competitorThreat(c.marketPosition, c.futureMomentum)).filter(Boolean);
  const adv = v8.boschStrength && v8.marketGapSignificance ? B.boschAdvantage(v8.boschStrength, v8.marketGapSignificance) : null;
  /* Two call sites compute CPI differently in the static app: the portfolio
     rounds the average threat to 2dp first, the field view does not. Both are
     recorded so the port can be checked against each. */
  const cpiPortfolio = threats.length && adv ? B.computeCPI(+B.avg(threats.map(t => t.s)).toFixed(2), adv.s) : null;
  const cpiFieldView = threats.length && adv ? B.computeCPI(B.avg(threats.map(t => t.s)), adv.s) : null;
  const scvi = v8.supplyChainMaturity && v8.boschControl ? B.computeSCVI(v8.supplyChainMaturity, v8.boschControl) : null;
  const tpi = v8.techVelocity && v8.commReadiness ? B.computeTPI(v8.techVelocity, v8.commReadiness) : null;
  perField[f.id] = {
    pestel: pi && { ...strip(pi) },
    swot: sw && { ...strip(sw), quadrant: sw.quadrant ? sw.quadrant.key : null, strategies: sw.strategies.map(s => [s.k, s.v]) },
    mas: mas && { samScore: mas.samScore, cagrScore: mas.cagrScore, scaleVelocity: mas.scaleVelocity, mas: mas.mas, mai: mas.mai, band: bandName(mas.band) },
    iai: iai && strip(iai),
    cgi: cgi && { cgi: cgi.cgi, band: bandName(cgi.band), rows: cgi.rows.map(r => [r.k, r.required, r.current, r.gap, r.weight]) },
    svi: svi && strip(svi),
    threats: threats.map(t => [t.s, t.label]),
    advantage: adv,
    cpiPortfolio: cpiPortfolio && strip(cpiPortfolio),
    cpiFieldView: cpiFieldView && strip(cpiFieldView),
    scvi: scvi && strip(scvi),
    tpi: tpi && strip(tpi),
    porterDerived: v8.iai ? B.porterFromSubFactors(v8.iai) : null,
    horizon: d?.horizons ? B.computeHorizonScore(d.horizons) : null,
  };
}

const portfolio = Object.fromEntries(Object.entries(B.PORTFOLIO).map(([id, v]) => [id, strip(v)]));
const stats = Object.fromEntries(Object.entries(B.PORTFOLIO_STATS).map(([k, s]) => [k, {
  min: s.min, max: s.max, mean: s.mean, sd: s.sd, spread: s.spread, n: s.n, power: s.power,
  rankOf: s.rankOf,
}]));
const ranks = {};
for (const { k } of B.INDEX_KEYS) for (const f of B.FIELDS) {
  const r = B.indexRank(k, f.id);
  if (r) (ranks[k] = ranks[k] || {})[f.id] = r;
}

fs.writeFileSync(path.join(outDir, "golden.json"), JSON.stringify({ perField, portfolio, stats, ranks }, null, 1));

/* The URL map is reference config, not content: it becomes frontend code. */
fs.writeFileSync(path.join(outDir, "source_urls.json"), JSON.stringify(B.U, null, 1));

/* ── report ─────────────────────────────────────────────────────────────── */
const cpiDiffs = Object.entries(perField)
  .filter(([, v]) => v.cpiPortfolio && v.cpiFieldView && v.cpiPortfolio.cpi !== v.cpiFieldView.cpi)
  .map(([id, v]) => `${id}: portfolio ${v.cpiPortfolio.cpi} vs field view ${v.cpiFieldView.cpi}`);
const layerCounts = ["DATA", "V6", "V7", "V8", "SUB"].map(k => `${k} ${Object.keys(B[k]).length}`).join(" · ");
const subCount = Object.values(B.SUB).reduce((a, s) => a + Object.keys(s).length, 0);
console.log(`fields ${B.FIELDS.length} · ${layerCounts} · sub-field drill-downs ${subCount}`);
console.log(`board.json ${(fs.statSync(path.join(outDir, "board.json")).size / 1e6).toFixed(2)} MB`);
console.log(`golden: ${Object.keys(perField).length} fields scored, MGI range ${stats.mgi.min} … ${stats.mgi.max}`);
console.log(cpiDiffs.length ? `CPI call-site mismatch (pre-existing):\n  ${cpiDiffs.join("\n  ")}` : "CPI call sites agree for every field");

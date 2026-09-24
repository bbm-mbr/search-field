/* V9 scoring engine and static framework constants.
   Migrated from the static board on 2026-09-24; this file is now the source.
   Any change here must be mirrored in the Python port in
   backend/app/engine/scoring.py is held to it by golden parity tests. */
export const GRAD = "linear-gradient(90deg,#9e2896 0%,#e20015 22%,#e20015 32%,#007bc0 55%,#00a8b0 78%,#78be20 100%)";
export const INK = "#0E1A2E";





/* Horizon leverage + tech-roadmap depth score — computed, formula shown in UI. */
export function computeHorizonScore(h) {
  const n1 = h.h1?.length || 0, n2 = h.h2?.length || 0, n3 = h.h3?.length || 0;
  const total = n1 + n2 + n3 || 1;
  const depth = Math.min(10, 2 * n1 + 1.5 * n2 + 1 * n3 + (n1 && n2 && n3 ? 1 : 0));
  return { n1, n2, n3, p1: Math.round(100 * n1 / total), p2: Math.round(100 * n2 / total), p3: Math.round(100 * n3 / total), depth: +depth.toFixed(1) };
}

/* ═══════════════════════════════════════════════════════════════════════════
   V9 SCORING ENGINE — implements the Bosch BBM Search-Field Scoring Document
   (v2, supersedes v1). Every component index is normalized to −1..+1 (+1 =
   best) and rolls up into a single Master Growth Index (MGI) per field — v2,
   unlike v1, explicitly defines that roll-up (see §"Final Decision").
   Where the source document has an internal inconsistency, it is implemented
   literally (not silently corrected) and flagged with a "DOC NOTE" comment.
   ═══════════════════════════════════════════════════════════════════════════ */

/* ─── Porter reconciliation ────────────────────────────────────────────────────
   The five forces used to carry two independent scores: an authored 0-10
   "pressure" number for the radar, and the 1/3/5 sub-factor scores that feed the
   Industry Attractiveness Index. Nothing kept them aligned and they had drifted
   on 16 of 90 scorings. The sub-factor scores are the ones the scoring document
   defines, so they are authoritative and the radar is now derived from them.
   The authored number is retained only so the UI can flag any rationale that was
   written against the old figure and needs a re-read. */
export function porterFromSubFactors(iaiScores) {
  if (!iaiScores) return null;
  return Object.fromEntries(Object.entries(iaiScores).map(([force, arr]) => {
    const mean = arr.reduce((a, b) => a + b, 0) / arr.length;   // 1..5, 5 = most hostile
    return [force, +(((mean - 1) / 4) * 10).toFixed(1)];         // 0..10 pressure scale
  }));
}

export function pickBand(bands, score) { return bands.find(b => score >= b.min) || bands[bands.length - 1]; } // bands sorted desc by min — every index below is "higher = better"
export const avg = arr => arr.reduce((a, b) => a + b, 0) / arr.length;

/* ---- 1. PESTEL Index — score = Impact × Certainty ---- */
/* Index = (Tailwinds − Headwinds) / (Tailwinds + Headwinds), range −1..+1 (doc §1d) */
export const PESTEL_IMPACT_LABELS = {
  for: { 5: "SuperCharger", 3: "Steady Accelerator", 1: "Gentle Nudge" },
  against: { 5: "ShowStopper", 3: "Friction Point", 1: "Minor Speedbump" },
};
export const PESTEL_CERTAINTY_LABELS = { 5: "Immediate / Active (0–2 yr)", 3: "Mid-Term / Emerging (2–5 yr)", 1: "Long-Term / Speculative (>5 yr)" };
export const PESTEL_BANDS = [
  { v: "Macro-Accelerator", min: 0.3, color: "#16A34A", light: "green", m: "The macro-environment is highly cooperative — policy, economics and social trends are actively pulling this field into the mainstream. External friction is low. Deploy capital confidently." },
  { v: "Transitional Gale", min: -0.3, color: "#D97706", light: "yellow", m: "A volatile environment: huge opportunities balanced by massive structural barriers. Gate investment and favour flexible, modular product architectures." },
  { v: "High-Resistance Environment", min: -1.01, color: "#DC2626", light: "red", m: "You are sailing into a storm — the macro-environment is hostile even if Bosch's technology is brilliant. Shelve the project or wait for policy to shift." },
];
export function computePESTELIndex(pestelScores) {
  let tail = 0, head = 0, tailN = 0, headN = 0;
  Object.values(pestelScores || {}).forEach(letter => {
    (letter?.for || []).forEach(pt => { tail += pt.impact * pt.certainty; tailN++; });
    (letter?.against || []).forEach(pt => { head += pt.impact * pt.certainty; headN++; });
  });
  const index = (tail + head) > 0 ? +((tail - head) / (tail + head)).toFixed(2) : null;
  return { tail, head, tailN, headN, index, band: index == null ? null : pickBand(PESTEL_BANDS, index) };
}

/* ---- 2. SWOT Posture — score = Impact × Probability/Confidence ---- */
/* IRI = (Strength−Weakness)/(Strength+Weakness) · EAI = (Opportunity−Threat)/(Opportunity+Threat)
   Plotted on a 2×2 quadrant, then SPI = 0.3×IRI + 0.7×EAI (doc §2d/e — supersedes the old
   Σ(S+O)/Σ(W+T) ratio, which the source document itself marks superseded). */
export const SWOT_IMPACT_LABELS = {
  S: { 5: "Decisive Moat", 3: "Distinct Advantage", 1: "Standard Asset" },
  W: { 5: "Fatal Flaw", 3: "Significant Bottleneck", 1: "Operational Inconvenience" },
  O: { 5: "Market-Defining", 3: "Strategic Growth", 1: "Niche/Tactical Play" },
  T: { 5: "Existential Risk", 3: "Margin Eroder", 1: "Minor Turbulence" },
};
export const SWOT_PROB_LABELS = {
  S: { 5: "Proven & Active", 3: "Global Asset / Needs Translation", 1: "Speculative / Emerging" },
  W: { 5: "Systemic & Entrenched", 3: "Known Gap / Addressable", 1: "Fleeting / Self-Correcting" },
  O: { 5: "Highly Probable / Guaranteed (>80%)", 3: "Probable / Trend-Driven (40–80%)", 1: "Speculative / Long-Shot (<40%)" },
  T: { 5: "Imminent / Active (>80%)", 3: "Moderate / Contingent (40–80%)", 1: "Unlikely / Theoretical (<40%)" },
};
export const SWOT_QUADRANTS = [
  { key: "I", name: "Aggressive Growth", cond: (iri, eai) => iri >= 0 && eai >= 0, mandate: "INVEST TO LEAD", action: "Perfect alignment — decisive internal advantage in a highly attractive market. Top-priority Core Bet: maximum resources, speed-to-market." },
  { key: "II", name: "Turnaround or Partner", cond: (iri, eai) => iri < 0 && eai >= 0, mandate: "BUY OR BUILD", action: "A massive opportunity Bosch is internally unprepared for. Market too good to ignore — either invest to fix the weakness or acquire/partner for the missing capability." },
  { key: "III", name: "Divest or Exit", cond: (iri, eai) => iri < 0 && eai < 0, mandate: "KILL THE PROJECT", action: "Hostile market and internal weakness together — a Portfolio Distractor. De-prioritize or divest immediately; resources here are wasted." },
  { key: "IV", name: "Diversify or Defend", cond: (iri, eai) => iri >= 0 && eai < 0, mandate: "HARVEST VALUE", action: "World-class capability in a stagnant or threatened market. No major new investment — defend the position, harvest as a cash cow, diversify capability elsewhere." },
];
export const SPI_BANDS = [
  { v: "High Priority / Core Bet", min: 0.4, color: "#16A34A", light: "green", m: "A powerful combination of high external attractiveness and strong internal readiness — a clear right-to-win in a favourable market. Invest to dominate." },
  { v: "Contested / Situational Play", min: -0.4, color: "#D97706", light: "yellow", m: "A balanced or conflicting picture. A slightly positive score is usually a Growth Bet (EAI>IRI, close capability gaps via Buy-or-Build first); a slightly negative score is usually a Harvest Play (IRI>EAI, defend a niche/cash-cow with minimal new spend)." },
  { v: "Low Priority / Divest", min: -1.01, color: "#DC2626", light: "red", m: "A toxic combination of low market attractiveness and significant internal weakness. De-prioritize and reallocate; cease funding and plan an exit if Bosch already has presence here." },
];
export function computeSWOTPosture(swotScores) {
  const sum = arr => (arr || []).reduce((a, p) => a + p.impact * p.probability, 0);
  const S = sum(swotScores?.S), W = sum(swotScores?.W), O = sum(swotScores?.O), T = sum(swotScores?.T);
  const iri = (S + W) > 0 ? +((S - W) / (S + W)).toFixed(2) : null;
  const eai = (O + T) > 0 ? +((O - T) / (O + T)).toFixed(2) : null;
  const spi = (iri != null && eai != null) ? +(0.3 * iri + 0.7 * eai).toFixed(2) : null;
  const quadrant = (iri != null && eai != null) ? SWOT_QUADRANTS.find(q => q.cond(iri, eai)) : null;
  const strategies = [
    { k: "SO", label: "Strengths → Opportunities (Attack)", v: S + O },
    { k: "ST", label: "Strengths → Threats (Defend)", v: S + T },
    { k: "WO", label: "Weaknesses → Opportunities (Improve)", v: W + O },
    { k: "WT", label: "Weaknesses → Threats (Survive)", v: W + T },
  ].sort((a, b) => b.v - a.v);
  return { S, W, O, T, iri, eai, spi, quadrant, band: spi == null ? null : pickBand(SPI_BANDS, spi), strategies };
}

/* ---- 3. Market Attractiveness Score (MAS) → Market Attractiveness Index (MAI) ---- */
/* MAS = 0.35×ScaleVelocity + 0.2×S-Curve + 0.2×RevenueQuality + 0.25×Profitability (1..5)
   MAI = (MAS − 3) / 2, range −1..+1 (doc §3f) */
export const SCURVE_LABELS = { 5: "Early Adoption — the sweet spot", 4: "Early Majority — high-volume growth", 3: "Innovation — highly speculative", 2: "Late Majority — commoditised", 1: "Sunset / Decline — do not enter" };
export const REVENUE_QUALITY_LABELS = { 5: "XaaS / Recurring Dominant (>50% of LCV)", 3: "Hybrid / Standard Tier-1 (HW+SW, AMC)", 1: "Commodity Hardware / HaaS" };
export const PROFITABILITY_LABELS = { 5: "Premium Margins (>45% GM incl. SG&A)", 3: "Standard Automotive Margins (25–45%)", 1: "Low / Squeezed Margins (<25%)" };
export const MAI_BANDS = [
  { v: "Tier-1 / Aspiration Anchor Market", min: 0.4, color: "#16A34A", light: "green", code: "GO", m: "The market itself is a powerful growth engine — massive profit potential, high growth, strong revenue quality. Must-play arena; if Right-to-Win is low, default to Buy or Partner, not Avoid." },
  { v: "Tier-2 / Standard Automotive Market", min: -0.4, color: "#D97706", light: "yellow", code: "PROCEED WITH CAUTION", m: "Viable but standard — lacks the scale/profitability to be an Aspiration Anchor on its own. Contingent bet: only proceed with an exceptionally high Right-to-Win." },
  { v: "Tier-3 / Portfolio Distractor Market", min: -1.01, color: "#DC2626", light: "red", code: "NO-GO", m: "A value trap — low profit potential, slow growth, commoditised revenue. Avoid and reallocate, even with world-class capability." },
];
export function samScoreFromUSD(samUSD) { return samUSD > 500e6 ? 5 : samUSD > 100e6 ? 3 : 1; }
export function cagrScoreFromPct(cagrPct) { return cagrPct > 20 ? 5 : cagrPct >= 10 ? 3 : 1; }
export function computeMAS(m) {
  const samScore = samScoreFromUSD(m.samUSD);
  const cagrScore = cagrScoreFromPct(m.cagrPct);
  const scaleVelocity = (samScore + cagrScore) / 2;
  const mas = +(0.35 * scaleVelocity + 0.2 * m.scurveScore + 0.2 * m.revenueQualityScore + 0.25 * m.profitabilityScore).toFixed(2);
  const mai = +((mas - 3) / 2).toFixed(2);
  return { ...m, samScore, cagrScore, scaleVelocity, mas, mai, band: pickBand(MAI_BANDS, mai) };
}

/* ---- 4. Industry Attractiveness Index (IAI) — Porter's 5 Forces, sub-factor averaged ---- */
/* Raw IAI = avg of 5 forces, 1 (attractive/Blue Ocean) .. 5 (unattractive/Red Ocean).
   Normalized IAI = (3 − rawIAI) / 2, range −1..+1, +1 = best (doc §4). */
export const IAI_BANDS = [
  { v: "Structurally Attractive Industry (Blue Ocean)", min: 0.4, color: "#16A34A", light: "green", code: "GO", m: "Low rivalry, high entry barriers, weak buyer/supplier power, low substitute threat — supports high margins and defensible leadership. High-confidence investment." },
  { v: "Moderately Competitive Industry (Choppy Waters)", min: -0.4, color: "#D97706", light: "yellow", code: "PROCEED WITH CAUTION", m: "A typical, balanced dynamic — one or two forces exert real pressure. Execution-dependent bet: proceed only with a high Right-to-Win." },
  { v: "Structurally Unattractive Industry (Red Ocean)", min: -1.01, color: "#DC2626", light: "red", code: "NO-GO", m: "Cut-throat rivalry, powerful buyers, low entry barriers, ready substitutes. Avoid mass-market entry; only a highly specialised, insulated niche play." },
];
export function computeIAI(iaiScores) {
  // iaiScores: { "New entrants":[7 nums 1|3|5], "Buyer power":[6], "Supplier power":[5], "Substitutes":[4], "Rivalry":[6] }
  const forceAvgs = Object.fromEntries(Object.entries(iaiScores || {}).map(([k, v]) => [k, +avg(v).toFixed(2)]));
  const vals = Object.values(forceAvgs);
  const iaiRaw = vals.length ? +avg(vals).toFixed(2) : null;
  const iai = iaiRaw == null ? null : +((3 - iaiRaw) / 2).toFixed(2);
  return { forceAvgs, iaiRaw, iai, band: iai == null ? null : pickBand(IAI_BANDS, iai) };
}

/* ---- 5. Competency Gap Index (CGI) — new module, doc §5 ---- */
export const COMPETENCY_AREAS = [
  { k: "rdInfra", label: "R&D Infra" },
  { k: "ip", label: "IP" },
  { k: "manufacturing", label: "Manufacturing" },
  { k: "supplyChain", label: "Supply Chain" },
  { k: "g2m", label: "Go-To-Market (G2M)" },
  { k: "talent", label: "Talent" },
  { k: "organization", label: "Organization" },
];
export const COMPETENCY_LEVEL_LABELS = {
  1: "Beginner — theoretical knowledge, standard and easily acquired on the open market",
  2: "Experienced Personnel — applies knowledge, adapts to new situations, sufficiently available on the market",
  3: "Specialist — strategic importance, independently solves complex/new problems, only partially available on the market",
  4: "Champion — a distinguishing feature; sets the professional/methodical standard at company or industry level",
};
/* The document asks for sector-specific weights (summing to 100%) but gives no numbers —
   these are our defined defaults, reused across similarly-shaped fields rather than
   15 bespoke sets. Field→profile mapping lives in V9_COMPETENCY_PROFILE below. */
export const COMPETENCY_WEIGHT_PROFILES = {
  softwareDigital: { rdInfra: 0.15, ip: 0.20, manufacturing: 0.05, supplyChain: 0.05, g2m: 0.15, talent: 0.25, organization: 0.15 },
  hardwareMechatronic: { rdInfra: 0.15, ip: 0.15, manufacturing: 0.25, supplyChain: 0.20, g2m: 0.10, talent: 0.10, organization: 0.05 },
  dataPlatform: { rdInfra: 0.10, ip: 0.20, manufacturing: 0.05, supplyChain: 0.05, g2m: 0.25, talent: 0.20, organization: 0.15 },
  hybrid: { rdInfra: 0.15, ip: 0.15, manufacturing: 0.15, supplyChain: 0.15, g2m: 0.15, talent: 0.15, organization: 0.10 },
};
export const CGI_BANDS = [
  { v: "Core Strength / Natural Fit", min: 0.4, color: "#16A34A", light: "green", m: "Bosch possesses a significant competency surplus — uniquely positioned to win. Invest aggressively to leverage this internal advantage." },
  { v: "Manageable Fit", min: -0.4, color: "#D97706", light: "yellow", m: "A slight advantage or on-par with market needs — solid investment area with targeted upskilling, hiring, or a small acquisition to close gaps (especially Talent and IP)." },
  { v: "Fatal Flaw / Unnatural Fit", min: -1.01, color: "#DC2626", light: "red", m: "The competency gap is too large and systemic — a costly, multi-year struggle against our own internal structure. Avoid and reallocate." },
];
export function computeCGI(competency) {
  // competency: { profile: "softwareDigital"|"hardwareMechatronic"|"dataPlatform"|"hybrid", areas: { rdInfra:{required,current}, ... } }
  if (!competency?.areas) return null;
  const weights = COMPETENCY_WEIGHT_PROFILES[competency.profile] || COMPETENCY_WEIGHT_PROFILES.hybrid;
  let weightedGapSum = 0;
  const rows = COMPETENCY_AREAS.map(({ k, label }) => {
    const a = competency.areas[k] || { required: 2, current: 2 };
    const gap = a.current - a.required;
    const w = weights[k] ?? 0;
    weightedGapSum += gap * w;
    return { k, label, required: a.required, current: a.current, gap, weight: w };
  });
  const cgi = +(weightedGapSum / 3).toFixed(2);
  return { rows, weights, cgi, band: pickBand(CGI_BANDS, cgi) };
}

/* ---- 6. Stakeholder Viability Index (SVI) — BIM/TES/TET/VSF cascade, doc §6 ---- */
export const STAKEHOLDER_CATEGORIES = [
  "Government & Regulatory", "Customers & End-Users", "Supply Chain & Ecosystem Partners",
  "Internal Bosch Stakeholders", "Financial & Investment Community", "Public & Media",
];
export const SVI_BANDS = [
  { v: "Favorable Ecosystem", min: 0.3, color: "#16A34A", light: "green", m: "Strong, highly aligned stakeholder support with minimal volatility — relationship leverage (BIM) is amplifying allies and neutralising minor opposition. Accelerate & scale; lock in early proponent integrations." },
  { v: "Contested / Volatile", min: -0.3, color: "#D97706", light: "yellow", m: "A balanced or unpredictable landscape — proponents/opponents evenly matched, or a large share of power sits with undecided Neutrals. Gated funding + targeted lobbying to convert Neutrals; negotiate with detractors before spending CapEx." },
  { v: "Hostile Ecosystem", min: -1.01, color: "#DC2626", light: "red", m: "High-power opposition dominates and Bosch has little leverage — severe risk of regulatory blockage or market lockout. De-prioritize / divest; seek an insulated niche or exit the space entirely." },
];
export function computeSVI(stakeholders) {
  if (!stakeholders?.length) return null;
  const totalPower = stakeholders.reduce((a, s) => a + s.power, 0);
  if (totalPower === 0) return null;
  let TES = 0, TET = 0, neutralPower = 0;
  stakeholders.forEach(s => {
    const bim = (s.boschInfluence - 1) / 4; // 0.00..1.00
    if (s.stance === 1) TES += s.power * (1 + bim * 0.5);
    else if (s.stance === -1) TET += s.power * (1 - bim * 0.5);
    else neutralPower += s.power;
  });
  const baseSVI = (TES + TET) > 0 ? (TES - TET) / (TES + TET) : 0;
  const vsf = 1 - (neutralPower / totalPower); // 1.00 if no neutrals
  const svi = +(baseSVI * vsf).toFixed(2);
  return { TES: +TES.toFixed(2), TET: +TET.toFixed(2), baseSVI: +baseSVI.toFixed(2), vsf: +vsf.toFixed(2), neutralPower, totalPower, svi, band: pickBand(SVI_BANDS, svi) };
}

/* ---- 7. Competitor Threat Level + Bosch Strategic Advantage → Strategic Value Score → CPI ---- */
export const THREAT_MATRIX = {
  High: { High: { s: 5, label: "Apex Predator" }, Medium: { s: 4, label: "Incumbent at Risk" }, Low: { s: 3, label: "Fading Giant" } },
  Medium: { High: { s: 4, label: "Rising Star" }, Medium: { s: 3, label: "Steady Competitor" }, Low: { s: 2, label: "Stagnant Player" } },
  Low: { High: { s: 3, label: "Disruptor" }, Medium: { s: 2, label: "Niche Contender" }, Low: { s: 1, label: "Minor Threat" } },
};
export function competitorThreat(marketPosition, futureMomentum) { return THREAT_MATRIX[marketPosition]?.[futureMomentum] || null; }
/* What each of the 9 named threat classifications means. The legend below is built by walking
   THREAT_MATRIX itself, so it can never drift out of sync with the scoring that produces it. */
export const THREAT_LEVEL_DEFS = {
  "Apex Predator": "Market-leading today and still accelerating. The most dangerous competitor class — head-on confrontation is expensive and rarely wins. Differentiate, niche down, or partner.",
  "Incumbent at Risk": "Leads the market but grows only at market pace. Defensible in the near term, exposed to faster-moving challengers over a platform cycle.",
  "Rising Star": "Not yet a leader but taking share and investing aggressively. Becomes an Apex Predator if left unchecked — the classification to act on earliest.",
  "Fading Giant": "Large installed base and share, but little forward investment. Share erodes as platforms turn over — attack on next-generation capability, not on price.",
  "Steady Competitor": "A stable, conventional rival tracking market growth. The standard competitive case, beaten on execution and differentiation rather than strategy.",
  "Disruptor": "Small share but growing fast on a differentiated technology or business model. Low threat to current revenue, high threat to the future position.",
  "Stagnant Player": "Mid-tier share with no meaningful investment or momentum. Losing relevance — a share donor rather than a threat.",
  "Niche Contender": "Small, with modest growth and credibility only in specific segments. Manage where segments overlap; otherwise monitor.",
  "Minor Threat": "Marginal presence and no momentum. Monitor only — no competitive response warranted.",
};
export const POSITION_RANK = { High: 3, Medium: 2, Low: 1 };
export const THREAT_LEVEL_LEGEND = Object.entries(THREAT_MATRIX)
  .flatMap(([pos, row]) => Object.entries(row).map(([mom, cell]) => ({ ...cell, pos, mom, m: THREAT_LEVEL_DEFS[cell.label] })))
  .sort((a, b) => b.s - a.s || POSITION_RANK[b.pos] - POSITION_RANK[a.pos]);
export const threatTone = s => (s >= 4 ? "red" : s === 3 ? "amber" : "slate");
export const ADVANTAGE_MATRIX = {
  High: { High: { s: 5, label: "Perfect Opportunity" }, Medium: { s: 4, label: "Strong Position" }, Low: { s: 2, label: "Trapped Strength" } },
  Medium: { High: { s: 4, label: "Growth Bet" }, Medium: { s: 3, label: "Standard Battle" }, Low: { s: 1, label: "Uphill Fight" } },
  Low: { High: { s: 2, label: "Capability Challenge" }, Medium: { s: 1, label: "Losing Proposition" }, Low: { s: 1, label: "Avoid" } },
};
export function boschAdvantage(strengths, gapSignificance) { return ADVANTAGE_MATRIX[strengths]?.[gapSignificance] || null; }
/* Strategic Value Score = Advantage + Advantage×(5−Threat)/5, range 1..9 (doc §7 lookup table —
   verified this formula exactly reproduces all 25 named cells of the source table below). */
export const SVS_LABELS = {
  1: { 5: "Unwinnable War", 4: "Supplier Play Only", 3: "Dangerous Ground", 2: "Losing Proposition", 1: "Wasteland" },
  2: { 5: "Retreat & Defend", 4: "High-Risk Gambit", 3: "Tough Slog", 2: "Capability Challenge", 1: "Low-Priority Play" },
  3: { 5: "Guerrilla Warfare", 4: "Calculated Skirmish", 3: "Standard Battle", 2: "Opportunity Knocks", 1: "Untapped Potential" },
  4: { 5: "Strategic Standoff", 4: "Focused Attack", 3: "Lead the Pack", 2: "Build the Platform", 1: "Easy Win" },
  5: { 5: "Battle of Titans", 4: "Targeted Takedown", 3: "Market Rollup", 2: "Blitz & Dominate", 1: "Create the Market" },
};
export const CPI_BANDS = [
  { v: "Advantaged", min: 0.2, color: "#16A34A", light: "green", m: "Bosch holds a clear competitive edge (Blitz & Dominate / Create the Market / Easy Win territory). Invest aggressively to lead." },
  { v: "Contested", min: -0.2, color: "#D97706", light: "yellow", m: "Competitive forces are evenly matched (Battle of Titans / Lead the Pack / Standard Battle territory). Proceed with targeted differentiation." },
  { v: "Hostile", min: -1.01, color: "#DC2626", light: "red", m: "Competitor threat dominates our strategic position (Unwinnable War / Supplier Play Only / Wasteland territory). Avoid mass-market entry; seek a niche or divest." },
];
export function computeCPI(avgThreatScore, advantageScore) {
  if (!avgThreatScore || !advantageScore) return null;
  const svs = +(advantageScore + advantageScore * (5 - avgThreatScore) / 5).toFixed(2);
  const cpi = +((svs - 5) / 4).toFixed(2);
  const label = SVS_LABELS[advantageScore]?.[Math.round(avgThreatScore)] || null;
  return { avgThreatScore, advantageScore, svs, cpi, label, band: pickBand(CPI_BANDS, cpi) };
}

/* ---- 8. Supply Chain Viability Index (SCVI) — doc §8 ---- */
/* Raw SCVS from the matrix (1..5), normalized SCVI = (SCVS − 3) / 2, range −1..+1. */
export const SCVI_MATRIX = {
  High: { High: { s: 5, label: "Strategic Asset" }, Medium: { s: 4, label: "Managed Ecosystem" }, Low: { s: 3, label: "Missed Opportunity" } },
  Medium: { High: { s: 4, label: "Advantaged Position" }, Medium: { s: 3, label: "Standard Sourcing" }, Low: { s: 2, label: "High-Risk Sourcing" } },
  Low: { High: { s: 2, label: "Co-Development Risk" }, Medium: { s: 1, label: "Extreme Dependency" }, Low: { s: 1, label: "Unviable" } },
};
export const SCVI_BANDS = [
  { v: "Resilient / Localized", min: 0.4, color: "#16A34A", light: "green", m: "Highly secure, cost-optimized, localized supply chain — low exposure to import duties and shipping shocks. Approve CapEx for localized assembly; integrate suppliers into early platform planning." },
  { v: "Manageable Friction", min: -0.4, color: "#D97706", light: "yellow", m: "Standard automotive supply chain with isolated, manageable risks. Condition funding on active localization roadmaps; build buffer stock for high-risk imports; qualify secondary suppliers." },
  { v: "Severe Vulnerability", min: -1.01, color: "#DC2626", light: "red", m: "A fragile global supply chain — single-source monopolies, high tariffs, long lead times. Halt scaling; redesign with localized components, or evaluate a JV to secure IP." },
];
export function computeSCVI(maturity, control) {
  const m = SCVI_MATRIX[maturity]?.[control];
  if (!m) return null;
  const scvi = +((m.s - 3) / 2).toFixed(2);
  return { scvs: m.s, label: m.label, scvi, band: pickBand(SCVI_BANDS, scvi) };
}

/* ---- 9. Technology Prognosis Index (TPI) — doc §9 ---- */
/* Raw TPS from the matrix (1..5), normalized TPI = (TPS − 3) / 2, range −1..+1. */
export const TPS_MATRIX = {
  High: { High: { s: 4, label: "Disruptive Incumbent" }, Medium: { s: 5, label: "Growth Frontier" }, Low: { s: 3, label: "High-Potential Bet" } },
  Medium: { High: { s: 3, label: "Cash Cow" }, Medium: { s: 4, label: "Strategic Bet" }, Low: { s: 2, label: "Watch & Wait" } },
  Low: { High: { s: 2, label: "Legacy Tech" }, Medium: { s: 1, label: "Niche Trap" }, Low: { s: 1, label: "Academic Curiosity" } },
};
export const TPI_BANDS = [
  { v: "Future-Proof / Standardized", min: 0.4, color: "#16A34A", light: "green", m: "Highly mature or firmly positioned in the high-growth S-curve phase — obsolescence risk is extremely low with a stable 10+ year roadmap. Lock in as the core platform baseline; approve full-scale development." },
  { v: "Transitional / Emerging", min: -0.4, color: "#D97706", light: "yellow", m: "In transition — an emerging, unproven standard with integration hurdles, or a mature tech beginning a slow decline. Gated pilot funding; design with modular interfaces to allow tech swaps if standards shift." },
  { v: "Obsolete / Highly Volatile", min: -1.01, color: "#DC2626", light: "red", m: "Either sunset-phase or too early/unproven with severe integration risk. Halt plans to lock this into volume product lines; evaluate alternative tech stacks or delay entry." },
];
export function computeTPI(velocity, commReadiness) {
  const m = TPS_MATRIX[velocity]?.[commReadiness];
  if (!m) return null;
  const tpi = +((m.s - 3) / 2).toFixed(2);
  return { tps: m.s, label: m.label, tpi, band: pickBand(TPI_BANDS, tpi) };
}

/* ---- 10. Final Decision — Master Growth Index (MGI), doc "Final Decision" ---- */
/* Market Potential = 0.65×MAI + 0.35×PI(normalized PESTEL Index)
   Right to Win = 0.4×CGI + 0.35×SPI + 0.25×CPI
   Execution Viability = 0.45×SCVI + 0.4×SVI + 0.2×TPI
     DOC NOTE: these three weights sum to 1.05, not 1.00, in the source document —
     implemented exactly as written rather than silently rebalanced; Execution
     Viability can theoretically reach ±1.05 as a result.
   MGI = 0.4×MarketPotential + 0.35×RightToWin + 0.25×ExecutionViability */
export const MGI_BANDS = [
  { v: "Core Bet (Tier-1)", min: 0.3, color: "#16A34A", light: "green", m: "INVEST TO LEAD. Highly attractive market, decisive competitive fit, low execution friction. Maximum capital, engineering headcount, accelerated time-to-market." },
  { v: "Horizon Play (Tier-2)", min: -0.3, color: "#D97706", light: "yellow", m: "PARTNER & GATE. Viable but contested — typically a competency gap (CGI) or supply-chain friction (SCVI). Milestone-gated funding; seek JVs/local partners to mitigate specific risks." },
  { v: "Portfolio Distractor (Tier-3)", min: -1.06, color: "#DC2626", light: "red", m: "DIVEST / AVOID. Hostile market, critical competency deficit, or unviable supply corridor. Halt R&D funding; reallocate engineers to Tier-1 Core Bets." },
];
export function computeMGI({ mai, pi, cgi, spi, cpi, scvi, svi, tpi }) {
  const vals = [mai, pi, cgi, spi, cpi, scvi, svi, tpi];
  if (vals.some(v => v == null)) return null;
  const marketPotential = +(0.65 * mai + 0.35 * pi).toFixed(2);
  const rightToWin = +(0.4 * cgi + 0.35 * spi + 0.25 * cpi).toFixed(2);
  const executionViability = +(0.45 * scvi + 0.4 * svi + 0.2 * tpi).toFixed(2);
  const mgi = +(0.4 * marketPotential + 0.35 * rightToWin + 0.25 * executionViability).toFixed(2);
  return { marketPotential, rightToWin, executionViability, mgi, band: pickBand(MGI_BANDS, mgi) };
}

/* ═══ Shared framework references (same checklist for every field) ═══ */
export const PORTER_FRAMEWORK = {
  "New entrants": ["Capital intensity", "IP barrier", "Regulatory hurdles", "Brand loyalty & reputation", "Access to customers", "Economies of scale", "Access to talent"],
  "Buyer power": ["Buyer concentration", "Volume of purchase", "Switching cost", "Product differentiation", "Threat of backward integration", "Price sensitivity"],
  "Supplier power": ["Supplier concentration", "Uniqueness of supplier product", "Switching cost for Bosch", "Threat of forward integration", "Importance of Bosch to supplier"],
  "Substitutes": ["Availability of substitutes", "Price-performance trade-off", "Customer's propensity to substitute", "Disruptive technology interruption"],
  "Rivalry": ["Number & balance of competitors", "Industry growth rate", "Basis of competition", "Product differentiation", "Exit barrier", "Diversity of competitors"],
};
export const KRALJIC_LEGEND = [
  { q: "strategic", where: "High risk · High profit impact", meaning: "Few suppliers, big margin exposure. These inputs can stop the business.", strategy: "Partner deeply, sign long-term agreements, develop second sources." },
  { q: "bottleneck", where: "High risk · Low profit impact", meaning: "Small spend but hard to source — can halt a line for a cheap part.", strategy: "Hold safety stock, qualify alternates, over-order early." },
  { q: "leverage", where: "Low risk · High profit impact", meaning: "Many suppliers compete for large spend — buyer holds the power.", strategy: "Tender aggressively, negotiate on volume, switch freely." },
  { q: "non-critical", where: "Low risk · Low profit impact", meaning: "Commodity items with many sources and small impact.", strategy: "Automate procurement, minimise handling cost." },
];
export const SCURVE = ["Innovation", "Early Adoption", "Early Majority", "Late Majority", "Sunset"];
export const COMPETENCY_CATS = ["R&D Infra", "IP", "Manufacturing", "Supply Chain", "G2M", "Talent", "Organization", "Leadership", "Collaboration"];

/* ═══ Field deep-dives — all 15 search fields ═══ */

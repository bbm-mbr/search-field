import React, { useState } from "react";
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, LabelList,
} from "recharts";

/* ──────────────────────────────────────────────────────────────────────────
   Bosch Mobility India — Search-Field Intelligence (DEMO v2, mock data)
   New in v2 (team feedback):
   · Methodology tab + inline "show the working" — one fixed formula for ALL
     fields; verdict, score & confidence are computed, not LLM opinions
   · Decision matrix shows every intermediate number (eff. weight, contribution)
   · Every framework point carries WHY (evidence) + SO WHAT (Bosch implication)
   · TAM/SAM full derivation chain with per-figure sources & cross-check
   ────────────────────────────────────────────────────────────────────────── */

const GRAD = "linear-gradient(90deg,#7A1FA2 0%,#E20015 38%,#0096A0 72%,#5BAA32 100%)";
const INK = "#0E1A2E";

const FIELDS = [
  { id: "lighting", name: "Lighting System", subs: ["Interior Lighting", "Exterior Lighting", "Controllers", "Application SW"] },
  { id: "cockpit", name: "Infotainment & Cockpit", subs: ["Hardware", "SW", "System Integrator"] },
  { id: "interior", name: "Interior Systems", subs: ["Seating", "Vehicle Access", "Occupant Monitoring", "Air Purity", "Ambient Smell", "Automated Access"] },
  { id: "suspension", name: "Active Suspension", subs: ["Active & Semi-Active", "Control Units", "Control Algorithms", "Cross-Domain Function"] },
  { id: "connectivity", name: "Connectivity, Cloud, Cyber, Data, Arch.", subs: ["Connectivity", "Cloud", "Cyber Security", "Data Management", "Architectures"] },
  { id: "eca", name: "Electronic Control Architectures", subs: ["Edge Compute", "Distributed Compute", "AI Compute", "Semiconductor Tech", "Comm. Tech", "Vehicle as Sensor"] },
  { id: "software", name: "Software", subs: ["Interoperable Functions", "Comm. Technologies", "Middleware/OS", "AI/ML", "Simulations", "Digital Twin", "WASM"] },
  { id: "manufacturing", name: "Manufacturing", subs: ["EMS", "Contract Mfg (MaaS)", "Industry 5.0", "Dark Factories"] },
  { id: "energy", name: "Energy", subs: ["V2G & Charging", "Battery & BMS", "New Energy Tech"] },
  { id: "fintech", name: "Fintech", subs: ["In-Vehicle Payment", "Insurance", "Vehicle Aadhar", "Vehicle Monetization"] },
  { id: "infrastructure", name: "Infrastructure", subs: ["V2X", "Urban Traffic Mgmt", "Tolling & Parking", "Map Services", "Intermodal"] },
  { id: "sustainability", name: "Sustainability", subs: ["Battery 2nd Life & Recycling", "Carbon Credits", "Right to Repair", "Residual Value"] },
  { id: "evtol", name: "EVTOL", subs: ["Urban Air Mobility", "Rural Applications"] },
  { id: "robotics", name: "Robotics", subs: ["AMR", "Campus Shuttles", "Humanoids", "Robotics × SDV"] },
  { id: "defence", name: "Defence", subs: ["Contract Manufacturing", "Component Sales"] },
  { id: "health", name: "Health Care", subs: ["E-Call", "Assisted Motion", "DEI Mobility Design"] },
];

/* ════════════════════════ SCORING — fixed for every field ═══════════════ */
const WEIGHTS = [
  { id: "competency", c: "Competency fit", f: "Competency Analysis", w: 0.25 },
  { id: "swot", c: "SWOT net position", f: "SWOT (Bosch-India)", w: 0.15 },
  { id: "market", c: "Market size & growth", f: "TAM / SAM", w: 0.20 },
  { id: "porter", c: "Attractiveness", f: "Porter's 5 Forces", w: 0.20 },
  { id: "horizons", c: "Tech growth potential", f: "McKinsey 3 Horizons", w: 0.20 },
];
const BANDS = [
  { v: "ENTER", min: 7.5, m: "Strong right to play and right to win. Build or buy now." },
  { v: "EXPLORE", min: 6.0, m: "Attractive but gaps exist. Enter via partnership, pilot or M&A." },
  { v: "WATCH", min: 4.5, m: "Monitor triggers; revisit in 6–12 months." },
  { v: "NO-GO", min: 0, m: "Weak attractiveness or weak right to play today." },
];
const RUBRIC = [
  { range: "0.90 – 1.00", m: "Multiple independent, recent (<18 mo) cited sources agree" },
  { range: "0.70 – 0.89", m: "Cited evidence exists but partial, single-source or older" },
  { range: "0.50 – 0.69", m: "Sources conflict / thin coverage; material judgement applied" },
  { range: "< 0.50", m: "Mostly reasoned estimates — flagged as low-evidence" },
];

/* The matrix is COMPUTED here, live, from criterion scores + confidence —
   exactly the same code path the production backend uses. */
function computeMatrix(rows) {
  const out = rows.map(r => {
    const effW = r.w * Math.max(r.conf, 0.2);
    return { ...r, effW, contrib: r.s * effW };
  });
  const sumEffW = out.reduce((a, r) => a + r.effW, 0);
  const sumContrib = out.reduce((a, r) => a + r.contrib, 0);
  const score = sumContrib / sumEffW;
  const verdict = BANDS.find(b => score >= b.min);
  const confidence = out.reduce((a, r) => a + r.conf * r.w, 0) / out.reduce((a, r) => a + r.w, 0);
  return { rows: out, sumEffW, sumContrib, score, verdict, confidence };
}

/* ════════════════════ Mock deep-dive: ENERGY (illustrative) ══════════════ */
const ENERGY = {
  ma: ["Thermal Mgmt", "Alternate Fuels", "Charging Solutions", "Battery (PS-ESB)", "Power Electronics", "ME-SiCs GaN"],
  bbm: ["GenAI Products & Services", "SW System for SdV", "Future Vehicle System for SdV", "SW & Services for OEMs", "Workshop Services & Fleet"],

  criterionScores: [
    { ...WEIGHTS[0], s: 7.2, conf: 0.86, why: "Strong in power electronics & service network; one structural gap (cell chemistry) addressable via partner/buy — see Competency tab." },
    { ...WEIGHTS[1], s: 6.8, conf: 0.81, why: "Three exploitable Bosch-India strengths vs two structural weaknesses; threats are real but counterable — see SWOT tab." },
    { ...WEIGHTS[2], s: 8.4, conf: 0.74, why: "Large, fast-growing market (28% CAGR) but sizing relies on forecasts → score high, confidence moderate — see Market tab." },
    { ...WEIGHTS[3], s: 6.5, conf: 0.83, why: "High rivalry & new-entrant pressure offset by weak substitutes → moderately attractive — see Attractiveness tab." },
    { ...WEIGHTS[4], s: 8.8, conf: 0.88, why: "Dense, evidenced pipeline across all three horizons with clear India triggers — see 3 Horizons tab." },
  ],

  pestel: {
    Political: [
      {
        p: "PM E-DRIVE (₹10,900 Cr, 2024–26) subsidises e-2W/3W demand and funds public charging capex",
        why: "Notified central scheme with explicit allocations for demand incentives and charging stations on highways/cities — it directly pulls forward EV volumes and charging-infrastructure orders [1]",
        sowhat: "Time market entry to the scheme window; charging capex creates a B2G/B2B opening for Bosch charging-management software, not just hardware",
        i: "high", c: [1],
      },
      {
        p: "PLI-ACC (50 GWh) plus state EV policies drive localisation of the battery value chain",
        why: "PLI disbursements are tied to domestic value addition; states (TN, Maharashtra, UP) layer fleet-electrification mandates and capital subsidies on top [2]",
        sowhat: "Cell making will localise around a few winners — partnering early with ACC awardees positions Bosch as the pack/BMS integrator of choice",
        i: "high", c: [2],
      },
    ],
    Economic: [
      {
        p: "India's EV growth is 2W/3W-led; electric 2W penetration has crossed double digits and is rising",
        why: "Vahan registration data shows 2W dominates EV unit volumes; PV EV share remains low single digits — the volume economics of this field are scooter economics [3]",
        sowhat: "India-cost engineering is decisive: a BMS bill-of-materials tuned for ₹1L scooters, not €40k cars. Premium EU cost bases are a structural handicap here",
        i: "high", c: [3],
      },
      {
        p: "Falling cell prices (~$100/kWh territory) compress pack-hardware margins",
        why: "Global LFP oversupply plus PLI capacity coming online keeps pushing pack prices down; hardware-only suppliers face margin erosion [4]",
        sowhat: "Value migrates to software & services — BMS intelligence, battery health, V2G orchestration. This matches Bosch's mapped BBM streams (SW for OEMs, Workshop & Fleet)",
        i: "medium", c: [4],
      },
    ],
    Social: [
      {
        p: "Charging & range anxiety remains the #1 adoption barrier outside metros",
        why: "Consumer surveys consistently rank charging access above price in tier-2/3 purchase hesitation; public charger density drops sharply beyond the top 20 cities [5]",
        sowhat: "Battery-health transparency and accurate range prediction are willingness-to-pay features; Bosch's 10,000+ workshop network is a trust channel competitors lack",
        i: "medium", c: [5],
      },
      {
        p: "Gig & fleet electrification (3W logistics, e-rickshaw, last-mile) is the real adoption engine",
        why: "TCO-driven commercial buyers electrify fastest — e-3W is already majority-electric in several states; fleets buy on uptime and per-km cost, not badge [6]",
        sowhat: "Bundle fleet telematics + battery analytics + depot-charging orchestration; fleets are also the natural V2G aggregation point",
        i: "high", c: [6],
      },
    ],
    Technological: [
      {
        p: "LFP dominates Indian packs; sodium-ion pilots are starting for entry segments",
        why: "LFP suits Indian heat and cost constraints; Na-ion's raw-material independence makes it strategically attractive for India despite lower energy density [7]",
        sowhat: "A chemistry-agnostic BMS platform (LFP today, Na-ion ready) is a genuine differentiator versus single-chemistry startups",
        i: "high", c: [7],
      },
      {
        p: "Smart-charging / V2G standards (ISO 15118, OCPP 2.x) are maturing, with discom pilots live",
        why: "Standardisation collapses the integration cost that previously made V2G uneconomic; Delhi/Mumbai discom pilots prove regulatory willingness [8]",
        sowhat: "Bosch charging-management SW can ride open standards instead of bespoke per-discom integrations — faster scale-out, lower NRE",
        i: "medium", c: [8],
      },
    ],
    Environmental: [
      {
        p: "Battery Waste Management Rules (EPR) put recycling obligations on pack makers & OEMs",
        why: "MoEFCC rules mandate Extended Producer Responsibility with audited collection/recycling targets — compliance is now a cost line for every pack sold [9]",
        sowhat: "Creates a paid second-life/recycling services market — the entry point for the mapped Circular Economy / Workshop streams",
        i: "medium", c: [9],
      },
      {
        p: "Renewable targets make solar-paired charging and V2G valuable to discoms",
        why: "Midday solar surplus + evening peak is exactly the arbitrage EV batteries can serve; discoms need flexible load more each year [10]",
        sowhat: "Position charging-management as a grid-services platform, opening discom revenue beyond automotive customers",
        i: "medium", c: [10],
      },
    ],
    Legal: [
      {
        p: "AIS-156 amendments raised battery safety norms after fire incidents",
        why: "Mandatory cell-level protections, thermal-propagation tests and audit trails significantly raise the engineering bar for certification [11]",
        sowhat: "Advantage proven Tier-1 safety credentials — Bosch's functional-safety pedigree becomes a sales argument, and a barrier against low-cost entrants",
        i: "high", c: [11],
      },
      {
        p: "DPDP Act 2023 governs telematics & battery-cloud data",
        why: "Consent, purpose-limitation and breach duties apply to connected-battery services; enforcement architecture is now operational [12]",
        sowhat: "Battery cloud must be India-hosted with consent flows by design — a compliance moat for organised players over informal ones",
        i: "medium", c: [12],
      },
    ],
  },

  swot: {
    S: [
      { p: "PS-ESB battery line + power-electronics portfolio already mapped to this field", why: "Existing engineering, supplier base and manufacturing assets mean entry reuses sunk capability instead of greenfield build — months, not years, to first product", sowhat: "Lead the Battery & BMS sub-field directly; price the speed advantage" },
      { p: "Bengaluru software organisation + SdV stack", why: "BMS algorithms, OTA update pipeline and cloud telematics already exist in the SdV stack, staffed by thousands of India-cost engineers", sowhat: "Differentiate on software (health analytics, predictive thermal mgmt) where hardware-only rivals can't follow" },
      { p: "10,000+ Bosch car-service workshops across India", why: "No competitor has a comparable physical network for battery health checks, certified repairs, retrofits and warranty handling", sowhat: "Build a service-revenue moat (battery-health-as-a-service) that is structurally hard to copy" },
    ],
    W: [
      { p: "No cell manufacturing", why: "Chemistry-level innovation and cost control sit with cell makers; Bosch is a system integrator one layer up", sowhat: "Don't compete on cells — lock in partnerships with ACC-PLI winners; treat cell supply as a managed dependency" },
      { p: "Premium cost structure vs Indian BMS startups", why: "EU-derived platforms carry ~25–30% cost disadvantage in the 2W segment where most Indian volume sits", sowhat: "Needs a dedicated India-cost product line or a startup acquisition — flagged in the entry-mode recommendation" },
    ],
    O: [
      { p: "PLI-ACC awardees need proven pack/BMS partners", why: "Awardees are strong on cells but thin on pack integration, functional safety and field quality — exactly Bosch's strengths", sowhat: "Offer pack/BMS integration partnerships now, before Chinese Tier-1s lock these relationships" },
      { p: "Fleet electrification needs charging-management software", why: "3W/LCV logistics fleets are the earliest TCO adopters and need depot-charging orchestration, load management and battery analytics", sowhat: "Pilot with 2–3 fleets; monetise via the mapped Workshop Services & Fleet BBM stream" },
    ],
    T: [
      { p: "Top Indian OEMs are in-housing BMS", why: "Leading 2W OEMs are building internal BMS teams to control cost and own battery data — shrinking the merchant market", sowhat: "Counter with superior safety certification and faster update cadence; target OEMs below the top tier plus fleets" },
      { p: "Chinese pack/BMS imports 25–30% cheaper", why: "Scale and vertical integration give Chinese suppliers a durable cost edge; entry via JV routes continues", sowhat: "Defend with localisation, AIS-156 safety positioning and service bundling; monitor BIS/import-policy shifts" },
    ],
    strategy: "Lead with Battery & BMS (reuse PS-ESB + workshops + SdV software), partner into V2G/charging management with fleets and discoms, watch new-energy tech via ventures.",
    scoreRationale: "Score 6.8: three exploitable, hard-to-copy strengths (assets, software, channel) and two well-matched opportunities outweigh two structural weaknesses — but the weaknesses (cost base, no cells) directly amplify both threats, capping the score below 7.5.",
  },

  market: {
    tam: 8200, sam: 2400, cagr: 28, year: 2030,
    derivation: [
      { step: "India EV sales forecast 2030", value: "~10M 2W · 1.1M 3W · 1.3M PV · 0.1M CV (units/yr)", src: "NITI Aayog / industry forecasts [13]" },
      { step: "× battery, BMS, power-electronics & charging content per vehicle", value: "2W ~$280 · 3W ~$420 · PV ~$2,100 · CV ~$6,500 (field-relevant content)", src: "Teardown benchmarks; estimate [14]" },
      { step: "+ public/fleet charging infra & energy-mgmt SW spend", value: "~$1.4B/yr by 2030", src: "Charger rollout plans × unit economics; estimate [15]" },
      { step: "= TAM (field-relevant India spend, 2030)", value: "$8.2B", src: "Derived — estimate" },
      { step: "Serviceable filter: merchant market only (excl. OEM in-house & cell value), Bosch-addressable product lines", value: "≈29% of TAM", src: "In-housing share analysis; estimate [16]" },
      { step: "= SAM (2030)", value: "$2.4B", src: "Derived — estimate" },
    ],
    crossCheck: "Sanity check: two analyst reports place India EV components (ex-cell) at $7–9B by 2030 — our $8.2B TAM sits inside that corridor [13][16]. CAGR 28% (2025–30) is consistent with EV unit CAGR ~32% damped by per-unit price erosion.",
    customers: [
      { s: "Indian OEMs (2W/3W/PV)", buy: "Merchant BMS, power electronics, thermal mgmt", note: "Top-tier 2W OEMs partially in-housing — target tier-2 OEMs & new platforms" },
      { s: "Fleet operators & logistics", buy: "Depot charging orchestration, battery analytics, uptime contracts", note: "Earliest TCO-driven adopters; V2G aggregation point" },
      { s: "CPOs & discoms", buy: "Charging management SW, load/V2G services", note: "PM E-DRIVE charging capex is the demand trigger" },
      { s: "Battery makers (ACC PLI)", buy: "Pack integration, BMS licensing, functional safety", note: "Strong on cells, weak on system integration" },
    ],
    scoreRationale: "Score 8.4: TAM >$8B with 28% CAGR clears the 'Bosch-scale business' bar comfortably; deduction for in-housing risk shrinking the merchant SAM. Confidence 0.74 (not higher) because the sizing chain rests on 2030 forecasts and two derived estimates — per the rubric, partial cited evidence.",
  },

  porter: [
    {
      force: "Rivalry", v: 7.5,
      why: "15+ funded Indian BMS/charging startups, global Tier-1s localising, and OEM purchasing running price-led RFQs. Intensity is high (7.5, not 9) because the market is still growing fast enough that players are not yet fighting for a fixed pie.",
      drivers: ["Crowded startup field (Ion Energy-type players, charging-SW vendors)", "Global Tier-1s setting up India lines", "Price-led OEM procurement"], c: [17],
    },
    {
      force: "Supplier power", v: 6.0,
      why: "Cells and power semiconductors (LFP, MCUs, SiC) are concentrated with few suppliers — but PLI cell capacity and multi-sourcing are easing the squeeze. Moderate 6.0, trending down.",
      drivers: ["Cell supply concentration (China-centric today)", "SiC/MCU allocation cycles", "PLI capacity coming online (easing)"], c: [2],
    },
    {
      force: "Buyer power", v: 7.0,
      why: "Top-4 2W OEMs control ~80% of volume and hold a credible in-housing threat — the strongest negotiation lever a buyer can have. Fleets and tier-2 OEMs are more fragmented, which keeps this at 7.0 rather than higher.",
      drivers: ["2W OEM concentration", "Credible in-housing alternative", "Fleet buyers fragmented (offsetting)"], c: [18],
    },
    {
      force: "Substitutes", v: 4.0,
      why: "Battery swapping changes the form factor but still requires BMS, charging orchestration and health analytics — it shifts where the product sits, not whether it's needed. No functional substitute exists, hence low pressure.",
      drivers: ["Swapping = different deployment, same function", "No non-battery substitute for the use case"], c: [19],
    },
    {
      force: "New entrants", v: 8.0,
      why: "Charging software has low capital barriers, VC funding is active, and Chinese hardware enters via JV routes. AIS-156 certification is the only meaningful barrier — and it protects safety-credentialed incumbents like Bosch more than it blocks software entrants.",
      drivers: ["Low capex for charging SW", "Active VC funding", "Chinese JV entry route", "AIS-156 as partial barrier"], c: [17],
    },
  ],
  porterRationale: "Attractiveness 6.5 = 10 − weighted hostile pressure. Dominant pressures: new entrants (8.0) and rivalry (7.5); strong offset from near-absent substitutes (4.0). Field is structurally investable for players with certification moats and channel — i.e. attractive specifically for Bosch's profile.",

  competency: [
    { name: "Power electronics", bosch: 9, req: 8, whyReq: "DC fast charging and traction electronics demand high-efficiency, high-reliability designs (8)", whyBosch: "Global leader in inverters/DC-DC with India manufacturing and engineering already in place (9)", gap: "none — exceed", gapWhy: "Exceeds requirement; use as anchor credential" },
    { name: "BMS algorithms", bosch: 8, req: 9, whyReq: "Indian duty cycles (heat, vibration, 2W usage) plus AIS-156 demand best-in-class SoX estimation & safety logic (9)", whyBosch: "Strong core algorithm IP from global programs (8); gap is tuning for low-cost LFP/Na-ion 2W chemistries", gap: "build", gapWhy: "Close internally via Bengaluru SW org — capability exists, needs India dataset" },
    { name: "Cell chemistry", bosch: 3, req: 8, whyReq: "Pack cost & performance leadership increasingly decided at chemistry level (8)", whyBosch: "No production-scale cell R&D or manufacturing — structural, deliberate portfolio choice (3)", gap: "partner / buy", gapWhy: "Cheaper and faster to partner with ACC-PLI winners than to build; do not compete on cells" },
    { name: "Charging SW / cloud", bosch: 7, req: 8, whyReq: "OCPP 2.x, ISO 15118, discom integrations and fleet depot orchestration needed to win charging-management deals (8)", whyBosch: "Charging-management prototypes and SdV cloud exist (7); missing India-specific discom/CPO integrations", gap: "build", gapWhy: "6–9 month integration roadmap; ride open standards" },
    { name: "India cost engineering", bosch: 6, req: 9, whyReq: "2W-led volume means winning BOMs are designed-to-cost for ₹1L vehicles (9)", whyBosch: "Strong local R&D, but platform cost base is EU-derived — ~25–30% adrift in 2W segment (6)", gap: "build / buy", gapWhy: "Dedicated India-cost line, or acquire an Indian BMS startup to leapfrog — biggest single gap driving the 7.2 score" },
    { name: "Service network", bosch: 9, req: 6, whyReq: "Battery services need physical touchpoints, but requirement is moderate as OEM networks also exist (6)", whyBosch: "10,000+ workshops nationwide — unmatched (9)", gap: "none — exceed", gapWhy: "Over-serves the requirement → convert surplus into a differentiating service offer" },
  ],
  competencyRationale: "Score 7.2: four of six competencies at or above requirement, two of those exceeding it (power electronics, service network). The score is pulled down by one structural gap (cell chemistry, −3 vs requirement but mitigated by clear partner route) and one execution gap (India cost engineering, −3, the genuinely hard one). Confidence 0.86: competency levels are verifiable against Bosch's own footprint — high-evidence per the rubric.",

  horizons: {
    h1: [
      { item: "BMS for 2W/3W packs", why: "Revenue-ready now: volumes exist today, AIS-156 compliance is an immediate purchase driver, and Bosch assets (PS-ESB, algorithms) need no new science" },
      { item: "DC fast-charging power modules", why: "PM E-DRIVE charging capex is being spent now; Bosch power electronics slot directly into charger OEM supply chains" },
    ],
    h2: [
      { item: "V2G pilots with discoms", why: "Standards (ISO 15118, OCPP 2.x) and discom pilots exist, but tariff/compensation rules aren't production-grade yet — classic 2–5 year build", trigger: "State regulators issuing V2G compensation tariff orders" },
      { item: "Battery-health-as-a-service via workshops", why: "Needs a used-EV market large enough to pay for certified health reports; channel (workshops) is ready before the demand is", trigger: "Used-EV transactions crossing ~0.5M units/year" },
    ],
    h3: [
      { item: "Sodium-ion-ready BMS platforms", why: "Na-ion is in pilot production; mass adoption in entry 2W depends on cost parity and cycle-life proof — 5+ years in India", trigger: "Na-ion reaching LFP cost parity for entry-segment packs" },
      { item: "P2P energy trading on DPI rails", why: "Technically demonstrable today, but requires energy-market deregulation and Beckn-style open energy protocols at production scale", trigger: "Discom adoption of open digital-energy-grid protocols beyond sandbox" },
    ],
    rationale: "Score 8.8: dense pipeline in ALL three horizons (rare — most fields are H1-heavy or H3-speculative), each H2/H3 item has a concrete, observable India trigger, and H1 items monetise existing Bosch assets immediately. Confidence 0.88: horizon placement is corroborated by cited policy and standards milestones.",
  },

  verdict: {
    entry: "Build on PS-ESB battery + power electronics; partner for charging networks and cells; M&A screen on Indian BMS/charging-SW startups to close the cost-engineering gap.",
    reasoning: [
      "Tech growth (8.8 × w0.20) and market (8.4 × w0.20) are the two largest contributions to the weighted score — see the matrix working below [13][17]",
      "Competency 7.2 carries the highest weight (0.25): strong where it matters (power electronics, channel), with both gaps having named closure routes (partner for cells, build/buy for India cost)",
      "Porter 6.5 is the limiting criterion — new-entrant pressure is the risk to monitor; the AIS-156 certification moat is the counter",
      "Mapped BBM streams (Workshop Services & Fleet, SW for OEMs) give two ready go-to-market motions, raising execution confidence",
    ],
    portfolio: [
      { sub: "Battery & BMS", play: "LEAD", why: "Direct reuse of PS-ESB + BMS software; largest SAM slice; competency fit strongest here" },
      { sub: "V2G & Charging", play: "PARTNER", why: "Needs discom/CPO/fleet alliances Bosch doesn't own; Bosch brings the charging-mgmt software layer" },
      { sub: "New Energy Tech", play: "WATCH", why: "Biogas/solar adjacency — mobility pull not yet evidenced; venture-watch with defined triggers" },
    ],
    risks: ["In-housing of BMS by top Indian 2W OEMs (shrinks merchant SAM)", "Cell price volatility compressing pack margins", "Chinese JV entrants under-pricing before localisation matures"],
  },

  activity: [
    { d: "Jun 08, 2026", t: "Major Indian 2W OEM announces in-house BMS for next-gen scooter platform", s: "ET Auto" },
    { d: "Jun 05, 2026", t: "PM E-DRIVE phase update adds incentives for fast-charging corridors on NH network", s: "Mint" },
    { d: "May 28, 2026", t: "ACC PLI awardee starts LFP cell line trial production in Gujarat", s: "Business Standard" },
    { d: "May 21, 2026", t: "Discom pilot for V2G with 3W fleet operator goes live in Delhi NCR", s: "Mercom India" },
    { d: "May 14, 2026", t: "Battery Waste Mgmt Rules enforcement drive targets EPR compliance of pack makers", s: "Economic Times" },
  ],
  sources: [
    "PIB — PM E-DRIVE scheme notification", "PLI-ACC programme & state EV policies", "Vahan EV registration dashboard",
    "Cell price index trackers", "EV consumer adoption surveys (2026)", "e-3W market penetration data",
    "Cell chemistry roadmap briefings", "ISO 15118 / OCPP discom pilot reports", "Battery Waste Management Rules, MoEFCC",
    "CEA renewable integration reports", "AIS-156 amendment circulars", "DPDP Act 2023 & rules",
    "NITI Aayog EV forecasts", "Component teardown benchmarks", "Charger rollout economics",
    "Analyst reports, India EV components", "Startup funding trackers (BMS/charging)", "2W OEM market-share data", "Battery swapping market studies",
  ],
};

/* ════════════════════════════ UI atoms ═══════════════════════════════════ */
const Chip = ({ children, tone = "slate" }) => {
  const tones = {
    slate: "bg-slate-100 text-slate-700", red: "bg-red-50 text-red-700",
    teal: "bg-teal-50 text-teal-700", violet: "bg-purple-50 text-purple-700",
    green: "bg-green-50 text-green-700", amber: "bg-amber-50 text-amber-800",
  };
  return <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${tones[tone]}`}>{children}</span>;
};

const Card = ({ title, children, right }) => (
  <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
    <div className="flex items-center justify-between px-4 pt-3 pb-2 border-b border-slate-100 gap-2">
      <h3 className="text-sm font-semibold text-slate-800">{title}</h3>{right}
    </div>
    <div className="p-4">{children}</div>
  </div>
);

/* Why/So-what block used across all framework tabs */
const Reasoned = ({ point, why, sowhat, cites, tag }) => (
  <div className="border border-slate-200 rounded-lg p-3 mb-2 last:mb-0">
    <div className="flex items-start gap-2">
      {tag}
      <div className="text-sm font-medium flex-1">{point}{cites?.length ? <span className="text-slate-400 text-xs font-normal"> [{cites.join(",")}]</span> : null}</div>
    </div>
    {why && <div className="text-xs text-slate-600 mt-1.5 flex gap-1.5"><span className="font-bold text-teal-700 shrink-0">WHY</span><span>{why}</span></div>}
    {sowhat && <div className="text-xs text-slate-600 mt-1 flex gap-1.5"><span className="font-bold text-purple-700 shrink-0">SO WHAT</span><span>{sowhat}</span></div>}
  </div>
);

const Gauge = ({ score, label }) => {
  const pct = Math.max(0, Math.min(1, score / 10));
  return (
    <div className="relative w-48 mx-auto">
      <svg viewBox="0 0 200 110" className="w-full">
        <defs>
          <linearGradient id="sg" x1="0" x2="1">
            <stop offset="0%" stopColor="#7A1FA2" /><stop offset="38%" stopColor="#E20015" />
            <stop offset="72%" stopColor="#0096A0" /><stop offset="100%" stopColor="#5BAA32" />
          </linearGradient>
        </defs>
        <path d="M15 100 A85 85 0 0 1 185 100" fill="none" stroke="#E8ECF2" strokeWidth="14" strokeLinecap="round" />
        <path d="M15 100 A85 85 0 0 1 185 100" fill="none" stroke="url(#sg)" strokeWidth="14"
          strokeLinecap="round" strokeDasharray={`${pct * 267} 267`} />
        <g transform={`rotate(${-90 + pct * 180} 100 100)`}>
          <line x1="100" y1="100" x2="100" y2="32" stroke={INK} strokeWidth="3" strokeLinecap="round" />
          <circle cx="100" cy="100" r="6" fill={INK} />
        </g>
      </svg>
      <div className="text-center -mt-3">
        <div className="text-3xl font-bold">{score.toFixed(2)}<span className="text-base text-slate-400 font-medium">/10</span></div>
        <div className="text-xs uppercase tracking-widest font-bold mt-0.5"
          style={{ background: GRAD, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>{label}</div>
      </div>
    </div>
  );
};

/* Methodology — identical for every field; shown both as a tab and inline */
const Methodology = ({ compact }) => (
  <div className={compact ? "" : "max-w-3xl"}>
    {!compact && (
      <p className="text-sm text-slate-600 mb-4">
        The pipeline, formula, weights and confidence rubric below are <b>fixed and identical for every
          search field and sub-field</b>. Only the inputs (web evidence, playbook passages, Bosch mapping)
        change — never the method. Scores and the verdict are <b>computed in code</b>; the LLM writes
        reasoning and may adjust the final score by at most ±0.5 with a stated justification.
      </p>
    )}
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Card title="1 · Fixed analysis pipeline (every run)">
        <ol className="text-sm space-y-1.5 list-decimal list-inside text-slate-700">
          <li>Targeted web searches per framework (free sources, India-scoped)</li>
          <li>Playbook RAG — methodology passages injected into the prompt</li>
          <li>Grounded framework analysis → strict JSON with per-claim citations</li>
          <li>Each in-matrix framework returns <b>score (1–10)</b> + <b>confidence</b> per rubric</li>
          <li>Decision matrix computed → verdict band → LLM reasoning (clamped ±0.5)</li>
        </ol>
      </Card>
      <Card title="2 · Score formula (deterministic)">
        <div className="text-xs font-mono bg-slate-50 rounded-lg p-3 text-slate-700 leading-relaxed">
          eff_weight<sub>i</sub> = weight<sub>i</sub> × max(conf<sub>i</sub>, 0.2)<br />
          contribution<sub>i</sub> = score<sub>i</sub> × eff_weight<sub>i</sub><br />
          <b>weighted_score = Σ contribution / Σ eff_weight</b><br />
          verdict_confidence = Σ(conf<sub>i</sub> × weight<sub>i</sub>) / Σ weight<sub>i</sub>
        </div>
        <p className="text-xs text-slate-500 mt-2">Low-confidence criteria automatically count less. The LLM never sets the score or the confidence — both are arithmetic over the criterion outputs.</p>
      </Card>
      <Card title="3 · Criterion weights (config, same for all fields)">
        <table className="w-full text-sm">
          <tbody>
            {WEIGHTS.map(w => (
              <tr key={w.id} className="border-t border-slate-100 first:border-0">
                <td className="py-1.5">{w.c}<div className="text-[10px] text-slate-400">{w.f}</div></td>
                <td className="text-right font-semibold">{w.w.toFixed(2)}</td>
              </tr>
            ))}
            <tr className="border-t-2 border-slate-200 font-bold"><td className="py-1.5">Total</td><td className="text-right">1.00</td></tr>
          </tbody>
        </table>
        <p className="text-xs text-slate-500 mt-2">Weights live in <code>criteria.json</code> — changing them is a governance decision, applied to all fields at once.</p>
      </Card>
      <Card title="4 · Confidence rubric (evidence quality, not enthusiasm)">
        <table className="w-full text-sm">
          <tbody>
            {RUBRIC.map(r => (
              <tr key={r.range} className="border-t border-slate-100 first:border-0">
                <td className="py-1.5 font-mono text-xs whitespace-nowrap pr-3">{r.range}</td>
                <td className="text-xs text-slate-600">{r.m}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
      <div className="md:col-span-2">
        <Card title="5 · Verdict bands (fixed thresholds on the weighted score)">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {BANDS.map(b => (
              <div key={b.v} className="border border-slate-200 rounded-lg p-3">
                <div className="font-bold text-sm">{b.v}</div>
                <div className="text-xs text-slate-400">score ≥ {b.min}</div>
                <div className="text-xs text-slate-600 mt-1">{b.m}</div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  </div>
);

const TABS = ["Recommendation", "PESTEL", "SWOT", "Market", "Attractiveness", "Competency", "3 Horizons", "Recent Activity", "Methodology"];

export default function App() {
  const [fieldId, setFieldId] = useState("energy");
  const [sub, setSub] = useState("All");
  const [tab, setTab] = useState("Recommendation");
  const [showWorking, setShowWorking] = useState(true);
  const field = FIELDS.find(f => f.id === fieldId);
  const hasData = fieldId === "energy";
  const d = ENERGY;
  const M = computeMatrix(d.criterionScores);

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#F7F8FA", fontFamily: "'Segoe UI', system-ui, sans-serif", color: INK }}>
      <div style={{ height: 4, background: GRAD }} />
      <header className="bg-white border-b border-slate-200 px-6 py-3 flex items-center gap-4">
        <div>
          <div className="font-extrabold tracking-tight text-lg leading-none">Search-Field Intelligence</div>
          <div className="text-xs text-slate-500 mt-0.5">Bosch Mobility · India Market · BBM Strategy Agent</div>
        </div>
        <div className="ml-auto flex items-center gap-2 text-xs text-slate-500">
          <span className="w-2 h-2 rounded-full bg-green-500 inline-block" /> One methodology for all 16 fields · scores computed, not generated · demo data
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <aside className="w-64 bg-white border-r border-slate-200 overflow-y-auto py-3 shrink-0">
          <div className="px-4 pb-2 text-[11px] font-bold uppercase tracking-widest text-slate-400">16 Search Fields</div>
          {FIELDS.map(f => (
            <button key={f.id} onClick={() => { setFieldId(f.id); setSub("All"); setTab("Recommendation"); }}
              className={`w-full text-left px-4 py-2 text-sm flex items-center justify-between border-l-2 transition-colors ${fieldId === f.id ? "border-red-600 bg-red-50/60 font-semibold" : "border-transparent hover:bg-slate-50"}`}>
              <span className="truncate pr-2">{f.name}</span>
              <span className="text-[10px] text-slate-400">{f.subs.length}</span>
            </button>
          ))}
        </aside>

        <main className="flex-1 overflow-y-auto p-6">
          <div className="mb-4">
            <h1 className="text-2xl font-extrabold tracking-tight">{field.name}</h1>
            {hasData && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {d.ma.map(m => <Chip key={m} tone="violet">M&A · {m}</Chip>)}
                {d.bbm.map(b => <Chip key={b} tone="teal">BBM · {b}</Chip>)}
              </div>
            )}
            <div className="flex flex-wrap gap-1.5 mt-3">
              {["All", ...field.subs].map(s => (
                <button key={s} onClick={() => setSub(s)}
                  className={`px-3 py-1 rounded-full text-xs font-medium border ${sub === s ? "bg-slate-900 text-white border-slate-900" : "bg-white border-slate-300 text-slate-600 hover:border-slate-400"}`}>
                  {s}
                </button>
              ))}
            </div>
            {sub !== "All" && <div className="mt-2 text-xs text-amber-700 bg-amber-50 inline-block px-2 py-1 rounded">Sub-field lens: <b>{sub}</b> — the verdict always rolls up to <b>{field.name}</b> as a whole.</div>}
          </div>

          {!hasData ? (
            <div className="bg-white border border-dashed border-slate-300 rounded-xl p-12 text-center">
              <div className="text-4xl mb-2">◌</div>
              <div className="font-semibold">No deep dive cached for {field.name}</div>
              <div className="text-sm text-slate-500 mt-1 mb-4">The agent will run the same fixed pipeline (10 grounded frameworks + sub-field roll-up, ~3–4 min).</div>
              <button className="px-4 py-2 rounded-lg text-white text-sm font-semibold" style={{ background: INK }}>Run deep dive</button>
              <div className="text-xs text-slate-400 mt-3">Demo build — only Energy is pre-populated. Methodology tab applies to every field.</div>
            </div>
          ) : (
            <>
              <div className="flex gap-1 border-b border-slate-200 mb-4 overflow-x-auto">
                {TABS.map(t => (
                  <button key={t} onClick={() => setTab(t)}
                    className={`px-3 py-2 text-sm whitespace-nowrap border-b-2 -mb-px font-medium ${tab === t ? "border-red-600 text-slate-900" : "border-transparent text-slate-500 hover:text-slate-800"}`}>
                    {t}
                  </button>
                ))}
              </div>

              {/* ─────────────── RECOMMENDATION ─────────────── */}
              {tab === "Recommendation" && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  <Card title="Right to Play — Verdict"
                    right={<Chip tone="green">confidence {(M.confidence * 100).toFixed(0)}% (computed)</Chip>}>
                    <Gauge score={M.score} label={M.verdict.v} />
                    <div className="text-xs text-slate-500 text-center mt-1">
                      = Σ contribution {M.sumContrib.toFixed(3)} ÷ Σ eff. weight {M.sumEffW.toFixed(4)} → band ≥ {M.verdict.min} = {M.verdict.v}
                    </div>
                    <p className="text-sm text-slate-600 mt-3">{d.verdict.entry}</p>
                  </Card>

                  <div className="lg:col-span-2">
                    <Card title="Decision Matrix — full working"
                      right={<button onClick={() => setShowWorking(!showWorking)} className="text-xs text-teal-700 font-medium hover:underline">{showWorking ? "hide math columns" : "show math columns"}</button>}>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead><tr className="text-left text-[11px] text-slate-400">
                            <th className="pb-2 pr-2">Criterion</th><th className="pb-2 pr-2">Weight</th>
                            <th className="pb-2 pr-2">Score</th><th className="pb-2 pr-2">Conf.</th>
                            {showWorking && <><th className="pb-2 pr-2">Eff. weight<div className="font-normal">w × max(c,0.2)</div></th>
                              <th className="pb-2">Contribution<div className="font-normal">score × eff. w</div></th></>}
                          </tr></thead>
                          <tbody>
                            {M.rows.map(r => (
                              <tr key={r.id} className="border-t border-slate-100 align-top">
                                <td className="py-2 pr-2">{r.c}<div className="text-[10px] text-slate-400">{r.f}</div>
                                  <div className="text-[11px] text-slate-500 mt-0.5 max-w-md">{r.why}</div></td>
                                <td className="py-2 pr-2">{r.w.toFixed(2)}</td>
                                <td className="py-2 pr-2 font-semibold">{r.s.toFixed(1)}</td>
                                <td className="py-2 pr-2 text-slate-500">{(r.conf * 100).toFixed(0)}%</td>
                                {showWorking && <><td className="py-2 pr-2 font-mono text-xs">{r.effW.toFixed(4)}</td>
                                  <td className="py-2 font-mono text-xs">{r.contrib.toFixed(4)}</td></>}
                              </tr>
                            ))}
                            <tr className="border-t-2 border-slate-300 font-bold">
                              <td className="py-2">Totals → weighted score</td><td>1.00</td>
                              <td className="text-red-700">{M.score.toFixed(2)}</td>
                              <td>{(M.confidence * 100).toFixed(0)}%</td>
                              {showWorking && <><td className="font-mono text-xs">{M.sumEffW.toFixed(4)}</td>
                                <td className="font-mono text-xs">{M.sumContrib.toFixed(4)}</td></>}
                            </tr>
                          </tbody>
                        </table>
                      </div>
                      <div className="text-xs text-slate-500 mt-2">
                        Same formula and weights for every search field (see Methodology tab). Each criterion score & confidence comes from its framework tab — click through to audit. LLM adjustment applied here: <b>0.00</b> (allowed range ±0.5, must be justified).
                      </div>
                    </Card>
                  </div>

                  <Card title="Reasoning (references the matrix & citations)">
                    <ul className="text-sm space-y-2">
                      {d.verdict.reasoning.map((r, i) => <li key={i} className="flex gap-2"><span className="text-teal-600">▸</span><span>{r}</span></li>)}
                    </ul>
                  </Card>
                  <Card title="Key risks to the verdict">
                    {d.verdict.risks.map(r => <div key={r} className="text-xs text-red-700 flex gap-2 mb-1.5"><span>⚠</span>{r}</div>)}
                  </Card>
                  <Card title="How confidence is derived">
                    <div className="text-xs font-mono bg-slate-50 rounded-lg p-3 text-slate-700">
                      Σ(conf × w) = {d.criterionScores.map(r => `${r.conf}×${r.w}`).join(" + ")}<br />
                      = {M.confidence.toFixed(3)} → <b>{(M.confidence * 100).toFixed(0)}%</b>
                    </div>
                    <p className="text-xs text-slate-500 mt-2">Weight-averaged evidence quality of the five criteria (rubric in Methodology tab). Never self-declared by the model.</p>
                  </Card>

                  <div className="lg:col-span-3">
                    <Card title="Where to Play — sub-field portfolio (rolls up to the field verdict)">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        {d.verdict.portfolio.map(p => (
                          <div key={p.sub} className="border border-slate-200 rounded-lg p-3">
                            <div className="flex items-center justify-between">
                              <div className="font-semibold text-sm">{p.sub}</div>
                              <Chip tone={p.play === "LEAD" ? "green" : p.play === "PARTNER" ? "teal" : "amber"}>{p.play}</Chip>
                            </div>
                            <p className="text-xs text-slate-600 mt-2">{p.why}</p>
                          </div>
                        ))}
                      </div>
                    </Card>
                  </div>
                </div>
              )}

              {/* ─────────────── PESTEL ─────────────── */}
              {tab === "PESTEL" && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {Object.entries(d.pestel).map(([k, pts]) => (
                    <Card key={k} title={k}>
                      {pts.map((x, i) => (
                        <Reasoned key={i} point={x.p} why={x.why} sowhat={x.sowhat} cites={x.c}
                          tag={<Chip tone={x.i === "high" ? "red" : x.i === "medium" ? "amber" : "slate"}>{x.i}</Chip>} />
                      ))}
                    </Card>
                  ))}
                </div>
              )}

              {/* ─────────────── SWOT ─────────────── */}
              {tab === "SWOT" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[["Strengths", d.swot.S, "green"], ["Weaknesses", d.swot.W, "red"], ["Opportunities", d.swot.O, "teal"], ["Threats", d.swot.T, "amber"]].map(([t, items, tone]) => (
                    <Card key={t} title={`${t} — Bosch Mobility India`}>
                      {items.map((x, i) => (
                        <Reasoned key={i} point={x.p} why={x.why} sowhat={x.sowhat}
                          tag={<Chip tone={tone}>{t[0]}</Chip>} />
                      ))}
                    </Card>
                  ))}
                  <div className="md:col-span-2">
                    <Card title="Targeted strategy & how the SWOT score (6.8) was reached">
                      <p className="text-sm mb-2">{d.swot.strategy}</p>
                      <div className="text-xs text-slate-600 bg-slate-50 rounded-lg p-3"><b>Score rationale:</b> {d.swot.scoreRationale}</div>
                    </Card>
                  </div>
                </div>
              )}

              {/* ─────────────── MARKET ─────────────── */}
              {tab === "Market" && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <Card title={`TAM / SAM derivation — top-down, India, ${d.market.year} (illustrative)`}>
                    <table className="w-full text-xs">
                      <thead><tr className="text-left text-slate-400"><th className="pb-1">Step</th><th className="pb-1">Value</th><th className="pb-1">Source</th></tr></thead>
                      <tbody>
                        {d.market.derivation.map((s, i) => (
                          <tr key={i} className="border-t border-slate-100 align-top">
                            <td className="py-1.5 pr-2">{s.step}</td>
                            <td className="py-1.5 pr-2 font-medium">{s.value}</td>
                            <td className="py-1.5 text-slate-500">{s.src}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <div className="text-xs text-slate-600 bg-teal-50 rounded-lg p-3 mt-3"><b>Cross-check:</b> {d.market.crossCheck}</div>
                  </Card>
                  <div className="space-y-4">
                    <Card title="Result">
                      <ResponsiveContainer width="100%" height={170}>
                        <BarChart data={[{ n: "TAM", v: d.market.tam }, { n: "SAM", v: d.market.sam }]} layout="vertical" margin={{ left: 10, right: 50 }}>
                          <XAxis type="number" hide /><YAxis type="category" dataKey="n" width={50} />
                          <Tooltip formatter={v => `$${v}M`} />
                          <Bar dataKey="v" radius={[0, 6, 6, 0]}>
                            <Cell fill="#7A1FA2" /><Cell fill="#0096A0" />
                            <LabelList dataKey="v" position="right" formatter={v => `$${(v / 1000).toFixed(1)}B`} />
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                      <div className="text-sm">CAGR <b>{d.market.cagr}%</b> (2025–30) · every figure cited or explicitly marked <b>estimate</b></div>
                      <div className="text-xs text-slate-600 bg-slate-50 rounded-lg p-3 mt-2"><b>Score rationale (8.4):</b> {d.market.scoreRationale}</div>
                    </Card>
                    <Card title="Customer landscape — who buys what">
                      {d.market.customers.map(c => (
                        <div key={c.s} className="border border-slate-200 rounded-lg p-3 mb-2 last:mb-0">
                          <div className="text-sm font-semibold">{c.s}</div>
                          <div className="text-xs text-slate-600 mt-0.5"><b>Buys:</b> {c.buy}</div>
                          <div className="text-xs text-slate-500 mt-0.5">{c.note}</div>
                        </div>
                      ))}
                    </Card>
                  </div>
                </div>
              )}

              {/* ─────────────── ATTRACTIVENESS ─────────────── */}
              {tab === "Attractiveness" && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <Card title="Porter's Five Forces — pressure (10 = hostile)">
                    <ResponsiveContainer width="100%" height={300}>
                      <RadarChart data={d.porter} outerRadius="75%">
                        <PolarGrid stroke="#E2E8F0" />
                        <PolarAngleAxis dataKey="force" tick={{ fontSize: 12, fill: "#475569" }} />
                        <PolarRadiusAxis domain={[0, 10]} tick={false} axisLine={false} />
                        <Radar dataKey="v" stroke="#E20015" fill="#E20015" fillOpacity={0.18} strokeWidth={2} />
                      </RadarChart>
                    </ResponsiveContainer>
                    <div className="text-xs text-slate-600 bg-slate-50 rounded-lg p-3"><b>How 6.5 was derived:</b> {d.porterRationale}</div>
                  </Card>
                  <Card title="Why each force scores what it scores">
                    {d.porter.map(f => (
                      <div key={f.force} className="border border-slate-200 rounded-lg p-3 mb-2 last:mb-0">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-semibold">{f.force}</span>
                          <span className="text-sm font-bold">{f.v.toFixed(1)}<span className="text-slate-400 font-normal">/10</span></span>
                        </div>
                        <div className="h-1.5 bg-slate-100 rounded-full mt-1.5 mb-2"><div className="h-1.5 rounded-full" style={{ width: `${f.v * 10}%`, background: f.v >= 7 ? "#E20015" : f.v >= 5 ? "#D97706" : "#5BAA32" }} /></div>
                        <p className="text-xs text-slate-600">{f.why}</p>
                        <div className="flex flex-wrap gap-1 mt-2">{f.drivers.map(dr => <Chip key={dr}>{dr}</Chip>)}</div>
                      </div>
                    ))}
                  </Card>
                </div>
              )}

              {/* ─────────────── COMPETENCY ─────────────── */}
              {tab === "Competency" && (
                <div className="space-y-4">
                  <Card title="Bosch competency vs requirement to win in India">
                    <ResponsiveContainer width="100%" height={280}>
                      <BarChart data={d.competency} margin={{ left: 0, right: 10 }}>
                        <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} angle={-12} height={50} />
                        <YAxis domain={[0, 10]} width={24} />
                        <Tooltip />
                        <Bar dataKey="req" name="Required" fill="#CBD5E1" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="bosch" name="Bosch today" fill="#0096A0" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                    <div className="text-xs text-slate-600 bg-slate-50 rounded-lg p-3"><b>Score rationale (7.2):</b> {d.competencyRationale}</div>
                  </Card>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {d.competency.map(c => (
                      <div key={c.name} className="bg-white border border-slate-200 rounded-xl p-4">
                        <div className="flex items-center justify-between">
                          <div className="font-semibold text-sm">{c.name}</div>
                          <div className="text-xs"><span className="font-bold text-teal-700">{c.bosch}</span><span className="text-slate-400"> vs req </span><span className="font-bold">{c.req}</span></div>
                        </div>
                        <div className="text-xs text-slate-600 mt-2 flex gap-1.5"><span className="font-bold text-slate-500 shrink-0">REQ WHY</span><span>{c.whyReq}</span></div>
                        <div className="text-xs text-slate-600 mt-1 flex gap-1.5"><span className="font-bold text-teal-700 shrink-0">BOSCH WHY</span><span>{c.whyBosch}</span></div>
                        <div className="mt-2 flex items-start gap-2">
                          <Chip tone={c.gap.includes("none") ? "green" : c.gap.includes("partner") || c.gap.includes("buy") ? "violet" : "amber"}>{c.gap}</Chip>
                          <span className="text-xs text-slate-500">{c.gapWhy}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ─────────────── 3 HORIZONS ─────────────── */}
              {tab === "3 Horizons" && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {[["H1 · Core now", d.horizons.h1, "#5BAA32"], ["H2 · 2–5 years", d.horizons.h2, "#0096A0"], ["H3 · 5+ years", d.horizons.h3, "#7A1FA2"]].map(([t, items, col]) => (
                      <div key={t} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                        <div className="px-4 py-2 text-white text-sm font-bold" style={{ background: col }}>{t}</div>
                        <div className="p-4 space-y-3">
                          {items.map(x => (
                            <div key={x.item}>
                              <div className="text-sm font-medium flex gap-2"><span style={{ color: col }}>●</span>{x.item}</div>
                              <div className="text-xs text-slate-600 mt-1 ml-5"><b className="text-slate-500">WHY THIS HORIZON</b> {x.why}</div>
                              {x.trigger && <div className="text-xs mt-1 ml-5"><b style={{ color: col }}>TRIGGER →</b> <span className="text-slate-600">{x.trigger}</span></div>}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                  <Card title="How the 3-Horizons score (8.8) was reached">
                    <p className="text-xs text-slate-600">{d.horizons.rationale}</p>
                  </Card>
                </div>
              )}

              {/* ─────────────── RECENT ACTIVITY ─────────────── */}
              {tab === "Recent Activity" && (
                <Card title="Recent activity — Energy × India mobility (live feed in production: Google News RSS + GDELT)">
                  <div className="space-y-3">
                    {d.activity.map((a, i) => (
                      <div key={i} className="flex gap-3 items-start border-b border-slate-100 pb-3 last:border-0">
                        <div className="text-[11px] text-slate-400 w-24 shrink-0 pt-0.5">{a.d}</div>
                        <div>
                          <div className="text-sm font-medium">{a.t}</div>
                          <div className="text-xs text-slate-400">{a.s}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              )}

              {/* ─────────────── METHODOLOGY ─────────────── */}
              {tab === "Methodology" && <Methodology />}

              <div className="mt-6 text-[11px] text-slate-400">
                Sources (demo): {d.sources.map((s, i) => <span key={i} className="mr-3">[{i + 1}] {s}</span>)}
                <div className="mt-1">⚠ All figures in this demo are illustrative placeholders. The production agent cites live sources or labels values "estimate" — same methodology, real evidence.</div>
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}

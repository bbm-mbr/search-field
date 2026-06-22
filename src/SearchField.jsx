​import React, { useState } from "react";
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

/* ═══ Mock deep-dives — ALL 16 FIELDS (illustrative demo data) ═══ */
const DATA = {
  energy: {
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
},

  lighting: {
    ma: ["New"], bbm: ["SW System for SdV", "Future Vehicle System for SdV"],
    criterionScores: [
      { ...WEIGHTS[0], s: 5.4, conf: 0.84, why: "Strong in ECUs/SW and sensing, but no luminaire/optics franchise — the core hardware competency sits with lighting Tier-1s. See Competency tab." },
      { ...WEIGHTS[1], s: 5.8, conf: 0.80, why: "SW/controller strengths are real but the field is owned by entrenched lighting specialists with locked OEM platforms. See SWOT tab." },
      { ...WEIGHTS[2], s: 6.6, conf: 0.76, why: "Steady premiumisation-led growth (~9% CAGR) — sizeable but slower than software-centric fields. See Market tab." },
      { ...WEIGHTS[3], s: 5.6, conf: 0.82, why: "Entrenched incumbents, strong buyer power, platform lock-ins — a hard field to break into mid-cycle. See Attractiveness tab." },
      { ...WEIGHTS[4], s: 7.4, conf: 0.83, why: "Lighting is becoming software (adaptive, personalised, communicative) — the SW layer is where growth concentrates. See 3 Horizons tab." },
    ],
    pestel: {
      Political: [{ p: "BNCAP and road-safety programmes push advanced visibility features down-segment", why: "Star-rating competition makes OEMs adopt LED/adaptive lighting earlier than regulation forces them to; MoRTH continues tightening visibility/conspicuity norms [1]", sowhat: "Safety-led lighting features (auto high-beam, adaptive front light) become spec-sheet items — an opening for Bosch's camera-linked lighting control SW rather than the lamps themselves", i: "medium", c: [1] }],
      Economic: [{ p: "Premiumisation in PV & 125cc+ 2W pulls LED and ambient lighting into volume segments", why: "Mid-SUVs now ship ambient lighting and LED projectors as differentiators; 2W moved to full-LED after AHO norms; content per vehicle is rising steadily [2]", sowhat: "Value growth is in electronics + software content per lamp, not lamp units — favourable for an electronics/SW entrant, unfavourable for building an optics business", i: "high", c: [2] }],
      Social: [{ p: "Lighting is becoming a personalisation & brand-identity feature for Indian buyers", why: "Signature DRLs, welcome animations and ambient themes are now showroom talking points in the compact-SUV war [3]", sowhat: "Personalisation SW (themes, scenarios, app control) is a monetisable layer that matches the mapped 'Application SW' sub-field", i: "medium", c: [3] }],
      Technological: [{ p: "Matrix LED / pixel lighting needs camera-fusion and domain-controller integration", why: "Adaptive beam shaping is a perception + control problem: it consumes ADAS camera data and runs on zonal/domain ECUs — competencies outside classic lamp makers [4]", sowhat: "The control/SW layer of matrix lighting is a natural Bosch entry: it sits exactly where Bosch ADAS and SdV assets already are", i: "high", c: [4] }],
      Environmental: [{ p: "LED transition is complete-ish; energy efficiency now drives smart dimming & lifetime", why: "With LED penetration high, the efficiency frontier moves to intelligent control (auto-dimming, selective pixels) and serviceability [5]", sowhat: "Reinforces the software/controller thesis — the remaining efficiency gains are algorithmic", i: "low", c: [5] }],
      Legal: [{ p: "AIS lighting norms and homologation cycles favour established certification players", why: "Each lighting function needs type approval; incumbents have homologation muscle memory and test infrastructure [6]", sowhat: "Partner with a certified lamp maker rather than certifying luminaires from scratch — shapes the entry mode", i: "medium", c: [6] }],
    },
    swot: {
      S: [
        { p: "ADAS camera + SdV stack already produce the data adaptive lighting consumes", why: "Auto high-beam and matrix control are downstream consumers of Bosch's existing perception pipeline — no new sensing investment needed", sowhat: "Enter via the lighting-control/Application-SW layer where Bosch is strong, not the luminaire layer where it is absent" },
        { p: "Large India SW org can build personalisation/HMI lighting features at India cost", why: "Theme engines, app integration and OTA-updatable lighting scenarios are software products — Bengaluru can ship them", sowhat: "Offer 'lighting experience SW' to OEMs as part of cockpit/SdV deals already in motion" },
      ],
      W: [
        { p: "No optics, luminaire or photometrics franchise", why: "Bosch has never been a lamp Tier-1; optics design, thermal management of LEDs and photometric certification are absent competencies", sowhat: "Hardware entry would be build-from-zero against entrenched specialists — avoid; partner instead" },
        { p: "M&A mapping for this field is 'New' — no existing hooks", why: "Unlike other fields, there is no mapped partnership/M&A asset to accelerate entry", sowhat: "Any serious move needs a fresh partner/target screen first — adds 6–12 months to entry" },
      ],
      O: [
        { p: "Lighting Tier-1s lack SDV-grade software & cybersecurity depth", why: "As lighting joins the zonal architecture, lamp makers must integrate with domain controllers, OTA and security frameworks they don't own", sowhat: "Position Bosch as the SW/integration partner to lighting incumbents — complementary, not competitive" },
        { p: "BNCAP safety race pulls adaptive lighting into mass segments", why: "Safety-feature competition moves faster than regulation; adaptive beam tech will trickle to ₹10–15L cars", sowhat: "Volume opportunity for control ECUs + SW exactly when OEMs re-source platforms" },
      ],
      T: [
        { p: "Entrenched incumbents with locked multi-year platform awards", why: "Lumax, Uno Minda, Varroc, Fiem plus global JVs hold long-cycle OEM platform contracts; displacement mid-cycle is rare", sowhat: "Time entry to new platform RFQs (EV platforms especially); don't fight existing awards" },
        { p: "Lighting Tier-1s building their own electronics/SW teams", why: "Incumbents see the same software shift and are hiring; the partnership window narrows over time", sowhat: "Move within 12–18 months or the SW-partner slot gets filled" },
      ],
      strategy: "Do not build lamps. Enter the control & Application-SW layer (auto-dimming, matrix control, personalisation) on the back of existing ADAS/SdV assets, partnering with an incumbent lamp maker for optics and homologation.",
      scoreRationale: "Score 5.8: genuine, reusable SW strengths but both weaknesses are structural (no optics franchise, no M&A hooks) and the threats are timing-sensitive. Net position is workable only with a narrow, software-scoped entry.",
    },
    market: {
      tam: 3800, sam: 900, cagr: 9, year: 2030,
      derivation: [
        { step: "India automotive lighting market 2030 (all segments)", value: "$3.8B", src: "Industry reports triangulated [7]" },
        { step: "Electronics + software content share (controllers, drivers, SW)", value: "~32% and rising", src: "Teardown benchmarks; estimate [4]" },
        { step: "Serviceable filter: controller/SW layer + adaptive systems, Bosch-addressable", value: "≈24% of TAM", src: "Excludes luminaires/optics; estimate" },
        { step: "= SAM (2030)", value: "$0.9B", src: "Derived — estimate" },
      ],
      crossCheck: "Sanity check: content-per-vehicle (~$95 avg lighting, of which ~$30 electronics/SW) × ~30M vehicle production lands in the same corridor as the report-based TAM [2][7].",
      customers: [
        { s: "PV & 2W OEMs", buy: "Lighting control ECUs, adaptive-beam SW, personalisation features", note: "Buy at platform sourcing — time entry to new EV platforms" },
        { s: "Lighting Tier-1s", buy: "Domain integration, cybersecurity, OTA frameworks", note: "Partner channel — they need SDV plumbing" },
        { s: "Aftermarket", buy: "Retrofit & accessory lighting electronics", note: "Bosch retail network is a niche channel" },
      ],
      scoreRationale: "Score 6.6: a $3.8B field but only ~$0.9B is realistically Bosch-addressable and growth (9%) is GDP-plus, not exponential. Confidence 0.76: market reports agree on size, but the SW-share split is our estimate.",
    },
    porter: [
      { force: "Rivalry", v: 7.0, why: "Four strong Indian incumbents plus global JVs compete on locked platform awards; price pressure is constant but capacity discipline keeps it from being destructive.", drivers: ["Lumax/Minda/Varroc/Fiem + global JVs", "Platform-cycle competition", "Price-down clauses"], c: [8] },
      { force: "Supplier power", v: 5.0, why: "LED chips and drivers come from a broad Asian supply base; no chokepoint comparable to automotive SoCs.", drivers: ["Commoditised LED supply", "Multiple driver-IC vendors"], c: [8] },
      { force: "Buyer power", v: 7.5, why: "OEMs treat conventional lighting as a cost line with aggressive annual price-downs; only signature/adaptive lighting earns pricing power.", drivers: ["Cost-line procurement", "Dual-sourcing norms", "Premium features as the only escape"], c: [2] },
      { force: "Substitutes", v: 3.0, why: "No substitute for vehicle lighting; technology substitution (LED→pixel) happens within the field and rewards SW players.", drivers: ["Function is mandatory", "Tech shift favours electronics entrants"], c: [4] },
      { force: "New entrants", v: 5.5, why: "Optics + homologation are real barriers for lamp making, but the SW/controller layer (where Bosch would enter) has lower walls — cutting both ways.", drivers: ["Homologation barrier (HW)", "Low barrier in SW layer", "Chinese lamp imports limited by AIS"], c: [6] },
    ],
    porterRationale: "Attractiveness 5.6 = 10 − weighted hostile pressure. Buyer power (7.5) and rivalry (7.0) dominate; weak substitutes help. The field is more attractive for a SW-layer entrant than for a lamp maker — the score reflects the field as a whole.",
    competency: [
      { name: "Optics & photometrics", bosch: 2, req: 8, whyReq: "Beam shaping, glare control and homologation are core to any lamp product (8)", whyBosch: "No optics franchise — never been a lighting Tier-1 (2)", gap: "partner", gapWhy: "Partner with an incumbent lamp maker; do not build" },
      { name: "Lighting control ECUs & drivers", bosch: 7, req: 7, whyReq: "Matrix/pixel lighting needs automotive-grade controllers and LED drivers (7)", whyBosch: "Decades of ECU design, manufacturing in India, functional safety (7)", gap: "none — match", gapWhy: "Direct entry point — meets requirement today" },
      { name: "Camera-fusion / adaptive SW", bosch: 8, req: 8, whyReq: "Adaptive beams are perception-driven control loops (8)", whyBosch: "Bosch ADAS perception stack already produces the needed signals (8)", gap: "none — match", gapWhy: "Differentiating asset versus lamp incumbents" },
      { name: "Personalisation / HMI SW", bosch: 7, req: 6, whyReq: "Theme engines & app control are demanded in premium trims (6)", whyBosch: "Cockpit/SdV SW teams cover this with India-cost engineering (7)", gap: "none — exceed", gapWhy: "Bundle into cockpit offers" },
      { name: "OEM lighting relationships", bosch: 4, req: 8, whyReq: "Lighting is sourced through specialised commodity teams with incumbent trust (8)", whyBosch: "Bosch sells to these OEMs, but not in the lighting commodity — relationships must be built (4)", gap: "build / partner", gapWhy: "Ride a lamp-maker partnership into the sourcing room" },
    ],
    competencyRationale: "Score 5.4: matches or exceeds on the three electronics/SW competencies, but the two it lacks (optics, lighting-commodity relationships) are exactly the ones that decide lamp awards. Confidence 0.84: Bosch-side levels are verifiable; requirement levels from sourcing-practice evidence.",
    horizons: {
      h1: [{ item: "Lighting control ECUs + auto-dimming SW for current platforms", why: "Mature demand, certified components, immediate RFQ pipeline as LED penetration completes" }],
      h2: [
        { item: "Matrix/pixel beam control integrated with ADAS domain", why: "Premium adoption now, mass-segment in 2–5 years as BNCAP competition escalates", trigger: "Adaptive front-lighting appearing in sub-₹15L BNCAP 5-star contenders" },
        { item: "Personalisation & scenario lighting as OTA features", why: "Needs SdV electrical architectures to reach volume segments first", trigger: "Indian OEMs shipping zonal architectures in volume models" },
      ],
      h3: [{ item: "Communicative lighting (V2X signalling, projection)", why: "Standards and regulation for road-projection signalling don't exist in India yet — 5+ years", trigger: "AIS/UNECE rules permitting symbol projection on public roads" }],
      rationale: "Score 7.4: strong H2 density tied to observable BNCAP/SdV triggers; H1 is solid but commoditising; H3 is genuinely far. Growth is real but concentrated in the SW layer — consistent with the entry thesis.",
    },
    verdict: {
      entry: "Enter the control & Application-SW layer only, via partnership with an incumbent lamp maker (joint offers to OEM platforms); screen one partnership/JV target — the 'New' M&A mapping must be filled before committing.",
      reasoning: [
        "Tech growth (7.4) is the only criterion above 7 — the field's growth is concentrated exactly in the layer Bosch can serve, but the field as a whole scores moderate",
        "Competency 5.4 (heaviest weight) is the drag: the two missing competencies are award-deciding for lamps — hence partner-led entry, not build",
        "Porter 5.6 and SWOT 5.8 both flag incumbent lock-in and buyer power; market 6.6 is solid but not exceptional — together they cap the verdict below ENTER",
      ],
      portfolio: [
        { sub: "Application SW", play: "LEAD", why: "Personalisation/adaptive SW rides existing Bosch assets; clearest right to win" },
        { sub: "Controllers", play: "LEAD", why: "ECU/driver electronics meet requirement today; attach to SW offer" },
        { sub: "Exterior Lighting", play: "PARTNER", why: "Matrix systems jointly with a lamp maker — Bosch control, partner optics" },
        { sub: "Interior Lighting", play: "WATCH", why: "Ambient HW is commoditised; revisit if cockpit bundles demand it" },
      ],
      risks: ["Partnership window closes as lamp Tier-1s build SW in-house", "Lighting stays a cost-line commodity in mass segments, capping SW monetisation"],
    },
    activity: [
      { d: "Jun 04, 2026", t: "Compact-SUV launch makes adaptive LED matrix headlamps standard on top trims", s: "Autocar India" },
      { d: "May 27, 2026", t: "Indian lighting Tier-1 announces software engineering centre for pixel-lighting control", s: "ET Auto" },
      { d: "May 19, 2026", t: "BNCAP round results push two OEMs to announce auto high-beam across model lines", s: "Autocar Pro" },
      { d: "May 06, 2026", t: "2W maker ships app-controlled welcome-light personalisation via OTA", s: "Bike Dekho" },
    ],
    sources: ["MoRTH/BNCAP visibility norms", "Lighting content-per-vehicle benchmarks", "OEM feature marketing analysis", "Matrix LED architecture briefings", "LED efficiency studies", "AIS homologation requirements", "India lighting market reports", "Tier-1 annual reports & platform awards"],
  },

  cockpit: {
    ma: ["Video Perception", "AI Cockpit", "Strategic SoC"], bbm: ["SW System for SdV", "Future Vehicle System for SdV"],
    criterionScores: [
      { ...WEIGHTS[0], s: 8.0, conf: 0.88, why: "Cockpit HPC heritage + the largest automotive SW org in India; gap only at consumer-grade UX polish and SoC dependency. See Competency tab." },
      { ...WEIGHTS[1], s: 7.4, conf: 0.84, why: "Strengths (HPC, India SW, OEM trust) outweigh consumer-UX weakness; threats from consumer-electronics entrants are real but addressable. See SWOT tab." },
      { ...WEIGHTS[2], s: 7.8, conf: 0.76, why: "Screens & cockpit compute are the fastest-rising content line in Indian PVs; large SAM with 14% CAGR. See Market tab." },
      { ...WEIGHTS[3], s: 6.2, conf: 0.82, why: "Strong rivalry from consumer-electronics giants and Qualcomm's SoC leverage compress the field's attractiveness. See Attractiveness tab." },
      { ...WEIGHTS[4], s: 8.4, conf: 0.86, why: "AI cockpit, local-language voice and in-car ecosystems give dense H1–H3 pipeline with clear India triggers. See 3 Horizons tab." },
    ],
    pestel: {
      Political: [{ p: "Bhashini & India-stack push make local-language voice a quasi-policy expectation", why: "Government-backed language AI (Bhashini APIs, 22 scheduled languages) lowers the cost of vernacular voice and raises buyer expectations of it [1]", sowhat: "A 10+ language AI cockpit voice assistant is both differentiator and policy-aligned — build it on open Indian language stacks", i: "medium", c: [1] }],
      Economic: [{ p: "Cockpit content per vehicle is the fastest-growing line in Indian PV BOMs", why: "Twin 10–12 inch displays reached ₹10L cars; HUDs and rear screens are entering ₹20L — content per vehicle tripled in five years [2]", sowhat: "Even flat unit volumes deliver strong revenue growth — the field grows on mix, not just units", i: "high", c: [2] }],
      Social: [{ p: "Indian buyers treat the screen experience as a primary purchase criterion", why: "Reviews and social media benchmark UI smoothness, voice quality and app ecosystems like phones; OEM NPS correlates with infotainment satisfaction [3]", sowhat: "Consumer-grade UX is the bar — Tier-1 'good enough' HMI loses; invest in UX talent or partner with design studios", i: "high", c: [3] }],
      Technological: [{ p: "Cockpit + ADAS fusion onto single HPC silicon is underway", why: "Qualcomm/MediaTek cockpit SoCs now carry NPU headroom for driver monitoring and AI assistants; one-box cockpit-ADAS cuts cost — decisive in India [4]", sowhat: "Bosch's cross-domain HPC strategy matches exactly; the 'Strategic SoC' M&A hook is the leverage point", i: "high", c: [4] }],
      Environmental: [{ p: "Energy budgets in EVs constrain always-on cockpit compute", why: "Cockpit power draw measurably affects EV range; OEMs now spec power envelopes for infotainment [5]", sowhat: "Power-efficient SW architecture is a sellable engineering competency, not a footnote", i: "low", c: [5] }],
      Legal: [{ p: "DPDP Act applies to in-cabin data (voice, video, behaviour)", why: "Voice assistants and occupant cameras process personal data; consent and purpose-limitation duties apply with India data-residency pressure [6]", sowhat: "Privacy-by-design cockpit (on-device inference, consent UX) is a compliance moat versus consumer-tech entrants accustomed to data harvesting", i: "medium", c: [6] }],
    },
    swot: {
      S: [
        { p: "Cockpit/HPC heritage + cross-domain compute roadmap", why: "Bosch builds cockpit domain controllers and owns a credible cockpit-ADAS fusion roadmap aligned with SoC trends", sowhat: "Lead with the integrated cockpit HPC + SW stack offer — exactly where the market is heading" },
        { p: "Massive India software organisation with HMI, Android, AI talent", why: "Thousands of engineers across Bengaluru/Coimbatore already ship cockpit SW for global programmes at India cost", sowhat: "Deliver consumer-grade iteration speed (monthly OTA) that classic Tier-1 processes can't match" },
      ],
      W: [
        { p: "Consumer-electronics UX polish is not a historic Bosch strength", why: "Benchmark cockpit UX is set by smartphone players; Bosch HMI heritage is functional, not delightful", sowhat: "Acquire/partner for UX design capability; measure against phone-grade KPIs, not automotive ones" },
        { p: "SoC dependency on Qualcomm/MediaTek roadmaps", why: "Cockpit differentiation increasingly bound to third-party silicon and their SDK cadence", sowhat: "The 'Strategic SoC' M&A/partnership hook exists for this reason — formalise a preferred-silicon alliance" },
      ],
      O: [
        { p: "Indian OEMs want a system integrator for pre-integrated cockpit bundles", why: "Mid-size OEMs lack the SW headcount to integrate SoC + OS + apps + voice themselves; the mapped 'System Integrator' sub-field is their explicit ask", sowhat: "Productise a pre-integrated India cockpit stack (Android Automotive + vernacular voice + app ecosystem) with bring-your-own-HMI" },
        { p: "Vernacular AI assistant as the defining India feature", why: "No incumbent owns a great 10+ language in-car assistant; Bhashini + LLM advances make it now buildable", sowhat: "First-mover window on the single most India-specific cockpit feature — aligns with the 'AI Cockpit' M&A hook" },
      ],
      T: [
        { p: "Consumer-electronics giants (Samsung/Harman, LG, Chinese cockpit Tier-1s) attacking the same OEMs", why: "They bring display supply chains, brand UX credibility and aggressive pricing", sowhat: "Differentiate on automotive-grade integration, safety co-domains and privacy — not on display hardware" },
        { p: "OEMs in-housing HMI/UX layers", why: "Top OEMs hire UX teams to own brand experience, demoting suppliers to platform providers", sowhat: "Embrace it: sell the platform + tooling (bring-your-own-pattern), monetise the base layers" },
      ],
      strategy: "Lead as the integrated cockpit platform & AI-experience provider for India: cockpit HPC + pre-integrated SW bundle + vernacular AI assistant, with a silicon alliance and a UX capability acquisition.",
      scoreRationale: "Score 7.4: two heavyweight, hard-to-copy strengths and two well-evidenced opportunities; weaknesses are real but both have named closure routes (UX acquisition, SoC alliance). Threats moderate the score below 8.",
    },
    market: {
      tam: 5600, sam: 2100, cagr: 14, year: 2030,
      derivation: [
        { step: "India PV+CV production 2030 × cockpit content per vehicle", value: "~5.2M PV @ avg $950 cockpit content", src: "Production forecasts × teardown benchmarks [7]" },
        { step: "+ 2W premium cluster/connectivity content", value: "~$0.7B", src: "Premium 2W TFT adoption; estimate" },
        { step: "= TAM (displays, compute, SW, integration, 2030)", value: "$5.6B", src: "Derived — estimate" },
        { step: "Serviceable filter: compute + SW + integration (excl. display panels), merchant share", value: "≈38% of TAM = $2.1B", src: "Excludes panel value & in-house HMI; estimate" },
      ],
      crossCheck: "Sanity check: global cockpit electronics ~$55B with India ~9–10% of vehicle production but lower content/vehicle → 7–8% value share ≈ $5B-class TAM — consistent [7][8].",
      customers: [
        { s: "Indian & global PV OEMs", buy: "Cockpit HPC, pre-integrated SW stack, AI assistant", note: "Mid-size OEMs are the integrator opportunity; top OEMs buy platforms" },
        { s: "Premium 2W OEMs", buy: "TFT clusters, connectivity, companion apps", note: "Fast-growing, cost-sensitive — India-cost engineering decisive" },
        { s: "Fleet & mobility services", buy: "Driver UX, in-cab payments, telematics integration", note: "Bridges to the Fintech field" },
      ],
      scoreRationale: "Score 7.8: $2.1B Bosch-addressable SAM with 14% CAGR and rising content/vehicle. Confidence 0.76: production forecasts solid; SW/integration share split is our estimate.",
    },
    porter: [
      { force: "Rivalry", v: 7.5, why: "Harman, LG, Visteon, Panasonic, Desay and Chinese Tier-1s all target Indian cockpit awards; differentiation cycles are short.", drivers: ["Consumer-electronics entrants", "Chinese cockpit Tier-1s via JVs", "Short feature cycles"], c: [8] },
      { force: "Supplier power", v: 7.0, why: "Qualcomm's cockpit SoC dominance gives one supplier outsized roadmap and pricing leverage; display panel supply adds Asia concentration.", drivers: ["SoC quasi-monopoly", "Panel supply concentration"], c: [4] },
      { force: "Buyer power", v: 6.5, why: "OEMs multi-source and benchmark hard, but cockpit differentiation value gives capable suppliers pricing room — unlike commodity parts.", drivers: ["Multi-sourcing", "But: differentiation premium exists"], c: [2] },
      { force: "Substitutes", v: 4.5, why: "Phone-mirroring (CarPlay/Android Auto) substitutes some embedded value, but OEMs are pulling experience back in-house for data & brand reasons.", drivers: ["Phone projection erosion", "OEM counter-trend to embedded"], c: [3] },
      { force: "New entrants", v: 6.5, why: "Software-side entry is cheap (Indian IT/GCC firms), but full cockpit (HW+SW+safety) integration remains a meaningful barrier.", drivers: ["IT-services entrants in SW", "Integration barrier for full stack"], c: [8] },
    ],
    porterRationale: "Attractiveness 6.2 = 10 − weighted pressure. Rivalry (7.5) and SoC supplier power (7.0) dominate; partial offset from differentiation-driven buyer dynamics. Attractive for full-stack integrators, hostile for point-solution vendors.",
    competency: [
      { name: "Cockpit domain compute (HPC)", bosch: 9, req: 9, whyReq: "Cockpit-ADAS fusion on central compute is the architecture endgame (9)", whyBosch: "Bosch ships cockpit/cross-domain HPCs globally; India engineering involved (9)", gap: "none — match", gapWhy: "Anchor asset for the integrated offer" },
      { name: "HMI / UX design", bosch: 6, req: 9, whyReq: "Phone-grade UX is the buyer benchmark in India (9)", whyBosch: "Functional HMI competence; lacks consumer-design culture (6)", gap: "buy / hire", gapWhy: "Acquire a UX studio or build a dedicated India design lab — biggest gap" },
      { name: "Vernacular voice & AI", bosch: 7, req: 9, whyReq: "10+ language assistant is the defining India feature (9)", whyBosch: "AI cockpit programmes + India AI talent exist; vernacular tuning incomplete (7)", gap: "build", gapWhy: "Build on Bhashini/open language stacks — 12-month roadmap" },
      { name: "Android Automotive / OS integration", bosch: 8, req: 8, whyReq: "AAOS is the de-facto Indian cockpit OS (8)", whyBosch: "Multiple AAOS programmes delivered from India (8)", gap: "none — match", gapWhy: "Productise as the pre-integrated bundle" },
      { name: "Display/panel supply chain", bosch: 3, req: 6, whyReq: "Integrators need panel sourcing, though OEMs often direct-buy (6)", whyBosch: "No panel franchise (3)", gap: "partner", gapWhy: "Panel partnerships suffice; do not integrate backwards" },
    ],
    competencyRationale: "Score 8.0: matches requirement on the three platform competencies (HPC, OS, compute) that carry the most weight; the UX gap is significant but closable by acquisition, and panels are deliberately out of scope. Confidence 0.88: levels verifiable against delivered programmes.",
    horizons: {
      h1: [
        { item: "Cockpit HPC + AAOS integration for current platforms", why: "Active RFQ pipeline today; Bosch assets production-ready" },
        { item: "TFT clusters & connectivity for premium 2W", why: "Segment converting now; India-cost engineering is the differentiator" },
      ],
      h2: [
        { item: "Vernacular AI assistant (10+ languages, on-device + cloud hybrid)", why: "Language models and Bhashini APIs are ready; automotive-grade integration and OEM adoption take 2–3 years", trigger: "First OEM shipping a vernacular assistant as a headline feature" },
        { item: "Cockpit-ADAS fusion on single SoC", why: "Silicon available; OEM architecture cycles put volume adoption 2–4 years out", trigger: "Two Indian OEM platforms sourcing one-box cockpit-ADAS" },
      ],
      h3: [{ item: "Agentic in-car AI + app/commerce ecosystem", why: "Requires mature payments, content partnerships and trust frameworks beyond current cockpit scope — 5+ years to material revenue", trigger: "In-car commerce GMV crossing meaningful scale on UPI rails" }],
      rationale: "Score 8.4: dense H1 (immediate revenue), two well-evidenced H2 themes with observable triggers, and a credible H3 tied to India's payment rails. One of the strongest growth profiles across the 16 fields.",
    },
    verdict: {
      entry: "Lead with the integrated cockpit platform (HPC + pre-integrated AAOS bundle + vernacular AI assistant); execute the Strategic-SoC alliance and a UX-capability acquisition; use Video Perception assets for occupant-aware experiences.",
      reasoning: [
        "Competency 8.0 at the heaviest weight plus 3-Horizons 8.4 drive the score — Bosch's strongest combined right-to-play/right-to-win outside Software",
        "Market 7.8 with content-per-vehicle growth means revenue grows even in flat unit years",
        "Porter 6.2 is the limiting criterion (rivalry + SoC supplier power) — the named counters are the SoC alliance and full-stack integration positioning",
      ],
      portfolio: [
        { sub: "SW", play: "LEAD", why: "AI cockpit, vernacular assistant, HMI platform — largest value pool, strongest fit" },
        { sub: "System Integrator", play: "LEAD", why: "Pre-integrated bundles for mid-size OEMs — explicit market ask, low competition" },
        { sub: "Hardware", play: "PARTNER", why: "HPC yes; displays/panels via partners — don't integrate backwards" },
      ],
      risks: ["Qualcomm SDK/roadmap dependency concentrating value at silicon layer", "Consumer-electronics rival wins a lighthouse Indian OEM and sets the UX benchmark", "OEM in-housing of HMI reducing SW scope per award"],
    },
    activity: [
      { d: "Jun 06, 2026", t: "Indian OEM unveils 12-language AI voice assistant in mass-market SUV", s: "Autocar India" },
      { d: "May 30, 2026", t: "Cockpit SoC vendor launches India-tuned reference design with NPU for DMS + assistant", s: "ET Auto" },
      { d: "May 22, 2026", t: "Consumer-electronics Tier-1 wins twin-display award at Indian OEM, displacing incumbent", s: "Autocar Pro" },
      { d: "May 10, 2026", t: "Premium 2W brand ships TFT cluster with OTA app store", s: "Bike Dekho" },
    ],
    sources: ["Bhashini / language-AI ecosystem", "Cockpit content-per-vehicle teardowns", "Buyer-experience surveys & NPS studies", "Cockpit SoC roadmaps", "EV power-budget engineering notes", "DPDP Act application to in-cabin data", "PV/2W production forecasts", "Cockpit competitive award trackers"],
  },

  interior: {
    ma: ["ADAS - Interior Sensing", "Comfort Actuators (EM)"], bbm: ["SW System for SdV", "Future Vehicle System for SdV"],
    criterionScores: [
      { ...WEIGHTS[0], s: 6.6, conf: 0.85, why: "Interior-sensing (camera/radar) and actuator competencies are strong; seating and scent are absent franchises — selective fit. See Competency tab." },
      { ...WEIGHTS[1], s: 6.2, conf: 0.80, why: "Sensing strengths + regulatory tailwind vs absent seating franchise and consumer-comfort brand. See SWOT tab." },
      { ...WEIGHTS[2], s: 6.4, conf: 0.72, why: "Aggregate field is mid-sized; the high-growth slice (occupant monitoring, air quality) is the Bosch-relevant part. See Market tab." },
      { ...WEIGHTS[3], s: 6.0, conf: 0.80, why: "Fragmented sub-markets: monitoring attractive (regulation-pulled), seating hostile (entrenched giants). See Attractiveness tab." },
      { ...WEIGHTS[4], s: 7.2, conf: 0.82, why: "DMS regulation, AQI-driven air purity and biometric access give a strong India-specific H1–H2 pipeline. See 3 Horizons tab." },
    ],
    pestel: {
      Political: [{ p: "Driver-monitoring is moving from NCAP incentive to expected regulation", why: "BNCAP protocols and global UNECE DDAW precedent point to Indian DMS requirements; commercial-fleet fatigue rules already nudge adoption [1]", sowhat: "Occupant/driver monitoring becomes a regulation-pulled volume market — the strongest entry wedge, matching the 'Interior Sensing' M&A hook", i: "high", c: [1] }],
      Economic: [{ p: "Comfort-feature premiumisation (ventilated seats, ambient features) reaches mid segments", why: "Ventilated seats now appear in ₹12L cars — comfort content per vehicle rises with income and heat reality [2]", sowhat: "Actuator and control-electronics demand grows — fits the 'Comfort Actuators (EM)' hook without needing a seat franchise", i: "medium", c: [2] }],
      Social: [{ p: "India's air-quality crisis makes cabin air purity a health feature, not a luxury", why: "AQI episodes drive measurable spikes in cabin-filter and purifier sales; buyers in NCR treat PM2.5 readouts as safety information [3]", sowhat: "In-cabin air quality (sensing + purification + display) is a uniquely India-resonant feature Bosch sensors can anchor", i: "high", c: [3] }],
      Technological: [{ p: "In-cabin radar + camera fusion enables child-presence & occupant detection", why: "60GHz radar sensing matured; child-presence detection is entering global NCAP roadmaps and works through seat covers — robust for Indian conditions [4]", sowhat: "Bosch MEMS/radar portfolio extends naturally into cabin sensing — same supply chain, new socket", i: "high", c: [4] }],
      Environmental: [{ p: "Materials & energy: low-power comfort systems favoured in EVs", why: "Seat ventilation/heating and purifiers draw range-relevant power; OEMs spec efficiency [5]", sowhat: "Efficient actuator + smart-control SW is a sellable angle", i: "low", c: [5] }],
      Legal: [{ p: "DPDP applies to in-cabin cameras and biometrics", why: "Face/iris vehicle access and occupant cameras process sensitive personal data; consent and on-device processing duties bite [6]", sowhat: "Privacy-preserving (on-device) sensing architecture is a differentiator and a certification asset", i: "medium", c: [6] }],
    },
    swot: {
      S: [
        { p: "Interior-sensing portfolio (camera, 60GHz radar, MEMS) with the M&A hook already mapped", why: "Sensing hardware + perception SW are existing Bosch franchises; cabin is a new socket, not a new competency", sowhat: "Lead occupant/driver monitoring — regulation-pulled and competency-matched" },
        { p: "Actuator & motor (EM) portfolio for comfort functions", why: "Seat adjusters, flap actuators, pumps are adjacent to existing Bosch electric-machine lines", sowhat: "Supply comfort actuators to seat Tier-1s rather than competing with them" },
      ],
      W: [
        { p: "No seating-system or interior-trim franchise", why: "Adient, Lear, TS Tech, Toyota Boshoku own complete-seat awards with deep OEM JVs in India", sowhat: "Stay component/sensing supplier in seating — complete-seat entry is a no-go" },
        { p: "No consumer brand in comfort/wellness", why: "Air purifiers and scenting are consumer-perception categories where Bosch automotive carries little pull", sowhat: "White-label or co-brand with OEMs; don't build a consumer wellness brand" },
      ],
      O: [
        { p: "Child-presence detection & DMS regulation wave", why: "Global NCAP roadmaps and Indian fleet-safety rules converge on mandatory monitoring within the decade", sowhat: "Position now to be the certified India supplier when mandates land — classic regulation-timed entry" },
        { p: "AQI-driven air purity as an India-first feature", why: "No global market has India's air-quality salience; OEMs need credible sensing + purification claims", sowhat: "Bundle PM/CO2/VOC sensing with HVAC control SW — exportable later to similar markets" },
      ],
      T: [
        { p: "Low-cost camera-DMS startups commoditising monitoring", why: "Smartphone-derived camera + edge-AI stacks ship at aggressive prices for fleet retrofits", sowhat: "Differentiate on automotive-grade reliability, radar fusion and OEM-line integration; cede the cheap retrofit tier" },
        { p: "Seat Tier-1s integrating sensing themselves", why: "Seat makers add occupancy/comfort sensing to defend their system award scope", sowhat: "Offer them the sensing layer as a partner before they build it" },
      ],
      strategy: "Lead occupant & driver monitoring (regulation-timed), supply comfort actuators and air-quality sensing as component/SW layers to incumbents, and stay out of complete seats and consumer scent.",
      scoreRationale: "Score 6.2: two strong, asset-backed strengths and a genuine regulatory opportunity, but the field's largest revenue pools (complete seating) sit behind a structural weakness. Net position good only with strict sub-field selection.",
    },
    market: {
      tam: 4200, sam: 1100, cagr: 12, year: 2030,
      derivation: [
        { step: "India interior systems (seating, access, monitoring, air, comfort) 2030", value: "$4.2B", src: "Segment reports aggregated [7]" },
        { step: "Of which monitoring + access + air-quality + comfort electronics", value: "~$1.6B, growing 2× field average", src: "Sub-segment splits; estimate" },
        { step: "Serviceable filter: sensing, electronics, actuators, SW (excl. complete seats/trim)", value: "≈26% of TAM", src: "Bosch-addressable scope; estimate" },
        { step: "= SAM (2030)", value: "$1.1B", src: "Derived — estimate" },
      ],
      crossCheck: "Sanity check: DMS+occupant sensing alone projected at $350–450M India by 2030 under regulation scenarios — consistent with our high-growth slice [1][7].",
      customers: [
        { s: "PV OEMs", buy: "DMS/occupant sensing, air-quality systems, access electronics", note: "Regulation timing drives sourcing windows" },
        { s: "Seat & interior Tier-1s", buy: "Comfort actuators, occupancy sensors", note: "Partner channel — they own the system award" },
        { s: "Fleet operators", buy: "Driver-fatigue monitoring retrofits", note: "Commercial fatigue rules are the wedge" },
      ],
      scoreRationale: "Score 6.4: moderate aggregate ($1.1B SAM, 12% CAGR) but the addressable slice grows much faster than the field. Confidence 0.72: sub-segment splits rest on our estimates; regulation timing uncertain.",
    },
    porter: [
      { force: "Rivalry", v: 6.5, why: "Each sub-market has different rivals — monitoring (Smart Eye, Seeing Machines, startups), access (Continental, Marquardt), seating (giants). Moderate overall because few compete across all.", drivers: ["Specialist DMS players", "Access-system incumbents", "Fragmented sub-markets"], c: [8] },
      { force: "Supplier power", v: 4.5, why: "Sensors, cameras and motors come from broad supply bases; Bosch is itself upstream for several inputs.", drivers: ["Broad component supply", "Bosch vertical position helps"], c: [4] },
      { force: "Buyer power", v: 6.5, why: "OEMs price-benchmark hard, but regulation-mandated features (DMS, CPD) shift leverage to certified suppliers at mandate time.", drivers: ["Price benchmarking", "Mandate-time leverage flips"], c: [1] },
      { force: "Substitutes", v: 4.0, why: "Smartphone-based monitoring substitutes only in aftermarket retrofits; OEM-line functions have no substitute.", drivers: ["Phone-app retrofits (low end)", "No OEM-line substitute"], c: [3] },
      { force: "New entrants", v: 7.0, why: "Camera-AI startups enter monitoring cheaply; certification and OEM-line integration are the main, surmountable barriers.", drivers: ["Edge-AI startup wave", "Certification as partial barrier"], c: [8] },
    ],
    porterRationale: "Attractiveness 6.0 = 10 − weighted pressure. New entrants (7.0) and fragmented rivalry dominate; weak substitutes and supplier power help. Attractiveness is sub-field-specific — strongest where regulation creates certified-supplier leverage.",
    competency: [
      { name: "In-cabin sensing (camera/radar/MEMS)", bosch: 8, req: 8, whyReq: "DMS/CPD require robust multi-modal sensing in harsh cabins (8)", whyBosch: "Existing sensor franchises extend directly; perception SW in-house (8)", gap: "none — match", gapWhy: "Core entry asset" },
      { name: "Occupant-state AI (drowsiness, distraction, health)", bosch: 7, req: 8, whyReq: "Regulatory DDAW-class performance plus India-specific conditions (8)", whyBosch: "Perception AI strong; India-condition datasets (lighting, attire, occupancy patterns) need building (7)", gap: "build", gapWhy: "Data-collection programme in India — 12–18 months" },
      { name: "Comfort actuators & motors", bosch: 8, req: 7, whyReq: "Reliable, quiet, efficient EM actuators (7)", whyBosch: "Existing electric-machine lines and India manufacturing (8)", gap: "none — exceed", gapWhy: "Supply to seat Tier-1s" },
      { name: "Complete seating systems", bosch: 2, req: 9, whyReq: "Seat awards demand full structures, foam, trim, crash competence (9)", whyBosch: "No franchise (2)", gap: "skip", gapWhy: "Deliberately out of scope — partner channel instead" },
      { name: "Air-quality sensing & purification", bosch: 7, req: 7, whyReq: "Credible PM/VOC/CO2 sensing + HVAC integration (7)", whyBosch: "MEMS environmental sensors exist; purification via partners (7)", gap: "partner", gapWhy: "Sensor-led offer, filtration partnered" },
    ],
    competencyRationale: "Score 6.6: strong matches on sensing, actuators and air quality; the deliberate seating skip drags the field-level average but reflects strategy, not weakness. Confidence 0.85: levels verifiable against existing product lines.",
    horizons: {
      h1: [
        { item: "Fleet driver-fatigue monitoring (retrofit + OEM-line CV)", why: "Commercial fatigue rules and insurer pressure create demand today" },
        { item: "Comfort actuators to seat Tier-1s", why: "Premiumisation is shipping now; immediate component revenue" },
      ],
      h2: [
        { item: "OEM-line DMS + child-presence detection", why: "BNCAP/regulatory adoption window is 2–4 years out; sourcing starts earlier", trigger: "Draft Indian DMS/CPD requirement entering AIS consultation" },
        { item: "Integrated cabin air-quality systems with health display", why: "AQI salience high now; OEM productisation cycles put volume 2–3 years out", trigger: "Two OEMs marketing certified cabin-air claims in volume models" },
      ],
      h3: [{ item: "In-cabin health monitoring (vitals via radar/camera)", why: "Medically credible vitals sensing needs validation and possibly medical-device pathways — 5+ years", trigger: "Regulatory clarity on wellness vs medical-device classification in India" }],
      rationale: "Score 7.2: H1 monetises today, H2 is regulation-timed with observable triggers, H3 bridges to the Health Care field. Growth concentrated exactly in the Bosch-addressable slice.",
    },
    verdict: {
      entry: "Lead occupant/driver monitoring timed to regulation (build India datasets now); supply comfort actuators and air-quality sensing as component/SW layers; partner with seat Tier-1s; skip complete seats and scent.",
      reasoning: [
        "3-Horizons 7.2 and Competency 6.6 carry the verdict: growth and fit concentrate in monitoring + air quality, both asset-backed",
        "Market 6.4 and Porter 6.0 reflect the field's fragmentation — the aggregate is mid-attractive, the selected slice better",
        "SWOT 6.2 confirms: the field rewards strict sub-field selection, hence EXPLORE with a focused portfolio rather than broad entry",
      ],
      portfolio: [
        { sub: "Occupant Monitoring", play: "LEAD", why: "Regulation-pulled, competency-matched, M&A hook mapped" },
        { sub: "Air Purity", play: "LEAD", why: "India-first feature; Bosch MEMS sensing anchors it" },
        { sub: "Vehicle Access", play: "PARTNER", why: "Biometric/keyless via partnerships; DPDP-compliant on-device angle" },
        { sub: "Automated Access", play: "WATCH", why: "Actuator adjacency exists; demand still premium-niche" },
        { sub: "Seating", play: "PARTNER", why: "Actuators/sensing to seat Tier-1s only — never complete seats" },
        { sub: "Ambient Smell", play: "SKIP", why: "Consumer-perception category, no Bosch asset, thin pool" },
      ],
      risks: ["DMS regulation slips, delaying the volume wedge", "Camera-AI startups set retrofit price points that anchor OEM expectations", "Seat Tier-1s integrate sensing in-house before partnerships form"],
    },
    activity: [
      { d: "Jun 03, 2026", t: "Fleet ministry consultation flags driver-fatigue monitoring for long-haul CVs", s: "ET Auto" },
      { d: "May 26, 2026", t: "SUV launch headlines PM2.5 cabin display and auto-purge mode", s: "Autocar India" },
      { d: "May 18, 2026", t: "Global NCAP roadmap adds child-presence detection timeline relevant to BNCAP", s: "Autocar Pro" },
      { d: "May 08, 2026", t: "DMS startup announces low-cost retrofit deal with logistics fleet", s: "Mint" },
    ],
    sources: ["BNCAP/UNECE DDAW trajectories", "Comfort-feature penetration data", "Cabin air-quality consumer studies", "60GHz in-cabin radar briefings", "EV power-budget notes", "DPDP biometric guidance", "Interior-systems market reports", "DMS competitive landscape"],
  },

  suspension: {
    ma: ["Compute", "Chassis System", "VMM"], bbm: ["SW System for SdV", "Future Vehicle System for SdV"],
    criterionScores: [
      { ...WEIGHTS[0], s: 6.4, conf: 0.84, why: "VMM/chassis-control SW and compute are strong; active-damper hardware franchise absent. See Competency tab." },
      { ...WEIGHTS[1], s: 5.6, conf: 0.78, why: "Software strengths real but the Indian market for active suspension is premium-niche; hardware incumbents own it. See SWOT tab." },
      { ...WEIGHTS[2], s: 4.2, conf: 0.70, why: "Small Indian TAM today; growth depends on premiumisation trickling down — slow. See Market tab." },
      { ...WEIGHTS[3], s: 5.0, conf: 0.80, why: "Niche with entrenched global suppliers and strong OEM cost resistance. See Attractiveness tab." },
      { ...WEIGHTS[4], s: 6.0, conf: 0.78, why: "Cross-domain ride control (ADAS-linked) is a real H2/H3 theme, but India volume triggers are distant. See 3 Horizons tab." },
    ],
    pestel: {
      Political: [{ p: "No regulatory driver for active suspension; road-investment paradox", why: "Highway quality improves (less need) while urban roads stay rough (more need) — but no rule mandates ride tech [1]", sowhat: "Demand is purely market-pulled premiumisation — plan for slow adoption, no mandate windfall", i: "low", c: [1] }],
      Economic: [{ p: "Indian buyers pay for ride comfort, but at Indian price points", why: "Soft-ride tuning is a known India requirement; semi-active dampers appear only above ~₹25L — cost sensitivity is decisive [2]", sowhat: "Only cost-engineered semi-active (not full-active) has near-term India volume potential", i: "high", c: [2] }],
      Social: [{ p: "Rough roads + chauffeur-driven premium segment value rear-seat comfort", why: "Premium buyers benchmark rear comfort; motion-sickness mitigation resonates with family-use SUVs [3]", sowhat: "Comfort-software features (preview, motion-sickness reduction) are marketable stories in premium SUVs", i: "medium", c: [3] }],
      Technological: [{ p: "Suspension control is converging with ADAS into vehicle-motion management", why: "Camera-preview damping and roll mitigation consume ADAS perception; control migrates to domain computers — Bosch's VMM thesis exactly [4]", sowhat: "The software/compute layer of suspension is the Bosch entry; dampers remain partner territory", i: "high", c: [4] }],
      Environmental: [{ p: "EV mass + range pressure favour efficient semi-active over full-active", why: "Heavy EVs need body control; hydraulic full-active draws too much energy [5]", sowhat: "Semi-active + smart control SW is the technically and economically right India bet", i: "medium", c: [5] }],
      Legal: [{ p: "Homologation is straightforward; liability shifts with software control", why: "As ride control becomes software-defined, functional-safety scrutiny (ISO 26262) increases [6]", sowhat: "Bosch's safety pedigree is the credential for SW-defined chassis control", i: "low", c: [6] }],
    },
    swot: {
      S: [
        { p: "Vehicle Motion Management (VMM) software + chassis-compute assets, M&A hooks mapped", why: "Bosch's cross-domain motion-control stack already coordinates braking/steering; adding damping is incremental", sowhat: "Enter as the motion-software integrator, not a damper maker" },
        { p: "ADAS perception provides road-preview data for free", why: "Camera/radar already on the vehicle can feed preview damping — a software unlock", sowhat: "Offer preview-comfort as an SdV feature on existing sensor sets — near-zero marginal hardware" },
      ],
      W: [
        { p: "No active/semi-active damper hardware franchise", why: "ZF, Tenneco/Monroe, BWI, Marelli own the valves, dampers and OEM relationships", sowhat: "Hardware entry not viable; software/compute scope only" },
        { p: "India volume base for the field is tiny today", why: "Semi-active penetration is low single digits of PV; full-active nearly absent", sowhat: "Revenue case rests on 2030+ trickle-down — patience capital required" },
      ],
      O: [
        { p: "Cross-domain ride functions (roll mitigation, motion-sickness reduction) as SdV features", why: "Exactly the mapped sub-field: system-level functions using ADAS sensors create new, software-priced value", sowhat: "Bundle into VMM/SdV platform deals already in OEM conversations" },
        { p: "Premium-SUV boom raises the addressable trim mix", why: "₹25L+ SUV segment is India's fastest-growing PV slice", sowhat: "The niche grows even if penetration rates don't" },
      ],
      T: [
        { p: "Damper incumbents bundling their own electronics + SW", why: "ZF/Tenneco sell complete corner modules with control included", sowhat: "Compete via OEM-side architecture wins (central compute) rather than corner-module fights" },
        { p: "OEMs deprioritising ride tech against ADAS/EV spend", why: "Engineering budgets favour electrification and safety; suspension upgrades slip", sowhat: "Tie ride features to ADAS programmes already funded — don't sell standalone" },
      ],
      strategy: "Software-and-compute-only posture: sell cross-domain ride control (preview damping, roll mitigation, motion-sickness reduction) inside VMM/SdV platform deals; partner for all damper hardware; revisit hardware stance only if the market inflects.",
      scoreRationale: "Score 5.6: credible software strengths but the market-size weakness is structural and both threats squeeze the niche from opposite sides. Net position is a patient, software-scoped play.",
    },
    market: {
      tam: 900, sam: 220, cagr: 11, year: 2030,
      derivation: [
        { step: "India premium PV (₹25L+) production 2030 × suspension-tech content", value: "~0.6M units @ avg $1,100 (semi-active mix)", src: "Segment forecasts × content benchmarks [7]" },
        { step: "+ adjacent CV/bus cabin & seat damping electronics", value: "~$0.24B", src: "Estimate" },
        { step: "= TAM (active/semi-active systems + control, 2030)", value: "$0.9B", src: "Derived — estimate" },
        { step: "Serviceable filter: control SW, ECUs, cross-domain functions (excl. dampers/valves)", value: "≈24% of TAM = $0.22B", src: "Estimate" },
      ],
      crossCheck: "Sanity check: global active-suspension ~$6B with India <2% value share given premium-segment size — a sub-$1B TAM is consistent [7].",
      customers: [
        { s: "Premium PV OEMs (incl. Indian luxury assembly)", buy: "Ride-control SW, preview functions, domain integration", note: "Feature differentiation buyers" },
        { s: "Damper Tier-1s", buy: "Control electronics & SW licensing", note: "Coopetition channel" },
        { s: "EV platform teams", buy: "Body-control for heavy EVs", note: "Mass management is their pain point" },
      ],
      scoreRationale: "Score 4.2: smallest SAM among the 16 fields ($0.22B) and growth depends on premium trickle-down. Confidence 0.70: premium-segment forecasts vary widely; content estimates ours.",
    },
    porter: [
      { force: "Rivalry", v: 6.0, why: "A handful of global specialists compete for few Indian awards; rivalry is concentrated but not price-destructive given low volumes.", drivers: ["ZF/Tenneco/BWI/Marelli", "Few annual awards"], c: [8] },
      { force: "Supplier power", v: 5.0, why: "Valve and sensor supply is specialised but multi-source; no acute chokepoint.", drivers: ["Specialised valves", "Multi-source sensors"], c: [8] },
      { force: "Buyer power", v: 7.5, why: "OEMs treat ride tech as cost-optional; they delete features under cost pressure faster than almost any other system.", drivers: ["Feature-deletion risk", "Premium-trim-only sourcing"], c: [2] },
      { force: "Substitutes", v: 6.0, why: "Good passive tuning + frequency-selective dampers deliver 70% of the benefit at 20% of the cost — a real substitute in India.", drivers: ["Advanced passive dampers", "India tuning culture"], c: [2] },
      { force: "New entrants", v: 3.5, why: "Capital intensity, safety validation and tiny market size deter entrants — the niche protects itself.", drivers: ["High validation cost", "Small prize"], c: [8] },
    ],
    porterRationale: "Attractiveness 5.0 = 10 − weighted pressure. Buyer power (7.5) and passive-damper substitution (6.0) dominate; low entrant threat helps incumbents more than newcomers. A defendable niche, but a niche.",
    competency: [
      { name: "Motion-control SW (VMM)", bosch: 9, req: 8, whyReq: "Coordinated chassis control across braking/steering/damping (8)", whyBosch: "VMM is a flagship Bosch stack; chassis-systems hook mapped (9)", gap: "none — exceed", gapWhy: "The entire entry thesis rests here" },
      { name: "Damper/valve hardware", bosch: 2, req: 8, whyReq: "System awards need the hydraulic/mechatronic corner (8)", whyBosch: "No franchise (2)", gap: "partner", gapWhy: "Partner or stay SW-only — do not build" },
      { name: "Preview sensing integration", bosch: 8, req: 7, whyReq: "Camera/IMU road preview for proactive damping (7)", whyBosch: "ADAS perception in-house (8)", gap: "none — exceed", gapWhy: "Differentiator vs damper-led rivals" },
      { name: "Cost-engineered semi-active for India", bosch: 5, req: 8, whyReq: "₹25L price points demand India-cost mechatronics (8)", whyBosch: "Global designs premium-priced; India cost variant absent (5)", gap: "partner / build", gapWhy: "Only relevant if hardware stance changes — currently parked" },
      { name: "Functional safety for SW-defined chassis", bosch: 9, req: 8, whyReq: "ISO 26262 rigour as control goes software (8)", whyBosch: "Decades of chassis safety pedigree (9)", gap: "none — exceed", gapWhy: "Credential for OEM-side architecture wins" },
    ],
    competencyRationale: "Score 6.4: exceeds on every software/safety competency, absent on hardware — a bimodal profile averaging to moderate. The score understates fit for the software-scoped strategy and overstates it for any hardware ambition. Confidence 0.84.",
    horizons: {
      h1: [{ item: "Ride-control SW features on existing semi-active hardware (premium trims)", why: "Sellable today into the small but real premium pipeline" }],
      h2: [
        { item: "Cross-domain functions: roll mitigation, motion-sickness reduction via ADAS preview", why: "Software-ready; OEM platform cycles put adoption 2–4 years out", trigger: "First Indian-market SUV marketing preview-comfort as a feature" },
        { item: "Heavy-EV body control on central compute", why: "EV mass problem grows with battery sizes; zonal architectures arriving", trigger: "Indian EV platforms above 2.2t kerb weight reaching volume" },
      ],
      h3: [{ item: "Full software-defined chassis (damping as OTA-tunable service)", why: "Needs SDV architectures + business-model acceptance — 5+ years in India", trigger: "OEMs monetising chassis-feature subscriptions in India" }],
      rationale: "Score 6.0: H2 themes are genuine and Bosch-aligned, but every horizon depends on premium/SdV adoption curves that move slowly in India. Growth is real, gradient is shallow.",
    },
    verdict: {
      entry: "Software-and-compute scope inside VMM/SdV platform deals; no damper hardware; revisit in 12 months against the premium-SUV penetration trigger.",
      reasoning: [
        "Market 4.2 is the decisive drag — the smallest addressable pool of all 16 fields makes standalone investment unjustifiable",
        "Competency 6.4 and Horizons 6.0 show a credible software path, which is why this is WATCH-with-a-play rather than NO-GO",
        "Porter 5.0 (buyer power + passive substitution) confirms thin standalone economics — hence bundling into already-funded ADAS/SdV programmes",
      ],
      portfolio: [
        { sub: "Control Algorithms", play: "LEAD", why: "VMM extension — near-zero marginal cost, ships inside SdV deals" },
        { sub: "Cross-Domain Function", play: "LEAD", why: "Preview comfort & motion-sickness features on existing sensors" },
        { sub: "Control Units", play: "PARTNER", why: "Domain-ECU scope where platform wins allow" },
        { sub: "Active & Semi-Active", play: "SKIP", why: "Damper hardware — incumbent territory, no Bosch asset" },
      ],
      risks: ["Premium trickle-down stalls, keeping the niche sub-scale", "Damper incumbents lock SW scope into corner-module bundles"],
    },
    activity: [
      { d: "Jun 02, 2026", t: "Luxury SUV launch features camera-preview suspension tuned for Indian roads", s: "Autocar India" },
      { d: "May 24, 2026", t: "Damper Tier-1 announces India tech centre for semi-active cost localisation", s: "ET Auto" },
      { d: "May 13, 2026", t: "EV flagship review highlights body-control challenge of 2.4t kerb weight", s: "Autocar Pro" },
      { d: "May 02, 2026", t: "OEM platform briefing shows chassis functions migrating to central computer", s: "Auto Tech Review" },
    ],
    sources: ["Road-investment & quality data", "Semi-active penetration by price band", "Premium-buyer comfort studies", "VMM/cross-domain architecture briefings", "EV mass & energy analyses", "ISO 26262 chassis trends", "Premium PV segment forecasts", "Active-suspension market reports"],
  },

  connectivity: {
    ma: ["Offboard SW & Services", "Data Processing", "Compute (connectivity HW under)", "SW & Services - CVS"], bbm: ["GenAI Products & Services", "SW System for SdV", "Future Vehicle System for SdV", "Software & Services for OEMs", "Workshop"],
    criterionScores: [
      { ...WEIGHTS[0], s: 8.2, conf: 0.88, why: "Mobility cloud, cybersecurity engineering and the India SW org map directly onto every sub-field; only hyperscale infra is out of scope. See Competency tab." },
      { ...WEIGHTS[1], s: 7.6, conf: 0.84, why: "Regulatory tailwinds (AIS-189/190, DPDP) play to Bosch's compliance strengths; hyperscaler coopetition is the managed threat. See SWOT tab." },
      { ...WEIGHTS[2], s: 7.8, conf: 0.75, why: "Connected-vehicle penetration racing toward ubiquity; $2.6B SAM at 22% CAGR. See Market tab." },
      { ...WEIGHTS[3], s: 6.8, conf: 0.83, why: "Crowded but regulation raises certified-supplier barriers; substitutes weak. See Attractiveness tab." },
      { ...WEIGHTS[4], s: 8.6, conf: 0.88, why: "Cyber regulation now, federated data & SDV platforms next, quantum-safe later — full-spectrum pipeline. See 3 Horizons tab." },
    ],
    pestel: {
      Political: [{ p: "AIS-189/190 bring UNECE-style cybersecurity & software-update management to India", why: "CSMS/SUMS requirements make certified security processes a homologation precondition for connected vehicles [1]", sowhat: "Cybersecurity engineering becomes mandatory spend by every OEM — a compliance-pulled services and product market Bosch is built for", i: "high", c: [1] }],
      Economic: [{ p: "Connected features shift from premium option to default expectation", why: "Embedded SIM penetration in new PVs has climbed steeply; OEMs monetise subscriptions and need data infrastructure to do it [2]", sowhat: "Recurring-revenue offboard services (the mapped M&A hook) scale with the connected parc, not just new sales", i: "high", c: [2] }],
      Social: [{ p: "Indian consumers adopt connected services fast but churn on price", why: "High app engagement, low willingness to pay post-trial — monetisation needs bundling with insurance, charging, service [3]", sowhat: "Design service bundles (workshop, battery, insurance integration) rather than standalone subscriptions — plays to Bosch's workshop stream", i: "medium", c: [3] }],
      Technological: [{ p: "SDV data architectures + federated mobility data are the build-out frontier", why: "OEMs need vehicle data platforms; India DPI thinking (Beckn-style open networks) extends to mobility data exchanges [4]", sowhat: "The mapped 'Data Management' and 'Architectures' sub-fields align with where Indian digital infrastructure is uniquely ambitious", i: "high", c: [4] }],
      Environmental: [{ p: "Data-centre energy scrutiny meets vehicle-data growth", why: "Vehicle fleets generate vast telemetry; efficient edge filtering reduces cloud cost and footprint [5]", sowhat: "Edge-preprocessing architectures are both a cost and sustainability sell", i: "low", c: [5] }],
      Legal: [{ p: "DPDP Act + CERT-In directives govern vehicle data end-to-end", why: "Breach reporting windows, consent management and data-residency expectations apply to telematics platforms [6]", sowhat: "India-hosted, consent-native vehicle cloud is a compliance moat — expensive for late movers to retrofit", i: "high", c: [6] }],
    },
    swot: {
      S: [
        { p: "End-to-end stack: in-vehicle connectivity HW through offboard cloud services, hooks mapped", why: "Bosch spans device-to-cloud — few rivals cover both automotive-grade embedded and scaled cloud services", sowhat: "Sell integrated device-to-cloud deals where point players can't follow" },
        { p: "Security & safety engineering culture matching AIS-189/190 demands", why: "Decades of safety-critical process discipline transfer directly to CSMS/SUMS compliance offerings", sowhat: "Productise compliance: CSMS toolchains, secure OTA, audit support — immediate regulatory revenue" },
      ],
      W: [
        { p: "Not a hyperscaler — raw cloud infrastructure is rented, not owned", why: "AWS/Azure/GCP own the infrastructure layer and increasingly offer automotive verticals", sowhat: "Partner above the infrastructure layer; differentiate on domain logic, not compute pricing" },
        { p: "Consumer-app experience thinner than tech-native rivals", why: "Companion apps and digital services UX benchmark against consumer tech", sowhat: "Same UX closure route as cockpit — shared design investment across fields" },
      ],
      O: [
        { p: "Regulation wave creates a compliance land-grab", why: "Every OEM and major fleet must implement CSMS/SUMS within regulatory windows — demand spike with limited certified suppliers", sowhat: "Move first with packaged compliance offerings; lock multi-year service contracts" },
        { p: "India's open-network DPI ambition extends to mobility data", why: "Beckn-protocol thinking and government digital-infrastructure agenda invite private players to build federated mobility data layers", sowhat: "Co-architect open mobility-data infrastructure — strategic positioning impossible in most other markets" },
      ],
      T: [
        { p: "Hyperscalers moving up-stack into automotive verticals", why: "Connected-vehicle platforms from cloud giants compress the middleware value Bosch targets", sowhat: "Differentiate on automotive domain depth, embedded integration and regulatory compliance" },
        { p: "Indian IT majors (TCS, Infosys, Tech Mahindra) selling connected-vehicle programmes", why: "They bring OEM relationships and labour-cost advantage to services", sowhat: "Compete on product IP + accountability for outcomes, not T&M services" },
      ],
      strategy: "Lead cybersecurity & software-update compliance now, build the vehicle data platform business on it, and co-architect India's federated mobility-data layer; partner hyperscalers for infrastructure.",
      scoreRationale: "Score 7.6: rare full-stack strength alignment plus a regulation-pulled opportunity; weaknesses are layer-boundaries (infra, consumer UX) with clear partner/build routes. Threats are serious but Bosch holds differentiated ground.",
    },
    market: {
      tam: 6800, sam: 2600, cagr: 22, year: 2030,
      derivation: [
        { step: "Connected vehicles on Indian roads 2030 × annual data/services value", value: "~110M connected vehicles (incl. 2W) @ avg $38/yr", src: "Parc forecasts × ARPU benchmarks [7]" },
        { step: "+ OEM-side platforms, cyber compliance, embedded connectivity HW", value: "~$2.6B/yr", src: "Compliance + platform spend; estimate" },
        { step: "= TAM (connectivity, cloud, cyber, data for mobility, 2030)", value: "$6.8B", src: "Derived — estimate" },
        { step: "Serviceable filter: Bosch-addressable layers (excl. raw cloud infra, telecom carriage)", value: "≈38% of TAM = $2.6B", src: "Estimate" },
      ],
      crossCheck: "Sanity check: India connected-car market alone projected $3–4B by 2030 in analyst reports; adding 2W, CV, compliance and data platforms reaches our corridor [7][8].",
      customers: [
        { s: "OEMs (PV/2W/CV)", buy: "Connectivity stacks, secure OTA, CSMS compliance, data platforms", note: "Regulation timing drives procurement waves" },
        { s: "Fleets & mobility operators", buy: "Telematics, data analytics, uptime services", note: "Bridges to Energy & Infrastructure fields" },
        { s: "Insurers & ecosystem players", buy: "Verified vehicle data feeds", note: "Federated-data opportunity" },
      ],
      scoreRationale: "Score 7.8: $2.6B SAM at 22% CAGR with recurring-revenue character. Confidence 0.75: parc forecasts robust; ARPU and compliance-spend assumptions are ours.",
    },
    porter: [
      { force: "Rivalry", v: 7.0, why: "Hyperscalers, IT majors, telematics specialists and Tier-1s all converge — but the field is broad enough that direct collisions are layer-specific.", drivers: ["Hyperscaler verticals", "IT-services majors", "Telematics specialists"], c: [8] },
      { force: "Supplier power", v: 5.5, why: "Cloud infrastructure pricing power is real but multi-cloud strategies and India data-centre buildout temper it.", drivers: ["Hyperscaler pricing", "Multi-cloud mitigation"], c: [8] },
      { force: "Buyer power", v: 6.0, why: "OEMs negotiate hard but regulatory deadlines and switching costs of vehicle platforms favour incumbentsuppliers once installed.", drivers: ["Deadline-driven demand", "High switching costs post-install"], c: [1] },
      { force: "Substitutes", v: 3.5, why: "Compliance cannot be substituted; smartphone-based connectivity substitutes only low-end retrofit telematics.", drivers: ["Mandated compliance", "Phone-based retrofit (low end only)"], c: [1] },
      { force: "New entrants", v: 7.0, why: "Software entry is cheap and VC-funded security startups proliferate — but AIS-189-grade certification and OEM trust are rising barriers.", drivers: ["Startup wave", "Certification barrier rising"], c: [8] },
    ],
    porterRationale: "Attractiveness 6.8 = 10 − weighted pressure. Rivalry and entrants (7.0 each) are offset by near-absent substitutes (3.5) and post-install stickiness. Regulation systematically raises barriers in Bosch's favour.",
    competency: [
      { name: "Automotive cybersecurity (CSMS/SUMS)", bosch: 9, req: 9, whyReq: "AIS-189/190 demand certified end-to-end security processes (9)", whyBosch: "Global UNECE R155/156 programme experience; security engineering at scale (9)", gap: "none — match", gapWhy: "Lead offer — immediate" },
      { name: "Vehicle data platforms & analytics", bosch: 8, req: 8, whyReq: "OEMs need scaled ingestion, processing, monetisation (8)", whyBosch: "Mobility cloud + Data Processing M&A hook + India data engineering (8)", gap: "none — match", gapWhy: "Build the platform business on compliance entry" },
      { name: "Embedded connectivity HW/stack", bosch: 8, req: 7, whyReq: "TCUs, V2X-ready stacks, eSIM management (7)", whyBosch: "Existing connectivity-HW line (M&A hook 'under') (8)", gap: "none — exceed", gapWhy: "Device-to-cloud completeness" },
      { name: "Hyperscale cloud infrastructure", bosch: 3, req: 6, whyReq: "Scaled, India-resident infra underneath everything (6)", whyBosch: "Deliberately not owned (3)", gap: "partner", gapWhy: "Multi-cloud partnerships; differentiate above the line" },
      { name: "Open-network / DPI-style architectures", bosch: 6, req: 7, whyReq: "Federated mobility data needs Beckn-class open-protocol fluency (7)", whyBosch: "Architecture talent exists; India DPI-specific experience thin (6)", gap: "build / hire", gapWhy: "Hire from India DPI ecosystem; co-build with network founders" },
    ],
    competencyRationale: "Score 8.2: matches or exceeds on four of five competencies including both decisive ones (cyber, data platforms); the infra gap is a deliberate partner line. Highest competency score across the 16 fields alongside Software. Confidence 0.88.",
    horizons: {
      h1: [
        { item: "CSMS/SUMS compliance products & secure OTA", why: "Regulatory deadlines create urgent, budgeted demand today" },
        { item: "Connected-vehicle platforms for OEM subscription services", why: "Embedded connectivity is shipping now; OEMs monetising already" },
      ],
      h2: [
        { item: "Federated mobility-data exchange participation", why: "Open-network protocols proven in commerce; mobility extension in active pilots", trigger: "Government-backed mobility data exchange moving from pilot to production" },
        { item: "Cross-OEM SDV data architecture standards", why: "Fragmented per-OEM platforms will consolidate; standard-setters win", trigger: "Two+ Indian OEMs adopting a shared vehicle-data schema" },
      ],
      h3: [{ item: "Quantum-safe vehicle security & 6G-era architectures", why: "Post-quantum migration for 15-year vehicle lifecycles must start before the threat matures — but India deployment is 5+ years out", trigger: "Indian regulatory guidance on PQC timelines for automotive" }],
      rationale: "Score 8.6: the only field with mandated H1 demand, structural H2 themes tied to India's DPI trajectory, and a real H3. Breadth across all five sub-fields compounds the score.",
    },
    verdict: {
      entry: "Enter now, compliance-first: lead with CSMS/SUMS + secure OTA, expand into vehicle data platforms on the install base, co-architect federated mobility data; hyperscalers as infra partners, GenAI stream layered on the data assets.",
      reasoning: [
        "Competency 8.2 at top weight + Horizons 8.6 — the strongest right-to-play/right-to-win combination in the portfolio review",
        "Market 7.8 with recurring-revenue character and regulation-guaranteed floor demand de-risks the entry economics",
        "Porter 6.8 is the lowest criterion yet still above field average — regulation keeps raising barriers in favour of certified incumbents",
      ],
      portfolio: [
        { sub: "Cyber Security", play: "LEAD", why: "Regulation-mandated, competency-matched, immediate revenue" },
        { sub: "Data Management", play: "LEAD", why: "Platform business on the compliance install base; GenAI layering" },
        { sub: "Architectures", play: "LEAD", why: "SDV + federated-data architecture leadership; India DPI alignment" },
        { sub: "Connectivity", play: "PARTNER", why: "HW/stack strong but telecom carriage and eSIM partnerships needed" },
        { sub: "Cloud", play: "PARTNER", why: "Stay above the infra line; multi-cloud alliances" },
      ],
      risks: ["Hyperscaler verticals compressing middleware margins", "Regulatory timelines slipping, delaying compliance demand spike", "IT-services price competition on implementation work"],
    },
    activity: [
      { d: "Jun 07, 2026", t: "AIS cybersecurity compliance deadline consultation sets phased timeline for OEMs", s: "ET Auto" },
      { d: "May 29, 2026", t: "Indian OEM reports million-vehicle connected fleet milestone with subscription attach data", s: "Autocar Pro" },
      { d: "May 20, 2026", t: "Open mobility-data network pilot expands to vehicle telematics in two states", s: "Mint" },
      { d: "May 09, 2026", t: "CERT-In advisory on connected-vehicle vulnerabilities prompts OEM security audits", s: "Economic Times" },
    ],
    sources: ["AIS-189/190 drafts & UNECE R155/156", "Embedded connectivity penetration data", "Connected-services churn studies", "Beckn/DPI mobility extensions", "Vehicle data volume analyses", "DPDP + CERT-In directives", "Connected-car market reports", "Competitive landscape trackers"],
  },

  eca: {
    ma: ["MEMS", "ECU", "Power Semiconductors", "IC", "ASICs", "Quantum Sensing"], bbm: ["SW System for SdV", "Future Vehicle System for SdV"],
    criterionScores: [
      { ...WEIGHTS[0], s: 7.4, conf: 0.86, why: "World-class ECU/MEMS franchises and zonal-architecture leadership; no fab and limited India silicon design scale. See Competency tab." },
      { ...WEIGHTS[1], s: 6.8, conf: 0.82, why: "Architecture leadership + India Semiconductor Mission alignment vs fab absence and SoC-vendor gravity. See SWOT tab." },
      { ...WEIGHTS[2], s: 7.0, conf: 0.72, why: "$2.3B SAM as E/E content rises and zonal transitions begin; semiconductor value partly flows to silicon vendors. See Market tab." },
      { ...WEIGHTS[3], s: 6.0, conf: 0.82, why: "SoC-vendor power and OEM in-housing pressure offset by high entry barriers. See Attractiveness tab." },
      { ...WEIGHTS[4], s: 7.6, conf: 0.84, why: "Zonal now, AI-compute and chiplets next, RISC-V and quantum sensing later — deep pipeline with ISM tailwind. See 3 Horizons tab." },
    ],
    pestel: {
      Political: [{ p: "India Semiconductor Mission (ISM) funds fabs, OSAT and design-linked incentives", why: "Approved fab/OSAT projects (incl. Dholera, Sanand) and DLI schemes are creating a domestic silicon ecosystem for the first time [1]", sowhat: "Automotive-grade packaging/test and design partnerships become locally possible — Bosch can anchor automotive qualification of Indian silicon", i: "high", c: [1] }],
      Economic: [{ p: "E/E content per vehicle rising steeply even in budget segments", why: "Safety mandates (6 airbags-class features, ESC), EVs and connectivity multiply ECUs and semiconductors per vehicle [2]", sowhat: "Volume-driven demand for cost-optimised ECUs and zonal consolidation — both Bosch home turf", i: "high", c: [2] }],
      Social: [{ p: "Chip-shortage memory makes supply resilience a board topic for Indian OEMs", why: "2021–23 shortages cost Indian OEMs real volume; localisation of semiconductors is now strategic, not just cost-driven [3]", sowhat: "'Resilient, India-qualified electronics supply' is a sales narrative with CXO traction", i: "medium", c: [3] }],
      Technological: [{ p: "Architecture shift: distributed ECUs → zonal + central compute, with RISC-V emerging", why: "Global zonal transition reaches Indian platforms via global OEMs first; DIR-V programme (Shakti/Vega cores) pushes sovereign RISC-V [4]", sowhat: "Zonal controllers and vehicle-computer sockets are being re-sourced — the once-a-decade entry window; RISC-V watchlist for sovereignty-sensitive programmes", i: "high", c: [4] }],
      Environmental: [{ p: "Power efficiency (SiC/GaN) is the EV electronics battleground", why: "Wide-bandgap devices cut inverter losses meaningfully; ME-SiC/GaN hook already mapped in Energy field — shared frontier [5]", sowhat: "Power-semiconductor positioning spans Energy and ECA fields — coordinate the play", i: "medium", c: [5] }],
      Legal: [{ p: "Functional-safety and cybersecurity certification deepen at silicon level", why: "ISO 26262 + AIS-189 push security/safety requirements into chips and ECUs [6]", sowhat: "Certification depth is a barrier favouring established Tier-1s — Bosch's pedigree compounds", i: "medium", c: [6] }],
    },
    swot: {
      S: [
        { p: "ECU & MEMS franchises with India manufacturing, M&A hooks across the silicon stack", why: "Bosch is among the world's largest ECU/MEMS makers; hooks (ECU, MEMS, power semis, ASICs) map the whole sub-field", sowhat: "Defend and grow the ECU base while leading the zonal consolidation wave" },
        { p: "Cross-domain vehicle-computer & zonal architecture leadership", why: "Bosch ships central/zonal computing globally; architecture know-how is the scarce asset in the transition", sowhat: "Sell architecture-led: win the zonal blueprint, the sockets follow" },
      ],
      W: [
        { p: "No wafer fab; advanced-node access is bought", why: "Leading-edge SoCs come from foundries and vendors (Qualcomm/NVIDIA class) outside Bosch control", sowhat: "Position as architecture integrator and qualifier of silicon — not a node competitor; ASIC/chiplet partnerships for differentiation" },
        { p: "India silicon-design scale is sub-critical vs the GCC giants", why: "India hosts massive chip-design talent, but mostly inside vendor GCCs, not Bosch", sowhat: "Targeted design-team build/acqui-hire under ISM DLI incentives" },
      ],
      O: [
        { p: "Once-a-decade re-sourcing as zonal architectures land in India-built platforms", why: "Architecture transitions reopen every ECU socket; incumbentship resets", sowhat: "Aggressive zonal-controller and vehicle-computer bids on upcoming Indian EV platforms" },
        { p: "ISM creates automotive-qualification white space", why: "New Indian fabs/OSATs need automotive-grade process qualification partners; nobody owns this role yet", sowhat: "Anchor automotive qualification of Indian silicon — strategic, government-aligned, defensible" },
      ],
      T: [
        { p: "SoC vendors absorbing ECU value into central compute silicon", why: "As functions consolidate onto big SoCs, value shifts from many ECUs to few chips owned by silicon vendors", sowhat: "Move up (architecture, SW, integration) and down (ASIC/chiplet partnerships) simultaneously" },
        { p: "OEM in-housing of E/E architecture design", why: "Top OEMs build architecture teams to control their destiny, demoting Tier-1s to build-to-print", sowhat: "Offer co-development models; monetise IP and tooling rather than only hardware" },
      ],
      strategy: "Lead the zonal/central-compute transition on Indian platforms, anchor automotive qualification of ISM silicon, hold the power-semiconductor line with Energy-field coordination, and watch RISC-V for sovereignty-driven programmes.",
      scoreRationale: "Score 6.8: two franchise-grade strengths and a genuine once-a-decade opportunity, tempered by the structural fab gap and value migration toward SoC vendors. Strong but contested ground.",
    },
    market: {
      tam: 7400, sam: 2300, cagr: 16, year: 2030,
      derivation: [
        { step: "India vehicle production 2030 × E/E + semiconductor content per vehicle", value: "~30M vehicles (all segments) @ blended $240 E/E-relevant content", src: "Production forecasts × content curves [7]" },
        { step: "= TAM (ECUs, controllers, automotive semis, architecture, 2030)", value: "$7.4B", src: "Derived — estimate" },
        { step: "Serviceable filter: merchant ECU/controller/architecture value Bosch-addressable (excl. captive silicon, in-house OEM electronics)", value: "≈31% of TAM", src: "Estimate" },
        { step: "= SAM (2030)", value: "$2.3B", src: "Derived — estimate" },
      ],
      crossCheck: "Sanity check: India automotive semiconductor consumption alone projected $4–5B by 2030; adding ECU/controller value-add reaches the TAM corridor [1][7].",
      customers: [
        { s: "OEMs (all segments)", buy: "Zonal controllers, vehicle computers, domain ECUs", note: "Architecture transitions are the sourcing windows" },
        { s: "Indian fabs/OSATs (ISM)", buy: "Automotive qualification, design partnerships", note: "White-space strategic channel" },
        { s: "Tier-1s & EMS players", buy: "MEMS, power semis, ASICs", note: "Existing merchant business to defend & grow" },
      ],
      scoreRationale: "Score 7.0: large SAM with structural content growth, discounted for value migration to SoC vendors and OEM captives. Confidence 0.72: content-per-vehicle curves and merchant-share splits are estimates.",
    },
    porter: [
      { force: "Rivalry", v: 6.5, why: "Global Tier-1s (Continental, Aptiv, Denso, Visteon) plus rising Indian electronics players compete for the zonal wave; discipline holds because validation costs deter price wars.", drivers: ["Tier-1 set converging on zonal", "Indian EMS/electronics risers"], c: [8] },
      { force: "Supplier power", v: 7.5, why: "Foundries and big SoC vendors hold genuine pricing and allocation power; shortage memory keeps OEMs paying for security of supply.", drivers: ["Foundry concentration", "SoC vendor leverage", "Allocation risk premium"], c: [3] },
      { force: "Buyer power", v: 6.0, why: "OEMs benchmark aggressively but architecture lock-in and safety validation create multi-year stickiness once designed in.", drivers: ["Benchmarking pressure", "Design-in stickiness offset"], c: [2] },
      { force: "Substitutes", v: 3.0, why: "No substitute for vehicle electronics; substitution happens within the field (many ECUs → fewer computers) and is the opportunity itself.", drivers: ["Function mandatory", "Consolidation = intra-field shift"], c: [4] },
      { force: "New entrants", v: 5.0, why: "Automotive qualification, functional safety and OEM trust are high walls; ISM-funded Indian entrants will emerge but need years to qualify.", drivers: ["High qualification barrier", "ISM-funded future entrants"], c: [1] },
    ],
    porterRationale: "Attractiveness 6.0 = 10 − weighted pressure. Supplier power (7.5, foundry/SoC) is the dominant hostile force; near-zero substitutes and high entry walls protect incumbents. Attractive for architecture leaders, squeezed for commodity-ECU positions.",
    competency: [
      { name: "ECU design & manufacturing", bosch: 9, req: 8, whyReq: "Cost-optimised, safety-certified controllers at Indian volumes (8)", whyBosch: "Among world's largest; India plants operating (9)", gap: "none — exceed", gapWhy: "The base to defend and migrate" },
      { name: "Zonal/central-compute architecture", bosch: 9, req: 9, whyReq: "The transition is the entry window; blueprint owners win sockets (9)", whyBosch: "Global vehicle-computer programmes shipping (9)", gap: "none — match", gapWhy: "Lead asset for the decade" },
      { name: "Advanced silicon (SoC/chiplet) access", bosch: 5, req: 8, whyReq: "Central compute performance defined at silicon level (8)", whyBosch: "ASIC capability + partnerships, no leading-edge ownership (5)", gap: "partner", gapWhy: "Chiplet/ASIC alliances; qualify ISM silicon" },
      { name: "MEMS & power semiconductors", bosch: 9, req: 7, whyReq: "Sensing + efficient power conversion across EVs (7)", whyBosch: "Franchise businesses with hooks mapped (9)", gap: "none — exceed", gapWhy: "Cash-generative defence; Energy-field synergy" },
      { name: "RISC-V / sovereign compute", bosch: 4, req: 6, whyReq: "DIR-V momentum may make RISC-V a procurement criterion in sovereignty-sensitive programmes (6)", whyBosch: "Limited RISC-V automotive investment to date (4)", gap: "build (watch)", gapWhy: "Low-cost optionality: one evaluation programme, scale on trigger" },
    ],
    competencyRationale: "Score 7.4: franchise-level on three competencies including the decisive architecture one; gaps are at silicon ownership (managed by partnership) and RISC-V (optionality). Confidence 0.86: levels verifiable against shipping product lines.",
    horizons: {
      h1: [
        { item: "Domain ECUs & MEMS/power-semi merchant growth on rising E/E content", why: "Safety mandates and EV mix grow today's sockets — revenue now" },
      ],
      h2: [
        { item: "Zonal controllers + vehicle computers on Indian EV platforms", why: "Global zonal designs reach India-built platforms over the next 2–4 years; sourcing already opening", trigger: "First India-built volume platform sourcing zonal architecture" },
        { item: "Automotive qualification of ISM fab/OSAT output", why: "Indian fabs reach production in this window; automotive-grade comes after consumer", trigger: "ISM fab achieving automotive-relevant process maturity" },
      ],
      h3: [
        { item: "Chiplet-based custom vehicle compute & RISC-V programmes", why: "Chiplet standards (UCIe) and automotive RISC-V toolchains are 5+ years from Indian volume", trigger: "UCIe-based automotive design wins announced globally" },
        { item: "Quantum sensing in vehicles (hook mapped)", why: "Lab-to-vehicle transition for quantum MEMS/magnetometers exceeds 5 years", trigger: "Quantum sensor cost crossing automotive thresholds" },
      ],
      rationale: "Score 7.6: H1 grows on mandates, H2 holds the decisive architecture window plus the ISM white space, H3 is speculative but hook-mapped. Depth across horizons with India-specific triggers.",
    },
    verdict: {
      entry: "Lead the zonal transition on Indian platforms while defending the ECU/MEMS/power-semi base; anchor automotive qualification of ISM silicon; ASIC/chiplet partnerships for compute differentiation; RISC-V as funded optionality.",
      reasoning: [
        "Competency 7.4 (top weight) + Horizons 7.6: franchise strength meets a once-a-decade architecture re-sourcing window",
        "Market 7.0 is structurally growing but Porter 6.0 flags real value migration to SoC vendors — hence the partner-up/partner-down silicon strategy",
        "SWOT 6.8 nets to contested-but-favourable ground; the ISM qualification white space is the differentiated, India-specific move",
      ],
      portfolio: [
        { sub: "Edge Compute", play: "LEAD", why: "Zonal/vehicle-computer sockets — the decade's entry window" },
        { sub: "Distributed Compute", play: "LEAD", why: "Existing ECU base migrating under Bosch architecture leadership" },
        { sub: "Vehicle as Sensor", play: "LEAD", why: "MEMS franchise + data platforms from Connectivity field" },
        { sub: "Semiconductor Tech", play: "PARTNER", why: "ASIC/chiplet alliances + ISM qualification role; no fab ambition" },
        { sub: "AI Compute", play: "PARTNER", why: "NPU/accelerator via silicon partners; Bosch owns integration" },
        { sub: "Comm. Tech", play: "WATCH", why: "In-vehicle networking tracked within architecture scope" },
      ],
      risks: ["Value concentration at SoC layer outpacing Bosch's move up-stack", "ISM timelines slipping, deferring the qualification white space", "OEM architecture in-housing reducing Tier-1 scope"],
    },
    activity: [
      { d: "Jun 05, 2026", t: "ISM fab project announces process milestone; automotive qualification roadmap teased", s: "Mint" },
      { d: "May 28, 2026", t: "Indian EV platform briefing confirms zonal architecture for next-gen models", s: "Auto Tech Review" },
      { d: "May 17, 2026", t: "DIR-V programme update: automotive-grade RISC-V core evaluation kits released", s: "Economic Times" },
      { d: "May 07, 2026", t: "Tier-1 wins central-computer award at global OEM's India-built platform", s: "ET Auto" },
    ],
    sources: ["ISM project approvals & DLI scheme", "E/E content-per-vehicle curves", "Chip-shortage impact retrospectives", "Zonal architecture & DIR-V briefings", "SiC/GaN efficiency studies", "ISO 26262/AIS-189 silicon implications", "Production & semiconductor consumption forecasts", "Tier-1 competitive award trackers"],
  },

  software: {
    ma: ["Onboard SW", "SDV Tooling", "Offboard SW & Services", "Data Processing"], bbm: ["GenAI Products & Services", "SW System for SdV", "Software & Services for OEMs"],
    criterionScores: [
      { ...WEIGHTS[0], s: 8.6, conf: 0.90, why: "ETAS toolchain, middleware franchises, the largest automotive SW workforce in India — near-complete coverage of the sub-fields. See Competency tab." },
      { ...WEIGHTS[1], s: 7.8, conf: 0.85, why: "Asset depth + OEM SDV urgency vs IT-services price competition and open-source commoditisation. See SWOT tab." },
      { ...WEIGHTS[2], s: 8.0, conf: 0.78, why: "$2.8B SAM at 24% CAGR as every OEM funds SDV programmes; India is also the global delivery hub. See Market tab." },
      { ...WEIGHTS[3], s: 6.9, conf: 0.84, why: "Crowded with IT majors and OEM captives, but product-IP positions escape the services price war. See Attractiveness tab." },
      { ...WEIGHTS[4], s: 9.0, conf: 0.90, why: "Middleware/SDV now, AI-defined vehicle and digital twins next, agentic/WASM later — the deepest pipeline of all fields. See 3 Horizons tab." },
    ],
    pestel: {
      Political: [{ p: "GCC policy & SDV skilling push make India the world's automotive-software factory", why: "State GCC policies, engineering-export momentum and skilling missions concentrate global SDV development in India [1]", sowhat: "The field's global talent pool is in Bosch's backyard — scale advantage compounds for whoever organises it best", i: "high", c: [1] }],
      Economic: [{ p: "Every major OEM is funding SDV programmes despite margin pressure", why: "Software-defined platforms are existential investments; Indian OEMs budget SDV even in down-cycles [2]", sowhat: "Counter-cyclical demand for middleware, tooling and integration — rare resilience among the 16 fields", i: "high", c: [2] }],
      Social: [{ p: "Talent war for automotive-software engineers in India", why: "OEM captives, GCCs, IT majors and startups compete for the same SDV talent pool; attrition economics matter [3]", sowhat: "Bosch's brand + scale in India is a recruiting asset; productised IP reduces headcount sensitivity", i: "medium", c: [3] }],
      Technological: [{ p: "Middleware consolidation + AI/ML moving into the vehicle loop", why: "AUTOSAR Adaptive, vehicle OS plays and on-board AI runtimes converge; digital twins shift validation left [4]", sowhat: "The mapped sub-fields (middleware/OS, AI/ML, simulation, digital twin) are exactly the consolidation battlegrounds — fight with products, not bodies", i: "high", c: [4] }],
      Environmental: [{ p: "Virtual validation cuts physical prototyping & test fleets", why: "Simulation/digital-twin maturity measurably reduces prototype builds and test kilometres [5]", sowhat: "Sustainability is a quantifiable selling point for the simulation/twin offer", i: "low", c: [5] }],
      Legal: [{ p: "Safety + cybersecurity certification of software (26262, AIS-189) raises the compliance bar", why: "Certified toolchains and update-management processes become mandatory across the parc [6]", sowhat: "ETAS-class certified tooling becomes more valuable as regulation deepens — moat widens over time", i: "high", c: [6] }],
    },
    swot: {
      S: [
        { p: "ETAS + middleware product IP with global reference customers", why: "Certified toolchains, calibration, middleware run in production vehicles worldwide — product businesses, not T&M services", sowhat: "Lead with productised SDV stack; price on value, not headcount" },
        { p: "Largest automotive-software workforce in India", why: "Tens of thousands of engineers across Bosch India deliver global SW programmes at India cost with automotive domain depth IT majors lack", sowhat: "Combine product IP with delivery scale — a position neither pure-product nor pure-services rivals hold" },
      ],
      W: [
        { p: "Perception as a Tier-1, not a software company, among some OEM digital teams", why: "SDV purchasing increasingly sits with CDO/SW organisations that default to tech-brand vendors", sowhat: "Brand & GTM repositioning toward the SW buyer persona; lighthouse deals matter" },
        { p: "Open-source gravity commoditising middleware layers", why: "Eclipse SDV-class projects (some Bosch-backed) reduce paid middleware scope over time", sowhat: "Shape the open-source agenda and monetise tooling, certification and integration around it" },
      ],
      O: [
        { p: "Indian OEMs need full SDV stacks but lack the in-house depth of global giants", why: "Mid-size Indian OEMs can't fund thousand-engineer platform teams; they want productised stacks plus co-development", sowhat: "Sign 2–3 lighthouse SDV platform deals with Indian OEMs — referenceable, defensible, recurring" },
        { p: "GenAI-accelerated engineering as a product line (mapped BBM stream)", why: "AI coding/validation assistants trained on automotive constraints multiply engineering productivity — Bosch has the domain corpus", sowhat: "Productise internal GenAI engineering gains as 'GenAI Products & Services' for OEM customers" },
      ],
      T: [
        { p: "Indian IT majors (KPIT, Tata Elxsi, LTTS) with OEM relationships and price aggression", why: "They win large SDV services deals on cost and account presence", sowhat: "Don't fight T&M wars; win where product IP + accountability for the integrated outcome decide" },
        { p: "OEM software captives absorbing scope", why: "OEM SW subsidiaries internalise platform work, shrinking external scope", sowhat: "Sell tools, middleware and AI products INTO the captives — make them customers, not competitors" },
      ],
      strategy: "Product-led SDV leadership: middleware + ETAS tooling + GenAI engineering products, delivered at India scale, anchored by lighthouse Indian-OEM platform deals; shape open-source rather than resist it.",
      scoreRationale: "Score 7.8: rare product-plus-scale strength combination and structural demand; weaknesses are positioning issues with active closure paths, threats are price-war traps avoidable by product strategy.",
    },
    market: {
      tam: 5200, sam: 2800, cagr: 24, year: 2030,
      derivation: [
        { step: "India-relevant automotive SW spend 2030 (OEM platforms, middleware, tools, validation)", value: "$3.6B domestic programmes", src: "OEM SDV budget aggregation; estimate [7]" },
        { step: "+ India-delivered global SW engineering relevant to Bosch's addressable layers", value: "~$1.6B", src: "GCC/export engineering flows; estimate" },
        { step: "= TAM (2030)", value: "$5.2B", src: "Derived — estimate" },
        { step: "Serviceable filter: middleware, tooling, AI/ML, simulation, twin + integration (excl. pure T&M body-shopping)", value: "≈54% of TAM = $2.8B", src: "Estimate" },
      ],
      crossCheck: "Sanity check: global automotive SW market ~$50B+ by 2030 with India delivering a double-digit share of engineering — a $5B India-relevant TAM is conservative-to-consistent [7][8].",
      customers: [
        { s: "Indian OEMs (PV/2W/CV)", buy: "SDV platforms, middleware, co-development", note: "Lighthouse deal targets" },
        { s: "Global OEM/Tier-1 GCCs in India", buy: "ETAS tooling, validation, GenAI engineering products", note: "Product sales into existing delivery hubs" },
        { s: "Mobility startups & new platforms", buy: "Pre-integrated stacks, simulation", note: "Speed-to-SOP buyers" },
      ],
      scoreRationale: "Score 8.0: largest SAM ratio of any field (54% of TAM addressable) at 24% CAGR with counter-cyclical character. Confidence 0.78: budget aggregation and export-flow estimates are ours; direction unambiguous.",
    },
    porter: [
      { force: "Rivalry", v: 7.5, why: "IT majors, global SW Tier-1s (Elektrobit, Vector), OEM captives and startups all compete; but product vs services segmentation blunts head-on collisions.", drivers: ["KPIT/Elxsi/LTTS scale", "Global tool vendors", "Captive expansion"], c: [8] },
      { force: "Supplier power", v: 3.5, why: "Inputs are talent and compute — competitive markets both, with India talent advantage accruing to whoever organises it.", drivers: ["Talent market (competitive)", "Cloud compute (multi-source)"], c: [3] },
      { force: "Buyer power", v: 6.5, why: "OEMs negotiate hard on services rates, but certified tools and production middleware carry switching costs that restore supplier leverage.", drivers: ["Rate-card pressure (services)", "Tool/middleware lock-in (products)"], c: [6] },
      { force: "Substitutes", v: 4.0, why: "Open-source substitutes paid middleware partially; nothing substitutes certified toolchains and accountable integration.", drivers: ["Open-source erosion (partial)", "Certification non-substitutable"], c: [4] },
      { force: "New entrants", v: 7.0, why: "Software entry is cheap and the startup wave is real; automotive certification, safety culture and production references are the rising walls.", drivers: ["Low capital entry", "Certification/reference barriers"], c: [8] },
    ],
    porterRationale: "Attractiveness 6.9 = 10 − weighted pressure. Rivalry (7.5) and entrants (7.0) are high, but supplier power is the lowest in the portfolio (3.5) and product positions escape the worst buyer pressure. Attractive specifically for product-IP holders.",
    competency: [
      { name: "Middleware / vehicle OS", bosch: 9, req: 9, whyReq: "The consolidation battleground; production-proven stacks win (9)", whyBosch: "Production middleware + Eclipse SDV leadership + ETAS (9)", gap: "none — match", gapWhy: "Core product line" },
      { name: "SDV tooling & validation (ETAS)", bosch: 9, req: 8, whyReq: "Certified toolchains mandatory as regulation deepens (8)", whyBosch: "ETAS is a market-leading franchise (9)", gap: "none — exceed", gapWhy: "Moat widens with every regulation" },
      { name: "AI/ML in the vehicle loop", bosch: 7, req: 9, whyReq: "AI-defined features and AI-assisted engineering define the next cycle (9)", whyBosch: "Strong applied AI; frontier-model partnerships needed for GenAI products (7)", gap: "build / partner", gapWhy: "GenAI stream + model-provider alliances — 12-month roadmap" },
      { name: "Simulation & digital twin", bosch: 8, req: 8, whyReq: "Left-shifted validation is how SDV programmes hold timelines (8)", whyBosch: "Simulation assets + vehicle physics depth (8)", gap: "none — match", gapWhy: "Bundle with tooling" },
      { name: "Developer-ecosystem GTM", bosch: 5, req: 8, whyReq: "SDV platforms win by developer adoption, not RFQs alone (8)", whyBosch: "Classic B2B GTM; developer-relations muscle thin (5)", gap: "hire / build", gapWhy: "DevRel team + India developer community investment — cheap, high-leverage" },
    ],
    competencyRationale: "Score 8.6: the strongest competency sheet of all 16 fields — franchise positions on three of five, with the two gaps (GenAI productisation, DevRel) being execution items, not structural absences. Confidence 0.90: every level verifiable against shipping products.",
    horizons: {
      h1: [
        { item: "Middleware + ETAS tooling on current SDV programmes", why: "Funded OEM programmes buying today; regulation compounds demand" },
        { item: "SW integration & validation services at India scale", why: "Immediate revenue riding existing delivery organisation" },
      ],
      h2: [
        { item: "Lighthouse Indian-OEM SDV platform deals", why: "Indian OEM platform decisions land in the next 2–3 years — the referenceability window", trigger: "Two Indian OEMs selecting external SDV platform partners" },
        { item: "GenAI engineering products for automotive (mapped BBM stream)", why: "Internal productivity gains proven; productisation and trust-building take 1–3 years", trigger: "Certified AI-assisted toolchain acceptance by a major OEM" },
      ],
      h3: [
        { item: "Agentic vehicle software & app ecosystems (WASM-sandboxed)", why: "WASM in-vehicle runtimes and agentic features need architecture + trust maturity — 5+ years to volume", trigger: "Production vehicle shipping third-party WASM apps in India" },
      ],
      rationale: "Score 9.0: the deepest pipeline in the portfolio — funded H1, a referenceability-window H2 with named triggers, and a credible H3 where Bosch already holds technical positions (WASM, middleware). Highest horizon score of the 16 fields.",
    },
    verdict: {
      entry: "Enter at full commitment: product-led (middleware + ETAS + GenAI engineering products) with lighthouse Indian-OEM SDV platform deals; sell into OEM captives; shape open-source; build DevRel.",
      reasoning: [
        "Competency 8.6 at the heaviest weight and Horizons 9.0 — the portfolio's best right-to-win paired with its deepest growth pipeline",
        "Market 8.0: largest addressable share (54%) of any field, counter-cyclical demand, India as global delivery hub",
        "Porter 6.9 is manageable precisely because the strategy is product-IP-led — the criterion would read far worse for a services-led entry, which the recommendation explicitly avoids",
      ],
      portfolio: [
        { sub: "Middleware/OS", play: "LEAD", why: "Franchise position in the consolidation battleground" },
        { sub: "AI/ML", play: "LEAD", why: "GenAI engineering products — mapped BBM stream, domain-corpus advantage" },
        { sub: "Simulations", play: "LEAD", why: "Bundled with tooling; sustainability-quantifiable sell" },
        { sub: "Digital Twin", play: "PARTNER", why: "Co-build with cloud/PLM partners on Bosch vehicle-physics depth" },
        { sub: "Interoperable Functions", play: "LEAD", why: "Production function libraries on the middleware base" },
        { sub: "Comm. Technologies", play: "PARTNER", why: "Stack components via ecosystem; not a standalone fight" },
        { sub: "WASM", play: "WATCH", why: "Technical positions held; volume trigger is 5+ years out" },
      ],
      risks: ["IT-major price aggression dragging deals into T&M territory", "OEM captives absorbing platform scope faster than product sales offset", "Open-source commoditisation outpacing tooling monetisation"],
    },
    activity: [
      { d: "Jun 09, 2026", t: "Indian OEM announces external partner shortlist for next-gen SDV platform", s: "ET Auto" },
      { d: "May 31, 2026", t: "Eclipse SDV project release adds India-led vehicle-OS components", s: "Auto Tech Review" },
      { d: "May 23, 2026", t: "IT major reports record automotive-software order book; pricing pressure noted", s: "Mint" },
      { d: "May 12, 2026", t: "OEM captive opens GenAI validation lab for software-defined vehicle testing", s: "Economic Times" },
    ],
    sources: ["GCC policies & engineering-export data", "OEM SDV budget disclosures", "Automotive talent-market studies", "AUTOSAR/Eclipse SDV roadmaps", "Virtual-validation impact studies", "ISO 26262/AIS-189 toolchain requirements", "Automotive SW market forecasts", "Competitive deal trackers"],
  },

  manufacturing: {
    ma: ["EMS"], bbm: [],
    criterionScores: [
      { ...WEIGHTS[0], s: 7.0, conf: 0.86, why: "World-class plants, quality systems and I4.0 practice in India; missing the EMS commercial model and cost culture. See Competency tab." },
      { ...WEIGHTS[1], s: 6.4, conf: 0.80, why: "Underutilised certified capacity + quality brand vs margin-model mismatch and entrenched EMS champions. See SWOT tab." },
      { ...WEIGHTS[2], s: 7.2, conf: 0.74, why: "Huge EMS wave (PLI, China+1) but only a filtered slice fits Bosch economics. See Market tab." },
      { ...WEIGHTS[3], s: 5.4, conf: 0.82, why: "Brutal EMS margins, powerful buyers, aggressive incumbents — structurally tough economics. See Attractiveness tab." },
      { ...WEIGHTS[4], s: 6.6, conf: 0.80, why: "MaaS and I5.0 are real growth vectors; dark factories distant for India's labour economics. See 3 Horizons tab." },
    ],
    pestel: {
      Political: [{ p: "PLI schemes + China+1 sourcing push electronics manufacturing to India at scale", why: "Electronics/auto-component PLI disbursements and global supply-chain de-risking redirect manufacturing investment into India [1]", sowhat: "A rising tide for contract manufacturing — the question is whether Bosch participates as a service provider or only as a buyer", i: "high", c: [1] }],
      Economic: [{ p: "EMS is a 3–5% margin business — structurally below Bosch portfolio thresholds", why: "Listed Indian EMS players run thin operating margins compensated by asset turns and scale [2]", sowhat: "Pure-play EMS competes on a financial model Bosch isn't built for; only differentiated automotive-grade, high-mix niches fit", i: "high", c: [2] }],
      Social: [{ p: "Manufacturing employment is politically prized; automation messaging is sensitive", why: "Job creation drives state incentives; lights-out narratives can cost goodwill [3]", sowhat: "Frame I5.0 as human-machine collaboration and skilling, not headcount removal — affects positioning and incentive access", i: "medium", c: [3] }],
      Technological: [{ p: "Industry 4.0→5.0 maturity becomes a sellable service, not just internal practice", why: "Indian factories demand digitalisation; proven practitioners can productise their know-how [4]", sowhat: "Bosch's own plant digitalisation is monetisable as solutions + consulting without entering EMS economics", i: "high", c: [4] }],
      Environmental: [{ p: "Green-manufacturing compliance (energy, ZLD, BRSR carbon reporting) tightens", why: "Customer scope-3 demands push factories toward audited sustainability [5]", sowhat: "Certified-green capacity commands preference with global customers — a Bosch-plant credential", i: "medium", c: [5] }],
      Legal: [{ p: "Quality/liability standards for safety-critical manufacturing favour certified operators", why: "IATF 16949-class discipline gates who can build safety parts [6]", sowhat: "Automotive-grade contract manufacturing is a defensible niche where certification is the moat", i: "medium", c: [6] }],
    },
    swot: {
      S: [
        { p: "Operating Indian plants with automotive-grade quality systems and freeing capacity", why: "Powertrain transition frees capacity in certified facilities — an asset most EMS entrants must build from scratch", sowhat: "Monetise certified capacity via high-mix automotive-grade contract manufacturing (MaaS) without greenfield capex" },
        { p: "I4.0/I5.0 lighthouse practice deployable as a service", why: "Bosch's internal manufacturing digitalisation is reference-grade; Indian factories want exactly this", sowhat: "Sell manufacturing-digitalisation solutions & consulting — software margins on manufacturing know-how" },
      ],
      W: [
        { p: "Cost structure and overheads above EMS-champion benchmarks", why: "Dixon-class players run leaner indirect structures than a global Tier-1 can", sowhat: "Avoid commodity EMS bids; compete only where quality certification prices in" },
        { p: "No EMS commercial muscle for external builds", why: "Selling manufacturing services is a different GTM than selling components", sowhat: "Build a small dedicated MaaS commercial unit; don't burden plant organisations with it" },
      ],
      O: [
        { p: "China+1 customers seeking automotive-grade Indian manufacturing partners", why: "Global Tier-1s/OEMs de-risking supply chains need certified capacity faster than they can build it", sowhat: "Target precisely these customers — certified capacity is the scarce asset, not price" },
        { p: "Powertrain-transition capacity conversion", why: "ICE component lines free up; converting them protects employment and assets", sowhat: "MaaS doubles as the socially-responsible answer to the transition — political goodwill included" },
      ],
      T: [
        { p: "Entrenched EMS champions scaling aggressively (Dixon, Kaynes, Syrma, Tata Electronics)", why: "They add capacity, win PLI, and accept margins Bosch can't", sowhat: "Don't fight for their commodity ground; hold the automotive-grade, high-reliability niche" },
        { p: "Margin dilution risk to Bosch's overall profile", why: "Even successful EMS at scale drags group margins and capital metrics", sowhat: "Cap the ambition: capacity-utilisation play plus solutions business, not an EMS empire" },
      ],
      strategy: "Two-track entry: (1) automotive-grade Manufacturing-as-a-Service monetising certified spare capacity for China+1 customers; (2) I4.0/I5.0 manufacturing-digitalisation solutions as a product/consulting business. No commodity EMS ambitions.",
      scoreRationale: "Score 6.4: genuinely scarce assets (certified capacity, digitalisation practice) meet a structural margin-model weakness. The strategy works only with strict scope discipline — the score prices that execution risk.",
    },
    market: {
      tam: 12000, sam: 1800, cagr: 18, year: 2030,
      derivation: [
        { step: "India EMS/electronics contract manufacturing 2030 (all industries)", value: "$12B+", src: "Industry forecasts [7]" },
        { step: "Of which automotive-grade & high-reliability segments", value: "~$3.2B", src: "Segment split; estimate" },
        { step: "Serviceable filter: high-mix automotive-grade MaaS + digitalisation solutions Bosch-addressable", value: "≈15% of TAM", src: "Estimate" },
        { step: "= SAM (2030), incl. ~$0.5B digitalisation-solutions slice", value: "$1.8B", src: "Derived — estimate" },
      ],
      crossCheck: "Sanity check: listed Indian EMS players' combined revenue trajectories alone imply a $10B+ 2030 market; automotive-grade share assumptions align with their segment disclosures [2][7].",
      customers: [
        { s: "Global Tier-1s & OEMs (China+1)", buy: "Automotive-grade contract manufacturing", note: "Certification + trust buyers, not price buyers" },
        { s: "Indian component makers & startups", buy: "Manufacturing digitalisation solutions, I5.0 consulting", note: "Solutions track" },
        { s: "Defence & industrial primes", buy: "High-reliability electronics builds", note: "Bridges to Defence field" },
      ],
      scoreRationale: "Score 7.2: the headline market is huge, but the Bosch-fit slice is 15% of it — still $1.8B at 18% CAGR. Confidence 0.74: EMS forecasts solid; the automotive-grade and addressable-share splits are ours.",
    },
    porter: [
      { force: "Rivalry", v: 8.0, why: "EMS champions compete ferociously on cost, speed and PLI capture; capacity additions outpace demand in commodity segments.", drivers: ["Dixon/Kaynes/Syrma scale-ups", "Tata Electronics ambition", "PLI-fuelled capacity race"], c: [2] },
      { force: "Supplier power", v: 5.5, why: "Component supply chains are global and improving locally; no single chokepoint for the targeted niches.", drivers: ["Improving local component base", "Global sourcing options"], c: [1] },
      { force: "Buyer power", v: 8.0, why: "Contract-manufacturing buyers are sophisticated, multi-source by design and squeeze margins relentlessly.", drivers: ["Professional procurement", "Multi-sourcing norms", "Open-book pricing demands"], c: [2] },
      { force: "Substitutes", v: 4.5, why: "In-house manufacturing is the substitute; China+1 dynamics currently push the other way — toward outsourcing to India.", drivers: ["In-housing (cyclical)", "China+1 tailwind (current)"], c: [1] },
      { force: "New entrants", v: 6.0, why: "Capital and certification deter casual entry, but PLI subsidises serious entrants continuously.", drivers: ["PLI-subsidised entry", "Certification barrier (niche protection)"], c: [1] },
    ],
    porterRationale: "Attractiveness 5.4 = 10 − weighted pressure. Twin 8.0s (rivalry, buyer power) make commodity EMS structurally unattractive; the score survives only because the certified-niche and solutions tracks face softer versions of both forces.",
    competency: [
      { name: "Automotive-grade quality systems", bosch: 9, req: 9, whyReq: "Safety-part manufacturing gates on IATF-class certification (9)", whyBosch: "Decades of certified Indian plant operation (9)", gap: "none — match", gapWhy: "The moat for the MaaS niche" },
      { name: "Manufacturing digitalisation (I4.0/I5.0)", bosch: 9, req: 7, whyReq: "Factories buy proven digitalisation, not slideware (7)", whyBosch: "Lighthouse internal practice, productisable (9)", gap: "none — exceed", gapWhy: "Solutions business anchor" },
      { name: "EMS cost structure & asset turns", bosch: 4, req: 9, whyReq: "Commodity EMS survives on extreme efficiency (9)", whyBosch: "Tier-1 overhead model; structurally adrift (4)", gap: "skip", gapWhy: "Deliberately avoid the commodity arena entirely" },
      { name: "External-manufacturing commercial GTM", bosch: 3, req: 7, whyReq: "Winning external builds needs dedicated sales & program mgmt (7)", whyBosch: "Never sold manufacturing as a service at scale (3)", gap: "build / hire", gapWhy: "Small dedicated MaaS unit; hire EMS-experienced commercial leads" },
      { name: "High-mix flexible production", bosch: 7, req: 8, whyReq: "MaaS economics need fast changeovers across many SKUs (8)", whyBosch: "Capable plants tuned historically for high-volume single products (7)", gap: "build", gapWhy: "Flexibility retrofit on selected lines" },
    ],
    competencyRationale: "Score 7.0: franchise-level on quality and digitalisation — the two competencies the chosen strategy actually requires — with deliberate skips on commodity-EMS economics. The score reads the strategy, not the whole field. Confidence 0.86.",
    horizons: {
      h1: [
        { item: "Manufacturing-digitalisation solutions to Indian factories", why: "Demand exists today; Bosch practice is reference-grade; software-margin revenue" },
        { item: "Selective automotive-grade contract builds on freed capacity", why: "China+1 inquiries are live; certified capacity is scarce now" },
      ],
      h2: [
        { item: "Scaled MaaS line-of-business with dedicated commercial unit", why: "Needs GTM build-out and flexibility retrofits — 2–3 years to material scale", trigger: "First multi-year anchor contract from a global Tier-1/OEM" },
        { item: "I5.0 human-machine collaboration offerings", why: "Standards and customer maturity arriving over 2–4 years", trigger: "I5.0 adoption appearing in Indian factory capex plans" },
      ],
      h3: [{ item: "Dark/lights-out factories for India", why: "India's labour economics and political context defer full automation beyond 5 years except in niche hazardous processes", trigger: "Automation cost crossing labour-cost parity in target processes" }],
      rationale: "Score 6.6: solid H1 (both tracks revenue-ready), credible H2 scale-up, but H3 is genuinely distant in India. Growth is real yet bounded by the deliberate niche scope.",
    },
    verdict: {
      entry: "Two-track entry under strict scope discipline: certified-capacity MaaS for China+1 customers plus manufacturing-digitalisation solutions; explicit no-go on commodity EMS; revisit scope annually against margin performance.",
      reasoning: [
        "Market 7.2 and Competency 7.0 justify entry — but only because the strategy targets the certified niche where both scores actually apply",
        "Porter 5.4 is the portfolio's bluntest warning: twin 8.0 forces in commodity EMS — the scope discipline IS the risk management",
        "Horizons 6.6 and SWOT 6.4 support a bounded capacity-utilisation-plus-solutions play rather than an EMS empire — hence EXPLORE, not ENTER",
      ],
      portfolio: [
        { sub: "Contract Mfg (MaaS)", play: "LEAD", why: "Certified spare capacity for China+1 — the scarce-asset play" },
        { sub: "Industry 5.0", play: "LEAD", why: "Digitalisation solutions — software margins on manufacturing know-how" },
        { sub: "EMS", play: "PARTNER", why: "Commodity EMS via partnerships/customer role only — never head-on" },
        { sub: "Dark Factories", play: "WATCH", why: "India labour economics defer it; track automation-cost parity" },
      ],
      risks: ["Margin dilution if scope discipline erodes under growth pressure", "EMS champions moving up into automotive-grade certification", "Capacity windows closing as powertrain volumes hold longer than planned"],
    },
    activity: [
      { d: "Jun 06, 2026", t: "EMS major announces automotive-grade facility targeting global Tier-1 China+1 demand", s: "Mint" },
      { d: "May 27, 2026", t: "Component PLI review adds incentive window for precision auto-electronics", s: "Economic Times" },
      { d: "May 16, 2026", t: "Global Tier-1 shifts ECU assembly volumes to Indian contract manufacturer", s: "ET Auto" },
      { d: "May 05, 2026", t: "Factory-digitalisation spending survey shows record Indian capex intent", s: "Business Standard" },
    ],
    sources: ["PLI disbursement & China+1 flows", "EMS player financials & margins", "Manufacturing employment policy notes", "I4.0/I5.0 adoption studies", "BRSR/green-manufacturing requirements", "IATF/liability frameworks", "EMS market forecasts", "Capacity announcement trackers"],
  },

  fintech: {
    ma: ["AI Cockpit", "SW & Services", "Solutions in Tech Stack"], bbm: ["SW System for SdV", "Future Vehicle System for SdV"],
    criterionScores: [
      { ...WEIGHTS[0], s: 5.2, conf: 0.82, why: "Strong vehicle-data and cockpit integration assets, but zero licensed-financial-services competency — the field's core. See Competency tab." },
      { ...WEIGHTS[1], s: 6.0, conf: 0.76, why: "Unique vehicle-side position vs regulatory-licence absence; partnerships resolve it if structured early. See SWOT tab." },
      { ...WEIGHTS[2], s: 7.4, conf: 0.70, why: "UPI rails + vehicle commerce + UBI insurance create a fast-growing pool, with Bosch capturing the enablement layer. See Market tab." },
      { ...WEIGHTS[3], s: 5.6, conf: 0.80, why: "The smartphone substitute is the defining force; the vehicle-integration niche is defensible. See Attractiveness tab." },
      { ...WEIGHTS[4], s: 7.0, conf: 0.80, why: "In-vehicle UPI near, UBI insurance and vehicle identity next, monetisation platforms later. See 3 Horizons tab." },
    ],
    pestel: {
      Political: [{ p: "India's DPI (UPI, FASTag, Account Aggregator, VAHAN) is state-built rails for vehicle commerce", why: "NPCI rails and government registries mean vehicle payments and identity ride public infrastructure, not private walled gardens [1]", sowhat: "Build ON the rails (UPI in-vehicle, VAHAN-linked identity) rather than building rails — uniquely low-cost entry vs other markets", i: "high", c: [1] }],
      Economic: [{ p: "Vehicle-linked financial flows (tolls, charging, insurance, financing) are massive and digitising", why: "FASTag normalised in-vehicle payments; EV charging adds a new payment surface; UBI insurance pilots grow [2]", sowhat: "The enablement layer (secure vehicle identity, payment HW/SW, data feeds) is the Bosch-capturable slice of a huge flow", i: "high", c: [2] }],
      Social: [{ p: "Indians pay by UPI reflexively — in-vehicle payment friction is now an anomaly", why: "QR-scanning at toll/parking/charging is the workaround; seamless in-vehicle payment matches established behaviour [3]", sowhat: "In-vehicle UPI is a when-not-if feature — first credible automotive-grade implementation wins the socket", i: "medium", c: [3] }],
      Technological: [{ p: "Secure elements + vehicle identity make the car a trusted payment device", why: "Automotive-grade secure hardware, DPDP-compliant consent and VAHAN-anchored identity solve fraud/UX problems fintechs can't from outside [4]", sowhat: "Vehicle-side trust infrastructure is exactly Tier-1 territory — the 'Vehicle Aadhar' sub-field formalises it", i: "high", c: [4] }],
      Environmental: [{ p: "EV-transition financing gaps (battery risk) need data to price", why: "Lenders/insurers struggle with battery residual risk; verified vehicle data unlocks credit and UBI products [5]", sowhat: "Bosch battery/vehicle data feeds become financial-product inputs — bridges to Energy & Sustainability fields", i: "medium", c: [5] }],
      Legal: [{ p: "RBI/IRDAI licensing perimeter strictly gates financial activities", why: "Payments, lending and insurance require licences and compliance infrastructure far from Bosch's footprint [6]", sowhat: "Hard boundary: Bosch enables, partners execute regulated activities — structure every deal accordingly", i: "high", c: [6] }],
    },
    swot: {
      S: [
        { p: "Vehicle-side trust position: secure ECUs, cockpit integration, verified vehicle data", why: "Payments and insurance products need tamper-resistant vehicle data and seamless cockpit UX — Tier-1 home ground, hooks mapped (AI Cockpit, Tech Stack)", sowhat: "Own the in-vehicle enablement layer that every fintech partner must rent" },
        { p: "OEM relationships to bundle fintech features at platform level", why: "Fintech entrants negotiate per-OEM from outside; Bosch is already in the platform conversations", sowhat: "Package payment/insurance enablement into cockpit & SdV deals already in motion" },
      ],
      W: [
        { p: "No financial-services licences, compliance infrastructure or risk culture", why: "RBI/IRDAI perimeters require institutional capabilities entirely absent from Bosch", sowhat: "Never carry regulated risk; partner with banks/insurers/NPCI ecosystem from day one" },
        { p: "No consumer-fintech brand or user base", why: "Payment apps win on network effects Bosch doesn't have", sowhat: "Stay invisible infrastructure; let partners own the consumer relationship" },
      ],
      O: [
        { p: "In-vehicle UPI as the first credible automotive payment implementation", why: "NPCI openness + OEM feature races create a near-term window for an automotive-grade reference implementation", sowhat: "Build it with NPCI-ecosystem partners and 1–2 OEM launches — socket ownership compounds" },
        { p: "UBI insurance & EV-financing data products", why: "Insurers/lenders actively seek verified vehicle/battery data; regulatory sandboxes welcome pilots", sowhat: "Monetise data feeds + scoring infrastructure — recurring, licence-free revenue" },
      ],
      T: [
        { p: "Fintech giants or NPCI itself standardising in-vehicle payment", why: "If the rails standardise a generic solution, the enablement premium collapses", sowhat: "Move early; anchor differentiation in automotive-grade security & UX, not payment processing" },
        { p: "OEM captives building fintech subsidiaries", why: "OEM finance arms may internalise vehicle commerce", sowhat: "Position as their enabling infrastructure too — captives are customers in this strategy" },
      ],
      strategy: "Enable, never bank: own in-vehicle payment & identity infrastructure (UPI, secure elements, Vehicle-Aadhar-class identity) and verified-data products for insurers/lenders, with regulated activities always carried by licensed partners.",
      scoreRationale: "Score 6.0: a genuinely unique vehicle-side position offset by a hard regulatory boundary. The strategy converts the boundary into a partnership structure — workable but execution-sensitive.",
    },
    market: {
      tam: 3100, sam: 600, cagr: 26, year: 2030,
      derivation: [
        { step: "Vehicle-linked financial-flow enablement value 2030 (payments infra, UBI tech, identity, monetisation)", value: "$3.1B", src: "Flow-based enablement estimates [7]" },
        { step: "Of which in-vehicle payment & identity infrastructure", value: "~$0.9B", src: "Estimate" },
        { step: "Serviceable filter: vehicle-side enablement (HW security, SW, data feeds) excl. regulated revenue pools", value: "≈19% of TAM", src: "Estimate" },
        { step: "= SAM (2030)", value: "$0.6B", src: "Derived — estimate" },
      ],
      crossCheck: "Sanity check: FASTag alone processes multi-billion-dollar annual flows; basis-points-equivalent enablement value across payment+insurance+identity supports a $3B-class enablement TAM [2][7].",
      customers: [
        { s: "OEMs", buy: "In-vehicle payment & identity stacks", note: "Bundled into cockpit/SdV platform deals" },
        { s: "Insurers & lenders", buy: "Verified vehicle/battery data, UBI scoring infra", note: "Sandbox-friendly pilot partners" },
        { s: "Fintechs & NPCI ecosystem", buy: "Automotive-grade integration", note: "They rent the vehicle-side trust layer" },
      ],
      scoreRationale: "Score 7.4: fast growth (26%) on India's unique DPI rails, but the licence-free enablement slice is only $0.6B. Confidence 0.70: flow-to-enablement conversion ratios are heavily estimated.",
    },
    porter: [
      { force: "Rivalry", v: 6.0, why: "Fintech giants dominate payments broadly but none owns automotive-grade vehicle integration; rivalry inside the niche is currently low.", drivers: ["Fintech giants (adjacent)", "Niche under-occupied today"], c: [8] },
      { force: "Supplier power", v: 4.0, why: "Secure elements and cloud inputs are competitive markets; NPCI rails are public infrastructure.", drivers: ["Public rails", "Competitive components"], c: [1] },
      { force: "Buyer power", v: 6.5, why: "OEMs and financial institutions both negotiate hard; but socket ownership post-integration restores leverage.", drivers: ["Dual-sided negotiation", "Post-integration stickiness"], c: [2] },
      { force: "Substitutes", v: 7.0, why: "The smartphone IS the substitute — QR scanning works today. In-vehicle payment must beat 'good enough' phone behaviour on convenience.", drivers: ["Phone+QR incumbent behaviour", "Convenience bar to clear"], c: [3] },
      { force: "New entrants", v: 6.0, why: "Fintech entry is cheap, automotive-grade integration is not; the niche walls are real but not tall.", drivers: ["Cheap fintech entry", "Automotive integration barrier"], c: [4] },
    ],
    porterRationale: "Attractiveness 5.6 = 10 − weighted pressure. The smartphone substitute (7.0) is the defining force — the entire field must out-convenience a phone. The under-occupied niche and public rails partially compensate.",
    competency: [
      { name: "Vehicle secure elements & identity", bosch: 8, req: 8, whyReq: "Payments from the vehicle require hardware trust anchors (8)", whyBosch: "Secure ECU/HSM competence in production (8)", gap: "none — match", gapWhy: "Foundation of the enablement play" },
      { name: "Cockpit payment UX integration", bosch: 7, req: 8, whyReq: "Must beat phone-QR convenience decisively (8)", whyBosch: "Cockpit/HMI assets strong; payment-specific UX new (7)", gap: "build", gapWhy: "Joint design with NPCI-ecosystem partners" },
      { name: "Licensed financial operations", bosch: 1, req: 9, whyReq: "Regulated activities need licences & compliance institutions (9)", whyBosch: "Absent by design (1)", gap: "partner", gapWhy: "Hard boundary — banks/insurers carry all regulated risk" },
      { name: "Verified vehicle-data products", bosch: 8, req: 7, whyReq: "UBI/financing products need trustworthy telemetry (7)", whyBosch: "Vehicle & battery data assets across fields (8)", gap: "none — exceed", gapWhy: "Recurring data-revenue line" },
      { name: "Fintech-ecosystem GTM", bosch: 3, req: 7, whyReq: "Deals are struck in NPCI/fintech circles, not automotive ones (7)", whyBosch: "No presence in that ecosystem (3)", gap: "hire / partner", gapWhy: "Small BD team embedded in the fintech ecosystem" },
    ],
    competencyRationale: "Score 5.2: strong on every vehicle-side competency, near-zero on the financial-services ones — the most bimodal profile in the portfolio. The partnership structure is what makes the field playable at all. Confidence 0.82.",
    horizons: {
      h1: [{ item: "Verified vehicle/battery data feeds to insurers & lenders", why: "Demand exists now via sandboxes; licence-free; rides existing data assets" }],
      h2: [
        { item: "In-vehicle UPI reference implementation with OEM launches", why: "Rails ready, OEM feature races active; automotive-grade build takes 1–2 years", trigger: "NPCI ecosystem certification for an automotive payment flow" },
        { item: "Vehicle-Aadhar-class identity infrastructure", why: "VAHAN-anchored vehicle identity needs standardisation rounds — 2–4 years", trigger: "Government/NPCI standardisation initiative for vehicle digital identity" },
      ],
      h3: [{ item: "Vehicle monetisation platforms (ads, leasing compute, in-car commerce)", why: "Requires mature in-vehicle ecosystems and consumer trust — 5+ years to material India revenue", trigger: "In-car commerce GMV reaching measurable scale" }],
      rationale: "Score 7.0: H1 monetises existing assets immediately, H2 holds two well-timed India-specific windows, H3 is real but distant. Growth gated by partnership execution rather than technology.",
    },
    verdict: {
      entry: "Enable-never-bank entry: data products now, in-vehicle UPI + vehicle identity with NPCI-ecosystem and OEM partners next; regulated activities always with licensed institutions; embed fintech BD capability.",
      reasoning: [
        "Market 7.4 and Horizons 7.0 show a fast-growing, India-unique opportunity riding public rails",
        "Competency 5.2 (heaviest weight) is the honest drag — the bimodal profile demands the partnership structure the entry mode specifies",
        "Porter 5.6's smartphone-substitute warning shapes the product bar: only build what beats phone-QR convenience decisively",
      ],
      portfolio: [
        { sub: "In-Vehicle Payment", play: "LEAD", why: "UPI enablement layer — first-credible-implementation window" },
        { sub: "Insurance", play: "PARTNER", why: "Data & scoring infra to licensed insurers; never carry risk" },
        { sub: "Vehicle Aadhar", play: "PARTNER", why: "Co-build identity standard with government/NPCI ecosystem" },
        { sub: "Vehicle Monetization", play: "WATCH", why: "H3 timing; revisit when in-car commerce shows traction" },
      ],
      risks: ["NPCI/fintech-giant standardisation collapsing the enablement premium", "Smartphone convenience ceiling capping in-vehicle payment adoption", "Partnership economics leaving thin margins for the enabler"],
    },
    activity: [
      { d: "Jun 04, 2026", t: "NPCI ecosystem update discusses in-vehicle payment certification pathway", s: "Mint" },
      { d: "May 26, 2026", t: "Insurer launches UBI pilot using OEM telematics data in regulatory sandbox", s: "Economic Times" },
      { d: "May 15, 2026", t: "EV charging network integrates auto-pay; OEM cockpit integration announced", s: "ET Auto" },
      { d: "May 03, 2026", t: "VAHAN-linked digital vehicle-identity consultation paper circulated", s: "Business Standard" },
    ],
    sources: ["NPCI/UPI/FASTag/AA architecture", "Vehicle-linked financial-flow data", "Payment-behaviour studies", "Secure-element & identity briefings", "EV-financing risk analyses", "RBI/IRDAI perimeter guidance", "Enablement-market estimates", "Fintech competitive trackers"],
  },

  infrastructure: {
    ma: ["SW & Services", "Solutions in Tech Stack"], bbm: ["SW System for SdV", "Future Vehicle System for SdV"],
    criterionScores: [
      { ...WEIGHTS[0], s: 6.8, conf: 0.84, why: "Global tolling/ITS heritage + V2X stack + map-data partnerships; gap at India public-procurement muscle. See Competency tab." },
      { ...WEIGHTS[1], s: 6.4, conf: 0.78, why: "Technology leadership vs B2G execution risk; the MLFF transition is the asymmetric opportunity. See SWOT tab." },
      { ...WEIGHTS[2], s: 6.8, conf: 0.72, why: "$1.3B SAM across tolling, ITS, V2X with the GNSS-tolling transition as the step-change. See Market tab." },
      { ...WEIGHTS[3], s: 6.2, conf: 0.80, why: "Government monopsony and integrator competition, offset by technology barriers in MLFF/V2X. See Attractiveness tab." },
      { ...WEIGHTS[4], s: 7.4, conf: 0.82, why: "MLFF tolling imminent, V2X corridors next, intermodal orchestration later. See 3 Horizons tab." },
    ],
    pestel: {
      Political: [{ p: "GNSS-based barrier-free (MLFF) tolling is policy direction, replacing FASTag plazas", why: "NHAI pilots and policy statements target satellite-based tolling — a nationwide system transition [1]", sowhat: "Bosch's global GNSS-tolling experience meets a once-in-a-generation Indian system build — the field's defining opportunity", i: "high", c: [1] }],
      Economic: [{ p: "Record highway & urban-transport capex with ITS components embedded", why: "National infrastructure pipeline allocates explicitly to smart corridors, traffic management and electronic enforcement [2]", sowhat: "Funded demand exists; the contest is procurement access, not budget creation", i: "high", c: [2] }],
      Social: [{ p: "Urban congestion & road-safety pressure make ITS politically visible", why: "Indian cities top global congestion indices; road-fatality reduction is a stated national mission [3]", sowhat: "Safety-framed ITS (V2X for VRUs, enforcement tech) aligns commercial offers with political priorities", i: "medium", c: [3] }],
      Technological: [{ p: "C-V2X has won the standards contest; Indian corridor pilots underway", why: "Global C-V2X consolidation removes technology ambiguity; NHAI/smart-city pilots test infrastructure-side deployment [4]", sowhat: "Vehicle-side V2X (Bosch ECU/connectivity assets) + infrastructure-side partnerships can be packaged now", i: "high", c: [4] }],
      Environmental: [{ p: "EV-charging discoverability & routing is an infrastructure-data problem", why: "Charger reliability/availability data quality limits EV adoption; map-service integration is the fix [5]", sowhat: "Map-services-for-charging sub-field bridges to the Energy field — shared offer architecture", i: "medium", c: [5] }],
      Legal: [{ p: "B2G procurement rules (L1 bias, localisation clauses) shape who can win", why: "Public tenders weight price and local content heavily; consortium structures are often mandatory [6]", sowhat: "Partner with Indian system integrators for tender access; Bosch as technology provider inside consortia", i: "high", c: [6] }],
    },
    swot: {
      S: [
        { p: "Global tolling & ITS deployment heritage directly relevant to MLFF", why: "Bosch group has delivered GNSS tolling and enforcement systems in other markets — proven reference architecture", sowhat: "Lead the technology layer of India's MLFF transition via consortium structures" },
        { p: "Vehicle-side V2X readiness (connectivity HW, ECUs, SdV stack)", why: "The vehicle half of V2X is existing Bosch territory; few infrastructure players own it", sowhat: "Sell the only credible both-sides-of-the-air-gap V2X story" },
      ],
      W: [
        { p: "Thin Indian public-procurement track record and B2G muscle", why: "NHAI/smart-city tendering rewards incumbent system integrators (BEL-class, large EPC) with relationship depth", sowhat: "Never bid alone; embed in consortia with established Indian primes" },
        { p: "Long, politically-exposed sales cycles strain business-case patience", why: "B2G timelines slip with election cycles and litigation", sowhat: "Portfolio the pipeline; price patience into business cases" },
      ],
      O: [
        { p: "MLFF system transition reopens the entire tolling stack", why: "GNSS tolling obsoletes plaza infrastructure — every layer (OBU, backend, enforcement) gets re-sourced", sowhat: "Asymmetric prize: technology leadership matters more than incumbency in a system replacement" },
        { p: "Charging-map data services for the EV transition", why: "Reliable charger data is scarce and valuable; OEMs and CPOs both need it", sowhat: "Commercial (non-B2G) revenue line with faster cycles — balances the portfolio" },
      ],
      T: [
        { p: "Indian system integrators + global ITS rivals locking consortium slots", why: "MLFF consortia are forming now; technology-partner slots are finite", sowhat: "Secure consortium positions within 12 months or watch the window close" },
        { p: "L1 price-bias squeezing technology margins", why: "Lowest-bid procurement rewards cost-cutters over technology depth", sowhat: "Anchor differentiation in lifecycle performance guarantees, not capex price" },
      ],
      strategy: "Consortium-led: technology provider inside Indian-prime-led MLFF and ITS consortia; both-sides V2X packaging; commercial charging-map data services as the fast-cycle balance.",
      scoreRationale: "Score 6.4: real technology leadership meeting a hard procurement reality. The MLFF window is the asymmetric upside; B2G execution risk is the persistent drag.",
    },
    market: {
      tam: 4600, sam: 1300, cagr: 19, year: 2030,
      derivation: [
        { step: "India ITS + tolling + V2X + mobility-data infrastructure spend 2030", value: "$4.6B/yr", src: "Infrastructure pipeline allocations; estimate [7]" },
        { step: "Of which MLFF transition (OBUs, backend, enforcement)", value: "~$1.4B cumulative through transition", src: "System-replacement estimates [1]" },
        { step: "Serviceable filter: technology layers Bosch-addressable (excl. civil works, telecom carriage)", value: "≈28% of TAM", src: "Estimate" },
        { step: "= SAM (2030)", value: "$1.3B", src: "Derived — estimate" },
      ],
      crossCheck: "Sanity check: FASTag ecosystem economics and NHAI toll collections imply tolling-tech spend alone in the hundreds of millions annually — consistent with the MLFF slice [1][7].",
      customers: [
        { s: "NHAI / state authorities", buy: "MLFF tolling tech, enforcement, traffic mgmt", note: "Via consortia — never direct-alone" },
        { s: "OEMs", buy: "V2X vehicle-side stacks, charging-map integration", note: "Commercial channel, faster cycles" },
        { s: "Smart cities & operators", buy: "ITS solutions, parking, intermodal data", note: "Fragmented but recurring" },
      ],
      scoreRationale: "Score 6.8: sizeable SAM with the MLFF step-change, discounted for B2G margin and timing risk. Confidence 0.72: pipeline allocations firm, transition timing uncertain.",
    },
    porter: [
      { force: "Rivalry", v: 7.0, why: "Global ITS players, Indian primes and telecom-backed entrants all circle MLFF; consortium formation is the current battlefield.", drivers: ["Global ITS rivals", "Indian primes", "Consortium races"], c: [8] },
      { force: "Supplier power", v: 4.0, why: "Hardware and connectivity inputs are competitive; Bosch internalises several.", drivers: ["Competitive components", "Vertical coverage"], c: [4] },
      { force: "Buyer power", v: 8.0, why: "Government monopsony with L1 bias — the single most powerful buyer type in the portfolio.", drivers: ["Monopsony tendering", "L1 price bias", "Political timeline control"], c: [6] },
      { force: "Substitutes", v: 3.5, why: "No real substitute for tolling/ITS infrastructure; the substitution is generational (plaza→GNSS) and is the opportunity.", drivers: ["Function mandatory", "Generational tech swap = opportunity"], c: [1] },
      { force: "New entrants", v: 5.5, why: "Technology and references gate entry, but well-funded consortia and telecom players can assemble capability quickly.", drivers: ["Reference barrier", "Well-funded consortium entrants"], c: [8] },
    ],
    porterRationale: "Attractiveness 6.2 = 10 − weighted pressure. Government buyer power (8.0) dominates and defines the field; near-absent substitutes and a generational tech swap create the offsetting upside. Attractive only inside the right consortium.",
    competency: [
      { name: "Tolling / GNSS systems", bosch: 8, req: 9, whyReq: "MLFF is a nationwide GNSS-tolling system build (9)", whyBosch: "Group GNSS-tolling deployments elsewhere; India localisation needed (8)", gap: "build / partner", gapWhy: "Localise reference architecture inside a consortium" },
      { name: "ITS & traffic management", bosch: 7, req: 8, whyReq: "Smart corridors, enforcement, traffic optimisation (8)", whyBosch: "ITS portfolio exists; India-scale deployment thinner (7)", gap: "build", gapWhy: "Scale via consortium delivery" },
      { name: "V2X (vehicle + infrastructure)", bosch: 8, req: 8, whyReq: "C-V2X across both vehicle and roadside (8)", whyBosch: "Vehicle-side strong; roadside via partners (8)", gap: "partner", gapWhy: "Both-sides story is the differentiator" },
      { name: "Indian B2G procurement & delivery", bosch: 3, req: 9, whyReq: "Winning public tenders needs relationships, consortium craft, L1 navigation (9)", whyBosch: "Limited public-procurement track record (3)", gap: "partner", gapWhy: "Indian prime carries the procurement relationship — biggest gap" },
      { name: "Map & geospatial data services", bosch: 7, req: 7, whyReq: "Charging/routing data products need geospatial depth (7)", whyBosch: "Map-data partnerships and SdV navigation assets (7)", gap: "none — match", gapWhy: "Fast-cycle commercial line" },
    ],
    competencyRationale: "Score 6.8: strong technology competencies across tolling, ITS and V2X, undercut by the decisive B2G-procurement gap that only a consortium partner closes. Confidence 0.84: technology levels verifiable; procurement gap clear-eyed.",
    horizons: {
      h1: [
        { item: "Charging-map & routing data services to OEMs/CPOs", why: "Commercial demand now; fast cycles; rides existing map/navigation assets" },
        { item: "ITS components into ongoing smart-corridor projects", why: "Funded projects are live; consortium entry possible today" },
      ],
      h2: [
        { item: "MLFF tolling technology inside winning consortia", why: "Policy direction set; national rollout sourcing lands over 2–4 years", trigger: "NHAI issuing national MLFF tenders beyond pilots" },
        { item: "C-V2X safety corridors (vehicle + roadside)", why: "Standards settled, pilots running; volume deployment 2–4 years out", trigger: "State/NHAI committing to V2X-equipped corridor at scale" },
      ],
      h3: [{ item: "Intermodal mobility orchestration platforms", why: "Multi-modal integration needs institutional and data-sharing maturity across agencies — 5+ years", trigger: "City adopting a unified intermodal mobility data platform" }],
      rationale: "Score 7.4: H1 has a commercial fast-cycle line plus live projects; H2 holds the MLFF and V2X step-changes with observable triggers; H3 is institutionally gated. Growth real, partly B2G-paced.",
    },
    verdict: {
      entry: "Consortium-led entry: secure technology-partner slots in Indian-prime MLFF/ITS consortia; package both-sides V2X; run charging-map data services as the fast-cycle commercial balance; move on consortium positions within 12 months.",
      reasoning: [
        "Horizons 7.4 and the MLFF asymmetric prize (technology > incumbency in a system replacement) drive the upside",
        "Competency 6.8 is strong on technology but the B2G-procurement gap is decisive — hence consortium-only, never solo bids",
        "Porter 6.2 with government buyer power at 8.0 confirms the field is attractive only from inside the right partnership",
      ],
      portfolio: [
        { sub: "Tolling & Parking", play: "LEAD", why: "MLFF transition — the field's asymmetric, technology-led prize" },
        { sub: "V2X", play: "LEAD", why: "Both-sides story is uniquely Bosch; safety corridors emerging" },
        { sub: "Map Services", play: "LEAD", why: "Charging-data services — fast-cycle commercial revenue, Energy synergy" },
        { sub: "Urban Traffic Mgmt", play: "PARTNER", why: "ITS via consortia with Indian primes" },
        { sub: "Intermodal", play: "WATCH", why: "Institutionally gated; revisit on unified-platform adoption" },
      ],
      risks: ["Consortium slots filled before Bosch secures positions", "MLFF rollout timeline slipping with political cycles", "L1 price-bias compressing technology margins"],
    },
    activity: [
      { d: "Jun 05, 2026", t: "NHAI expands GNSS-tolling pilot to additional highway stretches", s: "Economic Times" },
      { d: "May 28, 2026", t: "State announces C-V2X safety-corridor tender for accident-prone highway", s: "ET Auto" },
      { d: "May 17, 2026", t: "OEM partners with map provider for real-time charger availability data", s: "Mint" },
      { d: "May 06, 2026", t: "Smart-city mission review prioritises traffic-management and enforcement tech", s: "Business Standard" },
    ],
    sources: ["NHAI MLFF policy & pilots", "Infrastructure capex allocations", "Congestion & road-safety data", "C-V2X standards & corridor pilots", "EV charging-data quality studies", "B2G procurement rules", "ITS market forecasts", "Consortium & tender trackers"],
  },

  sustainability: {
    ma: ["SW & Services", "Solutions in Tech Stack"], bbm: ["Circular Economy"],
    criterionScores: [
      { ...WEIGHTS[0], s: 6.0, conf: 0.82, why: "Battery diagnostics, residual-value data and workshop network fit recycling/second-life; no recycling-process franchise. See Competency tab." },
      { ...WEIGHTS[1], s: 5.8, conf: 0.78, why: "Workshop + data strengths and the Circular-Economy BBM stream vs nascent markets and policy-dependence. See SWOT tab." },
      { ...WEIGHTS[2], s: 6.0, conf: 0.68, why: "EPR-driven and growing fast, but small near-term base; the data/diagnostics slice is the Bosch-fit part. See Market tab." },
      { ...WEIGHTS[3], s: 6.4, conf: 0.78, why: "Early-stage field with few entrenched players; regulation creates structured demand. See Attractiveness tab." },
      { ...WEIGHTS[4], s: 7.2, conf: 0.80, why: "Recycling/EPR now, second-life and residual-value next, carbon and right-to-repair platforms later. See 3 Horizons tab." },
    ],
    pestel: {
      Political: [{ p: "Battery Waste Management Rules mandate EPR; Right-to-Repair policy advancing", why: "MoEFCC EPR targets create compliance obligations; a national Right-to-Repair framework is in motion for automobiles [1]", sowhat: "Regulation manufactures demand for traceability, diagnostics and second-life — the data layer Bosch can own", i: "high", c: [1] }],
      Economic: [{ p: "EV battery value retention is a major TCO and financing lever", why: "Battery is ~40% of EV cost; second-life and accurate residual valuation unlock fleet economics and resale markets [2]", sowhat: "Residual-value estimation and second-life enablement are monetisable data services with cross-field synergy (Energy, Fintech)", i: "high", c: [2] }],
      Social: [{ p: "Sustainability disclosure pressure rises but consumer willingness-to-pay lags", why: "Corporate BRSR/scope-3 demands outpace individual buyers' green premium in price-sensitive India [3]", sowhat: "Target B2B/regulatory-driven demand (OEMs, fleets, compliance), not consumer green premiums", i: "medium", c: [3] }],
      Technological: [{ p: "Battery diagnostics + traceability are the technical heart of circularity", why: "Second-life grading, recycling routing and residual valuation all depend on accurate battery-state data and lifecycle traceability [4]", sowhat: "Bosch BMS/diagnostics + workshop network can generate and certify exactly this data — the defensible position", i: "high", c: [4] }],
      Environmental: [{ p: "Circular-economy mandates are the field's entire reason for being", why: "Carbon accounting, recycled-content rules and producer responsibility are tightening across the value chain [5]", sowhat: "Aligns directly with the mapped Circular-Economy BBM stream — strategic coherence", i: "high", c: [5] }],
      Legal: [{ p: "Carbon-credit & EPR compliance frameworks still maturing — rule risk is high", why: "Carbon markets and EPR mechanics in India are evolving; standards and pricing are unsettled [6]", sowhat: "Build flexible, standards-agnostic platforms; avoid betting on any single immature mechanism", i: "high", c: [6] }],
    },
    swot: {
      S: [
        { p: "Battery diagnostics + 10,000-workshop network for collection, grading and certification", why: "Second-life and recycling need trusted physical touchpoints and battery-state data — Bosch uniquely has both", sowhat: "Own the diagnostics-and-collection layer that recyclers and second-life operators depend on" },
        { p: "Cross-field data assets (battery health from Energy, vehicle data from Connectivity)", why: "Residual valuation and circularity scoring reuse data Bosch already generates elsewhere", sowhat: "Productise residual-value and circularity-scoring services — low marginal cost, recurring" },
      ],
      W: [
        { p: "No recycling-process technology or plant franchise", why: "Hydrometallurgical recycling and material recovery are specialist domains Bosch doesn't operate", sowhat: "Partner with recyclers; own the data/diagnostics/collection layer, not the chemistry" },
        { p: "Markets are nascent and policy-dependent", why: "Revenue today is thin; scale depends on EPR enforcement and second-life market formation", sowhat: "Patient, optionality-led entry; size investment to current evidence, scale on triggers" },
      ],
      O: [
        { p: "EPR enforcement creating a compliance-traceability market", why: "Producers must prove collection/recycling; nobody owns the automotive traceability layer yet", sowhat: "First-mover on battery/component traceability-as-a-service — regulation guarantees demand" },
        { p: "Second-life battery enablement for stationary storage & charging", why: "Graded second-life packs can buffer charging infrastructure — bridges to Energy field", sowhat: "Diagnostics + grading + matching platform; Bosch certifies, partners deploy" },
      ],
      T: [
        { p: "Pure-play recyclers & startups integrating diagnostics themselves", why: "Recyclers (Attero/Lohum-class) add grading/diagnostics to capture more value", sowhat: "Move first on the data layer; partner with recyclers before they build it" },
        { p: "Policy/standard volatility undermining business cases", why: "Immature carbon and EPR mechanics can shift, stranding investments", sowhat: "Standards-agnostic platforms; avoid mechanism-specific bets" },
      ],
      strategy: "Own the data & diagnostics layer of circularity (battery traceability, second-life grading, residual valuation) using the workshop network; partner recyclers for process; build standards-agnostic platforms; scale on EPR-enforcement triggers.",
      scoreRationale: "Score 5.8: distinctive workshop+data strengths and strong BBM-stream alignment, but nascent markets and policy-dependence cap the near-term case. A patient, optionality-rich position.",
    },
    market: {
      tam: 2400, sam: 500, cagr: 30, year: 2030,
      derivation: [
        { step: "India battery recycling + second-life + residual/circularity services 2030", value: "$2.4B", src: "EPR-driven market forecasts; estimate [7]" },
        { step: "Of which diagnostics, traceability, grading & valuation services", value: "~$0.7B", src: "Service-layer split; estimate" },
        { step: "Serviceable filter: data/diagnostics/collection Bosch-addressable (excl. recycling process value)", value: "≈21% of TAM", src: "Estimate" },
        { step: "= SAM (2030)", value: "$0.5B", src: "Derived — estimate" },
      ],
      crossCheck: "Sanity check: end-of-life EV battery volumes ramp sharply post-2027 as first EV cohorts retire; a $2B-class 2030 circular market with 30% CAGR is consistent with that retirement curve [2][7].",
      customers: [
        { s: "OEMs & battery makers (EPR-obligated)", buy: "Traceability, compliance, collection services", note: "Regulation guarantees the demand" },
        { s: "Recyclers & second-life operators", buy: "Diagnostics, grading, matching platforms", note: "Coopetition — they need the data layer" },
        { s: "Fleets, lenders, insurers", buy: "Residual-value & circularity scoring", note: "Cross-field (Fintech, Energy) synergy" },
      ],
      scoreRationale: "Score 6.0: very high growth (30%) but the smallest near-term base; the Bosch-fit service slice is $0.5B. Confidence 0.68: retirement curves and service splits are heavily estimated, policy timing uncertain.",
    },
    porter: [
      { force: "Rivalry", v: 5.0, why: "Field is early; recyclers, startups and OEM programmes coexist without entrenched dominance in the data layer.", drivers: ["Early-stage field", "Data layer under-occupied"], c: [8] },
      { force: "Supplier power", v: 4.0, why: "Inputs (collected batteries, data) are abundant as the parc ages; no chokepoint.", drivers: ["Growing feedstock", "Abundant data inputs"], c: [2] },
      { force: "Buyer power", v: 5.5, why: "EPR-obligated buyers need compliance solutions and have limited alternatives early — moderate leverage to the solution provider.", drivers: ["Compliance-driven demand", "Few early alternatives"], c: [1] },
      { force: "Substitutes", v: 5.0, why: "Manual grading and in-house compliance are substitutes, but they scale poorly against the coming battery-retirement wave.", drivers: ["Manual processes (don't scale)", "In-house compliance attempts"], c: [4] },
      { force: "New entrants", v: 6.5, why: "Low capital for software/data entry attracts startups; the differentiator is data access and certification trust, which Bosch's network provides.", drivers: ["Cheap data/SW entry", "Data-access & trust as the moat"], c: [8] },
    ],
    porterRationale: "Attractiveness 6.4 = 10 − weighted pressure. An early field with no dominant incumbent and regulation-manufactured demand makes it structurally attractive; the main pressure is future new entrants, blunted by Bosch's data-access advantage.",
    competency: [
      { name: "Battery diagnostics & state estimation", bosch: 8, req: 8, whyReq: "Accurate state-of-health is the basis of grading/valuation (8)", whyBosch: "BMS & diagnostics competence from Energy field (8)", gap: "none — match", gapWhy: "Technical heart of the data play" },
      { name: "Collection & physical network", bosch: 9, req: 7, whyReq: "Circularity needs trusted physical touchpoints (7)", whyBosch: "10,000+ workshops nationwide (9)", gap: "none — exceed", gapWhy: "Unmatched collection/certification channel" },
      { name: "Recycling process technology", bosch: 2, req: 8, whyReq: "Material recovery needs hydrometallurgy/process plants (8)", whyBosch: "No franchise (2)", gap: "partner", gapWhy: "Partner recyclers; own data not chemistry" },
      { name: "Traceability & compliance platforms", bosch: 7, req: 8, whyReq: "EPR proof needs auditable lifecycle traceability (8)", whyBosch: "Data platforms & SW from Connectivity field (7)", gap: "build", gapWhy: "Standards-agnostic platform build" },
      { name: "Carbon/circularity standards fluency", bosch: 5, req: 7, whyReq: "Carbon credits & circularity scoring need evolving-standards expertise (7)", whyBosch: "Sustainability function exists; mechanism-specific depth thin (5)", gap: "build / hire", gapWhy: "Hire standards expertise; keep platforms flexible" },
    ],
    competencyRationale: "Score 6.0: exceeds on collection network, matches on diagnostics and platforms, deliberately absent on recycling chemistry. The score reads the data-layer strategy correctly. Confidence 0.82.",
    horizons: {
      h1: [{ item: "Battery traceability & EPR-compliance services to obligated producers", why: "EPR obligations are live now; regulation-guaranteed demand; rides data assets" }],
      h2: [
        { item: "Second-life grading & matching platform (stationary storage, charging)", why: "Battery retirements ramp 2027+; second-life market forms over 2–4 years", trigger: "First EV cohorts retiring at volume into second-life channels" },
        { item: "Residual-value estimation services for fleets/lenders/insurers", why: "Demand emerging now; standardisation and data depth mature over 2–3 years", trigger: "Lenders/insurers adopting battery-data-based valuation" },
      ],
      h3: [{ item: "Carbon-credit & circularity-scoring platforms", why: "Depends on maturing Indian carbon markets and circularity standards — 5+ years", trigger: "Stable Indian carbon-market mechanics and pricing" }],
      rationale: "Score 7.2: H1 is regulation-guaranteed today, H2 rides the battery-retirement wave with clear triggers, H3 awaits market maturity. Strong growth gradient on a small base.",
    },
    verdict: {
      entry: "Patient, data-layer entry: lead EPR-traceability and battery diagnostics now via the workshop network; build second-life grading and residual-value services for the retirement wave; partner recyclers; standards-agnostic platforms; scale on EPR-enforcement and retirement-volume triggers.",
      reasoning: [
        "Horizons 7.2 and the regulation-manufactured demand make this a credible optionality play despite a small base",
        "Competency 6.0 confirms a clean data-layer fit (workshop + diagnostics) with recycling chemistry deliberately partnered out",
        "Market 6.0 and SWOT 5.8 cap it at EXPLORE: high growth, but policy-dependence and nascency demand patience over commitment",
      ],
      portfolio: [
        { sub: "Battery 2nd Life & Recycling", play: "LEAD", why: "Diagnostics + collection network — the defensible data layer" },
        { sub: "Residual Value", play: "LEAD", why: "Reuses cross-field battery/vehicle data; Fintech & Energy synergy" },
        { sub: "Right to Repair", play: "PARTNER", why: "Workshop network + diagnostics align with emerging policy; co-shape standards" },
        { sub: "Carbon Credits", play: "WATCH", why: "Market mechanics immature; revisit on stable carbon pricing" },
      ],
      risks: ["EPR/carbon standards shifting and stranding platform bets", "Recyclers integrating diagnostics before partnerships form", "Second-life market forming slower than the retirement curve implies"],
    },
    activity: [
      { d: "Jun 03, 2026", t: "MoEFCC tightens battery EPR collection targets; producers seek traceability solutions", s: "Economic Times" },
      { d: "May 25, 2026", t: "Recycler announces second-life partnership with charging network for storage buffers", s: "Mercom India" },
      { d: "May 14, 2026", t: "Right-to-Repair framework consultation extends to automotive batteries", s: "Business Standard" },
      { d: "May 04, 2026", t: "Fleet operator pilots battery-health-based residual valuation for resale", s: "ET Auto" },
    ],
    sources: ["Battery Waste Mgmt Rules & Right-to-Repair", "EV battery TCO & residual studies", "BRSR/scope-3 disclosure trends", "Battery diagnostics & traceability briefings", "Circular-economy mandate analyses", "Carbon-market & EPR mechanics", "Recycling/second-life market forecasts", "Competitive landscape trackers"],
  },

  evtol: {
    ma: [], bbm: [],
    criterionScores: [
      { ...WEIGHTS[0], s: 5.0, conf: 0.80, why: "Transferable competencies (power electronics, sensing, actuators, safety) but no aerospace certification base — the field's gatekeeper. See Competency tab." },
      { ...WEIGHTS[1], s: 4.6, conf: 0.74, why: "Component-supplier angle exists, but no M&A/BBM hooks and a regulatory environment years from maturity. See SWOT tab." },
      { ...WEIGHTS[2], s: 4.0, conf: 0.62, why: "Near-zero Indian market today; pure 2030+ optionality with very wide forecast error. See Market tab." },
      { ...WEIGHTS[3], s: 5.2, conf: 0.74, why: "Few players and high barriers, but the prize is small and distant in India. See Attractiveness tab." },
      { ...WEIGHTS[4], s: 5.6, conf: 0.72, why: "Almost entirely H3; meaningful India revenue is a 5–10 year proposition. See 3 Horizons tab." },
    ],
    pestel: {
      Political: [{ p: "No Indian eVTOL/UAM certification regime yet; DGCA drone rules are the only adjacent framework", why: "India lacks type-certification, vertiport and air-corridor rules for passenger eVTOL; drone policy is the nearest precedent [1]", sowhat: "Market formation is regulation-gated and years away — this is optionality, not a near-term business", i: "high", c: [1] }],
      Economic: [{ p: "Use-case economics favour cargo/medical before passenger in India", why: "Passenger UAM needs affluent dense corridors; medical-emergency and cargo logistics have clearer near-term value [2]", sowhat: "If Bosch engages, the rational wedge is component supply into cargo/medical platforms, not passenger air-taxi bets", i: "medium", c: [2] }],
      Social: [{ p: "Public-acceptance and noise concerns are unproven in Indian urban contexts", why: "Safety perception, noise and equity questions are unresolved globally and untested in India [3]", sowhat: "Adoption risk compounds regulatory risk — reinforces a wait-and-supply posture", i: "low", c: [3] }],
      Technological: [{ p: "Powertrain, sensing and flight-control electronics overlap with Bosch automotive competencies", why: "Electric propulsion, redundant power electronics, IMUs/sensors and safety-critical control transfer meaningfully from automotive to eVTOL [4]", sowhat: "The credible Bosch angle is aerospace-qualified components, not whole aircraft — leverage transferable tech", i: "high", c: [4] }],
      Environmental: [{ p: "Zero-emission urban-air narrative aligns with electrification but battery energy-density is the binding constraint", why: "Current cell energy density limits payload/range; the same battery progress that helps EVs gates eVTOL [5]", sowhat: "eVTOL viability tracks battery advances Bosch already watches in Energy — shared signal", i: "medium", c: [5] }],
      Legal: [{ p: "Aerospace certification (DGCA/global) is a categorically higher bar than automotive", why: "Type certification, airworthiness and aviation liability regimes require capabilities and timelines beyond automotive norms [6]", sowhat: "Certification is the gatekeeper — component supply to certified primes is the only realistic Bosch route", i: "high", c: [6] }],
    },
    swot: {
      S: [
        { p: "Transferable electric-propulsion, sensing and safety-critical electronics", why: "Bosch's power electronics, IMUs and functional-safety pedigree are genuinely relevant inputs to eVTOL platforms", sowhat: "Position as a component/subsystem supplier to eVTOL primes if and when the market forms" },
        { p: "Battery & thermal know-how shared with the Energy field", why: "The binding eVTOL constraint (battery) is one Bosch already engineers around", sowhat: "Cross-leverage Energy-field investment; no standalone bet required to stay informed" },
      ],
      W: [
        { p: "No aerospace certification, airworthiness or aviation-customer base", why: "Aviation is a distinct regulatory and commercial world Bosch does not operate in", sowhat: "Whole-aircraft or flight-critical-system ambitions are unrealistic; supply non-flight-critical subsystems at most" },
        { p: "No M&A or BBM hooks mapped for this field", why: "Unlike most fields, there is no existing asset to accelerate any move", sowhat: "Entry would be fully greenfield — raising the bar for commitment further" },
      ],
      O: [
        { p: "Cargo & medical-emergency UAM as the realistic first Indian use cases", why: "These avoid passenger-certification complexity and have clearer value in a geography with access gaps", sowhat: "Watch for cargo/medical platform makers needing qualified electric-propulsion components" },
        { p: "Early supplier relationships with global eVTOL primes", why: "Primes are selecting component partners now for the next decade", sowhat: "Optional, low-cost: engage select primes as a watch-and-qualify exercise" },
      ],
      T: [
        { p: "Aerospace-native suppliers and Tier-1s own the certified-component relationships", why: "Honeywell/Garmin-class and aerospace primes have the certification muscle and incumbency", sowhat: "Automotive transferability is necessary but not sufficient — certification incumbents lead" },
        { p: "Market may never reach scale in India this decade", why: "Regulatory, economic and social risks stack multiplicatively", sowhat: "Treat as pure optionality; avoid capital commitment until triggers fire" },
      ],
      strategy: "Watch-and-qualify only: monitor the field, maintain transferable-tech readiness via Energy/sensing investment, and engage global primes as a component supplier if cargo/medical UAM forms; no standalone capital commitment now.",
      scoreRationale: "Score 4.6: real transferable competencies cannot overcome the absence of aerospace certification, M&A hooks and a near-term market. A genuine but low-priority optionality.",
    },
    market: {
      tam: 600, sam: 80, cagr: 35, year: 2030,
      derivation: [
        { step: "India UAM/eVTOL market 2030 (optimistic, cargo+medical-led)", value: "$0.6B", src: "Speculative forecasts, wide range; estimate [7]" },
        { step: "Of which electric-propulsion & electronics content", value: "~$0.2B", src: "Content estimate" },
        { step: "Serviceable filter: non-flight-critical subsystems Bosch could qualify", value: "≈13% of TAM", src: "Estimate" },
        { step: "= SAM (2030)", value: "$0.08B", src: "Derived — highly speculative estimate" },
      ],
      crossCheck: "Sanity check: even bullish global eVTOL forecasts concentrate revenue post-2030; India's share before then is marginal — an $0.6B 2030 India TAM is optimistic, and confidence is deliberately low.",
      customers: [
        { s: "eVTOL primes (global)", buy: "Electric propulsion, sensing, power electronics", note: "Component-supplier relationship only" },
        { s: "Cargo/medical UAM operators", buy: "Qualified subsystems", note: "Earliest realistic Indian use cases" },
      ],
      scoreRationale: "Score 4.0: smallest, most speculative market in the portfolio. Confidence 0.62 — the lowest, reflecting genuine forecast uncertainty per the rubric (mostly reasoned estimates).",
    },
    porter: [
      { force: "Rivalry", v: 4.0, why: "Few players in a pre-market; competition is for future positioning, not current revenue.", drivers: ["Pre-market field", "Positioning not revenue"], c: [8] },
      { force: "Supplier power", v: 5.0, why: "Aerospace-grade component supply is specialised, giving qualified suppliers some leverage.", drivers: ["Certified-supply scarcity"], c: [6] },
      { force: "Buyer power", v: 5.5, why: "Few primes means concentrated buyers, but they need qualified partners.", drivers: ["Concentrated primes", "Need for qualified partners"], c: [4] },
      { force: "Substitutes", v: 6.5, why: "Ground transport, helicopters and drones substitute most eVTOL use cases today — a strong substitute set.", drivers: ["Ground transport", "Helicopters", "Cargo drones"], c: [2] },
      { force: "New entrants", v: 4.0, why: "Certification and capital intensity strongly deter entry — the field protects itself but also starves of demand.", drivers: ["Certification barrier", "Capital intensity"], c: [6] },
    ],
    porterRationale: "Attractiveness 5.2 = 10 − weighted pressure. Strong substitutes (6.5) and a non-existent current market define it; high entry barriers help future incumbents but don't create near-term value.",
    competency: [
      { name: "Electric propulsion & power electronics", bosch: 8, req: 8, whyReq: "Core eVTOL subsystem (8)", whyBosch: "Strong automotive franchise, transferable (8)", gap: "none — match (if certified)", gapWhy: "Transferable, pending aerospace qualification" },
      { name: "Aerospace certification & airworthiness", bosch: 1, req: 9, whyReq: "The absolute gatekeeper for any flight component (9)", whyBosch: "No aerospace certification base (1)", gap: "partner / skip", gapWhy: "Decisive gap — supply only non-flight-critical, or skip" },
      { name: "Sensing & flight-control electronics", bosch: 7, req: 8, whyReq: "Redundant IMUs/sensors for safety-critical flight (8)", whyBosch: "Automotive sensing transferable; flight-grade redundancy new (7)", gap: "build / partner", gapWhy: "Only if a serious entry is justified later" },
      { name: "Aviation customer relationships", bosch: 2, req: 7, whyReq: "Primes select partners through aerospace networks (7)", whyBosch: "No aviation customer base (2)", gap: "build", gapWhy: "Watch-and-engage; low cost" },
      { name: "Battery/thermal for aviation duty cycles", bosch: 6, req: 8, whyReq: "Aviation energy density & thermal demands exceed automotive (8)", whyBosch: "Automotive battery/thermal know-how, not aviation-rated (6)", gap: "build", gapWhy: "Tracks Energy-field progress" },
    ],
    competencyRationale: "Score 5.0: genuinely transferable on propulsion/sensing/battery, but the certification gap (1 vs 9) is categorical and the strategy parks the field. Confidence 0.80 on the assessment itself.",
    horizons: {
      h1: [],
      h2: [{ item: "Component qualification with cargo/medical UAM primes", why: "Earliest realistic use cases may begin platform sourcing in 2–5 years", trigger: "DGCA framework for cargo/medical UAM operations" }],
      h3: [
        { item: "Electric-propulsion subsystem supply to passenger eVTOL", why: "Passenger UAM certification and market formation in India is a 5–10 year horizon", trigger: "Indian passenger-eVTOL type certification regime established" },
        { item: "Rural-access UAM (medical, logistics)", why: "Compelling social case but depends on cost and regulation maturing — 5+ years", trigger: "Viable rural UAM operating economics demonstrated" },
      ],
      rationale: "Score 5.6: no H1, a thin H2, and the substance in H3. Almost pure optionality — the score reflects a real but distant opportunity, not a near-term business.",
    },
    verdict: {
      entry: "Watch only. Maintain transferable-tech readiness through Energy/sensing investment, monitor DGCA framework development and cargo/medical use cases, and engage global primes opportunistically; no standalone capital commitment.",
      reasoning: [
        "Market 4.0 (smallest, most speculative) and the absence of any near-term India revenue make commitment unjustifiable now",
        "Competency 5.0 shows transferable tech, but the categorical aerospace-certification gap and zero M&A/BBM hooks raise the entry bar",
        "Horizons 5.6 places the substance in H3 — this is a monitor-and-position field, hence WATCH",
      ],
      portfolio: [
        { sub: "Urban Air Mobility", play: "WATCH", why: "Passenger UAM is H3 in India; monitor certification regime" },
        { sub: "Rural Applications", play: "WATCH", why: "Compelling social case but economics/regulation immature" },
      ],
      risks: ["India market never reaching scale this decade", "Aerospace-certification incumbents locking component relationships", "Capital committed too early into an immature regulatory environment"],
    },
    activity: [
      { d: "Jun 01, 2026", t: "DGCA signals consultation on advanced air mobility framework", s: "Economic Times" },
      { d: "May 22, 2026", t: "Global eVTOL prime announces India market-study partnership", s: "Mint" },
      { d: "May 11, 2026", t: "Medical-emergency drone-logistics pilot expands in hill state", s: "Business Standard" },
    ],
    sources: ["DGCA drone/UAM framework status", "UAM use-case economics studies", "Public-acceptance research", "Propulsion transferability briefings", "Battery energy-density analyses", "Aerospace certification overviews", "Speculative UAM market forecasts", "Pre-market competitive notes"],
  },

  robotics: {
    ma: [], bbm: [],
    criterionScores: [
      { ...WEIGHTS[0], s: 7.2, conf: 0.84, why: "Sensors, actuators, motion control and SdV-grade compute transfer strongly to robotics; gap at humanoid-specific integration. See Competency tab." },
      { ...WEIGHTS[1], s: 6.4, conf: 0.78, why: "Deep transferable tech and convergence-with-SdV thesis vs no hooks and a crowded, hype-prone field. See SWOT tab." },
      { ...WEIGHTS[2], s: 6.8, conf: 0.70, why: "AMR/industrial robotics real and growing now; humanoids large but speculative — mixed. See Market tab." },
      { ...WEIGHTS[3], s: 6.0, conf: 0.78, why: "Crowded and hype-cycle-prone, but component-supply and convergence angles are defensible. See Attractiveness tab." },
      { ...WEIGHTS[4], s: 7.6, conf: 0.80, why: "AMR now, campus autonomy and robotics-SdV convergence next, humanoids later — strong staged pipeline. See 3 Horizons tab." },
    ],
    pestel: {
      Political: [{ p: "Make-in-India & automation incentives support industrial/warehouse robotics", why: "Manufacturing-competitiveness and logistics-efficiency policy favours AMR and industrial automation adoption [1]", sowhat: "Industrial/warehouse robotics has policy tailwind and real near-term demand — the pragmatic entry vs humanoid hype", i: "medium", c: [1] }],
      Economic: [{ p: "Warehouse/logistics boom drives AMR demand; labour economics still temper full automation", why: "E-commerce and 3PL growth pull AMR adoption, but cheap labour slows payback in many segments [2]", sowhat: "Target high-throughput, labour-constrained nodes (large fulfilment, ports) where AMR economics already work", i: "high", c: [2] }],
      Social: [{ p: "Automation-vs-jobs sensitivity shapes deployment narratives", why: "Robotics deployment intersects employment politics, especially for visible service robots [3]", sowhat: "Frame as augmentation and safety; industrial settings face less friction than public-facing humanoids", i: "medium", c: [3] }],
      Technological: [{ p: "Robotics and SDV share the same stack: sensors, compute, motion planning, safety", why: "Perception, real-time compute, actuation and functional safety are common to autonomous vehicles and robots — the explicit 'convergence' sub-field [4]", sowhat: "Bosch's SdV and ADAS investments are directly reusable — robotics is an adjacency, not a new domain", i: "high", c: [4] }],
      Environmental: [{ p: "Electrification & efficiency requirements apply to mobile robots", why: "Battery, power-electronics and thermal constraints mirror EV engineering [5]", sowhat: "Energy-field competencies transfer to mobile-robot powertrains", i: "low", c: [5] }],
      Legal: [{ p: "Safety standards for collaborative/mobile robots maturing; humanoid norms absent", why: "Industrial robot safety standards exist; mobile-robot and humanoid safety/liability frameworks are still forming [6]", sowhat: "Industrial/AMR is certifiable now; humanoids carry regulatory immaturity — favour the former", i: "medium", c: [6] }],
    },
    swot: {
      S: [
        { p: "Sensors, actuators, motion control and safety-critical compute reusable from automotive", why: "The robotics technology stack overlaps heavily with Bosch's ADAS/SdV and motion-control franchises", sowhat: "Supply the picks-and-shovels (sensors, actuators, compute, safety SW) across robotics platforms" },
        { p: "Robotics-SdV convergence thesis lets one investment serve two fields", why: "The mapped 'Convergence of Robotics and SDV' sub-field means SdV R&D doubles as robotics R&D", sowhat: "Frame robotics as an SdV adjacency — capital-efficient, no fully separate bet" },
      ],
      W: [
        { p: "No robotics platform or system-integration franchise", why: "Bosch supplies components broadly but isn't an established robot-platform or humanoid integrator", sowhat: "Stay at the component/subsystem layer; partner integrators for full platforms" },
        { p: "No M&A/BBM hooks mapped; humanoid hype inflates expectations", why: "No accelerating asset, and humanoid narratives risk over-commitment to an immature segment", sowhat: "Discipline scope to AMR/industrial + convergence; treat humanoids as watch" },
      ],
      O: [
        { p: "AMR/warehouse automation demand growing now in India", why: "Logistics boom plus labour constraints at scale nodes create real near-term AMR pull", sowhat: "Supply sensors/compute/safety to AMR makers and integrators today" },
        { p: "Autonomous campus shuttles as a low-speed SdV testbed", why: "Geofenced low-speed autonomy is a realistic Indian deployment and exercises the exact SdV stack", sowhat: "Use campus shuttles to mature and reference SdV autonomy — dual-purpose investment" },
      ],
      T: [
        { p: "Crowded field with global robotics specialists and Chinese cost competition", why: "Established robotics OEMs and aggressive Chinese suppliers compete on platform and price", sowhat: "Differentiate via automotive-grade safety/reliability and SdV integration, not platform breadth" },
        { p: "Humanoid hype cycle risking misallocated investment", why: "Capital chases humanoids ahead of viable economics", sowhat: "Maintain WATCH discipline on humanoids; invest where revenue is real" },
      ],
      strategy: "Component-and-convergence strategy: supply sensors/actuators/compute/safety to AMR and industrial robotics now, use campus shuttles as an SdV-autonomy testbed, exploit robotics-SdV convergence for capital efficiency, and keep humanoids on watch.",
      scoreRationale: "Score 6.4: strong transferable tech and a capital-efficient convergence thesis, held back by the absence of a platform franchise, no hooks, and a hype-prone competitive field. Solid as an adjacency, not a standalone empire.",
    },
    market: {
      tam: 5800, sam: 1200, cagr: 25, year: 2030,
      derivation: [
        { step: "India robotics 2030 (industrial + AMR + service + emerging humanoid)", value: "$5.8B", src: "Robotics market forecasts [7]" },
        { step: "Of which AMR + mobile/autonomous + component-addressable", value: "~$2.4B", src: "Segment split; estimate" },
        { step: "Serviceable filter: sensors/actuators/compute/safety + convergence Bosch-addressable (excl. full platforms, humanoid speculation)", value: "≈21% of TAM", src: "Estimate" },
        { step: "= SAM (2030)", value: "$1.2B", src: "Derived — estimate" },
      ],
      crossCheck: "Sanity check: India industrial-robot installations and warehouse-automation spend already run in the hundreds of millions annually; a $5–6B 2030 all-robotics TAM with 25% CAGR is consistent [2][7].",
      customers: [
        { s: "AMR & warehouse-automation makers", buy: "Sensors, compute, motion control, safety SW", note: "Real near-term component demand" },
        { s: "Industrial-robot integrators", buy: "Actuators, sensing, functional-safety", note: "Make-in-India tailwind" },
        { s: "Campus/low-speed autonomy operators", buy: "SdV-stack autonomy, sensing", note: "Dual-purpose SdV testbed" },
      ],
      scoreRationale: "Score 6.8: real, growing addressable component market ($1.2B) discounted for the speculative humanoid portion excluded from scope. Confidence 0.70: segment splits and humanoid uncertainty are estimates.",
    },
    porter: [
      { force: "Rivalry", v: 7.0, why: "Global robotics specialists, automation Tier-1s and Chinese cost players compete hard across segments.", drivers: ["Global robotics OEMs", "Chinese cost competition", "Automation specialists"], c: [8] },
      { force: "Supplier power", v: 4.5, why: "Robotics components are broadly sourced; Bosch is itself a supplier of several inputs.", drivers: ["Broad component supply", "Bosch vertical position"], c: [4] },
      { force: "Buyer power", v: 6.0, why: "Integrators and end-users negotiate on price/performance, but safety-certified components carry stickiness.", drivers: ["Price/performance pressure", "Safety-cert stickiness"], c: [2] },
      { force: "Substitutes", v: 5.5, why: "Manual labour substitutes robotics in low-wage India contexts, limiting adoption outside high-throughput nodes.", drivers: ["Cheap labour (real substitute)", "Adoption limited to scale nodes"], c: [2] },
      { force: "New entrants", v: 6.5, why: "Robotics startups proliferate with cheap compute and open-source stacks; safety certification and reliability are the differentiators.", drivers: ["Startup proliferation", "Safety/reliability as moat"], c: [8] },
    ],
    porterRationale: "Attractiveness 6.0 = 10 − weighted pressure. Rivalry (7.0) and entrants (6.5) are high; the labour substitute (5.5) is a distinctly Indian dampener. Attractive at the safety-certified component layer where Bosch differentiates.",
    competency: [
      { name: "Sensors & perception", bosch: 9, req: 8, whyReq: "Robots need robust multi-modal perception (8)", whyBosch: "ADAS/SdV sensing franchise transfers directly (9)", gap: "none — exceed", gapWhy: "Core supply asset" },
      { name: "Actuators & motion control", bosch: 8, req: 8, whyReq: "Precise, reliable actuation is fundamental (8)", whyBosch: "Electric-machine and motion-control lines (8)", gap: "none — match", gapWhy: "Direct component supply" },
      { name: "Real-time compute & safety SW", bosch: 8, req: 8, whyReq: "Safety-critical real-time control (8)", whyBosch: "SdV compute + functional-safety pedigree (8)", gap: "none — match", gapWhy: "Convergence asset — shared with SdV" },
      { name: "Robot platform integration", bosch: 4, req: 8, whyReq: "Full robots need mechanical + control + application integration (8)", whyBosch: "Component supplier, not platform integrator (4)", gap: "partner", gapWhy: "Partner integrators; don't build platforms" },
      { name: "Humanoid-specific systems", bosch: 4, req: 7, whyReq: "Bipedal control, dexterous manipulation, HRI (7)", whyBosch: "Adjacent competencies but no humanoid programme (4)", gap: "watch", gapWhy: "Optionality only until economics prove out" },
    ],
    competencyRationale: "Score 7.2: franchise-or-match on the three component competencies that the AMR/convergence strategy needs; platform and humanoid gaps are deliberately partnered/parked. Confidence 0.84: transferable strengths verifiable.",
    horizons: {
      h1: [
        { item: "Sensors/compute/safety to AMR & warehouse automation", why: "Real demand today at high-throughput logistics nodes; component revenue now" },
        { item: "Actuators & motion control to industrial-robot integrators", why: "Make-in-India tailwind; established demand" },
      ],
      h2: [
        { item: "Autonomous campus/low-speed shuttle autonomy (SdV testbed)", why: "Geofenced autonomy is deployable in 2–4 years and matures the SdV stack", trigger: "Indian campus/industrial sites commissioning autonomous shuttles" },
        { item: "Robotics-SdV converged platform components", why: "Convergence productisation over 2–4 years as both fields share more stack", trigger: "Shared safety/compute platform reused across a robot and a vehicle programme" },
      ],
      h3: [{ item: "Humanoid subsystem supply (sensors, actuators, control)", why: "Humanoid economics and safety frameworks need 5+ years to mature in India", trigger: "Viable humanoid unit economics demonstrated at deployable scale" }],
      rationale: "Score 7.6: solid revenue-generating H1, a capital-efficient H2 built on SdV convergence with clear triggers, and humanoids correctly deferred to H3. Strong staged growth without hype dependence.",
    },
    verdict: {
      entry: "Component-and-convergence entry: supply sensors/actuators/compute/safety to AMR and industrial robotics now; use campus shuttles as an SdV-autonomy testbed; exploit robotics-SdV convergence for capital efficiency; keep humanoids on watch.",
      reasoning: [
        "Competency 7.2 (top weight) and Horizons 7.6: strong transferable tech meets a real near-term AMR market plus a capital-efficient convergence thesis",
        "Market 6.8 is healthy once humanoid speculation is excluded from scope — the recommendation does exactly that",
        "Porter 6.0 and SWOT 6.4 confirm a defensible component/convergence play rather than a platform or humanoid bet — hence EXPLORE with discipline",
      ],
      portfolio: [
        { sub: "AMR", play: "LEAD", why: "Real near-term demand; direct component supply on existing assets" },
        { sub: "Robotics × SDV", play: "LEAD", why: "Convergence makes SdV R&D double as robotics R&D — capital-efficient" },
        { sub: "Campus Shuttles", play: "PARTNER", why: "Low-speed autonomy testbed with site operators; matures SdV stack" },
        { sub: "Humanoids", play: "WATCH", why: "Adjacent competencies but immature economics; optionality only" },
      ],
      risks: ["Humanoid hype pulling investment ahead of economics", "Chinese component cost competition compressing margins", "Cheap-labour substitution limiting AMR adoption outside scale nodes"],
    },
    activity: [
      { d: "Jun 02, 2026", t: "3PL major orders large AMR fleet for new automated fulfilment centre", s: "Economic Times" },
      { d: "May 24, 2026", t: "Industrial-automation player localises collaborative-robot production under Make-in-India", s: "ET Auto" },
      { d: "May 13, 2026", t: "Tech campus deploys autonomous low-speed shuttle pilot", s: "Mint" },
      { d: "May 02, 2026", t: "Humanoid startup raises funding; analysts caution on near-term economics", s: "Business Standard" },
    ],
    sources: ["Make-in-India & automation incentives", "Warehouse/logistics automation studies", "Automation-employment research", "Robotics-SDV convergence briefings", "Mobile-robot powertrain analyses", "Robot safety-standard status", "Robotics market forecasts", "Competitive & funding trackers"],
  },

  defence: {
    ma: [], bbm: [],
    criterionScores: [
      { ...WEIGHTS[0], s: 6.6, conf: 0.80, why: "High-reliability electronics, sensing and manufacturing transfer well; gap at defence-specific certification, clearances and offset craft. See Competency tab." },
      { ...WEIGHTS[1], s: 5.8, conf: 0.74, why: "Manufacturing/sensing strengths and indigenisation tailwind vs no hooks and a relationship-driven, slow procurement world. See SWOT tab." },
      { ...WEIGHTS[2], s: 6.6, conf: 0.70, why: "Large indigenisation-driven market, but the component/contract-manufacturing slice that fits Bosch is a fraction. See Market tab." },
      { ...WEIGHTS[3], s: 6.0, conf: 0.76, why: "High barriers and entrenched DPSUs/primes, offset by indigenisation mandates opening component supply. See Attractiveness tab." },
      { ...WEIGHTS[4], s: 6.4, conf: 0.76, why: "Component sales now, qualified contract manufacturing next, deeper subsystems later. See 3 Horizons tab." },
    ],
    pestel: {
      Political: [{ p: "Atmanirbhar Bharat indigenisation lists and offset policy mandate domestic content", why: "Positive-indigenisation lists, defence-corridor incentives and offset obligations push localisation of components and manufacturing [1]", sowhat: "Indigenisation mandates open component-supply and contract-manufacturing doors for capable domestic players — Bosch India qualifies", i: "high", c: [1] }],
      Economic: [{ p: "Record defence capital outlay with a domestic-procurement preference", why: "Growing defence budgets earmark a majority share for domestic acquisition [2]", sowhat: "Funded, policy-protected demand exists for localised components and manufacturing", i: "high", c: [2] }],
      Social: [{ p: "National-security salience makes indigenous capability politically prized", why: "Self-reliance in defence is a high-priority national narrative [3]", sowhat: "Domestic high-reliability manufacturing carries reputational and relationship value", i: "medium", c: [3] }],
      Technological: [{ p: "Dual-use electronics, sensing and power systems overlap with Bosch competencies", why: "Ruggedised electronics, sensors, power electronics and precision manufacturing are common to automotive and defence platforms [4]", sowhat: "The realistic angle is dual-use components and contract manufacturing, not weapons systems", i: "high", c: [4] }],
      Environmental: [{ p: "Limited direct relevance; ruggedisation/reliability dominate over efficiency", why: "Defence prioritises reliability and environmental hardening over the efficiency metrics that drive automotive [5]", sowhat: "Reliability engineering — a Bosch strength — is the transferable virtue", i: "low", c: [5] }],
      Legal: [{ p: "Security clearances, ITAR/export controls and defence-specific certification gate participation", why: "Defence supply requires clearances, controlled-technology compliance and specialised qualification regimes [6]", sowhat: "Certification, clearance and offset craft are the gatekeepers — partner with established defence primes/DPSUs", i: "high", c: [6] }],
    },
    swot: {
      S: [
        { p: "High-reliability electronics, sensing and precision manufacturing in India", why: "Bosch's ruggedised electronics, sensors and certified plants are directly relevant to defence component supply and contract builds", sowhat: "Supply dual-use components and qualified contract manufacturing to defence primes/DPSUs" },
        { p: "Manufacturing-as-a-Service synergy with the Manufacturing field", why: "Defence contract manufacturing reuses the same certified-capacity thesis", sowhat: "One MaaS capability serves both Manufacturing and Defence customers" },
      ],
      W: [
        { p: "No defence certification, security clearances or offset/procurement craft", why: "Defence supply is a specialised regulatory and relationship world Bosch doesn't operate in", sowhat: "Partner established primes/DPSUs; never attempt prime-contractor or weapons-system roles" },
        { p: "No M&A/BBM hooks; slow, relationship-driven procurement", why: "No accelerating asset, and defence sales cycles are long and trust-dependent", sowhat: "Treat as a patient, partnership-led adjacency, not a fast-growth bet" },
      ],
      O: [
        { p: "Indigenisation mandates creating domestic component-supply demand", why: "Positive-list items and offset obligations force localisation that capable Indian manufacturers can capture", sowhat: "Target dual-use component slots and contract manufacturing opened by indigenisation" },
        { p: "Defence-corridor incentives for domestic manufacturing", why: "UP/Tamil Nadu defence corridors offer capacity incentives", sowhat: "Leverage existing Indian manufacturing footprint for corridor-aligned contract builds" },
      ],
      T: [
        { p: "Entrenched DPSUs and defence primes own the relationships and clearances", why: "BEL/HAL-class and private primes (L&T, Tata, Adani Defence) hold incumbency and clearance depth", sowhat: "Position as a component/manufacturing partner to them — not a competitor" },
        { p: "Export-control and clearance complexity for a multinational", why: "Foreign-parent considerations complicate controlled-technology participation", sowhat: "Structure participation through the Indian entity with appropriate compliance" },
      ],
      strategy: "Partnership-led, dual-use only: supply high-reliability components and qualified contract manufacturing to defence primes/DPSUs, leveraging the Manufacturing-field MaaS thesis; never pursue prime-contractor or weapons-system roles; manage clearance/export-control via the India entity.",
      scoreRationale: "Score 5.8: real manufacturing/sensing strengths and a strong indigenisation tailwind, offset by the absence of clearances, certification and procurement craft, plus no hooks. A patient, partnership-bounded adjacency.",
    },
    market: {
      tam: 9000, sam: 700, cagr: 14, year: 2030,
      derivation: [
        { step: "India domestic defence procurement-addressable electronics & manufacturing 2030", value: "$9B (electronics/manufacturing-relevant subset of defence capex)", src: "Defence budget & indigenisation analyses; estimate [7]" },
        { step: "Of which dual-use components + contract manufacturing", value: "~$2.6B", src: "Segment estimate" },
        { step: "Serviceable filter: Bosch-addressable dual-use component & MaaS slice (excl. platforms, weapons, prime scope)", value: "≈8% of relevant subset", src: "Estimate" },
        { step: "= SAM (2030)", value: "$0.7B", src: "Derived — estimate" },
      ],
      crossCheck: "Sanity check: defence electronics localisation programmes and private-sector defence revenues already run in the billions; a sub-$1B dual-use/MaaS addressable slice for a new component entrant is conservative [1][7].",
      customers: [
        { s: "Defence primes & DPSUs", buy: "Dual-use components, contract manufacturing", note: "Partner channel — they hold clearances/relationships" },
        { s: "Tier-1 defence suppliers", buy: "High-reliability electronics, sensing", note: "Indigenisation-driven demand" },
        { s: "Defence-corridor programmes", buy: "Qualified manufacturing capacity", note: "Corridor incentives" },
      ],
      scoreRationale: "Score 6.6: large protected market but a small Bosch-addressable dual-use slice ($0.7B). Confidence 0.70: defence-spend subsets and addressable-share splits are estimates.",
    },
    porter: [
      { force: "Rivalry", v: 6.0, why: "DPSUs and private primes dominate platforms; component-supply competition is more open but relationship-gated.", drivers: ["DPSU/prime dominance (platforms)", "Open-ish component layer"], c: [8] },
      { force: "Supplier power", v: 5.0, why: "Specialised defence-grade inputs carry some power, but dual-use components have broad supply.", drivers: ["Dual-use broad supply", "Specialised-input pockets"], c: [4] },
      { force: "Buyer power", v: 7.5, why: "Government and prime buyers wield strong leverage via procurement rules, indigenisation terms and offset demands.", drivers: ["Government/prime monopsony", "Offset & indigenisation terms"], c: [1] },
      { force: "Substitutes", v: 4.0, why: "Imports are the substitute, but indigenisation policy actively suppresses them — a tailwind for domestic supply.", drivers: ["Imports (policy-suppressed)", "Indigenisation tailwind"], c: [1] },
      { force: "New entrants", v: 5.0, why: "Clearances, certification and relationships are high barriers; capable domestic manufacturers can still qualify over time.", drivers: ["Clearance/cert barriers", "Domestic-capability path"], c: [6] },
    ],
    porterRationale: "Attractiveness 6.0 = 10 − weighted pressure. Buyer power (7.5) dominates; the indigenisation-suppressed substitute (4.0) is the structural tailwind. Attractive specifically for clearance-partnered domestic component suppliers.",
    competency: [
      { name: "High-reliability electronics", bosch: 8, req: 9, whyReq: "Defence demands ruggedised, mission-critical reliability (9)", whyBosch: "Strong reliability engineering; defence-grade qualification new (8)", gap: "build", gapWhy: "Qualify existing lines to defence standards" },
      { name: "Precision/contract manufacturing", bosch: 8, req: 8, whyReq: "Qualified domestic manufacturing for indigenisation (8)", whyBosch: "Certified Indian plants; MaaS thesis (8)", gap: "none — match", gapWhy: "Shared with Manufacturing field" },
      { name: "Sensing & power systems (dual-use)", bosch: 8, req: 8, whyReq: "Sensors and power electronics across platforms (8)", whyBosch: "Automotive franchises transferable (8)", gap: "none — match", gapWhy: "Dual-use supply" },
      { name: "Defence certification & clearances", bosch: 2, req: 9, whyReq: "Participation gated by clearances & qualification regimes (9)", whyBosch: "No defence certification base (2)", gap: "partner", gapWhy: "Decisive gap — partner primes/DPSUs" },
      { name: "Offset & defence-procurement craft", bosch: 3, req: 7, whyReq: "Winning needs offset structuring and procurement navigation (7)", whyBosch: "No defence-procurement experience (3)", gap: "partner / hire", gapWhy: "Rely on prime partners; selective hires" },
    ],
    competencyRationale: "Score 6.6: strong on the three manufacturing/electronics/sensing competencies, with the decisive certification/clearance and procurement-craft gaps closed only via prime partnerships. Confidence 0.80.",
    horizons: {
      h1: [{ item: "Dual-use component sales to defence primes/DPSUs", why: "Indigenisation demand exists now; dual-use components need least qualification friction" }],
      h2: [
        { item: "Qualified contract manufacturing for defence programmes", why: "Defence-grade qualification of capacity takes 2–4 years; corridor incentives help", trigger: "First defence-qualified line / prime-partner contract secured" },
        { item: "Deeper sensing/power subsystems under indigenisation", why: "Subsystem localisation opens as relationships and clearances mature", trigger: "Positive-list item matched to a Bosch dual-use subsystem" },
      ],
      h3: [{ item: "Integrated defence subsystems via established partnerships", why: "Deeper participation needs years of trust, clearances and track record — 5+ years", trigger: "Sustained prime-partnership track record established" }],
      rationale: "Score 6.4: H1 component sales are achievable, H2 contract manufacturing is realistic with qualification investment, H3 deeper participation is relationship-gated. Steady, partnership-paced growth.",
    },
    verdict: {
      entry: "Partnership-led, dual-use entry: sell high-reliability components to primes/DPSUs now; pursue defence-qualified contract manufacturing leveraging the Manufacturing MaaS thesis; never pursue prime/weapons roles; manage clearances/export-control through the India entity.",
      reasoning: [
        "Market 6.6 and Competency 6.6 support entry, but only at the dual-use/component/MaaS layer where Bosch's strengths actually apply",
        "Porter 6.0 with buyer power at 7.5 and the certification/clearance gaps make prime partnership non-negotiable",
        "SWOT 5.8 and the absence of hooks place this as a patient, bounded adjacency — hence EXPLORE via partnership, not standalone build",
      ],
      portfolio: [
        { sub: "Component Sales", play: "LEAD", why: "Dual-use components — least friction, indigenisation-pulled, immediate" },
        { sub: "Contract Manufacturing", play: "PARTNER", why: "Defence-qualified MaaS via primes; shares Manufacturing-field capability" },
      ],
      risks: ["Clearance/export-control complexity for a multinational parent", "Slow, relationship-driven procurement straining business cases", "DPSU/prime incumbency limiting component-slot access"],
    },
    activity: [
      { d: "Jun 04, 2026", t: "Defence ministry expands positive-indigenisation list with electronics line items", s: "Economic Times" },
      { d: "May 26, 2026", t: "Private prime seeks domestic partners for ruggedised electronics localisation", s: "Business Standard" },
      { d: "May 15, 2026", t: "Defence corridor announces incentives for high-reliability manufacturing units", s: "Mint" },
      { d: "May 05, 2026", t: "DPSU issues RFI for dual-use sensor and power-electronics components", s: "ET Auto" },
    ],
    sources: ["Indigenisation lists & offset policy", "Defence budget & domestic-procurement data", "Self-reliance policy notes", "Dual-use technology overlap briefings", "Ruggedisation/reliability standards", "Clearance & export-control frameworks", "Defence-electronics market analyses", "Prime/DPSU sourcing trackers"],
  },

  health: {
    ma: [], bbm: [],
    criterionScores: [
      { ...WEIGHTS[0], s: 5.4, conf: 0.78, why: "E-call and sensing competencies fit; medical-device regulation and clinical validation are absent competencies. See Competency tab." },
      { ...WEIGHTS[1], s: 5.6, conf: 0.74, why: "E-call regulatory tailwind and sensing reuse vs no hooks and medical-domain regulatory distance. See SWOT tab." },
      { ...WEIGHTS[2], s: 5.6, conf: 0.66, why: "E-call is a real mandated slice; broader mobility-health is small and diffuse near-term. See Market tab." },
      { ...WEIGHTS[3], s: 5.8, conf: 0.74, why: "Fragmented, early field; e-call mandate creates structured demand, rest is diffuse. See Attractiveness tab." },
      { ...WEIGHTS[4], s: 6.2, conf: 0.74, why: "E-call now, assisted motion & inclusive design next, in-vehicle health monitoring later. See 3 Horizons tab." },
    ],
    pestel: {
      Political: [{ p: "Emergency-call (e-call/112 integration) is moving toward mandate, as in other markets", why: "Road-safety missions and global e-call precedents point to Indian emergency-call requirements for vehicles [1]", sowhat: "E-call is the regulation-pulled, near-term wedge of this otherwise diffuse field", i: "high", c: [1] }],
      Economic: [{ p: "Healthcare-access gaps make mobility-linked health services socially valuable but hard to monetise", why: "Rural access and emergency-response gaps are real, but willingness/ability to pay is limited [2]", sowhat: "Lead with mandated/safety features (e-call); treat broader health services as long-horizon social-impact optionality", i: "medium", c: [2] }],
      Social: [{ p: "DEI & inclusive-mobility-design expectations are rising in policy and procurement", why: "Accessibility norms and inclusive-design advocacy grow in public transport and vehicle design [3]", sowhat: "Inclusive-design capability is a differentiator in public/fleet procurement and aligns with safety positioning", i: "medium", c: [3] }],
      Technological: [{ p: "In-cabin sensing enables health monitoring, but medical-grade is a high bar", why: "Radar/camera vitals sensing is technically emerging (shared with Interior Systems) but clinical-grade validation is demanding [4]", sowhat: "Wellness-grade (non-medical) features are reachable; medical-grade needs partnerships and clinical pathways", i: "high", c: [4] }],
      Environmental: [{ p: "Limited direct environmental relevance", why: "Field is health/safety-driven, not efficiency-driven [5]", sowhat: "Not a material decision factor here", i: "low", c: [5] }],
      Legal: [{ p: "Medical-device regulation (CDSCO) and DPDP health-data rules gate clinical features", why: "Anything making medical claims falls under device regulation; health data is sensitive personal data under DPDP [6]", sowhat: "Stay wellness/safety-grade unless partnering a medical-device player — regulatory line defines scope", i: "high", c: [6] }],
    },
    swot: {
      S: [
        { p: "E-call/telematics and crash-sensing competencies", why: "Crash detection, connectivity and emergency-call logic reuse Bosch sensing/connectivity and safety assets", sowhat: "Lead the mandated e-call slice with existing competencies" },
        { p: "In-cabin sensing shared with Interior Systems for wellness features", why: "Occupant/vitals sensing developed for Interior Systems extends into wellness monitoring", sowhat: "Reuse one sensing investment across two fields — capital-efficient" },
      ],
      W: [
        { p: "No medical-device regulatory or clinical-validation competency", why: "Clinical-grade health features require CDSCO pathways and clinical evidence Bosch doesn't generate", sowhat: "Confine to wellness/safety-grade; partner medical-device players for clinical claims" },
        { p: "No M&A/BBM hooks; diffuse, hard-to-monetise field", why: "No accelerating asset and unclear willingness-to-pay outside mandates", sowhat: "Lead with the mandated wedge; treat the rest as social-impact optionality" },
      ],
      O: [
        { p: "E-call mandate creating a guaranteed near-term feature market", why: "If mandated, every vehicle needs compliant emergency-call capability", sowhat: "Position now to supply the e-call stack when the mandate lands" },
        { p: "Inclusive-design capability for public/fleet procurement", why: "DEI procurement criteria reward accessible mobility design", sowhat: "Build inclusive-design as a differentiator across cockpit/interior offers" },
      ],
      T: [
        { p: "Telematics specialists and medtech players occupying adjacent space", why: "Emergency-response telematics and digital-health players move toward the vehicle", sowhat: "Differentiate via automotive-grade integration and safety reliability" },
        { p: "Regulatory distance of medical features risks over-investment", why: "Clinical-grade ambitions can sink capital into long regulatory pathways", sowhat: "Hold the wellness/safety line; partner for anything clinical" },
      ],
      strategy: "Lead the mandated e-call slice with existing sensing/connectivity assets; reuse Interior-Systems sensing for wellness (non-medical) features; build inclusive-design as a procurement differentiator; partner medical-device players for any clinical-grade ambition; treat broader mobility-health as social-impact optionality.",
      scoreRationale: "Score 5.6: a real regulation-pulled e-call wedge and capital-efficient sensing reuse, but the field beyond e-call is diffuse, hard to monetise and regulatorily distant. EXPLORE on the wedge, watch the rest.",
    },
    market: {
      tam: 1400, sam: 300, cagr: 17, year: 2030,
      derivation: [
        { step: "India mobility-health 2030 (e-call, assisted motion, wellness sensing, inclusive design)", value: "$1.4B", src: "Aggregated niche estimates [7]" },
        { step: "Of which e-call + safety + wellness-sensing (non-clinical)", value: "~$0.6B", src: "Segment estimate" },
        { step: "Serviceable filter: Bosch-addressable e-call/sensing/inclusive-design (excl. clinical/medical-device)", value: "≈21% of TAM", src: "Estimate" },
        { step: "= SAM (2030)", value: "$0.3B", src: "Derived — estimate" },
      ],
      crossCheck: "Sanity check: e-call hardware/service attach across new-vehicle volumes alone, if mandated, supports a few-hundred-million-dollar slice — consistent with the SAM [1][7].",
      customers: [
        { s: "OEMs", buy: "E-call stacks, wellness sensing, inclusive-design", note: "Mandate-driven for e-call" },
        { s: "Fleets & public transport", buy: "Emergency response, accessibility features", note: "DEI procurement criteria" },
        { s: "Medtech partners", buy: "Vehicle-side sensing integration", note: "They carry clinical regulation" },
      ],
      scoreRationale: "Score 5.6: a small but real mandated slice with diffuse upside beyond it. Confidence 0.66: mandate timing and willingness-to-pay are uncertain; estimates dominate.",
    },
    porter: [
      { force: "Rivalry", v: 5.0, why: "Early, fragmented field; telematics and medtech players circle but none dominates vehicle-health integration.", drivers: ["Fragmented entrants", "No dominant integrator"], c: [8] },
      { force: "Supplier power", v: 4.0, why: "Sensing and connectivity inputs are competitive; Bosch supplies several.", drivers: ["Competitive components", "Bosch vertical position"], c: [4] },
      { force: "Buyer power", v: 6.0, why: "OEMs price hard; mandated e-call shifts some leverage to compliant suppliers.", drivers: ["OEM price pressure", "Mandate-time leverage"], c: [1] },
      { force: "Substitutes", v: 6.5, why: "Smartphones provide emergency-call and health monitoring already — a strong substitute the vehicle features must beat or complement.", drivers: ["Smartphone e-call/health", "Wearables"], c: [2] },
      { force: "New entrants", v: 5.5, why: "Digital-health startups enter cheaply; automotive integration and (for clinical) regulation are the barriers.", drivers: ["Digital-health startups", "Integration/regulation barriers"], c: [6] },
    ],
    porterRationale: "Attractiveness 5.8 = 10 − weighted pressure. The smartphone substitute (6.5) and buyer power define it; the e-call mandate is the structured-demand offset. Attractive mainly on the mandated wedge.",
    competency: [
      { name: "E-call / crash sensing / telematics", bosch: 8, req: 8, whyReq: "Mandated emergency-call needs reliable crash detection + connectivity (8)", whyBosch: "Crash-sensing and connectivity assets in production (8)", gap: "none — match", gapWhy: "The lead wedge" },
      { name: "In-cabin wellness sensing", bosch: 7, req: 7, whyReq: "Non-clinical wellness monitoring via radar/camera (7)", whyBosch: "Shared with Interior Systems sensing (7)", gap: "none — match", gapWhy: "Capital-efficient reuse" },
      { name: "Medical-device regulation & clinical validation", bosch: 2, req: 8, whyReq: "Clinical claims require CDSCO pathways + evidence (8)", whyBosch: "No medical-device competency (2)", gap: "partner", gapWhy: "Decisive gap — partner medtech for clinical features" },
      { name: "Inclusive / accessible design", bosch: 5, req: 7, whyReq: "DEI procurement and accessibility norms (7)", whyBosch: "Design capability exists; accessibility-specialism thin (5)", gap: "build", gapWhy: "Build inclusive-design competency across cockpit/interior" },
      { name: "Health-data privacy (DPDP) handling", bosch: 6, req: 8, whyReq: "Sensitive health data demands strict consent/security (8)", whyBosch: "Cyber/privacy assets from Connectivity field (6)", gap: "build", gapWhy: "Extend Connectivity-field privacy capability to health data" },
    ],
    competencyRationale: "Score 5.4: matches on e-call and wellness sensing, but the medical-device gap (2 vs 8) caps clinical ambition and inclusive-design/privacy need building. The score reads a wellness/safety-scoped strategy. Confidence 0.78.",
    horizons: {
      h1: [{ item: "E-call / emergency-response stacks for OEMs", why: "Regulation-pulled near-term demand; reuses existing crash-sensing & connectivity" }],
      h2: [
        { item: "Wellness (non-clinical) in-cabin monitoring & assisted-motion features", why: "Sensing shared with Interior Systems; productisation over 2–4 years", trigger: "OEMs marketing wellness features at volume" },
        { item: "Inclusive-mobility-design offerings for public/fleet procurement", why: "DEI procurement criteria maturing over 2–3 years", trigger: "Accessibility requirements appearing in fleet/public tenders" },
      ],
      h3: [{ item: "Medical-grade in-vehicle health monitoring (via medtech partnership)", why: "Clinical validation and CDSCO pathways need 5+ years and partnerships", trigger: "Clear regulatory pathway for in-vehicle medical monitoring" }],
      rationale: "Score 6.2: H1 e-call is real and mandate-pulled, H2 wellness/inclusive features are capital-efficient reuse, H3 medical-grade is partnership-and-regulation gated. Modest but coherent growth on the wedge.",
    },
    verdict: {
      entry: "Lead the mandated e-call slice with existing sensing/connectivity assets; reuse Interior-Systems sensing for wellness features; build inclusive-design as a procurement differentiator; partner medtech for any clinical-grade ambition; treat broader mobility-health as social-impact optionality.",
      reasoning: [
        "Horizons 6.2 and the e-call mandate give a real, regulation-pulled near-term wedge that reuses existing assets",
        "Competency 5.4 confirms fit on e-call/wellness but a decisive medical-device gap — hence wellness/safety scope with medtech partnership for clinical",
        "Market 5.6 and SWOT 5.6: the field beyond e-call is diffuse and hard to monetise — EXPLORE the wedge, watch the rest",
      ],
      portfolio: [
        { sub: "E-Call", play: "LEAD", why: "Mandate-pulled, competency-matched, reuses crash-sensing/connectivity" },
        { sub: "Assisted Motion", play: "PARTNER", why: "Wellness-grade via Interior-Systems sensing; medtech for clinical" },
        { sub: "DEI Mobility Design", play: "PARTNER", why: "Inclusive-design differentiator for public/fleet procurement" },
      ],
      risks: ["E-call mandate timing slipping, delaying the wedge", "Smartphone/wearable substitution capping vehicle-health value", "Over-investment toward clinical features against long regulatory pathways"],
    },
    activity: [
      { d: "Jun 03, 2026", t: "Road-safety consultation references emergency-call integration with 112 services", s: "Economic Times" },
      { d: "May 25, 2026", t: "OEM pilots in-cabin wellness monitoring (non-medical) in premium SUV", s: "Autocar India" },
      { d: "May 14, 2026", t: "Public-transport tender adds accessibility/inclusive-design criteria", s: "Mint" },
      { d: "May 03, 2026", t: "Medtech firm partners with telematics provider on vehicle-linked emergency response", s: "Business Standard" },
    ],
    sources: ["E-call/112 integration policy", "Healthcare-access & mobility studies", "DEI/accessibility procurement norms", "In-cabin vitals-sensing briefings", "(limited environmental relevance)", "CDSCO & DPDP health-data rules", "Mobility-health niche forecasts", "Adjacent competitive trackers"],
  },
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
  const d = DATA[fieldId];
  const hasData = !!d;
  const M = hasData ? computeMatrix(d.criterionScores) : null;

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#F7F8FA", fontFamily: "'Segoe UI', system-ui, sans-serif", color: INK }}>
      <div style={{ height: 4, background: GRAD }} />
      <header className="bg-white border-b border-slate-200 px-6 py-3 flex items-center gap-4">
        <div>
          <div className="font-extrabold tracking-tight text-lg leading-none">Search-Field Intelligence</div>
          <div className="text-xs text-slate-500 mt-0.5">Bosch Mobility · India Market · BBM Strategy Agent</div>
        </div>
        <div className="ml-auto flex items-center gap-2 text-xs text-slate-500">
          <span className="w-2 h-2 rounded-full bg-green-500 inline-block" /> One methodology for all 16 fields · scores computed, not generated · Version 1.0
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
              <div className="text-xs text-slate-400 mt-3">Demo build — this field is not yet populated.</div>
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
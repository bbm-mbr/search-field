import React, { useState } from "react";
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, LabelList,
  ScatterChart, Scatter,
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
  { id: "health", name: "Health Care", subs: ["E-Call", "Assisted Motion", "DEI Mobility Design"] },
];

/* ═══ India Macro Context — shared PESTEL baseline, verified as of Jul 2026 ═══
   Answers the framework's India-wide questions once for ALL search fields.   */
const MACRO = {
  asOf: "July 2026",
  Political: [
    { k: "Policy certainty", v: "Stable central government; reform continuity (GST 2.0 Sept-2025, India–UK FTA 2025, PLI programmes)", src: "PIB / policy trackers" },
    { k: "PM E-DRIVE", v: "₹10,900 Cr scheme EXTENDED to Mar-2028 — but e-2W/e-3W demand incentives ended Mar-2026; remaining outlay targets charging infra (₹2,000 Cr), 14,028 e-buses, e-trucks (scrappage-linked), e-ambulances", src: "MHI notification, Aug-2025" },
    { k: "PLI / localisation", v: "Auto & ACC PLI disbursing; India Semiconductor Mission fabs & OSATs progressing; Make-in-India value-addition pressure on all sourcing", src: "MHI / MeitY" },
    { k: "Trade & geopolitics", v: "India–UK FTA opens auto trade; China+1 sourcing inflows continue; West Asia conflict elevates freight & energy risk", src: "Commerce Ministry / RBI Jun-26" },
  ],
  Economic: [
    { k: "GDP growth", v: "FY26 ~7.4–7.6% (strong); FY27 forecast cut to 6.6% by RBI (Jun-26) on West Asia conflict, crude prices, monsoon uncertainty", src: "RBI MPC, Jun-2026" },
    { k: "Inflation & rates", v: "CPI FY27 projected ~5.1%; repo held at 5.25%, neutral stance — cost of capital stable but no longer falling", src: "RBI MPC, Jun-2026" },
    { k: "Currency", v: "INR under weakening pressure (bond yields up) — imported-component cost risk (semiconductors, cells, displays)", src: "RBI / market data, Jun-2026" },
    { k: "Demand stimulus", v: "GST 2.0: small cars & ≤350cc 2W cut 28%→18%; most auto components →18%; EVs stay 5% — structural affordability boost to mass mobility", src: "GST Council 56th meeting, Sept-2025" },
    { k: "Infrastructure capex", v: "Record highway pipeline, mature 5G coverage, national charging-corridor buildout under PM E-DRIVE", src: "Budget / MoRTH" },
  ],
  Social: [
    { k: "Demographics", v: "Median age ~29; demographic dividend drives first-time vehicle & tech adoption; 65%+ population rural — 'Digital Bharat' is the growth engine", src: "Census projections / SoCheers 2026" },
    { k: "Digital literacy", v: "~660M smartphone users (~46.5% penetration); UPI at 23.2B transactions/month (May-26), ~49% of GLOBAL real-time payment volume — digital-first behaviour is the default", src: "NPCI / SoCheers Annual Report 2026" },
    { k: "Urbanization & congestion", v: "Indian metros rank among the world's most congested — acute pain point that mobility tech (ITS, connected services) monetises", src: "Congestion indices" },
    { k: "Workforce", v: "World's largest engineering talent pool; 1,600+ GCCs make India the global automotive-software delivery hub — but talent-war attrition economics", src: "NASSCOM / GCC trackers" },
  ],
  Technological: [
    { k: "Digital public infrastructure", v: "UPI, ONDC, Bhashini (22-language AI), Account Aggregator — state-built rails private products can compose on; unique globally", src: "MeitY / NPCI" },
    { k: "Spectrum enablers", v: "5.9 GHz de-licensed for C-V2X OBUs + 77–81 GHz for automotive radar (Jun-2026) — regulatory ENABLERS for V2X/ADAS, aligned with US/EU", src: "WPC notifications, Jun-2026" },
    { k: "Innovation ecosystem", v: "3rd-largest startup ecosystem; deep-tech & EV startup funding active; IITs/academia partnerships maturing", src: "DPIIT / funding trackers" },
    { k: "Standards", v: "CCS2 dominant for charging; AIS harmonising toward UNECE; interoperability gaps remain in V2X roadside & battery-swap", src: "BIS / AIS committees" },
  ],
  Environmental: [
    { k: "Climate policy", v: "Net Zero 2070 commitment; 500 GW renewables target; BS-VI in force with BS-VII discussions begun", src: "MoEFCC / CPCB" },
    { k: "CAFE-III", v: "BEE draft: fleet fuel consumption 3.73→3.01 L/100km over Apr-2027–Mar-2032; small-car (≤909 kg) 3 g/km CO₂ concession contested (Maruti pro, Tata contra)", src: "BEE draft, SIAM debate, 2025-26" },
    { k: "Circular economy", v: "End-of-Life Vehicles Rules 2025 impose steel-linked EPR on producers; Battery Waste Rules EPR live; vehicle-scrapping market $12.8B (2026)→$31.7B (2033)", src: "MoEFCC / NITI Aayog Jan-2026 / CMI" },
    { k: "Physical climate risk", v: "Extreme heat, monsoon flooding, high dust — components need India-hardened thermal/ingress design; a real engineering differentiator", src: "IMD / OEM DVP norms" },
  ],
  Legal: [
    { k: "Homologation", v: "CMVR + AIS standards; ARAI/ICAT type-approval is the gate — timelines and test capacity are a planning constraint for every product", src: "MoRTH / ARAI" },
    { k: "Data protection", v: "DPDP Act 2023 with Rules notified late-2025, phased compliance through ~2027 — consent, purpose-limitation & breach duties on all vehicle/user data", src: "MeitY DPDP Rules" },
    { k: "Tax & investment", v: "GST 2.0 auto rates (18% small / 40% large / 5% EV / 18% components); 100% FDI automatic route in auto; India–UK FTA tariff schedules", src: "GST Council / DPIIT" },
    { k: "Cyber regulation", v: "CERT-In 6-hour incident-reporting directions; AIS-189/190 (CSMS/SUMS) bringing UNECE-style vehicle cyber compliance", src: "CERT-In / AIS drafts" },
  ],
};

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

/* Stakeholder score — computed from the stakeholder map, formula shown in UI.
   Alignment: influence-weighted share of allies. Complexity: how many groups
   must work together. Conflict: influence-weighted share of blockers.
   Influence: average influence of the stakeholders on our side. */
function computeStakeholderScore(list) {
  if (!list?.length) return null;
  const totInf = list.reduce((a, s) => a + s.influence, 0);
  const allyInf = list.filter(s => s.stance === "ally").reduce((a, s) => a + s.influence, 0);
  const blockInf = list.filter(s => s.stance === "blocker").reduce((a, s) => a + s.influence, 0);
  const allies = list.filter(s => s.stance === "ally");
  const alignment = +(10 * allyInf / totInf).toFixed(1);
  const complexity = +Math.min(10, list.length * 1.6).toFixed(1);
  const conflict = +(10 * blockInf / totInf).toFixed(1);
  const influence = allies.length ? +(allies.reduce((a, s) => a + s.influence, 0) / allies.length).toFixed(1) : 0;
  const overall = +((alignment * 0.35 + influence * 0.35 + (10 - conflict) * 0.2 + (10 - complexity) * 0.1)).toFixed(1);
  return { alignment, complexity, conflict, influence, overall };
}

/* Horizon leverage + tech-roadmap depth score — computed, formula shown in UI. */
function computeHorizonScore(h) {
  const n1 = h.h1?.length || 0, n2 = h.h2?.length || 0, n3 = h.h3?.length || 0;
  const total = n1 + n2 + n3 || 1;
  const depth = Math.min(10, 2 * n1 + 1.5 * n2 + 1 * n3 + (n1 && n2 && n3 ? 1 : 0));
  return { n1, n2, n3, p1: Math.round(100 * n1 / total), p2: Math.round(100 * n2 / total), p3: Math.round(100 * n3 / total), depth: +depth.toFixed(1) };
}

/* ═══ Shared framework references (same checklist for every field) ═══ */
const PORTER_FRAMEWORK = {
  "New entrants": ["Capital intensity", "IP barrier", "Regulatory hurdles", "Brand loyalty & reputation", "Access to customers", "Economies of scale", "Access to talent"],
  "Buyer power": ["Buyer concentration", "Volume of purchase", "Switching cost", "Product differentiation", "Threat of backward integration", "Price sensitivity"],
  "Supplier power": ["Supplier concentration", "Uniqueness of supplier product", "Switching cost for Bosch", "Threat of forward integration", "Importance of Bosch to supplier"],
  "Substitutes": ["Availability of substitutes", "Price-performance trade-off", "Customer's propensity to substitute", "Disruptive technology interruption"],
  "Rivalry": ["Number & balance of competitors", "Industry growth rate", "Basis of competition", "Product differentiation", "Exit barrier", "Diversity of competitors"],
};
const KRALJIC_LEGEND = [
  { q: "strategic", where: "High risk · High profit impact", meaning: "Few suppliers, big margin exposure. These inputs can stop the business.", strategy: "Partner deeply, sign long-term agreements, develop second sources." },
  { q: "bottleneck", where: "High risk · Low profit impact", meaning: "Small spend but hard to source — can halt a line for a cheap part.", strategy: "Hold safety stock, qualify alternates, over-order early." },
  { q: "leverage", where: "Low risk · High profit impact", meaning: "Many suppliers compete for large spend — buyer holds the power.", strategy: "Tender aggressively, negotiate on volume, switch freely." },
  { q: "non-critical", where: "Low risk · Low profit impact", meaning: "Commodity items with many sources and small impact.", strategy: "Automate procurement, minimise handling cost." },
];
const SCURVE = ["Innovation", "Early Adoption", "Early Majority", "Late Majority", "Sunset"];
const COMPETENCY_CATS = ["R&D Infra", "IP", "Manufacturing", "Supply Chain", "G2M", "Talent", "Organization", "Leadership", "Collaboration"];

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
      { cat: "Government Schemes & Incentives", p: "PM E-DRIVE pivoted: e-2W/e-3W demand incentives ENDED Mar-2026; the extended scheme (to Mar-2028, same ₹10,900 Cr) now funds charging infrastructure (₹2,000 Cr), 14,028 e-buses, scrappage-linked e-trucks and e-ambulances", why: "MHI extended the scheme's tenure but held the 2W/3W subsidy terminal date — the policy centre of gravity moved from demand subsidy to infrastructure and commercial-fleet electrification [20]", sowhat: "The subsidised-demand era for 2W/3W is over: BMS/component demand must now stand on unsubsidised economics, while charging-management and fleet/bus opportunities get a funded runway to 2028 — reweight the sub-field portfolio toward V2G & Charging accordingly", i: "high", subs: ["V2G & Charging", "Battery & BMS"], c: [20] },
      { cat: "Government Schemes & Incentives", p: "PLI-ACC (50 GWh) localisation continues; GST 2.0 keeps EVs at 5% while cutting ICE small vehicles to 18% — narrowing the EV price advantage at the entry level", why: "The 10-point GST gap (5% vs 18%) is much thinner than the old 5%-vs-28% gap; EV TCO superiority now does more of the persuasion work [21]", sowhat: "Value shifts to TCO-proof points: battery health, warranty analytics, charging cost optimisation — all software/data plays Bosch owns assets for", i: "high", subs: ["Battery & BMS", "V2G & Charging"], c: [21] },
      { cat: "Trade Policies & Geopolitics", p: "Cell and battery-material import dependence on China remains the sector's strategic vulnerability; PLI capacity and FTA diversification are the policy response", why: "LFP cells, precursors and processing remain China-centric; West Asia conflict adds freight/energy risk on top [2]", sowhat: "Chemistry-agnostic, multi-source BMS and pack designs are a resilience sell to OEMs — and the ACC-partner strategy hedges the cell dependence", i: "medium", subs: ["Battery & BMS"], c: [2] },
    ],
    Economic: [
      { cat: "Economic Growth & Consumer Spending", p: "FY27 growth trimmed to 6.6% (RBI Jun-26) with crude-price risk — a reminder that India's oil-import bill remains the macro case for electrification even as subsidies retire", why: "Elevated crude worsens the current account and pump prices, keeping EV TCO attractive for high-utilisation users regardless of subsidy [23]", sowhat: "Fleet and commercial segments (3W logistics, buses, e-trucks) are the structurally-driven adopters — align battery/charging offers to fleet duty cycles", i: "high", subs: ["V2G & Charging", "Battery & BMS"], c: [23] },
      { cat: "Inflation & Interest Rates", p: "Repo at 5.25% (neutral): EV financing costs stable; battery-as-a-service and leasing models remain rate-sensitive innovations to watch", why: "Financing structures that separate battery cost from vehicle cost depend on stable credit conditions to price residual risk [23]", sowhat: "Battery-health data (Bosch's asset) is the risk-pricing input these financing models need — a data-product opportunity independent of rate cycles", i: "medium", subs: ["Battery & BMS"], c: [23] },
      { cat: "Infrastructure Investment", p: "PM E-DRIVE's ₹2,000 Cr public-charging outlay plus highway charging corridors create funded, near-term demand for charging management software and power electronics", why: "EVPCS deployment across high-penetration cities and national highways is milestone-funded through 2028 [20]", sowhat: "Charging-management SW, load orchestration and DC fast-charging modules have a policy-guaranteed demand floor — the strongest near-term entry lane in this field", i: "high", subs: ["V2G & Charging"], c: [20] },
    ],
    Social: [
      { cat: "Consumer Behavior & Values", p: "Post-subsidy EV buying is TCO- and trust-led: charging anxiety and battery-degradation fear are the top residual barriers outside metros", why: "With purchase incentives gone for 2W/3W, adoption hinges on running-cost proof and battery confidence — surveys consistently rank charging access above price now [5]", sowhat: "Battery-health transparency, certified state-of-health reports and accurate range prediction are willingness-to-pay features — and the 10,000-workshop network is the trust channel to deliver them", i: "high", subs: ["Battery & BMS"], c: [5] },
      { cat: "Lifestyle & Consumer Behavior", p: "Gig-economy and last-mile logistics electrification (e-3W, e-LCV) is the volume adoption engine — TCO-rational buyers who monetise uptime", why: "Commercial users electrify on arithmetic, not sentiment; e-3W is already majority-electric in several states [6]", sowhat: "Fleet telematics + battery analytics + depot-charging bundles serve the fastest-growing buyer — and fleets are the natural V2G aggregation point", i: "high", subs: ["V2G & Charging", "Battery & BMS"], c: [6] },
      { cat: "Digital Literacy & Connectivity", p: "UPI-default payment behaviour (23B+ transactions/month) makes app-based charging payment, P2P energy settlement and energy-wallet concepts frictionless to adopt", why: "Charging and energy-trading UX can assume universal digital-payment fluency — unique among major auto markets [24]", sowhat: "Build charging/V2G products UPI-native from day one; links to the Fintech field's in-vehicle payment thesis", i: "medium", subs: ["V2G & Charging", "New Energy Tech"], c: [24] },
    ],
    Technological: [
      { cat: "Emerging Technologies", p: "LFP dominates Indian packs; sodium-ion pilots progress for entry segments and stationary storage — chemistry optionality is becoming a design requirement", why: "Na-ion's raw-material independence and thermal robustness suit India strategically despite lower energy density [7]", sowhat: "A chemistry-agnostic BMS platform (LFP today, Na-ion ready) is a genuine differentiator versus single-chemistry startups — H3 positioning with H1 revenue", i: "high", subs: ["Battery & BMS", "New Energy Tech"], c: [7] },
      { cat: "Interoperability & Standards", p: "CCS2 anchors DC charging while ISO 15118 / OCPP 2.x mature for smart charging and V2G; battery-swap interoperability standards remain unsettled", why: "Standardisation collapses integration costs for charging management; the swap segment's fragmentation is both risk and consolidation opportunity [8]", sowhat: "Ride open standards for charging-management scale-out; treat swap-standard participation as low-cost optionality", i: "high", subs: ["V2G & Charging"], c: [8] },
      { cat: "Data-Driven Insights", p: "Battery lifecycle data (SoH, usage, thermal history) is becoming the sector's most monetisable asset — feeding financing, insurance, resale and second-life markets", why: "Every downstream market (UBI, residual value, recycling routing) prices on battery-state data quality [16]", sowhat: "Bosch BMS data + workshop certification can anchor a battery-data product line spanning the Fintech and Sustainability fields — portfolio-level synergy", i: "high", subs: ["Battery & BMS"], c: [16] },
    ],
    Environmental: [
      { cat: "Climate Policy & Emission Regulations", p: "Net Zero 2070 + 500 GW renewables reshape the grid the EV fleet plugs into — midday solar surplus makes managed charging and V2G grid-valuable, not just user-valuable", why: "Solar-heavy generation needs flexible load; EV batteries are the largest distributed flexibility resource being added to the system [10]", sowhat: "Position charging-management as grid-services infrastructure — discom revenue stream beyond automotive customers", i: "high", subs: ["V2G & Charging", "New Energy Tech"], c: [10] },
      { cat: "Circular Economy & E-Waste", p: "Battery Waste Rules EPR plus ELV Rules 2025 formalise end-of-life obligations — traceability, grading and second-life routing become compliance necessities, not options", why: "Producers must evidence collection and recycling; the vehicle-scrapping market's growth ($12.8B→$31.7B by 2033) industrialises the reverse chain [9][22]", sowhat: "Battery diagnostics + the workshop network position Bosch as the data-and-certification layer of battery circularity — the Sustainability field's LEAD play, seeded here", i: "high", subs: ["Battery & BMS"], c: [9, 22] },
      { cat: "Physical Climate Risk", p: "Extreme-heat operation is India's defining battery-engineering constraint — thermal management and heat-adapted chemistry strategies decide real-world durability", why: "Sustained 45°C+ ambient accelerates degradation and drove AIS-156 tightening after thermal incidents [11]", sowhat: "India-validated thermal design and safety credentials are decisive sales arguments — a Bosch engineering strength monetised", i: "high", subs: ["Battery & BMS"], c: [11] },
    ],
    Legal: [
      { cat: "Automotive Industry Regulations", p: "AIS-156 (amended) battery-safety norms set a high certification bar — cell-level protections, thermal-propagation tests, audit trails", why: "Post-fire-incident tightening raised engineering and documentation requirements substantially [11]", sowhat: "Proven Tier-1 functional-safety pedigree is both a sales argument and a barrier against low-cost entrants — price it into positioning", i: "high", subs: ["Battery & BMS"], c: [11] },
      { cat: "Data Privacy & Security Law", p: "DPDP Rules (notified late-2025, phased to ~2027) govern battery-cloud and charging-session data — consent, purpose-limitation and India-residency expectations apply", why: "Battery telemetry and charging behaviour are personal data once linked to owners; compliance architecture must be designed-in [12]", sowhat: "India-hosted, consent-native battery cloud is a compliance moat versus informal players — reuse the Connectivity field's DPDP stack", i: "medium", subs: ["Battery & BMS", "V2G & Charging"], c: [12] },
      { cat: "Taxation & Corporate Law", p: "GST asymmetry (EVs 5%, charging services and components at higher rates) creates structuring complexity for bundled vehicle+energy offerings", why: "Battery-as-a-service, charging subscriptions and V2G settlements each face distinct GST treatments still being clarified [21]", sowhat: "Deal-level tax structuring is a real cost; engage early on energy-service classification — and watch for rationalisation as the sector formalises", i: "low", subs: ["V2G & Charging"], c: [21] },
    ],
  },

  swot: {
    S: [
      { area: "Technology", p: "PS-ESB battery line + power-electronics portfolio already mapped to this field", why: "Existing engineering, supplier base and manufacturing assets mean entry reuses sunk capability instead of greenfield build — months, not years, to first product", sowhat: "Lead the Battery & BMS sub-field directly; price the speed advantage" },
      { area: "People", p: "Bengaluru software organisation + SdV stack", why: "BMS algorithms, OTA update pipeline and cloud telematics already exist in the SdV stack, staffed by thousands of India-cost engineers", sowhat: "Differentiate on software (health analytics, predictive thermal mgmt) where hardware-only rivals can't follow" },
      { area: "Market", p: "10,000+ Bosch car-service workshops across India", why: "No competitor has a comparable physical network for battery health checks, certified repairs, retrofits and warranty handling", sowhat: "Build a service-revenue moat (battery-health-as-a-service) that is structurally hard to copy" },
    ],
    W: [
      { area: "Technology", p: "No cell manufacturing", why: "Chemistry-level innovation and cost control sit with cell makers; Bosch is a system integrator one layer up", sowhat: "Don't compete on cells — lock in partnerships with ACC-PLI winners; treat cell supply as a managed dependency" },
      { area: "Process", p: "Premium cost structure vs Indian BMS startups", why: "EU-derived platforms carry ~25–30% cost disadvantage in the 2W segment where most Indian volume sits", sowhat: "Needs a dedicated India-cost product line or a startup acquisition — flagged in the entry-mode recommendation" },
    ],
    O: [
      { p: "PLI-ACC awardees need proven pack/BMS partners", why: "Awardees are strong on cells but thin on pack integration, functional safety and field quality — exactly Bosch's strengths", sowhat: "Offer pack/BMS integration partnerships now, before Chinese Tier-1s lock these relationships" },
      { p: "Fleet electrification needs charging-management software", why: "3W/LCV logistics fleets are the earliest TCO adopters and need depot-charging orchestration, load management and battery analytics", sowhat: "Pilot with 2–3 fleets; monetise via the mapped Workshop Services & Fleet BBM stream" },
    ],
    T: [
      { p: "Top Indian OEMs are in-housing BMS", why: "Leading 2W OEMs are building internal BMS teams to control cost and own battery data — shrinking the merchant market", sowhat: "Counter with superior safety certification and faster update cadence; target OEMs below the top tier plus fleets" },
      { p: "Chinese pack/BMS imports 25–30% cheaper", why: "Scale and vertical integration give Chinese suppliers a durable cost edge; entry via JV routes continues", sowhat: "Defend with localisation, AIS-156 safety positioning and service bundling; monitor BIS/import-policy shifts" },
    ],
    tows: {
      SO: "Use PS-ESB battery assets + workshop network + SdV software (S) to win pack/BMS integration partnerships with ACC-PLI awardees (O) before Chinese rivals lock those relationships.",
      ST: "Use the workshop service network + SdV software depth (S) to offer lifecycle battery-health services that price-only Chinese imports cannot match (T) — converting the channel into a durable moat.",
      WO: "Offset premium cost structure (W) by targeting fleet EV pilots where safety certification and BMS software command pricing premium (O) rather than fighting on cost in the 2W mass market.",
      WT: "Mitigate the no-cells gap + cost premium (W) against OEM in-housing and Chinese imports (T) by locking PLI-winner BMS partnerships before the market window closes — speed beats cost.",
    },
    targetStrategy: {
      growth: [
        { lever: "Strong power-electronics and battery assets (PS-ESB)", action: "Co-create pack and BMS solutions with ACC-PLI cell makers — lead the Battery & BMS sub-field" },
        { lever: "10,000+ workshop network", action: "Launch battery-health-as-a-service: certified check-ups, warranty support and resale reports" },
      ],
      improvement: [
        { gap: "No cell-chemistry know-how", action: "Partner with cell makers; do not build — treat cells as a managed supply risk" },
        { gap: "Cost base too high for 2W price points", action: "Build a dedicated India-cost BMS line, or buy an Indian BMS startup" },
      ],
    },
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
    attractiveness: {
      maturity: "Growth",
      histCagr: "~35–45% (2021–25, EV components off a small base; estimate)",
      fwdCagr: "28% (2025–30)",
      drivers: ["Fleet & commercial electrification (3W, buses, e-trucks) on pure TCO logic", "Funded charging build-out to 2028 (PM E-DRIVE ₹2,000 Cr)", "Battery data services for financing, insurance and resale"],
      constraints: ["2W/3W purchase subsidies ended Mar-2026 — demand must stand on economics", "Cell and material imports still China-centric", "Top 2W OEMs building BMS in-house"],
      access: {
        channels: "OEM platform RFQs; direct fleet contracts; discom/CPO tenders for charging management",
        partners: "ACC-PLI cell makers, charge-point operators, discoms, fleet aggregators",
        barriers: "AIS-156 battery safety certification — a high bar that works in Bosch's favour",
        localization: "India-cost BOM redesign is essential for 2W/3W; local cell sourcing as PLI capacity ramps",
        cac: "High for OEMs (18–24 month RFQ cycles); low for fleets via pilot-to-contract",
      },
      valuePool: "Profit is moving from pack hardware (margins compressing with cell prices) to BMS software, battery-health data services and charging orchestration — the software and services layer is where returns will concentrate.",
      whiteSpace: [
        { p: "Certified battery-health reports for used EVs", why: "No trusted standard exists; resale and financing both need one", sub: "Battery & BMS" },
        { p: "Chemistry-agnostic BMS (LFP today, sodium-ion ready)", why: "Startups are locked to one chemistry; OEMs want optionality", sub: "Battery & BMS" },
        { p: "Depot charging + V2G orchestration for fleets", why: "Fleets electrify fastest and nobody owns the depot software layer yet", sub: "V2G & Charging" },
      ],
      profitability: "Hardware thin and price-led; software & services earn 2–3× hardware margins",
    },
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
  stakeholders: [
    { name: "MoHI / PM E-DRIVE / FAME Programme Office", type: "government", influence: 10, interest: 8, stance: "ally", reasoning: "PM E-DRIVE demand incentives and charging-capex allocation are the primary market-creation mechanism." },
    { name: "ACC PLI awardees (Ola Electric, Rajesh Exports, Reliance NEU)", type: "oem", influence: 8, interest: 8, stance: "ally", reasoning: "PLI cell makers need proven pack/BMS integration partners — Bosch's primary near-term B2B opportunity." },
    { name: "2W/3W OEMs (Ola, Ather, Hero, TVS)", type: "oem", influence: 9, interest: 8, stance: "neutral", reasoning: "BMS sourcing decision-makers; top OEMs in-housing, mid-tier remain open — segment carefully." },
    { name: "Discoms & fleet operators", type: "consumer", influence: 6, interest: 7, stance: "ally", reasoning: "Fleet charging-management and V2G pilots — the mapped Workshop Services & Fleet BBM stream." },
    { name: "Chinese JV BMS entrants (CATL India, BYD)", type: "supplier", influence: 7, interest: 5, stance: "blocker", reasoning: "Cost-advantage rivals entering India via JV routes; Bosch must differentiate on safety and service." },
  ],
  competitors: [
    { name: "CATL (India JV entry)", type: "global", x_price_position: 3, y_tech_depth: 9, moat: "Cell + pack vertical integration + 25% cost advantage", reasoning: "The dominant competitive threat; Bosch counters with AIS-156 safety positioning and service bundling." },
    { name: "BYD India", type: "global", x_price_position: 3, y_tech_depth: 8, moat: "Vertically integrated EV + BMS", reasoning: "OEM+BMS integration model; Bosch targets the merchant BMS market for non-BYD OEMs." },
    { name: "Exicom / Servotech (Indian BMS/charger)", type: "indian-incumbent", x_price_position: 4, y_tech_depth: 6, moat: "India-cost charger manufacturing + local OEM trust", reasoning: "Cost-competitive in chargers; Bosch differentiates on software + functional safety." },
    { name: "Log9 / Batt:RE (Indian BMS startups)", type: "startup", x_price_position: 4, y_tech_depth: 6, moat: "Fast product cycles + VC backing", reasoning: "Startup BMS makers moving quickly; Bosch's safety certification and scale are the counter." },
    { name: "Bosch (target position)", type: "global", x_price_position: 6, y_tech_depth: 8, moat: "PS-ESB assets + SdV BMS SW + 10,000-workshop service network", reasoning: "System-integration + service depth — a position no pure-hardware rival can replicate." },
  ],
  competitorWhiteSpace: "BMS software + battery-health-as-a-service combining engineering depth with a physical workshop network — Chinese cost players lack the service; Indian startups lack the safety certification and scale.",
  suppliers: [
    { input: "Battery cells (LFP, NMC)", supply_risk: 8, profit_impact: 9, quadrant: "strategic", reasoning: "No India cell production at scale yet; Chinese import dependency is structural — lock ACC PLI partnerships." },
    { input: "Power electronics (SiC MOSFETs, gate drivers)", supply_risk: 7, profit_impact: 8, quadrant: "strategic", reasoning: "SiC allocation-sensitive; coordinate with ECA field for joint supply strategy." },
    { input: "BMS ICs / AFE chips", supply_risk: 6, profit_impact: 7, quadrant: "strategic", reasoning: "Analog front-end chips from TI/ADI/Renesas; moderate concentration risk." },
    { input: "Thermal management materials", supply_risk: 4, profit_impact: 5, quadrant: "leverage", reasoning: "Multiple suppliers; competitive." },
    { input: "Charging connectors / cables", supply_risk: 3, profit_impact: 4, quadrant: "non-critical", reasoning: "Commoditised; managed through procurement." },
  ],
  sources: [
    "PIB — PM E-DRIVE scheme notification", "PLI-ACC programme & state EV policies", "Vahan EV registration dashboard",
    "Cell price index trackers", "EV consumer adoption surveys (2026)", "e-3W market penetration data",
    "Cell chemistry roadmap briefings", "ISO 15118 / OCPP discom pilot reports", "Battery Waste Management Rules, MoEFCC",
    "CEA renewable integration reports", "AIS-156 amendment circulars", "DPDP Act 2023 & rules",
    "NITI Aayog EV forecasts", "Component teardown benchmarks", "Charger rollout economics",
    "Analyst reports, India EV components", "Startup funding trackers (BMS/charging)", "2W OEM market-share data", "Battery swapping market studies",
    "MHI PM E-DRIVE extension notification (Aug-2025)", "GST Council 56th meeting (Sept-2025)", "NITI Aayog ELV circular-economy report (Jan-2026)", "RBI MPC Jun-2026", "NPCI UPI statistics (May-2026)",
  ],
},

  lighting: {
    ma: ["New"], bbm: ["SW System for SdV", "Future Vehicle System for SdV"],
    criterionScores: [
      { ...WEIGHTS[0], s: 5.4, conf: 0.84, why: "Strong in ECUs/SW and sensing, but no luminaire/optics franchise — the core hardware competency sits with lighting Tier-1s. See Competency tab." },
      { ...WEIGHTS[1], s: 5.8, conf: 0.80, why: "SW/controller strengths are real but the field is owned by entrenched lighting specialists with locked OEM platforms. See SWOT tab." },
      { ...WEIGHTS[2], s: 6.6, conf: 0.78, why: "$2.5B market at 6.2% CAGR (6Wresearch); sizeable but steady, and only the control/SW slice is Bosch-addressable. See Market tab." },
      { ...WEIGHTS[3], s: 5.6, conf: 0.82, why: "Entrenched incumbents, strong buyer power, platform lock-ins — a hard field to break into mid-cycle. See Attractiveness tab." },
      { ...WEIGHTS[4], s: 7.4, conf: 0.83, why: "Lighting is becoming software (adaptive, personalised, communicative) — the SW layer is where growth concentrates. See 3 Horizons tab." },
    ],
    pestel: {
      Political: [
        { cat: "Government Schemes & Incentives", p: "GST 2.0 (Sept-2025) cut small cars & ≤350cc 2W from 28% to 18% and most auto components to 18% — a structural demand stimulus for exactly the volume segments where LED/adaptive lighting content is expanding", why: "The 56th GST Council restructuring made mass-segment vehicles materially cheaper (₹50–60k on compact cars), pulling forward first-time purchases; components at 18% also eases lighting-electronics BOM tax cascade [9]", sowhat: "Volume-segment tailwind lands precisely where lighting content-per-vehicle is rising — time controller/SW entry to the demand upcycle rather than premium niches", i: "high", subs: ["Controllers", "Application SW"], c: [9] },
        { cat: "Government Stability & Policy Certainty", p: "Stable policy trajectory on vehicle safety (BNCAP maturing, MoRTH visibility norms tightening) gives multi-year certainty to safety-lighting investment", why: "BNCAP star-rating competition plus continuing AIS visibility/conspicuity updates create a predictable, ratcheting safety agenda rather than stop-go regulation [1]", sowhat: "Adaptive front-lighting and auto-high-beam investments can be business-cased on regulatory direction, not just OEM whim — lowers entry risk for the control layer", i: "medium", subs: ["Exterior Lighting", "Application SW"], c: [1] },
        { cat: "Trade Policies & Geopolitics", p: "High effective import duties on finished lighting modules (GST + customs can exceed 50%) plus Make-in-India pressure force localisation — protecting incumbents but also any locally-manufacturing entrant", why: "Tariff walls discourage finished-module imports; OEM sourcing clauses increasingly weight domestic value-addition [2]", sowhat: "Bosch's Indian electronics manufacturing footprint qualifies as 'local' — a levelling advantage against import-dependent global rivals in controllers", i: "medium", subs: ["Controllers"], c: [2] },
      ],
      Economic: [
        { cat: "Economic Growth & Consumer Spending", p: "FY26 GDP at ~7.4–7.6% with FY27 forecast 6.6% (RBI, Jun-26) keeps PV/2W volume growth positive but decelerating — content-per-vehicle, not units, is the growth engine for lighting", why: "RBI trimmed FY27 growth on West Asia conflict and crude risk; discretionary auto demand stays resilient but not exuberant [11]", sowhat: "Revenue thesis must rest on rising electronics/SW content per lamp (premiumisation) rather than unit-volume heroics — consistent with the control/SW entry", i: "high", subs: ["Application SW", "Controllers"], c: [11] },
        { cat: "Inflation & Interest Rates", p: "Repo held at 5.25% (neutral) with FY27 CPI ~5.1% — vehicle-loan EMIs stable, but no further rate-cut tailwind for big-ticket purchases", why: "RBI paused its easing cycle in Jun-26 balancing rupee weakness and imported inflation [11]", sowhat: "Neutral financing environment: neither headwind nor accelerant — plan mid-cycle demand, not a credit boom", i: "low", subs: [], c: [11] },
        { cat: "Currency & Exchange Rate", p: "INR weakening bias raises imported LED-chip, driver-IC and MCU costs — a margin risk for lighting electronics with import-heavy BOMs", why: "Lighting-electronics BOMs are dominated by imported semiconductors; rupee depreciation flows straight into BOM cost [11]", sowhat: "Localised electronics manufacturing plus ISM-qualified silicon (as it matures) becomes a genuine cost hedge — link sourcing strategy to the ECA field's ISM play", i: "medium", subs: ["Controllers"], c: [11] },
      ],
      Social: [
        { cat: "Consumer Behavior & Values", p: "Signature DRLs, welcome animations and ambient themes are now showroom decision factors in the compact-SUV war — lighting has become identity, not just illumination", why: "OEM marketing leads with light signatures; social-media reviews benchmark lighting experience like phone screens [3]", sowhat: "Personalisation/experience SW (themes, scenarios, app control) is a monetisable layer with genuine willingness-to-pay — the Application SW sub-field's core thesis", i: "high", subs: ["Interior Lighting", "Application SW"], c: [3] },
        { cat: "Demographics & Urbanization", p: "A median-age-29 buyer base treats vehicle tech features as status and self-expression — accelerating uptake of visible tech like adaptive and ambient lighting down-segment", why: "Young first-time buyers over-index on visible differentiation versus mechanical specs; urbanisation concentrates night-driving use cases [3]", sowhat: "Feature democratisation happens faster in India than mature markets — plan adaptive-lighting SW for ₹10–15L cars, not just premium", i: "medium", subs: ["Exterior Lighting"], c: [3] },
        { cat: "Technology Adoption Behavior", p: "App-controlled and OTA-updatable features are now expected behaviours (phone-conditioned users) — lighting scenarios delivered via OTA fit established habits", why: "660M smartphone users and app-first product expectations transfer directly to vehicle feature expectations [3]", sowhat: "Ship lighting personalisation as OTA content on the SdV stack — recurring-engagement feature, potential FOD (feature-on-demand) revenue", i: "medium", subs: ["Application SW"], c: [3] },
      ],
      Technological: [
        { cat: "Emerging Technologies", p: "Matrix/pixel LED beam shaping is a perception + control problem — it consumes ADAS camera data and runs on domain/zonal ECUs, competencies outside classic lamp makers", why: "Adaptive beams require real-time fusion of camera, vehicle dynamics and mapping data — a software discipline, not an optics one [4]", sowhat: "The control/SW layer of matrix lighting sits exactly on Bosch's ADAS + SdV assets — the structural entry logic of this whole field", i: "high", subs: ["Exterior Lighting", "Controllers", "Application SW"], c: [4] },
        { cat: "Interoperability & Standards", p: "Lighting joining zonal E/E architectures forces lamp functions onto standardised vehicle networks, OTA frameworks and cybersecurity regimes lamp Tier-1s don't own", why: "Zonal consolidation moves lighting control off dedicated lamp ECUs onto shared computers with AUTOSAR/SOA interfaces [4]", sowhat: "Integration and SDV-plumbing partnership demand from lighting incumbents — the coopetition channel", i: "medium", subs: ["Controllers"], c: [4] },
        { cat: "Pace of Change", p: "Lighting tech cycles have compressed: halogen→LED took a decade, LED→adaptive/pixel is compressing into platform cycles — spec decisions made now lock 5–7 year sockets", why: "OEM platform refreshes now carry lighting-architecture upgrades by default; late entry means waiting a full platform cycle [4]", sowhat: "The 12–18 month partner-window logic in this field's SWOT is driven by this cadence — timing risk is real", i: "medium", subs: ["Exterior Lighting"], c: [4] },
      ],
      Environmental: [
        { cat: "Climate Policy & Emission Regulations", p: "CAFE-III (draft: Apr-2027–Mar-2032, fleet 3.73→3.01 L/100km) makes every watt count — intelligent lighting control contributes measurable efficiency", why: "Selective-pixel operation and smart dimming reduce electrical load; under CAFE accounting, lighting efficiency is a small but real credit [10]", sowhat: "Position lighting-control SW partly as an efficiency feature — an additional purchase argument as OEMs chase CAFE-III compliance", i: "medium", subs: ["Application SW", "Controllers"], c: [10] },
        { cat: "Physical Climate Risk", p: "Indian conditions — extreme heat, monsoon ingress, dust — are brutal on LED thermal management and optics lifespan; India-hardened design is a differentiator", why: "LED lumen depreciation accelerates with heat; ingress and dust demand higher IP ratings than temperate-market designs [5]", sowhat: "India-validated reliability engineering (a Bosch strength) is a sales argument for controllers and a partnership asset toward lamp makers", i: "medium", subs: ["Exterior Lighting", "Controllers"], c: [5] },
        { cat: "Circular Economy & E-Waste", p: "ELV Rules 2025 EPR obligations extend to electronic lamp modules — repairability and material recovery enter lighting design requirements", why: "Steel-linked EPR targets and e-waste rules pull lighting electronics into producer-responsibility scope [10]", sowhat: "Design-for-serviceability in lighting ECUs aligns with the Sustainability field's right-to-repair thesis — cross-field coherence", i: "low", subs: ["Controllers"], c: [10] },
      ],
      Legal: [
        { cat: "Automotive Industry Regulations", p: "Every lighting function needs AIS type-approval via ARAI/ICAT — homologation muscle-memory and test capacity are a genuine moat for incumbents and a partner-selection criterion", why: "Photometric certification is specialised, slot-constrained and experience-dependent; new entrants underestimate its timeline [6]", sowhat: "The partner-not-build decision for optics is legally reinforced — pick a partner with proven homologation throughput", i: "high", subs: ["Exterior Lighting"], c: [6] },
        { cat: "Taxation & Corporate Law", p: "GST 2.0 put most auto components at 18%, simplifying the lighting-electronics tax structure and reducing cascade in multi-tier supply chains", why: "Uniform 18% on components removes classification disputes that plagued lighting assemblies (lamp vs electronics vs SW licence) [9]", sowhat: "Cleaner cost modelling for controller + SW bundles; SW licencing GST treatment still needs deal-level structuring", i: "low", subs: ["Controllers", "Application SW"], c: [9] },
        { cat: "Data Privacy & Security Law", p: "Camera-linked adaptive lighting processes road-scene data — DPDP-compliant handling and AIS-189 cyber requirements apply to the lighting-control chain", why: "Once lighting consumes perception data and accepts OTA updates, it inherits vehicle data-protection and CSMS obligations [6]", sowhat: "Bosch's cyber/DPDP compliance stack (Connectivity field) becomes a bundled differentiator even in lighting deals", i: "medium", subs: ["Application SW"], c: [6] },
      ],
    },
    swot: {
      S: [
        { area: "Technology", p: "ADAS camera + SdV stack already produce the data adaptive lighting consumes", why: "Auto high-beam and matrix control are downstream consumers of Bosch's existing perception pipeline — no new sensing investment needed", sowhat: "Enter via the lighting-control/Application-SW layer where Bosch is strong, not the luminaire layer where it is absent" },
        { area: "People", p: "Large India SW org can build personalisation/HMI lighting features at India cost", why: "Theme engines, app integration and OTA-updatable lighting scenarios are software products — Bengaluru can ship them", sowhat: "Offer 'lighting experience SW' to OEMs as part of cockpit/SdV deals already in motion" },
      ],
      W: [
        { area: "Technology", p: "No optics, luminaire or photometrics franchise", why: "Bosch has never been a lamp Tier-1; optics design, thermal management of LEDs and photometric certification are absent competencies", sowhat: "Hardware entry would be build-from-zero against entrenched specialists — avoid; partner instead" },
        { area: "Leadership", p: "M&A mapping for this field is 'New' — no existing hooks", why: "Unlike other fields, there is no mapped partnership/M&A asset to accelerate entry", sowhat: "Any serious move needs a fresh partner/target screen first — adds 6–12 months to entry" },
      ],
      O: [
        { p: "Lighting Tier-1s lack SDV-grade software & cybersecurity depth", why: "As lighting joins the zonal architecture, lamp makers must integrate with domain controllers, OTA and security frameworks they don't own", sowhat: "Position Bosch as the SW/integration partner to lighting incumbents — complementary, not competitive" },
        { p: "BNCAP safety race pulls adaptive lighting into mass segments", why: "Safety-feature competition moves faster than regulation; adaptive beam tech will trickle to ₹10–15L cars", sowhat: "Volume opportunity for control ECUs + SW exactly when OEMs re-source platforms" },
      ],
      T: [
        { p: "Entrenched incumbents with locked multi-year platform awards", why: "Lumax, Uno Minda, Varroc, Fiem plus global JVs hold long-cycle OEM platform contracts; displacement mid-cycle is rare", sowhat: "Time entry to new platform RFQs (EV platforms especially); don't fight existing awards" },
        { p: "Lighting Tier-1s building their own electronics/SW teams", why: "Incumbents see the same software shift and are hiring; the partnership window narrows over time", sowhat: "Move within 12–18 months or the SW-partner slot gets filled" },
      ],
      tows: {
        SO: "Use ADAS-camera + SdV software assets (S) to lead adaptive/matrix lighting CONTROL as BNCAP pulls these features into mass segments (O) — win the software layer on existing hardware sockets.",
        ST: "Use the SdV/cybersecurity software depth (S) to become the integration partner lighting Tier-1s lack (T), converting a competitive threat into a partnership rather than a head-on fight.",
        WO: "Offset the absent optics/luminaire franchise (W) by partnering an incumbent lamp maker to capture the BNCAP-driven adaptive-lighting opportunity (O) — Bosch control + partner optics.",
        WT: "Mitigate no-optics-franchise + no-M&A-hooks (W) against entrenched, software-building incumbents (T) by moving within 12–18 months to lock the SW-partner slot before it closes; avoid any lamp-hardware bet.",
      },
      targetStrategy: {
        growth: [
          { lever: "ADAS perception + SdV software assets", action: "Co-create adaptive-lighting control with OEMs — sell the software layer on existing camera hardware" },
          { lever: "India software organisation at India cost", action: "Build differentiated personalisation features (themes, OTA scenarios) bundled into cockpit deals" },
        ],
        improvement: [
          { gap: "No optics or lamp franchise", action: "Partner an incumbent lamp maker — Bosch control electronics + partner optics in joint OEM offers" },
          { gap: "Low visibility in the lighting market (no M&A hooks)", action: "Run a partner/target screen within 6 months; move before lamp Tier-1s build their own software teams" },
        ],
      },
      strategy: "Do not build lamps. Enter the control & Application-SW layer (auto-dimming, matrix control, personalisation) on the back of existing ADAS/SdV assets, partnering with an incumbent lamp maker for optics and homologation.",
      scoreRationale: "Score 5.8: genuine, reusable SW strengths but both weaknesses are structural (no optics franchise, no M&A hooks) and the threats are timing-sensitive. Net position is workable only with a narrow, software-scoped entry.",
    },
    market: {
      tam: 2500, sam: 620, cagr: 6.2, year: 2030,
      derivation: [
        { step: "India automotive lighting market 2025 (all segments)", value: "$1.64B", src: "Renub/Research&Markets; 6Wresearch base [7]" },
        { step: "× 6.2% CAGR over the 2025–2031 forecast period", value: "→ ~$2.5B by 2030", src: "6Wresearch internal database & industry insights (CAGR 6.2%, 2025–2031) [7]" },
        { step: "Electronics + software content share (controllers, drivers, adaptive SW)", value: "~32% and rising", src: "Teardown benchmarks; estimate [4]" },
        { step: "Serviceable filter: control/SW layer + adaptive-system electronics, Bosch-addressable (excl. luminaires/optics)", value: "≈25% of TAM", src: "Bosch-addressable scope; estimate" },
        { step: "= SAM (2030)", value: "~$0.62B", src: "Derived — estimate" },
      ],
      crossCheck: "Cross-check: Mordor pegs the market at ~$2.31B by 2030 (5.87% CAGR) and Renub/R&M at $2.78B by 2034 (6.02%); 6Wresearch's 6.2% on a $1.64B 2025 base lands ~$2.2–2.5B by 2030 — a $2.5B TAM sits at the credible upper-middle of independent estimates [7].",
      customers: [
        { s: "PV & 2W OEMs", buy: "Lighting control ECUs, adaptive-beam SW, personalisation features", note: "Buy at platform sourcing — time entry to new EV platforms" },
        { s: "Lighting Tier-1s", buy: "Domain integration, cybersecurity, OTA frameworks", note: "Partner channel — they need SDV plumbing" },
        { s: "Aftermarket", buy: "Retrofit & accessory lighting electronics", note: "Bosch retail network is a niche channel" },
      ],
      attractiveness: {
        maturity: "Mature (lamps) · Growth (electronics & SW)",
        histCagr: "~7–8% (2020–25, LED transition years; estimate)",
        fwdCagr: "6.2% (2025–30) — electronics/SW slice growing faster",
        drivers: ["Adaptive/matrix lighting moving down-segment on the BNCAP safety race", "Rising electronics & software content per lamp (~32% and climbing)", "GST 2.0 volume stimulus in small cars & 2W"],
        constraints: ["Aggressive OEM price-downs on conventional lighting", "Multi-year platform awards locked with incumbents", "Optics hardware fully commoditised"],
        access: {
          channels: "OEM platform RFQs at new-model sourcing; joint offers with lamp Tier-1s",
          partners: "Incumbent lamp makers (optics + homologation); cockpit/SdV programme teams",
          barriers: "AIS photometric homologation per lighting function — favours certified incumbents",
          localization: "High — OEM sourcing clauses weight domestic value-add; imported modules face 50%+ effective duties",
          cac: "High if entering alone (no lighting-commodity relationships); low riding a lamp-maker partnership",
        },
        valuePool: "Value is shifting from the lamp to the controller and the software that shapes the beam — control ECUs, adaptive algorithms and personalisation features are where profit will concentrate.",
        whiteSpace: [
          { p: "Lighting-control software for matrix/pixel lamps", why: "Lamp makers lack perception software; Bosch already has the camera data", sub: "Application SW" },
          { p: "SDV integration services for lamp Tier-1s", why: "Lighting is joining zonal networks; incumbents need the plumbing", sub: "Controllers" },
          { p: "OTA lighting personalisation as a paid feature", why: "OEMs want feature-on-demand revenue; lighting themes are low-risk and highly visible", sub: "Application SW" },
        ],
        profitability: "Lamps commodity-thin; controllers moderate; software highest — enter at the top of the stack",
      },
      scoreRationale: "Score 6.6: a $2.5B field (6.2% CAGR, 6Wresearch) but only ~$0.62B is realistically Bosch-addressable (control/SW layer), and growth is steady GDP-plus rather than exponential. Confidence 0.78: market size now triangulated across 6Wresearch, Mordor and Renub; the SW-share split remains a Bosch estimate.",
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
    stakeholders: [
      { name: "MoRTH / BNCAP", type: "regulator", influence: 9, interest: 7, stance: "ally", reasoning: "Safety-rating and visibility norms pull adaptive lighting forward; a regulator whose agenda aligns with Bosch's control-SW offer." },
      { name: "PV & 2W OEMs", type: "oem", influence: 9, interest: 8, stance: "neutral", reasoning: "Decide sourcing at platform level; treat lighting as cost-plus-differentiation — must be won feature-by-feature." },
      { name: "Lighting Tier-1s (Lumax, Uno Minda, Varroc, Fiem)", type: "supplier", influence: 7, interest: 6, stance: "neutral", reasoning: "Own optics & OEM relationships; potential partners for the control layer or competitors if they build SW in-house." },
      { name: "Bosch internal (Mobility BUs)", type: "oem", influence: 6, interest: 8, stance: "ally", reasoning: "ADAS/SdV teams supply the camera data and compute the lighting-control offer rides on." },
      { name: "End consumers", type: "consumer", influence: 5, interest: 5, stance: "ally", reasoning: "Increasingly value signature/personalised lighting — willingness-to-pay for experience SW." },
    ],
    competitors: [
      { name: "Lumax Industries", type: "indian-incumbent", x_price_position: 6, y_tech_depth: 7, moat: "OEM relationships + Stanley/Valeo alliances; dominant lamp share", reasoning: "Leads on optics & platform awards; thinner on SDV-grade software — the gap Bosch targets." },
      { name: "Uno Minda", type: "indian-incumbent", x_price_position: 5, y_tech_depth: 6, moat: "Broad component portfolio + scale", reasoning: "Cost-competitive lamp maker expanding into electronics; a likely both-partner-and-rival." },
      { name: "Varroc Lighting", type: "indian-incumbent", x_price_position: 6, y_tech_depth: 7, moat: "Global lighting engineering footprint", reasoning: "Strong on lamp engineering; SDV software integration is the white space." },
      { name: "Global Tier-1s (Marelli, ZKW/Magna, Koito)", type: "global", x_price_position: 8, y_tech_depth: 9, moat: "Matrix/laser optics IP", reasoning: "Premium optics leaders, but cost structure and India SW localisation favour a Bosch SW partnership." },
      { name: "Bosch (target position)", type: "global", x_price_position: 7, y_tech_depth: 8, moat: "ADAS/SdV software + cross-domain compute", reasoning: "Enters at the control/Application-SW layer, not optics — the differentiated quadrant." },
    ],
    competitorWhiteSpace: "The high-tech-depth / software-defined quadrant is largely unoccupied by lamp incumbents — adaptive-lighting CONTROL + personalisation SW is the white space Bosch can own without an optics franchise.",
    suppliers: [
      { input: "LED chips & packages", supply_risk: 4, profit_impact: 6, quadrant: "leverage", reasoning: "Broad Asian supply base; competitive — manage on price/multi-sourcing, low risk." },
      { input: "LED driver ICs", supply_risk: 5, profit_impact: 6, quadrant: "leverage", reasoning: "Several vendors; moderate impact on cost and performance." },
      { input: "Automotive MCUs / lighting controllers", supply_risk: 7, profit_impact: 8, quadrant: "strategic", reasoning: "Allocation-sensitive and performance-critical — strategic supplier relationships needed (shared with ECA field)." },
      { input: "Optics / lens & reflector tooling", supply_risk: 6, profit_impact: 7, quadrant: "bottleneck", reasoning: "Specialised tooling concentrated with lamp Tier-1s — the reason to partner rather than build optics." },
      { input: "Thermal-management parts", supply_risk: 3, profit_impact: 4, quadrant: "non-critical", reasoning: "Commoditised; low risk and impact." },
    ],
    sources: ["MoRTH/BNCAP visibility norms", "Lighting content-per-vehicle benchmarks", "OEM feature marketing analysis", "Matrix LED architecture briefings", "LED efficiency studies", "AIS homologation requirements", "India lighting market reports", "Tier-1 annual reports & platform awards", "GST Council 56th meeting decisions (Sept-2025)", "BEE CAFE-III draft & SIAM debate", "RBI MPC Jun-2026"],
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
      Political: [
        { cat: "Government Schemes & Incentives", p: "GST 2.0's 28%→18% cut on small cars pulls screen-rich trims into reach of first-time buyers — the volume stimulus lands exactly where cockpit content is climbing", why: "The Sept-2025 restructuring made mass-segment PVs materially cheaper; buyers upgrade trims rather than pocket the difference, and mid trims now carry twin displays [9]", sowhat: "Time the pre-integrated cockpit bundle for volume-segment platforms, not just premium — the demand pull is at ₹8–15L price points", i: "high", subs: ["Hardware", "System Integrator"], c: [9] },
        { cat: "Government Schemes & Incentives", p: "Bhashini & India-stack make local-language voice a quasi-policy expectation — vernacular AI is both differentiator and policy-aligned", why: "Government-backed language AI (Bhashini APIs, 22 scheduled languages) lowers the cost of vernacular voice and raises buyer expectations of it [1]", sowhat: "A 10+ language AI cockpit voice assistant built on open Indian language stacks — the single most India-specific cockpit feature", i: "medium", subs: ["SW"], c: [1] },
      ],
      Economic: [
        { cat: "Economic Growth & Consumer Spending", p: "Cockpit content per vehicle is the fastest-growing line in Indian PV BOMs — the field grows on mix even in a 6.6%-GDP year", why: "Twin 10–12 inch displays reached ₹10L cars; HUDs and rear screens are entering ₹20L — content per vehicle tripled in five years [2]", sowhat: "Even flat unit volumes deliver strong revenue growth — the field grows on mix, not just units", i: "high", subs: ["Hardware", "SW"], c: [2] },
        { cat: "Currency & Exchange Rate", p: "INR weakening directly inflates cockpit BOMs — SoCs and display panels are near-100% imported, making cockpit the most currency-exposed content line in the vehicle", why: "Cockpit silicon and panels are dollar-denominated; rupee depreciation flows straight to OEM cost sheets and sourcing decisions [10]", sowhat: "India-cost software value-add and local integration become the hedge OEMs buy — strengthens the System Integrator positioning against import-heavy point vendors", i: "medium", subs: ["Hardware", "System Integrator"], c: [10] },
      ],
      Social: [
        { cat: "Consumer Behavior & Values", p: "Indian buyers treat the screen experience as a primary purchase criterion — consumer-grade UX is the bar, and Tier-1 'good enough' HMI loses", why: "Reviews and social media benchmark UI smoothness, voice quality and app ecosystems like phones; OEM NPS correlates with infotainment satisfaction [3]", sowhat: "Invest in UX talent or partner with design studios — the UX gap is the field's decisive execution risk", i: "high", subs: ["SW"], c: [3] },
        { cat: "Digital Literacy & Connectivity", p: "A 660M-smartphone, vernacular-first user base sets the cockpit benchmark: phone-grade fluency in the user's own language, not English-first menus", why: "Digital adoption is deepest in non-English cohorts; voice in the user's language beats touch menus for safety and accessibility [3]", sowhat: "Vernacular voice is not a nice-to-have layer — it is the primary interface for the next 100M buyers; prioritise it above visual-HMI polish", i: "high", subs: ["SW"], c: [3] },
      ],
      Technological: [
        { cat: "Technology Adoption & Maturity", p: "Cockpit + ADAS fusion onto single HPC silicon is underway — one-box architectures cut cost, decisive in India", why: "Qualcomm/MediaTek cockpit SoCs now carry NPU headroom for driver monitoring and AI assistants; one-box cockpit-ADAS cuts cost [4]", sowhat: "Bosch's cross-domain HPC strategy matches exactly; the 'Strategic SoC' M&A hook is the leverage point", i: "high", subs: ["Hardware", "System Integrator"], c: [4] },
        { cat: "Emerging Technologies", p: "India's DPI rails (Bhashini, UPI, ONDC) are composable building blocks for in-car experiences no other market can replicate", why: "State-built APIs let the cockpit compose language AI, payments and commerce without bilateral deals — a structural cost and speed advantage for India-first products [1]", sowhat: "Architect the cockpit stack DPI-native: Bhashini for voice, UPI hooks for commerce — exportable later to DPI-adopting markets", i: "medium", subs: ["SW", "System Integrator"], c: [1] },
      ],
      Environmental: [
        { cat: "Climate Policy & Emission Regulations", p: "CAFE-III makes cockpit watts count — always-on displays and compute now sit inside a regulated energy budget", why: "Cockpit power draw measurably affects EV range and CAFE accounting; OEMs now spec power envelopes for infotainment [5]", sowhat: "Power-efficient SW architecture is a sellable engineering competency, not a footnote — quantify it in CAFE terms in every pitch", i: "medium", subs: ["SW", "Hardware"], c: [5, 11] },
        { cat: "Physical Climate Risk", p: "Dashboard-top displays in Indian heat face 80°C+ soak temperatures — thermal design separates products that survive from those that fail in year two", why: "Cabin soak in Indian summers exceeds temperate-market design envelopes; display delamination and SoC throttling are documented field failures [5]", sowhat: "India-hardened thermal validation is a durability differentiator OEMs increasingly specify after warranty pain", i: "medium", subs: ["Hardware"], c: [5] },
      ],
      Legal: [
        { cat: "Data Privacy & Security Law", p: "DPDP (Rules phased to ~2027) applies to in-cabin voice, video and behaviour data — privacy-by-design is a compliance moat versus consumer-tech entrants", why: "Voice assistants and occupant cameras process personal data; consent and purpose-limitation duties apply with India data-residency pressure [6]", sowhat: "On-device inference and consent UX beat data-harvesting architectures legally and commercially — lead with it", i: "medium", subs: ["SW"], c: [6] },
        { cat: "Cybersecurity & Digital Regulations", p: "AIS-189/190 pull OTA-updatable cockpits into formal CSMS/SUMS scope — every app store and update pipeline needs certified processes", why: "A cockpit that accepts OTA updates and third-party apps is a regulated software-update system under the incoming vehicle-cyber regime [6]", sowhat: "Bundle the Connectivity field's compliance stack into cockpit platform deals — one certified pipeline serving two fields", i: "medium", subs: ["SW", "System Integrator"], c: [6] },
      ],
    },
    swot: {
      S: [
        { area: "Technology", p: "Cockpit/HPC heritage + cross-domain compute roadmap", why: "Bosch builds cockpit domain controllers and owns a credible cockpit-ADAS fusion roadmap aligned with SoC trends", sowhat: "Lead with the integrated cockpit HPC + SW stack offer — exactly where the market is heading" },
        { area: "People", p: "Massive India software organisation with HMI, Android, AI talent", why: "Thousands of engineers across Bengaluru/Coimbatore already ship cockpit SW for global programmes at India cost", sowhat: "Deliver consumer-grade iteration speed (monthly OTA) that classic Tier-1 processes can't match" },
      ],
      W: [
        { area: "People", p: "Consumer-electronics UX polish is not a historic Bosch strength", why: "Benchmark cockpit UX is set by smartphone players; Bosch HMI heritage is functional, not delightful", sowhat: "Acquire/partner for UX design capability; measure against phone-grade KPIs, not automotive ones" },
        { area: "Technology", p: "SoC dependency on Qualcomm/MediaTek roadmaps", why: "Cockpit differentiation increasingly bound to third-party silicon and their SDK cadence", sowhat: "The 'Strategic SoC' M&A/partnership hook exists for this reason — formalise a preferred-silicon alliance" },
      ],
      O: [
        { p: "Indian OEMs want a system integrator for pre-integrated cockpit bundles", why: "Mid-size OEMs lack the SW headcount to integrate SoC + OS + apps + voice themselves; the mapped 'System Integrator' sub-field is their explicit ask", sowhat: "Productise a pre-integrated India cockpit stack (Android Automotive + vernacular voice + app ecosystem) with bring-your-own-HMI" },
        { p: "Vernacular AI assistant as the defining India feature", why: "No incumbent owns a great 10+ language in-car assistant; Bhashini + LLM advances make it now buildable", sowhat: "First-mover window on the single most India-specific cockpit feature — aligns with the 'AI Cockpit' M&A hook" },
      ],
      T: [
        { p: "Consumer-electronics giants (Samsung/Harman, LG, Chinese cockpit Tier-1s) attacking the same OEMs", why: "They bring display supply chains, brand UX credibility and aggressive pricing", sowhat: "Differentiate on automotive-grade integration, safety co-domains and privacy — not on display hardware" },
        { p: "OEMs in-housing HMI/UX layers", why: "Top OEMs hire UX teams to own brand experience, demoting suppliers to platform providers", sowhat: "Embrace it: sell the platform + tooling (bring-your-own-pattern), monetise the base layers" },
      ],
      tows: {
        SO: "Use HPC heritage + India SW scale (S) to build the pre-integrated cockpit stack + vernacular AI assistant Indian OEMs need (O) — deliver what no incumbent can match at India cost.",
        ST: "Use automotive-grade integration depth + India SW org (S) to compete on safety co-domains and privacy that consumer-electronics attackers lack (T) — differentiate on trust, not display hardware.",
        WO: "Overcome UX-polish gap (W) by partnering a UX design studio to deliver the vernacular-AI assistant opportunity before consumer-electronics rivals own that socket (O).",
        WT: "Mitigate UX gap + SoC dependency (W) against consumer-electronics giants and OEM in-housing (T) by selling the cockpit platform layer and tooling — embracing bring-your-own-HMI rather than fighting the UX battle.",
      },
      targetStrategy: {
        growth: [
          { lever: "Cockpit HPC + cross-domain compute roadmap", action: "Co-create one-box cockpit-ADAS platforms with two lighthouse Indian OEMs" },
          { lever: "India software scale (AAOS, HMI, AI talent)", action: "Productise a pre-integrated India cockpit stack with vernacular AI — sell it to mid-size OEMs" },
        ],
        improvement: [
          { gap: "Consumer-grade UX design is not a Bosch strength", action: "Acquire a UX studio or build a dedicated India design lab; measure against phone-grade KPIs" },
          { gap: "Dependent on Qualcomm/MediaTek roadmaps", action: "Formalise a preferred-silicon alliance (the 'Strategic SoC' hook) to secure roadmap access" },
        ],
      },
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
      attractiveness: {
        maturity: "Growth",
        histCagr: "~18–20% (2020–25, content-per-vehicle led; estimate)",
        fwdCagr: "14% (2025–30)",
        drivers: ["Screen & compute content per vehicle still climbing (twin displays at ₹10L)", "Vernacular AI assistants becoming headline features", "GST 2.0 pulling feature-rich trims into mass segments"],
        constraints: ["SoC vendors capture a growing share of the value", "Consumer-electronics rivals compete on price and brand", "OEMs in-housing HMI to own the brand experience"],
        access: {
          channels: "OEM platform RFQs; system-integrator bundles for mid-size OEMs; premium 2W cluster deals",
          partners: "SoC vendors (silicon alliance), display panel makers, UX design studios",
          barriers: "Low formal barriers; AIS-189 applies to OTA cockpits — manageable",
          localization: "Software localisation (10+ languages) matters more than hardware localisation",
          cac: "Lighthouse-deal driven — one referenceable Indian OEM win unlocks the mid-size tier",
        },
        valuePool: "Panels and standard hardware are commoditising; profit concentrates in the software stack, the AI experience layer and system integration — the fastest-growing 38% of the TAM.",
        whiteSpace: [
          { p: "10+ language in-car AI assistant", why: "No incumbent owns great vernacular voice; Bhashini makes it buildable now", sub: "SW" },
          { p: "Pre-integrated cockpit bundle for mid-size OEMs", why: "They lack the SW headcount to integrate SoC + OS + apps themselves — an explicit market ask", sub: "System Integrator" },
          { p: "Privacy-first cockpit (on-device AI)", why: "DPDP compliance is hard for consumer-tech entrants; a certified alternative wins trust", sub: "SW" },
        ],
        profitability: "Hardware pass-through thin; software and integration carry the margin — bundle to defend both",
      },
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
      rationale: "Score 8.4: dense H1 (immediate revenue), two well-evidenced H2 themes with observable triggers, and a credible H3 tied to India's payment rails. One of the strongest growth profiles across the search fields.",
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
    stakeholders: [
      { name: "PV OEMs (Maruti, Hyundai, Tata, M&M)", type: "oem", influence: 9, interest: 9, stance: "neutral", reasoning: "Award the cockpit platform; decision moves to CDO/software orgs — Bosch must win the SW buyer, not just the procurement team." },
      { name: "Qualcomm / MediaTek", type: "supplier", influence: 8, interest: 7, stance: "neutral", reasoning: "SoC roadmaps gate Bosch's cockpit differentiation; a silicon alliance is both dependency and leverage." },
      { name: "Bhashini / MeitY", type: "government", influence: 6, interest: 5, stance: "ally", reasoning: "Open language-AI APIs lower Bosch's cost of a vernacular assistant and provide policy alignment." },
      { name: "Consumer-tech buyers (OEM digital teams)", type: "oem", influence: 7, interest: 8, stance: "neutral", reasoning: "CDOs benchmark against phone UX — Bosch must speak their language, not just Tier-1 procurement language." },
    ],
    competitors: [
      { name: "Harman (Samsung)", type: "global", x_price_position: 8, y_tech_depth: 8, moat: "Consumer UX + display supply chain + Samsung ecosystem", reasoning: "Consumer-brand credibility that automotive Tier-1s lack; Bosch counters with safety co-domain integration." },
      { name: "Visteon", type: "global", x_price_position: 7, y_tech_depth: 8, moat: "Cockpit-only focus; deep OEM cockpit relationships", reasoning: "Pure-play cockpit Tier-1; lacks Bosch's ADAS/SdV cross-domain advantage." },
      { name: "KPIT Technologies", type: "indian-incumbent", x_price_position: 5, y_tech_depth: 7, moat: "India OEM relationships + cockpit middleware", reasoning: "Competes on services and India cost; Bosch counters with product IP and integration accountability." },
      { name: "Tata Elxsi", type: "indian-incumbent", x_price_position: 5, y_tech_depth: 7, moat: "OEM design partnerships + UI/UX capability", reasoning: "Strong UX and design — the specific gap Bosch needs to close via acquisition or partnership." },
      { name: "Bosch (target position)", type: "global", x_price_position: 7, y_tech_depth: 9, moat: "Cross-domain HPC + India SW scale + ADAS integration", reasoning: "Targets the integrated platform layer where pure cockpit and pure services rivals can't follow." },
    ],
    competitorWhiteSpace: "Pre-integrated cockpit + ADAS fusion platform with vernacular AI assistant at India cost — no incumbent covers all three; the integrated-stack position is the white space.",
    suppliers: [
      { input: "Cockpit SoC (Qualcomm/MediaTek)", supply_risk: 8, profit_impact: 9, quadrant: "strategic", reasoning: "Single most critical dependency — silicon roadmap gates feature delivery; formalise preferred-silicon alliance." },
      { input: "Display panels", supply_risk: 5, profit_impact: 6, quadrant: "leverage", reasoning: "Multiple Korean/Chinese panel makers; competitive supply, moderate impact." },
      { input: "Language AI APIs (Bhashini, cloud LLMs)", supply_risk: 4, profit_impact: 7, quadrant: "leverage", reasoning: "Open-source and government APIs reduce dependency; differentiation is in integration, not model access." },
      { input: "UX design studios", supply_risk: 5, profit_impact: 7, quadrant: "bottleneck", reasoning: "Consumer-grade UX talent is concentrated; key bottleneck to close the phone-grade gap." },
    ],
    sources: ["Bhashini / language-AI ecosystem", "Cockpit content-per-vehicle teardowns", "Buyer-experience surveys & NPS studies", "Cockpit SoC roadmaps", "EV power-budget engineering notes", "DPDP Act application to in-cabin data", "PV/2W production forecasts", "Cockpit competitive award trackers", "GST Council 56th meeting (Sept-2025)", "RBI MPC Jun-2026", "BEE CAFE-III draft"],
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
      Political: [
        { cat: "Government Stability & Policy Certainty", p: "Driver-monitoring is moving from NCAP incentive to expected regulation — a predictable trajectory, not a policy gamble", why: "BNCAP protocols and global UNECE DDAW precedent point to Indian DMS requirements; commercial-fleet fatigue rules already nudge adoption [1]", sowhat: "Occupant/driver monitoring becomes a regulation-pulled volume market — the strongest entry wedge, matching the 'Interior Sensing' M&A hook", i: "high", subs: ["Occupant Monitoring"], c: [1] },
        { cat: "Government Schemes & Incentives", p: "GST 2.0's mass-segment stimulus lifts exactly the trims where comfort and monitoring features are optioned — feature democratisation gets a tax tailwind", why: "Cheaper base vehicles leave headroom in buyer budgets for feature-rich trims; OEMs respond by pushing comfort content down-segment [2]", sowhat: "Plan comfort-actuator and sensing volumes on mid-segment adoption curves, not premium-only assumptions", i: "medium", subs: ["Seating", "Occupant Monitoring"], c: [2] },
      ],
      Economic: [
        { cat: "Economic Growth & Consumer Spending", p: "Comfort premiumisation (ventilated seats, ambient features) reaches mid segments and stays resilient even in a 6.6%-growth year", why: "Ventilated seats now appear in ₹12L cars — comfort content per vehicle rises with income and heat reality; premiumisation has outrun GDP in every recent cycle [2][9]", sowhat: "Actuator and control-electronics demand grows — fits the 'Comfort Actuators (EM)' hook without needing a seat franchise", i: "medium", subs: ["Seating"], c: [2, 9] },
        { cat: "Consumer Spending Patterns", p: "Fleet and commercial buyers monetise driver-fatigue monitoring through insurance and uptime — a TCO-driven demand pool independent of consumer sentiment", why: "Commercial fatigue rules plus insurer pressure make DMS retrofits a payback calculation, not a feature preference [8]", sowhat: "The fleet retrofit channel monetises monitoring before the OEM-line mandate arrives — sequence market entry accordingly", i: "medium", subs: ["Occupant Monitoring"], c: [8] },
      ],
      Social: [
        { cat: "Lifestyle & Consumer Behavior", p: "India's air-quality crisis makes cabin air purity a health feature, not a luxury — a uniquely India-resonant purchase driver", why: "AQI episodes drive measurable spikes in cabin-filter and purifier sales; buyers in NCR treat PM2.5 readouts as safety information [3]", sowhat: "In-cabin air quality (sensing + purification + display) is a feature Bosch sensors can anchor — and export to similar markets later", i: "high", subs: ["Air Purity"], c: [3] },
        { cat: "Demographics & Urbanization", p: "Family-centric vehicle use (multi-generation occupancy, child passengers) raises the value of occupant detection and rear-seat monitoring beyond global norms", why: "Indian vehicle occupancy patterns differ structurally from single-occupant Western commutes; child-presence detection addresses a real, local risk profile [4]", sowhat: "Position CPD and occupancy sensing on Indian usage evidence, not just NCAP checklists — a more persuasive OEM story", i: "medium", subs: ["Occupant Monitoring"], c: [4] },
      ],
      Technological: [
        { cat: "Emerging Technologies", p: "In-cabin 60GHz radar + camera fusion enables child-presence & occupant detection that works through seat covers — robust for Indian conditions", why: "60GHz radar sensing matured; child-presence detection is entering global NCAP roadmaps [4]", sowhat: "Bosch MEMS/radar portfolio extends naturally into cabin sensing — same supply chain, new socket", i: "high", subs: ["Occupant Monitoring", "Vehicle Access"], c: [4] },
        { cat: "Data-Driven Insights", p: "On-device AI for occupant-state analysis reconciles rich sensing with privacy law — the architecture decision is also the compliance decision", why: "Edge inference keeps sensitive cabin data in the vehicle, satisfying DPDP purpose-limitation while enabling drowsiness/distraction analytics [6]", sowhat: "Design the sensing stack edge-first; it is simultaneously the DPDP answer and a cost answer (no cloud round-trip)", i: "medium", subs: ["Occupant Monitoring"], c: [6] },
      ],
      Environmental: [
        { cat: "Climate Policy & Emission Regulations", p: "EV energy budgets favour low-power comfort systems — efficiency is now a spec line for seat ventilation and purifiers", why: "Seat ventilation/heating and purifiers draw range-relevant power; OEMs spec efficiency [5]", sowhat: "Efficient actuator + smart-control SW is a sellable angle", i: "low", subs: ["Seating", "Air Purity"], c: [5] },
        { cat: "Physical Climate Risk", p: "45°C+ cabin soak and dust define Indian duty cycles for actuators and sensors — heat-hardened design is a reliability moat", why: "Comfort actuators and cabin sensors face thermal and ingress stress well beyond temperate-market validation envelopes [5]", sowhat: "India-validated durability engineering justifies premium pricing over grey-market components — make it explicit in RFQs", i: "medium", subs: ["Seating", "Occupant Monitoring"], c: [5] },
      ],
      Legal: [
        { cat: "Data Privacy & Security Law", p: "DPDP applies to in-cabin cameras and biometrics — face/iris access and occupant cameras process sensitive personal data", why: "Consent and on-device processing duties bite; biometric data carries the highest protection class [6]", sowhat: "Privacy-preserving (on-device) sensing architecture is a differentiator and a certification asset", i: "medium", subs: ["Vehicle Access", "Occupant Monitoring"], c: [6] },
        { cat: "Automotive Industry Regulations", p: "DMS/CPD certification will run through AIS/ARAI type-approval when mandated — early engagement with the certification pipeline is a timing advantage", why: "Regulation-pulled features create sourcing windows 18–24 months before mandates; certified-ready suppliers win them [1]", sowhat: "Build India-condition datasets and pre-certify now — the SWOT's 'regulation-timed entry' depends on being ready before the AIS consultation closes", i: "medium", subs: ["Occupant Monitoring"], c: [1] },
      ],
    },
    swot: {
      S: [
        { area: "Technology", p: "Interior-sensing portfolio (camera, 60GHz radar, MEMS) with the M&A hook already mapped", why: "Sensing hardware + perception SW are existing Bosch franchises; cabin is a new socket, not a new competency", sowhat: "Lead occupant/driver monitoring — regulation-pulled and competency-matched" },
        { area: "Technology", p: "Actuator & motor (EM) portfolio for comfort functions", why: "Seat adjusters, flap actuators, pumps are adjacent to existing Bosch electric-machine lines", sowhat: "Supply comfort actuators to seat Tier-1s rather than competing with them" },
      ],
      W: [
        { area: "Market", p: "No seating-system or interior-trim franchise", why: "Adient, Lear, TS Tech, Toyota Boshoku own complete-seat awards with deep OEM JVs in India", sowhat: "Stay component/sensing supplier in seating — complete-seat entry is a no-go" },
        { area: "Market", p: "No consumer brand in comfort/wellness", why: "Air purifiers and scenting are consumer-perception categories where Bosch automotive carries little pull", sowhat: "White-label or co-brand with OEMs; don't build a consumer wellness brand" },
      ],
      O: [
        { p: "Child-presence detection & DMS regulation wave", why: "Global NCAP roadmaps and Indian fleet-safety rules converge on mandatory monitoring within the decade", sowhat: "Position now to be the certified India supplier when mandates land — classic regulation-timed entry" },
        { p: "AQI-driven air purity as an India-first feature", why: "No global market has India's air-quality salience; OEMs need credible sensing + purification claims", sowhat: "Bundle PM/CO2/VOC sensing with HVAC control SW — exportable later to similar markets" },
      ],
      T: [
        { p: "Low-cost camera-DMS startups commoditising monitoring", why: "Smartphone-derived camera + edge-AI stacks ship at aggressive prices for fleet retrofits", sowhat: "Differentiate on automotive-grade reliability, radar fusion and OEM-line integration; cede the cheap retrofit tier" },
        { p: "Seat Tier-1s integrating sensing themselves", why: "Seat makers add occupancy/comfort sensing to defend their system award scope", sowhat: "Offer them the sensing layer as a partner before they build it" },
      ],
      tows: {
        SO: "Use interior-sensing portfolio + actuator/motor assets (S) to be the certified supplier for child-presence detection and DMS when regulation mandates land (O) — regulation-timing advantage.",
        ST: "Use automotive-grade radar fusion + sensing reliability (S) to differentiate against low-cost camera DMS startups (T) who lack the integration quality OEMs need for safety-rating compliance.",
        WO: "Overcome the no-seating-franchise gap (W) by partnering seat Tier-1s to supply them the AQI sensing layer before they build it themselves (O) — become their sensing partner, not their competitor.",
        WT: "Mitigate no-seating-franchise + no-wellness-brand (W) against seat Tier-1s integrating sensing (T) by offering the sensing layer proactively as a partnership before incumbents close the socket.",
      },
      targetStrategy: {
        growth: [
          { lever: "Camera/radar/MEMS sensing franchise", action: "Lead driver & occupant monitoring timed to regulation; build India-condition datasets now" },
          { lever: "Electric-machine actuator lines", action: "Co-create comfort-mechatronics modules with seat Tier-1s — component partner, not competitor" },
        ],
        improvement: [
          { gap: "No complete-seat or trim franchise", action: "Stay at the sensing/actuator layer; partner seat Tier-1s for system awards" },
          { gap: "Low visibility in comfort/wellness categories", action: "Co-brand with OEMs on air-quality claims; let partners own the consumer story" },
        ],
      },
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
      attractiveness: {
        maturity: "Growth",
        histCagr: "~10% (2020–25, comfort-feature spread; estimate)",
        fwdCagr: "12% (2025–30); monitoring & air-quality slices growing ~2× the field",
        drivers: ["DMS/child-presence detection moving toward regulation", "AQI-driven cabin air-quality demand", "Comfort features reaching ₹12L cars"],
        constraints: ["Seating (the largest pool) locked by entrenched JV incumbents", "Regulation timing uncertain — mandate slippage delays the wedge", "Low-cost camera-DMS startups anchor price expectations"],
        access: {
          channels: "OEM RFQs for sensing; component supply to seat Tier-1s; fleet retrofit channel",
          partners: "Seat Tier-1s (Adient/Lear-class), HVAC & filtration makers, fleet operators",
          barriers: "Future DMS/CPD certification via AIS — favours pre-certified suppliers",
          localization: "India-condition datasets (lighting, attire, occupancy patterns) are the real localisation task",
          cac: "Moderate — component sales ride existing OEM relationships; fleet pilots convert fast",
        },
        valuePool: "Complete seats stay with incumbents; profit growth concentrates in monitoring electronics, air-quality systems and comfort mechatronics — the slices growing twice as fast as the field.",
        whiteSpace: [
          { p: "OEM-line child-presence detection ready for BNCAP", why: "The global NCAP roadmap points here; no certified India supplier exists yet", sub: "Occupant Monitoring" },
          { p: "Certified cabin air-quality systems with health display", why: "India-first feature; OEMs need credible claims, not just filters", sub: "Air Purity" },
          { p: "Driver-fatigue retrofits for commercial fleets", why: "Fatigue rules + insurer pressure create demand before OEM mandates land", sub: "Occupant Monitoring" },
        ],
        profitability: "Sensing and actuators earn healthy component margins; trim and seats are volume-thin — stay selective",
      },
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
    stakeholders: [
      { name: "MoRTH / BNCAP / Global NCAP", type: "regulator", influence: 9, interest: 7, stance: "ally", reasoning: "DMS and child-presence detection mandates are the primary demand trigger for Bosch's sensing offer." },
      { name: "PV OEMs", type: "oem", influence: 9, interest: 8, stance: "neutral", reasoning: "Award interior sensing as part of platform decisions; key is getting into safety-feature RFQs early." },
      { name: "Seat Tier-1s (Adient, Lear, TS Tech)", type: "supplier", influence: 7, interest: 6, stance: "neutral", reasoning: "Own complete-seat awards; potential partners for sensing supply or competitors if they integrate sensors." },
      { name: "Indian air-quality agencies (CPCB)", type: "government", influence: 5, interest: 4, stance: "ally", reasoning: "AQI data and government communication validate the air-purity feature narrative for Indian buyers." },
    ],
    competitors: [
      { name: "Seeing Machines", type: "global", x_price_position: 7, y_tech_depth: 8, moat: "DMS algorithm IP + fleet & automotive references", reasoning: "Specialist DMS provider; Bosch counters with radar fusion and automotive-grade integration." },
      { name: "Smart Eye", type: "global", x_price_position: 7, y_tech_depth: 8, moat: "Eye-tracking algorithms + OEM relationships", reasoning: "Pure-play gaze/monitoring; Bosch's 60GHz radar fusion is differentiated in low-light conditions." },
      { name: "Valeo (sensing/DMS)", type: "global", x_price_position: 7, y_tech_depth: 8, moat: "Full-system interior sensing + ADAS integration", reasoning: "Broad competitor; Bosch's ADAS-native platform is the counterweight." },
      { name: "Local DMS startups (Netradyne adjacency)", type: "startup", influence: 4, x_price_position: 4, y_tech_depth: 6, moat: "Low-cost camera + edge AI for fleet retrofit", reasoning: "Fleet-retrofit tier; Bosch cedes this, focuses on OEM-line integration." },
      { name: "Bosch (target position)", type: "global", x_price_position: 7, y_tech_depth: 9, moat: "60GHz radar + ADAS fusion + India manufacturing", reasoning: "Radar-fused DMS + AQI sensing bundle — differentiated from camera-only rivals." },
    ],
    competitorWhiteSpace: "Radar-fused DMS + AQI sensing as a bundled, OEM-line system — no incumbent packages both; Bosch's radar and ADAS assets create a unique combined offer.",
    suppliers: [
      { input: "60GHz in-cabin radar", supply_risk: 6, profit_impact: 8, quadrant: "strategic", reasoning: "Bosch's core sensing IP; internal and NXP-sourced — manage supply continuity carefully." },
      { input: "Camera modules (DMS)", supply_risk: 5, profit_impact: 6, quadrant: "leverage", reasoning: "Multiple automotive camera suppliers; competitive." },
      { input: "AQI / PM2.5 sensors", supply_risk: 4, profit_impact: 5, quadrant: "leverage", reasoning: "Several MEMS sensor vendors; manageable." },
      { input: "Seat actuators & motors", supply_risk: 5, profit_impact: 6, quadrant: "leverage", reasoning: "Adjacent to Bosch EM portfolio; moderate supply risk." },
    ],
    sources: ["BNCAP/UNECE DDAW trajectories", "Comfort-feature penetration data", "Cabin air-quality consumer studies", "60GHz in-cabin radar briefings", "EV power-budget notes", "DPDP biometric guidance", "Interior-systems market reports", "DMS competitive landscape", "RBI MPC Jun-2026"],
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
      Political: [
        { cat: "Government Stability & Policy Certainty", p: "No regulatory driver exists for active suspension — the absence of a mandate is itself the strategic finding", why: "Highway quality improves (less need) while urban roads stay rough (more need) — but no rule mandates ride tech, and none is on the AIS agenda [1]", sowhat: "Demand is purely market-pulled premiumisation — plan for slow adoption, no mandate windfall", i: "low", subs: ["Active & Semi-Active"], c: [1] },
        { cat: "Government Schemes & Incentives", p: "GST 2.0's 40% slab on large/premium vehicles is a headwind for exactly the segment that buys active suspension", why: "The Sept-2025 restructuring raised the effective burden on the premium end while relieving small cars — dampening the addressable trim mix at the margin [9]", sowhat: "The already-small niche gets a tax squeeze; reinforces the software-scoped, no-hardware-bet posture of this field's verdict", i: "medium", subs: ["Active & Semi-Active"], c: [9] },
      ],
      Economic: [
        { cat: "Economic Growth & Consumer Spending", p: "Indian buyers pay for ride comfort — but at Indian price points; only cost-engineered semi-active has volume potential", why: "Soft-ride tuning is a known India requirement; semi-active dampers appear only above ~₹25L — cost sensitivity is decisive [2]", sowhat: "Only cost-engineered semi-active (not full-active) has near-term India volume potential", i: "high", subs: ["Active & Semi-Active", "Control Units"], c: [2] },
        { cat: "Inflation & Interest Rates", p: "Rate-neutral financing (repo 5.25%) keeps premium-SUV EMIs stable — the segment's growth continues on mix, not credit expansion", why: "Premium purchases are financing-sensitive; a neutral rate stance sustains but doesn't accelerate the ₹25L+ segment that carries this field [7]", sowhat: "Base the niche-growth case on the premium-SUV mix trend, not on a financing boom", i: "low", subs: ["Active & Semi-Active"], c: [7] },
      ],
      Social: [
        { cat: "Lifestyle & Consumer Behavior", p: "Chauffeur-driven premium culture makes rear-seat comfort the benchmark — a distinctly Indian purchase logic for ride tech", why: "Premium buyers benchmark rear comfort; motion-sickness mitigation resonates with family-use SUVs [3]", sowhat: "Comfort-software features (preview, motion-sickness reduction) are marketable stories in premium SUVs", i: "medium", subs: ["Cross-Domain Function", "Control Algorithms"], c: [3] },
        { cat: "Consumer Behavior & Values", p: "Ride quality is a reviewed, socially-benchmarked attribute — 'glides over bad roads' is a headline compliment in Indian car reviews", why: "Road-condition reality makes ride comfort a top-three review criterion across segments, unusually high versus global markets [3]", sowhat: "Preview-comfort features have earned-media value beyond their spec-sheet line — worth pricing into the OEM business case", i: "low", subs: ["Control Algorithms"], c: [3] },
      ],
      Technological: [
        { cat: "Emerging Technologies", p: "Suspension control is converging with ADAS into vehicle-motion management — the software/compute layer is the Bosch entry", why: "Camera-preview damping and roll mitigation consume ADAS perception; control migrates to domain computers — Bosch's VMM thesis exactly [4]", sowhat: "The software/compute layer of suspension is the Bosch entry; dampers remain partner territory", i: "high", subs: ["Control Algorithms", "Cross-Domain Function"], c: [4] },
        { cat: "Technology Adoption & Maturity", p: "Zonal E/E migration moves chassis control onto central computers — reopening suspension-control sourcing that damper incumbents historically owned", why: "As OEMs consolidate ECUs, corner-module bundling breaks apart; control software gets sourced at the architecture level [4]", sowhat: "Win suspension control through OEM-side architecture (central-compute) wins, not corner-module fights — the field strategy's core mechanism", i: "medium", subs: ["Control Units", "Control Algorithms"], c: [4] },
      ],
      Environmental: [
        { cat: "Climate Policy & Emission Regulations", p: "EV mass + range pressure favour efficient semi-active over energy-hungry full-active — the technically and economically right India bet", why: "Heavy EVs need body control; hydraulic full-active draws too much energy [5]", sowhat: "Semi-active + smart control SW is the technically and economically right India bet", i: "medium", subs: ["Active & Semi-Active", "Control Algorithms"], c: [5] },
        { cat: "Physical Climate Risk", p: "Indian road and monsoon conditions punish damper hardware — durability requirements exceed global norms, favouring robust semi-active designs", why: "Potholes, flooding and dust create duty cycles that fail temperate-market designs early; warranty data drives OEM caution on complex hardware [1]", sowhat: "Software-led comfort on proven hardware beats fragile complexity — another argument for the SW-scoped entry", i: "low", subs: ["Active & Semi-Active"], c: [1] },
      ],
      Legal: [
        { cat: "Automotive Industry Regulations", p: "Homologation for suspension is straightforward — but software-defined chassis control raises ISO 26262 functional-safety scrutiny", why: "As ride control becomes software-defined, functional-safety scrutiny increases [6]", sowhat: "Bosch's safety pedigree is the credential for SW-defined chassis control", i: "low", subs: ["Control Algorithms", "Control Units"], c: [6] },
        { cat: "IP Law", p: "Control-algorithm IP is the defensible asset in a field where hardware is commoditising — India's strengthening IP enforcement makes SW licensing viable", why: "Preview-damping and motion-management algorithms embody years of vehicle-dynamics data; licensing models depend on enforceable IP [6]", sowhat: "License VMM-derived ride-control IP to damper Tier-1s and OEM captives — monetisation without hardware exposure", i: "low", subs: ["Control Algorithms"], c: [6] },
      ],
    },
    swot: {
      S: [
        { area: "Technology", p: "Vehicle Motion Management (VMM) software + chassis-compute assets, M&A hooks mapped", why: "Bosch's cross-domain motion-control stack already coordinates braking/steering; adding damping is incremental", sowhat: "Enter as the motion-software integrator, not a damper maker" },
        { area: "Technology", p: "ADAS perception provides road-preview data for free", why: "Camera/radar already on the vehicle can feed preview damping — a software unlock", sowhat: "Offer preview-comfort as an SdV feature on existing sensor sets — near-zero marginal hardware" },
      ],
      W: [
        { area: "Technology", p: "No active/semi-active damper hardware franchise", why: "ZF, Tenneco/Monroe, BWI, Marelli own the valves, dampers and OEM relationships", sowhat: "Hardware entry not viable; software/compute scope only" },
        { area: "Market", p: "India volume base for the field is tiny today", why: "Semi-active penetration is low single digits of PV; full-active nearly absent", sowhat: "Revenue case rests on 2030+ trickle-down — patience capital required" },
      ],
      O: [
        { p: "Cross-domain ride functions (roll mitigation, motion-sickness reduction) as SdV features", why: "Exactly the mapped sub-field: system-level functions using ADAS sensors create new, software-priced value", sowhat: "Bundle into VMM/SdV platform deals already in OEM conversations" },
        { p: "Premium-SUV boom raises the addressable trim mix", why: "₹25L+ SUV segment is India's fastest-growing PV slice", sowhat: "The niche grows even if penetration rates don't" },
      ],
      T: [
        { p: "Damper incumbents bundling their own electronics + SW", why: "ZF/Tenneco sell complete corner modules with control included", sowhat: "Compete via OEM-side architecture wins (central compute) rather than corner-module fights" },
        { p: "OEMs deprioritising ride tech against ADAS/EV spend", why: "Engineering budgets favour electrification and safety; suspension upgrades slip", sowhat: "Tie ride features to ADAS programmes already funded — don't sell standalone" },
      ],
      tows: {
        SO: "Use VMM software + ADAS road-preview data (S) to embed preview-comfort and roll-mitigation as SdV features in the premium-SUV segment growing now (O) — software unlock on existing sensor hardware.",
        ST: "Use VMM cross-domain architecture position (S) to win central-compute OEM architecture decisions rather than fighting corner-module battles with damper incumbents bundling SW (T).",
        WO: "Offset the tiny India volume base (W) by attaching ride-control features to ADAS/SdV OEM programmes already funded and in motion (O) — no standalone business-case required.",
        WT: "Mitigate no-hardware franchise + micro volume base (W) against damper incumbents and OEM budget deprioritisation (T) by selling ride features as included capabilities inside funded SdV deals — zero incremental spend for OEMs.",
      },
      targetStrategy: {
        growth: [
          { lever: "VMM motion-control software leadership", action: "Bundle ride-control features into SdV platform deals already in motion — near-zero marginal cost" },
          { lever: "ADAS sensors already on the vehicle", action: "Co-create preview-comfort features (road preview, motion-sickness reduction) with premium-SUV programmes" },
        ],
        improvement: [
          { gap: "No damper/valve hardware", action: "License control software to damper Tier-1s; do not build hardware" },
          { gap: "Tiny addressable market today", action: "Cap the investment; revisit yearly against the premium-SUV penetration trigger" },
        ],
      },
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
      attractiveness: {
        maturity: "Emerging (premium niche)",
        histCagr: "~8–10% (2020–25, premium trims only; estimate)",
        fwdCagr: "11% (2025–30)",
        drivers: ["₹25L+ SUV segment is India's fastest-growing PV slice", "Heavy EVs need body control", "SDV architectures make ride features software-deliverable"],
        constraints: ["OEMs delete ride-tech features first under cost pressure", "Good passive dampers deliver 70% of the benefit at 20% of the cost", "Damper incumbents bundle control into corner modules"],
        access: {
          channels: "Premium platform RFQs; software licensing to damper Tier-1s; SdV platform bundles",
          partners: "Damper makers (ZF/Tenneco-class), OEM chassis and platform teams",
          barriers: "ISO 26262 functional safety for software-defined chassis — a Bosch advantage",
          localization: "India ride-tuning datasets (road profiles, duty cycles) are the differentiating asset",
          cac: "Low when bundled into funded ADAS/SdV programmes; unjustifiable as a standalone sell",
        },
        valuePool: "Damper hardware stays with incumbents at thin margins; the pool worth having is control software and cross-domain comfort features sold at software margins.",
        whiteSpace: [
          { p: "Preview comfort on existing ADAS sensors", why: "A software unlock no damper maker can ship alone", sub: "Cross-Domain Function" },
          { p: "Motion-sickness reduction for family SUVs", why: "Marketable, resonant and technically ready", sub: "Control Algorithms" },
          { p: "Body control for 2.2t+ EVs", why: "Battery mass makes it a real engineering pain OEMs will fund", sub: "Control Algorithms" },
        ],
        profitability: "Hardware margins thin and contested; software-only participation is the one margin-positive route",
      },
      scoreRationale: "Score 4.2: smallest SAM among the search fields ($0.22B) and growth depends on premium trickle-down. Confidence 0.70: premium-segment forecasts vary widely; content estimates ours.",
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
        "Market 4.2 is the decisive drag — the smallest addressable pool of all search fields makes standalone investment unjustifiable",
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
    stakeholders: [
      { name: "Premium PV OEMs (BMW India, Hyundai N, M&M XUV)", type: "oem", influence: 9, interest: 7, stance: "neutral", reasoning: "Primary buyers of active/semi-active suspension SW; award decisions at platform sourcing in premium segments." },
      { name: "ZF / Tenneco / BWI", type: "supplier", influence: 8, interest: 5, stance: "neutral", reasoning: "Own damper hardware and incumbent SW; potential channel partners for Bosch VMM software, or rivals." },
      { name: "Bosch ADAS BU (internal)", type: "oem", influence: 7, interest: 9, stance: "ally", reasoning: "Provides the road-preview sensor data that makes preview-comfort possible — natural internal ally." },
    ],
    competitors: [
      { name: "ZF (CDC / active suspension)", type: "global", x_price_position: 8, y_tech_depth: 9, moat: "Continuous Damping Control IP + hardware + SW bundle", reasoning: "Complete corner-module with embedded control; Bosch competes at the central-compute layer above." },
      { name: "Tenneco (Monroe Intelligent Suspension)", type: "global", x_price_position: 7, y_tech_depth: 8, moat: "Semi-active valve IP + OEM integration", reasoning: "Sells the hardware + control together; Bosch's angle is cross-domain functions that span beyond the damper." },
      { name: "BWI Group", type: "global", x_price_position: 6, y_tech_depth: 8, moat: "MagneRide + semi-active portfolio", reasoning: "Another complete-module supplier; same dynamics." },
      { name: "Bosch (target position)", type: "global", x_price_position: 7, y_tech_depth: 8, moat: "VMM cross-domain software + ADAS data feed", reasoning: "Enters at the central-compute / cross-domain SW layer, not the damper — differentiated positioning." },
    ],
    competitorWhiteSpace: "Cross-domain ride control sold as an SdV feature (not a damper accessory) — no incumbent packages preview-comfort + roll-mitigation + motion-sickness reduction as a software-defined OTA-updatable function.",
    suppliers: [
      { input: "Damper hardware (strategic partner supply)", supply_risk: 6, profit_impact: 5, quadrant: "bottleneck", reasoning: "Bosch doesn't build dampers; must partner ZF/Tenneco/BWI — they are both channel and supplier." },
      { input: "ADAS camera/radar data feed", supply_risk: 3, profit_impact: 8, quadrant: "strategic", reasoning: "Internal Bosch supply — the core input that makes preview-comfort possible; low risk, high impact." },
      { input: "Automotive MCUs (chassis domain)", supply_risk: 6, profit_impact: 7, quadrant: "strategic", reasoning: "High-performance MCU supply for cross-domain compute is allocation-sensitive." },
    ],
    sources: ["Road-investment & quality data", "Semi-active penetration by price band", "Premium-buyer comfort studies", "VMM/cross-domain architecture briefings", "EV mass & energy analyses", "ISO 26262 chassis trends", "Premium PV segment forecasts", "Active-suspension market reports", "GST Council 56th meeting (Sept-2025)"],
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
      Political: [
        { cat: "Government Stability & Policy Certainty", p: "AIS-189/190 bring UNECE-style cybersecurity & software-update management to India — a predictable, ratcheting compliance agenda", why: "CSMS/SUMS requirements make certified security processes a homologation precondition for connected vehicles [1]", sowhat: "Cybersecurity engineering becomes mandatory spend by every OEM — a compliance-pulled services and product market Bosch is built for", i: "high", subs: ["Cyber Security"], c: [1] },
        { cat: "Government Schemes & Incentives", p: "Govt de-licensed the 5.9 GHz band (5875–5905 MHz) for C-V2X OBUs — a regulatory ENABLER, not a demand driver", why: "In June 2026 the WPC exempted C-V2X On-Board Units (PC5 direct/V2V mode) from spectrum licensing, issued alongside the 77–81 GHz radar exemption — bringing India in line with US/EU. Customers don't buy connectivity because of it; it removes a barrier and de-risks deployment [9]", sowhat: "Improves the attractiveness and feasibility of future V2X-related opportunities (vehicle-side stacks, RSUs, safety corridors) rather than creating immediate revenue — strengthens the Infrastructure-field V2X thesis and Bosch's both-sides-of-the-air-gap position", i: "high", enabler: true, subs: ["Connectivity", "Architectures"], c: [9] },
      ],
      Economic: [
        { cat: "Economic Growth & Consumer Spending", p: "Connected features have shifted from premium option to default expectation — recurring revenue scales with the parc, not just new sales", why: "Embedded SIM penetration in new PVs has climbed steeply; OEMs monetise subscriptions and need data infrastructure to do it [2]", sowhat: "Recurring-revenue offboard services (the mapped M&A hook) scale with the connected parc, not just new sales", i: "high", subs: ["Connectivity", "Cloud"], c: [2] },
        { cat: "Infrastructure Investment", p: "Mature nationwide 5G coverage plus an India data-centre construction boom give vehicle-cloud services production-grade infrastructure with in-country residency", why: "5G is now table stakes in metros and highways; hyperscaler and domestic data-centre capex means India-resident vehicle clouds are commercially available at scale [10]", sowhat: "The infrastructure excuse for delaying connected-service launches is gone — and DPDP-driven data-residency needs can be met without architecture compromises", i: "medium", subs: ["Cloud", "Connectivity"], c: [10] },
      ],
      Social: [
        { cat: "Consumer Behavior & Values", p: "Indian consumers adopt connected services fast but churn hard on price — bundling, not standalone subscriptions, is the monetisation model", why: "High app engagement, low willingness to pay post-trial — monetisation needs bundling with insurance, charging, service [3]", sowhat: "Design service bundles (workshop, battery, insurance integration) rather than standalone subscriptions — plays to Bosch's workshop stream", i: "medium", subs: ["Cloud", "Data Management"], c: [3] },
        { cat: "Digital Literacy & Connectivity", p: "UPI-default digital behaviour (23B+ transactions/month) normalises in-app payments and micro-subscriptions — the friction barrier to connected-service commerce is culturally gone", why: "A user base fluent in digital payment and app-first services adopts vehicle companion apps and pay-per-use features without an education curve [11]", sowhat: "Price connected services as UPI-native micro-transactions (per-trip, per-feature) rather than annual contracts — match the payment culture, lift attach rates", i: "medium", subs: ["Cloud", "Connectivity"], c: [11] },
      ],
      Technological: [
        { cat: "Emerging Technologies", p: "SDV data architectures + federated mobility data are the build-out frontier — and India's DPI ambition makes it a uniquely favourable market to build them in", why: "OEMs need vehicle data platforms; India DPI thinking (Beckn-style open networks) extends to mobility data exchanges [4]", sowhat: "The mapped 'Data Management' and 'Architectures' sub-fields align with where Indian digital infrastructure is uniquely ambitious", i: "high", subs: ["Data Management", "Architectures"], c: [4] },
        { cat: "Cybersecurity & Digital Trust", p: "CERT-In gives companies 6 hours to report a cyber incident — vehicle security must run 24×7, not as a yearly audit", why: "Meeting a 6-hour window needs round-the-clock monitoring, automated detection and rehearsed response — capabilities most OEMs don't have in-house [6]", sowhat: "Offer a managed vehicle security operations centre built around the 6-hour clock — it turns a compliance burden into recurring service revenue", i: "high", subs: ["Cyber Security", "Cloud"], c: [6] },
      ],
      Environmental: [
        { cat: "Natural Resources", p: "Data-centre energy scrutiny meets vehicle-data growth — edge filtering is both a cost and a sustainability play", why: "Vehicle fleets generate vast telemetry; efficient edge filtering reduces cloud cost and footprint [5]", sowhat: "Edge-preprocessing architectures are both a cost and sustainability sell", i: "low", subs: ["Cloud", "Architectures"], c: [5] },
      ],
      Legal: [
        { cat: "Data Privacy & Security Law", p: "DPDP Act (Rules phased to ~2027) + CERT-In directives govern vehicle data end-to-end — compliance is an architecture decision, not a legal afterthought", why: "Breach reporting windows, consent management and data-residency expectations apply to telematics platforms [6]", sowhat: "India-hosted, consent-native vehicle cloud is a compliance moat — expensive for late movers to retrofit", i: "high", subs: ["Data Management", "Cyber Security"], c: [6] },
      ],
    },
    swot: {
      S: [
        { area: "Technology", p: "End-to-end stack: in-vehicle connectivity HW through offboard cloud services, hooks mapped", why: "Bosch spans device-to-cloud — few rivals cover both automotive-grade embedded and scaled cloud services", sowhat: "Sell integrated device-to-cloud deals where point players can't follow" },
        { area: "Process", p: "Security & safety engineering culture matching AIS-189/190 demands", why: "Decades of safety-critical process discipline transfer directly to CSMS/SUMS compliance offerings", sowhat: "Productise compliance: CSMS toolchains, secure OTA, audit support — immediate regulatory revenue" },
      ],
      W: [
        { area: "Technology", p: "Not a hyperscaler — raw cloud infrastructure is rented, not owned", why: "AWS/Azure/GCP own the infrastructure layer and increasingly offer automotive verticals", sowhat: "Partner above the infrastructure layer; differentiate on domain logic, not compute pricing" },
        { area: "People", p: "Consumer-app experience thinner than tech-native rivals", why: "Companion apps and digital services UX benchmark against consumer tech", sowhat: "Same UX closure route as cockpit — shared design investment across fields" },
      ],
      O: [
        { p: "Regulation wave creates a compliance land-grab", why: "Every OEM and major fleet must implement CSMS/SUMS within regulatory windows — demand spike with limited certified suppliers", sowhat: "Move first with packaged compliance offerings; lock multi-year service contracts" },
        { p: "India's open-network DPI ambition extends to mobility data", why: "Beckn-protocol thinking and government digital-infrastructure agenda invite private players to build federated mobility data layers", sowhat: "Co-architect open mobility-data infrastructure — strategic positioning impossible in most other markets" },
      ],
      T: [
        { p: "Hyperscalers moving up-stack into automotive verticals", why: "Connected-vehicle platforms from cloud giants compress the middleware value Bosch targets", sowhat: "Differentiate on automotive domain depth, embedded integration and regulatory compliance" },
        { p: "Indian IT majors (TCS, Infosys, Tech Mahindra) selling connected-vehicle programmes", why: "They bring OEM relationships and labour-cost advantage to services", sowhat: "Compete on product IP + accountability for outcomes, not T&M services" },
      ],
      tows: {
        SO: "Use security engineering culture + end-to-end device-to-cloud stack (S) to lock multi-year CSMS/SUMS compliance contracts during the AIS-189/190 regulatory window (O) — move before Indian IT majors commoditise compliance services.",
        ST: "Use device-to-cloud coverage + automotive domain depth (S) to differentiate against hyperscalers moving up-stack (T) on compliance accountability and embedded integration they cannot replicate from outside the vehicle.",
        WO: "Partner hyperscalers for raw infrastructure (W) while positioning Bosch at the domain-logic layer for co-architecting India's federated mobility-data network (O) — own the intelligence, rent the compute.",
        WT: "Mitigate non-hyperscaler infra + consumer-UX gaps (W) against IT-major price wars and cloud giants (T) by competing only on product IP and compliance outcomes where T&M cost comparison is irrelevant.",
      },
      targetStrategy: {
        growth: [
          { lever: "Device-to-cloud stack few rivals match", action: "Sell integrated deals (TCU + cloud + compliance) where point players can't follow" },
          { lever: "Safety-critical process discipline", action: "Productise CSMS/SUMS compliance and lock multi-year contracts in the AIS-189/190 window" },
        ],
        improvement: [
          { gap: "No hyperscale cloud infrastructure", action: "Multi-cloud partnerships; differentiate on domain logic above the infrastructure line" },
          { gap: "Consumer-app UX thinner than tech rivals", action: "Share the cockpit field's UX design investment — one studio serving both fields" },
        ],
      },
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
      attractiveness: {
        maturity: "Growth",
        histCagr: "~25–30% (2020–25, connected-parc build-out; estimate)",
        fwdCagr: "22% (2025–30)",
        drivers: ["AIS-189/190 make cyber compliance mandatory spend", "Connected features now a default expectation — parc-linked recurring revenue", "India's DPI ambition extends to mobility data"],
        constraints: ["Hyperscalers moving up-stack compress middleware value", "IT majors price implementation work aggressively", "Consumers churn on paid subscriptions"],
        access: {
          channels: "OEM programmes (compliance-first entry), fleet SaaS, insurer data partnerships",
          partners: "Hyperscalers (infrastructure), telcos (eSIM & carriage), NPCI ecosystem",
          barriers: "AIS-189 certification — rising, and favourable to certified incumbents",
          localization: "India data residency (DPDP) — an architecture requirement and a moat",
          cac: "Land-and-expand: compliance contract first, data platform on the install base",
        },
        valuePool: "Carriage and raw cloud are commodity; profit concentrates in compliance products, vehicle data platforms and managed security operations — recurring layers on a growing connected parc.",
        whiteSpace: [
          { p: "Managed vehicle SOC built for CERT-In's 6-hour clock", why: "OEMs can't staff 24×7 security operations; regulation demands it", sub: "Cyber Security" },
          { p: "Federated mobility-data exchange participation", why: "India's open-network push has no automotive anchor yet", sub: "Data Management" },
          { p: "DPDP-native vehicle cloud", why: "Late movers must retrofit consent architecture; native design wins", sub: "Cloud" },
        ],
        profitability: "Implementation services thin; compliance products and data platforms carry strong recurring margins",
      },
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
    competencyRationale: "Score 8.2: matches or exceeds on four of five competencies including both decisive ones (cyber, data platforms); the infra gap is a deliberate partner line. Highest competency score across the search fields alongside Software. Confidence 0.88.",
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
    sources: ["AIS-189/190 drafts & UNECE R155/156", "Embedded connectivity penetration data", "Connected-services churn studies", "Beckn/DPI mobility extensions", "Vehicle data volume analyses", "DPDP + CERT-In directives", "Connected-car market reports", "Competitive landscape trackers", "WPC 5.9 GHz C-V2X OBU de-licensing notification, June 2026 (G.S.R. notification under Indian Telegraph Act 1885 / Wireless Telegraphy Act 1933)", "5G coverage & India data-centre capex trackers", "NPCI UPI statistics (May-2026)"],
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
      Political: [
        { cat: "Government Schemes & Incentives", p: "India Semiconductor Mission funds fabs, OSAT and design-linked incentives — a domestic silicon ecosystem is forming for the first time", why: "Approved fab/OSAT projects (incl. Dholera, Sanand) and DLI schemes are creating a domestic silicon ecosystem [1]", sowhat: "Automotive-grade packaging/test and design partnerships become locally possible — Bosch can anchor automotive qualification of Indian silicon", i: "high", subs: ["Semiconductor Tech"], c: [1] },
        { cat: "Government Schemes & Incentives", p: "5.9 GHz C-V2X and 77–81 GHz radar de-licensing (Jun-2026) are regulatory ENABLERS for sensing and communication content per vehicle", why: "The WPC exemptions remove spectrum-licensing barriers for V2X OBUs and imaging radar, aligning India with US/EU and de-risking sensing-heavy architectures [9]", sowhat: "Vehicle-as-Sensor and Comm. Tech sub-fields gain a cleared runway — content roadmaps can assume these bands without regulatory contingency", i: "medium", enabler: true, subs: ["Vehicle as Sensor", "Comm. Tech"], c: [9] },
      ],
      Economic: [
        { cat: "Economic Growth & Consumer Spending", p: "E/E content per vehicle rises steeply even in budget segments — safety mandates, EVs and connectivity multiply ECUs regardless of GDP cycle", why: "Safety mandates (6 airbags-class features, ESC), EVs and connectivity multiply ECUs and semiconductors per vehicle [2]", sowhat: "Volume-driven demand for cost-optimised ECUs and zonal consolidation — both Bosch home turf", i: "high", subs: ["Distributed Compute", "Edge Compute"], c: [2] },
        { cat: "Currency & Exchange Rate", p: "INR weakness is a structural cost risk for advanced-node silicon — every zonal computer's BOM is dollar-denominated at the chip level", why: "Leading-edge SoCs and memory are imported; rupee depreciation flows directly into vehicle-computer costs [10]", sowhat: "ISM-qualified local silicon (as it matures) plus ASIC partnerships become genuine cost hedges — another reason to anchor the ISM qualification role", i: "medium", subs: ["Semiconductor Tech", "AI Compute"], c: [10] },
      ],
      Social: [
        { cat: "Consumer Behavior & Values", p: "Chip-shortage memory makes supply resilience a board topic for Indian OEMs — localisation is strategic, not just cost-driven", why: "2021–23 shortages cost Indian OEMs real volume; semiconductor localisation is now a CXO agenda item [3]", sowhat: "'Resilient, India-qualified electronics supply' is a sales narrative with CXO traction", i: "medium", subs: ["Semiconductor Tech", "Distributed Compute"], c: [3] },
        { cat: "Workforce & Labor", p: "India hosts the world's largest concentration of silicon-design talent inside vendor GCCs — the constraint is organising it, not finding it", why: "Qualcomm/NVIDIA/Intel-class GCCs employ tens of thousands of Indian chip designers; DLI incentives make targeted team-builds economical [1]", sowhat: "Acqui-hire or DLI-backed design-team builds close Bosch's India silicon-design gap faster than organic growth — the competency tab's named route", i: "medium", subs: ["Semiconductor Tech", "AI Compute"], c: [1] },
      ],
      Technological: [
        { cat: "Pace of Change", p: "The distributed-ECU → zonal + central-compute shift is the once-a-decade re-sourcing window — every socket reopens", why: "Global zonal transition reaches Indian platforms via global OEMs first; architecture transitions reset incumbency [4]", sowhat: "Zonal controllers and vehicle-computer sockets are being re-sourced now — win the blueprint, the sockets follow", i: "high", subs: ["Edge Compute", "Distributed Compute"], c: [4] },
        { cat: "Interoperability & Standards", p: "DIR-V (Shakti/Vega cores) pushes sovereign RISC-V toward automotive — a standards bet worth funded optionality, not commitment", why: "Government-backed RISC-V may become a procurement criterion in sovereignty-sensitive programmes; automotive toolchains are still maturing [4]", sowhat: "One evaluation programme now buys the option; scale only on a real procurement trigger — as the competency tab prices it", i: "medium", subs: ["Semiconductor Tech", "AI Compute"], c: [4] },
        { cat: "Emerging Technologies", p: "Chiplet-based custom compute (UCIe) offers a route to differentiated vehicle computers without owning leading-edge fabs", why: "Chiplet standards let system houses compose custom silicon from best-of-breed dies — exactly the position of a fab-less Tier-1 with ASIC competence [4]", sowhat: "ASIC/chiplet alliances are the partner-down half of the silicon strategy — pursue alongside the ISM qualification white space", i: "medium", subs: ["Semiconductor Tech", "AI Compute"], c: [4] },
      ],
      Environmental: [
        { cat: "Climate Policy & Emission Regulations", p: "CAFE-III turns electronics efficiency into a compliance line — every ECU's power draw now has regulatory value", why: "Fleet fuel-consumption targets (3.73→3.01 L/100km, Apr-2027–Mar-2032) make electrical-load reduction a CAFE credit; consolidation from many ECUs to few computers cuts standby drain [11]", sowhat: "Sell zonal consolidation partly as a CAFE-compliance measure — an OEM finance argument on top of the architecture one", i: "medium", subs: ["Edge Compute", "Distributed Compute"], c: [11] },
        { cat: "Natural Resources", p: "Power efficiency (SiC/GaN) is the EV electronics battleground — wide-bandgap devices cut inverter losses meaningfully", why: "ME-SiC/GaN hook already mapped in Energy field — shared frontier [5]", sowhat: "Power-semiconductor positioning spans Energy and ECA fields — coordinate the play", i: "medium", subs: ["Semiconductor Tech"], c: [5] },
      ],
      Legal: [
        { cat: "Cybersecurity & Digital Regulations", p: "Functional-safety and cybersecurity certification deepen to silicon level — ISO 26262 + AIS-189 push requirements into chips and ECUs", why: "Security/safety requirements now flow down to silicon; certification depth becomes a structural barrier [6]", sowhat: "Certification depth favours established Tier-1s — Bosch's pedigree compounds with every regulation cycle", i: "medium", subs: ["Semiconductor Tech", "Edge Compute"], c: [6] },
        { cat: "IP Law", p: "Chip co-design partnerships only work if design IP is legally protected — India's IP regime is now strong enough to make them safe", why: "Custom-silicon work exposes core design IP; partners commit only where courts will enforce protection [6]", sowhat: "Put layered IP protection into every ISM design partnership before the qualification play scales — a one-time legal setup", i: "low", subs: ["Semiconductor Tech"], c: [6] },
      ],
    },
    swot: {
      S: [
        { area: "Technology", p: "ECU & MEMS franchises with India manufacturing, M&A hooks across the silicon stack", why: "Bosch is among the world's largest ECU/MEMS makers; hooks (ECU, MEMS, power semis, ASICs) map the whole sub-field", sowhat: "Defend and grow the ECU base while leading the zonal consolidation wave" },
        { area: "Leadership", p: "Cross-domain vehicle-computer & zonal architecture leadership", why: "Bosch ships central/zonal computing globally; architecture know-how is the scarce asset in the transition", sowhat: "Sell architecture-led: win the zonal blueprint, the sockets follow" },
      ],
      W: [
        { area: "Technology", p: "No wafer fab; advanced-node access is bought", why: "Leading-edge SoCs come from foundries and vendors (Qualcomm/NVIDIA class) outside Bosch control", sowhat: "Position as architecture integrator and qualifier of silicon — not a node competitor; ASIC/chiplet partnerships for differentiation" },
        { area: "People", p: "India silicon-design scale is sub-critical vs the GCC giants", why: "India hosts massive chip-design talent, but mostly inside vendor GCCs, not Bosch", sowhat: "Targeted design-team build/acqui-hire under ISM DLI incentives" },
      ],
      O: [
        { p: "Once-a-decade re-sourcing as zonal architectures land in India-built platforms", why: "Architecture transitions reopen every ECU socket; incumbentship resets", sowhat: "Aggressive zonal-controller and vehicle-computer bids on upcoming Indian EV platforms" },
        { p: "ISM creates automotive-qualification white space", why: "New Indian fabs/OSATs need automotive-grade process qualification partners; nobody owns this role yet", sowhat: "Anchor automotive qualification of Indian silicon — strategic, government-aligned, defensible" },
      ],
      T: [
        { p: "SoC vendors absorbing ECU value into central compute silicon", why: "As functions consolidate onto big SoCs, value shifts from many ECUs to few chips owned by silicon vendors", sowhat: "Move up (architecture, SW, integration) and down (ASIC/chiplet partnerships) simultaneously" },
        { p: "OEM in-housing of E/E architecture design", why: "Top OEMs build architecture teams to control their destiny, demoting Tier-1s to build-to-print", sowhat: "Offer co-development models; monetise IP and tooling rather than only hardware" },
      ],
      tows: {
        SO: "Use zonal architecture leadership + ECU/MEMS franchise (S) to win aggressive bids on Indian EV platform zonal controllers during the once-a-decade E/E re-sourcing window (O) — incumbency resets and Bosch's architecture knowhow is the scarce asset.",
        ST: "Use cross-domain architecture + MEMS/ECU depth (S) to position as the integration-and-qualification integrator above the SoC (T) — moving up the value stack before silicon vendors absorb it.",
        WO: "Overcome sub-critical India design scale (W) by anchoring the ISM automotive-qualification white space (O) using DLI incentives to build/acqui-hire chip-design teams — government alignment converts the weakness into an opportunity.",
        WT: "Mitigate fab-absent + sub-critical design (W) against SoC absorption and OEM in-housing (T) by staying indispensable at the architecture/integration layer where both silicon vendors and OEM captives need a trusted neutral partner.",
      },
      targetStrategy: {
        growth: [
          { lever: "ECU/MEMS scale + zonal architecture know-how", action: "Bid aggressively for zonal-controller and vehicle-computer sockets on upcoming Indian EV platforms" },
          { lever: "Automotive qualification expertise", action: "Anchor automotive qualification of ISM fab/OSAT output — the unclaimed strategic role" },
        ],
        improvement: [
          { gap: "No advanced-node silicon ownership", action: "ASIC/chiplet partnerships up and down the stack; qualify ISM silicon as it matures" },
          { gap: "Sub-scale India chip-design team", action: "Targeted design-team build or acqui-hire under ISM DLI incentives" },
        ],
      },
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
      attractiveness: {
        maturity: "Growth",
        histCagr: "~14–16% (2020–25, mandate-driven content; estimate)",
        fwdCagr: "16% (2025–30)",
        drivers: ["Safety mandates and EV mix multiply electronics per vehicle", "Zonal transition reopens every ECU socket", "ISM building a domestic silicon ecosystem"],
        constraints: ["Value migrating to SoC vendors at the silicon layer", "OEMs in-housing E/E architecture design", "Import dependence on advanced nodes (currency exposure)"],
        access: {
          channels: "OEM platform RFQs (architecture-led); merchant component sales; ISM partnerships",
          partners: "Foundries & OSATs, SoC vendors, chiplet alliances",
          barriers: "Automotive qualification and functional safety — high walls that protect incumbents",
          localization: "ISM-qualified silicon and local ECU manufacturing — Bosch plants already qualify",
          cac: "Architecture wins are long-cycle but very sticky; merchant components ride existing relationships",
        },
        valuePool: "Commodity ECU value is compressing; profit concentrates in zonal controllers, vehicle computers and the qualification/integration layer between Indian silicon and vehicle programmes.",
        whiteSpace: [
          { p: "Automotive qualification of ISM silicon", why: "New fabs need a qualification partner; nobody owns the role yet", sub: "Semiconductor Tech" },
          { p: "Zonal controllers for India-built EV platforms", why: "Sourcing opens now; incumbency resets in architecture transitions", sub: "Edge Compute" },
          { p: "Vehicle-as-Sensor data products", why: "MEMS franchise + connectivity platforms make it a natural extension", sub: "Vehicle as Sensor" },
        ],
        profitability: "Commodity ECUs margin-compressed; architecture wins and qualification services carry durable margin",
      },
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
      { name: "MEMS & power semiconductors", bosch: 9, req: 7, whyReq: "Sensing + efficient power conversion across EVs (7)", whyBosch: "Franchise businesses with hooks mapped (9)", gap: "none — exceed", gapWhy: "Cash-generative defensive base; Energy-field synergy" },
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
    stakeholders: [
      { name: "MeitY / ISM (India Semiconductor Mission)", type: "government", influence: 9, interest: 8, stance: "ally", reasoning: "ISM DLI incentives and fab approvals shape the India semiconductor ecosystem Bosch qualifies — direct policy ally." },
      { name: "PV/2W/CV OEMs (E/E architecture teams)", type: "oem", influence: 9, interest: 9, stance: "neutral", reasoning: "Zonal-architecture decisions are multi-year commitments; winning the blueprint wins the sockets." },
      { name: "SoC vendors (Qualcomm, NVIDIA, MediaTek)", type: "supplier", influence: 8, interest: 7, stance: "neutral", reasoning: "Central-compute silicon; dependency and coopetition — Bosch must position above, not against." },
      { name: "Indian chip-design GCCs (Qualcomm, NXP, Intel India)", type: "supplier", influence: 6, interest: 5, stance: "neutral", reasoning: "Talent pool for acqui-hire; partners or talent source for Bosch India design scale-up." },
    ],
    competitors: [
      { name: "Continental (VDC / E/E architecture)", type: "global", x_price_position: 7, y_tech_depth: 9, moat: "Full E/E architecture portfolio + domain controller leadership", reasoning: "The closest global peer; competes on architecture and domain controllers." },
      { name: "ZF (ZF ProAI / compute platform)", type: "global", x_price_position: 7, y_tech_depth: 8, moat: "Central compute + ADAS integration", reasoning: "Moving up from chassis into compute; overlaps with Bosch vehicle-computer strategy." },
      { name: "Qualcomm / NVIDIA (silicon-led architecture)", type: "global", x_price_position: 9, y_tech_depth: 10, moat: "Leading-edge SoC + OEM software platforms", reasoning: "The value-absorption threat; Bosch must stay above as the architecture integrator." },
      { name: "Tata Elxsi / LTTS (E/E consulting)", type: "indian-incumbent", x_price_position: 4, y_tech_depth: 6, moat: "India OEM relationships + E/E consulting", reasoning: "Services-led; Bosch counters with product IP and engineering accountability." },
      { name: "Bosch (target position)", type: "global", x_price_position: 7, y_tech_depth: 9, moat: "Zonal architecture IP + ECU/MEMS franchise + India manufacturing", reasoning: "Defends ECU base, leads zonal transition, anchors ISM qualification — multi-layer position." },
    ],
    competitorWhiteSpace: "Automotive qualification of Indian ISM silicon — no incumbent owns this role yet; being the first to certify India-fab parts for series production creates a defensible, government-aligned moat.",
    suppliers: [
      { input: "Automotive SoCs (Qualcomm/NVIDIA class)", supply_risk: 9, profit_impact: 9, quadrant: "strategic", reasoning: "Most critical external dependency; allocation risk is structural — manage via multi-source and ASIC/chiplet strategy." },
      { input: "MEMS sensors (internal + STMicro/Infineon)", supply_risk: 5, profit_impact: 7, quadrant: "leverage", reasoning: "Bosch is itself a MEMS leader; partial internal supply reduces risk." },
      { input: "SiC/GaN power semiconductors", supply_risk: 7, profit_impact: 8, quadrant: "strategic", reasoning: "EV power electronics; supply constrained and performance-critical — coordinate with Energy field." },
      { input: "PCB / OSAT (OSATs in India)", supply_risk: 5, profit_impact: 5, quadrant: "leverage", reasoning: "India OSAT ecosystem growing; lower risk than offshore assembly." },
    ],
    sources: ["ISM project approvals & DLI scheme", "E/E content-per-vehicle curves", "Chip-shortage impact retrospectives", "Zonal architecture & DIR-V briefings", "SiC/GaN efficiency studies", "ISO 26262/AIS-189 silicon implications", "Production & semiconductor consumption forecasts", "Tier-1 competitive award trackers", "WPC 5.9 GHz & 77–81 GHz de-licensing notifications (Jun-2026)", "RBI MPC Jun-2026", "BEE CAFE-III draft"],
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
      Political: [
        { cat: "Government Schemes & Incentives", p: "GCC policy & SDV skilling missions make India the world's automotive-software factory — the field's global talent pool sits in Bosch's backyard", why: "State GCC policies, engineering-export momentum and skilling missions concentrate global SDV development in India; 1,600+ GCCs operate today [1]", sowhat: "Scale advantage compounds for whoever organises the talent best — Bosch's existing India SW organisation is the head start", i: "high", subs: ["Middleware/OS", "AI/ML"], c: [1] },
        { cat: "Government Stability & Policy Certainty", p: "Engineering-export continuity is bipartisan policy — the regulatory risk to India-delivered global SW work is structurally low", why: "Services exports are a current-account pillar; successive governments have protected and promoted the GCC model [1]", sowhat: "Long-cycle SDV platform commitments can be made from India delivery without policy-risk discounting", i: "medium", subs: ["Middleware/OS"], c: [1] },
      ],
      Economic: [
        { cat: "Economic Growth & Consumer Spending", p: "Every major OEM funds SDV programmes despite margin pressure — counter-cyclical demand that holds even in a 6.6%-GDP year", why: "Software-defined platforms are existential investments; Indian OEMs budget SDV even in down-cycles [2][9]", sowhat: "Counter-cyclical demand for middleware, tooling and integration — rare resilience among the search fields", i: "high", subs: ["Middleware/OS", "Simulations"], c: [2, 9] },
        { cat: "Inflation & Interest Rates", p: "Talent-cost inflation is this field's real inflation exposure — SDV wage growth outruns CPI, squeezing services margins", why: "Attrition-driven wage spirals in automotive SW outpace general inflation; T&M models absorb it, product models don't [3]", sowhat: "Product-led pricing (middleware, tools, GenAI products) inflation-proofs the business in a way headcount-billing never can — reinforces the field strategy", i: "medium", subs: ["Middleware/OS", "AI/ML"], c: [3] },
      ],
      Social: [
        { cat: "Workforce & Labor", p: "The talent war for automotive-software engineers is the field's defining social dynamic — attrition economics decide delivery models", why: "OEM captives, GCCs, IT majors and startups compete for the same SDV talent pool [3]", sowhat: "Bosch's brand + scale in India is a recruiting asset; productised IP reduces headcount sensitivity", i: "medium", subs: ["Middleware/OS", "AI/ML"], c: [3] },
        { cat: "Technology Adoption Behavior", p: "India's developer-community culture (largest GitHub base outside the US) makes developer-ecosystem GTM a native motion — if Bosch builds the DevRel muscle", why: "SDV platforms win by developer adoption; India's open-source and hackathon culture is fertile ground for platform evangelism [4]", sowhat: "The competency tab's DevRel gap is cheap to close in India specifically — community investment here has outsized platform-adoption returns", i: "medium", subs: ["Middleware/OS", "WASM"], c: [4] },
      ],
      Technological: [
        { cat: "Emerging Technologies", p: "Middleware consolidation + AI/ML moving into the vehicle loop — the mapped sub-fields are exactly the consolidation battlegrounds", why: "AUTOSAR Adaptive, vehicle OS plays and on-board AI runtimes converge; digital twins shift validation left [4]", sowhat: "Fight with products, not bodies — middleware/OS, AI/ML, simulation and digital twin are where the value consolidates", i: "high", subs: ["Middleware/OS", "AI/ML", "Simulations", "Digital Twin"], c: [4] },
        { cat: "Pace of Change", p: "GenAI-assisted engineering is compressing SDV development cycles — productivity tooling is becoming a product category, not an internal secret", why: "AI coding/validation assistants trained on automotive constraints multiply engineering throughput; OEMs now ask for the tooling, not just the output [4]", sowhat: "Productise internal GenAI engineering gains as the mapped 'GenAI Products & Services' BBM stream — domain-corpus advantage is the moat", i: "high", subs: ["AI/ML", "Simulations"], c: [4] },
        { cat: "Interoperability & Standards", p: "Eclipse SDV open-source gravity commoditises middleware layers — shape the agenda and monetise around it, or be disrupted by it", why: "Open-source vehicle-OS components (some Bosch-backed) reduce paid middleware scope over time [4]", sowhat: "Lead the open-source roadmap and monetise certified tooling, integration and support around it — the classic open-core play", i: "medium", subs: ["Middleware/OS", "Interoperable Functions"], c: [4] },
      ],
      Environmental: [
        { cat: "ESG Pressure", p: "Virtual validation cuts physical prototyping & test fleets — sustainability is a quantifiable selling point for the simulation/twin offer", why: "Simulation/digital-twin maturity measurably reduces prototype builds and test kilometres [5]", sowhat: "Quantify avoided prototypes and test-km in every simulation pitch — it reads directly into OEM scope-3 reporting", i: "low", subs: ["Simulations", "Digital Twin"], c: [5] },
        { cat: "Natural Resources", p: "AI-training and simulation compute carry an energy footprint OEM buyers increasingly audit — efficient toolchains are becoming a procurement criterion", why: "BRSR-style disclosure pressure extends to suppliers' compute intensity; efficient simulation pipelines cost less and score better [5]", sowhat: "Engineer and market toolchain efficiency (compute per validated km) as both a cost and an ESG differentiator", i: "low", subs: ["Simulations", "AI/ML"], c: [5] },
      ],
      Legal: [
        { cat: "Automotive Industry Regulations", p: "Safety + cybersecurity certification of software (ISO 26262, AIS-189) raises the compliance bar — certified toolchains become mandatory across the parc", why: "Certified toolchains and update-management processes become mandatory as regulation deepens [6]", sowhat: "ETAS-class certified tooling becomes more valuable with every regulation cycle — the moat widens over time", i: "high", subs: ["Middleware/OS", "Simulations"], c: [6] },
        { cat: "Taxation & Corporate Law", p: "GST 2.0 clarified most goods classifications but SW-licence vs SaaS vs embedded-royalty treatment still needs deal-level structuring", why: "Automotive software deals blend licences, services and royalties — each with distinct GST and transfer-pricing treatment [10]", sowhat: "Standardise deal templates with tax counsel once — then reuse across OEM platform deals to avoid per-deal friction", i: "low", subs: ["Middleware/OS"], c: [10] },
      ],
    },
    swot: {
      S: [
        { area: "Technology", p: "ETAS + middleware product IP with global reference customers", why: "Certified toolchains, calibration, middleware run in production vehicles worldwide — product businesses, not T&M services", sowhat: "Lead with productised SDV stack; price on value, not headcount" },
        { area: "People", p: "Largest automotive-software workforce in India", why: "Tens of thousands of engineers across Bosch India deliver global SW programmes at India cost with automotive domain depth IT majors lack", sowhat: "Combine product IP with delivery scale — a position neither pure-product nor pure-services rivals hold" },
      ],
      W: [
        { area: "Leadership", p: "Perception as a Tier-1, not a software company, among some OEM digital teams", why: "SDV purchasing increasingly sits with CDO/SW organisations that default to tech-brand vendors", sowhat: "Brand & GTM repositioning toward the SW buyer persona; lighthouse deals matter" },
        { area: "Market", p: "Open-source gravity commoditising middleware layers", why: "Eclipse SDV-class projects (some Bosch-backed) reduce paid middleware scope over time", sowhat: "Shape the open-source agenda and monetise tooling, certification and integration around it" },
      ],
      O: [
        { p: "Indian OEMs need full SDV stacks but lack the in-house depth of global giants", why: "Mid-size Indian OEMs can't fund thousand-engineer platform teams; they want productised stacks plus co-development", sowhat: "Sign 2–3 lighthouse SDV platform deals with Indian OEMs — referenceable, defensible, recurring" },
        { p: "GenAI-accelerated engineering as a product line (mapped BBM stream)", why: "AI coding/validation assistants trained on automotive constraints multiply engineering productivity — Bosch has the domain corpus", sowhat: "Productise internal GenAI engineering gains as 'GenAI Products & Services' for OEM customers" },
      ],
      T: [
        { p: "Indian IT majors (KPIT, Tata Elxsi, LTTS) with OEM relationships and price aggression", why: "They win large SDV services deals on cost and account presence", sowhat: "Don't fight T&M wars; win where product IP + accountability for the integrated outcome decide" },
        { p: "OEM software captives absorbing scope", why: "OEM SW subsidiaries internalise platform work, shrinking external scope", sowhat: "Sell tools, middleware and AI products INTO the captives — make them customers, not competitors" },
      ],
      tows: {
        SO: "Use ETAS product IP + India SW scale (S) to win 2–3 lighthouse SDV platform deals with Indian OEMs who need full stacks (O) — referenceable wins that reposition Bosch as an SW product house.",
        ST: "Use automotive domain corpus + product IP depth (S) to launch GenAI engineering products that IT majors' T&M delivery models cannot replicate (T) — compete on outcomes, not headcount.",
        WO: "Reframe the Tier-1 perception (W) through lighthouse co-development deals that put Bosch in the CDO/SW buying room (O) — let the deals do the repositioning rather than marketing alone.",
        WT: "Mitigate middleware commoditisation + Tier-1 perception (W) against IT-major price aggression and OEM captive absorption (T) by selling tools and AI products INTO the captives — converting competitors into customers.",
      },
      targetStrategy: {
        growth: [
          { lever: "Product IP (ETAS, middleware) with global references", action: "Sign 2–3 lighthouse SDV platform deals with Indian OEMs — price on value, not headcount" },
          { lever: "India delivery scale + automotive domain corpus", action: "Productise GenAI engineering tools for OEM customers — the mapped BBM stream" },
        ],
        improvement: [
          { gap: "Seen as a Tier-1, not a software company, by OEM digital buyers", action: "Reposition GTM toward CDO/software buyers; lighthouse wins are the proof" },
          { gap: "Open source eroding paid middleware", action: "Lead the Eclipse SDV agenda; monetise certified tooling and integration around it" },
        ],
      },
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
      attractiveness: {
        maturity: "Growth",
        histCagr: "~20–25% (2020–25, SDV budget ramp; estimate)",
        fwdCagr: "24% (2025–30)",
        drivers: ["Every OEM funds SDV platforms — counter-cyclical budgets", "Regulation mandates certified toolchains", "GenAI multiplies engineering productivity and creates a new product category"],
        constraints: ["IT majors drag deals into T&M price wars", "OEM captives absorb platform scope", "Talent-cost inflation squeezes services margins"],
        access: {
          channels: "Product sales into GCCs and OEM captives; platform co-development with OEMs",
          partners: "Cloud providers, frontier-model providers (GenAI), Eclipse SDV ecosystem",
          barriers: "Low formal barriers; certification and production references are the practical ones",
          localization: "Already localised — India is the global delivery hub; DevRel investment is the gap",
          cac: "Low into existing accounts; lighthouse SDV deals need executive-level selling",
        },
        valuePool: "T&M services commoditise; profit concentrates in middleware licences, certified tools and GenAI engineering products — 54% of the TAM is addressable product-and-integration value, the highest ratio of any field.",
        whiteSpace: [
          { p: "Certified GenAI-assisted toolchain for automotive", why: "Every OEM wants AI productivity with safety sign-off; nobody has certified it yet", sub: "AI/ML" },
          { p: "Full SDV stack for mid-size Indian OEMs", why: "They can't fund thousand-engineer platform teams — they want a product", sub: "Middleware/OS" },
          { p: "Virtual-validation as a service", why: "Simulation maturity lets OEMs cut prototype fleets — quantifiable savings", sub: "Simulations" },
        ],
        profitability: "Products and licences high-margin; T&M thin — the mix IS the strategy",
      },
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
    competencyRationale: "Score 8.6: the strongest competency sheet of all search fields — franchise positions on three of five, with the two gaps (GenAI productisation, DevRel) being execution items, not structural absences. Confidence 0.90: every level verifiable against shipping products.",
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
      rationale: "Score 9.0: the deepest pipeline in the portfolio — funded H1, a referenceability-window H2 with named triggers, and a credible H3 where Bosch already holds technical positions (WASM, middleware). Highest horizon score of the search fields.",
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
    stakeholders: [
      { name: "Indian OEM CDOs / SW organisations", type: "oem", influence: 9, interest: 9, stance: "neutral", reasoning: "The key buying persona shift — SDV procurement moves from procurement to CDOs who benchmark against tech companies." },
      { name: "KPIT Technologies", type: "supplier", influence: 6, interest: 7, stance: "neutral", reasoning: "Potential partner on OEM platform deals or a direct competitor in SDV services; relationship needs clarity." },
      { name: "Eclipse SDV / AUTOSAR consortium", type: "government", influence: 6, interest: 6, stance: "ally", reasoning: "Bosch-backed open-source agenda; shaping it is preferable to fighting it." },
      { name: "Bosch ETAS (internal)", type: "oem", influence: 8, interest: 9, stance: "ally", reasoning: "Core product IP asset for the India SW field; ETAS toolchain is the product moat." },
    ],
    competitors: [
      { name: "KPIT Technologies", type: "indian-incumbent", x_price_position: 4, y_tech_depth: 7, moat: "India OEM relationships + AUTOSAR middleware", reasoning: "Strong on services and middleware; Bosch counters with ETAS product IP and integration accountability." },
      { name: "Tata Elxsi", type: "indian-incumbent", x_price_position: 4, y_tech_depth: 7, moat: "Design + engineering services for OEMs", reasoning: "Competes on services; Bosch's product-IP dimension is the differentiator." },
      { name: "LTIMindtree / Tech Mahindra", type: "indian-incumbent", x_price_position: 3, y_tech_depth: 6, moat: "IT scale + OEM account presence", reasoning: "Price-and-scale competitors; Bosch must not fight on T&M terms." },
      { name: "Continental (software spin-off Elektrobit)", type: "global", x_price_position: 7, y_tech_depth: 9, moat: "AUTOSAR stack + adaptive platform leadership", reasoning: "Global peer on middleware; Bosch ETAS is the direct counterpart." },
      { name: "Bosch (target position)", type: "global", x_price_position: 7, y_tech_depth: 9, moat: "ETAS product IP + India SW scale + GenAI engineering", reasoning: "Product IP + delivery scale + GenAI tools — a combination no rival holds entirely." },
    ],
    competitorWhiteSpace: "GenAI-accelerated automotive engineering products (coding, validation, testing tools trained on automotive constraints) — no incumbent has productised this yet at automotive-domain depth.",
    suppliers: [
      { input: "Cloud compute (AI training/inference)", supply_risk: 5, profit_impact: 6, quadrant: "leverage", reasoning: "Multi-cloud options; competitive pricing for SW workloads." },
      { input: "Open-source SDV middleware (Eclipse)", supply_risk: 3, profit_impact: 5, quadrant: "non-critical", reasoning: "Community-maintained; low supply risk, but commoditises some Bosch middleware value." },
      { input: "Automotive-domain LLM training data", supply_risk: 6, profit_impact: 8, quadrant: "strategic", reasoning: "Bosch's own vehicle/engineering data corpus is the scarce input; protect and leverage it." },
    ],
    sources: ["GCC policies & engineering-export data", "OEM SDV budget disclosures", "Automotive talent-market studies", "AUTOSAR/Eclipse SDV roadmaps", "Virtual-validation impact studies", "ISO 26262/AIS-189 toolchain requirements", "Automotive SW market forecasts", "Competitive deal trackers", "RBI MPC Jun-2026", "GST Council 56th meeting (Sept-2025)"],
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
      Political: [
        { cat: "Government Schemes & Incentives", p: "PLI schemes + China+1 sourcing push electronics manufacturing to India at scale — a rising tide for contract manufacturing", why: "Electronics/auto-component PLI disbursements and global supply-chain de-risking redirect manufacturing investment into India [1]", sowhat: "The question is whether Bosch participates as a service provider or only as a buyer — the MaaS thesis answers it", i: "high", subs: ["Contract Mfg (MaaS)", "EMS"], c: [1] },
        { cat: "Government Schemes & Incentives", p: "PM E-DRIVE's scrappage-linked e-truck incentives (extended to Mar-2028) create new commercial-vehicle build demand — fresh volume for certified contract capacity", why: "The scheme's post-pivot outlay funds e-trucks, 14,028 e-buses and e-ambulances — categories that need automotive-grade electronics builds [9]", sowhat: "Target e-CV and e-bus electronics builds as MaaS anchor contracts — policy-funded demand with multi-year visibility", i: "medium", subs: ["Contract Mfg (MaaS)"], c: [9] },
      ],
      Economic: [
        { cat: "Economic Growth & Consumer Spending", p: "EMS is a 3–5% margin business — structurally below Bosch portfolio thresholds; only differentiated automotive-grade niches fit", why: "Listed Indian EMS players run thin operating margins compensated by asset turns and scale [2]", sowhat: "Pure-play EMS competes on a financial model Bosch isn't built for — the scope discipline IS the strategy", i: "high", subs: ["EMS", "Contract Mfg (MaaS)"], c: [2] },
        { cat: "Inflation & Interest Rates", p: "At a 5.25% repo, EMS asset-turn economics stay brutal — capital-intensive capacity races only work for players who accept commodity returns", why: "EMS margins barely clear the cost of capital; the business model rewards extreme utilisation, not engineering depth [2][10]", sowhat: "Monetise EXISTING certified capacity (sunk capital) rather than building new — the capacity-utilisation play is the only one that clears Bosch's hurdle rate", i: "medium", subs: ["Contract Mfg (MaaS)"], c: [2, 10] },
        { cat: "Taxation & Corporate Law", p: "GST 2.0's uniform 18% on components simplifies contract-build pricing — fewer classification disputes in multi-party manufacturing chains", why: "Uniform component rates remove tax-cascade ambiguity between the brand owner, contract manufacturer and component suppliers [11]", sowhat: "Cleaner MaaS contract structures and cost transparency — a small but real friction reduction for the commercial unit", i: "low", subs: ["Contract Mfg (MaaS)", "EMS"], c: [11] },
      ],
      Social: [
        { cat: "Workforce & Labor", p: "Manufacturing employment is politically prized — automation messaging is sensitive and shapes incentive access", why: "Job creation drives state incentives; lights-out narratives can cost goodwill [3]", sowhat: "Frame I5.0 as human-machine collaboration and skilling, not headcount removal — affects positioning and incentive access", i: "medium", subs: ["Industry 5.0", "Dark Factories"], c: [3] },
        { cat: "Demographics & Urbanization", p: "India's young workforce makes skilling-led digitalisation the socially-preferred automation path — I5.0's augmentation story fits the demographic moment", why: "A median-age-29 labour force rewards productivity-per-worker narratives over worker-replacement ones; skilling programmes attract state co-funding [3]", sowhat: "Bundle operator-skilling into every digitalisation solution sale — it differentiates against pure-automation vendors and unlocks incentives", i: "low", subs: ["Industry 5.0"], c: [3] },
      ],
      Technological: [
        { cat: "Technology Adoption & Maturity", p: "Industry 4.0→5.0 maturity is a sellable service, not just internal practice — Indian factories demand proven digitalisation", why: "Proven practitioners can productise their know-how; Bosch's plants are reference-grade [4]", sowhat: "Bosch's own plant digitalisation is monetisable as solutions + consulting without entering EMS economics", i: "high", subs: ["Industry 5.0"], c: [4] },
        { cat: "Pace of Change", p: "Dark-factory economics don't clear in India yet — automation cost vs labour cost defers lights-out beyond 5 years except in hazardous niches", why: "India's labour economics and political context push full automation out; hazardous/precision processes are the exception [4]", sowhat: "Keep Dark Factories at WATCH with a cost-parity trigger — don't let global automation narratives pull Indian investment forward", i: "low", subs: ["Dark Factories"], c: [4] },
      ],
      Environmental: [
        { cat: "ESG Pressure", p: "Green-manufacturing compliance (energy, ZLD, BRSR carbon reporting) tightens — certified-green capacity commands customer preference", why: "Customer scope-3 demands push factories toward audited sustainability [5]", sowhat: "Certified-green capacity is a Bosch-plant credential that commodity EMS rivals can't quickly match — price it into MaaS", i: "medium", subs: ["Contract Mfg (MaaS)", "EMS"], c: [5] },
        { cat: "Circular Economy & E-Waste", p: "ELV Rules 2025 industrialise the recycling-material loop — recycled-content manufacturing becomes a compliance-adjacent capability", why: "Steel-linked EPR targets create demand for certified recycled-material processing and traceability in production [5]", sowhat: "Recycled-content-capable lines and material traceability connect the Manufacturing and Sustainability fields — one capability, two markets", i: "low", subs: ["Contract Mfg (MaaS)", "Industry 5.0"], c: [5] },
      ],
      Legal: [
        { cat: "Automotive Industry Regulations", p: "IATF 16949-class quality/liability discipline gates who can build safety parts — certification is the moat of the MaaS niche", why: "Safety-critical manufacturing is legally gated by certified quality systems [6]", sowhat: "Automotive-grade contract manufacturing is a defensible niche where certification is the moat", i: "medium", subs: ["Contract Mfg (MaaS)"], c: [6] },
        { cat: "Taxation & Corporate Law", p: "Contract-manufacturing structures (job-work vs principal-to-principal) carry distinct GST and liability treatments — the commercial model choice is also a legal one", why: "MaaS deal economics shift materially between job-work and P2P structures; getting it wrong strands margin in tax [6][11]", sowhat: "Fix the standard MaaS contract structure with counsel before scaling the commercial unit", i: "low", subs: ["Contract Mfg (MaaS)"], c: [6, 11] },
      ],
    },
    swot: {
      S: [
        { area: "Process", p: "Operating Indian plants with automotive-grade quality systems and freeing capacity", why: "Powertrain transition frees capacity in certified facilities — an asset most EMS entrants must build from scratch", sowhat: "Monetise certified capacity via high-mix automotive-grade contract manufacturing (MaaS) without greenfield capex" },
        { area: "Technology", p: "I4.0/I5.0 lighthouse practice deployable as a service", why: "Bosch's internal manufacturing digitalisation is reference-grade; Indian factories want exactly this", sowhat: "Sell manufacturing-digitalisation solutions & consulting — software margins on manufacturing know-how" },
      ],
      W: [
        { area: "Process", p: "Cost structure and overheads above EMS-champion benchmarks", why: "Dixon-class players run leaner indirect structures than a global Tier-1 can", sowhat: "Avoid commodity EMS bids; compete only where quality certification prices in" },
        { area: "People", p: "No EMS commercial muscle for external builds", why: "Selling manufacturing services is a different GTM than selling components", sowhat: "Build a small dedicated MaaS commercial unit; don't burden plant organisations with it" },
      ],
      O: [
        { p: "China+1 customers seeking automotive-grade Indian manufacturing partners", why: "Global Tier-1s/OEMs de-risking supply chains need certified capacity faster than they can build it", sowhat: "Target precisely these customers — certified capacity is the scarce asset, not price" },
        { p: "Powertrain-transition capacity conversion", why: "ICE component lines free up; converting them protects employment and assets", sowhat: "MaaS doubles as the socially-responsible answer to the transition — political goodwill included" },
      ],
      T: [
        { p: "Entrenched EMS champions scaling aggressively (Dixon, Kaynes, Syrma, Tata Electronics)", why: "They add capacity, win PLI, and accept margins Bosch can't", sowhat: "Don't fight for their commodity ground; hold the automotive-grade, high-reliability niche" },
        { p: "Margin dilution risk to Bosch's overall profile", why: "Even successful EMS at scale drags group margins and capital metrics", sowhat: "Cap the ambition: capacity-utilisation play plus solutions business, not an EMS empire" },
      ],
      tows: {
        SO: "Use certified capacity + I4.0/I5.0 lighthouse practice (S) to win China+1 customers seeking automotive-grade manufacturing that EMS price-champions cannot offer (O) — quality certification is the scarce asset.",
        ST: "Differentiate on I4.0 digital manufacturing + quality certifications (S) to hold the automotive-grade niche against scaling EMS champions (T) who cannot profitably serve high-mix certified builds.",
        WO: "Build a dedicated MaaS commercial unit (W) to capture the powertrain-transition capacity-conversion opportunity (O) before freed ICE capacity becomes a liability rather than an asset.",
        WT: "Cap EMS ambition to avoid margin dilution (W) against entrenched EMS champions scaling aggressively (T) by restricting to the certified/I4.0 niche — a defensible position that commodity players won't pursue.",
      },
      targetStrategy: {
        growth: [
          { lever: "Certified automotive-grade capacity (freed by the powertrain transition)", action: "Win 1–2 anchor MaaS contracts with China+1 Tier-1s/OEMs" },
          { lever: "Reference-grade factory digitalisation practice", action: "Productise I4.0/I5.0 solutions and consulting — software margins on manufacturing know-how" },
        ],
        improvement: [
          { gap: "Overhead structure above EMS benchmarks", action: "Strict niche discipline — automotive-grade high-mix only; never bid commodity EMS" },
          { gap: "No manufacturing-services sales capability", action: "Build a small dedicated MaaS commercial unit with EMS-experienced hires" },
        ],
      },
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
        { s: "Industrial & infrastructure primes", buy: "High-reliability electronics builds", note: "Certified-capacity buyers beyond automotive" },
      ],
      attractiveness: {
        maturity: "Growth",
        histCagr: "~20%+ (2020–25, PLI-fuelled EMS boom; estimate)",
        fwdCagr: "18% (2025–30)",
        drivers: ["China+1 sourcing shifting to India", "PLI capacity incentives", "E-bus & e-truck build demand under PM E-DRIVE"],
        constraints: ["3–5% commodity EMS margins", "Capacity race outpacing demand in commodity segments", "Professional procurement squeezes suppliers hard"],
        access: {
          channels: "Direct contracts with global Tier-1s/OEMs; industrial & infrastructure primes for high-reliability builds",
          partners: "Component suppliers, corridor authorities, skilling agencies",
          barriers: "IATF 16949-class certification for safety parts — the niche's moat",
          localization: "Already local — the plants exist; flexibility retrofits are the investment",
          cac: "Long qualification cycles (12–18 months) but very sticky once designed in",
        },
        valuePool: "Commodity assembly is margin-free; profit sits in automotive-grade high-mix builds, digitalisation solutions and green-certified capacity that global customers pay a premium for.",
        whiteSpace: [
          { p: "Automotive-grade MaaS for China+1 customers", why: "Certified capacity is scarce; they need it faster than they can build it", sub: "Contract Mfg (MaaS)" },
          { p: "I5.0 digitalisation solutions for Indian factories", why: "Factories buy proven practice, not slideware — Bosch has the reference", sub: "Industry 5.0" },
          { p: "Green-certified manufacturing capacity", why: "Scope-3 pressure is making audited-green capacity a sourcing criterion", sub: "Contract Mfg (MaaS)" },
        ],
        profitability: "Commodity EMS below Bosch's hurdle rate; certified-niche MaaS and solutions clear it — scope discipline is the profit strategy",
      },
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
    stakeholders: [
      { name: "Global Tier-1s / OEMs (China+1 customers)", type: "oem", influence: 9, interest: 8, stance: "ally", reasoning: "Actively seeking certified Indian manufacturing partners for supply-chain de-risking — core customer." },
      { name: "Dixon Technologies / Kaynes / Syrma", type: "supplier", influence: 7, interest: 5, stance: "neutral", reasoning: "EMS champions who compete in commodity space; Bosch avoids their terrain but monitors for overlap." },
      { name: "MoLEM / Make-in-India (PLI)", type: "government", influence: 7, interest: 6, stance: "ally", reasoning: "PLI incentives and policy support make Indian contract manufacturing more attractive to global players." },
      { name: "Plant workforce unions", type: "consumer", influence: 6, interest: 7, stance: "neutral", reasoning: "MaaS conversion of ICE capacity must be managed with workforce sensitivity." },
    ],
    competitors: [
      { name: "Dixon Technologies", type: "indian-incumbent", x_price_position: 3, y_tech_depth: 6, moat: "Massive electronics EMS scale + PLI wins", reasoning: "Dominates commodity EMS; Bosch avoids direct competition, targets automotive-certified niche." },
      { name: "Kaynes Technology", type: "indian-incumbent", x_price_position: 4, y_tech_depth: 6, moat: "ESDM focus + growing automotive share", reasoning: "Moving toward automotive; Bosch holds the certified/quality edge." },
      { name: "Tata Electronics", type: "indian-incumbent", x_price_position: 5, y_tech_depth: 7, moat: "Apple supply chain + Tata group scale", reasoning: "High-visibility contract manufacturer; targets different segments from Bosch's automotive niche." },
      { name: "Jabil / Flex (global EMS)", type: "global", x_price_position: 6, y_tech_depth: 7, moat: "Global automotive EMS + IATF certifications", reasoning: "Closest overlap; Bosch counters with I4.0 digitalisation as a product, not just manufacturing." },
      { name: "Bosch (target position)", type: "global", x_price_position: 7, y_tech_depth: 8, moat: "IATF-certified capacity + I4.0 lighthouse + India footprint", reasoning: "Automotive-grade + digitalisation depth — a niche no pure EMS player occupies." },
    ],
    competitorWhiteSpace: "Automotive-grade certified MaaS + I4.0 manufacturing digitalisation as a product — the combination of certified capacity AND a deployable digitalisation practice is unique to Bosch in India.",
    suppliers: [
      { input: "Electronic components (passives, ICs)", supply_risk: 5, profit_impact: 6, quadrant: "leverage", reasoning: "Managed through Bosch global procurement; competitive supply." },
      { input: "Automotive-qualified sub-assemblies", supply_risk: 6, profit_impact: 7, quadrant: "bottleneck", reasoning: "Specialised qualified sub-suppliers are limited in India; concentration risk." },
      { input: "I4.0 software platforms (SAP, Siemens)", supply_risk: 5, profit_impact: 7, quadrant: "strategic", reasoning: "Digital-manufacturing platforms are strategic; Bosch's internal tools are the proprietary layer." },
      { input: "Plant utilities (power, water)", supply_risk: 3, profit_impact: 4, quadrant: "non-critical", reasoning: "Commodity; managed through local plant operations." },
    ],
    sources: ["PLI disbursement & China+1 flows", "EMS player financials & margins", "Manufacturing employment policy notes", "I4.0/I5.0 adoption studies", "BRSR/green-manufacturing requirements", "IATF/liability frameworks", "EMS market forecasts", "Capacity announcement trackers", "MHI PM E-DRIVE extension notification (Aug-2025)", "RBI MPC Jun-2026", "GST Council 56th meeting (Sept-2025)"],
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
      Political: [
        { cat: "Government Schemes & Incentives", p: "India's DPI (UPI, FASTag, Account Aggregator, VAHAN) is state-built rails for vehicle commerce — public infrastructure, not private walled gardens", why: "NPCI rails and government registries mean vehicle payments and identity ride public infrastructure [1]", sowhat: "Build ON the rails (UPI in-vehicle, VAHAN-linked identity) rather than building rails — uniquely low-cost entry vs other markets", i: "high", subs: ["In-Vehicle Payment", "Vehicle Aadhar"], c: [1] },
        { cat: "Government Stability & Policy Certainty", p: "DPI expansion is durable state policy across administrations — the rails Bosch would build on carry near-zero political risk", why: "UPI, ONDC and AA growth is a flagship national programme with continuous NPCI investment and international export ambitions [1]", sowhat: "Enablement investments on NPCI rails can be business-cased on decade horizons — rare policy certainty for a fintech-adjacent play", i: "medium", subs: ["In-Vehicle Payment"], c: [1] },
      ],
      Economic: [
        { cat: "Economic Growth & Consumer Spending", p: "UPI processes 23.2B transactions/month (~49% of global real-time payment volume) — the rails are proven at national scale, and vehicle-linked flows are digitising onto them", why: "FASTag normalised in-vehicle payments; EV charging adds a new payment surface; UBI insurance pilots grow [2][9]", sowhat: "The enablement layer (secure vehicle identity, payment HW/SW, data feeds) is the Bosch-capturable slice of a huge, still-digitising flow", i: "high", subs: ["In-Vehicle Payment", "Insurance"], c: [2, 9] },
        { cat: "Consumer Spending Patterns", p: "Credit inclusion via digital footprints (AA-based lending, BNPL) is expanding vehicle-linked finance down-market — data quality is the binding constraint", why: "Account Aggregator flows let lenders underwrite thin-file customers; verified vehicle/usage data extends the same logic to vehicle finance [2]", sowhat: "Verified vehicle-data feeds become underwriting inputs for a widening credit market — the licence-free revenue line grows with financial inclusion itself", i: "medium", subs: ["Insurance", "Vehicle Monetization"], c: [2] },
      ],
      Social: [
        { cat: "Digital Literacy & Connectivity", p: "Indians pay by UPI reflexively — in-vehicle payment friction is now a behavioural anomaly waiting to be fixed", why: "QR-scanning at toll/parking/charging is the workaround; seamless in-vehicle payment matches established behaviour [3]", sowhat: "In-vehicle UPI is a when-not-if feature — first credible automotive-grade implementation wins the socket", i: "medium", subs: ["In-Vehicle Payment"], c: [3] },
        { cat: "Consumer Behavior & Values", p: "Trust in digital finance is high but fraud-sensitivity is rising — a hardware-anchored, tamper-resistant payment device is a trust story consumers understand", why: "Payment-fraud coverage makes security a consumer-visible attribute; a vehicle secure element out-trusts a phone app in the public narrative [3][4]", sowhat: "Market the vehicle as the most secure payment device the customer owns — the Tier-1 trust pedigree becomes consumer-facing", i: "medium", subs: ["In-Vehicle Payment", "Vehicle Aadhar"], c: [3, 4] },
      ],
      Technological: [
        { cat: "Emerging Technologies", p: "Secure elements + vehicle identity make the car a trusted payment device — vehicle-side trust infrastructure is exactly Tier-1 territory", why: "Automotive-grade secure hardware, DPDP-compliant consent and VAHAN-anchored identity solve fraud/UX problems fintechs can't from outside [4]", sowhat: "The 'Vehicle Aadhar' sub-field formalises it — own the trust layer every fintech partner must rent", i: "high", subs: ["Vehicle Aadhar", "In-Vehicle Payment"], c: [4] },
        { cat: "Interoperability & Standards", p: "NPCI market-structure rules (like the 30% app-volume cap) shape which payment partners can scale — partner selection is a standards question, not just a commercial one", why: "NPCI governs UPI ecosystem concentration; automotive payment flows must be architected for multi-app, cap-compliant routing [1]", sowhat: "Design the in-vehicle UPI layer app-agnostic from day one — locking to a single payment app is both a regulatory and a commercial risk", i: "medium", subs: ["In-Vehicle Payment"], c: [1] },
      ],
      Environmental: [
        { cat: "ESG Pressure", p: "EV-transition financing gaps (battery risk) need data to price — verified vehicle data unlocks green credit and UBI products", why: "Lenders/insurers struggle with battery residual risk; verified vehicle data unlocks credit and UBI products [5]", sowhat: "Bosch battery/vehicle data feeds become financial-product inputs — bridges to Energy & Sustainability fields", i: "medium", subs: ["Insurance", "Vehicle Monetization"], c: [5] },
        { cat: "Climate Policy & Emission Regulations", p: "Green-finance frameworks (priority-sector EV lending, sustainability-linked rates) reward verifiable environmental data — vehicle telemetry becomes a rate-setting input", why: "Lenders offering preferential EV rates need usage and battery-health verification to prevent greenwashing in their own books [5]", sowhat: "Position verified telemetry as green-finance compliance infrastructure — a second buyer for the same data feed", i: "low", subs: ["Insurance"], c: [5] },
      ],
      Legal: [
        { cat: "Taxation & Corporate Law", p: "RBI/IRDAI licensing perimeter strictly gates financial activities — the hard boundary that defines Bosch's enablement-only posture", why: "Payments, lending and insurance require licences and compliance infrastructure far from Bosch's footprint [6]", sowhat: "Hard boundary: Bosch enables, partners execute regulated activities — structure every deal accordingly", i: "high", subs: ["In-Vehicle Payment", "Insurance"], c: [6] },
        { cat: "Data Privacy & Security Law", p: "Payment data answers to RBI; driving data answers to DPDP — in-vehicle payments must satisfy both from day one", why: "Vehicle payment flows mix financial data and personal mobility data; each has its own regulator and rules [6]", sowhat: "Build the consent and data architecture once, for both regimes — then sell that compliance capability to fintech partners who face the same problem", i: "medium", subs: ["In-Vehicle Payment", "Vehicle Aadhar"], c: [6] },
      ],
    },
    swot: {
      S: [
        { area: "Technology", p: "Vehicle-side trust position: secure ECUs, cockpit integration, verified vehicle data", why: "Payments and insurance products need tamper-resistant vehicle data and seamless cockpit UX — Tier-1 home ground, hooks mapped (AI Cockpit, Tech Stack)", sowhat: "Own the in-vehicle enablement layer that every fintech partner must rent" },
        { area: "Market", p: "OEM relationships to bundle fintech features at platform level", why: "Fintech entrants negotiate per-OEM from outside; Bosch is already in the platform conversations", sowhat: "Package payment/insurance enablement into cockpit & SdV deals already in motion" },
      ],
      W: [
        { area: "Process", p: "No financial-services licences, compliance infrastructure or risk culture", why: "RBI/IRDAI perimeters require institutional capabilities entirely absent from Bosch", sowhat: "Never carry regulated risk; partner with banks/insurers/NPCI ecosystem from day one" },
        { area: "Market", p: "No consumer-fintech brand or user base", why: "Payment apps win on network effects Bosch doesn't have", sowhat: "Stay invisible infrastructure; let partners own the consumer relationship" },
      ],
      O: [
        { p: "In-vehicle UPI as the first credible automotive payment implementation", why: "NPCI openness + OEM feature races create a near-term window for an automotive-grade reference implementation", sowhat: "Build it with NPCI-ecosystem partners and 1–2 OEM launches — socket ownership compounds" },
        { p: "UBI insurance & EV-financing data products", why: "Insurers/lenders actively seek verified vehicle/battery data; regulatory sandboxes welcome pilots", sowhat: "Monetise data feeds + scoring infrastructure — recurring, licence-free revenue" },
      ],
      T: [
        { p: "Fintech giants or NPCI itself standardising in-vehicle payment", why: "If the rails standardise a generic solution, the enablement premium collapses", sowhat: "Move early; anchor differentiation in automotive-grade security & UX, not payment processing" },
        { p: "OEM captives building fintech subsidiaries", why: "OEM finance arms may internalise vehicle commerce", sowhat: "Position as their enabling infrastructure too — captives are customers in this strategy" },
      ],
      tows: {
        SO: "Use vehicle-side trust + OEM platform relationships (S) to build the reference in-vehicle UPI implementation with NPCI partners (O) before the socket standardises and the enablement premium disappears.",
        ST: "Use secure-ECU + automotive-grade security depth (S) to anchor differentiation in the tamper-resistant hardware layer (T) that fintech giants entering from outside the vehicle cannot replicate.",
        WO: "Partner banks/insurers from day one (W) to capture the UBI insurance and EV-financing data-product opportunity (O) without requiring financial licences — own the data layer, outsource the regulated activity.",
        WT: "Mitigate no-licences + no-consumer-brand (W) against fintech giants standardising rails and OEM captives internalising commerce (T) by moving early to lock the vehicle-side enablement infrastructure before it becomes a commodity API.",
      },
      targetStrategy: {
        growth: [
          { lever: "Secure vehicle hardware + cockpit integration", action: "Build the first automotive-grade in-vehicle UPI implementation with NPCI-ecosystem partners" },
          { lever: "Platform-level OEM relationships", action: "Bundle payment/insurance enablement into cockpit and SdV deals already in motion" },
        ],
        improvement: [
          { gap: "No financial licences or compliance infrastructure", action: "Hard rule: partners carry all regulated activity; Bosch stays the enablement layer" },
          { gap: "No presence in the fintech ecosystem", action: "Small BD team embedded in NPCI/fintech circles — deals are struck there, not in automotive" },
        ],
      },
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
      attractiveness: {
        maturity: "Emerging",
        histCagr: "~30%+ (2021–25, FASTag & UPI expansion; estimate)",
        fwdCagr: "26% (2025–30)",
        drivers: ["UPI at 23B+ transactions/month — proven national rails", "EV charging adds a new payment surface", "Insurers seeking verified vehicle data for UBI"],
        constraints: ["The smartphone already solves payment 'well enough'", "NPCI standardisation could commoditise the enablement layer", "Enabler margins thin if partnerships are structured badly"],
        access: {
          channels: "OEM platform bundles; data-feed contracts with insurers/lenders; NPCI ecosystem",
          partners: "Banks, insurers, NPCI ecosystem players, OEM finance arms",
          barriers: "RBI/IRDAI licence perimeter — the absolute boundary shaping every deal",
          localization: "Fully India-specific by design — the DPI rails don't exist elsewhere",
          cac: "Low via existing cockpit/SdV deals; data products sell into sandbox-friendly insurers",
        },
        valuePool: "Regulated pools (payments, lending, insurance) belong to licensed players; the durable Bosch pool is vehicle-side trust infrastructure and verified-data feeds — smaller, but licence-free and recurring.",
        whiteSpace: [
          { p: "Automotive-grade in-vehicle UPI reference implementation", why: "The socket is open; the first credible implementation wins it", sub: "In-Vehicle Payment" },
          { p: "VAHAN-anchored vehicle digital identity", why: "Standardisation is coming; co-building it beats adopting it", sub: "Vehicle Aadhar" },
          { p: "Battery-data underwriting feeds for EV finance", why: "Lenders can't price battery risk; Bosch data can", sub: "Insurance" },
        ],
        profitability: "Enablement margins are infrastructure-like; recurring data feeds are the best pool — avoid one-off integration economics",
      },
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
    stakeholders: [
      { name: "NPCI (UPI / FASTag / AA)", type: "government", influence: 9, interest: 7, stance: "ally", reasoning: "NPCI's open-payment rails and AA framework are the enablement infrastructure Bosch builds on — policy ally." },
      { name: "RBI / IRDAI", type: "regulator", influence: 9, interest: 5, stance: "neutral", reasoning: "Regulate the licensed activities Bosch must not carry; set the perimeter for the enable-never-bank strategy." },
      { name: "Banks & insurers (HDFC, ICICI, Bajaj Allianz)", type: "oem", influence: 7, interest: 7, stance: "ally", reasoning: "Need vehicle-verified data for UBI and EV-financing products; natural distribution partners." },
      { name: "PV OEMs (platform teams)", type: "oem", influence: 8, interest: 7, stance: "neutral", reasoning: "Cockpit/platform decisions determine where in-vehicle payment sits; must bundle with existing platform deals." },
    ],
    competitors: [
      { name: "PhonePe / PayU (fintech players)", type: "startup", x_price_position: 3, y_tech_depth: 6, moat: "Network effects + UPI integration + consumer brand", reasoning: "Own the consumer payment layer; Bosch's angle is the automotive-grade vehicle-side hardware they can't build." },
      { name: "Juspay (payment orchestration)", type: "startup", x_price_position: 4, y_tech_depth: 7, moat: "Payment-SDK + OEM integrations (Ola, Navi)", reasoning: "Closest competitor in automotive payment orchestration; Bosch's secure-element hardware is the differentiator." },
      { name: "IEX / vehicle fintech startups", type: "startup", x_price_position: 4, y_tech_depth: 6, moat: "EV financing and insurance data plays", reasoning: "Compete on data products; Bosch's vehicle-verified sensor data is higher quality." },
      { name: "Bosch (target position)", type: "global", x_price_position: 7, y_tech_depth: 8, moat: "Secure ECU + cockpit integration + OEM relationships", reasoning: "Owns the vehicle-side trust layer that fintech players rent — structural moat." },
    ],
    competitorWhiteSpace: "Automotive-grade secure in-vehicle payment infrastructure (tamper-resistant ECU + certified UPI integration) — fintech players can't build it; Bosch already has the hardware and OEM access.",
    suppliers: [
      { input: "Secure elements / HSMs", supply_risk: 6, profit_impact: 8, quadrant: "strategic", reasoning: "Infineon/NXP secure elements for in-vehicle payment; limited qualified suppliers." },
      { input: "NPCI APIs / UPI stack", supply_risk: 3, profit_impact: 7, quadrant: "leverage", reasoning: "Open government APIs; low supply risk, high value enablement." },
      { input: "Telematics / connectivity hardware", supply_risk: 5, profit_impact: 6, quadrant: "leverage", reasoning: "Shared with Connectivity field; managed jointly." },
    ],
    sources: ["NPCI/UPI/FASTag/AA architecture", "Vehicle-linked financial-flow data", "Payment-behaviour studies", "Secure-element & identity briefings", "EV-financing risk analyses", "RBI/IRDAI perimeter guidance", "Enablement-market estimates", "Fintech competitive trackers", "NPCI UPI statistics (May-2026)"],
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
      Political: [
        { cat: "Government Schemes & Incentives", p: "GNSS-based barrier-free (MLFF) tolling is policy direction, replacing FASTag plazas — a once-in-a-generation system transition", why: "NHAI pilots and policy statements target satellite-based tolling — a nationwide system replacement [1]", sowhat: "Bosch's global GNSS-tolling experience meets a once-in-a-generation Indian system build — the field's defining opportunity", i: "high", subs: ["Tolling & Parking"], c: [1] },
        { cat: "Government Schemes & Incentives", p: "5.9 GHz de-licensing for C-V2X OBUs (Jun-2026) is the field's headline regulatory ENABLER — the V2X sub-field's biggest barrier just fell", why: "The WPC exempted C-V2X on-board units from spectrum licensing, aligning India with US/EU and removing the deployment contingency that stalled corridor business cases [9]", sowhat: "V2X corridor proposals can now be tendered and costed without spectrum risk — materially strengthens the both-sides-of-the-air-gap V2X thesis", i: "high", enabler: true, subs: ["V2X"], c: [9] },
      ],
      Economic: [
        { cat: "Infrastructure Investment", p: "Record highway & urban-transport capex with ITS components embedded — funded demand exists; the contest is procurement access, not budget creation", why: "National infrastructure pipeline allocates explicitly to smart corridors, traffic management and electronic enforcement [2]", sowhat: "The constraint is consortium position, not market size — secure technology-partner slots within 12 months", i: "high", subs: ["Urban Traffic Mgmt", "Tolling & Parking"], c: [2] },
        { cat: "Infrastructure Investment", p: "PM E-DRIVE's ₹2,000 Cr charging-corridor outlay makes charger-network data a funded, near-term market", why: "Public charging deployment across cities and national highways is milestone-funded through Mar-2028 — every charger needs discoverability, routing and reliability data [10]", sowhat: "The Map Services charging-data line has a policy-guaranteed demand floor — the field's fastest commercial (non-B2G) revenue", i: "medium", subs: ["Map Services"], c: [10] },
      ],
      Social: [
        { cat: "Demographics & Urbanization", p: "Urban congestion & road-safety pressure make ITS politically visible — Indian metros top global congestion indices", why: "Road-fatality reduction is a stated national mission; congestion is an everyday, voter-visible pain point [3]", sowhat: "Safety-framed ITS (V2X for VRUs, enforcement tech) aligns commercial offers with political priorities", i: "medium", subs: ["V2X", "Urban Traffic Mgmt"], c: [3] },
        { cat: "Digital Literacy & Connectivity", p: "FASTag trained 60M+ vehicle owners to accept automatic, account-linked road payments — the behavioural groundwork for MLFF is already done", why: "FASTag's near-universal adoption normalised device-linked tolling; GNSS tolling is an upgrade to an accepted behaviour, not a new ask [1]", sowhat: "MLFF user-adoption risk is low — the transition risk is institutional (procurement, enforcement), which shapes where to invest", i: "medium", subs: ["Tolling & Parking"], c: [1] },
      ],
      Technological: [
        { cat: "Interoperability & Standards", p: "C-V2X has won the standards contest; Indian corridor pilots are underway — technology ambiguity is gone", why: "Global C-V2X consolidation removes standards risk; NHAI/smart-city pilots test infrastructure-side deployment [4]", sowhat: "Vehicle-side V2X (Bosch ECU/connectivity assets) + infrastructure-side partnerships can be packaged now", i: "high", subs: ["V2X"], c: [4] },
        { cat: "Emerging Technologies", p: "A GNSS-OBU ecosystem is forming around the MLFF transition — OBU hardware, backend tolling logic and enforcement analytics are all being re-sourced", why: "Plaza-based infrastructure obsoletes entirely under satellite tolling; every layer of the stack gets a new supplier decision [1][4]", sowhat: "The OBU + backend technology layer is the asymmetric prize — technology leadership matters more than incumbency in a system replacement", i: "high", subs: ["Tolling & Parking", "V2X"], c: [1, 4] },
      ],
      Environmental: [
        { cat: "Climate Policy & Emission Regulations", p: "EV-charging discoverability & routing is an infrastructure-data problem — charger data quality now limits EV adoption", why: "Charger reliability/availability data quality limits EV adoption; map-service integration is the fix [5]", sowhat: "Map-services-for-charging bridges to the Energy field — shared offer architecture", i: "medium", subs: ["Map Services"], c: [5] },
        { cat: "Pollution & Waste Management", p: "Congestion-management ITS is increasingly justified on air-quality grounds — traffic flow optimisation is an emissions intervention", why: "Idling traffic is a measurable urban-pollution source; smart-corridor business cases now cite AQI alongside travel time [3]", sowhat: "Frame traffic-management offers with quantified emissions benefits — it widens the funding sources a city can tap", i: "low", subs: ["Urban Traffic Mgmt"], c: [3] },
      ],
      Legal: [
        { cat: "Automotive Industry Regulations", p: "B2G procurement rules (L1 bias, localisation clauses) shape who can win — consortium structures are often mandatory", why: "Public tenders weight price and local content heavily [6]", sowhat: "Partner with Indian system integrators for tender access; Bosch as technology provider inside consortia — never solo bids", i: "high", subs: ["Tolling & Parking", "Urban Traffic Mgmt"], c: [6] },
        { cat: "Data Privacy & Security Law", p: "GNSS tolling generates continuous location trails — DPDP compliance for tolling data is a design requirement the MLFF architecture must answer", why: "Satellite tolling tracks every vehicle's movement; consent, purpose-limitation and retention rules apply to a dataset FASTag never created [6]", sowhat: "Privacy-preserving tolling architecture (on-device aggregation, minimal retention) is a differentiator in tender evaluations — and a public-trust necessity", i: "medium", subs: ["Tolling & Parking", "Map Services"], c: [6] },
      ],
    },
    swot: {
      S: [
        { area: "Technology", p: "Global tolling & ITS deployment heritage directly relevant to MLFF", why: "Bosch group has delivered GNSS tolling and enforcement systems in other markets — proven reference architecture", sowhat: "Lead the technology layer of India's MLFF transition via consortium structures" },
        { area: "Technology", p: "Vehicle-side V2X readiness (connectivity HW, ECUs, SdV stack)", why: "The vehicle half of V2X is existing Bosch territory; few infrastructure players own it", sowhat: "Sell the only credible both-sides-of-the-air-gap V2X story" },
      ],
      W: [
        { area: "Market", p: "Thin Indian public-procurement track record and B2G muscle", why: "NHAI/smart-city tendering rewards incumbent system integrators (BEL-class, large EPC) with relationship depth", sowhat: "Never bid alone; embed in consortia with established Indian primes" },
        { area: "Process", p: "Long, politically-exposed sales cycles strain business-case patience", why: "B2G timelines slip with election cycles and litigation", sowhat: "Portfolio the pipeline; price patience into business cases" },
      ],
      O: [
        { p: "MLFF system transition reopens the entire tolling stack", why: "GNSS tolling obsoletes plaza infrastructure — every layer (OBU, backend, enforcement) gets re-sourced", sowhat: "Asymmetric prize: technology leadership matters more than incumbency in a system replacement" },
        { p: "Charging-map data services for the EV transition", why: "Reliable charger data is scarce and valuable; OEMs and CPOs both need it", sowhat: "Commercial (non-B2G) revenue line with faster cycles — balances the portfolio" },
      ],
      T: [
        { p: "Indian system integrators + global ITS rivals locking consortium slots", why: "MLFF consortia are forming now; technology-partner slots are finite", sowhat: "Secure consortium positions within 12 months or watch the window close" },
        { p: "L1 price-bias squeezing technology margins", why: "Lowest-bid procurement rewards cost-cutters over technology depth", sowhat: "Anchor differentiation in lifecycle performance guarantees, not capex price" },
      ],
      tows: {
        SO: "Use global MLFF/ITS heritage + vehicle-side V2X readiness (S) to secure the technology-provider role in Indian MLFF consortia (O) before those consortium slots close — asymmetric upside from the system replacement.",
        ST: "Use the both-sides-of-the-air-gap V2X story + MLFF heritage (S) to anchor lifecycle-performance differentiation against L1 price-bias (T) — guarantee outcomes rather than competing on capex price.",
        WO: "Overcome thin India B2G track record (W) by embedding in established Indian-prime-led consortia for the MLFF transition (O) — let the prime carry procurement risk while Bosch supplies the technology advantage.",
        WT: "Offset thin B2G muscle + long sales cycles (W) against window-closing consortium formation and price-bias procurement (T) by securing consortium positions within 12 months and balancing portfolio with faster-cycle commercial charging-data revenue.",
      },
      targetStrategy: {
        growth: [
          { lever: "Global GNSS-tolling reference architecture", action: "Secure technology-partner slots in MLFF consortia within 12 months" },
          { lever: "Both-sides V2X position (vehicle + roadside)", action: "Package V2X corridor offers now that 5.9 GHz is de-licensed" },
        ],
        improvement: [
          { gap: "No Indian public-procurement track record", action: "Never bid alone — embed in Indian-prime consortia who own the tender relationships" },
          { gap: "B2G timelines strain business cases", action: "Balance with fast-cycle commercial revenue (charging-map data) while tenders mature" },
        ],
      },
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
      attractiveness: {
        maturity: "Growth",
        histCagr: "~15% (2020–25, FASTag & smart-city spend; estimate)",
        fwdCagr: "19% (2025–30); MLFF is the step-change",
        drivers: ["MLFF transition re-sources the entire tolling stack", "C-V2X spectrum cleared (Jun-2026)", "Funded charging corridors need data services"],
        constraints: ["L1 lowest-bid procurement squeezes technology margins", "Political/election cycles slip timelines", "Consortium slots are finite and filling"],
        access: {
          channels: "B2G via consortia only; commercial data services to OEMs and CPOs",
          partners: "Indian system-integrator primes, roadside-unit makers, map providers",
          barriers: "B2G procurement rules (L1 bias, localisation clauses) — structural",
          localization: "Mandatory — tender local-content clauses; Bosch's India footprint qualifies",
          cac: "B2G very high (years); OEM data services fast (quarters) — run both",
        },
        valuePool: "Civil works and carriage are commodity; profit concentrates in the MLFF technology layer (OBUs, backend, enforcement analytics) and charging/map data services with recurring contracts.",
        whiteSpace: [
          { p: "GNSS tolling technology inside winning consortia", why: "A system replacement resets incumbency — technology decides", sub: "Tolling & Parking" },
          { p: "V2X safety corridors, both sides of the air gap", why: "Spectrum is cleared; nobody else owns vehicle AND roadside", sub: "V2X" },
          { p: "Charger-reliability data for OEMs and CPOs", why: "Bad charger data is now the EV adoption bottleneck", sub: "Map Services" },
        ],
        profitability: "B2G thin but long-duration; data services higher-margin and fast-cycle — the portfolio balances them",
      },
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
    stakeholders: [
      { name: "NHAI / MoRTH", type: "government", influence: 10, interest: 8, stance: "ally", reasoning: "MLFF policy and highway ITS investments are the primary market-creation mechanism; policy ally." },
      { name: "Smart city / urban traffic bodies (MoHUA)", type: "government", influence: 7, interest: 6, stance: "ally", reasoning: "Urban ITS and V2X corridor pilots are co-driven with smart-city programmes." },
      { name: "Indian system integrators (BEL, L&T, Tata Projects)", type: "supplier", influence: 8, interest: 7, stance: "neutral", reasoning: "Potential consortium prime partners who provide B2G relationships and procurement track record Bosch lacks." },
      { name: "Fleet operators & CPOs", type: "oem", influence: 6, interest: 7, stance: "ally", reasoning: "Commercial charging-map data services customers — faster revenue cycle than B2G." },
    ],
    competitors: [
      { name: "Kapsch TrafficCom", type: "global", x_price_position: 8, y_tech_depth: 8, moat: "MLFF/GNSS tolling IP + global deployments", reasoning: "Closest global ITS rival; Bosch's both-sides V2X story is the differentiation." },
      { name: "Q-Free / Redflex", type: "global", x_price_position: 7, y_tech_depth: 7, moat: "Tolling and enforcement hardware + software", reasoning: "Compete on tolling systems; Bosch adds vehicle-side dimension they lack." },
      { name: "BEL (Bharat Electronics)", type: "indian-incumbent", x_price_position: 5, y_tech_depth: 6, moat: "DPSU procurement relationships + domestic preference", reasoning: "Government procurement incumbent; Bosch needs them as a consortium partner, not a competitor." },
      { name: "Bosch (target position)", type: "global", x_price_position: 7, y_tech_depth: 8, moat: "MLFF heritage + both-sides V2X (vehicle + infra)", reasoning: "Unique both-sides-of-the-air-gap position — no competitor covers vehicle-side AND infrastructure-side." },
    ],
    competitorWhiteSpace: "Both-sides V2X technology (vehicle-side OBU + infrastructure-side RSU + cloud backend) from one supplier — no incumbent owns all three; Bosch's cross-field assets make this uniquely credible.",
    suppliers: [
      { input: "GNSS OBU hardware", supply_risk: 5, profit_impact: 7, quadrant: "leverage", reasoning: "Multiple automotive-grade GNSS suppliers; manageable." },
      { input: "RSU (Road-Side Unit) electronics", supply_risk: 6, profit_impact: 7, quadrant: "bottleneck", reasoning: "C-V2X RSU hardware is a specialised supply; limited certified vendors in India." },
      { input: "Cloud ITS backend infrastructure", supply_risk: 4, profit_impact: 7, quadrant: "leverage", reasoning: "AWS/Azure infrastructure; multi-cloud possible." },
    ],
    sources: ["NHAI MLFF policy & pilots", "Infrastructure capex allocations", "Congestion & road-safety data", "C-V2X standards & corridor pilots", "EV charging-data quality studies", "B2G procurement rules", "ITS market forecasts", "Consortium & tender trackers", "WPC 5.9 GHz C-V2X OBU de-licensing notification (Jun-2026)", "MHI PM E-DRIVE extension notification (Aug-2025)"],
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
      Political: [
        { cat: "Government Schemes & Incentives", p: "ELV Rules 2025 (steel-linked EPR) + Battery Waste Rules + advancing Right-to-Repair policy — regulation is manufacturing this field's demand", why: "MoEFCC EPR targets create audited compliance obligations; a national Right-to-Repair framework is in motion for automobiles [1][9]", sowhat: "Traceability, diagnostics and second-life services have regulation-guaranteed buyers — the data layer Bosch can own", i: "high", subs: ["Battery 2nd Life & Recycling", "Right to Repair"], c: [1, 9] },
        { cat: "Government Schemes & Incentives", p: "The vehicle-scrapping market formalises from $12.8B (2026) to a projected $31.7B (2033) — policy is industrialising the reverse value chain", why: "ELV rules, registered scrapping facilities and fitness-test enforcement convert an informal sector into an auditable industry [9]", sowhat: "An industrialised reverse chain needs exactly the certification, diagnostics and traceability infrastructure Bosch's data-layer strategy provides", i: "high", subs: ["Battery 2nd Life & Recycling", "Residual Value"], c: [9] },
      ],
      Economic: [
        { cat: "Economic Growth & Consumer Spending", p: "Compliance-driven demand is GDP-cycle-independent — EPR obligations bind in good years and bad", why: "Producers must evidence collection and recycling regardless of market conditions; the demand floor is legal, not economic [1]", sowhat: "The traceability/compliance revenue line carries counter-cyclical resilience rare among the search fields", i: "medium", subs: ["Battery 2nd Life & Recycling"], c: [1] },
        { cat: "Economic Growth & Consumer Spending", p: "EV battery value retention is a major TCO and financing lever — battery is ~40% of EV cost", why: "Second-life and accurate residual valuation unlock fleet economics and resale markets [2]", sowhat: "Residual-value estimation and second-life enablement are monetisable data services with cross-field synergy (Energy, Fintech)", i: "high", subs: ["Residual Value", "Battery 2nd Life & Recycling"], c: [2] },
      ],
      Social: [
        { cat: "Consumer Behavior & Values", p: "Corporate BRSR/scope-3 pressure outpaces consumer green premiums — the buyer of circularity is the enterprise, not the individual", why: "Disclosure mandates drive corporate demand while price-sensitive consumers won't pay green premiums [3]", sowhat: "Target B2B/regulatory-driven demand (OEMs, fleets, compliance), not consumer green premiums", i: "medium", subs: ["Carbon Credits", "Battery 2nd Life & Recycling"], c: [3] },
        { cat: "Lifestyle & Consumer Behavior", p: "India's deep repair-and-reuse culture is a structural ally of Right-to-Repair — formalising it creates the market rather than fighting behaviour", why: "Indian vehicle owners already repair and extend product life by default; policy formalisation channels existing behaviour through certified providers [1]", sowhat: "The workshop network converts cultural repair behaviour into certified, warranty-safe service revenue — a moat informal players can't match on trust", i: "medium", subs: ["Right to Repair"], c: [1] },
      ],
      Technological: [
        { cat: "Data-Driven Insights", p: "Battery diagnostics + traceability are the technical heart of circularity — every downstream market prices on battery-state data quality", why: "Second-life grading, recycling routing and residual valuation all depend on accurate battery-state data and lifecycle traceability [4]", sowhat: "Bosch BMS/diagnostics + workshop network can generate and certify exactly this data — the defensible position", i: "high", subs: ["Battery 2nd Life & Recycling", "Residual Value"], c: [4] },
        { cat: "Emerging Technologies", p: "Battery-passport architectures (EU-style) are coming to India via export coupling — early passport capability is exportable compliance infrastructure", why: "Indian battery and vehicle exporters must meet EU battery-passport rules regardless of Indian timelines; domestic frameworks tend to follow [4]", sowhat: "Build passport-grade traceability once, sell it twice: EU-export compliance now, Indian EPR compliance as rules mature", i: "medium", subs: ["Battery 2nd Life & Recycling"], c: [4] },
      ],
      Environmental: [
        { cat: "Circular Economy & E-Waste", p: "Circular-economy mandates are the field's entire reason for being — producer responsibility tightens across the value chain", why: "Carbon accounting, recycled-content rules and producer responsibility are tightening [5]", sowhat: "Aligns directly with the mapped Circular-Economy BBM stream — strategic coherence", i: "high", subs: ["Battery 2nd Life & Recycling", "Carbon Credits"], c: [5] },
        { cat: "Natural Resources", p: "The battery-retirement wave (first EV cohorts retiring post-2027) is the field's volume clock — feedstock scales with the parc's age, not policy", why: "End-of-life battery volumes ramp sharply as early EV cohorts age out; the material-recovery opportunity is demographically locked-in [7]", sowhat: "Time capacity and platform investments to the retirement curve — the trigger-based scaling in this field's verdict", i: "high", subs: ["Battery 2nd Life & Recycling"], c: [7] },
      ],
      Legal: [
        { cat: "Environmental & Sustainability Regulations", p: "Carbon-credit & EPR compliance frameworks are still maturing — rule risk is high, so platforms must be standards-agnostic", why: "Carbon markets and EPR mechanics in India are evolving; standards and pricing are unsettled [6]", sowhat: "Build flexible, standards-agnostic platforms; avoid betting on any single immature mechanism", i: "high", subs: ["Carbon Credits"], c: [6] },
        { cat: "Government Schemes & Incentives", p: "MoRTH's draft scrappage incentives (rebates for scrapping against new purchases) would accelerate ELV volumes into the formal chain", why: "Purchase-linked scrappage rebates pull end-of-life vehicles out of informal channels and into registered facilities where traceability applies [10]", sowhat: "If notified, the incentive spikes certified-scrapping demand — a watch-trigger for scaling the traceability platform", i: "medium", subs: ["Battery 2nd Life & Recycling", "Residual Value"], c: [10] },
      ],
    },
    swot: {
      S: [
        { area: "Market", p: "Battery diagnostics + 10,000-workshop network for collection, grading and certification", why: "Second-life and recycling need trusted physical touchpoints and battery-state data — Bosch uniquely has both", sowhat: "Own the diagnostics-and-collection layer that recyclers and second-life operators depend on" },
        { area: "Technology", p: "Cross-field data assets (battery health from Energy, vehicle data from Connectivity)", why: "Residual valuation and circularity scoring reuse data Bosch already generates elsewhere", sowhat: "Productise residual-value and circularity-scoring services — low marginal cost, recurring" },
      ],
      W: [
        { area: "Technology", p: "No recycling-process technology or plant franchise", why: "Hydrometallurgical recycling and material recovery are specialist domains Bosch doesn't operate", sowhat: "Partner with recyclers; own the data/diagnostics/collection layer, not the chemistry" },
        { area: "Market", p: "Markets are nascent and policy-dependent", why: "Revenue today is thin; scale depends on EPR enforcement and second-life market formation", sowhat: "Patient, optionality-led entry; size investment to current evidence, scale on triggers" },
      ],
      O: [
        { p: "EPR enforcement creating a compliance-traceability market", why: "Producers must prove collection/recycling; nobody owns the automotive traceability layer yet", sowhat: "First-mover on battery/component traceability-as-a-service — regulation guarantees demand" },
        { p: "Second-life battery enablement for stationary storage & charging", why: "Graded second-life packs can buffer charging infrastructure — bridges to Energy field", sowhat: "Diagnostics + grading + matching platform; Bosch certifies, partners deploy" },
      ],
      T: [
        { p: "Pure-play recyclers & startups integrating diagnostics themselves", why: "Recyclers (Attero/Lohum-class) add grading/diagnostics to capture more value", sowhat: "Move first on the data layer; partner with recyclers before they build it" },
        { p: "Policy/standard volatility undermining business cases", why: "Immature carbon and EPR mechanics can shift, stranding investments", sowhat: "Standards-agnostic platforms; avoid mechanism-specific bets" },
      ],
      tows: {
        SO: "Use battery diagnostics + workshop network (S) to be the first-mover in battery traceability-as-a-service when EPR enforcement mandates compliance (O) — regulation guarantees demand and Bosch has the only physical + data infrastructure.",
        ST: "Use workshop data depth + cross-field battery assets (S) against recyclers integrating diagnostics (T) by embedding the Bosch data layer before they build comparable grading capability in-house.",
        WO: "Overcome no-recycling-process franchise (W) by partnering recyclers for chemistry and plant while owning the second-life grading and diagnostics layer they depend on (O) — complementary rather than competitive.",
        WT: "Mitigate nascent markets + policy dependence (W) against standard volatility and recycler integration (T) by building standards-agnostic platforms and committing capital only when EPR-enforcement triggers actually fire.",
      },
      targetStrategy: {
        growth: [
          { lever: "Workshop network + battery diagnostics", action: "Launch EPR traceability and certified battery-health services for obligated producers now" },
          { lever: "Cross-field data assets (BMS, vehicle cloud)", action: "Co-create residual-value scoring with lenders and insurers" },
        ],
        improvement: [
          { gap: "No recycling-process technology", action: "Partner recyclers; own data and certification, never the chemistry" },
          { gap: "Nascent, policy-dependent markets", action: "Size investment to current evidence; scale on EPR-enforcement and retirement-volume triggers" },
        ],
      },
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
      attractiveness: {
        maturity: "Emerging",
        histCagr: "~25%+ (2022–25, off a very small base; estimate)",
        fwdCagr: "30% (2025–30); battery-retirement wave lands post-2027",
        drivers: ["EPR enforcement (battery + ELV rules)", "First EV cohorts retiring post-2027", "Scrapping market formalising: $12.8B (2026) → $31.7B (2033)"],
        constraints: ["Carbon/EPR mechanics still unsettled — rule risk", "Second-life market not yet formed", "Consumers won't pay green premiums"],
        access: {
          channels: "Obligated producers (OEMs, pack makers); recyclers; the owned workshop network",
          partners: "Registered recyclers, scrapping facilities, insurers & lenders",
          barriers: "EPR audit regimes — a compliance moat for organised players",
          localization: "Fully domestic by nature — collection and certification are physical",
          cac: "Low — obligated producers must buy compliance; workshops are an owned channel",
        },
        valuePool: "Recycling chemistry belongs to specialists; the pool Bosch can own is the data layer — traceability, grading, certification and residual-value scoring that every downstream market depends on.",
        whiteSpace: [
          { p: "EPR traceability-as-a-service", why: "Producers must evidence compliance; nobody owns the automotive layer yet", sub: "Battery 2nd Life & Recycling" },
          { p: "Certified battery SoH reports for resale and finance", why: "The used-EV market needs a trust standard", sub: "Residual Value" },
          { p: "EU battery-passport readiness for exporters", why: "Export coupling brings the requirement before Indian rules do", sub: "Battery 2nd Life & Recycling" },
        ],
        profitability: "Data and certification services earn software-like margins; physical recycling is capital-heavy and not ours",
      },
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
    stakeholders: [
      { name: "MoEFCC / CPCB (EPR enforcement)", type: "regulator", influence: 9, interest: 7, stance: "ally", reasoning: "EPR mandate enforcement creates the compliance-traceability market Bosch is uniquely placed to serve." },
      { name: "Battery recyclers (Attero, Lohum, Epsilon)", type: "supplier", influence: 7, interest: 7, stance: "neutral", reasoning: "Need battery diagnostics and grading data Bosch can provide; potential partners before they build it themselves." },
      { name: "OEMs / EV makers (battery producers)", type: "oem", influence: 8, interest: 7, stance: "neutral", reasoning: "EPR obligors who need certified collection/traceability; the compliance demand driver." },
      { name: "Second-life storage operators", type: "consumer", influence: 5, interest: 7, stance: "ally", reasoning: "Need certified graded batteries; Bosch's diagnostics platform is their quality gateway." },
    ],
    competitors: [
      { name: "Attero Recycling", type: "indian-incumbent", x_price_position: 4, y_tech_depth: 6, moat: "Recycling process IP + collection network", reasoning: "Expanding into diagnostics to capture more value — the specific threat to Bosch's data layer." },
      { name: "Lohum Cleantech", type: "indian-incumbent", x_price_position: 5, y_tech_depth: 6, moat: "Battery material recovery + second-life grading", reasoning: "Another recycler moving into diagnostics; Bosch must embed first." },
      { name: "Epistolio / global BMS diagnostics startups", type: "startup", x_price_position: 5, y_tech_depth: 7, moat: "Battery analytics software", reasoning: "Pure-play battery analytics; Bosch's workshop network is the physical distribution advantage they lack." },
      { name: "Bosch (target position)", type: "global", x_price_position: 7, y_tech_depth: 8, moat: "10,000-workshop network + battery diagnostics + cross-field data", reasoning: "Physical collection + digital diagnostics + Energy-field data — a combination recyclers can't replicate." },
    ],
    competitorWhiteSpace: "Battery traceability-as-a-service combining physical workshop collection + certified diagnostics + EPR compliance reporting — no recycler or software startup has Bosch's physical network + data depth combination.",
    suppliers: [
      { input: "Battery diagnostic equipment", supply_risk: 5, profit_impact: 7, quadrant: "strategic", reasoning: "Specialised EIS and state-of-health testing equipment; limited automotive-grade vendors." },
      { input: "Traceability software platform", supply_risk: 4, profit_impact: 7, quadrant: "leverage", reasoning: "Cloud-based; multiple platform options or internal build." },
      { input: "Workshop consumables / logistics", supply_risk: 3, profit_impact: 4, quadrant: "non-critical", reasoning: "Managed through existing Bosch service network." },
    ],
    sources: ["Battery Waste Mgmt Rules & Right-to-Repair", "EV battery TCO & residual studies", "BRSR/scope-3 disclosure trends", "Battery diagnostics & traceability briefings", "Circular-economy mandate analyses", "Carbon-market & EPR mechanics", "Recycling/second-life market forecasts", "Competitive landscape trackers", "NITI Aayog ELV circular-economy report (Jan-2026) & scrapping-market forecasts", "MoRTH scrappage-incentive draft"],
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
      Political: [
        { cat: "Government Stability & Policy Certainty", p: "No Indian eVTOL/UAM certification regime exists — the regulatory gap is itself the strategic finding", why: "India lacks type-certification, vertiport and air-corridor rules for passenger eVTOL; DGCA drone policy is the nearest precedent [1]", sowhat: "Market formation is regulation-gated and years away — this is optionality, not a near-term business", i: "high", subs: ["Urban Air Mobility"], c: [1] },
        { cat: "Government Schemes & Incentives", p: "Unlike EVs, semiconductors or drones, UAM has no incentive scheme — there is no policy pull to accelerate the market", why: "PLI-class support exists for adjacent sectors but not eVTOL; the drone PLI is the closest and excludes passenger platforms [1]", sowhat: "No subsidy floor means the field must clear pure commercial economics — a further argument for the watch-only posture", i: "medium", subs: ["Urban Air Mobility", "Rural Applications"], c: [1] },
      ],
      Economic: [
        { cat: "Economic Growth & Consumer Spending", p: "Use-case economics favour cargo/medical before passenger in India — the rational wedge is component supply into those platforms", why: "Passenger UAM needs affluent dense corridors; medical-emergency and cargo logistics have clearer near-term value [2]", sowhat: "If Bosch engages, it is component supply into cargo/medical platforms, not passenger air-taxi bets", i: "medium", subs: ["Rural Applications", "Urban Air Mobility"], c: [2] },
        { cat: "Inflation & Interest Rates", p: "At a 5.25% cost of capital with zero near-term revenue, every rupee committed to eVTOL carries the portfolio's highest opportunity cost", why: "Pre-revenue capital deployment competes against funded H1 demand in other fields; the discount math is unforgiving for 5–10 year paybacks [9]", sowhat: "Cap engagement at monitoring cost — transferable-tech readiness is already paid for by the Energy and ECA fields", i: "medium", subs: ["Urban Air Mobility"], c: [9] },
      ],
      Social: [
        { cat: "Consumer Behavior & Values", p: "Public-acceptance and noise concerns are unproven in Indian urban contexts — adoption risk compounds regulatory risk", why: "Safety perception, noise and equity questions are unresolved globally and untested in India [3]", sowhat: "Reinforces a wait-and-supply posture", i: "low", subs: ["Urban Air Mobility"], c: [3] },
        { cat: "Lifestyle & Consumer Behavior", p: "The medical-access social case (hill states, rural emergency response) is India's most credible UAM narrative — and its most likely first regulatory sandbox", why: "Drone medical-logistics pilots already operate in access-constrained geographies; passenger-free medical UAM extends a proven pattern [3]", sowhat: "Watch medical/rural corridors as the leading indicator — the trigger for component-qualification engagement", i: "medium", subs: ["Rural Applications"], c: [3] },
      ],
      Technological: [
        { cat: "Emerging Technologies", p: "Powertrain, sensing and flight-control electronics overlap with Bosch automotive competencies — the credible angle is aerospace-qualified components", why: "Electric propulsion, redundant power electronics, IMUs/sensors and safety-critical control transfer meaningfully from automotive to eVTOL [4]", sowhat: "Component supply, not whole aircraft — leverage transferable tech when the market forms", i: "high", subs: ["Urban Air Mobility", "Rural Applications"], c: [4] },
        { cat: "Pace of Change", p: "Battery energy density is the binding technical constraint — eVTOL viability tracks the same cell-chemistry progress the Energy field already watches", why: "Current energy density limits payload/range; meaningful improvement timelines are measured in cell-chemistry generations [5]", sowhat: "No separate technology watch needed — the Energy field's chemistry monitoring doubles as the eVTOL viability signal", i: "medium", subs: ["Urban Air Mobility"], c: [5] },
      ],
      Environmental: [
        { cat: "Climate Policy & Emission Regulations", p: "The zero-emission urban-air narrative aligns with electrification policy — but delivers no regulatory pull while certification is absent", why: "Climate alignment is necessary but not sufficient; without a certification regime there is nothing for green policy to accelerate [5]", sowhat: "Don't mistake narrative alignment for market formation — the gate is DGCA, not MoEFCC", i: "low", subs: ["Urban Air Mobility"], c: [5] },
        { cat: "Physical Climate Risk", p: "Indian operating conditions (heat, monsoon, dust) raise eVTOL engineering bars beyond global baselines — relevant to any future component qualification", why: "Thermal derating and weather-resilience requirements compound the already-hard aviation engineering problem in Indian conditions [5]", sowhat: "India-hardening expertise (a Bosch automotive strength) becomes a component-supply differentiator if/when qualification begins", i: "low", subs: ["Rural Applications"], c: [5] },
      ],
      Legal: [
        { cat: "Automotive Industry Regulations", p: "Aerospace certification (DGCA/global) is a categorically higher bar than automotive — the gatekeeper that defines the entire field posture", why: "Type certification, airworthiness and aviation liability regimes require capabilities and timelines beyond automotive norms [6]", sowhat: "Component supply to certified primes is the only realistic Bosch route", i: "high", subs: ["Urban Air Mobility", "Rural Applications"], c: [6] },
        { cat: "Taxation & Corporate Law", p: "Aviation liability and insurance regimes are unformed for UAM in India — contractual risk allocation for component suppliers is unwritten territory", why: "Component-supplier liability in aviation differs fundamentally from automotive Tier-1 norms; Indian UAM liability law doesn't exist yet [6]", sowhat: "Any future supply agreements need aviation-specialist legal structuring — budget it into the engagement cost when triggers fire", i: "low", subs: ["Urban Air Mobility"], c: [6] },
      ],
    },
    swot: {
      S: [
        { area: "Technology", p: "Transferable electric-propulsion, sensing and safety-critical electronics", why: "Bosch's power electronics, IMUs and functional-safety pedigree are genuinely relevant inputs to eVTOL platforms", sowhat: "Position as a component/subsystem supplier to eVTOL primes if and when the market forms" },
        { area: "Technology", p: "Battery & thermal know-how shared with the Energy field", why: "The binding eVTOL constraint (battery) is one Bosch already engineers around", sowhat: "Cross-leverage Energy-field investment; no standalone bet required to stay informed" },
      ],
      W: [
        { area: "Process", p: "No aerospace certification, airworthiness or aviation-customer base", why: "Aviation is a distinct regulatory and commercial world Bosch does not operate in", sowhat: "Whole-aircraft or flight-critical-system ambitions are unrealistic; supply non-flight-critical subsystems at most" },
        { area: "Leadership", p: "No M&A or BBM hooks mapped for this field", why: "Unlike most fields, there is no existing asset to accelerate any move", sowhat: "Entry would be fully greenfield — raising the bar for commitment further" },
      ],
      O: [
        { p: "Cargo & medical-emergency UAM as the realistic first Indian use cases", why: "These avoid passenger-certification complexity and have clearer value in a geography with access gaps", sowhat: "Watch for cargo/medical platform makers needing qualified electric-propulsion components" },
        { p: "Early supplier relationships with global eVTOL primes", why: "Primes are selecting component partners now for the next decade", sowhat: "Optional, low-cost: engage select primes as a watch-and-qualify exercise" },
      ],
      T: [
        { p: "Aerospace-native suppliers and Tier-1s own the certified-component relationships", why: "Honeywell/Garmin-class and aerospace primes have the certification muscle and incumbency", sowhat: "Automotive transferability is necessary but not sufficient — certification incumbents lead" },
        { p: "Market may never reach scale in India this decade", why: "Regulatory, economic and social risks stack multiplicatively", sowhat: "Treat as pure optionality; avoid capital commitment until triggers fire" },
      ],
      tows: {
        SO: "Use propulsion + battery/thermal know-how shared with Energy (S) to engage global eVTOL primes for cargo/medical use-case component supply (O) — low-cost optionality without standalone capital commitment.",
        ST: "Use safety-critical electronics + battery expertise (S) to stay relevant as a non-flight-critical subsystem supplier while aerospace-native incumbents own the certified component relationships (T).",
        WO: "Overcome no-aerospace-certification (W) by targeting only non-flight-critical subsystem supply to cargo/medical UAM primes (O) — the certification barrier doesn't apply to the components Bosch can realistically supply.",
        WT: "Mitigate no-hooks + no-certification (W) against market-scale risk and aerospace incumbency (T) by maintaining a pure watch-and-qualify posture — zero standalone capital until at least one cargo/medical use case achieves regulatory clarity in India.",
      },
      targetStrategy: {
        growth: [
          { lever: "Transferable propulsion, sensing and safety electronics", action: "Engage 1–2 global primes as a watch-and-qualify exercise — low cost, keeps the option alive" },
          { lever: "Battery/thermal know-how from the Energy field", action: "Track cargo/medical UAM as the realistic first Indian use case" },
        ],
        improvement: [
          { gap: "No aerospace certification base", action: "Never target flight-critical systems; component supply to certified primes only" },
          { gap: "No hooks and no near-term market", action: "No standalone capital until DGCA-framework and unit-economics triggers fire" },
        ],
      },
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
      attractiveness: {
        maturity: "Emerging (pre-market)",
        histCagr: "n/a — no meaningful Indian revenue base yet",
        fwdCagr: "35% (2025–30, speculative, off a near-zero base)",
        drivers: ["Global prime activity and component sourcing", "Medical/cargo access gaps in India", "Zero-emission aviation narrative"],
        constraints: ["No Indian certification regime", "Battery energy density below passenger-viable thresholds", "No incentive scheme; capital costs at 5.25%+"],
        access: {
          channels: "Global eVTOL primes only; no domestic channel exists",
          partners: "Aerospace-certified Tier-1s, prime OEMs",
          barriers: "Aerospace type-certification — categorical and years-long",
          localization: "Not relevant until a market exists",
          cac: "Effectively R&D spend — treat it as option cost, not acquisition cost",
        },
        valuePool: "If the market forms, component pools (propulsion, sensing, power electronics) are the accessible slice; platforms and flight-critical systems stay with aerospace incumbents.",
        whiteSpace: [
          { p: "Cargo/medical UAM component qualification", why: "The first realistic Indian use case; a passenger-free regulatory path", sub: "Rural Applications" },
          { p: "India-hardened component variants", why: "Heat/monsoon/dust engineering transfers from automotive", sub: "Urban Air Mobility" },
        ],
        profitability: "Negative near-term by definition — spend is option-preservation, not investment",
      },
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
    stakeholders: [
      { name: "DGCA / MoCA (drone/UAM framework)", type: "regulator", influence: 9, interest: 6, stance: "neutral", reasoning: "Regulatory framework progress is the single biggest market trigger; currently behind most markets." },
      { name: "Global eVTOL primes (Joby, Archer, Wisk)", type: "oem", influence: 7, interest: 6, stance: "neutral", reasoning: "Target for Bosch's component-supplier engagement; selecting partners now for the next decade." },
      { name: "Cargo/medical logistics operators", type: "consumer", influence: 5, interest: 6, stance: "ally", reasoning: "First viable Indian use case — medical and cargo UAM avoids passenger-certification complexity." },
    ],
    competitors: [
      { name: "Honeywell Aerospace", type: "global", x_price_position: 9, y_tech_depth: 10, moat: "Certified avionics + flight-critical systems", reasoning: "Aerospace incumbent; owns the certified-component relationships Bosch lacks for flight-critical supply." },
      { name: "Garmin / Collins Aerospace", type: "global", x_price_position: 8, y_tech_depth: 9, moat: "Avionics IP + airworthiness certifications", reasoning: "Same dynamics as Honeywell; Bosch targets non-flight-critical subsystems these players don't prioritise." },
      { name: "Bosch (target position)", type: "global", x_price_position: 6, y_tech_depth: 7, moat: "Power electronics + battery management + functional safety", reasoning: "Non-flight-critical subsystem supplier — a distinct, lower-barrier entry point than avionics." },
    ],
    competitorWhiteSpace: "Non-flight-critical automotive-grade subsystems (power management, battery thermal, sensor compute) for eVTOL primes — aerospace incumbents are over-specified; automotive Tier-1s have the right cost and quality profile.",
    suppliers: [
      { input: "Aerospace-qualified components", supply_risk: 8, profit_impact: 7, quadrant: "bottleneck", reasoning: "Very limited qualified aerospace supply chain; the certification barrier for Bosch to enter." },
      { input: "Battery cells (high-density)", supply_risk: 7, profit_impact: 8, quadrant: "strategic", reasoning: "Aviation-grade battery energy density is beyond current automotive cells; critical gap." },
      { input: "Power electronics (shared with Energy field)", supply_risk: 4, profit_impact: 7, quadrant: "leverage", reasoning: "Shared with Energy field investment — capital-efficient cross-leverage." },
    ],
    sources: ["DGCA drone/UAM framework status", "UAM use-case economics studies", "Public-acceptance research", "Propulsion transferability briefings", "Battery energy-density analyses", "Aerospace certification overviews", "Speculative UAM market forecasts", "Pre-market competitive notes", "RBI MPC Jun-2026"],
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
      Political: [
        { cat: "Government Schemes & Incentives", p: "Make-in-India & automation incentives support industrial/warehouse robotics — policy tailwind for the pragmatic entry, not humanoid hype", why: "Manufacturing-competitiveness and logistics-efficiency policy favours AMR and industrial automation adoption [1]", sowhat: "Industrial/warehouse robotics has policy tailwind and real near-term demand — the pragmatic entry vs humanoid hype", i: "medium", subs: ["AMR"], c: [1] },
        { cat: "Government Stability & Policy Certainty", p: "No robotics-specific regulation or incentive regime exists — the field rides adjacent policy (manufacturing, logistics, drones) rather than its own", why: "India has no national robotics mission comparable to semiconductors or EVs; policy support arrives indirectly via manufacturing incentives [1]", sowhat: "Don't build the business case on policy support that doesn't exist — AMR economics must clear commercially, which at scale nodes they do", i: "low", subs: ["AMR", "Humanoids"], c: [1] },
      ],
      Economic: [
        { cat: "Economic Growth & Consumer Spending", p: "The warehouse/logistics boom drives AMR demand — but labour economics still temper full automation outside scale nodes", why: "E-commerce and 3PL growth pull AMR adoption; cheap labour slows payback in many segments [2]", sowhat: "Target high-throughput, labour-constrained nodes (large fulfilment, ports) where AMR economics already work", i: "high", subs: ["AMR"], c: [2] },
        { cat: "Consumer Spending Patterns", p: "Gig-logistics growth creates the labour-scarcity pockets where robot economics flip first — night shifts, hazardous zones, peak-season surges", why: "Even in a labour-abundant market, specific shifts and conditions face genuine scarcity; those niches set AMR's beachhead pricing [2]", sowhat: "Sell AMR components into surge/hazard/night niches first — the TCO story is provable there before it generalises", i: "medium", subs: ["AMR", "Campus Shuttles"], c: [2] },
      ],
      Social: [
        { cat: "Workforce & Labor", p: "Automation-vs-jobs sensitivity shapes deployment narratives — industrial settings face less friction than public-facing robots", why: "Robotics deployment intersects employment politics, especially for visible service robots [3]", sowhat: "Frame as augmentation and safety; industrial settings face less friction than public-facing humanoids", i: "medium", subs: ["AMR", "Humanoids"], c: [3] },
        { cat: "Technology Adoption Behavior", p: "Indian enterprises adopt automation pragmatically — pilot-heavy, ROI-gated, reference-driven — which rewards proven component reliability over novelty", why: "Enterprise buying culture demands demonstrated paybacks and local support; hyped platforms without references stall at pilot stage [3]", sowhat: "Bosch's brand and service network fit the buying culture — lead with reliability evidence and local support, not technology theatre", i: "low", subs: ["AMR"], c: [3] },
      ],
      Technological: [
        { cat: "Emerging Technologies", p: "Robotics and SDV share the same stack — sensors, compute, motion planning, safety — making robotics an adjacency, not a new domain", why: "Perception, real-time compute, actuation and functional safety are common to autonomous vehicles and robots — the explicit 'convergence' sub-field [4]", sowhat: "Bosch's SdV and ADAS investments are directly reusable — one investment serves two fields", i: "high", subs: ["Robotics × SDV", "AMR"], c: [4] },
        { cat: "Pace of Change", p: "Open-source robotics stacks + cheap compute are collapsing entry barriers — differentiation migrates to safety certification and reliability, exactly Bosch's ground", why: "ROS-class open stacks and commodity edge compute let startups assemble robots fast; what they can't assemble is certified safety and automotive-grade reliability [4]", sowhat: "The commoditisation wave strengthens the component/safety-layer strategy — sell the parts of the stack that can't be open-sourced", i: "medium", subs: ["AMR", "Robotics × SDV"], c: [4] },
      ],
      Environmental: [
        { cat: "Natural Resources", p: "Electrification & efficiency requirements apply to mobile robots — battery, power-electronics and thermal constraints mirror EV engineering", why: "Mobile-robot powertrains face the same energy and thermal engineering problems as EVs [5]", sowhat: "Energy-field competencies transfer to mobile-robot powertrains", i: "low", subs: ["AMR", "Campus Shuttles"], c: [5] },
        { cat: "Circular Economy & E-Waste", p: "Robot fleets at scale become an e-waste and battery-EPR category — lifecycle obligations will follow the deployment curve", why: "AMR fleets carry batteries and electronics under the same waste rules tightening for vehicles; fleet operators will need compliant end-of-life routes [5]", sowhat: "The Sustainability field's traceability/diagnostics layer extends to robot fleets — a future cross-sell, design for it now", i: "low", subs: ["AMR"], c: [5] },
      ],
      Legal: [
        { cat: "Automotive Industry Regulations", p: "Safety standards for collaborative/mobile robots are maturing; humanoid norms are absent — AMR is certifiable now, humanoids carry regulatory immaturity", why: "Industrial robot safety standards exist; mobile-robot and humanoid safety/liability frameworks are still forming [6]", sowhat: "Favour AMR/industrial where certification paths exist — another reason humanoids stay at WATCH", i: "medium", subs: ["AMR", "Humanoids"], c: [6] },
        { cat: "Data Privacy & Security Law", p: "Camera-bearing robots in workplaces and campuses process personal data — DPDP consent and purpose-limitation duties apply to robot perception", why: "AMR and shuttle perception stacks capture workers and the public; the same DPDP architecture questions as vehicle cameras apply [6]", sowhat: "Reuse the vehicle-grade privacy architecture (on-device processing, minimal retention) across robot platforms — compliance becomes a component feature", i: "low", subs: ["AMR", "Campus Shuttles"], c: [6] },
      ],
    },
    swot: {
      S: [
        { area: "Technology", p: "Sensors, actuators, motion control and safety-critical compute reusable from automotive", why: "The robotics technology stack overlaps heavily with Bosch's ADAS/SdV and motion-control franchises", sowhat: "Supply the picks-and-shovels (sensors, actuators, compute, safety SW) across robotics platforms" },
        { area: "Leadership", p: "Robotics-SdV convergence thesis lets one investment serve two fields", why: "The mapped 'Convergence of Robotics and SDV' sub-field means SdV R&D doubles as robotics R&D", sowhat: "Frame robotics as an SdV adjacency — capital-efficient, no fully separate bet" },
      ],
      W: [
        { area: "Market", p: "No robotics platform or system-integration franchise", why: "Bosch supplies components broadly but isn't an established robot-platform or humanoid integrator", sowhat: "Stay at the component/subsystem layer; partner integrators for full platforms" },
        { area: "Leadership", p: "No M&A/BBM hooks mapped; humanoid hype inflates expectations", why: "No accelerating asset, and humanoid narratives risk over-commitment to an immature segment", sowhat: "Discipline scope to AMR/industrial + convergence; treat humanoids as watch" },
      ],
      O: [
        { p: "AMR/warehouse automation demand growing now in India", why: "Logistics boom plus labour constraints at scale nodes create real near-term AMR pull", sowhat: "Supply sensors/compute/safety to AMR makers and integrators today" },
        { p: "Autonomous campus shuttles as a low-speed SdV testbed", why: "Geofenced low-speed autonomy is a realistic Indian deployment and exercises the exact SdV stack", sowhat: "Use campus shuttles to mature and reference SdV autonomy — dual-purpose investment" },
      ],
      T: [
        { p: "Crowded field with global robotics specialists and Chinese cost competition", why: "Established robotics OEMs and aggressive Chinese suppliers compete on platform and price", sowhat: "Differentiate via automotive-grade safety/reliability and SdV integration, not platform breadth" },
        { p: "Humanoid hype cycle risking misallocated investment", why: "Capital chases humanoids ahead of viable economics", sowhat: "Maintain WATCH discipline on humanoids; invest where revenue is real" },
      ],
      tows: {
        SO: "Use automotive-grade sensors/compute + SdV convergence thesis (S) to supply AMR makers today and use campus-shuttle testbeds to mature SdV autonomy simultaneously (O) — one investment serves two fields.",
        ST: "Use safety-critical electronics reliability + SdV integration depth (S) to differentiate against Chinese cost competition and global robotics specialists (T) on automotive-grade quality that industrial customers increasingly require.",
        WO: "Overcome no-platform franchise (W) by partnering AMR integrators and system builders to supply the sensing/compute/safety layer (O) — become the component supplier of choice rather than competing at the platform level.",
        WT: "Maintain WATCH discipline on humanoids and avoid platform bets (W) against hype-cycle misallocation and entrenched robotics OEMs (T) by investing only where revenue is real today — AMR sensors, actuators and safety compute.",
      },
      targetStrategy: {
        growth: [
          { lever: "ADAS-grade sensors, actuators and safety compute", action: "Supply AMR and warehouse-automation makers today — component revenue now" },
          { lever: "Robotics × SDV convergence", action: "Co-develop campus-shuttle autonomy as a low-speed SdV testbed" },
        ],
        improvement: [
          { gap: "No robot-platform or integration franchise", action: "Partner integrators; stay at the component/subsystem layer" },
          { gap: "Humanoid hype risks misallocation", action: "Hold humanoids at WATCH with a unit-economics trigger" },
        ],
      },
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
      attractiveness: {
        maturity: "Growth",
        histCagr: "~20% (2020–25, warehouse-automation ramp; estimate)",
        fwdCagr: "25% (2025–30)",
        drivers: ["E-commerce/3PL fulfilment automation", "Labour scarcity at scale nodes and night shifts", "SDV stack reuse lowers Bosch's marginal cost"],
        constraints: ["Cheap labour substitutes robots outside scale nodes", "Chinese component cost pressure", "Humanoid economics unproven"],
        access: {
          channels: "Component sales to AMR makers and integrators; campus-operator pilots",
          partners: "Robot OEMs, warehouse integrators, 3PL operators",
          barriers: "Safety certification for collaborative/mobile robots — favours certified suppliers",
          localization: "Make-in-India assembly favoured; Bosch plants qualify",
          cac: "Low — component sales ride existing industrial relationships",
        },
        valuePool: "Platform assembly is contested and thin; profit concentrates in safety-certified components (sensors, motion control, compute) and the converged autonomy stack shared with SdV.",
        whiteSpace: [
          { p: "Safety-certified AMR component kits", why: "Startups assemble open-source stacks but can't certify safety", sub: "AMR" },
          { p: "Shared safety/compute platform for robots and vehicles", why: "One certified platform, two markets — capital-efficient", sub: "Robotics × SDV" },
          { p: "Campus shuttle autonomy pilots", why: "Geofenced low-speed autonomy is deployable now and matures the SdV stack", sub: "Campus Shuttles" },
        ],
        profitability: "Components earn healthy margins with certification moats; platform plays carry inventory and integration risk",
      },
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
    stakeholders: [
      { name: "Logistics & e-commerce operators (Flipkart/Amazon/Meesho warehouses)", type: "consumer", influence: 8, interest: 8, stance: "ally", reasoning: "Primary AMR buyers in India; automation demand is real and growing with logistics volumes." },
      { name: "Industrial manufacturers (auto plants, pharma)", type: "consumer", influence: 7, interest: 7, stance: "ally", reasoning: "I5.0 and labour-cost pressure drive automation adoption; Bosch's own plants are reference customers." },
      { name: "Campus operators (IT parks, airports, hospitals)", type: "consumer", influence: 5, interest: 6, stance: "ally", reasoning: "Campus shuttle use cases are the SdV testbed and a real commercial opportunity." },
      { name: "MoLEM / Make-in-India", type: "government", influence: 6, interest: 5, stance: "ally", reasoning: "Incentives for automation manufacturing; policy supports the robotics supply chain Bosch is part of." },
    ],
    competitors: [
      { name: "ABB Robotics", type: "global", x_price_position: 8, y_tech_depth: 9, moat: "Industrial robot portfolio + safety systems", reasoning: "Industrial robot leader; Bosch supplies sensors/safety compute to the same platforms rather than competing." },
      { name: "Kuka / Fanuc", type: "global", x_price_position: 8, y_tech_depth: 9, moat: "Robot arm IP + automotive integration", reasoning: "Same positioning — Bosch is their component/safety supplier, not a direct rival." },
      { name: "GreyOrange / Addverb (Indian AMR)", type: "indian-incumbent", x_price_position: 5, y_tech_depth: 7, moat: "India-built AMR + logistics customer relationships", reasoning: "AMR platform makers who need automotive-grade sensors and safety compute — natural customers." },
      { name: "Boston Dynamics / Figure AI (humanoids)", type: "global", x_price_position: 9, y_tech_depth: 10, moat: "Humanoid platform IP + massive funding", reasoning: "WATCH tier; Bosch tracks but does not invest ahead of viable humanoid economics." },
      { name: "Bosch (target position)", type: "global", x_price_position: 6, y_tech_depth: 8, moat: "Automotive-grade sensors + safety compute + SdV convergence", reasoning: "Component/subsystem supplier to AMR/industrial makers — picks-and-shovels position." },
    ],
    competitorWhiteSpace: "Automotive-grade safety-certified sensor + compute modules for AMR and industrial robotics — consumer-grade robot sensors lack the reliability; Bosch brings automotive safety culture to an industry that needs it.",
    suppliers: [
      { input: "LiDAR / ToF sensors", supply_risk: 6, profit_impact: 7, quadrant: "strategic", reasoning: "Key AMR perception input; Bosch plus Velodyne/Ouster; manage supply continuity." },
      { input: "Motor controllers / servo drives", supply_risk: 5, profit_impact: 6, quadrant: "leverage", reasoning: "Multiple vendors; competitive." },
      { input: "Safety MCUs (IEC 61508 / ISO 13849)", supply_risk: 6, profit_impact: 7, quadrant: "strategic", reasoning: "Functional-safety silicon for robot safety functions; shared with automotive supply chain." },
    ],
    sources: ["Make-in-India & automation incentives", "Warehouse/logistics automation studies", "Automation-employment research", "Robotics-SDV convergence briefings", "Mobile-robot powertrain analyses", "Robot safety-standard status", "Robotics market forecasts", "Competitive & funding trackers"],
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
      Political: [
        { cat: "Government Stability & Policy Certainty", p: "Emergency-call (e-call/112 integration) is moving toward mandate, as in other markets — the regulation-pulled wedge of this otherwise diffuse field", why: "Road-safety missions and global e-call precedents point to Indian emergency-call requirements for vehicles [1]", sowhat: "E-call is the regulation-pulled, near-term wedge — position for the mandate before it lands", i: "high", subs: ["E-Call"], c: [1] },
        { cat: "Government Schemes & Incentives", p: "PM E-DRIVE's extended outlay funds e-ambulances (~₹500 Cr) — a new, policy-funded adjacency linking emergency mobility to the field", why: "The post-pivot scheme explicitly allocates to e-ambulance deployment through Mar-2028, creating a funded emergency-mobility vehicle category [9]", sowhat: "E-ambulance platforms need e-call, telematics and emergency-response integration — a concrete, funded buyer for the field's wedge products", i: "medium", subs: ["E-Call"], c: [9] },
      ],
      Economic: [
        { cat: "Economic Growth & Consumer Spending", p: "Healthcare-access gaps make mobility-linked health services socially valuable but hard to monetise — willingness-to-pay is thin outside mandates", why: "Rural access and emergency-response gaps are real, but willingness/ability to pay is limited [2]", sowhat: "Lead with mandated/safety features (e-call); treat broader health services as long-horizon social-impact optionality", i: "medium", subs: ["E-Call", "Assisted Motion"], c: [2] },
        { cat: "Infrastructure Investment", p: "112 emergency-response infrastructure and ambulance-network digitisation are the public-side rails e-call must integrate with — their maturity paces the mandate", why: "An e-call mandate is only useful if the receiving infrastructure (112 centres, dispatch, hospital routing) can act on it; that build-out is underway but uneven [1]", sowhat: "Track 112-infrastructure maturity as the leading indicator of e-call mandate timing — it calibrates the market-entry clock", i: "medium", subs: ["E-Call"], c: [1] },
      ],
      Social: [
        { cat: "Consumer Behavior & Values", p: "DEI & inclusive-mobility-design expectations are rising in policy and procurement — accessibility is becoming a tender criterion", why: "Accessibility norms and inclusive-design advocacy grow in public transport and vehicle design [3]", sowhat: "Inclusive-design capability is a differentiator in public/fleet procurement and aligns with safety positioning", i: "medium", subs: ["DEI Mobility Design"], c: [3] },
        { cat: "Lifestyle & Consumer Behavior", p: "The rural emergency-access gap gives vehicle-linked emergency response its strongest India story — response time is the difference between statistic and survivor", why: "Two-thirds of the population lives where emergency response is slowest; automatic crash notification has outsized life-saving value on highways between cities [2]", sowhat: "Frame e-call's value on Indian crash-response data, not European regulatory precedent — a more persuasive OEM and policy story", i: "medium", subs: ["E-Call"], c: [2] },
      ],
      Technological: [
        { cat: "Emerging Technologies", p: "In-cabin sensing enables health monitoring, but medical-grade is a high bar — wellness-grade is reachable, clinical-grade needs partners", why: "Radar/camera vitals sensing is technically emerging (shared with Interior Systems) but clinical-grade validation is demanding [4]", sowhat: "Wellness-grade (non-medical) features are reachable; medical-grade needs partnerships and clinical pathways", i: "high", subs: ["Assisted Motion", "E-Call"], c: [4] },
        { cat: "Data-Driven Insights", p: "The line between a wellness feature and a medical device is drawn in software — what you claim decides which regulator owns you", why: "The same vitals signal can be a comfort feature or a regulated medical device, depending on how it is processed and marketed [4][6]", sowhat: "Ship wellness features now; keep anything clinical behind a medtech partnership — and make that boundary explicit in the product design", i: "medium", subs: ["Assisted Motion"], c: [4, 6] },
      ],
      Environmental: [
        { cat: "Physical Climate Risk", p: "Environmental factors are largely immaterial to this field — the one exception is extreme-heat resilience of emergency electronics", why: "The field is health/safety-driven, not efficiency-driven; but e-call units must function in crash + heat conditions [5]", sowhat: "State the immateriality plainly in reviews; hold the heat-hardening requirement for e-call hardware", i: "low", subs: ["E-Call"], c: [5] },
      ],
      Legal: [
        { cat: "Automotive Industry Regulations", p: "Medical-device regulation (CDSCO) gates clinical features — the regulatory line defines the field's scope", why: "Anything making medical claims falls under device regulation [6]", sowhat: "Stay wellness/safety-grade unless partnering a medical-device player — regulatory line defines scope", i: "high", subs: ["Assisted Motion"], c: [6] },
        { cat: "Data Privacy & Security Law", p: "Health data sits in DPDP's highest protection class — in-cabin health signals demand the strictest consent and security architecture in the portfolio", why: "Health data is sensitive personal data under DPDP; breach consequences and consent requirements exceed ordinary vehicle data [6]", sowhat: "The privacy architecture for health features must exceed even the biometric standard — design it once, certify it, and make it a trust asset", i: "high", subs: ["Assisted Motion", "E-Call"], c: [6] },
      ],
    },
    swot: {
      S: [
        { area: "Technology", p: "E-call/telematics and crash-sensing competencies", why: "Crash detection, connectivity and emergency-call logic reuse Bosch sensing/connectivity and safety assets", sowhat: "Lead the mandated e-call slice with existing competencies" },
        { area: "Process", p: "In-cabin sensing shared with Interior Systems for wellness features", why: "Occupant/vitals sensing developed for Interior Systems extends into wellness monitoring", sowhat: "Reuse one sensing investment across two fields — capital-efficient" },
      ],
      W: [
        { area: "Process", p: "No medical-device regulatory or clinical-validation competency", why: "Clinical-grade health features require CDSCO pathways and clinical evidence Bosch doesn't generate", sowhat: "Confine to wellness/safety-grade; partner medical-device players for clinical claims" },
        { area: "Leadership", p: "No M&A/BBM hooks; diffuse, hard-to-monetise field", why: "No accelerating asset and unclear willingness-to-pay outside mandates", sowhat: "Lead with the mandated wedge; treat the rest as social-impact optionality" },
      ],
      O: [
        { p: "E-call mandate creating a guaranteed near-term feature market", why: "If mandated, every vehicle needs compliant emergency-call capability", sowhat: "Position now to supply the e-call stack when the mandate lands" },
        { p: "Inclusive-design capability for public/fleet procurement", why: "DEI procurement criteria reward accessible mobility design", sowhat: "Build inclusive-design as a differentiator across cockpit/interior offers" },
      ],
      T: [
        { p: "Telematics specialists and medtech players occupying adjacent space", why: "Emergency-response telematics and digital-health players move toward the vehicle", sowhat: "Differentiate via automotive-grade integration and safety reliability" },
        { p: "Regulatory distance of medical features risks over-investment", why: "Clinical-grade ambitions can sink capital into long regulatory pathways", sowhat: "Hold the wellness/safety line; partner for anything clinical" },
      ],
      tows: {
        SO: "Use e-call/crash-sensing + in-cabin sensing assets (S) to position as the certified e-call stack supplier before the mandate lands (O) — regulation-guaranteed demand with existing competency.",
        ST: "Use automotive-grade integration + sensing reliability (S) to differentiate against telematics specialists and medtech players occupying adjacent space (T) who lack the vehicle-embedded integration depth.",
        WO: "Overcome no-medical-competency (W) by partnering medical-device players for clinical components to capture the e-call opportunity with clinically-validated elements (O) without building a regulatory pathway from scratch.",
        WT: "Hold the wellness/safety line and avoid clinical-grade capital bets (W) against regulatory-distance risk and medtech specialists (T) — the e-call wedge is the only near-term scope worth committing resources to.",
      },
      targetStrategy: {
        growth: [
          { lever: "Crash sensing + connectivity already in production", action: "Package a 112-ready e-call stack; target e-ambulance programmes now" },
          { lever: "Shared in-cabin sensing investment", action: "Ship wellness-grade features on the Interior field's sensor stack — no new capex" },
        ],
        improvement: [
          { gap: "No medical-device regulatory capability", action: "Partner medtech players for anything clinical; keep a strict claims firewall" },
          { gap: "Weak monetisation outside mandates", action: "Lead with mandated/funded slices (e-call, e-ambulance); treat the rest as optionality" },
        ],
      },
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
      attractiveness: {
        maturity: "Emerging",
        histCagr: "~12% (2020–25, telematics-led; estimate)",
        fwdCagr: "17% (2025–30); an e-call mandate would step-change it",
        drivers: ["E-call/112 mandate trajectory", "PM E-DRIVE e-ambulance outlay", "Accessibility criteria entering public tenders"],
        constraints: ["Smartphones substitute emergency and health functions", "Willingness-to-pay thin outside mandates", "Clinical features gated by CDSCO pathways"],
        access: {
          channels: "OEM RFQs on mandate timing; fleet & public-transport tenders; medtech partnerships",
          partners: "Medtech firms (clinical), emergency-response operators, public-transport authorities",
          barriers: "CDSCO device perimeter for clinical claims; DPDP highest-class health data",
          localization: "112-infrastructure integration is the India-specific engineering task",
          cac: "Mandate-driven procurement is low-CAC; wellness features sell only when bundled",
        },
        valuePool: "Clinical devices belong to medtech; the accessible pool is e-call stacks, wellness sensing and inclusive-design services — modest, but regulation-backed.",
        whiteSpace: [
          { p: "112-integrated e-call stack ready for the mandate", why: "Positioning before regulation lands wins the sourcing window", sub: "E-Call" },
          { p: "E-ambulance telematics & emergency integration", why: "Policy-funded vehicles need exactly this", sub: "E-Call" },
          { p: "Inclusive-design consulting for fleet tenders", why: "DEI criteria are entering procurement; the capability is scarce", sub: "DEI Mobility Design" },
        ],
        profitability: "Mandate volumes earn steady component margins; wellness monetisation unproven — anchor on the regulated wedge",
      },
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
    stakeholders: [
      { name: "MoRTH / TRAI (e-call mandate)", type: "regulator", influence: 9, interest: 6, stance: "ally", reasoning: "E-call mandate is the primary demand trigger; Bosch's connectivity + sensing assets are the implementation path." },
      { name: "CDSCO (medical device regulator)", type: "regulator", influence: 7, interest: 4, stance: "neutral", reasoning: "Clinical-grade features require CDSCO pathways; Bosch stays below this threshold intentionally." },
      { name: "PV OEMs (safety/connectivity teams)", type: "oem", influence: 8, interest: 6, stance: "neutral", reasoning: "Platform decisions for e-call integration; Bosch must bundle with connectivity and sensing platform deals." },
      { name: "Medical-device partners (GE Healthcare, Philips, domestic medtech)", type: "supplier", influence: 6, interest: 6, stance: "ally", reasoning: "Partners for any clinical-grade feature ambition; Bosch provides the vehicle side, they provide the medical validation." },
    ],
    competitors: [
      { name: "Telit / Sierra Wireless (telematics modules)", type: "global", x_price_position: 6, y_tech_depth: 7, moat: "Telematics module IP + global OEM certifications", reasoning: "e-call telematics competitors; Bosch's sensor-fusion integration is the differentiator." },
      { name: "Stoneridge / Continental (e-call systems)", type: "global", x_price_position: 7, y_tech_depth: 8, moat: "e-call system integration + OEM relationships", reasoning: "Most direct e-call competitors; Bosch bundles with broader connectivity/sensing platform." },
      { name: "Withings / digital-health startups", type: "startup", x_price_position: 5, y_tech_depth: 7, moat: "Consumer wellness sensors + health data platforms", reasoning: "Entering vehicle wellness space from consumer side; Bosch counters with automotive-grade reliability." },
      { name: "Bosch (target position)", type: "global", x_price_position: 6, y_tech_depth: 8, moat: "Crash sensing + connectivity + Interior-Systems sensing reuse", reasoning: "Cross-field sensing reuse (Interior + Connectivity) creates a lower-cost, higher-quality e-call bundle." },
    ],
    competitorWhiteSpace: "Integrated e-call + driver wellness sensing as a bundled OEM-line feature reusing Interior-Systems radar and Connectivity assets — pure e-call players lack the sensing depth; wellness players lack the vehicle integration.",
    suppliers: [
      { input: "Emergency SIM / eSIM for e-call", supply_risk: 5, profit_impact: 7, quadrant: "strategic", reasoning: "eSIM for dedicated e-call bearer; limited certified vendors — critical for mandate compliance." },
      { input: "In-cabin radar (shared with Interior Systems)", supply_risk: 4, profit_impact: 7, quadrant: "leverage", reasoning: "Cross-field shared supply — leverages Interior-Systems investment." },
      { input: "PSAP / 112 backend integration", supply_risk: 6, profit_impact: 6, quadrant: "bottleneck", reasoning: "Government PSAP integration is a bottleneck; must be certified by regulatory bodies." },
    ],
    sources: ["E-call/112 integration policy", "Healthcare-access & mobility studies", "DEI/accessibility procurement norms", "In-cabin vitals-sensing briefings", "(limited environmental relevance)", "CDSCO & DPDP health-data rules", "Mobility-health niche forecasts", "Adjacent competitive trackers", "MHI PM E-DRIVE extension notification (Aug-2025)"],
  },
};

/* ═══ V6 enrichment layer — per-field deep-dive extensions (illustrative) ═══ */
const V6 = {
  energy: {
    market: {
      scurve: "Early Adoption",
      bizModel: "HW sales (BMS, power electronics) + SaaS (charging management, battery cloud) + DaaS (battery-health data feeds) + service contracts (workshops)",
      revenue: [
        { k: "Hardware", v: "~55% today, falling", note: "BMS, power electronics, chargers — price-led, margin compressing" },
        { k: "Software", v: "~20%, rising fast", note: "Charging orchestration, BMS algorithms, V2G — licence + SaaS pricing" },
        { k: "Services", v: "~15%", note: "Battery health checks, warranty support via workshops — recurring" },
        { k: "Data monetization", v: "~10%, fastest-growing", note: "SoH feeds to insurers, lenders, resale platforms — pure margin" },
      ],
    },
    porterDetail: {
      "New entrants": [{ k: "Capital intensity", v: "Low for charging SW, high for cells — entry clusters in software" }, { k: "Regulatory hurdles", v: "AIS-156 certification is the real gate — protects certified players" }, { k: "Access to talent", v: "BMS/power-electronics talent scarce; Bosch's Bengaluru base is an edge" }],
      "Buyer power": [{ k: "Buyer concentration", v: "Top-4 2W OEMs hold ~80% of volume — high leverage" }, { k: "Threat of backward integration", v: "Real: top OEMs building in-house BMS teams" }, { k: "Price sensitivity", v: "Extreme in 2W/3W; softer in fleets buying uptime" }],
      "Supplier power": [{ k: "Supplier concentration", v: "Cells China-centric; PLI capacity easing it from 2026" }, { k: "Switching cost for Bosch", v: "Moderate — chemistry-agnostic design reduces lock-in" }, { k: "Threat of forward integration", v: "Cell makers moving into packs — watch ACC awardees" }],
      "Substitutes": [{ k: "Availability", v: "Battery swap changes form factor, not the need for BMS" }, { k: "Price-performance", v: "No substitute meets the function; pressure is low" }],
      "Rivalry": [{ k: "Number & balance", v: "15+ funded startups + global Tier-1s — crowded but no clear leader yet" }, { k: "Basis of competition", v: "Price in hardware (destructive); shifting to software features (winnable)" }, { k: "Industry growth", v: "28% CAGR means rivals can grow without stealing share — softens rivalry" }],
    },
    competencyAssessment: [
      { cat: "R&D Infra", need: "Battery lab + power-electronics test capacity in India", current: 8, target: 9, priority: "Medium" },
      { cat: "IP", need: "BMS algorithms, thermal management, charging orchestration patents", current: 7, target: 9, priority: "High" },
      { cat: "Manufacturing", need: "India-cost BMS/pack lines at 2W price points", current: 6, target: 9, priority: "High" },
      { cat: "Supply Chain", need: "Cell partnerships (ACC-PLI) + SiC multi-sourcing", current: 5, target: 8, priority: "High" },
      { cat: "G2M", need: "Fleet & discom sales channel beyond classic OEM RFQs", current: 5, target: 8, priority: "High" },
      { cat: "Talent", need: "Battery data science + power-electronics engineers", current: 7, target: 8, priority: "Medium" },
      { cat: "Organization", need: "One energy P&L spanning components, software and services", current: 5, target: 8, priority: "Medium" },
      { cat: "Leadership", need: "Executive commitment to a 5-year energy build-out", current: 7, target: 8, priority: "Low" },
      { cat: "Collaboration", need: "Cell makers, CPOs, discoms, insurers — ecosystem deals", current: 6, target: 9, priority: "High" },
    ],
    competencyRemark: "To win, Bosch needs three things above all: an India-cost manufacturing line (close the 25–30% gap), locked cell partnerships with ACC-PLI winners, and a fleet/discom sales channel. Everything else is already strong enough to start.",
    competitorDynamics: { count: "20+ active players: global Tier-1s, Chinese JV entrants, ~15 funded Indian startups", concentration: "Fragmented — no player holds >15% of the merchant BMS/charging market yet", winWhere: "Merchant BMS for mid-tier OEMs, fleet charging orchestration, battery-health services — where safety certification and the workshop network decide", positioning: "The certified, full-stack alternative: safer than startups, more local than Chinese entrants, more service-backed than anyone" },
    competitorAssessment: { strengths: "CATL/BYD: 25%+ cost advantage from cell-to-pack vertical integration. Startups: speed and India-cost engineering.", weaknesses: "Chinese entrants: thin India service footprint, trust deficit with some OEMs. Startups: weak functional-safety records, no AIS-156 pedigree at scale.", opportunities: "Certified battery-health services (nobody has the workshop network); chemistry-agnostic BMS for OEMs afraid of single-supplier lock-in.", threats: "CATL India JV underpricing merchant BMS before Bosch localises cost; top-4 2W OEMs completing in-house BMS and closing the merchant market." },
    supplierAnalysis: {
      tech: "Cloud (AWS/Azure — multi-cloud, low risk), charging-protocol stacks (open standards), BMS toolchains. Mostly available, competitive.",
      components: "Cells: CATL/BYD/EVE imports dominate today; ACC-PLI (Ola, Reliance, Rajesh Exports) ramping 2026–28. SiC/power semis: Infineon, ST, onsemi — allocation-sensitive. BMS AFE chips: TI, ADI, NXP — moderate concentration.",
      manufacturers: "Pack assembly widely available in India (Dixon-class EMS + specialist pack houses); quality varies — certified capacity is the scarce tier.",
      localization: "Strong case: cells are the #1 import exposure and PLI makes local sourcing viable from 2027; SiC stays imported near-term — hedge via multi-sourcing. Localising packs/BMS assembly is already economic.",
      recommendation: "Play at the integration layer: lock 2 ACC-PLI cell partnerships now, qualify local pack capacity, keep chemistry-agnostic designs so no supplier owns Bosch's roadmap.",
    },
    techGrowth: {
      proven: "Core tech (LFP BMS, DC charging) is proven and deployed at scale globally; India-specific variants (heat-adapted thermal, Na-ion readiness) are in late validation.",
      maturity: [{ k: "TRL", v: "8–9 for BMS/charging; 5–6 for Na-ion & V2G" }, { k: "Commercial maturity", v: "Growth — established buyers, standard RFQ processes" }, { k: "Standardization", v: "CCS2 settled; ISO 15118/OCPP 2.x maturing; swap standards open" }, { k: "Scalability", v: "High — manufacturing and cloud patterns are known" }],
      adoption: "Fleets and commercial users adopt on TCO already; private 2W adoption continues post-subsidy at a slower slope. Adoption is accelerating in charging infrastructure (policy-funded).",
      innovation: [{ k: "R&D investment", v: "High — global cell majors + Indian PLI awardees + VC-funded startups" }, { k: "Patent activity", v: "Dense in cell chemistry & BMS; India filings rising from a low base" }, { k: "Startup ecosystem", v: "Very active: 15+ funded Indian BMS/charging startups" }, { k: "Academic research", v: "IITs/IISc active in battery materials and grid integration" }],
      evolution: "Now: LFP + smart charging. Next 2–4 yrs: Na-ion entry packs, V2G at scale, battery passports. 5+ yrs: solid-state pilots, P2P energy trading on DPI rails.",
      ecosystem: "Supplier base maturing fast under PLI; platform support strong (open charging standards); developer community growing around open protocols; discom partnerships still early.",
      risks: ["Chemistry shifts could strand single-chemistry designs (mitigate: agnostic BMS)", "Grid-integration rules still unsettled for V2G revenue", "Battery data privacy under DPDP needs careful architecture", "Skills: power-electronics engineers remain scarce"],
    },
    research: { note: "Patent and publication activity concentrates in cell chemistry and fast-charging — well ahead of Indian industrial deployment, which is still integrating last-generation designs.", gap: "The research-to-industry gap is ~3–4 years in India; closing it via ACC partnerships is itself an opportunity." },
    activityMeta: [
      { sf: "-", bosch: "-", impact: "In-housing by a major 2W OEM shrinks the merchant BMS pool Bosch sells into." },
      { sf: "+", bosch: "+", impact: "Charging-corridor incentives grow the funded market for Bosch charging management." },
      { sf: "+", bosch: "+", impact: "Local cell production de-risks supply and creates the pack/BMS partner opening." },
      { sf: "+", bosch: "+", impact: "V2G pilot validates the orchestration play Bosch is positioned for." },
      { sf: "+", bosch: "+", impact: "EPR enforcement grows demand for the battery-data layer Bosch can own." },
    ],
    activityTrend: [{ p: "2011–15", n: 3 }, { p: "2016–20", n: 11 }, { p: "2021–25", n: 34 }, { p: "2026 YTD", n: 9 }],
  },

  lighting: {
    market: {
      scurve: "Early Majority",
      bizModel: "HW sales (controllers) + SW licence (adaptive control) + FoD (feature-on-demand personalisation via OTA)",
      revenue: [
        { k: "Hardware", v: "~68% today", note: "Lamps & controllers — commodity-priced, incumbents' ground" },
        { k: "Software", v: "~22%, rising", note: "Adaptive beam control, personalisation — the Bosch entry layer" },
        { k: "Services", v: "~8%", note: "Integration & homologation support for lamp Tier-1s" },
        { k: "Data monetization", v: "~2%, nascent", note: "Usage analytics for feature-on-demand pricing" },
      ],
    },
    porterDetail: {
      "New entrants": [{ k: "Regulatory hurdles", v: "Photometric homologation per function — a real wall for lamp hardware" }, { k: "IP barrier", v: "Optics IP with incumbents; control-SW IP still open ground" }, { k: "Access to customers", v: "Lighting commodity teams trust incumbents — ride a partner in" }],
      "Buyer power": [{ k: "Price sensitivity", v: "High on standard lamps (annual price-downs); lower on signature features" }, { k: "Product differentiation", v: "Adaptive/signature lighting escapes the price war" }, { k: "Switching cost", v: "Platform awards lock 5–7 years — time entry to new RFQs" }],
      "Supplier power": [{ k: "Supplier concentration", v: "LED chips/drivers broadly sourced from Asia — low pressure" }, { k: "Switching cost for Bosch", v: "Low — commodity inputs" }],
      "Substitutes": [{ k: "Availability", v: "None for the function; tech substitution (LED→pixel) happens within the field" }, { k: "Disruptive tech", v: "Pixel/projection lighting favours software entrants — works for Bosch" }],
      "Rivalry": [{ k: "Number & balance", v: "4 strong Indian incumbents + global JVs — clear pecking order, stable" }, { k: "Basis of competition", v: "Price on standard lamps; feature/quality on adaptive — enter on features" }, { k: "Exit barrier", v: "High for lamp makers (dedicated plants) — they will defend hard" }],
    },
    competencyAssessment: [
      { cat: "R&D Infra", need: "Lighting-control validation (HIL + photometric partner labs)", current: 6, target: 8, priority: "Medium" },
      { cat: "IP", need: "Adaptive-beam algorithms, personalisation UX patterns", current: 6, target: 8, priority: "High" },
      { cat: "Manufacturing", need: "Controller/driver electronics lines (existing plants qualify)", current: 8, target: 8, priority: "Low" },
      { cat: "Supply Chain", need: "LED driver ICs + MCUs (shared with ECA sourcing)", current: 7, target: 8, priority: "Low" },
      { cat: "G2M", need: "Access to OEM lighting-commodity sourcing (via lamp partner)", current: 3, target: 7, priority: "High" },
      { cat: "Talent", need: "Perception-SW engineers reassignable from ADAS teams", current: 8, target: 8, priority: "Low" },
      { cat: "Organization", need: "A lighting-SW product line inside the cockpit/SdV unit", current: 5, target: 7, priority: "Medium" },
      { cat: "Leadership", need: "Decision to enter via partnership within the 12–18 month window", current: 5, target: 8, priority: "High" },
      { cat: "Collaboration", need: "One committed lamp-maker alliance (optics + homologation)", current: 3, target: 8, priority: "High" },
    ],
    competencyRemark: "The gap is not technology — it is access. Bosch needs one committed lamp-maker alliance and a leadership decision inside the partnership window. With those two, existing ADAS/SdV assets carry the rest.",
    competitorDynamics: { count: "4 Indian incumbents (Lumax, Uno Minda, Varroc, Fiem) + global JVs (Koito, Stanley, Marelli)", concentration: "High — top-4 hold most OEM platform awards; a clear-leader market", winWhere: "The control/software layer of adaptive lighting and OTA personalisation — incumbents are weak in software and need SDV integration", positioning: "Not a lamp competitor — the software and integration partner that makes incumbent lamps intelligent" },
    competitorAssessment: { strengths: "Incumbents: locked platform awards, homologation muscle memory, OEM commodity-team trust built over decades.", weaknesses: "Thin software organisations; no ADAS perception assets; customers complain about slow feature cycles on smart-lighting requests.", opportunities: "Partner (not fight) the incumbents: sell them the SDV plumbing and adaptive control they cannot build fast enough.", threats: "Lamp Tier-1s hiring software teams — if they close the gap in-house, the partner slot disappears within ~18 months." },
    supplierAnalysis: {
      tech: "Perception/SDV toolchains — in-house. AAOS/OTA infrastructure shared with cockpit field.",
      components: "LED chips (Nichia, Osram, Lumileds — imported, broad supply), driver ICs (TI, Infineon), MCUs (shared ECA sourcing). No chokepoints.",
      manufacturers: "Own electronics plants qualify for controllers; lamp assembly stays with the partner.",
      localization: "Moderate case: LED chips stay imported (no India fab); driver/controller assembly already local. Localisation matters more for tariff optics than cost.",
      recommendation: "Source like an electronics player, not a lamp maker: reuse ECA-field component contracts, keep optics entirely with the partner.",
    },
    techGrowth: {
      proven: "LED and basic adaptive lighting proven globally; matrix/pixel control proven in premium — India cost-down variants are the frontier.",
      maturity: [{ k: "TRL", v: "9 for LED; 7–8 for matrix control; 5 for projection/communicative" }, { k: "Commercial maturity", v: "Mature hardware, growth-stage software layer" }, { k: "Standardization", v: "AIS/UNECE beam regulations stable; SDV interfaces consolidating" }, { k: "Scalability", v: "High — electronics manufacturing patterns known" }],
      adoption: "OEMs adopt adaptive lighting down-segment on BNCAP competition; buyers actively want signature lighting — adoption accelerating in ₹10–20L cars.",
      innovation: [{ k: "R&D investment", v: "Moderate — concentrated in global lamp majors" }, { k: "Patent activity", v: "Dense in optics; sparse in India-specific control SW — open ground" }, { k: "Startup ecosystem", v: "Thin — few lighting startups; innovation comes from incumbents & Tier-1s" }, { k: "Academic research", v: "Limited automotive-lighting research in India" }],
      evolution: "Now: full-LED + basic ADB. Next: matrix control mass-market, OTA personalisation. 5+ yrs: communicative/projection lighting pending regulation.",
      ecosystem: "Component supply mature; homologation ecosystem (ARAI/ICAT) established; software-integration ecosystem just forming — that's the opening.",
      risks: ["Commoditisation of adaptive control if SoC vendors bundle it", "Partner dependence — one alliance carries the entry", "Regulatory delay on projection lighting caps H3"],
    },
    research: { note: "Patents cluster in optics/thermal (incumbent ground); control-algorithm and personalisation IP is comparatively open — matching the Bosch entry.", gap: "Industry deployment lags premium-market research by one platform cycle in India (~4 years) — trickle-down is predictable." },
    activityMeta: [
      { sf: "+", bosch: "+", impact: "Adaptive matrix as standard equipment validates the down-segment thesis." },
      { sf: "+", bosch: "-", impact: "Incumbent building software in-house — the partner window is narrowing." },
      { sf: "+", bosch: "+", impact: "BNCAP-driven auto high-beam commitments create control-SW demand Bosch serves." },
      { sf: "+", bosch: "+", impact: "OTA lighting personalisation shipping proves the FoD business model." },
    ],
    activityTrend: [{ p: "2011–15", n: 4 }, { p: "2016–20", n: 9 }, { p: "2021–25", n: 18 }, { p: "2026 YTD", n: 5 }],
  },

  cockpit: {
    market: {
      scurve: "Early Majority",
      bizModel: "HW sales (HPC, clusters) + SW licence (platform stack) + SaaS (AI assistant, app services) + integration fees (System Integrator role)",
      revenue: [
        { k: "Hardware", v: "~50% today, falling", note: "Displays & compute — panels pass-through, compute defensible" },
        { k: "Software", v: "~30%, rising", note: "AAOS stack, vernacular AI, HMI platform — licence + royalty" },
        { k: "Services", v: "~15%", note: "Integration for mid-size OEMs — the System Integrator ask" },
        { k: "Data monetization", v: "~5%, emerging", note: "In-car commerce & usage analytics — H3 upside on UPI rails" },
      ],
    },
    porterDetail: {
      "New entrants": [{ k: "Capital intensity", v: "Low for SW entrants (IT majors), high for full-stack — integration is the wall" }, { k: "Brand loyalty", v: "OEMs benchmark UX, not brand — incumbency is weak protection here" }, { k: "Access to talent", v: "Android/AI talent abundant in India — no barrier for anyone" }],
      "Buyer power": [{ k: "Buyer concentration", v: "Moderate — many OEMs, but each award is large" }, { k: "Switching cost", v: "High post-integration — platform stickiness rewards the winner" }, { k: "Threat of backward integration", v: "Top OEMs in-house HMI; sell them the platform beneath it" }],
      "Supplier power": [{ k: "Supplier concentration", v: "Qualcomm's cockpit SoC dominance is the field's biggest dependency" }, { k: "Uniqueness", v: "SoC roadmaps are genuinely unique — hence the silicon alliance" }, { k: "Switching cost for Bosch", v: "High per platform — SoC choice locks a generation" }],
      "Substitutes": [{ k: "Availability", v: "Phone projection (CarPlay/AA) substitutes some embedded value" }, { k: "Propensity to substitute", v: "Falling — OEMs pull experience back in-house for data & brand" }],
      "Rivalry": [{ k: "Number & balance", v: "Harman, LG, Visteon, Desay + IT majors — crowded, no dominant leader in India" }, { k: "Basis of competition", v: "Feature & UX quality — winnable ground; price war only in displays" }, { k: "Diversity", v: "Very diverse (Tier-1s, consumer-electronics, IT) — intense but segmentable" }],
    },
    competencyAssessment: [
      { cat: "R&D Infra", need: "Cockpit HIL/UX labs + SoC reference platforms in India", current: 8, target: 9, priority: "Medium" },
      { cat: "IP", need: "HMI platform, vernacular AI models, fusion architectures", current: 7, target: 9, priority: "High" },
      { cat: "Manufacturing", need: "HPC/cluster electronics (existing lines qualify)", current: 8, target: 8, priority: "Low" },
      { cat: "Supply Chain", need: "SoC alliance + panel partnerships", current: 5, target: 8, priority: "High" },
      { cat: "G2M", need: "CDO/digital-buyer selling motion + lighthouse references", current: 5, target: 8, priority: "High" },
      { cat: "Talent", need: "Consumer-grade UX designers (the decisive gap)", current: 5, target: 9, priority: "High" },
      { cat: "Organization", need: "Product-line organisation with monthly OTA cadence", current: 6, target: 8, priority: "Medium" },
      { cat: "Leadership", need: "Commitment to UX acquisition and silicon alliance", current: 6, target: 8, priority: "Medium" },
      { cat: "Collaboration", need: "Bhashini/DPI ecosystem + design studios + app partners", current: 6, target: 8, priority: "Medium" },
    ],
    competencyRemark: "Bosch wins cockpit with three moves: buy UX capability (don't build slowly), lock the SoC alliance, and land two lighthouse Indian OEM deals. The platform tech is already there; the experience layer decides.",
    competitorDynamics: { count: "8–10 serious contenders: global Tier-1s (Harman, LG, Visteon, Panasonic), Chinese entrants (Desay), IT majors on the SW side", concentration: "Moderate — awards spread across players; no one owns India yet", winWhere: "Mid-size OEMs needing pre-integrated stacks, and vernacular AI where nobody has a credible product", positioning: "The integrated platform + India-first AI experience provider — deeper than IT majors, more automotive than consumer-electronics rivals" },
    competitorAssessment: { strengths: "Harman/LG: display supply chains + consumer-brand UX credibility. IT majors: account presence and rate-card pricing.", weaknesses: "Consumer-electronics rivals: thin automotive-safety integration; customers complain about long defect-resolution loops. IT majors: no product IP, everything is a project.", opportunities: "Vernacular AI assistant (nobody owns it), pre-integrated bundles for mid-size OEMs, privacy-first architecture under DPDP.", threats: "A consumer-electronics rival winning a lighthouse Indian OEM and setting the UX benchmark; Qualcomm bundling more of the stack into silicon." },
    supplierAnalysis: {
      tech: "SoCs: Qualcomm dominant, MediaTek rising — the structural dependency. Cloud & AI models: multi-source. Bhashini APIs: public infrastructure.",
      components: "Display panels: BOE, AUO, Tianma — imported, Asia-concentrated; memory & PMICs broadly sourced.",
      manufacturers: "Cluster/HPC assembly local (own plants + EMS); panel module assembly increasingly localising under PLI.",
      localization: "Panels: localisation improving via Indian module lines — tariff + logistics case positive. SoCs: no local option this decade; manage via alliance terms instead.",
      recommendation: "Formalise the SoC alliance (roadmap access + allocation security), localise display-module assembly, keep the AI stack DPI-native and portable across silicon.",
    },
    techGrowth: {
      proven: "Cockpit compute and AAOS stacks are proven at scale; vernacular in-car AI is validated in pilots but not yet at volume — that's the race.",
      maturity: [{ k: "TRL", v: "9 for cockpit platforms; 6–7 for vernacular AI at automotive grade" }, { k: "Commercial maturity", v: "Growth — content per vehicle still climbing steeply" }, { k: "Standardization", v: "AAOS de-facto standard; cockpit-ADAS fusion interfaces consolidating" }, { k: "Scalability", v: "High for platforms; AI inference cost falling fast" }],
      adoption: "Buyers treat screens as a primary purchase criterion; OEM adoption of twin displays reached ₹10L cars — acceleration continues down-segment.",
      innovation: [{ k: "R&D investment", v: "Very high — SoC vendors, global Tier-1s, and AI labs all converge here" }, { k: "Patent activity", v: "Dense in display/SoC; India-language AI IP forming now" }, { k: "Startup ecosystem", v: "Active in voice AI and HMI tooling" }, { k: "Academic research", v: "Strong Indian NLP research (Bhashini ecosystem, IIT groups)" }],
      evolution: "Now: twin displays + AAOS. Next: one-box cockpit-ADAS, vernacular assistants as headline features. 5+ yrs: agentic in-car AI + commerce on UPI rails.",
      ecosystem: "SoC and panel supply mature; language-AI ecosystem uniquely strong in India (Bhashini); app/commerce ecosystem forming; developer community large.",
      risks: ["Qualcomm dependency concentrates value at silicon", "UX benchmark risk — one bad launch anchors perception", "DPDP compliance for voice/video needs on-device design", "AI-model churn — architecture must survive model swaps"],
    },
    research: { note: "Indian-language AI research (Bhashini, IIT NLP groups) is ahead of automotive deployment — no OEM ships a truly good vernacular assistant yet.", gap: "The research-to-product gap in vernacular AI is the single clearest first-mover opening in this field." },
    activityMeta: [
      { sf: "+", bosch: "-", impact: "OEM shipping a 12-language assistant first raises the bar Bosch must beat." },
      { sf: "+", bosch: "+", impact: "India-tuned SoC reference design lowers Bosch's integration cost for DMS + assistant." },
      { sf: "+", bosch: "-", impact: "Consumer-electronics rival displacing an incumbent shows the award risk is real." },
      { sf: "+", bosch: "+", impact: "Premium 2W TFT + app store expands the addressable cockpit market Bosch serves." },
    ],
    activityTrend: [{ p: "2011–15", n: 5 }, { p: "2016–20", n: 14 }, { p: "2021–25", n: 28 }, { p: "2026 YTD", n: 7 }],
  },

  interior: {
    market: {
      scurve: "Early Adoption",
      bizModel: "HW sales (sensors, actuators) + SW licence (occupant-state AI) + retrofit service contracts (fleet DMS)",
      revenue: [
        { k: "Hardware", v: "~65% today", note: "Sensing modules, actuators — component margins, defensible via certification" },
        { k: "Software", v: "~20%, rising", note: "Occupant-state AI, air-quality control logic" },
        { k: "Services", v: "~12%", note: "Fleet fatigue-monitoring subscriptions — recurring" },
        { k: "Data monetization", v: "~3%, nascent", note: "Anonymised cabin analytics; strictly DPDP-gated" },
      ],
    },
    porterDetail: {
      "New entrants": [{ k: "Capital intensity", v: "Low for camera-DMS startups — hence the crowded retrofit tier" }, { k: "Regulatory hurdles", v: "Future AIS DMS/CPD certification will raise the wall — good for Bosch" }, { k: "IP barrier", v: "Radar-fusion occupant sensing IP is scarce — a real differentiator" }],
      "Buyer power": [{ k: "Buyer concentration", v: "OEMs concentrated, but fleets fragment the buyer base" }, { k: "Price sensitivity", v: "High until mandates land — then certified suppliers gain leverage" }, { k: "Product differentiation", v: "Radar+camera fusion vs camera-only is a genuine spec difference" }],
      "Supplier power": [{ k: "Supplier concentration", v: "Sensors broadly sourced; Bosch is itself upstream for several" }, { k: "Importance of Bosch to supplier", v: "High — Bosch volume matters to sensor vendors" }],
      "Substitutes": [{ k: "Availability", v: "Phone-based monitoring substitutes only aftermarket retrofits" }, { k: "Price-performance", v: "OEM-line functions have no substitute at quality" }],
      "Rivalry": [{ k: "Number & balance", v: "Specialists per sub-market (Smart Eye in DMS, giants in seats) — no one fights everywhere" }, { k: "Basis of competition", v: "Feature/quality in monitoring (winnable); price in commodity trim (avoid)" }, { k: "Diversity", v: "High — startups to seat giants; pick battles by sub-field" }],
    },
    competencyAssessment: [
      { cat: "R&D Infra", need: "In-cabin sensing validation + India-condition data collection", current: 7, target: 9, priority: "High" },
      { cat: "IP", need: "Radar-camera fusion, occupant-state algorithms", current: 8, target: 9, priority: "Medium" },
      { cat: "Manufacturing", need: "Sensor module + actuator lines (existing capacity)", current: 8, target: 8, priority: "Low" },
      { cat: "Supply Chain", need: "Standard sensor/actuator inputs — no chokepoints", current: 8, target: 8, priority: "Low" },
      { cat: "G2M", need: "Fleet retrofit channel + seat-Tier-1 partner sales", current: 5, target: 8, priority: "High" },
      { cat: "Talent", need: "Occupant-AI engineers with India datasets", current: 7, target: 8, priority: "Medium" },
      { cat: "Organization", need: "Cross-field coordination with Health (wellness reuse)", current: 6, target: 8, priority: "Medium" },
      { cat: "Leadership", need: "Regulation-timed investment discipline", current: 7, target: 8, priority: "Low" },
      { cat: "Collaboration", need: "Seat Tier-1s + HVAC partners + insurers (fleet DMS)", current: 5, target: 8, priority: "High" },
    ],
    competencyRemark: "Bosch's sensing IP is already best-in-class; the work is India-condition datasets, a fleet retrofit channel, and seat-Tier-1 partnerships. Certify early — the mandate window rewards whoever is ready first.",
    competitorDynamics: { count: "DMS: Smart Eye, Seeing Machines + low-cost startups. Seats: 4–5 global JV giants. Air quality: fragmented consumer brands", concentration: "Concentrated in seats, fragmented in monitoring/air — attack the fragmented slices", winWhere: "OEM-line monitoring (radar fusion + certification) and integrated air-quality systems — not complete seats", positioning: "The certified, OEM-grade sensing supplier — above the retrofit startups, beside the seat giants as partner" },
    competitorAssessment: { strengths: "DMS specialists: field-proven algorithms and NCAP references. Seat giants: locked JV relationships and full-system scale.", weaknesses: "Camera-only DMS players struggle in Indian conditions (lighting, occlusion); customers complain about false positives. Seat Tier-1s: thin sensing/software depth.", opportunities: "Radar-fused monitoring robust to Indian conditions; bundled DMS + air-quality offers nobody packages.", threats: "Low-cost DMS startups anchoring OEM price expectations before mandates; seat Tier-1s integrating sensing in-house." },
    supplierAnalysis: {
      tech: "Perception toolchains in-house; edge-AI runtimes multi-source.",
      components: "Cameras/CMOS: Sony, Omnivision (imported); 60GHz radar chips: TI, Infineon; MEMS: in-house franchise. Actuator motors: local + Bosch lines.",
      manufacturers: "Module assembly local; filtration hardware via partners.",
      localization: "Positive for modules and actuators (already local); imaging silicon stays imported — low risk given broad supply.",
      recommendation: "Leverage Bosch's own MEMS/radar supply position; qualify one local camera-module partner; keep filtration white-labelled.",
    },
    techGrowth: {
      proven: "Camera DMS proven globally; radar-fused occupant sensing validated and entering production; India-condition tuning is the remaining work.",
      maturity: [{ k: "TRL", v: "8–9 DMS; 7 radar CPD; 6 wellness vitals" }, { k: "Commercial maturity", v: "Early growth — regulation will step-change it" }, { k: "Standardization", v: "UNECE DDAW precedent; Indian AIS drafts expected" }, { k: "Scalability", v: "High — standard automotive electronics" }],
      adoption: "Fleets adopt on insurance economics now; consumer adoption follows mandates. AQI features adopted on health salience already.",
      innovation: [{ k: "R&D investment", v: "High in in-cabin radar (60GHz) and edge AI" }, { k: "Patent activity", v: "Rising in radar occupancy; Bosch holds a strong position" }, { k: "Startup ecosystem", v: "Crowded camera-DMS tier, thin in fusion" }, { k: "Academic research", v: "Active in driver-state modelling" }],
      evolution: "Now: fleet DMS retrofits. Next: OEM-line DMS/CPD on mandates, certified air-quality. 5+ yrs: medical-grade vitals via Health-field partnerships.",
      ecosystem: "Sensor supply mature; certification ecosystem forming with AIS drafts; insurer partnerships emerging as the fleet channel.",
      risks: ["Mandate timing slippage", "Privacy backlash if data architecture is careless", "Price anchoring from low-cost startups", "Camera-only benchmarks understating fusion value"],
    },
    research: { note: "60GHz in-cabin radar research and child-presence detection publications are 2–3 years ahead of Indian OEM deployment.", gap: "Certification-ready India datasets are the missing link between research and industry — building them now is the moat." },
    activityMeta: [
      { sf: "+", bosch: "+", impact: "Fleet fatigue-monitoring consultation moves the mandate clock forward." },
      { sf: "+", bosch: "+", impact: "PM2.5 display in a volume SUV validates air-quality willingness-to-pay." },
      { sf: "+", bosch: "+", impact: "CPD entering BNCAP roadmap creates the certified-supplier window Bosch targets." },
      { sf: "+", bosch: "-", impact: "Low-cost retrofit deal anchors price expectations below Bosch's current cost." },
    ],
    activityTrend: [{ p: "2011–15", n: 2 }, { p: "2016–20", n: 7 }, { p: "2021–25", n: 19 }, { p: "2026 YTD", n: 6 }],
  },

  suspension: {
    market: {
      scurve: "Innovation",
      bizModel: "SW licence (ride-control algorithms) + royalties inside SdV platform deals; no hardware revenue by design",
      revenue: [
        { k: "Hardware", v: "0% by strategy", note: "Dampers stay with incumbents — deliberate no-play" },
        { k: "Software", v: "~70% of Bosch-addressable", note: "Control algorithms, preview comfort — licence + royalty" },
        { k: "Services", v: "~25%", note: "Tuning & calibration services per platform" },
        { k: "Data monetization", v: "~5%, speculative", note: "Road-condition data as a by-product — cross-field value" },
      ],
    },
    porterDetail: {
      "New entrants": [{ k: "Capital intensity", v: "Very high for hardware, low for software — mirrors Bosch's posture" }, { k: "IP barrier", v: "Vehicle-dynamics control IP is deep and hard-won — protects VMM position" }],
      "Buyer power": [{ k: "Price sensitivity", v: "Extreme — ride tech is the first feature deleted under cost pressure" }, { k: "Volume of purchase", v: "Tiny volumes concentrate in few premium platforms" }],
      "Supplier power": [{ k: "Supplier concentration", v: "Specialised valves from few makers — but not Bosch's problem in SW scope" }],
      "Substitutes": [{ k: "Availability", v: "Good passive dampers deliver most of the benefit at a fraction of cost" }, { k: "Price-performance", v: "The substitute is genuinely good — the field's core constraint" }],
      "Rivalry": [{ k: "Number & balance", v: "Few global specialists (ZF, Tenneco, BWI) — concentrated, defensive" }, { k: "Exit barrier", v: "High for damper makers — they bundle control to defend hardware" }, { k: "Basis of competition", v: "System bundles vs Bosch's architecture-level software play" }],
    },
    competencyAssessment: [
      { cat: "R&D Infra", need: "Vehicle-dynamics simulation + India road-profile datasets", current: 8, target: 9, priority: "Medium" },
      { cat: "IP", need: "Preview damping, motion-sickness algorithms (VMM extension)", current: 9, target: 9, priority: "Low" },
      { cat: "Manufacturing", need: "None needed — software-only scope", current: 0, target: 0, priority: "Low" },
      { cat: "Supply Chain", need: "None material — ECU scope shared with ECA", current: 7, target: 7, priority: "Low" },
      { cat: "G2M", need: "Sell inside SdV platform deals, not standalone", current: 6, target: 8, priority: "Medium" },
      { cat: "Talent", need: "Vehicle-dynamics engineers (existing VMM teams)", current: 8, target: 8, priority: "Low" },
      { cat: "Organization", need: "Ride-control as a VMM feature line, not a business unit", current: 7, target: 8, priority: "Low" },
      { cat: "Leadership", need: "Discipline to stay software-only despite hardware temptation", current: 7, target: 9, priority: "Medium" },
      { cat: "Collaboration", need: "Damper-Tier-1 licensing relationships (coopetition)", current: 4, target: 7, priority: "High" },
    ],
    competencyRemark: "Bosch already owns the hard part (VMM control IP). Success needs only two things: damper-Tier-1 licensing deals and the discipline to keep this a software feature line — never a hardware bet.",
    competitorDynamics: { count: "3–4 global damper specialists (ZF, Tenneco/Monroe, BWI, Marelli); no Indian challenger", concentration: "High — an oligopoly defending corner-module bundles", winWhere: "OEM-side architecture wins: when chassis control moves to central compute, the software sourcing decouples from dampers", positioning: "The motion-software integrator above the hardware fight — licensing to incumbents rather than displacing them" },
    competitorAssessment: { strengths: "Damper incumbents: hydraulic/mechatronic IP, OEM chassis-team relationships, complete corner-module offers.", weaknesses: "Thin central-compute software; their control logic assumes their own hardware — weak in multi-vendor architectures.", opportunities: "Zonal migration decouples control from corners — Bosch wins at the architecture table where incumbents don't sit.", threats: "Incumbents bundling control software free with dampers to lock scope before architectures shift." },
    supplierAnalysis: {
      tech: "Vehicle-dynamics toolchains in-house; simulation platforms multi-source.",
      components: "Not applicable in software scope; ECU sourcing shared with ECA field.",
      manufacturers: "None needed.",
      localization: "Not applicable — the asset to localise is India road-profile data, already collectable via existing fleets.",
      recommendation: "Invest in the India ride-tuning dataset (roads, duty cycles) — it is the only supply-side asset that differentiates the software.",
    },
    techGrowth: {
      proven: "Semi-active damping proven for decades; preview control proven in premium; the innovation is software-defined, sensor-fused ride control — validated, not yet volume-deployed in India.",
      maturity: [{ k: "TRL", v: "8 preview damping; 6 motion-sickness mitigation" }, { k: "Commercial maturity", v: "Innovation stage in India — premium-only" }, { k: "Standardization", v: "ISO 26262 governs; no interface standards issues" }, { k: "Scalability", v: "Software scales freely; hardware penetration is the limiter" }],
      adoption: "OEM adoption slow (cost deletion risk); buyer pull exists in premium SUVs for comfort stories. Watch the ₹25L+ segment mix.",
      innovation: [{ k: "R&D investment", v: "Moderate, concentrated in global chassis players" }, { k: "Patent activity", v: "Preview-control patents growing; Bosch VMM position strong" }, { k: "Startup ecosystem", v: "Nearly none — capital intensity deters" }, { k: "Academic research", v: "Active in motion-sickness modelling — relevant to H2" }],
      evolution: "Now: premium semi-active. Next: preview comfort on ADAS sensors, heavy-EV body control. 5+ yrs: chassis features as OTA subscriptions.",
      ecosystem: "Damper supply mature; central-compute ecosystem arriving via ECA field; India tuning ecosystem thin — build it.",
      risks: ["Premium trickle-down stalls, keeping the niche sub-scale", "Corner-module bundling locks software scope", "Feature-deletion culture caps attach rates"],
    },
    research: { note: "Motion-sickness and preview-control research is active academically; Indian industry deployment is near zero — the widest research-industry gap in the portfolio.", gap: "The gap signals patience, not absence: monitor premium-SUV penetration as the leading indicator." },
    activityMeta: [
      { sf: "+", bosch: "+", impact: "Preview suspension tuned for Indian roads validates the software thesis." },
      { sf: "+", bosch: "-", impact: "Damper Tier-1 localising cost strengthens the incumbent bundle." },
      { sf: "+", bosch: "+", impact: "Heavy-EV body-control pain creates the funded problem Bosch solves." },
      { sf: "+", bosch: "+", impact: "Chassis functions moving to central compute reopens software sourcing." },
    ],
    activityTrend: [{ p: "2011–15", n: 2 }, { p: "2016–20", n: 4 }, { p: "2021–25", n: 9 }, { p: "2026 YTD", n: 3 }],
  },

  connectivity: {
    market: {
      scurve: "Early Majority",
      bizModel: "SaaS (compliance products, vehicle cloud) + PaaS (data platforms) + managed services (vehicle SOC) + HW sales (TCUs)",
      revenue: [
        { k: "Hardware", v: "~30%", note: "TCUs, connectivity modules — device-to-cloud completeness" },
        { k: "Software", v: "~35%, rising", note: "CSMS/SUMS products, secure OTA, platform licences" },
        { k: "Services", v: "~25%", note: "Managed SOC, compliance audits, integration — recurring" },
        { k: "Data monetization", v: "~10%, growing", note: "Verified data feeds to insurers & ecosystem — pure margin" },
      ],
    },
    porterDetail: {
      "New entrants": [{ k: "Regulatory hurdles", v: "AIS-189 certification raises the wall every year — favours certified incumbents" }, { k: "Capital intensity", v: "Low for point SW — hence the startup wave; high for device-to-cloud" }, { k: "Access to customers", v: "OEM programme access is the practical gate" }],
      "Buyer power": [{ k: "Switching cost", v: "Very high post-install — vehicle platforms live 7+ years" }, { k: "Buyer concentration", v: "Moderate; compliance deadlines soften negotiation leverage" }, { k: "Price sensitivity", v: "Low for mandated compliance, high for optional services" }],
      "Supplier power": [{ k: "Supplier concentration", v: "Hyperscaler pricing power real; multi-cloud tempers it" }, { k: "Threat of forward integration", v: "Hyperscalers building automotive verticals — the key watch item" }],
      "Substitutes": [{ k: "Availability", v: "Compliance can't be substituted; phone-based telematics only at the low end" }, { k: "Propensity", v: "Low — regulation and stickiness anchor demand" }],
      "Rivalry": [{ k: "Number & balance", v: "Hyperscalers, IT majors, telematics specialists — layered, not head-on everywhere" }, { k: "Basis of competition", v: "Product IP + accountability vs T&M price — pick the product ground" }, { k: "Industry growth", v: "22% CAGR keeps rivalry expansionary, not zero-sum" }],
    },
    competencyAssessment: [
      { cat: "R&D Infra", need: "Security labs, SOC infrastructure, cloud engineering", current: 8, target: 9, priority: "Medium" },
      { cat: "IP", need: "CSMS toolchains, secure OTA, data-platform IP", current: 8, target: 9, priority: "Medium" },
      { cat: "Manufacturing", need: "TCU/module lines (existing)", current: 8, target: 8, priority: "Low" },
      { cat: "Supply Chain", need: "Multi-cloud + telco eSIM partnerships", current: 7, target: 8, priority: "Low" },
      { cat: "G2M", need: "Compliance-first selling motion + fleet SaaS channel", current: 6, target: 9, priority: "High" },
      { cat: "Talent", need: "Security engineers + DPI-fluent architects", current: 7, target: 9, priority: "High" },
      { cat: "Organization", need: "24×7 SOC operations capability", current: 5, target: 9, priority: "High" },
      { cat: "Leadership", need: "Recurring-revenue business model commitment", current: 7, target: 8, priority: "Medium" },
      { cat: "Collaboration", need: "Hyperscalers, NPCI/DPI ecosystem, CERT-In engagement", current: 6, target: 9, priority: "High" },
    ],
    competencyRemark: "The regulation wave is Bosch's to lose. Build the 24×7 SOC operation, hire DPI-fluent architects, and sell compliance-first — the install base then carries the data-platform business for a decade.",
    competitorDynamics: { count: "Hyperscaler verticals (AWS/Azure), IT majors (TCS, Infosys, Tech Mahindra), telematics specialists, security startups", concentration: "Layer-specific — no player owns device-to-cloud end to end", winWhere: "Certified compliance (CSMS/SUMS), managed vehicle SOC, and device-to-cloud integrated deals", positioning: "The certified automotive-security incumbent — deeper in the vehicle than hyperscalers, more product-led than IT majors" },
    competitorAssessment: { strengths: "Hyperscalers: infinite infrastructure and enterprise sales reach. IT majors: OEM account depth and price flexibility.", weaknesses: "Hyperscalers: no in-vehicle presence, weak automotive-safety culture. IT majors: no product IP; customers complain about outcome accountability.", opportunities: "Managed SOC for the 6-hour CERT-In clock; DPDP-native cloud; federated mobility-data leadership.", threats: "Hyperscaler automotive verticals absorbing the middleware layer; IT majors buying security startups to close their IP gap." },
    supplierAnalysis: {
      tech: "Cloud infra: AWS/Azure/GCP — multi-cloud strategy holds pricing power in check. eSIM/carriage: Jio/Airtel — dual-source. Security tooling: broad market.",
      components: "TCU silicon (Qualcomm, Quectel-class modules) — moderate concentration, manageable.",
      manufacturers: "Module assembly local at existing plants.",
      localization: "Data residency (DPDP) forces India-hosted infrastructure — already available from all hyperscalers; localisation is an architecture choice, not a constraint.",
      recommendation: "Stay above the infrastructure line: multi-cloud always, India-resident by default, own the domain logic and the SOC — never compete on compute pricing.",
    },
    techGrowth: {
      proven: "Connected-vehicle platforms and vehicle cybersecurity are proven at global scale; India-specific pieces (DPDP-native consent, federated data) are being built now.",
      maturity: [{ k: "TRL", v: "9 platforms; 7 federated-data architectures" }, { k: "Commercial maturity", v: "Growth — regulation guarantees the floor" }, { k: "Standardization", v: "UNECE R155/156 → AIS-189/190; Beckn-style protocols emerging" }, { k: "Scalability", v: "Cloud-native — scales by design" }],
      adoption: "OEM adoption is mandated (compliance) and market-led (connected features now default). Consumer subscription attach still churn-prone.",
      innovation: [{ k: "R&D investment", v: "Very high across hyperscalers, Tier-1s, security vendors" }, { k: "Patent activity", v: "Dense in V2X security and OTA; India DPI extensions novel" }, { k: "Startup ecosystem", v: "Active security & telematics startup wave" }, { k: "Academic research", v: "Strong Indian crypto/security groups; DPI research unique globally" }],
      evolution: "Now: compliance + connected services. Next: federated data exchanges, SDV data platforms. 5+ yrs: quantum-safe vehicle security migration.",
      ecosystem: "Cloud and telco ecosystems mature; DPI ecosystem uniquely strong in India; automotive-security talent pool growing; standards bodies active.",
      risks: ["Hyperscaler forward-integration compressing middleware", "Regulatory timeline slippage delaying the compliance spike", "Quantum threat requiring early PQC investment", "Talent war for security engineers"],
    },
    research: { note: "Post-quantum vehicle security and federated-data research runs well ahead of deployment; India's DPI research is globally unique and under-exploited by automotive.", gap: "Nobody has industrialised DPI-style open networks for vehicle data — the research exists, the product doesn't. First-mover ground." },
    activityMeta: [
      { sf: "+", bosch: "+", impact: "Phased compliance timeline creates the multi-year contract window Bosch targets." },
      { sf: "+", bosch: "+", impact: "Million-vehicle connected fleet proves the recurring-revenue base is real." },
      { sf: "+", bosch: "+", impact: "Mobility-data pilot expansion opens the federated-exchange seat Bosch wants." },
      { sf: "-", bosch: "+", impact: "CERT-In advisory raises industry cost but sells exactly what Bosch offers." },
    ],
    activityTrend: [{ p: "2011–15", n: 4 }, { p: "2016–20", n: 13 }, { p: "2021–25", n: 31 }, { p: "2026 YTD", n: 8 }],
  },

  eca: {
    market: {
      scurve: "Early Adoption",
      bizModel: "HW sales (ECUs, controllers, MEMS) + NRE fees (architecture co-development) + qualification services (ISM silicon)",
      revenue: [
        { k: "Hardware", v: "~75% today", note: "ECUs, zonal controllers, MEMS, power semis — the franchise base" },
        { k: "Software", v: "~12%, rising", note: "Basic software, drivers, architecture tooling" },
        { k: "Services", v: "~10%", note: "Architecture co-development NRE + ISM qualification — strategic" },
        { k: "Data monetization", v: "~3%", note: "Vehicle-as-Sensor data products with Connectivity field" },
      ],
    },
    porterDetail: {
      "New entrants": [{ k: "Capital intensity", v: "High — automotive qualification cost deters casual entry" }, { k: "Regulatory hurdles", v: "ISO 26262 + AIS-189 at silicon level — walls keep rising" }, { k: "Economies of scale", v: "ECU economics reward scale — Bosch's structural edge" }],
      "Buyer power": [{ k: "Switching cost", v: "Design-in stickiness: multi-year lock once qualified" }, { k: "Threat of backward integration", v: "OEM architecture in-housing is real at the top tier" }, { k: "Volume of purchase", v: "Few platforms carry huge volumes — every zonal win matters" }],
      "Supplier power": [{ k: "Supplier concentration", v: "Foundries + SoC vendors hold genuine allocation power" }, { k: "Uniqueness", v: "Leading-edge nodes are irreplaceable — hence chiplet/ISM hedges" }, { k: "Switching cost for Bosch", v: "High per design — multi-source at architecture level" }],
      "Substitutes": [{ k: "Availability", v: "None — substitution is intra-field (many ECUs → few computers)" }, { k: "Disruptive tech", v: "The zonal shift IS the disruption; Bosch rides it" }],
      "Rivalry": [{ k: "Number & balance", v: "Global Tier-1 set converging on zonal — balanced, disciplined" }, { k: "Basis of competition", v: "Architecture quality + qualification depth, not price — winnable" }, { k: "Exit barrier", v: "High — dedicated fabs/lines keep everyone fighting" }],
    },
    competencyAssessment: [
      { cat: "R&D Infra", need: "Zonal architecture labs + silicon validation in India", current: 8, target: 9, priority: "Medium" },
      { cat: "IP", need: "Vehicle-computer architecture, MEMS, power-semi IP", current: 9, target: 9, priority: "Low" },
      { cat: "Manufacturing", need: "ECU lines (world-class) + OSAT partnerships", current: 9, target: 9, priority: "Low" },
      { cat: "Supply Chain", need: "SoC alliances + ISM qualification pipeline", current: 5, target: 8, priority: "High" },
      { cat: "G2M", need: "Architecture-led selling to OEM E/E teams", current: 7, target: 9, priority: "Medium" },
      { cat: "Talent", need: "Silicon-design team (DLI-backed build or acqui-hire)", current: 4, target: 7, priority: "High" },
      { cat: "Organization", need: "Cross-field silicon coordination (Energy SiC + cockpit SoC)", current: 6, target: 8, priority: "Medium" },
      { cat: "Leadership", need: "Long-cycle commitment to the ISM qualification role", current: 6, target: 8, priority: "Medium" },
      { cat: "Collaboration", need: "Foundries, OSATs, chiplet alliances, DIR-V programme", current: 5, target: 8, priority: "High" },
    ],
    competencyRemark: "Bosch's ECU/MEMS franchise is the strongest asset in the portfolio. The two builds that matter: an India silicon-design team (DLI makes it affordable) and the ISM qualification role — claim it before anyone else defines it.",
    competitorDynamics: { count: "Global Tier-1s (Continental, Aptiv, Denso, Visteon) + rising Indian EMS/electronics players + SoC vendors moving up", concentration: "Moderate — the zonal transition is re-shuffling established positions", winWhere: "Zonal controllers and vehicle computers on India-built platforms; ISM qualification white space; merchant MEMS/power-semi defence", positioning: "The architecture leader with manufacturing scale — the only player spanning silicon partnerships to vehicle computers in India" },
    competitorAssessment: { strengths: "Global Tier-1s: equivalent qualification pedigree and global OEM ties. SoC vendors: silicon ownership and software ecosystems.", weaknesses: "Most rivals lack Indian manufacturing depth; SoC vendors lack vehicle-integration accountability — OEMs complain about integration support.", opportunities: "ISM qualification role (unclaimed), zonal sockets on Indian EV platforms, RISC-V optionality via DIR-V.", threats: "Value migrating into SoCs faster than Bosch moves up-stack; an OEM-captive architecture team cutting Tier-1s to build-to-print." },
    supplierAnalysis: {
      tech: "EDA tools (Synopsys/Cadence — duopoly, manage via alliances), foundry access (TSMC-class — allocation risk).",
      components: "Advanced SoCs: Qualcomm/NVIDIA-class (imported, concentrated). MCUs: Infineon, Renesas, NXP + own capacity. Passives/substrates: broad Asia supply.",
      manufacturers: "Own ECU plants world-class; ISM fabs/OSATs (Dholera, Sanand, Assam) ramping — the localisation frontier.",
      localization: "The strategic case of the decade: ISM silicon cuts import exposure and currency risk, and Bosch can be the player that makes Indian silicon automotive-grade. Start with OSAT-packaged mature nodes.",
      recommendation: "Anchor the ISM qualification role now; hold dual sourcing on advanced nodes; build the chiplet/ASIC alliance as the differentiation route that doesn't need a fab.",
    },
    techGrowth: {
      proven: "ECU/MEMS tech fully proven; zonal architectures proven globally and arriving in India-built platforms now; chiplets/RISC-V still maturing.",
      maturity: [{ k: "TRL", v: "9 ECUs/zonal; 6–7 chiplets; 5 automotive RISC-V" }, { k: "Commercial maturity", v: "Growth — the architecture transition is the demand engine" }, { k: "Standardization", v: "AUTOSAR stable; UCIe (chiplets) forming; DIR-V nascent" }, { k: "Scalability", v: "Proven at Bosch scale" }],
      adoption: "OEMs adopt zonal on cost and wiring-harness savings — acceleration is structural, not sentiment-driven.",
      innovation: [{ k: "R&D investment", v: "Massive — SoC vendors, Tier-1s, ISM programme" }, { k: "Patent activity", v: "Dense in compute architectures; Indian filings rising with ISM" }, { k: "Startup ecosystem", v: "Growing Indian fabless/chiplet startups under DLI" }, { k: "Academic research", v: "Shakti/Vega RISC-V cores from IIT-M — sovereign-compute research live" }],
      evolution: "Now: domain ECUs → zonal. Next: vehicle computers, ISM automotive silicon. 5+ yrs: chiplet-composed custom compute, quantum sensing.",
      ecosystem: "Component ecosystem deep; Indian silicon ecosystem forming fast under ISM; talent abundant in vendor GCCs; standards active.",
      risks: ["SoC-layer value capture outpacing Tier-1 adaptation", "ISM timeline slippage deferring localisation", "EDA/foundry geopolitical exposure", "Zonal transition compressing legacy ECU revenue faster than replacement wins land"],
    },
    research: { note: "RISC-V (DIR-V/Shakti) and chiplet research in India is ahead of any automotive deployment — a sovereignty-driven pipeline forming outside classic Tier-1 channels.", gap: "Automotive-grade qualification is the missing bridge between ISM research output and vehicle programmes — exactly the role Bosch should claim." },
    activityMeta: [
      { sf: "+", bosch: "+", impact: "ISM fab milestone brings the qualification white space closer to real." },
      { sf: "+", bosch: "+", impact: "Zonal confirmation on Indian EV platforms opens the sockets Bosch bids for." },
      { sf: "+", bosch: "+", impact: "Automotive RISC-V kits make the DIR-V optionality testable at low cost." },
      { sf: "+", bosch: "-", impact: "Rival's central-computer win shows the zonal race is contested — move faster." },
    ],
    activityTrend: [{ p: "2011–15", n: 5 }, { p: "2016–20", n: 12 }, { p: "2021–25", n: 26 }, { p: "2026 YTD", n: 7 }],
  },

  software: {
    market: {
      scurve: "Early Majority",
      bizModel: "SW licences (middleware, ETAS tools) + SaaS (GenAI engineering, validation cloud) + platform co-development fees + royalties per vehicle",
      revenue: [
        { k: "Hardware", v: "~0%", note: "Pure software field by definition" },
        { k: "Software", v: "~55%", note: "Middleware licences, ETAS tools, per-vehicle royalties" },
        { k: "Services", v: "~35%", note: "Integration, co-development, validation — India-scale delivery" },
        { k: "Data monetization", v: "~10%, growing", note: "GenAI engineering products monetising the domain corpus" },
      ],
    },
    porterDetail: {
      "New entrants": [{ k: "Capital intensity", v: "Low — the startup wave is real; references are the practical wall" }, { k: "IP barrier", v: "Certified toolchains (ETAS-class) take a decade to build trust" }, { k: "Access to talent", v: "India talent abundant — no one's barrier, everyone's battle" }],
      "Buyer power": [{ k: "Switching cost", v: "High for production middleware/tools; low for T&M services" }, { k: "Price sensitivity", v: "Brutal on rates, tolerant on product value — sell products" }, { k: "Threat of backward integration", v: "OEM captives absorb scope — sell tools INTO them" }],
      "Supplier power": [{ k: "Supplier concentration", v: "Inputs are talent and compute — both competitive markets" }],
      "Substitutes": [{ k: "Availability", v: "Open source substitutes paid middleware partially" }, { k: "Price-performance", v: "Certified toolchains and accountability can't be substituted" }],
      "Rivalry": [{ k: "Number & balance", v: "IT majors, tool vendors, captives, startups — most diverse rivalry in the portfolio" }, { k: "Basis of competition", v: "Price in services (avoid); product depth + certification (win)" }, { k: "Industry growth", v: "24% CAGR — expansionary; land-grab phase for lighthouse deals" }],
    },
    competencyAssessment: [
      { cat: "R&D Infra", need: "SDV platform labs, validation clouds, GenAI infrastructure", current: 8, target: 9, priority: "Medium" },
      { cat: "IP", need: "Middleware, ETAS toolchain, GenAI engineering products", current: 9, target: 9, priority: "Low" },
      { cat: "Manufacturing", need: "Not applicable", current: 0, target: 0, priority: "Low" },
      { cat: "Supply Chain", need: "Cloud + frontier-model partnerships", current: 7, target: 8, priority: "Low" },
      { cat: "G2M", need: "CDO-persona selling + developer-ecosystem GTM (DevRel)", current: 5, target: 9, priority: "High" },
      { cat: "Talent", need: "Retain SDV talent against captive/GCC poaching", current: 7, target: 9, priority: "High" },
      { cat: "Organization", need: "Product-line P&Ls separate from services delivery", current: 6, target: 8, priority: "Medium" },
      { cat: "Leadership", need: "Software-company positioning at executive level", current: 6, target: 9, priority: "High" },
      { cat: "Collaboration", need: "Eclipse SDV leadership + OEM co-development structures", current: 7, target: 9, priority: "Medium" },
    ],
    competencyRemark: "Bosch has the portfolio's best product IP and its largest delivery force. What's missing is software-company GTM: DevRel, CDO-level selling, and product P&L discipline. Fix the selling motion and the lighthouse deals follow.",
    competitorDynamics: { count: "KPIT, Tata Elxsi, LTTS (services); Vector, Elektrobit (tools); OEM captives; global SW startups", concentration: "Fragmented across product/services split — no full-stack leader in India", winWhere: "Certified tools + middleware products, GenAI engineering, and lighthouse SDV platforms for mid-size OEMs", positioning: "The product-IP house with India delivery scale — neither pure-product nor pure-services rivals can match the combination" },
    competitorAssessment: { strengths: "IT majors: OEM account depth, rate flexibility, huge delivery scale. Tool vendors: focused product excellence.", weaknesses: "IT majors: no product IP — customers complain about accountability and rework. Tool vendors: no India delivery scale or domain services.", opportunities: "Certified GenAI toolchain (unclaimed), full SDV stacks for mid-size OEMs, selling tools into captives.", threats: "IT majors dragging flagship deals into T&M price wars; captives absorbing platform scope faster than product sales replace it." },
    supplierAnalysis: {
      tech: "Cloud (multi-source), frontier AI models (OpenAI/Anthropic/Google-class — partner, don't build), open-source foundations (Eclipse SDV — Bosch co-leads).",
      components: "Not applicable.",
      manufacturers: "Not applicable.",
      localization: "Already the most localised field — India IS the delivery hub. The localisation task is IP creation in India, not delivery.",
      recommendation: "Treat frontier-model access as a strategic supply line (multi-model architecture); keep shaping Eclipse SDV so the open-source layer commoditises rivals' ground, not Bosch's.",
    },
    techGrowth: {
      proven: "Middleware and toolchains proven in production for years; GenAI-assisted engineering proven internally, productisation in progress industry-wide.",
      maturity: [{ k: "TRL", v: "9 middleware/tools; 6–7 GenAI engineering products; 5 in-vehicle agentic/WASM" }, { k: "Commercial maturity", v: "Growth with counter-cyclical demand" }, { k: "Standardization", v: "AUTOSAR mature; Eclipse SDV consolidating; AI-toolchain certification unwritten" }, { k: "Scalability", v: "Software-native" }],
      adoption: "Every OEM funds SDV — adoption is structural. GenAI tooling adoption accelerating fastest of any technology in the field.",
      innovation: [{ k: "R&D investment", v: "Highest in the portfolio — OEMs, Tier-1s, big tech, startups" }, { k: "Patent activity", v: "Very dense; AI-for-engineering filings exploding" }, { k: "Startup ecosystem", v: "Very active — SDV tooling and AI-dev startups" }, { k: "Academic research", v: "Strong Indian CS research; formal-verification groups relevant to certification" }],
      evolution: "Now: middleware consolidation + AI-assisted engineering. Next: certified AI toolchains, lighthouse SDV platforms. 5+ yrs: agentic vehicle software, WASM app ecosystems.",
      ecosystem: "Deepest ecosystem of any field: open-source foundations, huge developer community, GCC network, cloud partners — all present in India.",
      risks: ["Open-source commoditisation outpacing tool monetisation", "AI-model dependency churn", "Certification frameworks for AI-generated code undefined", "Talent attrition economics"],
    },
    research: { note: "AI-for-software-engineering research is moving faster than automotive certification can absorb — a certified GenAI toolchain would bridge the widest, most valuable research-industry gap in the portfolio.", gap: "Academic formal-verification work + industry GenAI tooling haven't met yet; whoever certifies AI-assisted development for ISO 26262 first owns a category." },
    activityMeta: [
      { sf: "+", bosch: "+", impact: "External SDV partner shortlists confirm mid-size OEMs will buy platforms, not build." },
      { sf: "+", bosch: "+", impact: "India-led Eclipse SDV components strengthen the open-core position Bosch shapes." },
      { sf: "+", bosch: "-", impact: "Record IT-major order book with price pressure warns against T&M ground." },
      { sf: "+", bosch: "+", impact: "Captive GenAI validation lab proves captives buy tools — sell into them." },
    ],
    activityTrend: [{ p: "2011–15", n: 6 }, { p: "2016–20", n: 15 }, { p: "2021–25", n: 38 }, { p: "2026 YTD", n: 11 }],
  },

  manufacturing: {
    market: {
      scurve: "Early Majority",
      bizModel: "MaaS (contract-manufacturing fees per unit) + solutions sales (I4.0/I5.0 packages) + consulting day-rates",
      revenue: [
        { k: "Hardware", v: "~70% (build fees)", note: "Contract-manufacturing revenue — volume-driven, thin per unit" },
        { k: "Software", v: "~15%, rising", note: "Digitalisation solution licences — the margin engine" },
        { k: "Services", v: "~15%", note: "I5.0 consulting, line audits, skilling programmes" },
        { k: "Data monetization", v: "~0%", note: "Factory analytics stay customer-owned — trust is the product" },
      ],
    },
    porterDetail: {
      "New entrants": [{ k: "Capital intensity", v: "High for capacity — but PLI subsidises serious entrants continuously" }, { k: "Regulatory hurdles", v: "IATF-class certification gates safety-part builds — the niche's wall" }, { k: "Economies of scale", v: "EMS champions win commodity scale; Bosch wins certified high-mix" }],
      "Buyer power": [{ k: "Buyer concentration", v: "Professional procurement, multi-source by design — structurally strong buyers" }, { k: "Price sensitivity", v: "Extreme in commodity; moderate where certification prices in" }, { k: "Switching cost", v: "12–18 month qualification makes wins sticky" }],
      "Supplier power": [{ k: "Supplier concentration", v: "Component supply improving locally under PLI — moderate" }],
      "Substitutes": [{ k: "Availability", v: "In-housing is the substitute; China+1 currently pushes the other way" }],
      "Rivalry": [{ k: "Number & balance", v: "Dixon, Kaynes, Syrma, Tata Electronics scaling aggressively — intense in commodity" }, { k: "Basis of competition", v: "Price in commodity (avoid); certification + trust in the niche (win)" }, { k: "Exit barrier", v: "High — PLI-funded capacity keeps everyone in the fight" }],
    },
    competencyAssessment: [
      { cat: "R&D Infra", need: "Process-engineering + digitalisation development labs", current: 8, target: 8, priority: "Low" },
      { cat: "IP", need: "I4.0/I5.0 methods, digital-twin factory IP", current: 8, target: 9, priority: "Medium" },
      { cat: "Manufacturing", need: "Certified capacity + high-mix flexibility retrofits", current: 8, target: 9, priority: "Medium" },
      { cat: "Supply Chain", need: "Component sourcing for external builds", current: 7, target: 8, priority: "Low" },
      { cat: "G2M", need: "Dedicated MaaS commercial unit (doesn't exist yet)", current: 2, target: 8, priority: "High" },
      { cat: "Talent", need: "EMS-experienced commercial leads + program managers", current: 4, target: 8, priority: "High" },
      { cat: "Organization", need: "MaaS unit separate from plant organisations", current: 3, target: 8, priority: "High" },
      { cat: "Leadership", need: "Scope discipline enforcement (no commodity EMS)", current: 7, target: 9, priority: "Medium" },
      { cat: "Collaboration", need: "China+1 customer relationships + corridor authorities", current: 5, target: 8, priority: "Medium" },
    ],
    competencyRemark: "The plants and the practice already exist — what's missing is entirely commercial: a dedicated MaaS unit, EMS-experienced sales leadership, and the discipline to walk away from commodity bids. This is an organisation problem, not a capability problem.",
    competitorDynamics: { count: "EMS champions (Dixon, Kaynes, Syrma, Amber) + Tata Electronics + global EMS (Foxconn, Jabil) entering India", concentration: "Consolidating fast — top players adding capacity aggressively", winWhere: "Automotive-grade, high-reliability, high-mix builds where IATF certification and Bosch quality brand price in", positioning: "The certified-quality tier above commodity EMS — for customers whose parts cannot fail" },
    competitorAssessment: { strengths: "EMS champions: unbeatable cost structures, PLI capture, massive capacity ramps.", weaknesses: "Thin automotive-safety certification depth; customers report quality escapes on complex builds — the gap Bosch's brand fills.", opportunities: "China+1 customers needing certified capacity now; digitalisation solutions the EMS players themselves buy.", threats: "EMS champions acquiring automotive-grade certification over 3–5 years, eroding the niche premium." },
    supplierAnalysis: {
      tech: "Factory-digitalisation stack largely in-house (the product itself); MES/cloud partners multi-source.",
      components: "Customer-specified BOMs; PCB/passives supply improving locally under component PLI.",
      manufacturers: "Bosch IS the manufacturer here — the supply question inverts to capacity utilisation.",
      localization: "Component localisation improves build margins and wins localisation-clause contracts — track component-PLI beneficiaries as preferred sources.",
      recommendation: "Sell certified capacity + digitalisation as one bundle; source components from PLI-backed local suppliers to compound the Make-in-India story.",
    },
    techGrowth: {
      proven: "I4.0 practice proven in Bosch's own plants (reference-grade); I5.0 human-machine collaboration emerging; dark factories not viable in India economics yet.",
      maturity: [{ k: "TRL", v: "9 I4.0; 6–7 I5.0; 4–5 dark factory (India)" }, { k: "Commercial maturity", v: "Growth — digitalisation demand is mainstream" }, { k: "Standardization", v: "OPC-UA/Industry-4.0 standards mature" }, { k: "Scalability", v: "Solutions replicate across factories well" }],
      adoption: "Indian factories buying digitalisation at record capex intent; MaaS adoption driven by China+1 urgency.",
      innovation: [{ k: "R&D investment", v: "High in automation majors; moderate in India" }, { k: "Patent activity", v: "Dense in robotics/automation; Bosch factory IP strong" }, { k: "Startup ecosystem", v: "Active Indian factory-SaaS startups" }, { k: "Academic research", v: "IIT manufacturing-science programmes growing" }],
      evolution: "Now: I4.0 rollouts + MaaS. Next: I5.0 collaboration suites, AI quality control. 5+ yrs: selective lights-out cells in hazardous processes.",
      ecosystem: "Automation-vendor ecosystem mature; skilling ecosystem state-funded; corridor infrastructure improving.",
      risks: ["Margin dilution if scope discipline slips", "EMS champions moving up-market", "Utilisation risk if powertrain volumes hold longer than planned"],
    },
    research: { note: "I5.0 research (human-robot collaboration, cognitive ergonomics) is ahead of Indian factory practice by ~3 years — the consulting opportunity is translating it.", gap: "Research-industry gap is Bosch's product: the digitalisation solutions business monetises exactly this translation." },
    activityMeta: [
      { sf: "+", bosch: "-", impact: "EMS major's automotive-grade facility attacks the certified niche directly." },
      { sf: "+", bosch: "+", impact: "Precision-electronics PLI window funds the components Bosch builds with." },
      { sf: "+", bosch: "-", impact: "Global Tier-1 volumes going to a rival contract manufacturer — move faster on anchor deals." },
      { sf: "+", bosch: "+", impact: "Record digitalisation capex intent confirms the solutions market." },
    ],
    activityTrend: [{ p: "2011–15", n: 3 }, { p: "2016–20", n: 8 }, { p: "2021–25", n: 22 }, { p: "2026 YTD", n: 6 }],
  },

  fintech: {
    market: {
      scurve: "Early Adoption",
      bizModel: "Enablement licence (payment/identity stack per vehicle) + DaaS (verified data feeds) + per-transaction infrastructure fees via partners",
      revenue: [
        { k: "Hardware", v: "~25%", note: "Secure elements, HSMs — bundled into cockpit hardware" },
        { k: "Software", v: "~35%", note: "Payment/identity stacks, consent architecture — per-vehicle licence" },
        { k: "Services", v: "~15%", note: "Integration with banks/NPCI ecosystem partners" },
        { k: "Data monetization", v: "~25%, the prize", note: "Verified vehicle/battery data to insurers & lenders — recurring, licence-free" },
      ],
    },
    porterDetail: {
      "New entrants": [{ k: "Regulatory hurdles", v: "RBI/IRDAI perimeter blocks unlicensed entry into regulated pools" }, { k: "IP barrier", v: "Automotive-grade secure-element integration is scarce craft" }, { k: "Access to customers", v: "OEM platform access — Bosch has it, fintechs don't" }],
      "Buyer power": [{ k: "Buyer concentration", v: "Two-sided: OEMs and financial institutions both negotiate hard" }, { k: "Switching cost", v: "High once payment/identity is in the platform — socket economics" }],
      "Supplier power": [{ k: "Supplier concentration", v: "NPCI rails are public infrastructure — no private supplier power" }],
      "Substitutes": [{ k: "Availability", v: "The smartphone + QR is the ever-present substitute" }, { k: "Price-performance", v: "Phone is free and good enough — in-vehicle must beat it on convenience decisively" }, { k: "Propensity", v: "High — users default to the phone unless the car is clearly better" }],
      "Rivalry": [{ k: "Number & balance", v: "Fintech giants adjacent but not automotive-grade; niche currently under-occupied" }, { k: "Industry growth", v: "26% CAGR — land-grab phase, first credible implementation wins" }, { k: "Diversity", v: "Fintechs, OEM captives, NPCI itself — watch standardisation moves" }],
    },
    competencyAssessment: [
      { cat: "R&D Infra", need: "Payment-security labs + NPCI sandbox participation", current: 6, target: 8, priority: "High" },
      { cat: "IP", need: "Vehicle secure elements, consent architecture, identity stack", current: 7, target: 9, priority: "High" },
      { cat: "Manufacturing", need: "Secure-element integration in existing ECU lines", current: 8, target: 8, priority: "Low" },
      { cat: "Supply Chain", need: "HSM/SE silicon (standard sourcing)", current: 7, target: 7, priority: "Low" },
      { cat: "G2M", need: "Fintech-ecosystem BD presence (NPCI circles)", current: 2, target: 7, priority: "High" },
      { cat: "Talent", need: "Payment-systems engineers + compliance-fluent architects", current: 4, target: 7, priority: "High" },
      { cat: "Organization", need: "Partnership-structuring capability (regulated-partner deals)", current: 4, target: 8, priority: "High" },
      { cat: "Leadership", need: "Clarity on enable-never-bank boundary", current: 8, target: 9, priority: "Low" },
      { cat: "Collaboration", need: "Banks, insurers, NPCI ecosystem, OEM finance arms", current: 4, target: 9, priority: "High" },
    ],
    competencyRemark: "The vehicle-side tech is largely in hand; the field is won or lost on ecosystem craft — NPCI-circle presence, partnership structuring, and the first credible in-vehicle UPI reference. Hire the BD team before building more product.",
    competitorDynamics: { count: "Fintech giants (PhonePe, Paytm, Google Pay) adjacent; OEM finance arms; telematics-UBI startups; no automotive-grade incumbent", concentration: "The niche itself is empty — the adjacent payment market is a three-player oligopoly", winWhere: "The vehicle-side trust layer: secure elements, identity, verified data — where fintechs can't reach and OEMs won't build alone", positioning: "The invisible infrastructure partner — every payment app works in the car through Bosch's layer, none is locked in" },
    competitorAssessment: { strengths: "Fintech giants: network effects, consumer trust, engineering speed.", weaknesses: "No automotive-grade integration capability; no OEM platform access; user complaints about in-car payment UX today (QR workarounds).", opportunities: "First automotive-grade UPI implementation; battery-data underwriting feeds nobody else can generate.", threats: "NPCI standardising a generic in-vehicle flow that commoditises the enablement premium; an OEM captive building its own walled-garden wallet." },
    supplierAnalysis: {
      tech: "NPCI rails (public), banking APIs (partner-provided), cloud (multi-source). Key dependency is regulatory, not commercial.",
      components: "Secure elements/HSM silicon: NXP, Infineon, ST — standard automotive sourcing, no chokepoint.",
      manufacturers: "Existing ECU lines carry the hardware.",
      localization: "Inherently localised — the rails, the regulator and the use cases are all Indian. Export potential follows DPI adoption abroad.",
      recommendation: "Treat NPCI ecosystem standing as the strategic supply line: sandbox participation, certification early, co-author the automotive payment standard rather than adopt it.",
    },
    techGrowth: {
      proven: "UPI is the world's most proven real-time payment rail; vehicle secure elements are proven; the combination (automotive-grade in-vehicle UPI) is validated in pilots only.",
      maturity: [{ k: "TRL", v: "9 rails; 8 secure elements; 6 integrated in-vehicle payment" }, { k: "Commercial maturity", v: "Emerging — pre-standard, pre-volume" }, { k: "Standardization", v: "NPCI certification pathway forming — the critical watch item" }, { k: "Scalability", v: "Rails proven at 23B txns/month — scale is not the question" }],
      adoption: "User behaviour is pre-trained (UPI-default); OEM adoption waits for a reference implementation; insurer adoption of data feeds accelerating via sandbox.",
      innovation: [{ k: "R&D investment", v: "Massive in fintech; thin in automotive-fintech intersection" }, { k: "Patent activity", v: "Sparse in vehicle-payment — open IP ground" }, { k: "Startup ecosystem", v: "Huge fintech base; few automotive-focused" }, { k: "Academic research", v: "Strong DPI/payments research (IIT/ISB policy groups)" }],
      evolution: "Now: data feeds + pilots. Next: in-vehicle UPI reference, vehicle identity standard. 5+ yrs: in-car commerce & monetisation platforms.",
      ecosystem: "Payment ecosystem world-class; automotive intersection nascent; insurer sandbox ecosystem active; standards forming now — the moment to engage.",
      risks: ["NPCI standardisation collapsing the premium", "Smartphone convenience ceiling", "Dual-regulator (RBI+DPDP) compliance complexity", "Partnership margin squeeze"],
    },
    research: { note: "DPI research and payment-systems innovation run far ahead of automotive adoption — the vehicle is the last major Indian payment surface without a native UPI implementation.", gap: "The gap is executional, not scientific: certification pathway + one OEM launch closes it." },
    activityMeta: [
      { sf: "+", bosch: "+", impact: "NPCI certification pathway discussion — engage now to shape the standard." },
      { sf: "+", bosch: "+", impact: "UBI sandbox pilot proves insurers will pay for telematics data feeds." },
      { sf: "+", bosch: "+", impact: "Charging auto-pay integration is the first real in-vehicle payment use case at volume." },
      { sf: "+", bosch: "+", impact: "VAHAN identity consultation opens the Vehicle-Aadhar co-authoring seat." },
    ],
    activityTrend: [{ p: "2011–15", n: 1 }, { p: "2016–20", n: 6 }, { p: "2021–25", n: 17 }, { p: "2026 YTD", n: 5 }],
  },

  infrastructure: {
    market: {
      scurve: "Early Adoption",
      bizModel: "B2G system contracts (via consortia) + OBU hardware sales + SaaS (tolling backend, traffic analytics) + DaaS (charging-map feeds)",
      revenue: [
        { k: "Hardware", v: "~40%", note: "GNSS OBUs, roadside units, enforcement cameras" },
        { k: "Software", v: "~30%", note: "Tolling backend, traffic management, V2X stacks" },
        { k: "Services", v: "~20%", note: "System operation & maintenance contracts — long-duration" },
        { k: "Data monetization", v: "~10%, fast-cycle", note: "Charging-map & traffic data feeds to OEMs/CPOs" },
      ],
    },
    porterDetail: {
      "New entrants": [{ k: "Capital intensity", v: "High for system delivery; references gate consortium entry" }, { k: "Regulatory hurdles", v: "B2G procurement rules shape everything — L1, localisation, consortium mandates" }, { k: "Access to customers", v: "NHAI/state relationships take years — hence consortium-only" }],
      "Buyer power": [{ k: "Buyer concentration", v: "Government monopsony — the strongest buyer in the portfolio" }, { k: "Price sensitivity", v: "L1 bias makes price the default decider — differentiate on lifecycle terms" }, { k: "Switching cost", v: "High post-award; concession periods run 10+ years" }],
      "Supplier power": [{ k: "Supplier concentration", v: "Components competitive; Bosch internalises several" }],
      "Substitutes": [{ k: "Availability", v: "None for tolling/ITS; the plaza→GNSS swap is generational, not substitutive" }],
      "Rivalry": [{ k: "Number & balance", v: "Global ITS players + Indian primes + telecom-backed entrants — consortium musical chairs" }, { k: "Basis of competition", v: "Consortium composition + technology depth + price — all three must align" }, { k: "Exit barrier", v: "Concession commitments keep players locked in for decades" }],
    },
    competencyAssessment: [
      { cat: "R&D Infra", need: "GNSS tolling test corridors + V2X labs in India", current: 6, target: 8, priority: "High" },
      { cat: "IP", need: "Tolling backend, enforcement analytics, V2X stacks", current: 8, target: 9, priority: "Medium" },
      { cat: "Manufacturing", need: "OBU/RSU hardware lines (existing electronics capacity)", current: 8, target: 8, priority: "Low" },
      { cat: "Supply Chain", need: "GNSS modules + camera systems (standard sourcing)", current: 7, target: 8, priority: "Low" },
      { cat: "G2M", need: "Consortium relationships with Indian primes", current: 3, target: 8, priority: "High" },
      { cat: "Talent", need: "B2G bid-management and concession-economics expertise", current: 3, target: 7, priority: "High" },
      { cat: "Organization", need: "Patient-capital governance for long B2G cycles", current: 5, target: 8, priority: "Medium" },
      { cat: "Leadership", need: "12-month consortium-window commitment", current: 6, target: 9, priority: "High" },
      { cat: "Collaboration", need: "Indian primes, map providers, NHAI working groups", current: 4, target: 9, priority: "High" },
    ],
    competencyRemark: "Technology is Bosch's strong suit; procurement is not. Success = two consortium partnerships signed within 12 months plus B2G bid talent hired. Run the charging-data business in parallel so the P&L doesn't wait for tenders.",
    competitorDynamics: { count: "Global ITS (Kapsch, Q-Free, Conduent) + Indian primes (BEL, L&T) + telecom-backed entrants + FASTag-era incumbents", concentration: "Forming now — MLFF consortia will define the next decade's structure", winWhere: "The MLFF technology layer inside winning consortia, and the commercial charging-data market outside B2G entirely", positioning: "The technology heart of an Indian-prime-led consortium — global reference architecture, local delivery partner" },
    competitorAssessment: { strengths: "Indian primes: procurement relationships and localisation credentials. Global ITS: deployed MLFF references abroad.", weaknesses: "Primes lack GNSS-tolling technology depth; global ITS players lack India delivery scale — both need partners, which is the opening.", opportunities: "Technology-partner slots in 2–3 forming consortia; the charging-data business with no B2G exposure at all.", threats: "Consortium slots filling before Bosch commits; an L1 race so aggressive the technology layer gets no margin." },
    supplierAnalysis: {
      tech: "GNSS correction services (multi-source), map data (partnerships in place), cloud (multi-source).",
      components: "GNSS modules (u-blox, STMicro-class — imported, broad supply), cameras & edge compute (increasingly local).",
      manufacturers: "OBU/RSU assembly local at existing plants — a tender localisation advantage.",
      localization: "Strong case: tender localisation clauses reward local OBU/RSU manufacturing, which Bosch already has. GNSS silicon stays imported — acceptable, broad supply.",
      recommendation: "Lead with locally-manufactured OBU/RSU hardware + global tolling software — the exact combination tenders reward and rivals struggle to assemble.",
    },
    techGrowth: {
      proven: "GNSS tolling proven in Europe (Bosch group references); C-V2X standards settled; India deployment is the remaining step — pilots running.",
      maturity: [{ k: "TRL", v: "8–9 GNSS tolling; 7 C-V2X corridors; 5 intermodal platforms" }, { k: "Commercial maturity", v: "Emerging in India — pilot-to-tender transition" }, { k: "Standardization", v: "C-V2X won; 5.9 GHz cleared; MLFF specs being written now" }, { k: "Scalability", v: "Proven abroad at national scale" }],
      adoption: "Policy-driven adoption — NHAI pilots set the pace; FASTag pre-trained user acceptance. Commercial charging-data adoption market-driven and faster.",
      innovation: [{ k: "R&D investment", v: "High globally in ITS; Indian spending following the pipeline" }, { k: "Patent activity", v: "Dense in tolling/enforcement; V2X security active" }, { k: "Startup ecosystem", v: "Emerging Indian mobility-data startups" }, { k: "Academic research", v: "IIT transportation groups active in traffic modelling" }],
      evolution: "Now: FASTag mature, MLFF pilots. Next: national MLFF rollout, V2X corridors. 5+ yrs: intermodal orchestration platforms.",
      ecosystem: "Component supply fine; consortium ecosystem forming (the constraint); standards nearly settled; public acceptance pre-trained.",
      risks: ["Tender timeline slippage with political cycles", "L1 margin compression", "DPDP compliance for location trails", "Consortium partner risk"],
    },
    research: { note: "GNSS-tolling and V2X research is deployment-ready; the binding constraint is institutional (procurement design), not technical.", gap: "No research gap — an execution gap. The field rewards consortium craft over invention." },
    activityMeta: [
      { sf: "+", bosch: "+", impact: "GNSS pilot expansion moves MLFF from policy to procurement — the window opens." },
      { sf: "+", bosch: "+", impact: "V2X corridor tender is the first monetisable proof of the both-sides thesis." },
      { sf: "+", bosch: "+", impact: "Charger-data partnership validates the fast-cycle commercial line." },
      { sf: "+", bosch: "+", impact: "Smart-city enforcement prioritisation adds funded ITS demand." },
    ],
    activityTrend: [{ p: "2011–15", n: 3 }, { p: "2016–20", n: 10 }, { p: "2021–25", n: 21 }, { p: "2026 YTD", n: 6 }],
  },

  sustainability: {
    market: {
      scurve: "Innovation",
      bizModel: "Compliance SaaS (EPR traceability) + certification fees (SoH reports via workshops) + DaaS (residual-value scores to lenders/insurers)",
      revenue: [
        { k: "Hardware", v: "~10%", note: "Diagnostic equipment for workshops & scrapping facilities" },
        { k: "Software", v: "~35%", note: "Traceability platform, grading tools — compliance SaaS" },
        { k: "Services", v: "~30%", note: "Certified health checks, collection & audits via workshops" },
        { k: "Data monetization", v: "~25%, the endgame", note: "Residual-value & circularity scores — recurring, licence-free" },
      ],
    },
    porterDetail: {
      "New entrants": [{ k: "Capital intensity", v: "Low for data/software entry — the moat is data access, not capital" }, { k: "Access to customers", v: "Obligated producers + Bosch's owned workshop channel — hard to replicate" }],
      "Buyer power": [{ k: "Buyer concentration", v: "EPR-obligated buyers have few compliant options early — favourable" }, { k: "Price sensitivity", v: "Compliance is must-buy; pricing power sits with credible providers" }],
      "Supplier power": [{ k: "Supplier concentration", v: "Feedstock (retiring batteries) grows with the parc — abundant" }],
      "Substitutes": [{ k: "Availability", v: "Manual grading and in-house compliance — don't scale with the retirement wave" }, { k: "Price-performance", v: "Substitutes fail at audit-grade traceability" }],
      "Rivalry": [{ k: "Number & balance", v: "Recyclers (Attero, Lohum), startups, OEM programmes — early, no data-layer leader" }, { k: "Industry growth", v: "30% CAGR — expansionary; positioning race, not share war" }, { k: "Diversity", v: "High — chemistry players vs software players vs OEMs; pick the data lane" }],
    },
    competencyAssessment: [
      { cat: "R&D Infra", need: "Battery grading labs + traceability platform engineering", current: 7, target: 8, priority: "Medium" },
      { cat: "IP", need: "SoH estimation, grading algorithms, passport architecture", current: 7, target: 9, priority: "High" },
      { cat: "Manufacturing", need: "Not applicable — no recycling plants by design", current: 0, target: 0, priority: "Low" },
      { cat: "Supply Chain", need: "Collection logistics via workshop network", current: 8, target: 9, priority: "Medium" },
      { cat: "G2M", need: "Compliance selling to obligated producers", current: 5, target: 8, priority: "High" },
      { cat: "Talent", need: "Battery data scientists + EPR/standards specialists", current: 5, target: 8, priority: "High" },
      { cat: "Organization", need: "Cross-field data plumbing (Energy BMS → this field)", current: 6, target: 9, priority: "High" },
      { cat: "Leadership", need: "Patience discipline — scale on triggers, not hype", current: 7, target: 8, priority: "Low" },
      { cat: "Collaboration", need: "Recyclers, scrapping facilities, insurers, MoEFCC", current: 5, target: 9, priority: "High" },
    ],
    competencyRemark: "Bosch's unfair advantages are the workshop network and the BMS data — both already exist. The build is a traceability platform, standards talent, and recycler partnerships. Scale investment strictly on EPR-enforcement and retirement-volume triggers.",
    competitorDynamics: { count: "Recyclers (Attero, Lohum, Tata Chemicals), battery-intelligence startups, OEM take-back programmes", concentration: "Fragmented and early — the data/certification layer has no incumbent", winWhere: "The trust layer: certified diagnostics, audit-grade traceability, residual-value scoring — everything downstream depends on it", positioning: "The neutral, certified data authority of battery circularity — recyclers process, Bosch certifies" },
    competitorAssessment: { strengths: "Recyclers: process technology, MoEFCC registrations, first-mover EPR relationships.", weaknesses: "No vehicle-side data access; grading based on teardown, not lifecycle history — less accurate, more costly.", opportunities: "Lifecycle-data-based grading beats teardown grading on cost and accuracy; the workshop network is unmatched for collection.", threats: "Recyclers building diagnostics in-house before partnerships form; a battery-intelligence startup locking OEM data access first." },
    supplierAnalysis: {
      tech: "Traceability/blockchain platforms (build standards-agnostic), diagnostics toolchain in-house.",
      components: "Diagnostic hardware from existing Bosch workshop-equipment lines.",
      manufacturers: "Recycling plants deliberately out of scope — recyclers are partners, not suppliers.",
      localization: "Inherently local — collection, certification and compliance are physical and jurisdictional.",
      recommendation: "Own data and certification; partner everything physical (recycling, second-life deployment). Sign 2 recycler alliances before they build their own data layers.",
    },
    techGrowth: {
      proven: "Battery diagnostics proven (BMS-derived); audit-grade traceability platforms proven in other industries; automotive-scale EPR application is new everywhere — India included.",
      maturity: [{ k: "TRL", v: "8 diagnostics; 6 traceability platforms; 5 automated grading" }, { k: "Commercial maturity", v: "Innovation stage — regulation creating the market now" }, { k: "Standardization", v: "EPR rules live, mechanics evolving; EU battery passport sets the template" }, { k: "Scalability", v: "Data layer scales cheaply; collection scales with workshops" }],
      adoption: "Producers adopt under compliance duress (guaranteed); lenders/insurers adopting residual-value data on economics; consumer side not required.",
      innovation: [{ k: "R&D investment", v: "Rising fast — recycling majors + battery-intelligence startups" }, { k: "Patent activity", v: "Growing in grading/SoH; passport architectures forming" }, { k: "Startup ecosystem", v: "Active: battery analytics & recycling-tech startups" }, { k: "Academic research", v: "Strong Indian electrochemistry + circular-economy groups" }],
      evolution: "Now: EPR compliance tooling. Next: second-life grading at retirement-wave scale, residual-value products. 5+ yrs: carbon-linked circularity platforms.",
      ecosystem: "Recycler ecosystem formalising; workshop channel owned; insurer/lender demand emerging; standards half-built — co-author them.",
      risks: ["Rule changes stranding platform bets (keep standards-agnostic)", "Slow second-life market formation", "Data-access competition from OEM captives"],
    },
    research: { note: "Battery second-life and grading research substantially leads Indian industrial practice; EU passport regulation is pulling research into production abroad first.", gap: "India's gap is infrastructure, not knowledge — the certified collection-and-grading network Bosch can build IS the bridge." },
    activityMeta: [
      { sf: "+", bosch: "+", impact: "Tighter EPR targets force producers toward exactly the traceability Bosch sells." },
      { sf: "+", bosch: "+", impact: "Second-life storage partnership shows the demand side of graded batteries forming." },
      { sf: "+", bosch: "+", impact: "Right-to-Repair extension to batteries strengthens the workshop-channel thesis." },
      { sf: "+", bosch: "+", impact: "Battery-health-based residual valuation pilot proves the data product's buyer." },
    ],
    activityTrend: [{ p: "2011–15", n: 1 }, { p: "2016–20", n: 4 }, { p: "2021–25", n: 16 }, { p: "2026 YTD", n: 6 }],
  },

  evtol: {
    market: {
      scurve: "Innovation",
      bizModel: "Component supply agreements with primes (if market forms); no platform or operator ambitions",
      revenue: [
        { k: "Hardware", v: "~90% (potential)", note: "Propulsion, power electronics, sensing subsystems" },
        { k: "Software", v: "~10% (potential)", note: "Component-level control software" },
        { k: "Services", v: "0% near-term", note: "MRO belongs to aviation players" },
        { k: "Data monetization", v: "0%", note: "Not applicable at component-supplier scope" },
      ],
    },
    porterDetail: {
      "New entrants": [{ k: "Capital intensity", v: "Extreme — platform development burns billions; component entry cheaper" }, { k: "Regulatory hurdles", v: "Aerospace certification — the categorical gate for everyone" }],
      "Buyer power": [{ k: "Buyer concentration", v: "A handful of global primes — concentrated but partner-hungry" }],
      "Supplier power": [{ k: "Supplier concentration", v: "Certified aerospace suppliers scarce — qualified entrants gain leverage" }],
      "Substitutes": [{ k: "Availability", v: "Helicopters, drones, ground transport cover most use cases today" }, { k: "Price-performance", v: "Substitutes strongly favoured until battery density improves" }],
      "Rivalry": [{ k: "Number & balance", v: "Pre-market: rivalry is for positioning and capital, not revenue" }, { k: "Diversity", v: "Aerospace primes, startups, automotive entrants — unsettled field" }],
    },
    competencyAssessment: [
      { cat: "R&D Infra", need: "None dedicated — leverage Energy/ECA labs", current: 6, target: 6, priority: "Low" },
      { cat: "IP", need: "Transferable propulsion/sensing IP (already held)", current: 7, target: 7, priority: "Low" },
      { cat: "Manufacturing", need: "Aerospace-grade quality escalation (only on trigger)", current: 5, target: 6, priority: "Low" },
      { cat: "Supply Chain", need: "Aerospace-certified sourcing (only on trigger)", current: 3, target: 5, priority: "Low" },
      { cat: "G2M", need: "Prime-OEM relationships (watch-and-engage)", current: 2, target: 5, priority: "Medium" },
      { cat: "Talent", need: "Aerospace certification expertise (hire on trigger)", current: 2, target: 5, priority: "Low" },
      { cat: "Organization", need: "A watchpost, not a business unit", current: 5, target: 6, priority: "Low" },
      { cat: "Leadership", need: "Discipline to NOT invest ahead of triggers", current: 8, target: 9, priority: "Medium" },
      { cat: "Collaboration", need: "1–2 global prime conversations kept warm", current: 3, target: 6, priority: "Medium" },
    ],
    competencyRemark: "This field's competency plan is deliberate inaction: keep transferable tech sharp through Energy/ECA investment, keep two prime conversations warm, and spend nothing structural until DGCA and unit-economics triggers fire.",
    competitorDynamics: { count: "Global platform primes (Joby, Archer, Lilium-class), aerospace Tier-1s (Honeywell, Garmin), no Indian ecosystem yet", concentration: "Platform layer consolidating globally; component layer open", winWhere: "Non-flight-critical subsystems where automotive cost-quality beats aerospace over-specification", positioning: "The automotive-grade component option for cost-pressured eVTOL primes — if and when India forms a market" },
    competitorAssessment: { strengths: "Aerospace Tier-1s: certification pedigree and existing prime relationships — genuinely hard to displace.", weaknesses: "Aerospace cost structures are built for low volumes; primes complain about component costs unsuited to commercial UAM economics.", opportunities: "Cost-appropriate automotive-grade subsystems for cargo/medical platforms with lighter certification burden.", threats: "Aerospace incumbents locking component slots at every major prime before market formation completes." },
    supplierAnalysis: {
      tech: "Nothing dedicated; shares Energy-field battery/thermal monitoring.",
      components: "Aerospace-grade components would need new certified sources — a trigger-gated build.",
      manufacturers: "No dedicated capacity — deliberate.",
      localization: "Premature — no Indian eVTOL supply chain exists to localise into.",
      recommendation: "Zero structural spend; maintain optionality via existing fields and prime relationships.",
    },
    techGrowth: {
      proven: "Electric propulsion proven in automotive; eVTOL flight demonstrated globally; commercial viability unproven anywhere, and India lacks even the regulatory frame.",
      maturity: [{ k: "TRL", v: "7–8 subsystems (automotive); 5–6 integrated eVTOL; 2–3 Indian ecosystem" }, { k: "Commercial maturity", v: "Pre-commercial globally; absent in India" }, { k: "Standardization", v: "Global certification frameworks emerging; India none" }, { k: "Scalability", v: "Blocked by battery energy density" }],
      adoption: "No Indian adoption to measure; global pilot operations begin in select markets — watch for cost-per-km data.",
      innovation: [{ k: "R&D investment", v: "Billions globally into platform primes; near-zero in India" }, { k: "Patent activity", v: "Dense at primes; component layer less contested" }, { k: "Startup ecosystem", v: "Global platform startups; India dormant" }, { k: "Academic research", v: "Indian aero departments active in UAV, not passenger eVTOL" }],
      evolution: "Now: global certification campaigns. Next: cargo/medical operations abroad, DGCA framework drafting. 5+ yrs: possible Indian pilot corridors.",
      ecosystem: "Nonexistent in India — the fact that defines the field posture.",
      risks: ["Market never forming at scale in India", "Battery constraint persisting", "Certification cost exceeding component-revenue potential"],
    },
    research: { note: "Global eVTOL research is heavily platform-focused; component-level innovation (where Bosch would play) follows platform stabilisation.", gap: "India shows the largest research-vs-industry void in the portfolio — nothing to bridge yet; monitor, don't build." },
    activityMeta: [
      { sf: "+", bosch: "0", impact: "DGCA consultation is the first regulatory heartbeat — the trigger to watch." },
      { sf: "+", bosch: "0", impact: "Prime's India market study signals future interest, no revenue implication yet." },
      { sf: "+", bosch: "+", impact: "Medical drone-logistics expansion builds the use-case path eVTOL would follow." },
    ],
    activityTrend: [{ p: "2011–15", n: 0 }, { p: "2016–20", n: 2 }, { p: "2021–25", n: 6 }, { p: "2026 YTD", n: 2 }],
  },

  robotics: {
    market: {
      scurve: "Early Adoption",
      bizModel: "Component sales (sensors, actuators, compute) + safety-certified module kits + autonomy-stack licensing (campus shuttles)",
      revenue: [
        { k: "Hardware", v: "~70%", note: "Sensors, motion control, safety compute — the component play" },
        { k: "Software", v: "~20%, rising", note: "Autonomy stacks, safety software, fleet orchestration" },
        { k: "Services", v: "~8%", note: "Integration support & certification consulting" },
        { k: "Data monetization", v: "~2%", note: "Fleet analytics — early" },
      ],
    },
    porterDetail: {
      "New entrants": [{ k: "Capital intensity", v: "Low with open-source stacks + commodity compute — startup flood" }, { k: "IP barrier", v: "Safety certification is what open source can't give — Bosch's wall" }],
      "Buyer power": [{ k: "Price sensitivity", v: "High — robots compete against cheap labour on payback math" }, { k: "Switching cost", v: "Safety-certified components sticky once designed in" }],
      "Supplier power": [{ k: "Supplier concentration", v: "Components broadly sourced; Bosch upstream for several" }],
      "Substitutes": [{ k: "Availability", v: "Manual labour is the substitute — real and cheap outside scale nodes" }, { k: "Propensity", v: "Falls sharply at high-throughput nodes and night shifts" }],
      "Rivalry": [{ k: "Number & balance", v: "Global robotics OEMs + Chinese cost players + startup wave — intense at platform level" }, { k: "Basis of competition", v: "Price in platforms (avoid); certified reliability in components (win)" }, { k: "Diversity", v: "Very high — segment by staying at the component layer" }],
    },
    competencyAssessment: [
      { cat: "R&D Infra", need: "Robot-integration labs + campus-autonomy testbed", current: 6, target: 8, priority: "Medium" },
      { cat: "IP", need: "Sensor fusion, motion control, safety compute (held)", current: 8, target: 9, priority: "Low" },
      { cat: "Manufacturing", need: "Component lines (existing capacity qualifies)", current: 8, target: 8, priority: "Low" },
      { cat: "Supply Chain", need: "Standard sourcing; Chinese cost pressure to manage", current: 7, target: 8, priority: "Low" },
      { cat: "G2M", need: "AMR-maker & integrator channel (new buyer set)", current: 4, target: 8, priority: "High" },
      { cat: "Talent", need: "Robotics application engineers (partial reuse from ADAS)", current: 6, target: 8, priority: "Medium" },
      { cat: "Organization", need: "Convergence structure sharing SdV investment", current: 6, target: 8, priority: "Medium" },
      { cat: "Leadership", need: "Humanoid-hype resistance; component-layer discipline", current: 7, target: 9, priority: "Medium" },
      { cat: "Collaboration", need: "Robot OEMs, 3PLs, campus operators", current: 4, target: 8, priority: "High" },
    ],
    competencyRemark: "The tech transfers; the customers don't. Bosch needs an AMR-maker sales channel and integrator partnerships — a new buyer set with existing products. Keep humanoids at watch and let the convergence thesis keep costs shared with SdV.",
    competitorDynamics: { count: "Global robot OEMs (ABB, KUKA, Fanuc), AMR specialists (Geek+, MiR), Chinese cost players, Indian startups (Ati, Peer Robotics)", concentration: "Platform layer concentrated; component layer open to certified suppliers", winWhere: "Safety-certified components and the converged autonomy stack — above the platform price war", positioning: "The automotive-grade component partner robotics makers standardise on for safety-critical parts" },
    competitorAssessment: { strengths: "Robot OEMs: application depth and installed bases. Chinese suppliers: aggressive component pricing.", weaknesses: "Startup platforms lack certified safety — integrators complain about reliability at scale; Chinese components face trust and support gaps.", opportunities: "Certified component kits that de-risk startup platforms; campus-shuttle autonomy nobody in India offers integrated.", threats: "Chinese component pricing compressing margins; a robotics OEM vertically integrating sensors at scale." },
    supplierAnalysis: {
      tech: "Open-source robotics stacks (ROS2 — embrace), simulation platforms (multi-source).",
      components: "Bosch is largely its own supplier (MEMS, cameras, compute modules) — an unusual, favourable position.",
      manufacturers: "Existing lines carry robot-grade components.",
      localization: "Already localised on Bosch's side; Make-in-India assembly rules favour local component content — an advantage against imports.",
      recommendation: "Exploit the self-supply position: bundle certified sensor+compute+safety kits priced against Chinese imports, with local support they can't match.",
    },
    techGrowth: {
      proven: "AMR technology proven at global scale; campus low-speed autonomy validated in pilots; humanoids demonstrably work but economics unproven.",
      maturity: [{ k: "TRL", v: "8–9 AMR; 7 campus autonomy; 5–6 humanoids" }, { k: "Commercial maturity", v: "Growth in AMR; innovation stage elsewhere" }, { k: "Standardization", v: "AMR safety standards maturing; humanoid norms absent" }, { k: "Scalability", v: "High for components; deployment gated by labour economics" }],
      adoption: "3PLs and large fulfilment adopting now; acceleration at labour-constrained nodes; broad-market adoption paced by wage growth.",
      innovation: [{ k: "R&D investment", v: "Very high globally (humanoid capital wave); moderate India" }, { k: "Patent activity", v: "Exploding in manipulation/locomotion; steady in AMR" }, { k: "Startup ecosystem", v: "Active Indian AMR/warehouse-automation startups" }, { k: "Academic research", v: "IIT robotics programmes strong; talent pipeline good" }],
      evolution: "Now: AMR scale-up. Next: campus autonomy, converged robot-vehicle platforms. 5+ yrs: humanoids if economics prove.",
      ecosystem: "Component ecosystem strong (Bosch inside it); integrator ecosystem growing; safety-certification ecosystem forming — engage early.",
      risks: ["Humanoid hype misallocating attention", "Chinese cost curve", "Labour-economics ceiling on adoption breadth"],
    },
    research: { note: "Humanoid research investment globally exceeds near-term deployable economics by a wide margin; AMR research is already industrialised.", gap: "The gap inverts by segment: AMR has no research gap (execute now); humanoids have a large one (wait)." },
    activityMeta: [
      { sf: "+", bosch: "+", impact: "Large AMR fleet order proves component demand at scale nodes." },
      { sf: "+", bosch: "+", impact: "Cobot localisation grows the certified-component buyer base." },
      { sf: "+", bosch: "+", impact: "Campus shuttle pilot is exactly the SdV-testbed play Bosch wants." },
      { sf: "+", bosch: "0", impact: "Humanoid funding with analyst caution — confirms watch-not-invest." },
    ],
    activityTrend: [{ p: "2011–15", n: 2 }, { p: "2016–20", n: 7 }, { p: "2021–25", n: 19 }, { p: "2026 YTD", n: 6 }],
  },

  health: {
    market: {
      scurve: "Innovation",
      bizModel: "HW+SW stack sales (e-call units) + per-vehicle service fees (emergency response) + wellness feature licences bundled with Interior systems",
      revenue: [
        { k: "Hardware", v: "~45%", note: "E-call units, crash sensors — mandate-driven volumes" },
        { k: "Software", v: "~30%", note: "Emergency-call logic, wellness algorithms" },
        { k: "Services", v: "~20%", note: "Emergency-response integration, fleet subscriptions" },
        { k: "Data monetization", v: "~5%, gated", note: "Health data is DPDP's highest class — architecture-first" },
      ],
    },
    porterDetail: {
      "New entrants": [{ k: "Regulatory hurdles", v: "Future e-call type approval + CDSCO perimeter for clinical claims" }, { k: "IP barrier", v: "Crash-sensing pedigree matters for reliability claims" }],
      "Buyer power": [{ k: "Price sensitivity", v: "High pre-mandate; mandated features shift leverage to certified suppliers" }],
      "Supplier power": [{ k: "Supplier concentration", v: "Standard sensing/connectivity inputs — low pressure" }],
      "Substitutes": [{ k: "Availability", v: "The smartphone does emergency calls and health tracking today" }, { k: "Price-performance", v: "Phone is good enough until crash-integration matters — that's the wedge" }],
      "Rivalry": [{ k: "Number & balance", v: "Telematics players + medtech circling; nobody owns vehicle-health integration" }, { k: "Industry growth", v: "17% growing to step-change on mandate — early positioning race" }],
    },
    competencyAssessment: [
      { cat: "R&D Infra", need: "Crash-test + emergency-response integration labs (existing)", current: 8, target: 8, priority: "Low" },
      { cat: "IP", need: "Crash detection, e-call logic, wellness sensing (shared)", current: 7, target: 8, priority: "Medium" },
      { cat: "Manufacturing", need: "E-call unit production (existing lines)", current: 8, target: 8, priority: "Low" },
      { cat: "Supply Chain", need: "Standard components — no chokepoints", current: 8, target: 8, priority: "Low" },
      { cat: "G2M", need: "Mandate-timed OEM selling + e-ambulance programme access", current: 5, target: 8, priority: "High" },
      { cat: "Talent", need: "Emergency-systems engineers + health-data privacy expertise", current: 5, target: 7, priority: "Medium" },
      { cat: "Organization", need: "Claims firewall between wellness and medical", current: 6, target: 9, priority: "High" },
      { cat: "Leadership", need: "Scope discipline: mandated wedge first, optionality after", current: 7, target: 8, priority: "Low" },
      { cat: "Collaboration", need: "Medtech partners, 112 authorities, public-transport buyers", current: 4, target: 8, priority: "High" },
    ],
    competencyRemark: "Bosch can ship a 112-ready e-call stack with existing assets. What needs building: the mandate-timing sales motion, medtech partnerships for anything clinical, and a hard organisational firewall between wellness features and medical claims.",
    competitorDynamics: { count: "Telematics providers, e-call specialists (global), medtech entrants, smartphone ecosystem as ambient substitute", concentration: "No integrated vehicle-health incumbent in India — open ground on the mandated wedge", winWhere: "OEM-line e-call at mandate time and e-ambulance programmes — where crash-sensing pedigree and 112 integration decide", positioning: "The safety-grade emergency-response supplier — proven crash sensing, certified integration, privacy-first health data" },
    competitorAssessment: { strengths: "Telematics players: fleet relationships and quick deployment. Medtech: clinical credibility Bosch won't build.", weaknesses: "Telematics: no crash-sensing depth — false-trigger complaints in the field. Medtech: no automotive integration capability.", opportunities: "Bundled e-call + wellness on shared sensors; e-ambulance telematics with policy funding attached.", threats: "Smartphone-based 112 integration becoming 'good enough' in regulators' eyes, shrinking the mandate scope." },
    supplierAnalysis: {
      tech: "112/ERSS integration (public infrastructure), emergency-response platforms (partner).",
      components: "Crash sensors (in-house franchise), connectivity modules (shared with Connectivity field).",
      manufacturers: "Existing lines suffice.",
      localization: "Already local; the India-specific work is 112-protocol integration, not sourcing.",
      recommendation: "Reuse everything: sensors from Interior, connectivity from Connectivity, cloud from the DPDP-native stack. This field should carry almost no dedicated supply chain.",
    },
    techGrowth: {
      proven: "E-call proven in the EU for a decade; India adaptation is integration work. Wellness vitals sensing validated; medical-grade unproven without clinical pathways.",
      maturity: [{ k: "TRL", v: "9 e-call; 6 wellness vitals; 4 medical-grade in-cabin" }, { k: "Commercial maturity", v: "Pre-mandate — the market is waiting for regulation" }, { k: "Standardization", v: "EU eCall standard is the template; Indian 112 integration specs forming" }, { k: "Scalability", v: "High — standard electronics + cloud" }],
      adoption: "OEM adoption waits on the mandate; fleet adoption on insurance economics; e-ambulance adoption policy-funded now.",
      innovation: [{ k: "R&D investment", v: "Moderate — concentrated in medtech and telematics" }, { k: "Patent activity", v: "Active in vitals sensing; e-call IP mature" }, { k: "Startup ecosystem", v: "Digital-health startups circling automotive" }, { k: "Academic research", v: "Indian emergency-medicine + sensing research growing" }],
      evolution: "Now: e-ambulance + fleet wedges. Next: mandated e-call at volume, wellness features. 5+ yrs: clinical-grade monitoring via partnerships.",
      ecosystem: "112/ERSS infrastructure maturing; medtech partner ecosystem available; insurer interest growing.",
      risks: ["Mandate timing slippage", "Smartphone substitution at regulator level", "CDSCO boundary missteps", "Health-data breach severity under DPDP"],
    },
    research: { note: "In-cabin vitals research (radar-based) is well ahead of any Indian deployment; emergency-response integration research is mature and waiting on policy.", gap: "E-call has no research gap — only a mandate gap. Vitals research needs clinical validation partners before industry can absorb it." },
    activityMeta: [
      { sf: "+", bosch: "+", impact: "112-integration reference in road-safety consultation moves the mandate closer." },
      { sf: "+", bosch: "+", impact: "Wellness monitoring in a premium SUV validates the non-clinical feature path." },
      { sf: "+", bosch: "+", impact: "Accessibility criteria in tenders open the DEI design-services line." },
      { sf: "+", bosch: "-", impact: "Medtech-telematics partnership shows rivals assembling the same bundle." },
    ],
    activityTrend: [{ p: "2011–15", n: 1 }, { p: "2016–20", n: 3 }, { p: "2021–25", n: 10 }, { p: "2026 YTD", n: 4 }],
  },
};

/* ═══ V7 — PESTEL for/against + SWOT-5 + rich competitor profiles
   Populated by the data agent; stub here so app always compiles.
   Each field key: { pestelFA, swot5, competitorProfiles, sources? } ═══ */
const V7 = {
  energy: {
    pestelFA: {
      P: {
        for: [
          { p: "PM E-DRIVE allocates ₹10,900 Cr for EV demand and charging", why: "Replaces FAME II with a larger, broader scheme covering 2W, 3W, buses and charging corridors from late 2024 through 2026.", sowhat: "Size commercial proposals around PM E-DRIVE-funded OEMs and CPOs — the public money creates real procurement budgets." },
          { p: "ACC PLI supports domestic cell manufacturing", why: "₹18,100 Cr in incentives for Indian cell makers (Ola, Reliance, Rajesh Exports) — reducing import dependency from 2026.", sowhat: "Lock 2 ACC-PLI cell partnerships now to secure local supply before Chinese imports face tariff headwinds." },
          { p: "State EV policies (TN, Gujarat, Maharashtra) add top-up incentives", why: "Over 20 states have active EV policies adding 5–15% extra incentives on FAME-linked vehicles — expanding the addressable market.", sowhat: "Map state-by-state fleet and OEM concentration to prioritise sales territory in highest-incentive states." },
        ],
        against: [
          { p: "PM E-DRIVE excludes private cars — biggest EV segment unsubsidised", why: "Policy focuses on commercial and public use; premium passenger EVs get no central incentive, limiting early mass adoption.", sowhat: "Focus on 2W/3W and fleet segments where subsidies create real demand rather than waiting for PV adoption." },
          { p: "Political risk: EV policies could be revised after state elections", why: "State EV incentives are frequently revised or withdrawn after election cycles, disrupting OEM sourcing decisions.", sowhat: "Avoid over-indexing on subsidy-dependent volumes; ensure products are competitive on TCO without subsidies." },
          { p: "Localisation mandates in tenders favour Indian-origin suppliers", why: "B2G EV tenders increasingly require 50%+ domestic value addition — can disadvantage products with imported component content.", sowhat: "Accelerate India content in BMS and charger designs; use PLI-linked components to satisfy localisation clauses." },
        ],
      },
      E: {
        for: [
          { p: "EV total cost of ownership beats ICE for commercial fleets", why: "At ₹6/unit electricity vs ₹90+/L petrol, a commercial 3W breaks even against ICE in under 18 months at current economics.", sowhat: "Lead with TCO calculators in fleet sales — the economics do the selling without requiring subsidy conviction." },
          { p: "RBI rate cuts create cheaper fleet financing", why: "RBI cut repo rate to 5.5% (Jun-2026), reducing EMI cost on fleet EV purchases by 3–5%.", sowhat: "Partner with NBFCs and fleet financiers to bundle affordable EV financing with charging management solutions." },
          { p: "Falling lithium cell prices (down 30% 2023–25) improve product margins", why: "Global cell oversupply has pushed LFP pack prices below $90/kWh — reducing BOM cost and improving business cases.", sowhat: "Redesign cost structures to capture the margin improvement rather than passing it all to OEM price negotiations." },
        ],
        against: [
          { p: "Currency risk: INR/USD volatility hurts import-heavy BOM costs", why: "SiC MOSFETs, advanced ICs and battery cells are priced in USD; a 5% INR depreciation raises BOM by 2–4%.", sowhat: "Hedge FX exposure on import-heavy components; prioritise local sourcing wherever cost-competitive." },
          { p: "Interest-rate sensitivity: fleet buyers defer purchases if financing costs rise", why: "High-value EV fleet orders are rate-sensitive; a 100bps tightening can shift payback period by 6 months.", sowhat: "Offer flexible commercial structures (leasing, per-km pricing) that are insulated from rate cycle changes." },
          { p: "Electricity tariff uncertainty threatens the EV running-cost advantage", why: "Discoms are seeking tariff revisions; if commercial EV charging tariffs exceed ₹10/unit, the TCO advantage narrows.", sowhat: "Develop tariff-agnostic business cases; advocate for EV-specific tariff schedules with discom partners." },
        ],
      },
      S: {
        for: [
          { p: "Younger urban consumers prefer EVs for environmental and cost reasons", why: "Urban millennials now make up 60%+ of new 2W buyers; surveys show 70%+ would prefer EV if range anxiety is resolved.", sowhat: "Support OEM co-marketing that addresses range anxiety — the key barrier to converting preference into purchase." },
          { p: "Driver and fleet operator awareness of EV running costs is rising rapidly", why: "Word-of-mouth among Ola/Ather/TVS EV users has dramatically shifted fleet buyer awareness of ₹1–1.5/km running costs.", sowhat: "Invest in fleet operator community engagement — peer endorsement converts faster than advertising in this segment." },
          { p: "Last-mile delivery growth drives EV 3W demand structurally", why: "E-commerce volumes grew 35% in 2025; Flipkart, Amazon, Meesho and Zomato are electrifying last-mile fleets under ESG commitments.", sowhat: "Develop charging and fleet management solutions specifically for high-utilisation last-mile delivery duty cycles." },
        ],
        against: [
          { p: "Consumer confidence in EV quality and service access is still fragile", why: "Fires involving Indian EV brands in 2022–23 left a lasting safety perception issue, especially in tier-2/3 cities.", sowhat: "Lead with AIS-156 certified safety positioning — regulatory certification is the most credible quality signal available." },
          { p: "Charging infrastructure anxiety limits rural and long-distance adoption", why: "80%+ of charging points are urban; intercity EV travel remains impractical for most buyers.", sowhat: "For intercity charging gaps, position V2G-ready fleet solutions rather than consumer products that require ubiquitous infrastructure." },
          { p: "Premium EV price points exclude India's mass-market buyer segment", why: "Average selling price of EVs is 25–40% above comparable ICE; income distribution means most buyers are not yet reachable.", sowhat: "Target affordable BMS and charging platforms for sub-₹1L 2W segments — India's scale is in that price band, not premium." },
        ],
      },
      T: {
        for: [
          { p: "LFP chemistry maturity makes safe, long-life packs technically feasible in India", why: "LFP's thermal stability and 2,000+ cycle life makes it ideal for India's heat and charging-pattern conditions.", sowhat: "Standardise on LFP-compatible BMS architecture to maximise compatibility with PLI-backed cell makers." },
          { p: "OCPP 2.x and ISO 15118 enable smart V2G-ready charging at commercial cost", why: "Open standards reduce integration cost; V2G-capable infrastructure can be deployed now at only 15–20% premium over basic chargers.", sowhat: "Launch V2G-ready charging management systems to capture the grid-services revenue stream being structured by discoms." },
          { p: "Cloud-native BMS algorithms enable real-time battery health monitoring at fleet scale", why: "Cloud BMS deployment allows over-the-air tuning and predictive maintenance across a fleet without hardware changes.", sowhat: "Productise BMS-as-a-service offerings that generate recurring revenue from the connected fleet base." },
        ],
        against: [
          { p: "Solid-state battery disruption could strand LFP-optimised designs", why: "Toyota and QuantumScape are targeting solid-state commercialisation by 2027–28; a step-change in energy density could disrupt current chemistry assumptions.", sowhat: "Design BMS architectures to be chemistry-agnostic so solid-state integration is a software + configuration update, not a redesign." },
          { p: "India lacks domestic SiC power semiconductor manufacturing", why: "SiC MOSFETs are critical for high-efficiency charging and BMS power stages; all production is imported (China, Europe, US).", sowhat: "Dual-source SiC supply and maintain design flexibility for GaN alternatives — the supply chain is geopolitically exposed." },
          { p: "Battery swap standards fragmentation complicates multi-OEM strategies", why: "Ola, Honda, and the BIS standard body are pursuing different connector and protocol specs — lock-in risk for platform choices.", sowhat: "Adopt the BIS/government-led standard reference design; avoid proprietary battery swap formats that limit reach." },
        ],
      },
      En: {
        for: [
          { p: "ELV Battery Waste Management Rules mandate EPR compliance from 2024", why: "Producers must now ensure 95%+ of batteries sold enter formal recycling channels — creating demand for collection and traceability services.", sowhat: "Launch an EPR traceability service through the workshop network; position it as the compliance infrastructure OEMs can outsource." },
          { p: "Net-zero commitments by OEMs create demand for lifecycle carbon reporting", why: "Maruti, Tata Motors and Mahindra have net-zero pledges requiring supply-chain carbon data from component makers including Bosch.", sowhat: "Provide verified carbon-per-vehicle data to OEM partners — this becomes a contract requirement, not a nice-to-have." },
          { p: "V2G and grid integration reduces carbon intensity of the vehicle fleet", why: "EV fleets that participate in V2G can shift charging to renewable-generation hours, reducing lifecycle emissions.", sowhat: "Partner with discoms on V2G pilots — position Bosch's charging management as India's first commercial V2G-enabled platform." },
        ],
        against: [
          { p: "Cobalt and nickel in NMC packs raise supply-chain ESG flags", why: "Though most India packs will be LFP, premium segments use NMC with DRC cobalt supply chains that attract ESG scrutiny.", sowhat: "For NMC components, require ESG due diligence from cell partners and publish supply-chain traceability data." },
          { p: "Battery manufacturing has high water and chemical footprint", why: "Electrolyte production and electrode coating processes consume significant water and generate solvent waste.", sowhat: "Work with cell-manufacturing partners to verify environmental compliance before committing to ACC-PLI partnerships." },
          { p: "Informal recycling sector handles 60%+ of batteries today — a liability risk", why: "Without formal EPR infrastructure, informal recyclers handle most end-of-life batteries unsafely — creating reputational risk for the whole value chain.", sowhat: "Join the certified recycler network early; formal-sector participation de-risks the brand well ahead of regulation enforcement." },
        ],
      },
      L: {
        for: [
          { p: "AIS-156 functional safety standard protects certified BMS suppliers", why: "The 2023 amendment tightened fire-prevention requirements; only certified suppliers can serve OEM RFQs for the 2024+ production cycle.", sowhat: "Maintain AIS-156 Phase-2 certification proactively; publish test results to OEM procurement teams as a competitive signal." },
          { p: "DPDP Act creates a consent framework that legitimises vehicle data services", why: "A clear consent law actually helps Bosch: OEMs can now offer battery-health data services to insurers with legal backing.", sowhat: "Design data products with DPDP-native consent architecture from day one — this is a source of market trust, not friction." },
          { p: "Right to Repair notification extends to EVs — workshop channel becomes mandatory touchpoint", why: "Consumers have a legal right to independent repair; this mandates that OEMs make diagnostic data available to independent workshops.", sowhat: "Expand workshop battery diagnostics under Right-to-Repair framing — the legal right creates the demand for Bosch's tools." },
        ],
        against: [
          { p: "Battery-data regulations are still evolving — over-engineering today may not match tomorrow's rules", why: "DPDP subordinate rules are still being drafted; over-investment in a specific data architecture may require costly redesign.", sowhat: "Build standards-agnostic platforms; use configuration-led compliance design that can adapt to rule changes without core rewrites." },
          { p: "Charging station licensing varies by state — delays network deployment", why: "Some states treat public charging stations as commercial establishments requiring shop licences; others exempt them — compliance complexity slows rollout.", sowhat: "Provide compliance advisory to CPO partners — removing regulatory friction is a partnership differentiator in the charging space." },
          { p: "Motor Vehicles Act EV-specific amendments are still pending", why: "Testing requirements, insurance categories and homologation processes for newer EV form factors lack final clarity.", sowhat: "Engage with ARAI and MoRTH standards working groups — shaping the regulation now is less costly than adapting to it later." },
        ],
      },
    },
    swot5: {
      S: [
        { area: "Technology", p: "AIS-156 Phase-2 certified BMS with thermal runaway protection", why: "Bosch's BMS carries the highest Indian safety certification — the most credible differentiator against cost-focussed competitors.", sowhat: "Lead every OEM pitch with the safety certification; make it the non-negotiable reason to shortlist Bosch." },
        { area: "Market", p: "10,000-workshop service network unmatched by any rival", why: "Physical service presence is the single biggest trust signal for fleet operators whose business stops when a vehicle does.", sowhat: "Activate workshop network as a battery-health diagnostic and second-life grading centre — turns a cost into revenue." },
        { area: "Technology", p: "PS-ESB power-electronics platform shared across multiple fields", why: "Shared power-electronics architecture reduces development cost and delivers economies of scale Chinese rivals don't have in India.", sowhat: "Co-invest in PS-ESB with the ECA and Connectivity fields to spread fixed development cost across three revenue streams." },
        { area: "People", p: "Bengaluru R&D centre with 5,000+ engineers already working on EV systems", why: "India-based engineering at India salary levels enables competitive product pricing while maintaining Bosch-quality standards.", sowhat: "Fast-track India-origin BMS designs to close the 25–30% cost gap with Chinese suppliers." },
        { area: "Process", p: "ISO 26262-grade functional safety processes already embedded in culture", why: "Safety culture and process maturity cannot be bought — they take a decade to build and Bosch already has them.", sowhat: "Communicate safety process maturity to OEM quality teams as a programme-risk reduction, not just a feature." },
      ],
      W: [
        { area: "Market", p: "India-cost BMS manufacturing gap of 25–30% versus Chinese rivals", why: "CATL and BYD source cells and assemble packs at dramatically lower cost; without a cost-competitive India pack line, Bosch loses volume RFQs.", sowhat: "Launch a dedicated India-cost BMS production line within 18 months; aim at the mid-tier 2W OEM who cannot afford the full Chinese bundle." },
        { area: "Process", p: "No formal fleet operator or discom sales channel", why: "Classic OEM-RFQ sales motions do not reach fleet operators or charging infrastructure owners — a growing revenue segment.", sowhat: "Hire 3–5 dedicated fleet and discom business development leads; package charging management as a standalone subscription product." },
        { area: "Technology", p: "No owned cell technology — fully dependent on external cell suppliers", why: "Cell makers who are also BMS makers (CATL, BYD) can undercut on total pack cost; Bosch's pure-BMS position is structurally exposed.", sowhat: "Differentiate on chemistry-agnostic BMS design — position this as an advantage (no OEM lock-in) not a gap." },
        { area: "People", p: "Power electronics talent pipeline thinner than software talent", why: "SiC/GaN power-electronics expertise is scarce in India; competitor captives are hiring aggressively, threatening Bosch's engineering depth.", sowhat: "Partner with IIT power-electronics research groups for co-development and early talent pipeline access." },
        { area: "Leadership", p: "Slow internal decision cycle for fleet/consumer-segment investments", why: "Bosch's B2B OEM culture makes it slower to fund and execute in the faster-moving fleet operator and consumer-facing segments.", sowhat: "Establish a separate P&L unit for fleet and discom energy business with its own budget and go-to-market playbook." },
      ],
      O: [
        { area: "Market", p: "Mid-tier 2W OEMs need BMS alternatives to reduce CATL dependence", why: "Hero, TVS and smaller OEMs don't want single-source cell+BMS dependency on a Chinese competitor; they actively want alternatives.", sowhat: "Position Bosch as the strategic second source — safer, IATF-certified, local service — even if 10–15% higher cost." },
        { area: "Technology", p: "V2G grid services market opening under CERC pilot framework", why: "Central Electricity Regulatory Commission is piloting V2G ancillary services; first movers set the technical standard.", sowhat: "Launch a V2G pilot with one discom now to establish the reference architecture — regulatory first-mover advantage is real." },
        { area: "Market", p: "Battery health data is becoming a credit underwriting requirement", why: "Lenders, insurers and fleet resale platforms are beginning to require certified SoH data before valuing or financing used EVs.", sowhat: "Launch certified battery health report (SoH certificate) via workshops — this is a paid data product with zero marginal supply cost." },
        { area: "Technology", p: "Na-ion first-generation cells enter the Indian market by 2027", why: "Reliance and Faradion are targeting India Na-ion commercialisation; packs will be 20–30% cheaper than LFP but need adapted BMS.", sowhat: "Develop Na-ion compatible BMS algorithms now; being the first certified Na-ion BMS supplier creates a platform advantage." },
        { area: "Process", p: "EPR battery collection mandate creates a funded circular-economy market", why: "Battery producers must demonstrate compliant disposal; no credible organised collection and traceability infrastructure exists yet.", sowhat: "Launch EPR traceability-as-a-service through the workshop network — a recurring compliance revenue stream with zero new channel cost." },
      ],
      T: [
        { area: "Market", p: "Top 4 OEMs (Ola, Ather, TVS, Hero) building in-house BMS capability", why: "India's highest-volume 2W EV makers are vertically integrating BMS; this reduces the addressable merchant BMS market materially.", sowhat: "Pivot focus to mid-tier OEMs (Ampere, Okinawa, Revolt) who cannot afford in-house BMS R&D and need a certified partner." },
        { area: "Technology", p: "Chinese JV entrants undercutting on total-pack cost", why: "CATL India and BYD offer cell+BMS bundles at prices Bosch cannot match without a local pack line.", sowhat: "Compete on software+service total cost: BMS licence + workshop health service + EPR compliance beats the bare-hardware price." },
        { area: "Leadership", p: "Central government could mandate domestically-designed BMS in PLI phases", why: "If future PLI tranches require India-origin electronics design, imported BMS designs could face tariff or eligibility barriers.", sowhat: "Register Bosch India's BMS designs with DPIIT and file them under the India Innovation Index — protect future eligibility." },
        { area: "Market", p: "Battery swap standard fragmentation could split the market permanently", why: "Three competing swap standards (Ola, Honda, BIS) risk creating incompatible ecosystems — forcing Bosch to support all three at extra cost.", sowhat: "Support only the BIS-led standard formally; maintain adapter designs for others but do not invest in proprietary swap integration." },
        { area: "Technology", p: "SiC supply chain disruption could halt high-efficiency charger production", why: "SiC fab capacity is concentrated in 3–4 global plants; any facility disruption causes 12–18 month supply gaps.", sowhat: "Qualify GaN-based alternatives and hold 6-month SiC safety stock — the risk is low-probability but high-impact." },
      ],
    },
    competitorProfiles: [
      {
        name: "CATL (India JV entry via CALB/SVOLT channel)",
        type: "global",
        listing: "SHE: 300750 (Shenzhen Stock Exchange)",
        revenue: "~$50B (FY2024)",
        headcount: "~103,000",
        profitability: "Net margin ~10–12% (declining from 20%+)",
        cashCow: "LFP and NMC battery packs for Chinese OEMs; dominant 35–37% global EV battery share",
        emerging: "Energy storage systems (ESS), India JV entry via CALB/SVOLT brand, European gigafactories",
        rdBets: "Condensed battery (no module), Sodium-ion cells for entry segments, all-solid-state for 2027+",
        keyPartnerships: "SAIC, BYD, NIO, Stellantis, BMW; Tata Group (rumoured India JV), ACME Solar (India ESS)",
        vision: "Become the world's largest energy company, not just a battery maker — power storage at every scale",
        differentiation: "Pure cost leadership via vertical integration from raw material to cell to pack",
        sentiment: "Loved for cost and scale; complained about limited localisation support and long RMA cycles",
        indiaStrategy: "Working through Indian partners (CALB India, SVOLT) to supply EV OEMs; long-term India factory decision deferred to 2027",
        x_price_position: 3, y_tech_depth: 9,
        moat: "Vertical cell-to-pack integration at unbeatable cost",
        radar: { tech: 9, price: 9, indiaPresence: 5, service: 4, innovation: 8, ecosystem: 8 },
      },
      {
        name: "BYD India",
        type: "global",
        listing: "HK: 1211 (Hong Kong Stock Exchange)",
        revenue: "~$107B (FY2024, group)",
        headcount: "~900,000",
        profitability: "Net margin ~5%",
        cashCow: "Passenger EVs in China and emerging markets; e-buses",
        emerging: "India 2W and 3W EV packs, European OEM cell supply",
        rdBets: "Blade battery (cell-to-pack LFP), hybrid DMI powertrain, autonomous driving",
        keyPartnerships: "Olectra (India bus), Lucid, Toyota; Adani Group (India manufacturing negotiation)",
        vision: "Be the world's technology partner in green energy and smart mobility",
        differentiation: "Full EV + battery vertical: BYD makes the vehicle, the cell, the BMS, and the charger",
        sentiment: "Praised for product range; India sentiment mixed — import duty exposure creates price frustration",
        indiaStrategy: "India-assembled electric buses (Hyderabad plant via Olectra); e6 taxi fleet; possible India car assembly by 2026",
        x_price_position: 3, y_tech_depth: 8,
        moat: "Full EV ecosystem ownership — nobody else is car+cell+charger at scale",
        radar: { tech: 8, price: 8, indiaPresence: 6, service: 5, innovation: 7, ecosystem: 9 },
      },
      {
        name: "Exicom / Servotech (Indian BMS & chargers)",
        type: "indian-incumbent",
        listing: "NSE: EXICOM (IPO Mar 2024)",
        revenue: "~₹700 Cr / ~$85M (FY2024)",
        headcount: "~1,500",
        profitability: "EBITDA positive, thin net margin",
        cashCow: "AC home and workplace chargers; DC fast chargers for government/fleet tenders",
        emerging: "EV charging as a service (CPaaS), SE-Asia exports",
        rdBets: "150kW ultra-fast charger, grid-interactive chargers for BESS",
        keyPartnerships: "Tata Motors (preferred charger partner), BPCL, IOC for fuel-station charging",
        vision: "India's EV charging infra leader — own the network, not just the box",
        differentiation: "India-first cost structure; fastest tender response; government relationships",
        sentiment: "Reliable for basic AC/DC; criticised for after-sales support and firmware update pace",
        indiaStrategy: "Bidding all FAME-III and state EV charging tenders; building a CPaaS model on top of hardware",
        x_price_position: 4, y_tech_depth: 6,
        moat: "India-cost hardware + government tender relationships",
        radar: { tech: 6, price: 7, indiaPresence: 9, service: 6, innovation: 5, ecosystem: 6 },
      },
      {
        name: "Log9 Materials (Indian BMS startup)",
        type: "startup",
        listing: "Private (VC-backed, Series C; investors include Amara Raja, Petronas)",
        revenue: "~₹60 Cr / ~$7M (FY2024 estimate)",
        headcount: "~400",
        profitability: "Pre-profit, burning cash for scale",
        cashCow: "Rapid charging lithium-titanate (LTO) batteries for 3W delivery fleets",
        emerging: "LTO BMS for e-buses; battery-as-a-service leasing model",
        rdBets: "RapidX fast-charge cells (15-min charge claim), grid buffer storage",
        keyPartnerships: "Amara Raja (strategic investor), Magenta Mobility, Ultraviolette",
        vision: "Make fast-charging electric vehicles practical for high-utilisation commercial duty cycles",
        differentiation: "Fast-charge chemistry and BaaS business model vs traditional hardware sale",
        sentiment: "Highly praised for fast charge and duty-cycle resilience; scale and after-sales consistency questioned",
        indiaStrategy: "Targeting e-3W delivery fleets in metro cities; BaaS contracts with logistics players",
        x_price_position: 5, y_tech_depth: 7,
        moat: "Fast-charge chemistry and BaaS model — both hard to replicate quickly",
        radar: { tech: 7, price: 6, indiaPresence: 6, service: 5, innovation: 8, ecosystem: 4 },
      },
    ],
  },

  lighting: {
    pestelFA: {
      P: {
        for: [
          { p: "BNCAP safety rating drives adaptive lighting adoption in mainstream cars", why: "Bharat NCAP adds lighting performance criteria; OEMs chasing 5-star ratings must adopt automatic high-beam and adaptive front lighting.", sowhat: "Position Bosch's adaptive lighting control as the BNCAP-grade solution; co-invest in homologation with partner lamp makers." },
          { p: "Make-in-India preference in government vehicle tenders", why: "State and central fleet procurement increasingly requires India-manufactured content, including lighting systems.", sowhat: "Ensure controllers are assembled at Indian plants to qualify for local-content clauses in government fleet orders." },
          { p: "Vehicle safety regulations mandate DRL and AHB from 2024 onwards", why: "AIS standards now require daytime running lights and automatic high-beam assist on new model approvals.", sowhat: "Lead OEM advisory on AIS-compliant lighting control — regulatory compliance creates a guaranteed feature-adoption event." },
        ],
        against: [
          { p: "Luxury import duty makes premium pixel-lighting unaffordable at mass-market price", why: "High import duties on advanced optical components and LED modules inflate the cost of European-spec matrix lighting for India.", sowhat: "Design India-cost adaptive lighting solutions using locally available LED drivers rather than premium European component bills." },
          { p: "No government incentive for lighting-specific R&D or localisation", why: "Unlike EV batteries or semiconductors, lighting electronics have no PLI or specific incentive structure — investment is entirely commercial.", sowhat: "Fund lighting-control R&D through cross-field sharing with ADAS and cockpit programmes where costs overlap." },
          { p: "OEM platform nominations happen infrequently — missing a cycle means waiting 5–7 years", why: "Lighting platforms are awarded during vehicle architecture design, typically on 5–7 year cycles — late entry misses a generation.", sowhat: "Identify OEMs currently in platform design (2024–26 cycle) and prioritise those for lighthouse partnership deals." },
        ],
      },
      E: {
        for: [
          { p: "Premium vehicle segment growing faster than the overall car market", why: "India's ₹10L+ car segment grew 18% in FY2025 vs 7% for the overall market — and premium cars adopt advanced lighting features first.", sowhat: "Focus on ₹10L+ OEM platforms where feature content per vehicle is highest and margin per unit is strongest." },
          { p: "LED content per vehicle growing — BOM value increases without unit volume change", why: "Transition from halogen to full-LED and eventually matrix increases the electronics value per car by 2–4x.", sowhat: "Frame the business case to OEM procurement as growing share-of-vehicle versus growing car volume — a different and more sustainable metric." },
          { p: "India auto market expected to reach 5M+ cars by 2030 — total addressable market growing", why: "McKinsey and SIAM project India as the world's 3rd largest auto market by 2027, expanding the total platform opportunity.", sowhat: "Secure platform positions now when competition for OEM relationships is less intense than it will be in 2–3 years." },
        ],
        against: [
          { p: "Price pressure on OEM commodity lighting is intensifying — margins squeezed annually", why: "Annual 3–5% price-downs are standard in commodity lighting; without differentiation, each year erodes profitability.", sowhat: "Explicit rule: avoid the commodity lamp business entirely; enter only at the control/software layer where price-downs are softer." },
          { p: "Raw material costs (rare earth phosphors, LED chips) subject to China supply volatility", why: "80%+ of LED phosphors are sourced from China; export restrictions could spike LED chip costs rapidly.", sowhat: "Work with partner lamp makers to diversify their LED chip sourcing — supply risk affects the partner relationship, not just the end product." },
          { p: "Currency risk on imported advanced ADAS camera sensors used in adaptive lighting", why: "ADB (adaptive driving beam) uses camera inputs from ADAS sensors priced in USD/EUR, creating FX cost exposure.", sowhat: "Reuse Bosch's own India-produced MEMS/camera assets where possible to reduce import exposure in the lighting control stack." },
        ],
      },
      S: {
        for: [
          { p: "Indian buyers increasingly treat exterior lighting as a differentiation signal", why: "OEM surveys show lighting design is now in top-5 buyer evaluation criteria for cars above ₹8L — DRLs are seen as quality markers.", sowhat: "Give OEM marketing teams data on buyer preference for lighting as a feature — it strengthens internal RFQ justification." },
          { p: "Brand safety awareness drives AHB adoption among urban buyers", why: "Post-BNCAP, urban car buyers are more aware of safety features; AHB and lane-change assist lighting now feature in dealer conversations.", sowhat: "Support OEM dealer training on safety-lighting feature explanations — educated buyers pull features through faster." },
          { p: "Social media visibility of signature lighting creates organic brand premium", why: "DRL designs and animated welcome sequences go viral; OEMs increasingly see lighting as a brand expression tool.", sowhat: "Demonstrate animated/OTA-personalised lighting themes to OEM design studios — appeal to the emotion alongside the regulation." },
        ],
        against: [
          { p: "Rural and semi-urban buyers have low willingness to pay for premium lighting features", why: "60% of India's car market is outside top-10 metros; those buyers prioritise fuel efficiency and reliability over advanced lighting.", sowhat: "Avoid designing for rural mass-market; focus the product roadmap on urban and premium segments where the feature is valued." },
          { p: "Night-driving habits differ from Europe — Indian use cases require different beam tuning", why: "Road infrastructure, traffic mix (cyclists, cattle, handcarts) and lighting conditions vary significantly from European roads where ADB is tuned.", sowhat: "Build India-specific beam and detection tuning datasets using Indian road conditions — this becomes a competitive moat." },
          { p: "After-sales lighting repair market dominated by informal local shops — limited brand capture", why: "Most lighting repairs happen at roadside shops using non-OEM parts; electronic controllers rarely go to authorised service.", sowhat: "Ensure control modules are repairable and updatable via authorised workshops — build a service revenue stream around it." },
        ],
      },
      T: {
        for: [
          { p: "Camera-based ADB (adaptive driving beam) is technically validated at India-relevant cost points", why: "ADB using a forward camera (shared with ADAS) is now feasible at ₹3,000–5,000 per vehicle versus standalone ₹12,000+ lidar-based solutions.", sowhat: "Propose camera-fused ADB as the India-cost path — share camera cost with the ADAS field to make the business case viable." },
          { p: "OTA updates enable lighting personalisation as a revenue feature", why: "Software-defined lighting allows OEMs to sell personalised colour themes and animation packs post-sale via the app store.", sowhat: "Build FoD (feature-on-demand) licensing into the lighting-control platform contract — capture a share of post-sale revenue." },
          { p: "Digital twin design reduces homologation cycle time by 40%", why: "Virtual photometric simulation can front-load regulatory compliance testing, cutting physical ARAI test cycles from 12 to 7 months.", sowhat: "Offer digital-twin lighting design support to OEM engineering teams — time-to-market advantage is a genuine commercial differentiator." },
        ],
        against: [
          { p: "Pixel LED matrix requires ASIC-level driver ICs not currently made in India", why: "Matrix lighting controller chips are designed in Europe and manufactured in Asia — no India option exists yet.", sowhat: "Design around available automotive-grade driver ICs; create a migration path to India-made ASICs if ISM programme matures." },
          { p: "Photometric regulation update lag — India may be 2+ cycles behind Europe on lighting norms", why: "AIS adopts UNECE standards with a 2–4 year delay; features already legal in Europe may await AIS approval in India.", sowhat: "Pre-certify products to both AIS current and UNECE upcoming standards — dual certification saves a cycle when India catches up." },
          { p: "Cybersecurity requirements now apply to lighting ECUs as part of R155 scope", why: "Connected lighting controllers that receive OTA updates fall within AIS-189 cybersecurity scope — adding compliance overhead.", sowhat: "Design cybersecurity into the lighting ECU platform from the start; reuse Bosch's CSMS framework from the Connectivity field." },
        ],
      },
      En: {
        for: [
          { p: "LED efficiency reduces vehicle energy consumption, supporting EV range goals", why: "Full-LED headlamps consume 50–70% less power than halogen — directly extending EV range and reducing ICE fuel consumption.", sowhat: "Quantify the LED-to-range conversion for EV OEMs — it becomes a technical selling point in their marketing." },
          { p: "Reduced mercury and toxic chemicals versus traditional HID lamps", why: "LED and matrix technology eliminates HID lamp mercury, reducing disposal hazard and improving RRR (recyclability) compliance.", sowhat: "Support OEM sustainability reports with component-level environmental data; this becomes a supplier assessment input." },
          { p: "Longer LED lifespan reduces replacement frequency and waste", why: "Quality automotive LEDs last the vehicle lifetime (100,000+ hours) versus 500–1,000 hours for halogen — fewer replacements, less waste.", sowhat: "Provide lifecycle data to OEM procurement sustainability teams — durability is a total-cost-of-ownership argument as well as an ESG one." },
        ],
        against: [
          { p: "Glare from improperly aimed LEDs causing road safety concerns", why: "Poorly calibrated LED headlamps are a road safety issue; regulators in India are beginning to flag complaints about brightness.", sowhat: "Ensure Bosch lighting solutions include automatic level compensation; avoid retrofits without proper alignment mechanisms." },
          { p: "Blue-light emission from LED has environmental impact on nocturnal wildlife", why: "LEDs emit higher blue-spectrum light that disrupts nocturnal fauna — relevant for vehicles used near wildlife corridors.", sowhat: "Include amber-spectrum DRL options in the product portfolio for segments operating near protected areas." },
          { p: "Electronic waste from faster lighting-module replacement cycles", why: "Complex matrix modules are not repaired — they are replaced, generating more electronic waste than simple lamp replacements.", sowhat: "Design modular lighting ECUs that allow component-level repair rather than full module replacement." },
        ],
      },
      L: {
        for: [
          { p: "AIS 112 mandates automatic headlamp on (AHO) for all new vehicles", why: "AHO is already mandatory for 2W and applies increasingly to PVs — ensuring lighting-control electronics have a mandatory market.", sowhat: "Package AHO compliance as entry point to a broader lighting-control relationship with OEM lighting teams." },
          { p: "EU lighting regulations (GTR 8/UN R123) becoming India NCAP reference points", why: "As BNCAP aligns with Euro NCAP, the lighting test protocols referenced in Europe will increasingly shape Indian OEM procurement criteria.", sowhat: "Certify to GTR 8 and UN R123 now; this puts Bosch's solutions ahead of Indian regulatory requirements that will follow." },
          { p: "IP and design protection law improvements make adaptive lighting algorithms protectable", why: "India's patent amendment (2021) and design registration improvements make it cost-effective to protect Indian-developed lighting control IP.", sowhat: "File lighting-control algorithm patents in India as well as Germany — India IP protection now has commercial value." },
        ],
        against: [
          { p: "ARAI homologation delays for new lighting technologies can take 12–18 months", why: "ARAI approval processes for novel lighting functions (matrix ADB, communicative lighting) are slow — delaying time-to-market.", sowhat: "Engage ARAI pre-submission with technical briefings; propose a fast-track pilot framework for software-controlled lighting features." },
          { p: "Local-content rules could require lamp-maker partnerships for B2G tenders", why: "Government fleet tenders increasingly require locally assembled lighting systems; Bosch cannot qualify without a lamp-maker ally.", sowhat: "Finalise a lamp-maker alliance before bidding any government fleet or public transport lighting contracts." },
          { p: "Grey market import of European lighting systems creates pricing pressure", why: "Aftermarket imports of EU-spec matrix lighting kits from China at 40–60% below OEM pricing disrupt the premium positioning.", sowhat: "Focus on OEM-line production platforms — aftermarket grey-market competition is irrelevant at the Tier-1 integration level." },
        ],
      },
    },
    swot5: {
      S: [
        { area: "Technology", p: "ADAS camera data reusable for adaptive driving beam control", why: "Bosch's forward-facing cameras already installed for emergency braking and lane-keeping can drive ADB at zero incremental sensor cost.", sowhat: "Price the ADB feature as a software add-on using existing ADAS camera — undercuts standalone ADB solutions by 60%." },
        { area: "Technology", p: "Functional safety culture and ISO 26262 compliance already embedded", why: "Lighting ECUs that receive OTA updates and interact with safety systems must meet functional-safety requirements — Bosch starts with this certified.", sowhat: "Use safety certification as the OEM shortlist entry criterion in markets where lighting meets ADAS interaction." },
        { area: "Process", p: "Established OEM relationships across all major Indian passenger-car OEMs", why: "Bosch supplies ADAS, fuel injection and body electronics to every major OEM — lighting control adds naturally to existing platform bundles.", sowhat: "Cross-sell lighting control in the same OEM platform discussion as ADAS and body electronics — one conversation, three products." },
        { area: "People", p: "Deep India-based photonic and sensing engineering talent at RBEI", why: "Robert Bosch Engineering India (RBEI) has deep sensor-algorithm and embedded-software expertise directly applicable to intelligent lighting control.", sowhat: "Redirect a small RBEI team to lighting-control algorithm development — marginal cost to Bosch, strategic differentiation for OEMs." },
        { area: "Leadership", p: "Global R&D leadership in automotive electronics means India is not starting from zero", why: "Global Bosch has invested decades in lighting control R&D; India commercialisation inherits this IP at marginal localisation cost.", sowhat: "Localise (cost-optimise) existing global lighting IP for India-specific LED drivers and operating conditions — faster than greenfield development." },
      ],
      W: [
        { area: "Market", p: "No existing relationship with Indian lamp-maker Tier-1s (Lumax, Uno Minda, Varroc)", why: "OEM lighting RFQs go through lamp-maker Tier-1s who manage the full optical assembly — Bosch is not in that supply relationship today.", sowhat: "Approach Lumax and Uno Minda as technology partners rather than competitors; offer lighting control embedded in their lamps." },
        { area: "Market", p: "No production reference in Indian OEM lighting platforms currently", why: "Without a single shipped production reference, OEM procurement teams have no basis to evaluate Bosch's lighting claim.", sowhat: "Prioritise landing one lighthouse reference at a Tier-2 OEM within 24 months; the reference unlocks all subsequent pitches." },
        { area: "Technology", p: "No homologation history with ARAI for lighting-specific products in India", why: "Homologation approval depends on track record; new applicants face longer review cycles than established players with ARAI relationships.", sowhat: "Engage an ARAI-experienced homologation consultant for the first India lighting product submission." },
        { area: "Leadership", p: "Lighting treated as a small adjacency, not a strategic priority, internally", why: "Within Bosch India's portfolio priority list, lighting competes for investment with much larger businesses — it may not receive decision-maker attention.", sowhat: "Frame lighting as a software extension of the ADAS and SdV business — it is not a standalone bet but a product-line extension." },
        { area: "Process", p: "Lamp-maker co-development process not yet established — IP and revenue-sharing terms undefined", why: "Without clear co-development agreements with lamp Tier-1s, the partnership model for market entry cannot proceed.", sowhat: "Develop a standard lamp-partner co-development framework with pre-agreed IP terms — speed is critical as the RFQ window is open." },
      ],
      O: [
        { area: "Market", p: "BNCAP 2024 lighting criteria opening safety lighting sourcing decisions at all OEMs", why: "BNCAP's inclusion of AHB scoring means every OEM seeking 5 stars must source a compliant automatic high-beam solution.", sowhat: "Map every OEM platform in active safety-homologation to identify sourcing decisions in progress and enter those conversations." },
        { area: "Technology", p: "Communicative/projection lighting is emerging — no Indian incumbent owns the software layer", why: "Road-to-vehicle and vehicle-to-pedestrian communication via light projection is coming; Indian lamp makers have no software capability.", sowhat: "Develop a communicative-lighting SDK and demonstrate it to OEM design studios — be the software layer before the hardware market forms." },
        { area: "Market", p: "Premium OEMs (BMW, Mercedes, Audi India assembly) require India-sourced alternatives post-PLI", why: "Import-heavy premium-car assembly plants increasingly need India-sourced components to meet local-content thresholds.", sowhat: "Approach premium OEM India assembly plants with locally produced lighting control modules — meets localisation requirement and opens a high-margin slot." },
        { area: "Technology", p: "OTA software update capability enables feature-on-demand lighting revenue post-sale", why: "Connected lighting modules can receive firmware updates; OEMs can charge for additional lighting themes and modes after vehicle delivery.", sowhat: "Propose a revenue-sharing model where Bosch provides the OTA update infrastructure and earns a share of each FoD purchase." },
        { area: "Process", p: "Digital-twin photometric simulation reduces homologation cost for OEM partners", why: "Virtual homologation cuts expensive physical ARAI testing cycles; OEMs that partner with Bosch for this save 6–9 months per programme.", sowhat: "Offer digital-twin homologation support as a free service to close the first partnership deal — the investment is low, the relationship value is high." },
      ],
      T: [
        { area: "Market", p: "Lamp-maker Tier-1s building software teams and could internalise the control layer", why: "Lumax and Uno Minda are actively hiring embedded-software engineers; if they close the control-software gap, Bosch's entry slot disappears.", sowhat: "Move in 12–18 months; the opportunity window closes as incumbents build internal capability." },
        { area: "Technology", p: "Chinese lamp makers entering India with full LED + controller bundles at Indian cost", why: "Hella (owned by Forvia/Faurecia) and Chinese LED module makers are proposing integrated lamp+controller solutions to Indian OEMs at aggressive pricing.", sowhat: "Compete on software depth and safety certification, not price — a price war with a vertically integrated LED-to-controller bundle is unwinnable." },
        { area: "Market", p: "OEM in-housing of lighting ECU design at top-tier OEMs (Tata, Mahindra)", why: "Tata and Mahindra are investing heavily in in-house EE architecture — lighting control may be pulled into captive software teams.", sowhat: "Target mid-tier OEMs (Kia India, Honda Cars India, MG Motor) who lack captive EE teams and will continue to source externally." },
        { area: "Leadership", p: "Slow internal decision to enter via partnership could let the lighthouse deal go to a rival", why: "The BNCAP-driven sourcing window is open now; delayed decision-making allows rivals to lock first-mover OEM platform positions.", sowhat: "Set a clear internal deadline for the lamp-maker partnership decision — the cost of delay is a lost platform generation." },
        { area: "Technology", p: "SoC integration of lighting control into cockpit chips could commoditise the ECU", why: "Qualcomm and NXP are integrating body-electronics functions including lighting control into cockpit SoCs — reducing the standalone ECU market.", sowhat: "Ensure lighting-control software can run on the cockpit SoC if the standalone ECU market shrinks — platform-agnostic software is the hedge." },
      ],
    },
    competitorProfiles: [
      {
        name: "Lumax Industries",
        type: "indian-incumbent",
        listing: "BSE: 517206 / NSE: LUMAXIND",
        revenue: "~₹3,500 Cr / ~$420M (FY2024)",
        headcount: "~5,500",
        profitability: "Net margin ~4–5%",
        cashCow: "Halogen and LED headlamp assemblies for Maruti, Honda, Toyota India",
        emerging: "Matrix/ADB systems for premium segments, EV lighting for Tata/Mahindra",
        rdBets: "Smart lighting ECU development (just started 2024), BNCAP-compliant AHB systems",
        keyPartnerships: "Stanley Electric Japan (technical JV), Lumax-DK (sensors), HP Pelzer",
        vision: "Transform from a lamp assembler to a lighting technology systems company",
        differentiation: "Deep OEM relationships built over 30 years; fastest India-cost delivery; ARAI homologation experience",
        sentiment: "Loved for reliability and responsiveness; criticised for slow technology upgrade cycles and thin software capability",
        indiaStrategy: "Expanding into ADB and matrix lighting through Stanley JV; piloting smart ECU in-house to reduce dependence on European suppliers",
        x_price_position: 4, y_tech_depth: 6,
        moat: "30-year OEM relationships and ARAI homologation track record",
        radar: { tech: 6, price: 7, indiaPresence: 10, service: 8, innovation: 4, ecosystem: 5 },
      },
      {
        name: "Uno Minda",
        type: "indian-incumbent",
        listing: "NSE: UNOMINDA",
        revenue: "~₹16,400 Cr / ~$2B (FY2024, group)",
        headcount: "~23,000",
        profitability: "Net margin ~5–6%",
        cashCow: "Switches, LED lighting and horns for 2W OEMs (Honda, Hero, TVS)",
        emerging: "Smart lighting for PV, EV charging hardware, alloy wheels",
        rdBets: "ADAS-integrated lighting, EV junction boxes, matrix lighting for mid-range PVs",
        keyPartnerships: "Koito Manufacturing Japan (lighting JV), Rinder Spain, Simplex Castings",
        vision: "Be India's most diversified auto-component leader across lighting, charging and electronics",
        differentiation: "Massive 2W platform coverage; recent Koito JV for premium lighting; cost-competitive assembly",
        sentiment: "Strong in 2W; PV customers want more software depth and faster ADB commercialisation",
        indiaStrategy: "Scaling Koito-JV advanced lighting for PV; adding EV charging hardware as adjacency",
        x_price_position: 4, y_tech_depth: 6,
        moat: "India's largest lighting supplier by volume — scale and breadth",
        radar: { tech: 6, price: 7, indiaPresence: 10, service: 7, innovation: 5, ecosystem: 6 },
      },
      {
        name: "Varroc Engineering",
        type: "indian-incumbent",
        listing: "NSE: VARROC",
        revenue: "~₹4,800 Cr / ~$575M (FY2024)",
        headcount: "~9,000",
        profitability: "Near breakeven (recovering from global lighting divestiture)",
        cashCow: "Polymer body parts and mirrors for Bajaj, Royal Enfield; 2W electrical systems",
        emerging: "Premium lighting for PV (post Varroc Lighting divestiture rebuild), EV polymer parts",
        rdBets: "Re-entering premium PV lighting segment post-2022 divestiture; smart LED for 2W EVs",
        keyPartnerships: "Bajaj Auto (strategic), Royal Enfield",
        vision: "Rebuild as an Indian Tier-1 leader in 2W polymer and electrical systems",
        differentiation: "Deep 2W platform relationships; polymer + lighting integration for 2W",
        sentiment: "Respected for 2W expertise; PV lighting capability questioned after 2022 Varroc Lighting sale",
        indiaStrategy: "Focus on 2W EV lighting and polymer; cautious re-entry to PV lighting",
        x_price_position: 5, y_tech_depth: 5,
        moat: "2W OEM depth and polymer integration capability",
        radar: { tech: 5, price: 7, indiaPresence: 8, service: 6, innovation: 4, ecosystem: 4 },
      },
    ],
  },
};

// V7 remaining 13 fields will be added in next release; existing V6 data serves as fallback
Object.assign(V7, {
  cockpit: { pestelFA: null, swot5: null, competitorProfiles: null },
  interior: { pestelFA: null, swot5: null, competitorProfiles: null },
  suspension: { pestelFA: null, swot5: null, competitorProfiles: null },
  connectivity: { pestelFA: null, swot5: null, competitorProfiles: null },
  eca: { pestelFA: null, swot5: null, competitorProfiles: null },
  software: { pestelFA: null, swot5: null, competitorProfiles: null },
  manufacturing: { pestelFA: null, swot5: null, competitorProfiles: null },
  fintech: { pestelFA: null, swot5: null, competitorProfiles: null },
  infrastructure: { pestelFA: null, swot5: null, competitorProfiles: null },
  sustainability: { pestelFA: null, swot5: null, competitorProfiles: null },
  evtol: { pestelFA: null, swot5: null, competitorProfiles: null },
  robotics: { pestelFA: null, swot5: null, competitorProfiles: null },
  health: { pestelFA: null, swot5: null, competitorProfiles: null },
});

/* ════════════════════════════ UI atoms ═══════════════════════════════════ */
/* Hover tooltip — wrap any child; `label` shows in the floating box */
const Tip = ({ label, children }) => {
  const [show, setShow] = React.useState(false);
  return (
    <span className="relative inline-block cursor-help" onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}>
      {children}
      {show && label && (
        <span className="absolute z-50 bottom-full left-0 mb-2 w-72 bg-slate-900 text-white text-xs rounded-xl p-3 shadow-2xl leading-relaxed pointer-events-none">
          {label}
          <span className="absolute top-full left-4 border-4 border-transparent border-t-slate-900" />
        </span>
      )}
    </span>
  );
};

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

const TABS = ["PESTEL", "SWOT", "Market", "Attractiveness", "Competency", "Stakeholders", "Competitors", "Suppliers", "3 Horizons", "Recent Activity", "Methodology", "Recommendation"];

export default function App() {
  const [fieldId, setFieldId] = useState("lighting");
  const [sub, setSub] = useState("All");
  const [tab, setTab] = useState("PESTEL");
  const [showWorking, setShowWorking] = useState(true);
  const [showMacro, setShowMacro] = useState(false);
  const [swotView, setSwotView] = useState("swot"); // "swot" | "tows"
  const field = FIELDS.find(f => f.id === fieldId);
  const d = DATA[fieldId];
  const v6 = V6[fieldId] || {};
  const v7 = (typeof V7 !== "undefined" ? V7[fieldId] : null) || null;
  const hasData = !!d;
  const M = hasData ? computeMatrix(d.criterionScores) : null;
  const stakeScore = hasData ? computeStakeholderScore(d.stakeholders) : null;
  const hScore = hasData ? computeHorizonScore(d.horizons) : null;

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#F7F8FA", fontFamily: "'Segoe UI', system-ui, sans-serif", color: INK }}>
      <div style={{ height: 4, background: GRAD }} />
      <header className="bg-white border-b border-slate-200 px-6 py-3 flex items-center gap-4">
        <div>
          <div className="font-extrabold tracking-tight text-lg leading-none">Search-Field Intelligence</div>
          <div className="text-xs text-slate-500 mt-0.5">Bosch Mobility · India Market · BBM Strategy Agent</div>
        </div>
        <div className="ml-auto flex items-center gap-2 text-xs text-slate-500">
          <span className="w-2 h-2 rounded-full bg-green-500 inline-block" /> One methodology for all fields · scores computed, not generated · Version 1.0
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <aside className="w-64 bg-white border-r border-slate-200 overflow-y-auto py-3 shrink-0">
          <div className="px-4 pb-2 text-[11px] font-bold uppercase tracking-widest text-slate-400">{FIELDS.length} Search Fields</div>
          {FIELDS.map(f => (
            <button key={f.id} onClick={() => { setFieldId(f.id); setSub("All"); setTab("PESTEL"); }}
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
                <div className="space-y-4">
                  <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
                    <button onClick={() => setShowMacro(!showMacro)} className="w-full flex items-center justify-between px-4 py-3">
                      <div className="text-left">
                        <span className="text-sm font-semibold text-slate-800">India Macro Context — shared baseline across all search fields</span>
                        <span className="text-xs text-slate-400 ml-2">verified as of {MACRO.asOf}</span>
                      </div>
                      <span className="text-xs text-teal-700 font-medium">{showMacro ? "collapse ▲" : "expand ▼"}</span>
                    </button>
                    {showMacro && (
                      <div className="px-4 pb-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {Object.entries(MACRO).filter(([k]) => k !== "asOf").map(([dim, rows]) => (
                          <div key={dim} className="border border-slate-200 rounded-lg p-3">
                            <div className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">{dim}</div>
                            {rows.map(r => (
                              <div key={r.k} className="mb-2 last:mb-0">
                                <div className="text-[11px] font-semibold text-slate-700">{r.k}</div>
                                <div className="text-[11px] text-slate-600">{r.v}</div>
                                <div className="text-[10px] text-slate-400">{r.src}</div>
                              </div>
                            ))}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* PESTEL for/against split — uses V7 data when available, falls back to legacy points */}
                  {v7?.pestelFA ? (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      {[["P","Political"],["E","Economic"],["S","Social"],["T","Technological"],["En","Environmental"],["L","Legal"]].map(([k, label]) => {
                        const fa = v7.pestelFA[k] || {};
                        return (
                          <div key={k} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                            <div className="px-4 py-2 border-b border-slate-100 flex items-center justify-between">
                              <h3 className="text-sm font-semibold text-slate-800">{label} — {field.name}</h3>
                              <span className="text-[10px] text-slate-400">3 tailwinds · 3 headwinds</span>
                            </div>
                            <div className="p-3 grid grid-cols-1 md:grid-cols-2 gap-2">
                              {/* Tailwinds */}
                              <div>
                                <div className="text-[10px] font-bold uppercase tracking-widest text-green-700 mb-2 flex items-center gap-1">▲ Tailwinds — working in our favour</div>
                                {(fa.for || []).slice(0,3).map((x, i) => (
                                  <Tip key={i} label={`${x.why}\n\nSO WHAT: ${x.sowhat}`}>
                                    <div className="border border-green-100 bg-green-50/40 rounded-lg p-2.5 mb-2 last:mb-0 hover:border-green-300 transition-colors">
                                      <div className="text-xs font-medium text-slate-800">{x.p}</div>
                                      <div className="text-[11px] text-green-700 mt-1">{x.sowhat}</div>
                                    </div>
                                  </Tip>
                                ))}
                              </div>
                              {/* Headwinds */}
                              <div>
                                <div className="text-[10px] font-bold uppercase tracking-widest text-red-600 mb-2 flex items-center gap-1">▼ Headwinds — working against us</div>
                                {(fa.against || []).slice(0,3).map((x, i) => (
                                  <Tip key={i} label={`${x.why}\n\nSO WHAT: ${x.sowhat}`}>
                                    <div className="border border-red-100 bg-red-50/40 rounded-lg p-2.5 mb-2 last:mb-0 hover:border-red-300 transition-colors">
                                      <div className="text-xs font-medium text-slate-800">{x.p}</div>
                                      <div className="text-[11px] text-red-700 mt-1">{x.sowhat}</div>
                                    </div>
                                  </Tip>
                                ))}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {Object.entries(d.pestel).map(([k, pts]) => (
                      <Card key={k} title={`${k} — ${field.name} specific`}>
                        {pts.map((x, i) => (
                          <Tip key={i} label={x.why ? `WHY: ${x.why}${x.sowhat ? `\n\nSO WHAT: ${x.sowhat}` : ""}` : null}>
                          <div className="border border-slate-200 rounded-lg p-3 mb-2 last:mb-0 hover:border-slate-300 transition-colors">
                            <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
                              {x.cat && <span className="text-[10px] font-bold uppercase tracking-wide text-slate-500 bg-slate-100 rounded px-1.5 py-0.5">{x.cat}</span>}
                              {x.enabler && <Chip tone="violet">enabler</Chip>}
                              <Chip tone={x.i === "high" ? "red" : x.i === "medium" ? "amber" : "slate"}>{x.i}</Chip>
                            </div>
                            <div className="text-sm font-medium">{x.p}{x.c?.length ? <span className="text-slate-400 text-xs font-normal"> [{x.c.join(",")}]</span> : null}</div>
                            {x.why && <div className="text-xs text-slate-600 mt-1.5 flex gap-1.5"><b className="text-teal-700 shrink-0">WHY</b><span>{x.why}</span></div>}
                            {x.sowhat && <div className="text-xs text-slate-600 mt-1 flex gap-1.5"><b className="text-purple-700 shrink-0">SO WHAT</b><span>{x.sowhat}</span></div>}
                            {x.subs?.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-2">
                                {x.subs.map(s => <span key={s} className="text-[10px] text-teal-800 bg-teal-50 border border-teal-100 rounded-full px-2 py-0.5">↳ {s}</span>)}
                              </div>
                            )}
                          </div>
                          </Tip>
                        ))}
                      </Card>
                    ))}
                  </div>
                  )}
                </div>
              )}

              {/* ─────────────── SWOT ─────────────── */}
              {tab === "SWOT" && (
                <>
                <div className="flex gap-1 mb-3">
                  <button onClick={() => setSwotView("swot")} className={`px-3 py-1 rounded-full text-xs font-medium border ${swotView === "swot" ? "bg-slate-900 text-white border-slate-900" : "bg-white border-slate-300 text-slate-600"}`}>SWOT (factors)</button>
                  <button onClick={() => setSwotView("tows")} className={`px-3 py-1 rounded-full text-xs font-medium border ${swotView === "tows" ? "bg-slate-900 text-white border-slate-900" : "bg-white border-slate-300 text-slate-600"}`}>TOWS (strategies)</button>
                </div>
                {swotView === "tows" && d.swot.tows && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    {[
                      ["SO — Strengths × Opportunities", "Use internal strengths to exploit external opportunities", d.swot.tows.SO, "green"],
                      ["ST — Strengths × Threats", "Use internal strengths to avoid or minimise external threats", d.swot.tows.ST, "teal"],
                      ["WO — Weaknesses × Opportunities", "Overcome internal weaknesses by exploiting external opportunities", d.swot.tows.WO, "amber"],
                      ["WT — Weaknesses × Threats", "Overcome internal weaknesses and minimise external threats", d.swot.tows.WT, "red"],
                    ].map(([title, sub, body, tone]) => (
                      <div key={title} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                        <div className="px-4 py-2 border-b border-slate-100">
                          <div className="text-sm font-bold">{title}</div>
                          <div className="text-[11px] text-slate-500">{sub}</div>
                        </div>
                        <div className="p-4 flex gap-2"><Chip tone={tone}>{title.slice(0,2)}</Chip><p className="text-sm text-slate-700">{body}</p></div>
                      </div>
                    ))}
                  </div>
                )}
                {swotView === "swot" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2 text-xs text-slate-500 bg-white border border-slate-200 rounded-lg px-3 py-2">
                    Internal factors (Strengths/Weaknesses) assessed across five areas: <b>People · Technology · Process · Market · Leadership</b>. Hover any point for detailed reasoning.
                  </div>
                  {[["Strengths", (v7?.swot5?.S || d.swot.S), "green"], ["Weaknesses", (v7?.swot5?.W || d.swot.W), "red"], ["Opportunities", (v7?.swot5?.O || d.swot.O), "teal"], ["Threats", (v7?.swot5?.T || d.swot.T), "amber"]].map(([t, items, tone]) => (
                    <Card key={t} title={`${t} — Bosch Mobility India`} right={<span className="text-[10px] text-slate-400">{Math.min(5, items?.length || 0)} of 5</span>}>
                      {(items || []).slice(0, 5).map((x, i) => (
                        <Tip key={i} label={`${x.why ? "WHY: " + x.why : ""}${x.sowhat ? "\n\nSO WHAT: " + x.sowhat : ""}`}>
                        <Reasoned point={x.p} why={x.why} sowhat={x.sowhat}
                          tag={<span className="flex gap-1 items-center"><Chip tone={tone}>{t[0]}</Chip>{x.area && <span className="text-[10px] font-bold uppercase tracking-wide text-slate-500 bg-slate-100 rounded px-1.5 py-0.5">{x.area}</span>}</span>} />
                        </Tip>
                      ))}
                    </Card>
                  ))}
                  {d.swot.targetStrategy && (
                    <div className="md:col-span-2">
                      <Card title="Target Strategy — from factors to action">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div>
                            <div className="text-xs font-bold uppercase tracking-widest text-green-700 mb-2">1 · Growth Strategy — build on strengths</div>
                            {d.swot.targetStrategy.growth.map((g, i) => (
                              <div key={i} className="border border-slate-200 rounded-lg p-3 mb-2 last:mb-0">
                                <div className="text-sm font-medium">{g.lever}</div>
                                <div className="text-xs text-slate-600 mt-1 flex gap-1.5"><b className="text-green-700 shrink-0">ACTION →</b><span>{g.action}</span></div>
                              </div>
                            ))}
                          </div>
                          <div>
                            <div className="text-xs font-bold uppercase tracking-widest text-red-700 mb-2">2 · Improvement Strategy — address weaknesses</div>
                            {d.swot.targetStrategy.improvement.map((g, i) => (
                              <div key={i} className="border border-slate-200 rounded-lg p-3 mb-2 last:mb-0">
                                <div className="text-sm font-medium">{g.gap}</div>
                                <div className="text-xs text-slate-600 mt-1 flex gap-1.5"><b className="text-red-700 shrink-0">ACTION →</b><span>{g.action}</span></div>
                              </div>
                            ))}
                          </div>
                        </div>
                        <div className="text-[11px] text-slate-500 mt-3">3 · Strategic actions are carried into the TOWS view (SO/ST/WO/WT) · 4 · Weakness-closure routes are tracked in the Competency tab gap column.</div>
                      </Card>
                    </div>
                  )}
                  <div className="md:col-span-2">
                    <Card title="Targeted strategy & how the SWOT score was reached">
                      <p className="text-sm mb-2">{d.swot.strategy}</p>
                      <div className="text-xs text-slate-600 bg-slate-50 rounded-lg p-3"><b>Score rationale:</b> {d.swot.scoreRationale}</div>
                    </Card>
                  </div>
                </div>
                )}
                </>
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

                  {d.market.attractiveness && (
                    <div className="lg:col-span-2 space-y-4">
                      <Card title="Market Attractiveness — how this market is expected to evolve"
                        right={<Chip tone={d.market.attractiveness.maturity.startsWith("Emerging") ? "violet" : d.market.attractiveness.maturity.startsWith("Growth") ? "green" : "amber"}>{d.market.attractiveness.maturity}</Chip>}>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                          <div className="border border-slate-200 rounded-lg p-3"><div className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Historical CAGR</div><div className="text-sm font-semibold mt-1">{d.market.attractiveness.histCagr}</div></div>
                          <div className="border border-slate-200 rounded-lg p-3"><div className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Forecast CAGR</div><div className="text-sm font-semibold mt-1">{d.market.attractiveness.fwdCagr}</div></div>
                          <div className="border border-slate-200 rounded-lg p-3"><div className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Market maturity</div><div className="text-sm font-semibold mt-1">{d.market.attractiveness.maturity}</div></div>
                          <div className="border border-slate-200 rounded-lg p-3"><div className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Profitability</div><div className="text-xs text-slate-700 mt-1">{d.market.attractiveness.profitability}</div></div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div className="border border-slate-200 rounded-lg p-3">
                            <div className="text-xs font-bold uppercase tracking-widest text-green-700 mb-2">Growth drivers</div>
                            {d.market.attractiveness.drivers.map(x => <div key={x} className="text-xs text-slate-700 flex gap-1.5 mb-1"><span className="text-green-600">▲</span>{x}</div>)}
                          </div>
                          <div className="border border-slate-200 rounded-lg p-3">
                            <div className="text-xs font-bold uppercase tracking-widest text-red-700 mb-2">Growth constraints</div>
                            {d.market.attractiveness.constraints.map(x => <div key={x} className="text-xs text-slate-700 flex gap-1.5 mb-1"><span className="text-red-600">▼</span>{x}</div>)}
                          </div>
                        </div>
                      </Card>
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <Card title="Market access — how to reach the revenue">
                          <table className="w-full text-xs">
                            <tbody>
                              <tr className="border-t border-slate-100"><td className="py-1.5 pr-2 font-semibold text-slate-500 whitespace-nowrap align-top">Sales channels</td><td className="py-1.5 text-slate-700">{d.market.attractiveness.access.channels}</td></tr>
                              <tr className="border-t border-slate-100"><td className="py-1.5 pr-2 font-semibold text-slate-500 whitespace-nowrap align-top">Distribution partners</td><td className="py-1.5 text-slate-700">{d.market.attractiveness.access.partners}</td></tr>
                              <tr className="border-t border-slate-100"><td className="py-1.5 pr-2 font-semibold text-slate-500 whitespace-nowrap align-top">Customer acquisition cost</td><td className="py-1.5 text-slate-700">{d.market.attractiveness.access.cac}</td></tr>
                            </tbody>
                          </table>
                          <Tip label="The 'value pool' is where the industry's future profits will actually sit — often different from where today's revenue is. Knowing this stops you from fighting for the wrong part of the market.">
                          <div className="text-xs text-slate-600 bg-teal-50 rounded-lg p-3 mt-3 hover:bg-teal-100 transition-colors cursor-help"><b>Value pool — where future profit is created:</b> {d.market.attractiveness.valuePool}</div>
                          </Tip>
                        </Card>
                        <Card title="White space — where the openings are (hover for reasoning)">
                          {d.market.attractiveness.whiteSpace.map((w, i) => (
                            <Tip key={i} label={`WHY THIS OPENING:\n${w.why}`}>
                            <div className="border border-teal-100 bg-teal-50/30 rounded-lg p-3 mb-2 last:mb-0 hover:border-teal-300 hover:bg-teal-50 transition-colors cursor-help">
                              <div className="flex items-start justify-between gap-2">
                                <div className="text-sm font-medium text-slate-800">{w.p}</div>
                                {w.sub && <span className="text-[10px] text-teal-800 bg-teal-100 border border-teal-200 rounded-full px-2 py-0.5 whitespace-nowrap shrink-0">↳ {w.sub}</span>}
                              </div>
                              <div className="text-xs text-teal-800 mt-1">{w.why}</div>
                            </div>
                            </Tip>
                          ))}
                        </Card>
                      </div>

                      {v6.market && (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                          <Card title="Adoption S-curve & business model">
                            <div className="text-[10px] font-bold uppercase tracking-wide text-slate-400 mb-2">Where this market sits on the adoption S-curve</div>
                            <div className="flex gap-1 mb-4">
                              {SCURVE.map(s => (
                                <div key={s} className={`flex-1 text-center text-[10px] rounded py-2 px-1 border ${s === v6.market.scurve ? "bg-slate-900 text-white border-slate-900 font-bold" : "bg-slate-50 text-slate-400 border-slate-200"}`}>{s}</div>
                              ))}
                            </div>
                            <div className="text-[10px] font-bold uppercase tracking-wide text-slate-400 mb-1">Possible business model</div>
                            <p className="text-xs text-slate-700">{v6.market.bizModel}</p>
                          </Card>
                          <Card title="Revenue stream analysis — where the money comes from">
                            {v6.market.revenue.map(r => (
                              <div key={r.k} className="flex items-start gap-3 border-t border-slate-100 first:border-0 py-2">
                                <div className="w-36 shrink-0">
                                  <div className="text-xs font-semibold">{r.k}</div>
                                  <div className="text-[11px] text-teal-700 font-medium">{r.v}</div>
                                </div>
                                <div className="text-xs text-slate-600">{r.note}</div>
                              </div>
                            ))}
                            <div className="text-[10px] text-slate-400 mt-2">Splits are Bosch-addressable revenue-mix estimates for this field, not market-wide shares.</div>
                          </Card>
                        </div>
                      )}
                    </div>
                  )}
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
                  {v6.porterDetail && (
                    <div className="lg:col-span-2">
                      <Card title="Force-by-force breakdown — the factors behind each score">
                        <div className="text-xs text-slate-500 mb-3">Each force is assessed against the standard checklist below. Competitor detail sits in the <b>Competitors</b> tab; supplier detail in the <b>Suppliers</b> tab — both feed this analysis.</div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                          {Object.entries(v6.porterDetail).map(([force, rows]) => (
                            <div key={force} className="border border-slate-200 rounded-lg p-3">
                              <div className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">{force}</div>
                              {rows.map(r => (
                                <div key={r.k} className="mb-2 last:mb-0">
                                  <div className="text-[11px] font-semibold text-slate-700">{r.k}</div>
                                  <div className="text-[11px] text-slate-600">{r.v}</div>
                                </div>
                              ))}
                              <div className="text-[10px] text-slate-400 mt-2 pt-2 border-t border-slate-100">Full checklist: {PORTER_FRAMEWORK[force]?.join(" · ")}</div>
                            </div>
                          ))}
                        </div>
                      </Card>
                    </div>
                  )}
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
                  {v6.competencyAssessment && (
                    <Card title="Competency assessment — nine standard categories, comparable across all search fields">
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                          <thead><tr className="text-left text-slate-400">
                            <th className="pb-2 pr-2">Category</th><th className="pb-2 pr-2">What is needed to succeed here</th>
                            <th className="pb-2 pr-2 text-center">Current</th><th className="pb-2 pr-2 text-center">Target</th>
                            <th className="pb-2 pr-2 text-center">Gap</th><th className="pb-2 text-center">Priority</th>
                          </tr></thead>
                          <tbody>
                            {v6.competencyAssessment.map(r => {
                              const gap = r.target - r.current;
                              return (
                                <tr key={r.cat} className="border-t border-slate-100 align-top">
                                  <td className="py-2 pr-2 font-semibold whitespace-nowrap">{r.cat}</td>
                                  <td className="py-2 pr-2 text-slate-600">{r.need}</td>
                                  <td className="py-2 pr-2 text-center font-medium">{r.current}</td>
                                  <td className="py-2 pr-2 text-center font-medium">{r.target}</td>
                                  <td className={`py-2 pr-2 text-center font-bold ${gap >= 3 ? "text-red-700" : gap >= 1 ? "text-amber-600" : "text-green-700"}`}>{gap > 0 ? `+${gap}` : "—"}</td>
                                  <td className="py-2 text-center"><Chip tone={r.priority === "High" ? "red" : r.priority === "Medium" ? "amber" : "slate"}>{r.priority}</Chip></td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                      <div className="text-xs text-slate-600 bg-teal-50 rounded-lg p-3 mt-3"><b>Strategic recommendation:</b> {v6.competencyRemark}</div>
                      <div className="text-[10px] text-slate-400 mt-2">Scale 0–10 per the BMC search-field methodology. Gap = Target − Current. Categories: {COMPETENCY_CATS.join(" · ")}.</div>
                    </Card>
                  )}
                </div>
              )}

              {/* ─────────────── STAKEHOLDERS (Stakeholder Radar) ─────────────── */}
              {tab === "Stakeholders" && d.stakeholders && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Card title="1 · Internal stakeholders (Bosch)">
                      <div className="text-xs text-slate-500 bg-amber-50 border border-amber-100 rounded-lg p-3">
                        Internal stakeholder mapping (business units, regional leadership, central functions, works councils) is <b>being compiled with the BBM teams</b> and will appear here in the next data release.
                      </div>
                    </Card>
                    {stakeScore && (
                      <Card title="Stakeholder score — computed from the map below">
                        <div className="grid grid-cols-4 gap-2 mb-2">
                          {[["Alignment", stakeScore.alignment, "who wants it"], ["Influence", stakeScore.influence, "our allies' weight"], ["Conflict", stakeScore.conflict, "who opposes"], ["Complexity", stakeScore.complexity, "parties involved"]].map(([k, v, sub]) => (
                            <div key={k} className="border border-slate-200 rounded-lg p-2 text-center">
                              <div className="text-lg font-bold">{v}</div>
                              <div className="text-[10px] font-bold uppercase text-slate-500">{k}</div>
                              <div className="text-[9px] text-slate-400">{sub}</div>
                            </div>
                          ))}
                        </div>
                        <div className="text-xs text-slate-700"><b>Overall: {stakeScore.overall}/10</b> = 0.35×Alignment + 0.35×Influence + 0.2×(10−Conflict) + 0.1×(10−Complexity)</div>
                        <div className="text-[10px] text-slate-400 mt-1">Alignment = influence-weighted share of allies · Conflict = influence-weighted share of blockers · computed live from the stakeholder map.</div>
                      </Card>
                    )}
                  </div>
                  <div className="lg:col-span-2 text-xs text-slate-500 bg-white border border-slate-200 rounded-lg px-3 py-2">
                    <b>2 · External — direct value chain:</b> OEMs (purchasing, engineering, strategy), Tier-1s, fleet operators, end-users, Tier-2/3 suppliers, technology & manufacturing partners, service networks, JV partners. <b>3 · External — broader ecosystem:</b> ministries & regulators (ARAI, NITI Aayog), states, VCs & banks, analysts, SIAM/ACMA, standards bodies (ISO, SAE), media, academia (IITs/IISc), public & activist groups. The map below shows the stakeholders that matter most for this field.
                  </div>
                  <Card title="Stakeholder map — influence × interest">
                    <ResponsiveContainer width="100%" height={320}>
                      <ScatterChart margin={{ top: 10, right: 20, bottom: 30, left: 10 }}>
                        <XAxis type="number" dataKey="interest" name="Interest" domain={[0, 10]} tick={{ fontSize: 11 }} label={{ value: "Interest →", position: "insideBottom", offset: -15, fontSize: 11 }} />
                        <YAxis type="number" dataKey="influence" name="Influence" domain={[0, 10]} tick={{ fontSize: 11 }} label={{ value: "Influence →", angle: -90, position: "insideLeft", fontSize: 11 }} />
                        <Tooltip cursor={{ strokeDasharray: "3 3" }} content={({ payload }) => payload && payload[0] ? <div className="bg-white border border-slate-200 rounded p-2 text-xs shadow"><b>{payload[0].payload.name}</b><div>infl {payload[0].payload.influence} · int {payload[0].payload.interest} · {payload[0].payload.stance}</div></div> : null} />
                        <Scatter data={d.stakeholders}>
                          {d.stakeholders.map((s, i) => <Cell key={i} fill={s.stance === "ally" ? "#5BAA32" : s.stance === "blocker" ? "#E20015" : "#0096A0"} />)}
                        </Scatter>
                      </ScatterChart>
                    </ResponsiveContainer>
                    <div className="text-xs text-slate-500">Green = ally · teal = neutral · red = blocker. Top-right = manage closely (high influence + interest).</div>
                  </Card>
                  <Card title="Stakeholders — why each matters">
                    {d.stakeholders.map(s => (
                      <div key={s.name} className="border border-slate-200 rounded-lg p-3 mb-2 last:mb-0">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-semibold">{s.name}</span>
                          <div className="flex gap-1">
                            <Chip tone="slate">{s.type}</Chip>
                            <Chip tone={s.stance === "ally" ? "green" : s.stance === "blocker" ? "red" : "teal"}>{s.stance}</Chip>
                          </div>
                        </div>
                        <div className="text-[11px] text-slate-400 mt-1">influence {s.influence}/10 · interest {s.interest}/10</div>
                        <p className="text-xs text-slate-600 mt-1">{s.reasoning}</p>
                      </div>
                    ))}
                  </Card>
                </div>
              )}

              {/* ─────────────── COMPETITORS (Perceptual map) ─────────────── */}
              {tab === "Competitors" && d.competitors && (
                <div className="space-y-4">
                  {/* Radar / multi-axis competitive positioning */}
                  {(() => {
                    const radarSrc = v7?.competitorProfiles
                      ? v7.competitorProfiles.filter(c => c.radar).slice(0, 4).map(c => ({ name: c.name.split(" ")[0], ...c.radar, isBosch: /Bosch/.test(c.name) }))
                      : d.competitors.filter(c => !/Bosch/i.test(c.name) || /target/i.test(c.name)).slice(0, 4).map(c => ({
                          name: c.name.split(" ")[0],
                          tech: c.y_tech_depth, price: 10 - c.x_price_position,
                          indiaPresence: Math.round((c.x_price_position + c.y_tech_depth) / 2.5),
                          service: Math.round(c.y_tech_depth * 0.7),
                          innovation: c.y_tech_depth, ecosystem: Math.round(c.y_tech_depth * 0.8),
                          isBosch: /Bosch/.test(c.name),
                        }));
                    const dims = ["tech", "price", "indiaPresence", "service", "innovation", "ecosystem"];
                    const dimLabels = { tech: "Tech depth", price: "Cost edge", indiaPresence: "India presence", service: "Service depth", innovation: "Innovation pace", ecosystem: "Ecosystem" };
                    const radarData = dims.map(d => ({ dim: dimLabels[d], ...Object.fromEntries(radarSrc.map(c => [c.name, c[d] || 5])) }));
                    const colors = ["#7A1FA2", "#0096A0", "#94A3B8", "#D97706", "#E20015"];
                    return (
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <Card title="Competitive positioning — 6 dimensions at a glance">
                          <ResponsiveContainer width="100%" height={300}>
                            <RadarChart data={radarData}>
                              <PolarGrid />
                              <PolarAngleAxis dataKey="dim" tick={{ fontSize: 10 }} />
                              <PolarRadiusAxis domain={[0, 10]} tick={false} axisLine={false} />
                              {radarSrc.map((c, i) => (
                                <Radar key={c.name} name={c.name} dataKey={c.name} stroke={colors[i]} fill={colors[i]} fillOpacity={c.isBosch ? 0.2 : 0.07} strokeWidth={c.isBosch ? 2.5 : 1.5} strokeDasharray={c.isBosch ? "0" : "4 2"} />
                              ))}
                              <Tooltip />
                            </RadarChart>
                          </ResponsiveContainer>
                          <div className="flex flex-wrap gap-2 mt-1">
                            {radarSrc.map((c, i) => <span key={c.name} className="text-[10px] flex items-center gap-1"><span className="w-3 h-0.5 inline-block" style={{ background: colors[i] }} />{c.name}{c.isBosch ? " (target)" : ""}</span>)}
                          </div>
                          <div className="text-[10px] text-slate-400 mt-2">Solid Bosch line vs dashed rivals. Scores 1–10 derived from framework analysis (tech depth, cost position, India service coverage, innovation pace, platform ecosystem strength). Hover a point for the value.</div>
                          {d.competitorWhiteSpace && <div className="text-xs text-slate-600 bg-teal-50 rounded-lg p-3 mt-2"><b>Where Bosch should aim:</b> {d.competitorWhiteSpace}</div>}
                        </Card>
                        <Card title="Market dynamics">
                          <table className="w-full text-xs mb-3">
                            <tbody>
                              {v6.competitorDynamics && <>
                                <tr className="border-t border-slate-100"><td className="py-1.5 pr-2 font-semibold text-slate-500 whitespace-nowrap align-top">Players</td><td className="py-1.5 text-slate-700">{v6.competitorDynamics.count}</td></tr>
                                <tr className="border-t border-slate-100"><td className="py-1.5 pr-2 font-semibold text-slate-500 whitespace-nowrap align-top">Concentration</td><td className="py-1.5 text-slate-700">{v6.competitorDynamics.concentration}</td></tr>
                                <tr className="border-t border-slate-100"><td className="py-1.5 pr-2 font-semibold text-slate-500 whitespace-nowrap align-top">Where to win</td><td className="py-1.5 text-slate-700">{v6.competitorDynamics.winWhere}</td></tr>
                                <tr className="border-t border-slate-100"><td className="py-1.5 pr-2 font-semibold text-slate-500 whitespace-nowrap align-top">Positioning</td><td className="py-1.5 text-slate-700">{v6.competitorDynamics.positioning}</td></tr>
                              </>}
                            </tbody>
                          </table>
                          {v6.competitorAssessment && (
                            <div className="space-y-2">
                              <div className="border border-slate-200 rounded-lg p-2.5"><div className="text-[10px] font-bold uppercase text-green-700 mb-1">Their strengths — hard to beat</div><p className="text-xs text-slate-600">{v6.competitorAssessment.strengths}</p></div>
                              <div className="border border-slate-200 rounded-lg p-2.5"><div className="text-[10px] font-bold uppercase text-red-700 mb-1">Their weaknesses — where customers complain</div><p className="text-xs text-slate-600">{v6.competitorAssessment.weaknesses}</p></div>
                              <div className="border border-slate-200 rounded-lg p-2.5"><div className="text-[10px] font-bold uppercase text-teal-700 mb-1">Our opportunities — exploit now</div><p className="text-xs text-slate-600">{v6.competitorAssessment.opportunities}</p></div>
                              <div className="border border-slate-200 rounded-lg p-2.5"><div className="text-[10px] font-bold uppercase text-amber-700 mb-1">Our threats — their moves that hurt us</div><p className="text-xs text-slate-600">{v6.competitorAssessment.threats}</p></div>
                            </div>
                          )}
                        </Card>
                      </div>
                    );
                  })()}

                  {/* Detailed competitor profile cards */}
                  <div className="text-sm font-semibold text-slate-700 mt-2 mb-1">Competitor profiles — who they are, how they compete, what they plan</div>
                  {(v7?.competitorProfiles || d.competitors.filter(c => !/Bosch/i.test(c.name) && !/target/i.test(c.name))).map((cmp, idx) => {
                    const isRich = !!cmp.cashCow;
                    return (
                      <div key={cmp.name || idx} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                        <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold">{cmp.name}</span>
                            <Chip tone={cmp.type === "global" ? "violet" : cmp.type === "startup" ? "teal" : "slate"}>{cmp.type}</Chip>
                            {isRich && cmp.listing && <span className="text-[10px] text-slate-400">{cmp.listing}</span>}
                          </div>
                          {isRich && (
                            <div className="flex gap-3 text-[10px] text-slate-500">
                              {cmp.revenue && <span><b>Rev</b> {cmp.revenue}</span>}
                              {cmp.headcount && <span><b>Staff</b> {cmp.headcount}</span>}
                              {cmp.profitability && <span><b>Profit</b> {cmp.profitability}</span>}
                            </div>
                          )}
                        </div>
                        <div className="p-4">
                          {isRich ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
                              <div><span className="font-semibold text-slate-500">Cash cow</span><p className="text-slate-700 mt-0.5">{cmp.cashCow}</p></div>
                              <div><span className="font-semibold text-slate-500">Emerging bets</span><p className="text-slate-700 mt-0.5">{cmp.emerging}</p></div>
                              <div><span className="font-semibold text-slate-500">R&D focus</span><p className="text-slate-700 mt-0.5">{cmp.rdBets}</p></div>
                              <div><span className="font-semibold text-slate-500">Strategic vision</span><p className="text-slate-700 mt-0.5">{cmp.vision}</p></div>
                              <div><span className="font-semibold text-slate-500">Key partnerships</span><p className="text-slate-700 mt-0.5">{cmp.keyPartnerships}</p></div>
                              <div><span className="font-semibold text-slate-500">How they differentiate</span><p className="text-slate-700 mt-0.5">{cmp.differentiation}</p></div>
                              {cmp.indiaStrategy && <div className="md:col-span-2"><span className="font-semibold text-slate-500">India strategy</span><p className="text-slate-700 mt-0.5">{cmp.indiaStrategy}</p></div>}
                              {cmp.sentiment && <div className="md:col-span-1"><span className="font-semibold text-slate-500">Customer sentiment</span><p className="text-slate-700 mt-0.5">{cmp.sentiment}</p></div>}
                            </div>
                          ) : (
                            <div>
                              <p className="text-xs text-slate-700">{cmp.moat}</p>
                              {cmp.reasoning && <p className="text-xs text-slate-600 mt-1">{cmp.reasoning}</p>}
                            </div>
                          )}
                          {isRich && cmp.moat && (
                            <div className="mt-3 bg-slate-50 rounded-lg px-3 py-2 text-xs text-slate-700"><b className="text-slate-500">MOAT</b> {cmp.moat}</div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* ─────────────── SUPPLIERS (Kraljic Matrix) ─────────────── */}
              {tab === "Suppliers" && d.suppliers && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <Card title="Kraljic matrix — supply risk × profit impact">
                    <ResponsiveContainer width="100%" height={320}>
                      <ScatterChart margin={{ top: 10, right: 20, bottom: 30, left: 10 }}>
                        <XAxis type="number" dataKey="supply_risk" name="Supply risk" domain={[0, 10]} tick={{ fontSize: 11 }} label={{ value: "Supply risk →", position: "insideBottom", offset: -15, fontSize: 11 }} />
                        <YAxis type="number" dataKey="profit_impact" name="Profit impact" domain={[0, 10]} tick={{ fontSize: 11 }} label={{ value: "Profit impact →", angle: -90, position: "insideLeft", fontSize: 11 }} />
                        <Tooltip cursor={{ strokeDasharray: "3 3" }} content={({ payload }) => payload && payload[0] ? <div className="bg-white border border-slate-200 rounded p-2 text-xs shadow"><b>{payload[0].payload.input}</b><div>{payload[0].payload.quadrant}</div></div> : null} />
                        <Scatter data={d.suppliers}>
                          {d.suppliers.map((s, i) => <Cell key={i} fill={s.quadrant === "strategic" ? "#E20015" : s.quadrant === "bottleneck" ? "#D97706" : s.quadrant === "leverage" ? "#0096A0" : "#94A3B8"} />)}
                        </Scatter>
                      </ScatterChart>
                    </ResponsiveContainer>
                    <div className="text-xs text-slate-500">Red = strategic · amber = bottleneck · teal = leverage · grey = non-critical.</div>
                  </Card>
                  <Card title="Supplier inputs — strategy by quadrant">
                    {d.suppliers.map(s => (
                      <div key={s.input} className="border border-slate-200 rounded-lg p-3 mb-2 last:mb-0">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-semibold">{s.input}</span>
                          <Chip tone={s.quadrant === "strategic" ? "red" : s.quadrant === "bottleneck" ? "amber" : s.quadrant === "leverage" ? "teal" : "slate"}>{s.quadrant}</Chip>
                        </div>
                        <div className="text-[11px] text-slate-400 mt-1">supply risk {s.supply_risk}/10 · profit impact {s.profit_impact}/10</div>
                        <p className="text-xs text-slate-600 mt-1">{s.reasoning}</p>
                      </div>
                    ))}
                  </Card>
                  <div className="lg:col-span-2">
                    <Card title="Kraljic quadrants — what each one means and how to act">
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                        {KRALJIC_LEGEND.map(k => (
                          <div key={k.q} className="border border-slate-200 rounded-lg p-3">
                            <div className="flex items-center gap-2 mb-1">
                              <Chip tone={k.q === "strategic" ? "red" : k.q === "bottleneck" ? "amber" : k.q === "leverage" ? "teal" : "slate"}>{k.q}</Chip>
                            </div>
                            <div className="text-[10px] text-slate-400 mb-1">{k.where}</div>
                            <div className="text-xs text-slate-700">{k.meaning}</div>
                            <div className="text-xs text-slate-600 mt-1.5"><b className="text-slate-500">ACT →</b> {k.strategy}</div>
                          </div>
                        ))}
                      </div>
                    </Card>
                  </div>
                  {v6.supplierAnalysis && (
                    <div className="lg:col-span-2 grid grid-cols-1 lg:grid-cols-2 gap-4">
                      <Card title="Supplier landscape — by type">
                        <table className="w-full text-xs">
                          <tbody>
                            <tr className="border-t border-slate-100"><td className="py-1.5 pr-2 font-semibold text-slate-500 whitespace-nowrap align-top">Technology / service & infra</td><td className="py-1.5 text-slate-700">{v6.supplierAnalysis.tech}</td></tr>
                            <tr className="border-t border-slate-100"><td className="py-1.5 pr-2 font-semibold text-slate-500 whitespace-nowrap align-top">Component suppliers</td><td className="py-1.5 text-slate-700">{v6.supplierAnalysis.components}</td></tr>
                            <tr className="border-t border-slate-100"><td className="py-1.5 pr-2 font-semibold text-slate-500 whitespace-nowrap align-top">Manufacturers</td><td className="py-1.5 text-slate-700">{v6.supplierAnalysis.manufacturers}</td></tr>
                          </tbody>
                        </table>
                      </Card>
                      <Card title="Localization view & where Bosch should play">
                        <div className="border border-slate-200 rounded-lg p-3 mb-2">
                          <div className="text-[10px] font-bold uppercase text-slate-500 mb-1">Is localization worth it?</div>
                          <p className="text-xs text-slate-600">{v6.supplierAnalysis.localization}</p>
                        </div>
                        <div className="text-xs text-slate-600 bg-teal-50 rounded-lg p-3"><b>Strategic recommendation:</b> {v6.supplierAnalysis.recommendation}</div>
                      </Card>
                    </div>
                  )}
                </div>
              )}

              {/* ─────────────── 3 HORIZONS ─────────────── */}
              {tab === "3 Horizons" && (
                <div className="space-y-4">
                  {hScore && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      <Card title="Horizon leverage — where this field's pipeline sits">
                        <div className="flex h-8 rounded-lg overflow-hidden mb-2">
                          {hScore.p1 > 0 && <div className="flex items-center justify-center text-white text-xs font-bold" style={{ width: `${hScore.p1}%`, background: "#5BAA32" }}>H1 {hScore.p1}%</div>}
                          {hScore.p2 > 0 && <div className="flex items-center justify-center text-white text-xs font-bold" style={{ width: `${hScore.p2}%`, background: "#0096A0" }}>H2 {hScore.p2}%</div>}
                          {hScore.p3 > 0 && <div className="flex items-center justify-center text-white text-xs font-bold" style={{ width: `${hScore.p3}%`, background: "#7A1FA2" }}>H3 {hScore.p3}%</div>}
                        </div>
                        <p className="text-xs text-slate-600">
                          {hScore.p1 >= 50 ? "Heavily leveraged in H1 — revenue is near-term but the field must keep feeding H2/H3." :
                           hScore.p3 >= 50 ? "Heavily leveraged in H3 — mostly future options; treat investment as optionality." :
                           hScore.p2 >= 50 ? "Weighted toward H2 — the build-out window is 2–5 years; act on triggers." :
                           "Balanced across horizons — near-term revenue funds the future pipeline; the healthiest profile."}
                        </p>
                      </Card>
                      <Card title="Tech roadmap depth score — computed">
                        <div className="flex items-center gap-4">
                          <div className="text-4xl font-bold">{hScore.depth}<span className="text-base text-slate-400 font-medium">/10</span></div>
                          <div className="text-xs text-slate-600">
                            <div className="font-mono bg-slate-50 rounded p-2">depth = 2×H1({hScore.n1}) + 1.5×H2({hScore.n2}) + 1×H3({hScore.n3}) {hScore.n1 && hScore.n2 && hScore.n3 ? "+ 1 (all horizons filled)" : ""} · capped at 10</div>
                            <div className="mt-1 text-slate-500">Counts pipeline items per horizon, weighted toward monetisable ones. Computed live — not hand-set.</div>
                          </div>
                        </div>
                      </Card>
                    </div>
                  )}
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
                  <Card title="How the 3-Horizons score was reached">
                    <p className="text-xs text-slate-600">{d.horizons.rationale}</p>
                  </Card>
                  {v6.research && (
                    <Card title="Research vs industry — is the lab ahead of the market?">
                      <p className="text-xs text-slate-700 mb-1">{v6.research.note}</p>
                      <div className="text-xs text-slate-600 bg-teal-50 rounded-lg p-3"><b>Gap read:</b> {v6.research.gap}</div>
                      <div className="text-[10px] text-slate-400 mt-2">Production version correlates patent filings and research publications against industry announcements per sub-field (Lens/Google Patents + Semantic Scholar feeds).</div>
                    </Card>
                  )}
                  {v6.techGrowth && (
                    <Card title="Technology growth potential — is this proven and ready to scale?">
                      <div className="text-xs text-slate-700 bg-slate-50 rounded-lg p-3 mb-3"><b>Is it proven?</b> {v6.techGrowth.proven}</div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                        <div className="border border-slate-200 rounded-lg p-3">
                          <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">Technology maturity</div>
                          {v6.techGrowth.maturity.map(m => <div key={m.k} className="mb-1.5 last:mb-0"><span className="text-[11px] font-semibold text-slate-700">{m.k}: </span><span className="text-[11px] text-slate-600">{m.v}</span></div>)}
                        </div>
                        <div className="border border-slate-200 rounded-lg p-3">
                          <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">Innovation — who is investing</div>
                          {v6.techGrowth.innovation.map(m => <div key={m.k} className="mb-1.5 last:mb-0"><span className="text-[11px] font-semibold text-slate-700">{m.k}: </span><span className="text-[11px] text-slate-600">{m.v}</span></div>)}
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                        <div className="border border-slate-200 rounded-lg p-3"><div className="text-[10px] font-bold uppercase text-slate-500 mb-1">Adoption potential</div><p className="text-[11px] text-slate-600">{v6.techGrowth.adoption}</p></div>
                        <div className="border border-slate-200 rounded-lg p-3"><div className="text-[10px] font-bold uppercase text-slate-500 mb-1">Technology evolution</div><p className="text-[11px] text-slate-600">{v6.techGrowth.evolution}</p></div>
                        <div className="border border-slate-200 rounded-lg p-3"><div className="text-[10px] font-bold uppercase text-slate-500 mb-1">Ecosystem maturity</div><p className="text-[11px] text-slate-600">{v6.techGrowth.ecosystem}</p></div>
                      </div>
                      <div className="border border-red-100 bg-red-50/40 rounded-lg p-3">
                        <div className="text-[10px] font-bold uppercase text-red-700 mb-1">Risk assessment</div>
                        {v6.techGrowth.risks.map(r => <div key={r} className="text-[11px] text-slate-600 flex gap-1.5 mb-1 last:mb-0"><span>⚠</span>{r}</div>)}
                      </div>
                    </Card>
                  )}
                </div>
              )}

              {/* ─────────────── RECENT ACTIVITY ─────────────── */}
              {tab === "Recent Activity" && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <Card title="Impact quadrant — who does each development help?">
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          ["Field ▼ · Bosch ▲", a => a.sf === "-" && a.bosch === "+", "bg-teal-50 border-teal-100"],
                          ["Field ▲ · Bosch ▲", a => a.sf === "+" && (a.bosch === "+" || a.bosch === "0"), "bg-green-50 border-green-100"],
                          ["Field ▼ · Bosch ▼", a => a.sf === "-" && (a.bosch === "-" || a.bosch === "0"), "bg-red-50 border-red-100"],
                          ["Field ▲ · Bosch ▼", a => a.sf === "+" && a.bosch === "-", "bg-amber-50 border-amber-100"],
                        ].map(([label, test, cls]) => (
                          <div key={label} className={`border rounded-lg p-2 min-h-[90px] ${cls}`}>
                            <div className="text-[10px] font-bold text-slate-500 mb-1">{label}</div>
                            {(v6.activityMeta || []).map((m, i) => test(m) && d.activity[i] ? (
                              <div key={i} className="text-[10px] text-slate-700 mb-1">• {d.activity[i].t.length > 70 ? d.activity[i].t.slice(0, 70) + "…" : d.activity[i].t}</div>
                            ) : null)}
                          </div>
                        ))}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-2">X-axis: good (▲) or bad (▼) for the search field · Y-axis: good or bad for Bosch's position in it. A field can advance while Bosch's position weakens — those are the amber alerts.</div>
                    </Card>
                    {v6.activityTrend && (
                      <Card title="Activity level over time — is this sector heating up?">
                        <ResponsiveContainer width="100%" height={200}>
                          <BarChart data={v6.activityTrend} margin={{ left: 0, right: 10 }}>
                            <XAxis dataKey="p" tick={{ fontSize: 11 }} />
                            <YAxis width={28} tick={{ fontSize: 11 }} />
                            <Tooltip formatter={v => [`${v} tracked developments`, ""]} />
                            <Bar dataKey="n" radius={[4, 4, 0, 0]} fill="#0096A0" />
                          </BarChart>
                        </ResponsiveContainer>
                        <div className="text-xs text-slate-600">{v6.activityTrend[2] && v6.activityTrend[1] && v6.activityTrend[2].n >= 2 * v6.activityTrend[1].n ? "Activity has more than doubled versus the previous period — this sector is clearly accelerating." : "Activity is growing steadily — the sector is active but not yet spiking."}</div>
                        <div className="text-[10px] text-slate-400 mt-1">Counts of tracked market/policy/competitor developments per period (demo estimates; production counts live feed items).</div>
                      </Card>
                    )}
                  </div>
                  <Card title="Recent activity — with impact reads (live feed in production: Google News RSS + GDELT)">
                    <div className="space-y-3">
                      {d.activity.map((a, i) => {
                        const m = v6.activityMeta?.[i];
                        return (
                          <div key={i} className="flex gap-3 items-start border-b border-slate-100 pb-3 last:border-0">
                            <div className="text-[11px] text-slate-400 w-24 shrink-0 pt-0.5">{a.d}</div>
                            <div className="flex-1">
                              <div className="text-sm font-medium">{a.t}</div>
                              <div className="text-xs text-slate-400">{a.s}</div>
                              {m && <div className="text-xs text-slate-600 mt-1 flex gap-1.5"><b className="text-purple-700 shrink-0">IMPACT</b><span>{m.impact}</span></div>}
                            </div>
                            {m && <div className="flex gap-1 shrink-0">
                              <Chip tone={m.sf === "+" ? "green" : m.sf === "-" ? "red" : "slate"}>field {m.sf === "+" ? "▲" : m.sf === "-" ? "▼" : "–"}</Chip>
                              <Chip tone={m.bosch === "+" ? "green" : m.bosch === "-" ? "red" : "slate"}>Bosch {m.bosch === "+" ? "▲" : m.bosch === "-" ? "▼" : "–"}</Chip>
                            </div>}
                          </div>
                        );
                      })}
                    </div>
                  </Card>
                </div>
              )}

              {/* ─────────────── METHODOLOGY ─────────────── */}
              {tab === "Methodology" && <Methodology />}

              <div className="mt-6 bg-white rounded-xl border border-slate-200 p-4">
                <div className="text-xs font-semibold text-slate-600 mb-2">Sources &amp; citations</div>
                <div className="flex flex-wrap gap-x-4 gap-y-1">
                  {d.sources.map((s, i) => {
                    const srcObj = v7?.sources?.[i];
                    const url = srcObj?.url || (typeof s === "object" ? s.url : null);
                    const label = typeof s === "object" ? s.label : s;
                    return (
                      <span key={i} className="text-[11px] text-slate-500">
                        <span className="text-slate-400 font-mono mr-1">[{i + 1}]</span>
                        {url
                          ? <a href={url} target="_blank" rel="noopener noreferrer" className="text-teal-700 hover:text-teal-900 hover:underline">{label}</a>
                          : <Tip label="This source is cited in the demo data. In the production system, this links to the live document or press release.">{label}<span className="ml-1 text-slate-300 cursor-help">?</span></Tip>
                        }
                      </span>
                    );
                  })}
                </div>
                <div className="mt-3 text-[10px] text-slate-400 border-t border-slate-100 pt-2">
                  ⚠ All market-size figures and CAGRs in this demo are illustrative estimates based on the stated sources and analyst benchmarks — they are labelled "estimate" where not directly sourced. Production version pulls live data with full URL citations per claim. Hover any source label to see availability status.
                </div>
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
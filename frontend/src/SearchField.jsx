import React, { useState } from "react";
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, LabelList,
  ScatterChart, Scatter,
} from "recharts";
import { GRAD, INK, computeHorizonScore, porterFromSubFactors, pickBand, avg, PESTEL_IMPACT_LABELS, PESTEL_CERTAINTY_LABELS, PESTEL_BANDS, computePESTELIndex, SWOT_IMPACT_LABELS, SWOT_PROB_LABELS, SWOT_QUADRANTS, SPI_BANDS, computeSWOTPosture, SCURVE_LABELS, REVENUE_QUALITY_LABELS, PROFITABILITY_LABELS, MAI_BANDS, samScoreFromUSD, cagrScoreFromPct, computeMAS, IAI_BANDS, computeIAI, COMPETENCY_AREAS, COMPETENCY_LEVEL_LABELS, COMPETENCY_WEIGHT_PROFILES, CGI_BANDS, computeCGI, STAKEHOLDER_CATEGORIES, SVI_BANDS, computeSVI, THREAT_MATRIX, competitorThreat, THREAT_LEVEL_DEFS, POSITION_RANK, THREAT_LEVEL_LEGEND, threatTone, ADVANTAGE_MATRIX, boschAdvantage, SVS_LABELS, CPI_BANDS, computeCPI, SCVI_MATRIX, SCVI_BANDS, computeSCVI, TPS_MATRIX, TPI_BANDS, computeTPI, MGI_BANDS, computeMGI, PORTER_FRAMEWORK, KRALJIC_LEGEND, SCURVE, COMPETENCY_CATS } from "./engine.js";
import { FIELDS, MACRO, DATA, V6, V7, V8, SUB, PORTFOLIO, PORTFOLIO_STATS, INDEX_KEYS, indexRank, computeAllIndices } from "./store.js";
import { U } from "./sources.js";

/* UI of the Search-Field Intelligence board. Migrated from the static board on
   2026-09-24 (tools/split_frontend.py); this file is now the source. The data
   it reads comes from the API via store.js, not from literals in this file. */

/* ════════════════════════════ UI atoms ═══════════════════════════════════ */
/* Hover tooltip — wrap any child; `label` shows in the floating box.
   Opens after a short dwell so tooltips don't flash while the pointer crosses
   a dense table; closes immediately on leave. */
const TIP_DELAY_MS = 450;
const Tip = ({ label, children, delay = TIP_DELAY_MS }) => {
  // Fixed-position tooltip: measured against the viewport at the moment it opens,
  // so it can never be clipped by card borders, overflow containers or scroll areas.
  const [pos, setPos] = React.useState(null);
  const ref = React.useRef(null);
  const timer = React.useRef(null);

  const open = () => {
    const r = ref.current?.getBoundingClientRect();
    if (!r) return;
    const w = 288; // matches w-72
    const left = Math.max(8, Math.min(r.left, window.innerWidth - w - 8));
    const below = r.top < 280; // not enough room above the trigger → open downwards
    setPos({
      left, below,
      top: below ? r.bottom + 8 : null,
      bottom: below ? null : window.innerHeight - r.top + 8,
      maxH: Math.max(120, (below ? window.innerHeight - r.bottom : r.top) - 24),
    });
  };
  const onEnter = () => {
    clearTimeout(timer.current);
    timer.current = setTimeout(open, delay);
  };
  const onLeave = () => {
    clearTimeout(timer.current);
    setPos(null);
  };
  React.useEffect(() => () => clearTimeout(timer.current), []);

  return (
    <span ref={ref} className="relative inline-block cursor-help" onMouseEnter={onEnter} onMouseLeave={onLeave}>
      {children}
      {pos && label && (
        <span
          className="fixed z-[999] w-72 bg-slate-900 text-white text-xs rounded-xl p-3 shadow-2xl leading-relaxed pointer-events-none whitespace-pre-line overflow-hidden tip-in"
          style={{ left: pos.left, top: pos.top ?? "auto", bottom: pos.bottom ?? "auto", maxHeight: pos.maxH }}
        >
          {label}
        </span>
      )}
    </span>
  );
};

/* Inline citation marker — reviewers asked to see the source next to the claim
   rather than having to match a bracketed number against a list at the bottom
   of the page. Hover names the source; click opens it where a URL exists. */
const Cite = ({ ids, fieldId }) => {
  if (!ids?.length) return null;
  const labels = DATA[fieldId]?.sources || [];
  const urls = V7[fieldId]?.sources || [];
  return (
    <span className="inline-flex flex-wrap gap-0.5 ml-1 align-baseline">
      {ids.map(i => {
        const label = labels[i - 1];
        const url = urls[i - 1]?.url;
        const body = (
          <span className={`text-[10px] font-mono px-1 rounded border ${url ? "text-teal-700 border-teal-200 bg-teal-50 hover:bg-teal-100" : "text-slate-500 border-slate-200 bg-slate-50"}`}>
            {i}
          </span>
        );
        return (
          <Tip key={i} label={label ? `Source [${i}] — ${label}${url ? `\n\n${url}\n\nClick to open.` : "\n\nNo URL on file for this source."}` : `Source [${i}] — not listed for this field.`}>
            {url
              ? <a href={url} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}>{body}</a>
              : body}
          </Tip>
        );
      })}
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

/* Where this field sits against the other 14 on the same index.
   Absolute values cluster near zero on several indices, so this strip is what
   actually lets a reviewer tell two fields apart. */
const PortfolioStrip = ({ indexKey, fieldId, color }) => {
  const st = PORTFOLIO_STATS[indexKey];
  if (!st || st.n < 3) return null;
  const rk = indexRank(indexKey, fieldId);
  const lo = Math.min(st.min, -0.05), hi = Math.max(st.max, 0.05);
  const at = v => `${Math.max(2, Math.min(98, ((v - lo) / (hi - lo)) * 100))}%`;
  const zeroPct = lo < 0 && hi > 0 ? at(0) : null;
  return (
    <Tip label={`Portfolio position — ${st.label}\n\nThis field ranks ${rk ? `${rk.rank} of ${rk.of}` : "—"}.\nObserved across all ${st.n} fields: lowest ${st.min}, highest ${st.max}, average ${st.mean}.\n\nThe fields occupy ${Math.round(st.spread * 100)}% of the −1…+1 scale on this index, which makes it a ${st.power.toLowerCase()}. ${st.spread < 0.35 ? "Small differences here are not meaningful on their own — read them alongside the stronger separators." : "Differences here are meaningful and can carry a decision."}`}>
      <div className="mt-2 cursor-help">
        <div className="flex items-center justify-between text-[9px] text-slate-400 mb-1">
          <span>{st.min}</span>
          <span className="font-semibold text-slate-500">{rk ? `rank ${rk.rank}/${rk.of}` : ""}</span>
          <span>{st.max}</span>
        </div>
        <div className="relative h-4 rounded bg-slate-100">
          {zeroPct && <div className="absolute top-0 bottom-0 w-px bg-slate-300" style={{ left: zeroPct }} />}
          {st.rows.map(r => (
            <span key={r.id}
              className="absolute top-1/2 rounded-full"
              style={{
                left: at(r.v), transform: "translate(-50%,-50%)",
                width: r.id === fieldId ? 11 : 6, height: r.id === fieldId ? 11 : 6,
                background: r.id === fieldId ? (color || INK) : "#CBD5E1",
                border: r.id === fieldId ? "2px solid #fff" : "none",
                boxShadow: r.id === fieldId ? "0 0 0 1.5px " + (color || INK) : "none",
                zIndex: r.id === fieldId ? 2 : 1,
              }} />
          ))}
        </div>
      </div>
    </Tip>
  );
};

/* One card per independent V8 index — score, verdict/quadrant label, colour,
   formula on hover, and the field's rank against the rest of the portfolio. */
const IndexCard = ({ title, score, scoreMax = 5, band, formula, tabTarget, onGoTo, indexKey, fieldId, fieldName }) => {
  const st = indexKey ? PORTFOLIO_STATS[indexKey] : null;
  const rk = indexKey && fieldId ? indexRank(indexKey, fieldId) : null;
  const g = indexKey ? GLOSSARY[indexKey.toUpperCase()] : null;
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
      <div className="flex items-center justify-between mb-1 gap-1">
        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
          {g ? <Tip label={`${g.t}\n\n${g.d}`}><span className="border-b border-dotted border-slate-300 cursor-help">{title}</span></Tip> : title}
        </span>
        {tabTarget && <button onClick={() => onGoTo(tabTarget)} className="text-[10px] text-teal-700 hover:underline shrink-0">detail →</button>}
      </div>
      {score == null ? (
        <div className="text-xs text-slate-400 italic py-2">Scoring data not yet compiled for this field.</div>
      ) : (
        <>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-extrabold" style={{ color: band?.color || INK }}>{score}</span>
            {scoreMax != null && <span className="text-xs text-slate-400">/ {scoreMax}</span>}
            {rk && (
              <Tip label={`This field ranks ${rk.rank} of ${rk.of} on this index — it beats ${rk.of - rk.rank} of the other fields.\n\nRead the rank before the raw number. Most scores cluster near zero because of how the arithmetic works, so the rank is usually the more useful signal.`}>
                <span className="ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded-full cursor-help"
                  style={{ background: rk.rank <= 6 ? "#DCFCE7" : rk.rank <= 12 ? "#FEF3C7" : "#FEE2E2",
                           color: rk.rank <= 6 ? "#166534" : rk.rank <= 12 ? "#92400E" : "#991B1B" }}>
                  #{rk.rank} of {rk.of}
                </span>
              </Tip>
            )}
          </div>
          {band && (
            <Tip label={formula}>
              <div className="mt-1 inline-flex items-center gap-1 cursor-help">
                <span className="w-2 h-2 rounded-full inline-block" style={{ background: band.color }} />
                <span className="text-xs font-semibold" style={{ color: band.color }}>{band.v}</span>
              </div>
            </Tip>
          )}
          {band?.m && <div className="text-[11px] text-slate-500 mt-1.5 leading-snug">{band.m}</div>}
          {indexKey && <PortfolioStrip indexKey={indexKey} fieldId={fieldId} color={band?.color} />}
          <div className="flex items-center gap-1.5 mt-2 flex-wrap">
            {st && st.spread < 0.35 && (
              <Tip label={`Separating power: weak.\n\nAcross all ${st.n} fields this index only uses ${Math.round(st.spread * 100)}% of the available −1…+1 scale, so the fields are bunched together on it. A small gap between two fields here is not a real difference — read it alongside the indices that spread more widely.`}>
                <span className="text-[9px] text-amber-700 bg-amber-50 border border-amber-100 rounded px-1.5 py-0.5 cursor-help">
                  Weak separator — fields are bunched here
                </span>
              </Tip>
            )}
            <span className="ml-auto">
              <DisputeButton compact fieldName={fieldName} indexLabel={title} indexShort={st?.short}
                value={score} band={band?.v} rank={rk?.rank} of={rk?.of} derivation={formula} />
            </span>
          </div>
        </>
      )}
    </div>
  );
};

const Card = ({ title, children, right }) => (
  <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
    <div className="flex items-center justify-between px-4 pt-3 pb-2 border-b border-slate-100 gap-2">
      <h3 className="text-sm font-semibold text-slate-800">{title}</h3>{right}
    </div>
    <div className="p-4">{children}</div>
  </div>
);

/* ═══════════════════════════════════════════════════════════════════════════
   PLAIN-LANGUAGE GLOSSARY

   Review feedback: the board is unreadable to anyone who has not read the
   scoring document. Terms like "weak separator" or "SPI" mean nothing on first
   contact. Every framework term now has a definition written in ordinary
   English — what it is, and what a reader should actually do with it.
   ═══════════════════════════════════════════════════════════════════════════ */
const GLOSSARY = {
  MGI: { t: "Master Growth Index", d: "The single overall score for a search field, from −1 to +1. It combines all nine framework indices below into one number.\n\nRead it as: how attractive is this field for Bosch, all things considered? Above +0.30 is a Core Bet. Below −0.30 is a Portfolio Distractor. Everything in between is a Horizon Play — worth pursuing, but with conditions." },
  PI: { t: "PESTEL Index", d: "Is the outside world helping or hurting this field?\n\nWe list the political, economic, social, technological, environmental and legal forces acting on the field, score each for how big it is and how certain it is, then compare the helpful ones against the harmful ones.\n\nPositive means the environment is pulling the field forward. Negative means Bosch would be pushing uphill regardless of how good the product is." },
  SPI: { t: "SWOT Posture (Strategic Posture Index)", d: "Does Bosch have the right internal position for the opportunity in front of it?\n\nBuilt from two halves: how strong Bosch is internally (strengths against weaknesses), and how attractive the outside opportunity is (opportunities against threats). The external half is weighted more heavily, because a great capability in a bad market still loses." },
  MAI: { t: "Market Attractiveness Index", d: "Is this a market worth being in at all — regardless of whether Bosch can win it?\n\nFour inputs: how big and how fast-growing it is, where it sits on the adoption curve, whether the revenue is one-off or recurring, and how profitable it typically is.\n\nA high score means the market itself is a growth engine. A low score means it is a value trap, even for the best player in it." },
  IAI: { t: "Industry Attractiveness Index", d: "How brutal is the competitive structure?\n\nPorter's five forces — new entrants, buyer power, supplier power, substitutes and rivalry — scored across their sub-factors.\n\nHigh means a comfortable industry with defensible margins. Low means a knife fight where nobody makes money." },
  CGI: { t: "Competency Gap Index", d: "Does Bosch have the skills this field actually requires?\n\nSeven capability areas are scored twice: what the market demands, and what Bosch has today. The gap between them is weighted by how much each area matters in this kind of business.\n\nNegative means a shortfall. It is not automatically a reason to stop — it is a statement of what would have to be built, bought or partnered." },
  SVI: { t: "Stakeholder Viability Index", d: "Will the people who can block this let it happen?\n\nEvery significant stakeholder is scored on how much power they hold, whether they support or oppose, and how much influence Bosch has over them. Undecided stakeholders drag the score toward zero, because an unpredictable landscape is genuinely riskier than a settled one." },
  CPI: { t: "Competitive Posture Index", d: "In a straight fight, does Bosch win?\n\nCombines how threatening the competitors are with how strong Bosch's own position is. A strong Bosch position against weak rivals scores high; a weak position against apex predators scores low." },
  SCVI: { t: "Supply Chain Viability Index", d: "Can Bosch actually get what it needs to build this?\n\nTwo inputs: how mature and local the supply chain is, and how much leverage Bosch has over it. Owning the input scores highest; depending on a single distant supplier scores lowest." },
  TPI: { t: "Technology Prognosis Index", d: "Is the technology ready, and will it still be relevant?\n\nTwo inputs: how fast the technology is moving, and how ready it is to be sold commercially. High on both means proven and scaling. Low means either obsolete or too early to bet on." },
  separator: { t: "Separating power", d: "How much a score helps you tell the fields apart.\n\nEvery index runs from −1 to +1, but the fields do not spread across that whole range. If all 18 fields sit between −0.1 and +0.1 on some index, that index is only using 10% of its scale — so a gap of 0.05 between two fields there means almost nothing.\n\n• Strong separator — fields spread widely. Differences are real and can carry a decision.\n• Moderate separator — differences are meaningful but should be read alongside others.\n• Weak separator — fields are bunched together. Do not decide anything on a small gap here.\n\nThis is why every score card also shows a rank. The rank answers the question the raw number cannot: is this field better than the alternatives?" },
  TAM: { t: "TAM — Total Addressable Market", d: "The whole India market for this field in 2030, if Bosch could sell to every buyer with no restrictions.\n\nIt is a size-of-the-prize number, not a forecast of Bosch revenue. It is useful for judging whether a field is big enough to matter at all." },
  SAM: { t: "SAM — Serviceable Addressable Market", d: "The slice of the TAM Bosch could realistically sell into.\n\nWe remove what customers will build in-house, what Bosch has deliberately chosen not to compete in, and layers Bosch has no route to. What is left is the honest target.\n\nThe SAM is always the number to plan against. The TAM is context." },
  LEAD: { t: "LEAD", d: "Bosch should own this — invest, build, and go after it directly.\n\nUsed where Bosch's existing assets are decisive and the opportunity is real. It implies committed resources, not a watching brief." },
  PARTNER: { t: "PARTNER", d: "Real opportunity, but Bosch cannot or should not do it alone.\n\nEither a capability is missing that would take too long to build, or the economics only work with someone else carrying part of the value chain. The action is to find and sign the partner, not to build the capability." },
  WATCH: { t: "WATCH", d: "Genuinely interesting, but not yet.\n\nSomething specific has to happen first — a regulation, a cost threshold, a market forming. Each WATCH carries the trigger that would change it. Spending here before the trigger fires is how optionality turns into waste." },
  SKIP: { t: "SKIP", d: "A deliberate decision not to pursue this, recorded so it is visible rather than quietly forgotten.\n\nUsually because Bosch has no asset that matters here and building one would mean competing on someone else's terms with none of their advantages." },
  tailwind: { t: "Tailwind", d: "An outside force pushing this field forward — a regulation creating demand, a cost curve falling, a behaviour changing in Bosch's favour.\n\nScored on how big the effect is and how certain it is to happen." },
  headwind: { t: "Headwind", d: "An outside force pushing against this field — a cost pressure, a regulatory burden, a competing behaviour.\n\nScored the same way as a tailwind, so the two can be compared directly." },
  scurve: { t: "S-curve position", d: "Where a market sits in its adoption life. New technologies grow slowly, then very fast, then level off, then decline.\n\nEarly Adoption is usually the best place to enter — the standards are still forming, so a strong player can shape them. Late Majority means the decisions have been made and the margins have gone." },
  horizons: { t: "Three Horizons", d: "When revenue arrives.\n\n• H1 — earning now, or within about two years.\n• H2 — two to five years, usually waiting on a specific trigger.\n• H3 — beyond five years. Real, but not something to fund on a business case yet.\n\nA healthy field has something in all three. All-H1 means no future; all-H3 means no present." },
  MAS: { t: "Market Attractiveness Score", d: "The raw 1-to-5 version of Market Attractiveness, before it is converted to the −1…+1 scale used everywhere else. Shown so the arithmetic is checkable." },
  IRI: { t: "Internal Readiness Index", d: "The internal half of the SWOT posture: Bosch's strengths measured against its weaknesses. Positive means Bosch is internally ready." },
  EAI: { t: "External Attractiveness Index", d: "The external half of the SWOT posture: opportunities measured against threats. Positive means the outside world offers more than it takes away." },
  TES: { t: "Total Effective Support", d: "The combined weight of stakeholders who support this, adjusted upward where Bosch has real influence over them." },
  TET: { t: "Total Effective Threat", d: "The combined weight of stakeholders who oppose this, adjusted downward where Bosch has influence that could soften them." },
  VSF: { t: "Volatility Scaling Factor", d: "How much of the stakeholder landscape is undecided.\n\nIf everyone has picked a side, this is 1.00 and the stakeholder score stands as calculated. The more power sits with neutrals, the more it pulls the score toward zero — because an unpredictable landscape is genuinely riskier than a hostile but known one." },
  BIM: { t: "Bosch Influence Multiplier", d: "How much Bosch can actually move a given stakeholder. Amplifies allies and softens opponents, so the score reflects the relationship rather than just the power." },
  SVS: { t: "Strategic Value Score", d: "A 1-to-9 score combining Bosch's competitive advantage with the threat level it faces, before conversion to the −1…+1 scale. Each cell has a named strategic situation attached to it." },
  quadrant: { t: "SWOT quadrant", d: "Where a field lands when internal readiness is plotted against external attractiveness.\n\n• Aggressive Growth — strong inside, attractive outside. Invest to lead.\n• Turnaround or Partner — great market, Bosch not ready. Buy or build the missing piece.\n• Divest or Exit — weak both ways. Stop.\n• Diversify or Defend — strong capability, poor market. Harvest, do not reinvest." },
  kraljic: { t: "Kraljic quadrant", d: "How to treat a supplier, based on two questions: how hard would it be to replace them, and how much do they affect profit?\n\n• Strategic — hard to replace and high impact. Partner deeply.\n• Bottleneck — hard to replace but small spend. Hold stock, qualify alternates.\n• Leverage — easy to replace and high spend. Negotiate hard.\n• Non-critical — easy and small. Automate it and stop thinking about it." },
  band: { t: "Verdict band", d: "The plain-English translation of a score.\n\n• Core Bet — invest to lead. Attractive market, strong fit, low friction.\n• Horizon Play — partner and gate. Viable but conditional; fund against milestones.\n• Portfolio Distractor — avoid. The money is better spent elsewhere." },
};

/* Wraps a term in a hover definition. Use anywhere jargon appears. */
const Term = ({ k, children, className = "" }) => {
  const g = GLOSSARY[k];
  if (!g) return <>{children}</>;
  return (
    <Tip label={`${g.t}\n\n${g.d}`}>
      <span className={`border-b border-dotted border-slate-400 cursor-help ${className}`}>{children || g.t}</span>
    </Tip>
  );
};

/* ═══════════════════════════════════════════════════════════════════════════
   SOURCE LINKS

   Review feedback: reviewers want the source next to the claim, openable in one
   click, rather than a bracketed number to match against a list. Cite already
   does that for numbered citations. This resolves free-text source labels — the
   ones on sizing steps and activity items — to a URL where one is known.
   ═══════════════════════════════════════════════════════════════════════════ */
const SOURCE_INDEX = [
  [/pib|press information/i, U.pib_edrive], [/pm e-drive|mhi/i, U.mhi_edrive_pdf],
  [/gst council/i, U.gst56], [/niti/i, U.niti], [/rbi|mpc|repo/i, U.rbi_mpc],
  [/npci|upi/i, U.npci_upi], [/wpc|5\.9 ghz|c-v2x/i, U.cv2x_wpc], [/bee|cafe/i, U.bee],
  [/morth|bncap|ais-197|rules 125/i, U.morth], [/ais-189|csms|sums/i, U.ais189],
  [/arai|icat|homologation/i, U.arai], [/siam/i, U.siam], [/meity|dpdp/i, U.meity_dpdp],
  [/iso 26262/i, U.iso26262], [/mordor|market report|forecast/i, U.mordor],
  [/tracxn|funding|startup/i, U.tracxn], [/marklines|teardown|content/i, U.marklines],
  [/autocar/i, U.autocarpro], [/autosar/i, U.autosar], [/vahan/i, U.vahan],
  [/e-amrit/i, U.eamrit], [/heavy ind/i, U.heavyind], [/ocpp|open charge/i, U.oca],
  [/iea/i, U.iea], [/sae/i, U.sae], [/cert-in/i, U.certin], [/unece|r155|r156/i, U.unece],
  [/counterpoint/i, U.counterpoint], [/dot|trai|spectrum/i, U.dot], [/cpcb|moefcc/i, U.cpcb],
  [/sebi|brsr/i, U.sebi], [/mckinsey/i, U.mckinsey], [/ism|semiconductor mission/i, "https://ism.gov.in"],
  [/nhai/i, "https://nhai.gov.in"], [/irdai/i, "https://irdai.gov.in"], [/dgca/i, "https://www.dgca.gov.in"],
  [/ibef/i, "https://www.ibef.org"], [/economic times|et auto|mint|business standard/i, "https://economictimes.indiatimes.com"],
];
function resolveSource(label) {
  if (!label) return null;
  const hit = SOURCE_INDEX.find(([re]) => re.test(label));
  return hit ? hit[1] : null;
}
/* Small button that opens the underlying source page directly. */
const SrcLink = ({ label, compact }) => {
  const url = resolveSource(label);
  if (!label) return null;
  const body = (
    <span className={`inline-flex items-center gap-0.5 rounded border px-1 ${url ? "text-teal-700 border-teal-200 bg-teal-50 hover:bg-teal-100" : "text-slate-400 border-slate-200 bg-slate-50"} ${compact ? "text-[9px]" : "text-[10px]"}`}>
      {!compact && <span className="max-w-[160px] truncate">{label}</span>}
      <span aria-hidden>↗</span>
    </span>
  );
  return (
    <Tip label={url ? `Source: ${label}\n\n${url}\n\nClick to open in a new tab.` : `Source: ${label}\n\nNo direct URL is on file for this source yet.`}>
      {url ? <a href={url} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}>{body}</a> : body}
    </Tip>
  );
};

/* ═══════════════════════════════════════════════════════════════════════════
   SCORE DISPUTE

   Review feedback, and the right call: do not let every reader edit the scores.
   Twenty people each nudging a number produces an average nobody believes and
   no record of who changed what or why.

   So the scores stay immutable and disagreement becomes a first-class, named,
   auditable act. A reviewer who disagrees states their own score and their
   reasoning against a Microsoft Form. The full computed context — field, index,
   current value, the inputs behind it and the rank — is copied to the clipboard
   automatically so they paste rather than retype it, and nothing is lost in
   translation between what they saw and what they reported.
   ═══════════════════════════════════════════════════════════════════════════ */
const DISPUTE_FORM_URL = "https://forms.cloud.microsoft/e/V0tzpejWKY";

function disputeContext({ fieldName, indexLabel, indexShort, value, band, rank, of, derivation }) {
  return [
    "SEARCH-FIELD INTELLIGENCE — score dispute",
    "",
    `Field:            ${fieldName}`,
    `Index:            ${indexLabel}${indexShort ? ` (${indexShort})` : ""}`,
    `Current score:    ${value}`,
    band ? `Current verdict:  ${band}` : null,
    rank ? `Portfolio rank:   ${rank} of ${of}` : null,
    "",
    "How this score was calculated:",
    derivation || "(derivation not available for this index)",
    "",
    `Captured: ${new Date().toLocaleString()}`,
    "",
    "— paste this into the form, then add your own score and your reasoning —",
  ].filter(Boolean).join("\n");
}

const DisputeButton = ({ fieldName, indexLabel, indexShort, value, band, rank, of, derivation, compact }) => {
  const [state, setState] = useState("idle"); // idle | copied
  const go = async () => {
    const ctx = disputeContext({ fieldName, indexLabel, indexShort, value, band, rank, of, derivation });
    try { await navigator.clipboard.writeText(ctx); setState("copied"); } catch { setState("copied"); }
    setTimeout(() => window.open(DISPUTE_FORM_URL, "_blank", "noopener"), 400);
    setTimeout(() => setState("idle"), 4000);
  };
  return (
    <Tip label={`Disagree with this score?\n\nScores are deliberately not editable in the app — if everyone could nudge a number we would end up with an average nobody believes and no record of who changed what.\n\nInstead, clicking this copies the full context of this score to your clipboard and opens the review form. Paste it in, add your own score and your reasoning, and it goes on the record with your name against it.`}>
      <button onClick={go}
        className={`inline-flex items-center gap-1 rounded-full border font-medium transition-colors ${compact ? "text-[9px] px-1.5 py-0.5" : "text-[10px] px-2 py-0.5"} ${state === "copied" ? "border-green-300 bg-green-50 text-green-800" : "border-slate-300 bg-white text-slate-600 hover:border-red-300 hover:text-red-700"}`}>
        {state === "copied" ? "Context copied — opening form…" : "Disagree"}
      </button>
    </Tip>
  );
};

/* ═══════════════════════════════════════════════════════════════════════════
   READ ME FIRST — the whole board explained in ordinary English.
   ═══════════════════════════════════════════════════════════════════════════ */
const ReadMeFirst = () => {
  const [open, setOpen] = useState(false);
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm mb-4">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between px-4 py-3 text-left">
        <div>
          <span className="text-sm font-semibold text-slate-800">Read me first — what this board is and how to use it</span>
          <span className="text-xs text-slate-400 ml-2">no jargon, two minutes</span>
        </div>
        <span className="text-xs text-teal-700 font-medium shrink-0">{open ? "collapse ▲" : "expand ▼"}</span>
      </button>
      {open && (
        <div className="px-4 pb-4 space-y-3 text-sm text-slate-700">
          <p>
            Each <b>search field</b> is a possible business for Bosch Mobility in India. Each is assessed against the same
            ten frameworks, scored from the same rubrics, and every number is computed from its inputs rather than
            written by hand. That is the point: two fields can be compared because they were measured the same way.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="border border-slate-200 rounded-lg p-3">
              <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1.5">1 · Is the prize worth having?</div>
              <p className="text-xs text-slate-600">
                <Term k="MAI">Market Attractiveness</Term> and the <Term k="PI">PESTEL Index</Term> answer this.
                Together they say whether the market is big and growing, and whether the outside world is pushing
                for it or against it. <Term k="IAI">Industry Attractiveness</Term> adds how brutal the competition is.
              </p>
            </div>
            <div className="border border-slate-200 rounded-lg p-3">
              <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1.5">2 · Can Bosch win it?</div>
              <p className="text-xs text-slate-600">
                <Term k="CGI">Competency Gap</Term>, <Term k="SPI">SWOT Posture</Term> and{" "}
                <Term k="CPI">Competitive Posture</Term> answer this. They say whether Bosch has the skills, whether
                its position suits the opportunity, and whether it beats the people already there.
              </p>
            </div>
            <div className="border border-slate-200 rounded-lg p-3">
              <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1.5">3 · Can Bosch actually deliver it?</div>
              <p className="text-xs text-slate-600">
                <Term k="SCVI">Supply Chain Viability</Term>, <Term k="SVI">Stakeholder Viability</Term> and{" "}
                <Term k="TPI">Technology Prognosis</Term> answer this — whether the inputs are obtainable, whether
                the people who can block it will let it happen, and whether the technology is ready.
              </p>
            </div>
          </div>
          <p>
            Those nine roll into one <Term k="MGI">Master Growth Index</Term> per field, which is what the leaderboard
            ranks. Anything above <b>+0.30</b> is a <Term k="band">Core Bet</Term>; below <b>−0.30</b> is a Portfolio
            Distractor; the middle is a Horizon Play.
          </p>
          <div className="border border-amber-200 bg-amber-50/60 rounded-lg p-3">
            <div className="text-[10px] font-bold uppercase tracking-widest text-amber-800 mb-1">The one thing that trips people up</div>
            <p className="text-xs text-slate-700">
              Most scores cluster near zero. That is arithmetic, not indecision — averaging dozens of positives against
              dozens of negatives pulls any ratio toward the middle. So do not read a raw score on its own. Every card
              also shows a <b>rank</b> and a <Term k="separator">separating power</Term> label. The rank tells you
              whether this field beats the alternatives, which is the question you actually care about.
            </p>
          </div>
          <div className="border border-slate-200 rounded-lg p-3">
            <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">If you disagree with a score</div>
            <p className="text-xs text-slate-600">
              Use the <b>Disagree</b> button on any score card. Scores are deliberately not editable here — if everyone
              could nudge a number the board would become an average nobody believes. Instead the button copies the
              full context of that score to your clipboard and opens the review form, so your alternative score and
              your reasoning go on the record with your name against them.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════════════════
   LEADERBOARD — every field ranked by its overall score, so the portfolio can
   be read at a glance rather than one field at a time.
   ═══════════════════════════════════════════════════════════════════════════ */
const Leaderboard = ({ fieldId, onSelect }) => {
  const rows = FIELDS.map(f => ({ ...f, ...(PORTFOLIO[f.id] || {}) }))
    .filter(r => r.mgi != null).sort((x, y) => y.mgi - x.mgi);
  const lo = Math.min(...rows.map(r => r.mgi), -0.05), hi = Math.max(...rows.map(r => r.mgi), 0.05);
  const bands = [
    { v: "Core Bet (Tier-1)", label: "Core Bet — invest to lead" },
    { v: "Horizon Play (Tier-2)", label: "Horizon Play — partner & gate" },
    { v: "Portfolio Distractor (Tier-3)", label: "Portfolio Distractor — avoid" },
  ];
  return (
    <div>
      <div className="px-4 pb-1 text-[11px] font-bold uppercase tracking-widest text-slate-400">Ranked by overall score</div>
      <div className="px-4 pb-2 text-[10px] text-slate-400 leading-snug">
        <Term k="MGI">Master Growth Index</Term> — all nine frameworks combined.
      </div>
      {bands.map(bd => {
        const grp = rows.filter(r => r.band?.v === bd.v);
        if (!grp.length) return null;
        return (
          <div key={bd.v} className="mb-2">
            <div className="px-4 py-1 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full" style={{ background: grp[0].band.color }} />
              <span className="text-[10px] font-bold uppercase tracking-wide" style={{ color: grp[0].band.color }}>{bd.label}</span>
              <span className="text-[10px] text-slate-400 ml-auto">{grp.length}</span>
            </div>
            {grp.map(r => {
              const rank = rows.findIndex(x => x.id === r.id) + 1;
              const pct = Math.max(3, Math.min(100, ((r.mgi - lo) / (hi - lo)) * 100));
              return (
                <button key={r.id} onClick={() => onSelect(r.id)}
                  className={`w-full text-left px-4 py-1.5 border-l-2 transition-colors ${fieldId === r.id ? "border-red-600 bg-red-50/60" : "border-transparent hover:bg-slate-50"}`}>
                  <div className="flex items-baseline gap-2">
                    <span className="text-[10px] font-mono text-slate-400 w-5 shrink-0">{rank}</span>
                    <span className={`text-xs truncate flex-1 ${fieldId === r.id ? "font-semibold" : ""}`}>{r.name}</span>
                    <span className="text-xs font-bold tabular-nums" style={{ color: r.band.color }}>{r.mgi.toFixed(2)}</span>
                  </div>
                  <div className="h-1 bg-slate-100 rounded-full mt-1 ml-7">
                    <div className="h-1 rounded-full" style={{ width: `${pct}%`, background: r.band.color }} />
                  </div>
                </button>
              );
            })}
          </div>
        );
      })}
      <div className="px-4 pt-2 mt-1 border-t border-slate-100 text-[10px] text-slate-400 leading-snug">
        The bar shows position across the observed range, not the full −1…+1 scale — the fields occupy only part of it,
        so this makes the real differences visible.
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════════════════
   TAM / SAM BUILD-UP — review feedback was that the sizing looked asserted
   rather than derived. Each component is now shown as a segment of a stacked
   bar that must sum to the stated total, so the arithmetic is visible and
   checkable, and each SAM segment is tagged to the sub-field it belongs to.
   ═══════════════════════════════════════════════════════════════════════════ */
const SEG_COLORS = ["#7A1FA2", "#E20015", "#D97706", "#0096A0", "#5BAA32", "#0E7490", "#9333EA", "#64748B"];
const StackedBuildup = ({ title, note, rows, total, termKey, onSub }) => {
  if (!rows?.length) return null;
  const sum = rows.reduce((a, r) => a + r.v, 0);
  return (
    <div className="mb-4 last:mb-0">
      <div className="flex items-baseline gap-2 mb-1">
        <span className="text-xs font-bold uppercase tracking-widest text-slate-500">
          <Term k={termKey}>{title}</Term>
        </span>
        <span className="text-sm font-extrabold">${(total / 1000).toFixed(2)}B</span>
        {Math.abs(sum - total) > 1 && <span className="text-[10px] text-red-600">segments sum to ${sum}M — mismatch</span>}
      </div>
      {note && <div className="text-[11px] text-slate-500 mb-2">{note}</div>}
      <div className="flex h-8 rounded-lg overflow-hidden mb-2 border border-slate-200">
        {rows.map((r, i) => (
          <Tip key={r.k} label={`${r.k}\n\n$${r.v}M — ${Math.round((r.v / total) * 100)}% of the total\n\n${r.why}${r.sub ? `\n\nSub-field: ${r.sub}` : ""}`}>
            <div className="h-full flex items-center justify-center cursor-help transition-opacity hover:opacity-80"
              style={{ width: `${(r.v / total) * 100}%`, background: SEG_COLORS[i % SEG_COLORS.length] }}>
              {(r.v / total) > 0.11 && <span className="text-[10px] font-bold text-white px-1 truncate">{Math.round((r.v / total) * 100)}%</span>}
            </div>
          </Tip>
        ))}
      </div>
      <table className="w-full text-xs">
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.k} className="border-t border-slate-100 first:border-0 align-top">
              <td className="py-1.5 pr-2 w-3"><span className="inline-block w-2.5 h-2.5 rounded-sm mt-0.5" style={{ background: SEG_COLORS[i % SEG_COLORS.length] }} /></td>
              <td className="py-1.5 pr-2 font-semibold text-slate-700 whitespace-nowrap">
                {r.sub && onSub
                  ? <button onClick={() => onSub(r.sub)} className="hover:text-teal-700 hover:underline text-left">{r.k}</button>
                  : r.k}
              </td>
              <td className="py-1.5 pr-2 font-bold tabular-nums whitespace-nowrap">${r.v}M</td>
              <td className="py-1.5 pr-2 text-slate-400 tabular-nums whitespace-nowrap">{Math.round((r.v / total) * 100)}%</td>
              <td className="py-1.5 text-slate-600">{r.why}</td>
            </tr>
          ))}
          <tr className="border-t-2 border-slate-300 font-bold">
            <td /><td className="py-1.5 pr-2">Total</td>
            <td className="py-1.5 pr-2 tabular-nums">${sum}M</td>
            <td className="py-1.5 pr-2 text-slate-400">100%</td><td />
          </tr>
        </tbody>
      </table>
    </div>
  );
};

/* Sub-field drill-down — opens when a sub-field chip is selected and SUB has
   detail for it. Gives the sub-sector its own investment logic without pretending
   it has its own nine-index score. */
const SubFieldDrill = ({ fieldId, sub, fieldName }) => {
  const d = SUB[fieldId]?.[sub];
  if (!d) {
    return (
      <div className="mt-3 text-xs text-amber-800 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
        Sub-field lens: <b>{sub}</b> — content across the tabs is tagged to this sub-field where relevant, and the
        verdict always rolls up to <b>{fieldName}</b> as a whole. A dedicated drill-down for this sub-field is not
        compiled yet.
      </div>
    );
  }
  const pf = { LEAD: "green", PARTNER: "teal", WATCH: "amber", SKIP: "red" }[d.play] || "slate";
  const Block = ({ title, note, children }) => (
    <div className="border border-slate-200 rounded-lg p-3">
      <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">{title}</div>
      {note && <div className="text-[10px] text-slate-400 mb-2">{note}</div>}
      {children}
    </div>
  );
  return (
    <div className="mt-3 bg-white rounded-xl border-2 border-slate-300 shadow-sm">
      <div className="px-4 pt-3 pb-2 border-b border-slate-100 flex flex-wrap items-center gap-2">
        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Sub-field drill-down</span>
        <span className="text-sm font-bold">{sub}</span>
        <Chip tone={pf}>{d.play}</Chip>
        <Tip label={`Sub-fields do not carry their own scores, and that is deliberate.\n\nThe nine framework indices are calibrated to compare whole search fields with each other. Scoring a sub-field on the same rubrics would produce numbers that look comparable but are not, because the thresholds behind them \u2014 market-size bands, competitor sets, stakeholder power \u2014 are all set at field level.\n\nSo a sub-field gets its own investment logic instead: thesis, sizing, white space, barriers and triggers. The numbers stay where they are meaningful, at ${fieldName}.`}>
          <span className="ml-auto text-[10px] text-slate-500 border-b border-dotted border-slate-400 cursor-help">why no separate score? · rolls up to {fieldName}</span>
        </Tip>
      </div>
      <div className="p-4 space-y-3">
        <div className="text-sm text-slate-700 bg-slate-50 rounded-lg p-3 leading-relaxed">{d.thesis}</div>

        {d.sizing?.length > 0 && (
          <Block title="Sizing and anchors">
            <table className="w-full text-xs">
              <tbody>
                {d.sizing.map(x => (
                  <tr key={x.k} className="border-t border-slate-100 first:border-0">
                    <td className="py-1.5 pr-3 font-semibold text-slate-600 align-top whitespace-nowrap">{x.k}</td>
                    <td className="py-1.5 pr-3 text-slate-800">{x.v}</td>
                    <td className="py-1.5 text-[10px] text-slate-400 align-top whitespace-nowrap">{x.src}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Block>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {d.whyNow?.length > 0 && (
            <Block title="Why now">
              {d.whyNow.map((x, i) => (
                <div key={i} className="mb-2 last:mb-0">
                  <div className="text-xs font-medium text-slate-800">{x.p}</div>
                  <div className="text-[11px] text-slate-600 mt-0.5">{x.why}</div>
                </div>
              ))}
            </Block>
          )}
          {d.barriers?.length > 0 && (
            <Block title="Barriers and risks">
              {d.barriers.map((x, i) => (
                <div key={i} className="mb-2 last:mb-0">
                  <div className="text-xs font-medium text-red-800 flex gap-1.5"><span>⚠</span>{x.p}</div>
                  <div className="text-[11px] text-slate-600 mt-0.5 ml-4">{x.why}</div>
                </div>
              ))}
            </Block>
          )}
        </div>

        {d.boschFit && (
          <Block title="Bosch fit">
            <div className="text-xs text-slate-700">{d.boschFit}</div>
          </Block>
        )}

        {d.whiteSpace?.length > 0 && (
          <Block title="White space" note="Openings with no established owner. Direction tags show which way value flows between the two domains.">
            {d.whiteSpace.map((x, i) => {
              const dir = /^MOBILITY → HEALTH:/.test(x.p) ? "mob" : /^HEALTH → MOBILITY:/.test(x.p) ? "hea" : null;
              const text = dir ? x.p.replace(/^(MOBILITY → HEALTH|HEALTH → MOBILITY):\s*/, "") : x.p;
              return (
                <div key={i} className="border border-teal-100 bg-teal-50/40 rounded-lg p-2.5 mb-2 last:mb-0">
                  {dir && (
                    <Chip tone={dir === "mob" ? "violet" : "teal"}>
                      {dir === "mob" ? "Mobility → Health" : "Health → Mobility"}
                    </Chip>
                  )}
                  <div className={`text-xs font-medium text-slate-800 ${dir ? "mt-1" : ""}`}>{text}</div>
                  <div className="text-[11px] text-teal-800 mt-1">{x.why}</div>
                </div>
              );
            })}
          </Block>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {d.triggers?.length > 0 && (
            <Block title="Triggers to watch" note="Observable events that should change the play on this sub-field.">
              {d.triggers.map((t, i) => (
                <div key={i} className="text-xs text-slate-700 flex gap-1.5 mb-1 last:mb-0"><span className="text-teal-600">▸</span>{t}</div>
              ))}
            </Block>
          )}
          {d.players?.length > 0 && (
            <Block title="Who else is here">
              {d.players.map((p, i) => (
                <div key={i} className="mb-1.5 last:mb-0">
                  <div className="text-xs font-semibold text-slate-800">{p.name}</div>
                  <div className="text-[11px] text-slate-600">{p.note}</div>
                </div>
              ))}
            </Block>
          )}
        </div>
      </div>
    </div>
  );
};

/* How to read the scores — the reviewer-facing answer to "why is everything
   near zero?". States the scale, the bands, and how much each index actually
   separates the 15 fields, so weak separators aren't over-read. */
const ScoringLegend = ({ fieldId }) => {
  const [open, setOpen] = useState(false);
  const mgiSt = PORTFOLIO_STATS.mgi;
  const weak = INDEX_KEYS.filter(({ k }) => k !== "mgi" && PORTFOLIO_STATS[k]?.spread < 0.35);
  const strong = INDEX_KEYS.filter(({ k }) => k !== "mgi" && PORTFOLIO_STATS[k]?.spread >= 0.6);
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between px-4 py-3 text-left">
        <div>
          <span className="text-sm font-semibold text-slate-800">How to read these scores</span>
          <span className="text-xs text-slate-400 ml-2">
            the scale, the bands, and how far apart the fields actually sit
          </span>
        </div>
        <span className="text-xs text-teal-700 font-medium shrink-0">{open ? "collapse ▲" : "expand ▼"}</span>
      </button>
      {open && (
        <div className="px-4 pb-4 space-y-3">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            <div className="border border-slate-200 rounded-lg p-3">
              <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">The scale</div>
              <p className="text-xs text-slate-600 mb-2">
                Every index is normalised to <b>−1 … +1</b>, where +1 is best. That is what makes nine different
                frameworks comparable with each other and across all 15 search fields.
              </p>
              <div className="relative h-6 rounded bg-gradient-to-r from-red-200 via-amber-100 to-green-200 mb-1">
                <div className="absolute inset-y-0 left-1/2 w-px bg-slate-400" />
              </div>
              <div className="flex justify-between text-[10px] text-slate-500">
                <span>−1 · worst case</span><span>0 · neutral</span><span>+1 · best case</span>
              </div>
            </div>
            <div className="border border-slate-200 rounded-lg p-3">
              <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">MGI verdict bands</div>
              {MGI_BANDS.map(b => (
                <div key={b.v} className="flex items-start gap-2 mb-1.5 last:mb-0">
                  <span className="w-2 h-2 rounded-full mt-1 shrink-0" style={{ background: b.color }} />
                  <div>
                    <span className="text-xs font-semibold" style={{ color: b.color }}>{b.v}</span>
                    <span className="text-[10px] text-slate-400 ml-1.5">
                      {b.min <= -1 ? "below −0.30" : `${b.min >= 0 ? "≥" : "≥"} ${b.min.toFixed(2)}`}
                    </span>
                    <div className="text-[10px] text-slate-500 leading-snug">{b.m.split(".")[0]}.</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="border border-amber-200 bg-amber-50/50 rounded-lg p-3">
            <div className="text-[10px] font-bold uppercase tracking-widest text-amber-800 mb-1.5">
              Why most values sit close to zero — and what to do about it
            </div>
            <p className="text-xs text-slate-700 mb-2">
              This is a property of the formulas, not a scoring error. The PESTEL Index is
              (tailwinds − headwinds) ÷ (tailwinds + headwinds) across 36 scored points; summing 18 products on each
              side pulls the ratio toward the middle, because every field has both favourable and unfavourable macro
              forces. SPI blends two such ratios and inherits the same compression, and the MGI is a weighted average
              of averages, which compresses once more. Across the portfolio the MGI spans only{" "}
              <b>{mgiSt.min} to {mgiSt.max}</b> — {Math.round(mgiSt.spread * 100)}% of the available scale.
            </p>
            <p className="text-xs text-slate-700">
              Rather than change the arithmetic and break compliance with the scoring document, every index card shows
              a <b>portfolio strip</b>: the field's rank and its position against the other 14. The absolute value
              answers "is this good?"; the rank answers "is this better than the alternatives?" — which is the actual
              investment question. Read the rank first when two fields look similar.
            </p>
          </div>

          <div className="border border-slate-200 rounded-lg p-3">
            <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">
              How much each index separates the portfolio
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead><tr className="text-left text-slate-400">
                  <th className="pb-1.5 pr-2">Index</th><th className="pb-1.5 pr-2 text-center">This field</th>
                  <th className="pb-1.5 pr-2 text-center">Rank</th><th className="pb-1.5 pr-2 text-center">Portfolio range</th>
                  <th className="pb-1.5 pr-2 text-center">Scale used</th><th className="pb-1.5">Separating power</th>
                </tr></thead>
                <tbody>
                  {INDEX_KEYS.map(({ k, label }) => {
                    const st = PORTFOLIO_STATS[k];
                    if (!st) return null;
                    const rk = indexRank(k, fieldId);
                    const mine = PORTFOLIO[fieldId]?.[k];
                    const pct = Math.round(st.spread * 100);
                    const tone = st.spread >= 0.6 ? "green" : st.spread >= 0.35 ? "amber" : "red";
                    return (
                      <tr key={k} className={`border-t border-slate-100 ${k === "mgi" ? "bg-slate-50 font-semibold" : ""}`}>
                        <td className="py-1.5 pr-2">{label}</td>
                        <td className="py-1.5 pr-2 text-center font-mono">{mine ?? "—"}</td>
                        <td className="py-1.5 pr-2 text-center">{rk ? `${rk.rank}/${rk.of}` : "—"}</td>
                        <td className="py-1.5 pr-2 text-center text-slate-500 font-mono">{st.min} … {st.max}</td>
                        <td className="py-1.5 pr-2 text-center">
                          <div className="flex items-center gap-1.5">
                            <div className="flex-1 h-1.5 bg-slate-100 rounded-full min-w-[40px]">
                              <div className="h-1.5 rounded-full" style={{ width: `${pct}%`, background: tone === "green" ? "#16A34A" : tone === "amber" ? "#D97706" : "#DC2626" }} />
                            </div>
                            <span className="text-[10px] text-slate-500 w-8">{pct}%</span>
                          </div>
                        </td>
                        <td className="py-1.5"><Chip tone={tone === "green" ? "green" : tone === "amber" ? "amber" : "red"}>{st.power}</Chip></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="text-[10px] text-slate-500 mt-2 leading-snug">
              {strong.length > 0 && <>Lean on <b>{strong.map(x => x.short).join(", ")}</b> when ranking fields — the numbers there are far enough apart to mean something. </>}
              {weak.length > 0 && <>Treat <b>{weak.map(x => x.short).join(", ")}</b> with care: every field scores about the same on those, so a small gap between two fields is noise rather than a finding.</>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/* Why/So-what block used across all framework tabs */
const Reasoned = ({ point, why, sowhat, cites, tag, badge, citeField }) => (
  <div className="border border-slate-200 rounded-lg p-3 mb-2 last:mb-0">
    <div className="flex items-start gap-2">
      {tag}
      <div className="text-sm font-medium flex-1">{point}{cites?.length ? <Cite ids={cites} fieldId={citeField} /> : null}</div>
    </div>
    {why && <div className="text-xs text-slate-600 mt-1.5 flex gap-1.5"><span className="font-bold text-teal-700 shrink-0">WHY</span><span>{why}</span></div>}
    {sowhat && <div className="text-xs text-slate-600 mt-1 flex gap-1.5"><span className="font-bold text-purple-700 shrink-0">SO WHAT</span><span>{sowhat}</span></div>}
    {badge}
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
const TABS =["PESTEL", "SWOT", "Market", "Attractiveness", "Competency", "Stakeholders", "Competitors", "Suppliers", "3 Horizons", "Recent Activity", "AI Analyst"];

export default function App() {
  const [fieldId, setFieldId] = useState("lighting");
  const [sub, setSub] = useState("All");
  const [tab, setTab] = useState("PESTEL");
  const [nav, setNav] = useState("list"); // "list" | "board"
  const [showWorking, setShowWorking] = useState(true);
  const [showMacro, setShowMacro] = useState(false);
  const [swotView, setSwotView] = useState("swot"); // "swot" | "tows"
  const field = FIELDS.find(f => f.id === fieldId);
  const d = DATA[fieldId];
  const v6 = V6[fieldId] || {};
  const v7 = (typeof V7 !== "undefined" ? V7[fieldId] : null) || null;
  const v8 = (typeof V8 !== "undefined" ? V8[fieldId] : null) || null;
  const hasData = !!d;
  const hScore = hasData ? computeHorizonScore(d.horizons) : null;

  /* ── V9 index engine — every component index normalized −1..+1, rolling up into one MGI ── */
  const pestelIdx = v8?.pestel ? computePESTELIndex(v8.pestel) : null;
  const swotIdx = v8?.swot ? computeSWOTPosture(v8.swot) : null;
  const masResult = v8?.market ? computeMAS(v8.market) : null;
  const iaiResult = v8?.iai ? computeIAI(v8.iai) : null;
  /* Radar is computed from the same sub-factor scores that feed the IAI, so the
     chart and the index can never disagree. Any authored number that drifted is
     surfaced as a flag rather than silently overwritten. */
  const porterDerived = v8?.iai ? porterFromSubFactors(v8.iai) : null;
  const porterRows = hasData ? d.porter.map(f => {
    const derived = porterDerived?.[f.force];
    const drift = derived != null && Math.abs(derived - f.v) >= 2.5; /* >=1.0 on the 1-5 scale */
    return { ...f, v: derived != null ? derived : f.v, authored: f.v, drift };
  }) : null;
  const cgiResult = v8?.competency ? computeCGI(v8.competency) : null;
  const sviResult = v8?.stakeholders?.length ? computeSVI(v8.stakeholders) : null;
  const competitorThreats = v8?.competitors?.length ? v8.competitors.map(c => ({ ...c, ...competitorThreat(c.marketPosition, c.futureMomentum) })) : null;
  const advantageResult = v8?.boschStrength && v8?.marketGapSignificance ? boschAdvantage(v8.boschStrength, v8.marketGapSignificance) : null;
  /* Average threat rounded to 2dp before the matrix, exactly as the portfolio
     does, so the field card and the leaderboard can never show different CPIs. */
  const cpiResult = competitorThreats?.length && advantageResult ? computeCPI(+avg(competitorThreats.map(c => c.s)).toFixed(2), advantageResult.s) : null;
  const scviResult = v8?.supplyChainMaturity && v8?.boschControl ? computeSCVI(v8.supplyChainMaturity, v8.boschControl) : null;
  const tpiResult = v8?.techVelocity && v8?.commReadiness ? computeTPI(v8.techVelocity, v8.commReadiness) : null;
  const mgiResult = (masResult && pestelIdx && cgiResult && swotIdx && cpiResult && scviResult && sviResult && tpiResult)
    ? computeMGI({ mai: masResult.mai, pi: pestelIdx.index, cgi: cgiResult.cgi, spi: swotIdx.spi, cpi: cpiResult.cpi, scvi: scviResult.scvi, svi: sviResult.svi, tpi: tpiResult.tpi })
    : null;

  return (
    <div className="min-h-screen flex flex-col font-sans" style={{ background: "#F7F8FA", color: INK }}>
      {/* ── Bosch FROK chrome: the official supergraphic + brand header ── */}
      <div className="bosch-supergraphic" aria-hidden="true" />
      <div className="bg-white flex justify-between items-center shrink-0" style={{ padding: "9px 24px", borderBottom: "1px solid #d0d4d8" }}>
        <img src="bosch/bosch-logo.png" alt="Bosch" style={{ height: 22, display: "block" }} />
        <span style={{ fontSize: 11, color: "#2e3033", fontWeight: 600, letterSpacing: "0.02em" }}>BBM Marketing and Business Strategy - Region India (M/MBR-IN)</span>
      </div>
      <header className="bg-white border-b border-slate-200 px-6 py-3 flex items-center gap-4">
        <div>
          <div className="font-extrabold tracking-tight text-lg leading-none">Search-Field Intelligence</div>
          <div className="text-xs text-slate-500 mt-0.5">Bosch Mobility · India Market · BBM Strategy Agent</div>
        </div>
        <div className="ml-auto flex items-center gap-2 text-xs text-slate-500">
          <span className="w-2 h-2 rounded-full bg-green-500 inline-block" /> Comprehensive Analytics for all search fields - Version 1.1 · 18 search fields
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <aside className="w-72 bg-white border-r border-slate-200 overflow-y-auto py-3 shrink-0">
          <div className="px-3 pb-3 flex gap-1">
            <button onClick={() => setNav("list")}
              className={`flex-1 px-2 py-1.5 rounded-lg text-xs font-semibold border ${nav === "list" ? "bg-slate-900 text-white border-slate-900" : "bg-white border-slate-300 text-slate-600 hover:border-slate-400"}`}>
              All fields ({FIELDS.length})
            </button>
            <button onClick={() => setNav("board")}
              className={`flex-1 px-2 py-1.5 rounded-lg text-xs font-semibold border ${nav === "board" ? "bg-slate-900 text-white border-slate-900" : "bg-white border-slate-300 text-slate-600 hover:border-slate-400"}`}>
              Leaderboard
            </button>
          </div>
          {nav === "board"
            ? <Leaderboard fieldId={fieldId} onSelect={id => { setFieldId(id); setSub("All"); setTab("PESTEL"); }} />
            : (<>
                <div className="px-4 pb-2 text-[11px] font-bold uppercase tracking-widest text-slate-400">{FIELDS.length} Search Fields</div>
                {FIELDS.map(f => {
                  const p = PORTFOLIO[f.id];
                  return (
                    <button key={f.id} onClick={() => { setFieldId(f.id); setSub("All"); setTab("PESTEL"); }}
                      className={`w-full text-left px-4 py-2 text-sm flex items-center gap-2 border-l-2 transition-colors ${fieldId === f.id ? "border-red-600 bg-red-50/60 font-semibold" : "border-transparent hover:bg-slate-50"}`}>
                      {p?.band && <span className="w-2 h-2 rounded-full shrink-0" style={{ background: p.band.color }} />}
                      <span className="truncate flex-1">{f.name}</span>
                      {p?.mgi != null && <span className="text-[10px] font-bold tabular-nums" style={{ color: p.band.color }}>{p.mgi.toFixed(2)}</span>}
                      <span className="text-[10px] text-slate-400 w-4 text-right">{f.subs.length}</span>
                    </button>
                  );
                })}
              </>)}
        </aside>

        <main className="flex-1 overflow-y-auto p-6">
          <div className="mb-4">
            <h1 className="text-2xl font-extrabold tracking-tight">{field.name}</h1>
            {hasData && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {d.ma.length
                  ? d.ma.map(m => <Chip key={m} tone="violet">M&A · {m}</Chip>)
                  : <Tip label="No M&A hook is mapped to this search field. This is a recorded finding, not missing data — an unmapped field has no existing acquisition thesis to build on, which raises the entry bar."><span className="cursor-help"><Chip tone="slate">M&A · none mapped</Chip></span></Tip>}
                {d.bbm.length
                  ? d.bbm.map(b => <Chip key={b} tone="teal">BBM · {b}</Chip>)
                  : <Tip label="No BBM business-stream hook is mapped to this search field. This is a recorded finding, not missing data — without a mapped stream there is no existing go-to-market motion to carry the offer."><span className="cursor-help"><Chip tone="slate">BBM · none mapped</Chip></span></Tip>}
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
            {sub !== "All" && <SubFieldDrill fieldId={fieldId} sub={sub} fieldName={field.name} />}
          </div>

          {!hasData ? (
            <div className="bg-white border border-dashed border-slate-300 rounded-xl p-12 text-center">
              <div className="text-4xl mb-2">◌</div>
              <div className="font-semibold">No deep dive cached for {field.name}</div>
              <div className="text-sm text-slate-500 mt-1 mb-4">The agent will run the same fixed pipeline (10 grounded frameworks + sub-field roll-up, ~3–4 min).</div>
              <button className="px-4 py-2 rounded-lg text-white text-sm font-semibold" style={{ background: INK }}>Run deep dive</button>
              <div className="text-xs text-slate-400 mt-3">This field is not yet populated.</div>
            </div>
          ) : (
            <>
              <ReadMeFirst />
              <div className="flex gap-1 border-b border-slate-200 mb-4 overflow-x-auto">
                {TABS.map(t => (
                  <button key={t} onClick={() => setTab(t)}
                    className={`px-3 py-2 text-sm whitespace-nowrap border-b-2 -mb-px font-medium ${tab === t ? "border-red-600 text-slate-900" : "border-transparent text-slate-500 hover:text-slate-800"}`}>
                    {t}
                  </button>
                ))}
              </div>

              {/* ─────────────── AI ANALYST — Master Growth Index + 9 component indices, per the Bosch BBM Search-Field Scoring Document v2 ─────────────── */}
              {tab === "AI Analyst" && (
                <div className="space-y-4">
                  {mgiResult && (
                    <div className="bg-white rounded-xl border-2 shadow-sm p-5" style={{ borderColor: mgiResult.band.color }}>
                      <div className="flex flex-wrap items-center gap-5">
                        <div>
                          <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                            <Term k="MGI">Master Growth Index (MGI)</Term>
                          </div>
                          <div className="text-4xl font-extrabold" style={{ color: mgiResult.band.color }}>{mgiResult.mgi}</div>
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="w-3 h-3 rounded-full inline-block" style={{ background: mgiResult.band.color }} />
                            <span className="text-base font-bold" style={{ color: mgiResult.band.color }}>{mgiResult.band.v}</span>
                          </div>
                          <div className="text-xs text-slate-500 max-w-xl mt-1">{mgiResult.band.m}</div>
                        </div>
                        <div className="ml-auto">
                          <DisputeButton fieldName={field.name} indexLabel="Master Growth Index" indexShort="MGI"
                            value={mgiResult.mgi} band={mgiResult.band.v}
                            rank={indexRank("mgi", fieldId)?.rank} of={indexRank("mgi", fieldId)?.of}
                            derivation={`MGI = 0.4 x Market Potential (${mgiResult.marketPotential}) + 0.35 x Right to Win (${mgiResult.rightToWin}) + 0.25 x Execution Viability (${mgiResult.executionViability}) = ${mgiResult.mgi}\n\nMarket Potential  = 0.65 x MAI (${masResult.mai}) + 0.35 x PESTEL Index (${pestelIdx.index})\nRight to Win      = 0.4 x CGI (${cgiResult.cgi}) + 0.35 x SPI (${swotIdx.spi}) + 0.25 x CPI (${cpiResult.cpi})\nExecution Viability = 0.45 x SCVI (${scviResult.scvi}) + 0.4 x SVI (${sviResult.svi}) + 0.2 x TPI (${tpiResult.tpi})`} />
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4">
                        <Tip label={`0.65 × MAI (${masResult.mai}) + 0.35 × PESTEL Index (${pestelIdx.index})`}>
                          <div className="border border-slate-200 rounded-lg p-3 cursor-help">
                            <div className="text-[10px] font-bold uppercase text-slate-400">Market Potential <span className="font-normal normal-case">(40% weight)</span></div>
                            <div className="text-xl font-bold mt-0.5">{mgiResult.marketPotential}</div>
                            <div className="text-[10px] text-slate-400">0.65×MAI + 0.35×PESTEL Index</div>
                          </div>
                        </Tip>
                        <Tip label={`0.4 × CGI (${cgiResult.cgi}) + 0.35 × SPI (${swotIdx.spi}) + 0.25 × CPI (${cpiResult.cpi})`}>
                          <div className="border border-slate-200 rounded-lg p-3 cursor-help">
                            <div className="text-[10px] font-bold uppercase text-slate-400">Right to Win <span className="font-normal normal-case">(35% weight)</span></div>
                            <div className="text-xl font-bold mt-0.5">{mgiResult.rightToWin}</div>
                            <div className="text-[10px] text-slate-400">0.4×CGI + 0.35×SPI + 0.25×CPI</div>
                          </div>
                        </Tip>
                        <Tip label={`0.45 × SCVI (${scviResult.scvi}) + 0.4 × SVI (${sviResult.svi}) + 0.2 × TPI (${tpiResult.tpi})`}>
                          <div className="border border-slate-200 rounded-lg p-3 cursor-help">
                            <div className="text-[10px] font-bold uppercase text-slate-400">Execution Viability <span className="font-normal normal-case">(25% weight)</span></div>
                            <div className="text-xl font-bold mt-0.5">{mgiResult.executionViability}</div>
                            <div className="text-[10px] text-slate-400">0.45×SCVI + 0.4×SVI + 0.2×TPI</div>
                          </div>
                        </Tip>
                      </div>
                      <div className="text-[10px] font-mono text-slate-400 bg-slate-50 rounded px-2 py-1 mt-3">MGI = 0.4×{mgiResult.marketPotential} + 0.35×{mgiResult.rightToWin} + 0.25×{mgiResult.executionViability} = {mgiResult.mgi}</div>
                    </div>
                  )}

                  <ScoringLegend fieldId={fieldId} />

                  <div className="text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
                    The 9 component indices below feed the MGI above. Each is computed live from its own 1/3/5 (or Low/Medium/High) inputs — hover a verdict for the formula, click "detail" to see the full working. The strip on each card shows where this field sits against the other 14.
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <IndexCard title="PESTEL Index" score={pestelIdx?.index} scoreMax={null} band={pestelIdx?.band}
                      formula={pestelIdx ? `Index = (Tailwinds ${pestelIdx.tail} − Headwinds ${pestelIdx.head}) ÷ (Tailwinds + Headwinds), from ${pestelIdx.tailN + pestelIdx.headN} scored points (impact × certainty)` : null}
                      indexKey="pi" fieldId={fieldId} fieldName={field.name} tabTarget="PESTEL" onGoTo={setTab} />
                    <IndexCard title="SWOT Posture (SPI)" score={swotIdx?.spi} scoreMax={null} band={swotIdx?.band}
                      formula={swotIdx ? `0.3×IRI(${swotIdx.iri}) + 0.7×EAI(${swotIdx.eai}) — Quadrant ${swotIdx.quadrant?.key}: ${swotIdx.quadrant?.name}` : null}
                      indexKey="spi" fieldId={fieldId} fieldName={field.name} tabTarget="SWOT" onGoTo={setTab} />
                    <IndexCard title="Market Attractiveness (MAI)" score={masResult?.mai} scoreMax={null} band={masResult?.band}
                      formula={masResult ? `MAS ${masResult.mas} → (MAS−3)÷2. MAS = 0.35×ScaleVelocity(${masResult.scaleVelocity}) + 0.2×S-Curve(${masResult.scurveScore}) + 0.2×RevQuality(${masResult.revenueQualityScore}) + 0.25×Profitability(${masResult.profitabilityScore})` : null}
                      indexKey="mai" fieldId={fieldId} fieldName={field.name} tabTarget="Market" onGoTo={setTab} />
                    <IndexCard title="Industry Attractiveness (IAI)" score={iaiResult?.iai} scoreMax={null} band={iaiResult?.band}
                      formula={iaiResult ? `Raw IAI ${iaiResult.iaiRaw} → (3−raw)÷2. Avg of 5 Porter forces: ${Object.entries(iaiResult.forceAvgs).map(([k, v]) => `${k} ${v}`).join(" · ")}` : null}
                      indexKey="iai" fieldId={fieldId} fieldName={field.name} tabTarget="Attractiveness" onGoTo={setTab} />
                    <IndexCard title="Competency Gap (CGI)" score={cgiResult?.cgi} scoreMax={null} band={cgiResult?.band}
                      formula={cgiResult ? `Σ(Gap×Weight)÷3 across 7 competency areas — ${cgiResult.rows.map(r => `${r.label} gap ${r.gap > 0 ? "+" : ""}${r.gap}`).join(", ")}` : null}
                      indexKey="cgi" fieldId={fieldId} fieldName={field.name} tabTarget="Competency" onGoTo={setTab} />
                    <IndexCard title="Stakeholder Viability (SVI)" score={sviResult?.svi} scoreMax={null} band={sviResult?.band}
                      formula={sviResult ? `Base SVI (${sviResult.baseSVI}) × VSF (${sviResult.vsf}) — TES ${sviResult.TES} vs TET ${sviResult.TET}` : null}
                      indexKey="svi" fieldId={fieldId} fieldName={field.name} tabTarget="Stakeholders" onGoTo={setTab} />
                    <IndexCard title="Competitive Posture (CPI)" score={cpiResult?.cpi} scoreMax={null} band={cpiResult ? { ...cpiResult.band, v: `${cpiResult.band.v} — ${cpiResult.label}` } : null}
                      formula={cpiResult ? `Strategic Value Score ${cpiResult.svs} → (SVS−5)÷4. Advantage ${cpiResult.advantageScore} vs avg threat ${cpiResult.avgThreatScore}` : null}
                      indexKey="cpi" fieldId={fieldId} fieldName={field.name} tabTarget="Competitors" onGoTo={setTab} />
                    <IndexCard title="Supply Chain Viability (SCVI)" score={scviResult?.scvi} scoreMax={null} band={scviResult ? { ...scviResult.band, v: `${scviResult.band.v} — ${scviResult.label}` } : null}
                      formula={scviResult ? `SCVS ${scviResult.scvs} → (SCVS−3)÷2. Matrix: Supply Chain Maturity × Bosch Control & Leverage → "${scviResult.label}"` : null}
                      indexKey="scvi" fieldId={fieldId} fieldName={field.name} tabTarget="Suppliers" onGoTo={setTab} />
                    <IndexCard title="Technology Prognosis (TPI)" score={tpiResult?.tpi} scoreMax={null} band={tpiResult ? { ...tpiResult.band, v: `${tpiResult.band.v} — ${tpiResult.label}` } : null}
                      formula={tpiResult ? `TPS ${tpiResult.tps} → (TPS−3)÷2. Matrix: Technological Velocity × Commercialization Readiness → "${tpiResult.label}"` : null}
                      indexKey="tpi" fieldId={fieldId} fieldName={field.name} tabTarget="3 Horizons" onGoTo={setTab} />
                  </div>

                  {d.verdict.aiAnalyst && (
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
                      <div className="text-sm font-bold text-slate-800 mb-3">AI Analyst — where Bosch wins &amp; the comprehensive recommendation</div>
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <div>
                          <div className="text-[10px] font-bold uppercase tracking-widest text-green-700 mb-1.5">Where we win</div>
                          <ul className="text-sm space-y-1.5">
                            {d.verdict.aiAnalyst.whereWeWin.map((r, i) => <li key={i} className="flex gap-2"><span className="text-green-600">▸</span><span>{r}</span></li>)}
                          </ul>
                        </div>
                        <div>
                          <div className="text-[10px] font-bold uppercase tracking-widest text-red-700 mb-1.5">Where we're exposed</div>
                          <ul className="text-sm space-y-1.5">
                            {d.verdict.aiAnalyst.exposure.map((r, i) => <li key={i} className="flex gap-2"><span className="text-red-600">▸</span><span>{r}</span></li>)}
                          </ul>
                        </div>
                      </div>
                      <div className="mt-4 text-sm text-slate-700 leading-relaxed bg-slate-50 rounded-lg p-4">{d.verdict.aiAnalyst.narrative}</div>
                      <div className="mt-3 text-xs text-teal-800 bg-teal-50 rounded-lg p-3"><b>Bottom line:</b> {d.verdict.aiAnalyst.bottomLine}</div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    <Card title="Reasoning">
                      <ul className="text-sm space-y-2">
                        {d.verdict.reasoning.map((r, i) => <li key={i} className="flex gap-2"><span className="text-teal-600">▸</span><span>{r}</span></li>)}
                      </ul>
                    </Card>
                    <Card title="Key risks">
                      {d.verdict.risks.map(r => <div key={r} className="text-xs text-red-700 flex gap-2 mb-1.5"><span>⚠</span>{r}</div>)}
                    </Card>
                    {swotIdx?.strategies && (
                      <Card title="Strategy priority — SO / ST / WO / WT">
                        <div className="space-y-1.5">
                          {swotIdx.strategies.map((s, i) => (
                            <div key={s.k} className="flex items-center justify-between border border-slate-200 rounded-lg px-2.5 py-1.5">
                              <span className="text-xs"><Chip tone={i === 0 ? "green" : "slate"}>{s.k}</Chip> <span className="ml-1 text-slate-600">{s.label}</span></span>
                              <span className="text-xs font-bold">{s.v}</span>
                            </div>
                          ))}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-2">Highest sum = the strategy to implement first (per scoring document §2e).</div>
                      </Card>
                    )}
                  </div>

                  <Card title="Where to Play — what Bosch should actually do in each sub-field"
                    right={<span className="text-[10px] text-slate-400">scores roll up to this field&apos;s MGI above</span>}>
                    <div className="text-xs text-slate-600 bg-slate-50 rounded-lg p-3 mb-3">
                      Four plays, and each one means something specific:{" "}
                      <Term k="LEAD"><b>LEAD</b></Term> — own it, invest directly.{" "}
                      <Term k="PARTNER"><b>PARTNER</b></Term> — real opportunity, but Bosch needs someone else.{" "}
                      <Term k="WATCH"><b>WATCH</b></Term> — interesting, not yet; a named trigger has to fire first.{" "}
                      <Term k="SKIP"><b>SKIP</b></Term> — a deliberate no, recorded so it stays visible.
                    </div>
                    <div className="space-y-3">
                      {d.verdict.portfolio.map(p => (
                        <div key={p.sub} className="border border-slate-200 rounded-lg overflow-hidden">
                          <div className="flex items-center justify-between gap-2 px-3 py-2 bg-slate-50 border-b border-slate-100">
                            <button onClick={() => setSub(p.sub)} className="font-semibold text-sm text-left hover:text-teal-700 hover:underline">{p.sub}</button>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <Term k={p.play}><Chip tone={p.play === "LEAD" ? "green" : p.play === "PARTNER" ? "teal" : p.play === "SKIP" ? "red" : "amber"}>{p.play}</Chip></Term>
                              <button onClick={() => setSub(p.sub)} className="text-[10px] text-teal-700 hover:underline">drill down →</button>
                            </div>
                          </div>
                          <div className="p-3 space-y-2">
                            {p.what && (
                              <div className="text-xs">
                                <span className="font-bold text-slate-500 uppercase tracking-wide text-[10px] mr-1.5">What Bosch sells</span>
                                <span className="text-slate-700">{p.what}</span>
                              </div>
                            )}
                            <div className="text-xs">
                              <span className="font-bold text-teal-700 uppercase tracking-wide text-[10px] mr-1.5">Why this play</span>
                              <span className="text-slate-700">{p.why}</span>
                            </div>
                            {p.winCondition && (
                              <div className="text-xs">
                                <span className="font-bold text-purple-700 uppercase tracking-wide text-[10px] mr-1.5">What has to be true</span>
                                <span className="text-slate-700">{p.winCondition}</span>
                              </div>
                            )}
                            {p.ifWrong && (
                              <div className="text-xs">
                                <span className="font-bold text-amber-700 uppercase tracking-wide text-[10px] mr-1.5">What would change it</span>
                                <span className="text-slate-700">{p.ifWrong}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                    {!d.verdict.portfolio.some(p => p.what) && (
                      <div className="text-[11px] text-amber-800 bg-amber-50 border border-amber-100 rounded px-2.5 py-1.5 mt-3">
                        This field still carries the short form of the play rationale. The fuller version — what Bosch
                        sells, what has to be true, and what would change the call — is authored field by field and
                        this one is pending.
                      </div>
                    )}
                  </Card>
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

                  {/* PESTEL Index — Σtailwinds(impact×certainty) ÷ Σheadwinds(impact×certainty), per scoring document §1 */}
                  {pestelIdx && (
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex flex-wrap items-center gap-4">
                      <div>
                        <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">PESTEL Index</div>
                        <div className="text-3xl font-extrabold" style={{ color: pestelIdx.band.color }}>{pestelIdx.index}</div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: pestelIdx.band.color }} />
                        <span className="text-sm font-semibold" style={{ color: pestelIdx.band.color }}>{pestelIdx.band.v}</span>
                      </div>
                      <div className="text-xs text-slate-500 flex-1 min-w-[200px]">{pestelIdx.band.m}</div>
                      <div className="text-[10px] font-mono text-slate-400 bg-slate-50 rounded px-2 py-1">Σtailwinds {pestelIdx.tail} ÷ Σheadwinds {pestelIdx.head} = {pestelIdx.index} · from {pestelIdx.tailN + pestelIdx.headN} scored points</div>
                    </div>
                  )}

                  {/* PESTEL for/against split — uses V7 data when available, falls back to legacy points */}
                  {v7?.pestelFA ? (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      {[["P","Political"],["E","Economic"],["S","Social"],["T","Technological"],["En","Environmental"],["L","Legal"]].map(([k, label]) => {
                        const fa = v7.pestelFA[k] || {};
                        const sc = v8?.pestel?.[k];
                        return (
                          <div key={k} className="bg-white rounded-xl border border-slate-200 shadow-sm">
                            <div className="px-4 py-2 border-b border-slate-100 flex items-center justify-between">
                              <h3 className="text-sm font-semibold text-slate-800">{label} — {field.name}</h3>
                              <span className="text-[10px] text-slate-400">{(fa.for || []).length} tailwinds · {(fa.against || []).length} headwinds</span>
                            </div>
                            <div className="p-3 grid grid-cols-1 md:grid-cols-2 gap-2">
                              {/* Tailwinds */}
                              <div>
                                <div className="text-[10px] font-bold uppercase tracking-widest text-green-700 mb-2 flex items-center gap-1">▲ Tailwinds — working in our favour</div>
                                {(fa.for || []).slice(0,3).map((x, i) => {
                                  const s = sc?.for?.[i];
                                  return (
                                  <Tip key={i} label={`${x.why}\n\nSO WHAT: ${x.sowhat}`}>
                                    <div className="border border-green-100 bg-green-50/40 rounded-lg p-2.5 mb-2 last:mb-0 hover:border-green-300 transition-colors">
                                      <div className="text-xs font-medium text-slate-800">{x.p}</div>
                                      <div className="text-[11px] text-green-700 mt-1">{x.sowhat}</div>
                                      {s && (
                                        <Tip label={`Impact: ${PESTEL_IMPACT_LABELS.for[s.impact]}\nCertainty: ${PESTEL_CERTAINTY_LABELS[s.certainty]}`}>
                                          <div className="mt-1.5 inline-block text-[10px] font-mono bg-white border border-green-200 rounded px-1.5 py-0.5 text-green-800 cursor-help">Impact {s.impact} × Certainty {s.certainty} = {s.impact * s.certainty}</div>
                                        </Tip>
                                      )}
                                    </div>
                                  </Tip>
                                  );
                                })}
                              </div>
                              {/* Headwinds */}
                              <div>
                                <div className="text-[10px] font-bold uppercase tracking-widest text-red-600 mb-2 flex items-center gap-1">▼ Headwinds — working against us</div>
                                {(fa.against || []).slice(0,3).map((x, i) => {
                                  const s = sc?.against?.[i];
                                  return (
                                  <Tip key={i} label={`${x.why}\n\nSO WHAT: ${x.sowhat}`}>
                                    <div className="border border-red-100 bg-red-50/40 rounded-lg p-2.5 mb-2 last:mb-0 hover:border-red-300 transition-colors">
                                      <div className="text-xs font-medium text-slate-800">{x.p}</div>
                                      <div className="text-[11px] text-red-700 mt-1">{x.sowhat}</div>
                                      {s && (
                                        <Tip label={`Impact: ${PESTEL_IMPACT_LABELS.against[s.impact]}\nCertainty: ${PESTEL_CERTAINTY_LABELS[s.certainty]}`}>
                                          <div className="mt-1.5 inline-block text-[10px] font-mono bg-white border border-red-200 rounded px-1.5 py-0.5 text-red-800 cursor-help">Impact {s.impact} × Certainty {s.certainty} = {s.impact * s.certainty}</div>
                                        </Tip>
                                      )}
                                    </div>
                                  </Tip>
                                  );
                                })}
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
                            <div className="text-sm font-medium">{x.p}<Cite ids={x.c} fieldId={fieldId} /></div>
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
                  {swotIdx && (
                    <div className="md:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm p-4">
                      <div className="flex flex-wrap items-center gap-4">
                        <div>
                          <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Strategic Posture Index (SPI)</div>
                          <div className="text-3xl font-extrabold" style={{ color: swotIdx.band.color }}>{swotIdx.spi}</div>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: swotIdx.band.color }} />
                          <span className="text-sm font-semibold" style={{ color: swotIdx.band.color }}>{swotIdx.band.v}</span>
                        </div>
                        <div className="text-xs text-slate-500 flex-1 min-w-[200px]">{swotIdx.band.m}</div>
                        <div className="text-[10px] font-mono text-slate-400 bg-slate-50 rounded px-2 py-1">SPI = 0.3×IRI({swotIdx.iri}) + 0.7×EAI({swotIdx.eai}) = {swotIdx.spi}</div>
                      </div>
                      {swotIdx.quadrant && (
                        <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div className="border border-slate-200 rounded-lg p-3">
                            <div className="text-[10px] font-bold uppercase text-slate-400">IRI — Internal Readiness</div>
                            <div className="text-lg font-bold">{swotIdx.iri}</div>
                            <div className="text-[10px] text-slate-400">(Strength {swotIdx.S} − Weakness {swotIdx.W}) ÷ (Strength + Weakness)</div>
                          </div>
                          <div className="border border-slate-200 rounded-lg p-3">
                            <div className="text-[10px] font-bold uppercase text-slate-400">EAI — External Attractiveness</div>
                            <div className="text-lg font-bold">{swotIdx.eai}</div>
                            <div className="text-[10px] text-slate-400">(Opportunity {swotIdx.O} − Threat {swotIdx.T}) ÷ (Opportunity + Threat)</div>
                          </div>
                          <div className="md:col-span-2 border-2 rounded-lg p-3" style={{ borderColor: swotIdx.band.color }}>
                            <div className="flex items-center gap-2">
                              <Chip tone="violet">Quadrant {swotIdx.quadrant.key}</Chip>
                              <span className="text-sm font-bold">{swotIdx.quadrant.name}</span>
                              <span className="text-xs text-slate-500 ml-auto">{swotIdx.quadrant.mandate}</span>
                            </div>
                            <div className="text-xs text-slate-600 mt-1.5">{swotIdx.quadrant.action}</div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  <div className="md:col-span-2 text-xs text-slate-500 bg-white border border-slate-200 rounded-lg px-3 py-2">
                    Internal factors (Strengths/Weaknesses) assessed across five areas: <b>People · Technology · Process · Market · Leadership</b>. Hover any point for detailed reasoning.
                  </div>
                  {[["Strengths", "S", (v7?.swot5?.S || d.swot.S), "green"], ["Weaknesses", "W", (v7?.swot5?.W || d.swot.W), "red"], ["Opportunities", "O", (v7?.swot5?.O || d.swot.O), "teal"], ["Threats", "T", (v7?.swot5?.T || d.swot.T), "amber"]].map(([t, qk, items, tone]) => (
                    <Card key={t} title={`${t} — Bosch Mobility India`} right={<span className="text-[10px] text-slate-400">{Math.min(5, items?.length || 0)} of 5</span>}>
                      {(items || []).slice(0, 5).map((x, i) => {
                        const s = v8?.swot?.[qk]?.[i];
                        return (
                        <Tip key={i} label={`${x.why ? "WHY: " + x.why : ""}${x.sowhat ? "\n\nSO WHAT: " + x.sowhat : ""}`}>
                        <Reasoned point={x.p} why={x.why} sowhat={x.sowhat}
                          tag={<span className="flex gap-1 items-center"><Chip tone={tone}>{t[0]}</Chip>{x.area && <span className="text-[10px] font-bold uppercase tracking-wide text-slate-500 bg-slate-100 rounded px-1.5 py-0.5">{x.area}</span>}</span>}
                          badge={s && (
                            <Tip label={`Impact: ${SWOT_IMPACT_LABELS[qk][s.impact]}\nProbability/Confidence: ${SWOT_PROB_LABELS[qk][s.probability]}`}>
                              <div className="mt-1.5 inline-block text-[10px] font-mono bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5 text-slate-700 cursor-help">Impact {s.impact} × Probability {s.probability} = {s.impact * s.probability}</div>
                            </Tip>
                          )} />
                        </Tip>
                        );
                      })}
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
                  {d.market.buildup && (
                    <div className="lg:col-span-2">
                      <Card title={`How the market size is built up — India, ${d.market.year}`}
                        right={<span className="text-[10px] text-slate-400">segments must sum to the total · hover any segment</span>}>
                        <div className="text-xs text-slate-600 bg-slate-50 rounded-lg p-3 mb-3">
                          Review feedback was that the sizing looked asserted rather than derived. Every component is now
                          shown as a share of the total, and the segments have to add up — if they do not, the chart says so.
                          Click a <Term k="SAM">SAM</Term> line to open that sub-field.
                        </div>
                        <StackedBuildup title="TAM" termKey="TAM" note={d.market.buildup.tamNote}
                          rows={d.market.buildup.tam} total={d.market.tam} />
                        <StackedBuildup title="SAM" termKey="SAM" note={d.market.buildup.samNote}
                          rows={d.market.buildup.sam} total={d.market.sam} onSub={setSub} />
                      </Card>
                    </div>
                  )}
                  <Card title={`TAM / SAM derivation — the filtering logic, India, ${d.market.year}`}>
                    <table className="w-full text-xs">
                      <thead><tr className="text-left text-slate-400"><th className="pb-1">Step</th><th className="pb-1">Value</th><th className="pb-1">Source</th></tr></thead>
                      <tbody>
                        {d.market.derivation.map((s, i) => (
                          <tr key={i} className="border-t border-slate-100 align-top">
                            <td className="py-1.5 pr-2">{s.step}</td>
                            <td className="py-1.5 pr-2 font-medium">{s.value}</td>
                            <td className="py-1.5 text-slate-500"><span className="inline-flex items-center gap-1 flex-wrap">{s.src}<SrcLink label={s.src} compact /></span></td>
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
                      <div className="text-xs text-slate-600 bg-slate-50 rounded-lg p-3 mt-2"><b>Score rationale:</b> {d.market.scoreRationale}</div>
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

                  {masResult && (
                    <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm p-4">
                      <div className="flex flex-wrap items-center gap-4 mb-3">
                        <div>
                          <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Market Attractiveness Score (MAS)</div>
                          <div className="text-3xl font-extrabold" style={{ color: masResult.band.color }}>{masResult.mas}<span className="text-sm text-slate-400"> / 5</span></div>
                        </div>
                        <div>
                          <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">MAI = (MAS−3)÷2</div>
                          <div className="text-2xl font-extrabold" style={{ color: masResult.band.color }}>{masResult.mai}</div>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: masResult.band.color }} />
                          <span className="text-sm font-semibold" style={{ color: masResult.band.color }}>{masResult.band.v}</span>
                          {masResult.band.code && <Chip tone={masResult.band.code === "GO" ? "green" : masResult.band.code === "NO-GO" ? "red" : "amber"}>{masResult.band.code}</Chip>}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                        <Tip label={`SAM $${(masResult.samUSD/1e6).toFixed(0)}M → score ${masResult.samScore}; CAGR ${masResult.cagrPct}% → score ${masResult.cagrScore}`}>
                          <div className="border border-slate-200 rounded-lg p-2.5 cursor-help"><div className="font-bold uppercase text-slate-400 text-[10px]">0.35 × Scale &amp; Velocity</div><div className="text-lg font-bold mt-1">{masResult.scaleVelocity}</div></div>
                        </Tip>
                        <Tip label={SCURVE_LABELS[masResult.scurveScore] + "\n\n" + masResult.scurveWhy}>
                          <div className="border border-slate-200 rounded-lg p-2.5 cursor-help"><div className="font-bold uppercase text-slate-400 text-[10px]">0.2 × S-Curve Timing</div><div className="text-lg font-bold mt-1">{masResult.scurveScore}</div></div>
                        </Tip>
                        <Tip label={REVENUE_QUALITY_LABELS[masResult.revenueQualityScore] + "\n\n" + masResult.revenueQualityWhy}>
                          <div className="border border-slate-200 rounded-lg p-2.5 cursor-help"><div className="font-bold uppercase text-slate-400 text-[10px]">0.2 × Revenue Quality</div><div className="text-lg font-bold mt-1">{masResult.revenueQualityScore}</div></div>
                        </Tip>
                        <Tip label={PROFITABILITY_LABELS[masResult.profitabilityScore] + "\n\n" + masResult.profitabilityWhy}>
                          <div className="border border-slate-200 rounded-lg p-2.5 cursor-help"><div className="font-bold uppercase text-slate-400 text-[10px]">0.25 × Profitability</div><div className="text-lg font-bold mt-1">{masResult.profitabilityScore}</div></div>
                        </Tip>
                      </div>
                      <div className="text-[10px] font-mono text-slate-400 bg-slate-50 rounded px-2 py-1 mt-3">MAS = 0.35×{masResult.scaleVelocity} + 0.2×{masResult.scurveScore} + 0.2×{masResult.revenueQualityScore} + 0.25×{masResult.profitabilityScore} = {masResult.mas}</div>
                    </div>
                  )}

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
                  {iaiResult && (
                    <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm p-4">
                      <div className="flex flex-wrap items-center gap-4 mb-3">
                        <div>
                          <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Industry Attractiveness Index (IAI)</div>
                          <div className="text-3xl font-extrabold" style={{ color: iaiResult.band.color }}>{iaiResult.iai}<span className="text-sm text-slate-400"> / +1</span></div>
                        </div>
                        <div>
                          <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Raw five-force average</div>
                          <div className="text-3xl font-extrabold text-slate-700">{iaiResult.iaiRaw}<span className="text-sm text-slate-400"> / 5</span></div>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: iaiResult.band.color }} />
                          <span className="text-sm font-semibold" style={{ color: iaiResult.band.color }}>{iaiResult.band.v}</span>
                        </div>
                        <div className="text-xs text-slate-500">Raw scale: 1 = Structurally Attractive (Blue Ocean) · 5 = Structurally Unattractive (Red Ocean).<br />Normalized IAI runs −1 (Red Ocean) to +1 (Blue Ocean), so it is comparable with the other eight indices.</div>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                        {Object.entries(iaiResult.forceAvgs).map(([force, avgScore]) => (
                          <Tip key={force} label={`Sub-factors (1/3/5 each): ${PORTER_FRAMEWORK[force]?.join(", ")}\n\nScores: ${v8.iai[force].join(", ")}`}>
                            <div className="border border-slate-200 rounded-lg p-2.5 cursor-help text-center">
                              <div className="font-bold uppercase text-slate-400 text-[10px]">{force}</div>
                              <div className="text-lg font-bold mt-1">{avgScore}</div>
                              <div className="text-[9px] text-slate-400">avg of {v8.iai[force].length}</div>
                            </div>
                          </Tip>
                        ))}
                      </div>
                      <div className="text-[10px] font-mono text-slate-400 bg-slate-50 rounded px-2 py-1 mt-3">raw = avg({Object.values(iaiResult.forceAvgs).join(", ")}) = {iaiResult.iaiRaw} &nbsp;·&nbsp; IAI = (3 − {iaiResult.iaiRaw}) ÷ 2 = {iaiResult.iai}</div>
                    </div>
                  )}
                  <Card title="Porter's Five Forces — pressure (10 = hostile)">
                    <div className="text-xs text-slate-600 bg-teal-50 border border-teal-100 rounded-lg p-3 mb-3">
                      <b>How to read this:</b> higher means more hostile. Each force is scored across the sub-factors the
                      framework defines (listed underneath), and this chart is computed from those sub-factor scores —
                      so the chart and the <Term k="IAI">Industry Attractiveness Index</Term> can never disagree with
                      each other. They used to be scored separately and had drifted apart on a third of the forces
                      in the portfolio; that is now fixed at the source.
                    </div>
                    <ResponsiveContainer width="100%" height={300}>
                      <RadarChart data={porterRows} outerRadius="75%">
                        <PolarGrid stroke="#E2E8F0" />
                        <PolarAngleAxis dataKey="force" tick={{ fontSize: 12, fill: "#475569" }} />
                        <PolarRadiusAxis domain={[0, 10]} tick={false} axisLine={false} />
                        <Radar dataKey="v" stroke="#E20015" fill="#E20015" fillOpacity={0.18} strokeWidth={2} />
                        <Tooltip formatter={(v, n, p) => [`${v} / 10 pressure`, p.payload.force]} />
                      </RadarChart>
                    </ResponsiveContainer>
                    <div className="text-xs text-slate-600 bg-slate-50 rounded-lg p-3"><b>How this was derived:</b> {d.porterRationale}</div>
                  </Card>
                  <Card title="Scoring rationale — what drives each force">
                    {porterRows.map(f => (
                      <div key={f.force} className="border border-slate-200 rounded-lg p-3 mb-2 last:mb-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-semibold">{f.force}</span>
                          <span className="text-sm font-bold">{f.v.toFixed(1)}<span className="text-slate-400 font-normal">/10</span></span>
                        </div>
                        <div className="h-1.5 bg-slate-100 rounded-full mt-1.5 mb-2"><div className="h-1.5 rounded-full" style={{ width: `${f.v * 10}%`, background: f.v >= 7 ? "#E20015" : f.v >= 5 ? "#D97706" : "#5BAA32" }} /></div>
                        <p className="text-xs text-slate-600">{f.why}</p>
                        <div className="flex flex-wrap gap-1 mt-2">{f.drivers.map(dr => <Chip key={dr}>{dr}</Chip>)}</div>
                        {f.drift && (
                          <Tip label={`The sub-factor scores compute this force at ${f.v}/10, but the written rationale above was authored against ${f.authored}/10.\n\nThe sub-factor scores are the ones the scoring document defines, so they are authoritative and the number shown is correct. The wording is what needs a re-read — flagged here rather than hidden.`}>
                            <div className="mt-2 text-[10px] text-amber-800 bg-amber-50 border border-amber-100 rounded px-1.5 py-0.5 inline-block cursor-help">
                              Rationale written against {f.authored}/10 — wording needs a re-read
                            </div>
                          </Tip>
                        )}
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
                  {cgiResult ? (
                    <>
                      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex flex-wrap items-center gap-4">
                        <div>
                          <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Competency Gap Index (CGI)</div>
                          <div className="text-3xl font-extrabold" style={{ color: cgiResult.band.color }}>{cgiResult.cgi}</div>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: cgiResult.band.color }} />
                          <span className="text-sm font-semibold" style={{ color: cgiResult.band.color }}>{cgiResult.band.v}</span>
                        </div>
                        <div className="text-xs text-slate-500 flex-1 min-w-[200px]">{cgiResult.band.m}</div>
                        <div className="text-[10px] font-mono text-slate-400 bg-slate-50 rounded px-2 py-1">CGI = Σ(Gap × Weight) ÷ 3 = {cgiResult.cgi}</div>
                      </div>
                      <Card title="Competency assessment — 7 standard areas, weighted by sector profile">
                        <div className="overflow-x-auto">
                          <table className="w-full text-xs">
                            <thead><tr className="text-left text-slate-400">
                              <th className="pb-2 pr-2">Area</th>
                              <th className="pb-2 pr-2 text-center">Market Required (1–4)</th>
                              <th className="pb-2 pr-2 text-center">Bosch Current (1–4)</th>
                              <th className="pb-2 pr-2 text-center">Gap</th>
                              <th className="pb-2 pr-2 text-center">Weight</th>
                              <th className="pb-2 text-center">Weighted Gap</th>
                            </tr></thead>
                            <tbody>
                              {cgiResult.rows.map(r => (
                                <tr key={r.k} className="border-t border-slate-100 align-top">
                                  <td className="py-2 pr-2 font-semibold whitespace-nowrap">{r.label}</td>
                                  <td className="py-2 pr-2 text-center"><Tip label={COMPETENCY_LEVEL_LABELS[r.required]}><span className="cursor-help font-medium border-b border-dotted border-slate-400">{r.required}</span></Tip></td>
                                  <td className="py-2 pr-2 text-center"><Tip label={COMPETENCY_LEVEL_LABELS[r.current]}><span className="cursor-help font-medium border-b border-dotted border-slate-400">{r.current}</span></Tip></td>
                                  <td className={`py-2 pr-2 text-center font-bold ${r.gap < 0 ? "text-red-700" : r.gap > 0 ? "text-green-700" : "text-slate-500"}`}>{r.gap > 0 ? `+${r.gap}` : r.gap}</td>
                                  <td className="py-2 pr-2 text-center text-slate-500">{(r.weight * 100).toFixed(0)}%</td>
                                  <td className="py-2 text-center font-mono text-slate-600">{(r.gap * r.weight).toFixed(2)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                        <div className="text-[10px] text-slate-400 mt-2">Scale: 1 Beginner · 2 Experienced Personnel · 3 Specialist · 4 Champion (hover a level for the full definition). Gap = Current − Required. Weight profile: <b>{v8.competency?.profile}</b>.</div>
                      </Card>
                      {v8?.competency?.narrative && (
                        <Card title="Where the gaps are — and how to close them">
                          <p className="text-sm text-slate-700">{v8.competency.narrative}</p>
                        </Card>
                      )}
                    </>
                  ) : (
                    <div className="bg-white border border-dashed border-slate-300 rounded-xl p-8 text-center text-sm text-slate-500">Competency assessment not yet compiled for this field.</div>
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
                    {sviResult && (
                      <Card title="Stakeholder Viability Index (SVI) — computed from the map below"
                        right={<span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full inline-block" style={{ background: sviResult.band.color }} /><span className="text-xs font-semibold" style={{ color: sviResult.band.color }}>{sviResult.band.v}</span></span>}>
                        <div className="grid grid-cols-4 gap-2 mb-2">
                          {[["TES", sviResult.TES, "total effective support (proponents, BIM-boosted)"], ["TET", sviResult.TET, "total effective threat (opponents, BIM-mitigated)"], ["Base SVI", sviResult.baseSVI, "(TES−TET)÷(TES+TET)"], ["VSF", sviResult.vsf, "volatility scaling — 1.00 = no Neutrals"]].map(([k, v, sub]) => (
                            <div key={k} className="border border-slate-200 rounded-lg p-2 text-center">
                              <div className="text-lg font-bold">{v}</div>
                              <div className="text-[10px] font-bold uppercase text-slate-500">{k}</div>
                              <div className="text-[9px] text-slate-400">{sub}</div>
                            </div>
                          ))}
                        </div>
                        <div className="text-2xl font-extrabold" style={{ color: sviResult.band.color }}>{sviResult.svi}</div>
                        <div className="text-xs text-slate-700 mt-1"><b>Final SVI</b> = Base SVI ({sviResult.baseSVI}) × VSF ({sviResult.vsf}) = {sviResult.svi}</div>
                        <div className="text-xs text-slate-500 mt-2">{sviResult.band.m}</div>
                      </Card>
                    )}
                  </div>
                  <div className="lg:col-span-2 text-xs text-slate-500 bg-white border border-slate-200 rounded-lg px-3 py-2">
                    <b>Standardized categories</b> (scoring document §6): {STAKEHOLDER_CATEGORIES.join(" · ")}. Each stakeholder below is tagged with the category it falls in — this keeps the analysis comparable across all 15 fields. The map shows the stakeholders that matter most for this field.
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
                    {d.stakeholders.map(s => {
                      const sc = v8?.stakeholders?.find(x => x.name === s.name);
                      return (
                      <div key={s.name} className="border border-slate-200 rounded-lg p-3 mb-2 last:mb-0">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-semibold">{s.name}</span>
                          <div className="flex gap-1">
                            {sc?.category && <Chip tone="violet">{sc.category}</Chip>}
                            <Chip tone="slate">{s.type}</Chip>
                            <Chip tone={s.stance === "ally" ? "green" : s.stance === "blocker" ? "red" : "teal"}>{s.stance}</Chip>
                          </div>
                        </div>
                        <div className="text-[11px] text-slate-400 mt-1">influence {s.influence}/10 · interest {s.interest}/10</div>
                        <p className="text-xs text-slate-600 mt-1">{s.reasoning}</p>
                        {sc && (
                          <Tip label={sc.boschInfluenceWhy}>
                            <div className="mt-1.5 inline-block text-[10px] font-mono bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5 text-slate-700 cursor-help">Power {sc.power} · Bosch Influence {sc.boschInfluence}</div>
                          </Tip>
                        )}
                      </div>
                      );
                    })}
                  </Card>
                </div>
              )}

              {/* ─────────────── COMPETITORS (Perceptual map) ─────────────── */}
              {tab === "Competitors" && d.competitors && (
                <div className="space-y-4">
                  {cpiResult && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
                        <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Competitive Posture Index (CPI)</div>
                        <div className="text-3xl font-extrabold" style={{ color: cpiResult.band.color }}>{cpiResult.cpi}</div>
                        <div className="flex items-center gap-1.5 mt-1">
                          <span className="w-2 h-2 rounded-full inline-block" style={{ background: cpiResult.band.color }} />
                          <span className="text-xs font-semibold" style={{ color: cpiResult.band.color }}>{cpiResult.band.v} — {cpiResult.label}</span>
                        </div>
                        <div className="text-[10px] font-mono text-slate-400 mt-2">SVS {cpiResult.svs} = Adv {cpiResult.advantageScore} + Adv×(5−Threat {cpiResult.avgThreatScore})÷5 · CPI = (SVS−5)÷4</div>
                      </div>
                      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
                        <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Bosch Strategic Advantage</div>
                        <div className="text-3xl font-extrabold text-slate-800">{advantageResult.s}<span className="text-sm text-slate-400"> / 5</span></div>
                        <div className="text-xs font-semibold text-slate-700 mt-1">{advantageResult.label}</div>
                        <div className="text-[10px] text-slate-400 mt-2">Strength: {v8.boschStrength} · Market gap: {v8.marketGapSignificance}</div>
                      </div>
                      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
                        <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5">Competitor Threat Levels</div>
                        {competitorThreats.map(c => (
                          <div key={c.name} className="flex items-center justify-between text-xs py-0.5">
                            <span className="text-slate-600 truncate pr-2">{c.name.split(" ")[0]}</span>
                            <Tip label={`${c.s} · ${c.label} — market position ${c.marketPosition} × future momentum ${c.futureMomentum}\n\n${THREAT_LEVEL_DEFS[c.label] || ""}`}>
                              <span className="cursor-help"><Chip tone={threatTone(c.s)}>{c.s} · {c.label}</Chip></span>
                            </Tip>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {cpiResult && (
                    <Card title="Threat level legend — what each classification means">
                      <div className="text-xs text-slate-500 mb-3">
                        A competitor's threat level is the intersection of <b>Market Position</b> (their share and standing in the market today) and <b>Future Momentum</b> (their growth rate, investment intensity and strategic ambition). Those two axes produce the nine classifications below, scored 1–5. The same scale is used for every field, so competitors are comparable across the whole portfolio.
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                        {THREAT_LEVEL_LEGEND.map(t => (
                          <div key={t.label} className="border border-slate-200 rounded-lg p-2.5">
                            <Chip tone={threatTone(t.s)}>{t.s} · {t.label}</Chip>
                            <div className="text-[10px] text-slate-400 mt-1.5">Position {t.pos} × Momentum {t.mom}</div>
                            <p className="text-[11px] text-slate-600 mt-1">{t.m}</p>
                          </div>
                        ))}
                      </div>
                    </Card>
                  )}
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
                            {(() => {
                              const t = competitorThreats?.find(c => c.name === cmp.name);
                              return t && (
                                <Tip label={`Market position: ${t.marketPosition} · Future momentum: ${t.futureMomentum}\n\n${t.label}: ${THREAT_LEVEL_DEFS[t.label] || ""}\n\nWhy this rating: ${t.why}`}>
                                  <span className="cursor-help"><Chip tone={threatTone(t.s)}>Threat {t.s} · {t.label}</Chip></span>
                                </Tip>
                              );
                            })()}
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
                  {scviResult && (
                    <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex flex-wrap items-center gap-4">
                      <div>
                        <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Supply Chain Viability Index (SCVI)</div>
                        <div className="text-3xl font-extrabold" style={{ color: scviResult.band.color }}>{scviResult.scvi}</div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: scviResult.band.color }} />
                        <span className="text-sm font-semibold" style={{ color: scviResult.band.color }}>{scviResult.band.v} — {scviResult.label}</span>
                      </div>
                      <div className="text-[10px] font-mono text-slate-400 bg-slate-50 rounded px-2 py-1">SCVS {scviResult.scvs} → (SCVS−3)÷2 = {scviResult.scvi}</div>
                      <div className="text-xs text-slate-500 flex-1 min-w-[200px]">
                        <Tip label={v8.supplyChainWhy}><span className="cursor-help underline decoration-dotted">Supply Chain Maturity: {v8.supplyChainMaturity}</span></Tip>
                        {" · "}
                        <Tip label={v8.boschControlWhy}><span className="cursor-help underline decoration-dotted">Bosch Control &amp; Leverage: {v8.boschControl}</span></Tip>
                      </div>
                    </div>
                  )}
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
                  {tpiResult && (
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex flex-wrap items-center gap-4">
                      <div>
                        <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Technology Prognosis Index (TPI)</div>
                        <div className="text-3xl font-extrabold" style={{ color: tpiResult.band.color }}>{tpiResult.tpi}</div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: tpiResult.band.color }} />
                        <span className="text-sm font-semibold" style={{ color: tpiResult.band.color }}>{tpiResult.band.v} — {tpiResult.label}</span>
                      </div>
                      <div className="text-[10px] font-mono text-slate-400 bg-slate-50 rounded px-2 py-1">TPS {tpiResult.tps} → (TPS−3)÷2 = {tpiResult.tpi}</div>
                      <div className="text-xs text-slate-500 flex-1 min-w-[200px]">Technological Velocity: <b>{v8.techVelocity}</b> · Commercialization Readiness: <b>{v8.commReadiness}</b></div>
                      <div className="w-full text-xs text-slate-600 bg-slate-50 rounded-lg p-3">{v8.techTrendWhy}</div>
                    </div>
                  )}
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
                        <div className="text-[10px] text-slate-400 mt-1">Counts of tracked market/policy/competitor developments per period.</div>
                      </Card>
                    )}
                  </div>
                  <Card title="Recent activity — with impact reads">
                    <div className="space-y-3">
                      {d.activity.map((a, i) => {
                        const m = v6.activityMeta?.[i];
                        return (
                          <div key={i} className="flex gap-3 items-start border-b border-slate-100 pb-3 last:border-0">
                            <div className="text-[11px] text-slate-400 w-24 shrink-0 pt-0.5">{a.d}</div>
                            <div className="flex-1">
                              <div className="text-sm font-medium">{a.t}</div>
                              <div className="text-xs text-slate-400 flex items-center gap-1.5">{a.s}<SrcLink label={a.s} compact /></div>
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
                          : <span>{label}</span>
                        }
                      </span>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </main>
      </div>
      {/* ── Bosch BSP dark footer (as in Mobility Intelligence) ── */}
      <div className="flex justify-between items-center flex-wrap shrink-0" style={{ background: "#2e3033", color: "#c1c7cc", padding: "12px 24px", fontSize: 11, gap: 6 }}>
        <span style={{ color: "#fff", fontWeight: 600 }}>© 2026 Search-Field Intelligence — created by MBS team @ M/MBR-IN</span>
        <span style={{ fontSize: 10 }}>Bosch Mobility · India Market · BBM Strategy Agent · scores computed, not generated</span>
      </div>

    </div>
  );
}
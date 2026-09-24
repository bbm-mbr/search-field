import React, { useEffect, useState } from "react";
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, LabelList,
} from "recharts";
import { getFields, runFieldDive, runSubDive } from "./api";

const GRAD = "linear-gradient(90deg,#7A1FA2 0%,#E20015 38%,#0096A0 72%,#5BAA32 100%)";
const INK = "#0E1A2E";
const TABS = ["Recommendation", "PESTEL", "SWOT", "Market", "Attractiveness", "Competency", "3 Horizons", "Recent Activity", "Methodology"];

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
    <div className="flex items-center justify-between px-4 pt-3 pb-2 border-b border-slate-100">
      <h3 className="text-sm font-semibold text-slate-800">{title}</h3>{right}
    </div>
    <div className="p-4">{children}</div>
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
        <div className="text-3xl font-bold">{Number(score).toFixed(1)}<span className="text-base text-slate-400">/10</span></div>
        <div className="text-xs uppercase tracking-widest font-bold"
          style={{ background: GRAD, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>{label}</div>
      </div>
    </div>
  );
};

const SourceList = ({ sources = [] }) => sources.length ? (
  <div className="mt-3 pt-2 border-t border-slate-100 text-[11px] text-slate-400 space-y-0.5">
    {sources.map((s, i) => <div key={i}>[{i + 1}] <a className="hover:underline" href={s.url} target="_blank" rel="noreferrer">{s.title}</a></div>)}
  </div>
) : null;

const Points = ({ items = [], tone }) => (
  <ul className="text-sm space-y-2">
    {items.map((x, i) => {
      const why = x.why || x.reasoning || x.why_bosch_india_specific;
      const soWhat = x.so_what || x.implication_for_bosch;
      return (
        <li key={i} className="border border-slate-200 rounded-lg p-2.5">
          <div className="flex gap-2 items-start">
            {tone && <Chip tone={tone}>•</Chip>}
            {x.impact && <Chip tone={x.impact === "high" ? "red" : x.impact === "medium" ? "amber" : "slate"}>{x.impact}</Chip>}
            <span className="font-medium">{x.point || x.item || x}
              {x.citations?.length ? <span className="text-slate-400 text-xs font-normal"> [{x.citations.join(",")}]</span> : null}</span>
          </div>
          {why && <div className="text-xs text-slate-600 mt-1 flex gap-1.5"><b className="text-teal-700 shrink-0">WHY</b><span>{why}</span></div>}
          {soWhat && <div className="text-xs text-slate-600 mt-1 flex gap-1.5"><b className="text-purple-700 shrink-0">SO WHAT</b><span>{soWhat}</span></div>}
          {x.trigger && <div className="text-xs text-slate-600 mt-1 flex gap-1.5"><b className="text-slate-500 shrink-0">TRIGGER →</b><span>{x.trigger}</span></div>}
        </li>
      );
    })}
  </ul>
);

const Rationale = ({ label = "Score rationale", text }) => text ? (
  <div className="text-xs text-slate-600 bg-slate-50 rounded-lg p-3 mt-3"><b>{label}:</b> {text}</div>
) : null;

/* Methodology — mirrors the backend's fixed pipeline; identical for every field */
const Methodology = ({ criteria = [], bands = [] }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-4xl">
    <Card title="1 · Fixed analysis pipeline (every field, every run)">
      <ol className="text-sm space-y-1.5 list-decimal list-inside text-slate-700">
        <li>Targeted web searches per framework (India-scoped, free sources)</li>
        <li>Playbook RAG — your methodology passages injected into the prompt</li>
        <li>Grounded framework analysis → strict JSON, per-claim citations</li>
        <li>Each matrix framework returns score (1–10) + confidence per rubric</li>
        <li>Decision matrix computed in code → verdict band → LLM reasoning (clamped ±0.5)</li>
      </ol>
    </Card>
    <Card title="2 · Score & confidence formula (deterministic)">
      <div className="text-xs font-mono bg-slate-50 rounded-lg p-3 text-slate-700 leading-relaxed">
        eff_weight = weight × max(conf, 0.2)<br />
        contribution = score × eff_weight<br />
        <b>weighted_score = Σ contribution / Σ eff_weight</b><br />
        verdict_confidence = Σ(conf × weight) / Σ weight
      </div>
      <p className="text-xs text-slate-500 mt-2">Low-confidence criteria automatically count less. The LLM never sets the score or confidence.</p>
    </Card>
    <Card title="3 · Criterion weights (criteria.json — same for all fields)">
      <table className="w-full text-sm"><tbody>
        {criteria.filter(x => x.in_decision_matrix).map(x => (
          <tr key={x.id} className="border-t border-slate-100 first:border-0">
            <td className="py-1.5">{x.name}<div className="text-[10px] text-slate-400">{x.framework}</div></td>
            <td className="text-right font-semibold">{x.weight.toFixed(2)}</td>
          </tr>
        ))}
      </tbody></table>
    </Card>
    <Card title="4 · Confidence rubric (evidence quality, not enthusiasm)">
      <table className="w-full text-xs"><tbody>
        <tr className="border-t border-slate-100"><td className="py-1.5 font-mono pr-3">0.90–1.00</td><td>Multiple independent, recent cited sources agree</td></tr>
        <tr className="border-t border-slate-100"><td className="py-1.5 font-mono pr-3">0.70–0.89</td><td>Cited evidence but partial, single-source or older</td></tr>
        <tr className="border-t border-slate-100"><td className="py-1.5 font-mono pr-3">0.50–0.69</td><td>Conflicting/thin sources; material judgement applied</td></tr>
        <tr className="border-t border-slate-100"><td className="py-1.5 font-mono pr-3">&lt; 0.50</td><td>Mostly reasoned estimates — flagged low-evidence</td></tr>
      </tbody></table>
    </Card>
    <div className="md:col-span-2">
      <Card title="5 · Verdict bands (fixed thresholds)">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {bands.map(b => (
            <div key={b.verdict} className="border border-slate-200 rounded-lg p-3">
              <div className="font-bold text-sm">{b.verdict}</div>
              <div className="text-xs text-slate-400">score ≥ {b.min_score}</div>
              <div className="text-xs text-slate-600 mt-1">{b.meaning}</div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  </div>
);

export default function App() {
  const [fields, setFields] = useState([]);
  const [criteria, setCriteria] = useState([]);
  const [fieldId, setFieldId] = useState(null);
  const [subId, setSubId] = useState(null);
  const [tab, setTab] = useState("Recommendation");
  const [loading, setLoading] = useState(false);
  const [dive, setDive] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => { getFields().then(d => { setFields(d.search_fields); setCriteria(d.criteria || []); setFieldId(d.search_fields[0]?.id); }); }, []);
  const field = fields.find(f => f.id === fieldId);

  const run = async () => {
    setLoading(true); setError(null); setDive(null);
    try {
      setDive(subId ? await runSubDive(fieldId, subId) : await runFieldDive(fieldId));
    } catch (e) { setError(String(e)); } finally { setLoading(false); }
  };

  const a = dive?.analysis || {};
  const rec = dive?.recommendation;
  const porterData = a.porter?.forces
    ? Object.entries(a.porter.forces).map(([k, v]) => ({ force: k.replaceAll("_", " "), v: v.intensity }))
    : [];

  return (
    <div className="min-h-screen flex flex-col">
      <div style={{ height: 4, background: GRAD }} />
      <header className="bg-white border-b border-slate-200 px-6 py-3 flex items-center">
        <div>
          <div className="font-extrabold text-lg leading-none">Search-Field Intelligence</div>
          <div className="text-xs text-slate-500 mt-0.5">Bosch Mobility · India Market · BBM Strategy Agent</div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <aside className="w-64 bg-white border-r border-slate-200 overflow-y-auto py-3 shrink-0">
          <div className="px-4 pb-2 text-[11px] font-bold uppercase tracking-widest text-slate-400">{fields.length} Search Fields</div>
          {fields.map(f => (
            <button key={f.id} onClick={() => { setFieldId(f.id); setSubId(null); setDive(null); }}
              className={`w-full text-left px-4 py-2 text-sm flex justify-between border-l-2 ${fieldId === f.id ? "border-red-600 bg-red-50/60 font-semibold" : "border-transparent hover:bg-slate-50"}`}>
              <span className="truncate pr-2">{f.name}</span>
              <span className="text-[10px] text-slate-400">{f.sub_fields.length}</span>
            </button>
          ))}
        </aside>

        <main className="flex-1 overflow-y-auto p-6">
          {field && (
            <div className="mb-4">
              <h1 className="text-2xl font-extrabold">{field.name}</h1>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {field.bsf_ma_partnership.map(m => <Chip key={m} tone="violet">M&A · {m}</Chip>)}
                {field.bbm_innovation.map(b => <Chip key={b} tone="teal">BBM · {b}</Chip>)}
              </div>
              <div className="flex flex-wrap gap-1.5 mt-3 items-center">
                <button onClick={() => setSubId(null)}
                  className={`px-3 py-1 rounded-full text-xs border ${!subId ? "bg-slate-900 text-white border-slate-900" : "bg-white border-slate-300"}`}>All (field roll-up)</button>
                {field.sub_fields.map(s => (
                  <button key={s.id} onClick={() => setSubId(s.id)} title={s.scope}
                    className={`px-3 py-1 rounded-full text-xs border ${subId === s.id ? "bg-slate-900 text-white border-slate-900" : "bg-white border-slate-300"}`}>{s.name}</button>
                ))}
                <button onClick={run} disabled={loading}
                  className="ml-auto px-4 py-1.5 rounded-lg text-white text-sm font-semibold disabled:opacity-50" style={{ background: INK }}>
                  {loading ? "Agent analysing…" : "Run deep dive"}
                </button>
              </div>
            </div>
          )}

          {loading && (
            <div className="bg-white border border-slate-200 rounded-xl p-10 text-center text-sm text-slate-500">
              Running grounded framework agents (web search → playbook RAG → analysis → decision matrix)…
              {!subId && <div className="mt-1 text-xs">Field roll-up includes every sub-field — this takes a few minutes.</div>}
            </div>
          )}
          {error && <div className="bg-red-50 text-red-700 text-sm rounded-lg p-4">{error}</div>}

          {dive && !loading && (
            <>
              <div className="flex gap-1 border-b border-slate-200 mb-4 overflow-x-auto">
                {TABS.map(t => (
                  <button key={t} onClick={() => setTab(t)}
                    className={`px-3 py-2 text-sm border-b-2 -mb-px font-medium whitespace-nowrap ${tab === t ? "border-red-600" : "border-transparent text-slate-500"}`}>{t}</button>
                ))}
              </div>

              {tab === "Recommendation" && rec && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  <Card title="Right to Play — Verdict" right={<Chip tone="green">confidence {Math.round((rec.confidence || 0) * 100)}%</Chip>}>
                    <Gauge score={rec.adjusted_score} label={rec.verdict} />
                    <p className="text-sm text-slate-600 mt-4">{rec.entry_mode}</p>
                  </Card>
                  <Card title="Decision Matrix — full working (computed, auditable)">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead><tr className="text-left text-[11px] text-slate-400">
                          <th className="pb-2 pr-2">Criterion</th><th className="pb-2 pr-2">Wt</th>
                          <th className="pb-2 pr-2">Score</th><th className="pb-2 pr-2">Conf</th>
                          <th className="pb-2 pr-2">Eff. wt</th><th className="pb-2">Contribution</th>
                        </tr></thead>
                        <tbody>
                          {rec.decision_matrix?.rows.map(r => (
                            <tr key={r.criterion} className="border-t border-slate-100">
                              <td className="py-1.5 pr-2">{r.criterion}<div className="text-[10px] text-slate-400">{r.framework}</div></td>
                              <td className="pr-2">{r.weight}</td><td className="font-semibold pr-2">{r.score}</td>
                              <td className="text-slate-500 pr-2">{Math.round(r.confidence * 100)}%</td>
                              <td className="font-mono text-xs pr-2">{r.effective_weight}</td>
                              <td className="font-mono text-xs">{r.contribution}</td>
                            </tr>
                          ))}
                          <tr className="border-t-2 font-bold">
                            <td className="py-2">Totals → weighted score</td><td />
                            <td className="text-red-700">{rec.decision_matrix?.weighted_score}</td>
                            <td>{Math.round((rec.decision_matrix?.verdict_confidence || 0) * 100)}%</td>
                            <td className="font-mono text-xs">{rec.decision_matrix?.sum_effective_weight}</td>
                            <td className="font-mono text-xs">{rec.decision_matrix?.sum_contribution}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                    <div className="text-xs text-slate-500 mt-2">
                      {rec.decision_matrix?.formula} LLM adjustment applied: <b>{rec.score_adjustment ?? 0}</b>. Confidence is the weight-averaged evidence quality of the five criteria — never self-declared. Same formula & weights for every field (Methodology tab).
                    </div>
                  </Card>
                  <Card title="Reasoning & Risks">
                    <Points items={rec.reasoning} />
                    <div className="mt-3 pt-3 border-t border-slate-100">
                      {(rec.key_risks || []).map(r => <div key={r} className="text-xs text-red-700 mb-1">⚠ {r}</div>)}
                    </div>
                  </Card>
                  {rec.subfield_portfolio?.length > 0 && (
                    <div className="lg:col-span-3">
                      <Card title="Where to Play — Sub-field Portfolio">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          {rec.subfield_portfolio.map(p => (
                            <div key={p.sub_field} className="border border-slate-200 rounded-lg p-3">
                              <div className="flex justify-between"><b className="text-sm">{p.sub_field}</b>
                                <Chip tone={p.play === "lead" ? "green" : p.play === "partner" ? "teal" : "amber"}>{p.play.toUpperCase()}</Chip></div>
                              <p className="text-xs text-slate-600 mt-2">{p.why}</p>
                            </div>
                          ))}
                        </div>
                      </Card>
                    </div>
                  )}
                </div>
              )}

              {tab === "PESTEL" && a.pestel && (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {["political", "economic", "social", "technological", "environmental", "legal"].map(k => (
                    <Card key={k} title={k[0].toUpperCase() + k.slice(1)}><Points items={a.pestel[k]} /></Card>
                  ))}
                  <div className="lg:col-span-3"><SourceList sources={a.pestel._sources} /></div>
                </div>
              )}

              {tab === "SWOT" && a.swot && (
                <div className="grid md:grid-cols-2 gap-4">
                  <Card title="Strengths"><Points items={a.swot.strengths} tone="green" /></Card>
                  <Card title="Weaknesses"><Points items={a.swot.weaknesses} tone="red" /></Card>
                  <Card title="Opportunities"><Points items={a.swot.opportunities} tone="teal" /></Card>
                  <Card title="Threats"><Points items={a.swot.threats} tone="amber" /></Card>
                  <div className="md:col-span-2"><Card title="Targeted Strategy"><p className="text-sm">{a.swot.targeted_strategy}</p><Rationale text={a.swot.score_rationale} /><SourceList sources={a.swot._sources} /></Card></div>
                </div>
              )}

              {tab === "Market" && a.market_sizing && (
                <div className="grid lg:grid-cols-2 gap-4">
                  <Card title={`TAM / SAM — India (${a.market_sizing.tam_usd_m?.year || ""})`}>
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart layout="vertical" margin={{ right: 50 }}
                        data={[{ n: "TAM", v: a.market_sizing.tam_usd_m?.value || 0 }, { n: "SAM", v: a.market_sizing.sam_usd_m?.value || 0 }]}>
                        <XAxis type="number" hide /><YAxis type="category" dataKey="n" width={50} />
                        <Tooltip formatter={v => `$${v}M`} />
                        <Bar dataKey="v" radius={[0, 6, 6, 0]}><Cell fill="#7A1FA2" /><Cell fill="#0096A0" />
                          <LabelList dataKey="v" position="right" formatter={v => `$${v}M`} /></Bar>
                      </BarChart>
                    </ResponsiveContainer>
                    <div className="text-sm">CAGR <b>{a.market_sizing.cagr_pct?.value}%</b> ({a.market_sizing.cagr_pct?.period})</div>
                    <div className="text-xs text-slate-500 mt-1">TAM basis: {a.market_sizing.tam_usd_m?.basis} · SAM basis: {a.market_sizing.sam_usd_m?.basis}</div>
                    {a.market_sizing.derivation_steps?.length > 0 && (
                      <div className="mt-3">
                        <div className="text-xs font-semibold text-slate-500 mb-1">Derivation chain (every input cited or marked estimate)</div>
                        <table className="w-full text-xs"><tbody>
                          {a.market_sizing.derivation_steps.map((s, i) => (
                            <tr key={i} className="border-t border-slate-100 align-top">
                              <td className="py-1 pr-2">{s.step}</td>
                              <td className="py-1 pr-2 font-medium">{s.value}</td>
                              <td className="py-1 text-slate-500">{s.source_or_estimate}{s.citations?.length ? ` [${s.citations.join(",")}]` : ""}</td>
                            </tr>
                          ))}
                        </tbody></table>
                      </div>
                    )}
                    {a.market_sizing.cross_check && <div className="text-xs text-slate-600 bg-teal-50 rounded-lg p-3 mt-3"><b>Cross-check:</b> {a.market_sizing.cross_check}</div>}
                    <Rationale text={a.market_sizing.score_rationale} />
                  </Card>
                  <Card title="Customer Landscape">
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      {(a.market_sizing.customer_segments || []).map(c => (
                        <div key={c.segment} className="border border-slate-200 rounded-lg p-3">
                          <b>{c.segment}</b><div className="text-xs text-slate-500">{(c.examples || []).join(", ")}</div>
                        </div>
                      ))}
                    </div>
                    <SourceList sources={a.market_sizing._sources} />
                  </Card>
                </div>
              )}

              {tab === "Attractiveness" && porterData.length > 0 && (
                <Card title="Porter's Five Forces — pressure intensity (10 = hostile)">
                  <ResponsiveContainer width="100%" height={320}>
                    <RadarChart data={porterData} outerRadius="75%">
                      <PolarGrid stroke="#E2E8F0" /><PolarAngleAxis dataKey="force" tick={{ fontSize: 12 }} />
                      <PolarRadiusAxis domain={[0, 10]} tick={false} axisLine={false} />
                      <Radar dataKey="v" stroke="#E20015" fill="#E20015" fillOpacity={0.18} strokeWidth={2} />
                    </RadarChart>
                  </ResponsiveContainer>
                  <div className="grid md:grid-cols-2 gap-2 mt-2">
                    {Object.entries(a.porter.forces || {}).map(([k, f]) => (
                      <div key={k} className="border border-slate-200 rounded-lg p-3">
                        <div className="flex justify-between text-sm"><b className="capitalize">{k.replaceAll("_", " ")}</b><b>{f.intensity}/10</b></div>
                        <div className="h-1.5 bg-slate-100 rounded-full mt-1.5 mb-2"><div className="h-1.5 rounded-full" style={{ width: `${f.intensity * 10}%`, background: f.intensity >= 7 ? "#E20015" : f.intensity >= 5 ? "#D97706" : "#5BAA32" }} /></div>
                        <p className="text-xs text-slate-600">{f.reasoning}</p>
                        <div className="flex flex-wrap gap-1 mt-2">{(f.drivers || []).map(dr => <Chip key={dr}>{dr}</Chip>)}</div>
                      </div>
                    ))}
                  </div>
                  <p className="text-sm text-slate-600 mt-3">{a.porter.summary}</p>
                  <Rationale label="How the attractiveness score was derived" text={a.porter.score_rationale} />
                  <SourceList sources={a.porter._sources} />
                </Card>
              )}

              {tab === "Competency" && a.competency && (
                <Card title="Bosch competency vs requirement">
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={(a.competency.required || []).map(r => ({ name: r.competency, req: r.required_level, bosch: r.bosch_level }))}>
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} angle={-12} height={50} />
                      <YAxis domain={[0, 10]} width={24} /><Tooltip />
                      <Bar dataKey="req" name="Required" fill="#CBD5E1" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="bosch" name="Bosch today" fill="#0096A0" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                  <div className="grid md:grid-cols-2 gap-2 mt-2">
                    {(a.competency.required || []).map(r => (
                      <div key={r.competency} className="border border-slate-200 rounded-lg p-3">
                        <div className="flex justify-between text-sm"><b>{r.competency}</b>
                          <span className="text-xs"><b className="text-teal-700">{r.bosch_level}</b> vs req <b>{r.required_level}</b></span></div>
                        <div className="text-xs text-slate-600 mt-1.5"><b className="text-slate-500">REQ WHY</b> {r.why_required_level}</div>
                        <div className="text-xs text-slate-600 mt-1"><b className="text-teal-700">BOSCH WHY</b> {r.why_bosch_level}</div>
                        <div className="mt-2 flex items-start gap-2">
                          <Chip tone={r.gap_closure === "build" ? "amber" : "violet"}>{r.gap_closure}</Chip>
                          <span className="text-xs text-slate-500">{r.gap_closure_rationale}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                  <p className="text-sm text-slate-600 mt-3">{a.competency.summary}</p>
                  <Rationale text={a.competency.score_rationale} />
                  <SourceList sources={a.competency._sources} />
                </Card>
              )}

              {tab === "3 Horizons" && a.three_horizons && (
                <div className="grid md:grid-cols-3 gap-4">
                  {[["H1 · Core now", a.three_horizons.h1_core_now, "#5BAA32"],
                  ["H2 · 2-5 years", a.three_horizons.h2_emerging_2_5y, "#0096A0"],
                  ["H3 · 5+ years", a.three_horizons.h3_future_5y_plus, "#7A1FA2"]].map(([t, items, col]) => (
                    <div key={t} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                      <div className="px-4 py-2 text-white text-sm font-bold" style={{ background: col }}>{t}</div>
                      <div className="p-4"><Points items={items} /></div>
                    </div>
                  ))}
                  <div className="md:col-span-3"><Rationale text={a.three_horizons.score_rationale} /><SourceList sources={a.three_horizons._sources} /></div>
                </div>
              )}

              {tab === "Methodology" && <Methodology criteria={criteria} bands={[
                { verdict: "ENTER", min_score: 7.5, meaning: "Strong right to play & win. Build or buy now." },
                { verdict: "EXPLORE", min_score: 6.0, meaning: "Attractive but gaps exist. Partner, pilot or M&A." },
                { verdict: "WATCH", min_score: 4.5, meaning: "Monitor triggers; revisit in 6–12 months." },
                { verdict: "NO-GO", min_score: 0, meaning: "Weak attractiveness or right to play today." },
              ]} />}

              {tab === "Recent Activity" && (
                <Card title="Recent activity — live (Google News RSS + GDELT)">
                  <div className="space-y-3">
                    {(dive.recent_activity || []).map((n, i) => (
                      <div key={i} className="flex gap-3 border-b border-slate-100 pb-3 last:border-0">
                        <div className="text-[11px] text-slate-400 w-28 shrink-0">{n.published?.slice(0, 16)}</div>
                        <div><a href={n.url} target="_blank" rel="noreferrer" className="text-sm font-medium hover:underline">{n.title}</a>
                          <div className="text-xs text-slate-400">{n.source}</div></div>
                      </div>
                    ))}
                  </div>
                </Card>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}

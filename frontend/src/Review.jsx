/* Proposal review — read-only.

   Shows what an authoring pass would change before anything reaches the board:
   the score movement (this field and the portfolio ranks it shifts), the blind
   second scoring, whether each piece of reviewer guidance was addressed, the
   critic's defects, and a section-by-section diff of current vs proposed.
   There are no buttons that write: publishing is a later, deliberate step. */
import React, { useEffect, useMemo, useState } from 'react'

const API = import.meta.env.VITE_API_BASE || ''
const get = async (p) => { const r = await fetch(`${API}${p}`); if (!r.ok) throw new Error(`${r.status} ${r.statusText}`); return r.json() }

const INDEX = [['mgi', 'Master Growth Index'], ['pi', 'PESTEL'], ['spi', 'SWOT posture'], ['mai', 'Market attractiveness'],
  ['iai', 'Industry attractiveness'], ['cgi', 'Competency gap'], ['svi', 'Stakeholder viability'], ['cpi', 'Competitive posture'],
  ['scvi', 'Supply-chain viability'], ['tpi', 'Technology prognosis']]
const STATUS_TONE = { ready: 'bg-emerald-50 text-emerald-800 border-emerald-200', review: 'bg-teal-50 text-teal-800 border-teal-200',
  blocked: 'bg-amber-50 text-amber-800 border-amber-200',
  failed: 'bg-red-50 text-red-800 border-red-200', drafting: 'bg-slate-50 text-slate-700 border-slate-200',
  superseded: 'bg-slate-100 text-slate-500 border-slate-200' }
const SEV_TONE = { block: 'text-red-700', major: 'text-amber-700', minor: 'text-slate-600' }
const fmt = (v) => (v == null ? '—' : (typeof v === 'number' ? (Math.abs(v) < 10 ? v.toFixed(2) : String(v)) : String(v)))
const delta = (v) => (v == null || v === 0 ? '' : (v > 0 ? `+${v.toFixed(2)}` : v.toFixed(2)))

function Badge({ children, tone }) {
  return <span className={`text-[11px] font-semibold px-2 py-0.5 rounded border ${tone || 'bg-slate-50 text-slate-700 border-slate-200'}`}>{children}</span>
}

function Card({ title, children, right }) {
  return (
    <section className="bg-white border border-slate-200 rounded-xl p-4 mb-4">
      <div className="flex items-baseline justify-between mb-3">
        <h3 className="text-sm font-bold text-slate-800">{title}</h3>{right}
      </div>
      {children}
    </section>
  )
}

/* Flatten a JSON value into path → leaf, so two versions can be compared leaf by leaf. */
function flatten(v, path = '', out = {}) {
  if (Array.isArray(v)) { if (!v.length) out[path] = '[]'; v.forEach((x, i) => flatten(x, `${path}[${i}]`, out)) }
  else if (v && typeof v === 'object') { const ks = Object.keys(v); if (!ks.length) out[path] = '{}'; ks.forEach(k => flatten(v[k], path ? `${path}.${k}` : k, out)) }
  else out[path] = v
  return out
}

function SectionDiff({ s }) {
  const [open, setOpen] = useState(false)
  const rows = useMemo(() => {
    const a = flatten(s.before), b = flatten(s.after)
    const keys = [...new Set([...Object.keys(a), ...Object.keys(b)])]
    return keys.filter(k => a[k] !== b[k]).map(k => ({ k, a: a[k], b: b[k] }))
  }, [s])
  return (
    <div className="border border-slate-200 rounded-lg mb-2">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between px-3 py-2 text-left hover:bg-slate-50">
        <span className="text-sm"><span className="font-mono text-xs text-slate-500">{s.layer}.</span><b>{s.section}</b></span>
        <span className="text-xs text-slate-500">{s.identical ? 'unchanged' : `${rows.length} changed value${rows.length === 1 ? '' : 's'}`} {open ? '▾' : '▸'}</span>
      </button>
      {open && (
        <div className="px-3 pb-3">
          {s.changed?.length > 0 && (
            <div className="text-xs bg-sky-50 border border-sky-100 rounded p-2 mb-2">
              <b>Author's change notes:</b>
              <ul className="list-disc ml-4 mt-1">{s.changed.map((c, i) => <li key={i}>{c}</li>)}</ul>
            </div>
          )}
          <div className="max-h-[520px] overflow-auto">
            <table className="w-full text-xs">
              <thead><tr className="text-left text-slate-500"><th className="py-1 pr-2 w-56">Path</th><th className="py-1 pr-2">Current</th><th className="py-1">Proposed</th></tr></thead>
              <tbody>
                {rows.map(r => (
                  <tr key={r.k} className="border-t border-slate-100 align-top">
                    <td className="py-1 pr-2 font-mono text-[10px] text-slate-500 break-all">{r.k}</td>
                    <td className="py-1 pr-2 text-red-800 bg-red-50/40">{r.a === undefined ? <i className="text-slate-400">absent</i> : String(r.a)}</td>
                    <td className="py-1 text-emerald-900 bg-emerald-50/40">{r.b === undefined ? <i className="text-slate-400">removed</i> : String(r.b)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

function Detail({ id }) {
  const [p, setP] = useState(null), [err, setErr] = useState(null)
  useEffect(() => { setP(null); get(`/api/proposals/${id}`).then(setP).catch(e => setErr(String(e.message || e))) }, [id])
  if (err) return <div className="text-sm text-red-700">Could not load proposal {id}: {err}</div>
  if (!p) return <div className="text-sm text-slate-500">Loading proposal {id}…</div>
  const sc = p.scores || {}, bl = p.blind || {}, cr = p.critic || {}
  const addressed = Object.fromEntries((p.guidance_check?.critic || []).map(g => [g.id, g]))
  const usage = p.usage?.by_model || {}
  const sections = [...(p.sections || [])].sort((a, b) => (a.layer + a.section).localeCompare(b.layer + b.section))
  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <h2 className="text-xl font-extrabold text-slate-900">{p.field_name}</h2>
        <Badge tone={STATUS_TONE[p.status]}>{p.status}</Badge>
        {cr.verdict && <Badge>critic: {cr.verdict}</Badge>}
        <span className="text-xs text-slate-500">proposal #{p.id} · {p.created_at?.replace('T', ' ').slice(0, 16)} UTC</span>
      </div>
      {p.error && <Card title="Error"><pre className="text-xs whitespace-pre-wrap text-red-700">{p.error}</pre></Card>}
      {cr.reviewer_note && <Card title="Reviewer note (critic)"><p className="text-sm text-slate-700">{cr.reviewer_note}</p></Card>}
      {p.checks?.revision && (
        <Card title="Revision round">
          <p className="text-sm text-slate-700">The critic's first review ({p.checks.revision.critic_before}, {p.checks.revision.defects_before} defects) sent {p.checks.revision.fed_back} serious defect{p.checks.revision.fed_back === 1 ? '' : 's'} back to: <b>{p.checks.revision.stages.join(', ')}</b>. Those stages were rewritten once, then scoring, the verdict and the critic ran again. What you see below is after that round.</p>
        </Card>
      )}

      <div className="grid md:grid-cols-2 gap-4">
        <Card title="Score movement — this field" right={<span className="text-xs text-slate-500">engine {sc.engine}</span>}>
          <table className="w-full text-sm">
            <thead><tr className="text-left text-xs text-slate-500"><th>Index</th><th className="text-right">Current</th><th className="text-right">Proposed</th><th className="text-right">Δ</th></tr></thead>
            <tbody>
              {INDEX.map(([k, label]) => (
                <tr key={k} className={`border-t border-slate-100 ${k === 'mgi' ? 'font-bold' : ''}`}>
                  <td className="py-1">{label}</td>
                  <td className="text-right tabular-nums">{fmt(sc.before?.[k])}</td>
                  <td className="text-right tabular-nums">{fmt(sc.after?.[k])}</td>
                  <td className={`text-right tabular-nums ${sc.index_deltas?.[k] > 0 ? 'text-emerald-700' : sc.index_deltas?.[k] < 0 ? 'text-red-700' : ''}`}>{delta(sc.index_deltas?.[k])}</td>
                </tr>
              ))}
              <tr className="border-t border-slate-200"><td className="py-1">Band</td><td className="text-right text-xs" colSpan={2}>{sc.before?.band} → {sc.after?.band}</td><td /></tr>
              <tr><td className="py-1">MGI rank</td><td className="text-right">{sc.before?.rank}</td><td className="text-right">{sc.after?.rank}</td><td /></tr>
            </tbody>
          </table>
        </Card>
        <div>
          <Card title="Other fields whose rank would move">
            {Object.keys(sc.rank_moves || {}).length === 0
              ? <p className="text-sm text-slate-500">No rank changes elsewhere in the portfolio.</p>
              : <ul className="text-sm">{Object.entries(sc.rank_moves).map(([f, m]) => <li key={f}><b>{f}</b>: #{m.before} → #{m.after}</li>)}</ul>}
          </Card>
          <Card title="Blind second scoring">
            {bl.scorer_a ? (
              <div className="text-sm space-y-1">
                <div>Scorer A (author family) MGI <b>{fmt(bl.scorer_a.mgi)}</b> · Scorer B ({bl.model}) MGI <b>{fmt(bl.scorer_b.mgi)}</b></div>
                <div className="text-xs text-slate-600">Difference {delta(bl.mgi_delta) || '0.00'} · band {bl.band_changed ? 'differs' : 'agrees'}</div>
                {bl.escalated
                  ? <div className="text-xs text-amber-800">Escalated — reconciled by {bl.reconciled?.by || '(reconcile failed)'}{bl.reconciled?.notes?.length ? `, ${bl.reconciled.notes.length} ratings decided` : ''}</div>
                  : <div className="text-xs text-emerald-800">Within tolerance — no escalation.</div>}
              </div>
            ) : <p className="text-sm text-slate-500">Blind scorer status: {bl.status || 'n/a'}</p>}
          </Card>
        </div>
      </div>

      <Card title="Guidance — was each item addressed?">
        <table className="w-full text-sm">
          <tbody>
            {(p.guidance_check?.items || []).map(g => {
              const a = addressed[g.id]
              return (
                <tr key={g.id} className="border-t border-slate-100 align-top">
                  <td className="py-1.5 pr-2 font-mono text-xs text-slate-500">{g.id}</td>
                  <td className="py-1.5 pr-2 text-xs"><Badge>{g.kind}</Badge></td>
                  <td className="py-1.5 pr-2">{g.text}{g.source && <div className="text-[11px] text-slate-400">{g.source}</div>}</td>
                  <td className="py-1.5 w-56 text-xs">{a ? (a.addressed ? <span className="text-emerald-700">✓ {a.where}</span> : <span className="text-red-700">✗ {a.where}</span>) : <span className="text-slate-400">not assessed</span>}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </Card>

      <Card title={`Critic defects (${(cr.defects || []).length})`}>
        {(cr.defects || []).length === 0 ? <p className="text-sm text-slate-500">None.</p> : (
          <ul className="text-sm space-y-2">
            {cr.defects.map((d, i) => (
              <li key={i}><b className={SEV_TONE[d.severity]}>{d.severity}</b> <span className="font-mono text-xs text-slate-500">{d.location}</span>
                <div>{d.problem}</div>{d.fix && <div className="text-xs text-slate-600">Fix: {d.fix}</div>}</li>
            ))}
          </ul>
        )}
      </Card>

      <Card title="Stages">
        <table className="w-full text-sm">
          <thead><tr className="text-left text-xs text-slate-500"><th>Stage</th><th>Model</th><th>Attempts</th><th>Status</th><th>Defects</th></tr></thead>
          <tbody>
            {Object.entries(p.stages || {}).map(([s, m]) => (
              <tr key={s} className="border-t border-slate-100 align-top">
                <td className="py-1">{s}</td><td className="text-xs font-mono">{m.model}</td><td>{m.attempts}{m.resumed ? ' (reused)' : ''}</td>
                <td className={m.status === 'ok' ? 'text-emerald-700' : 'text-red-700'}>{m.status}</td>
                <td className="text-xs text-slate-600">{(m.defects || []).join(' · ')}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="text-xs text-slate-500 mt-2">
          {Object.entries(usage).map(([m, u]) => <span key={m} className="mr-4">{m}: {u.calls} calls, {u.in.toLocaleString()} in / {u.out.toLocaleString()} out tokens{u.thinking ? ` (${u.thinking.toLocaleString()} of them hidden thinking)` : ''}</span>)}
        </div>
      </Card>

      <Card title={`Sections (${sections.length})`} right={<span className="text-xs text-slate-500">current board ← → proposed</span>}>
        {sections.map(s => <SectionDiff key={s.layer + s.section} s={s} />)}
      </Card>

      <Card title={`Sources cited (${(p.sources || []).length})`}>
        <ol className="text-xs space-y-1 list-decimal ml-5">
          {(p.sources || []).map(s => (
            <li key={s.n}>{s.url ? <a className="text-teal-700 hover:underline" href={s.url} target="_blank" rel="noreferrer">{s.label}</a> : s.label}
              <span className="text-slate-400"> · {s.origin === 'prior' ? 'already on the board' : `new, tier ${s.tier}`}</span></li>
          ))}
        </ol>
      </Card>
    </div>
  )
}

export default function Review() {
  const [list, setList] = useState(null), [err, setErr] = useState(null)
  const idFromHash = () => { const m = window.location.hash.match(/#\/review\/(\d+)/); return m ? +m[1] : null }
  const [sel, setSel] = useState(idFromHash())
  useEffect(() => { get('/api/proposals').then(l => { setList(l); if (!idFromHash() && l.length) setSel(l[0].id) }).catch(e => setErr(String(e.message || e))) }, [])
  useEffect(() => { const h = () => setSel(idFromHash()); window.addEventListener('hashchange', h); return () => window.removeEventListener('hashchange', h) }, [])
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      <div className="bosch-supergraphic" aria-hidden="true" />
      <header className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between">
        <div><div className="font-extrabold">Search-Field Intelligence · Proposals</div>
          <div className="text-xs text-slate-500">Read-only. Nothing here changes the live board.</div></div>
        <a href="#/" className="text-sm text-teal-700 hover:underline">← Back to the board</a>
      </header>
      <div className="flex">
        <aside className="w-72 shrink-0 border-r border-slate-200 bg-white min-h-[calc(100vh-57px)] p-3">
          {err && <div className="text-xs text-red-700">{err}</div>}
          {!list ? <div className="text-xs text-slate-500">Loading…</div> : list.length === 0
            ? <div className="text-xs text-slate-500">No proposals yet. Run <code>python -m scripts.propose &lt;field&gt;</code>.</div>
            : list.map(x => (
              <a key={x.id} href={`#/review/${x.id}`} onClick={() => setSel(x.id)}
                 className={`block rounded-lg px-3 py-2 mb-1 ${sel === x.id ? 'bg-teal-50 border border-teal-200' : 'hover:bg-slate-50 border border-transparent'}`}>
                <div className="flex items-center justify-between"><b className="text-sm">{x.entity_id}</b><Badge tone={STATUS_TONE[x.status]}>{x.status}</Badge></div>
                <div className="text-[11px] text-slate-500">#{x.id} · MGI {fmt(x.mgi_before)} → {fmt(x.mgi_after)}{x.critic ? ` · ${x.critic}` : ''}</div>
              </a>
            ))}
        </aside>
        <main className="flex-1 p-6 max-w-[1200px]">{sel ? <Detail id={sel} /> : <div className="text-sm text-slate-500">Select a proposal.</div>}</main>
      </div>
    </div>
  )
}

import './index.css'
import React, { useEffect, useState } from 'react'
import ReactDOM from 'react-dom/client'
import { hydrate } from './store.js'

/* The board is loaded from the API before the UI module is imported, so every
   module-level reference in the UI sees hydrated data on its first read. */
const API = import.meta.env.VITE_API_BASE || ''

function Boot() {
  const [state, setState] = useState({ phase: 'loading' })

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch(`${API}/api/board`)
        if (!res.ok) throw new Error(`API returned ${res.status} ${res.statusText}`)
        hydrate(await res.json())
        const { default: SearchField } = await import('./SearchField.jsx')
        if (!cancelled) setState({ phase: 'ready', SearchField })
      } catch (err) {
        if (!cancelled) setState({ phase: 'error', message: String(err.message || err) })
      }
    })()
    return () => { cancelled = true }
  }, [])

  if (state.phase === 'ready') return <state.SearchField />
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: '#F7F8FA', color: '#0E1A2E' }}>
      <div style={{ textAlign: 'center', maxWidth: 440, padding: 24 }}>
        <div style={{ fontWeight: 800, fontSize: 18 }}>Search-Field Intelligence</div>
        {state.phase === 'loading'
          ? <div style={{ fontSize: 13, color: '#64748B', marginTop: 8 }}>Loading the board…</div>
          : <div style={{ fontSize: 13, color: '#B91C1C', marginTop: 8 }}>
              Could not load the board: {state.message}.<br />
              <span style={{ color: '#64748B' }}>Check that the API is running on port 8000.</span>
            </div>}
      </div>
    </div>
  )
}

/* #/review is the read-only proposal review; everything else is the board. */
const isReview = () => window.location.hash.startsWith('#/review')

function Router() {
  const [review, setReview] = useState(isReview())
  const [Review, setReviewComp] = useState(null)
  useEffect(() => {
    const h = () => setReview(isReview())
    window.addEventListener('hashchange', h)
    return () => window.removeEventListener('hashchange', h)
  }, [])
  useEffect(() => {
    if (review && !Review) import('./Review.jsx').then(m => setReviewComp(() => m.default))
  }, [review, Review])
  if (review) return Review ? <Review /> : null
  return <Boot />
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode><Router /></React.StrictMode>,
)

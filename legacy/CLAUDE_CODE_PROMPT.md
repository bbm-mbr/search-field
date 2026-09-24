# Claude Code Prompt — Search-Field Intelligence Platform

Paste everything below into Claude Code from an empty repo (or this repo to
extend it). Attach the search-field Excel / playbook PDF if available.

---

Build a production-grade "Search-Field Intelligence" platform for Bosch
Mobility's BBM team analysing 16 opportunity search fields for the INDIAN
mobility market.

## Context & data
- 16 search fields, each with sub-fields, an M&A/partnership mapping and a
  BBM-innovation mapping. Store them in `backend/app/data/search_fields.json`
  (if the file already exists in this repo, treat it as the source of truth;
  otherwise transcribe from the attached Excel).
- 11 analysis criteria mapped to frameworks in
  `backend/app/data/criteria.json`: PESTEL; Opportunity/Risk matrices;
  Competency Analysis; SWOT; TAM/SAM; Porter's 5 Forces; Stakeholder Radar;
  Perceptual competitor map; Kraljic supplier matrix; McKinsey 3 Horizons;
  and a final Right-to-Play Decision Matrix. Five criteria feed the decision
  matrix with weights: competency 0.25, market 0.20, porter 0.20,
  3-horizons 0.20, SWOT 0.15. Verdict bands: ≥7.5 ENTER, ≥6.0 EXPLORE,
  ≥4.5 WATCH, else NO-GO.

## Architecture (must follow)
- ONE configurable agent system, NOT one agent per field: a single persona
  ("Bosch Mobility India Search-Field Analyst"), a generic framework runner
  parameterised by prompt + search recipe, an async orchestrator, and a
  recommendation engine where the score is COMPUTED in code
  (confidence-weighted average; weight × max(confidence, 0.2)) and the LLM
  may adjust by at most ±0.5 with stated justification (clamp in code).
- Field-level roll-up: a full-field deep dive also runs the five matrix
  criteria for EVERY sub-field concurrently (semaphore-capped), and the
  recommendation outputs the field verdict plus a sub-field portfolio with
  play ∈ {lead, partner, watch, skip}.
- Grounding: each framework run does 2 targeted web searches → retrieves
  playbook passages from a Chroma RAG store → produces strict JSON with
  per-claim citation indices and a confidence float. Quantitative claims must
  cite or be labelled "estimate". On LLM/tool failure return an error object,
  never fabricated analysis.

## Stack
- Backend: FastAPI + asyncio. LLM via an OpenAI-compatible client pointed at
  the corporate model farm (env: MODEL_FARM_BASE_URL, MODEL_FARM_API_KEY,
  ANALYSIS_MODEL, UTILITY_MODEL, EMBEDDING_MODEL). Embedding fallback:
  local sentence-transformers bge-small-en-v1.5.
- Search (free/corporate-friendly only): SearXNG if SEARXNG_BASE_URL set,
  else DuckDuckGo via `ddgs`, else Brave free tier. News feed: Google News
  RSS (hl=en-IN) + GDELT DOC API, deduped — powers a Recent Activity tab.
- RAG: chromadb persistent store; ingest endpoint that chunks PDFs/MD from
  `backend/playbook/` (1200 chars, 200 overlap).
- Frontend: Vite + React 18 + Tailwind + recharts. Light theme: paper white
  background #F7F8FA, ink #0E1A2E, Bosch-style supergraphic gradient
  (violet #7A1FA2 → red #E20015 → teal #0096A0 → green #5BAA32) used ONLY as
  a 4px top strip and the verdict gauge fill. Left sidebar lists 16 fields;
  sub-field chips with an "All (field roll-up)" default; tabs:
  Recommendation, PESTEL, SWOT, Market, Attractiveness, Competency,
  3 Horizons, Recent Activity. Visualisations: semicircular verdict gauge,
  decision-matrix table with weights/confidence, SWOT quadrant cards, TAM/SAM
  horizontal bars, Porter radar, competency grouped bars (Bosch vs required),
  3-horizon columns, news timeline. Show citation indices and a source list
  under every framework view.

## API
- GET  /api/fields
- POST /api/deep-dive/{field_id}            (full field + sub-field roll-up)
- POST /api/deep-dive/{field_id}/{sub_id}   (sub-field lens, no roll-up)
- GET  /api/recent-activity/{field_id}?sub=
- POST /api/playbook/ingest
- GET  /healthz

## Transparency requirements (non-negotiable, from stakeholder review)
- The decision matrix response must include every intermediate number per
  row: weight, score, confidence, effective_weight = weight x max(conf, 0.2),
  contribution = score x effective_weight, plus sums, the formula string, and
  verdict_confidence = sum(conf x weight)/sum(weight). The UI renders all of it.
- Verdict-level confidence is COMPUTED (weight-averaged criterion
  confidence), never taken from the LLM.
- A "Methodology" tab shows the fixed pipeline, formula, weights, the
  confidence rubric (0.9+ multi-source recent; 0.7+ partial/single-source;
  0.5+ conflicting; <0.5 estimates) and verdict bands — identical for every
  field; only inputs change.
- Every framework output is reasoning-rich: PESTEL points carry reasoning +
  implication_for_bosch; SWOT entries carry why + so_what; competency entries
  carry why_required_level + why_bosch_level + gap_closure_rationale; Porter
  forces carry a reasoning paragraph + drivers; market sizing returns
  derivation_steps (full top-down chain, each input cited or marked estimate)
  + cross_check; 3-Horizons items carry reasoning + trigger. Each scored
  framework returns score_rationale explaining its own score. UI renders
  WHY / SO WHAT lines under every point.

## Quality bar
- All Python type-hinted, parses clean; defensive JSON parsing (strip code
  fences); CORS for localhost:5173; README with run instructions.
- Add: response caching to disk per (field, sub, date) so reruns are instant;
  an export endpoint that renders the recommendation to PPTX (python-pptx);
  pytest smoke tests with the LLM and search layers mocked.
- Never hardcode market numbers in the backend; demo/mock numbers live only
  in the standalone demo JSX and are labelled illustrative.

Start by reading any existing files in the repo, then implement incrementally
with a TODO plan, running the backend and `npm run build` to verify.

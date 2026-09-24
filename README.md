# Search-Field Intelligence — live platform

The Bosch Mobility India search-field board, moved from a static 12,870-line
React file onto a database, an API and — from Phase 1 — an agent pipeline that
keeps it current. Region India, M/MBR-IN.

## Phase 0 status: the live board equals the static board

| Check | Result |
|---|---|
| Python engine vs original JavaScript engine (every index, band, rank, all 18 fields) | exact match — `backend/tests/test_parity.py` |
| Database round-trip (values **and** key order) | byte-identical — `backend/tests/test_roundtrip.py` |
| UI hydrated from the API vs static board | identical portfolio — `frontend/scripts/parity.mjs` |
| Rendered page, live vs static (headless Edge) | identical body and visible text |
| LLM Farm through the proxy | all 12 routed models answer; grounded search works on Gemini 3.7 Flash, Gemini 2.5 Pro, Haiku 4.5 |

## Run it locally

```powershell
.\start.ps1 -Test        # checks, then API on :8000 and board on http://localhost:5190
```

Manually:

```powershell
cd backend;  .\.venv\Scripts\python -m uvicorn app.main:app --port 8000
cd frontend; npm run dev
```

LLM connectivity: `cd backend; .\.venv\Scripts\python -m scripts.smoke_llm`

With Docker Desktop running: `$env:POSTGRES_PASSWORD="..."; docker compose up -d --build`, board on http://localhost:8080.

## How it fits together

```
tools/extract.cjs        static SearchField.jsx  ->  backend/seed/board.json + golden.json
tools/split_frontend.py  static SearchField.jsx  ->  frontend/src/{engine,store,sources}.js + SearchField.jsx
backend/app/engine       V9 scoring engine, Python port, held to golden.json
backend/app/repository   seed -> section_doc rows -> assembled board
backend/app/llm          model gateway + routing (cost policy lives in routing.py)
```

Content is stored one row per **section** (e.g. `DATA / semis / market`) so the
agents can later refresh one section at a time. It is stored as JSON text, not
JSONB, because JSONB reorders keys and the UI renders several objects in key order.

The UI code is not hand-edited: `split_frontend.py` cuts it from the static file.
The data it reads comes from `store.js`, which `main.jsx` fills from `/api/board`
before the UI loads.

## Model policy (`backend/app/llm/routing.py`)

| Tier | Model | Used for |
|---|---|---|
| premium | Opus 5 | field verdicts and AI Analyst only; escalations |
| standard | Sonnet 5 | framework writing (fields and sub-fields), rubric scoring |
| fast | Haiku 4.5 | triage, tagging, JSON repair |
| grounded | Gemini 3.7 Flash, then 2.5 Pro, then Haiku 4.5 | web research, fact checks, market sizing |
| second | GPT-5.5 | blind second scorer and critic, a different model family from the author |

Only Haiku 4.5 and the Gemini models may search the web under Bosch org policy.
Opus 5 and Sonnet 5 reject `temperature` on the farm; the gateway omits it for them.

## Decisions since Phase 0

- **CPI rounding unified (2026-09-24).** The static UI computed Competitive
  Posture two ways and Sustainability showed 0.01 on the leaderboard but 0.02 on
  its card. Both now round the average threat to 2dp first; 0.01 everywhere.
- **The live frontend is now the source of truth.** `tools/split_frontend.py`
  was a one-time migration; re-running it would overwrite later changes.

`legacy/` holds the earlier attempt, kept for its prompts and PPTX export.

# Search-Field Intelligence — Bosch Mobility India

An agentic platform that deep-dives any of the 16 BBM search fields (and their
sub-fields) for the Indian mobility market, runs the team's criterion
frameworks (PESTEL, SWOT, TAM/SAM, Porter, Competency, 3 Horizons, …), and
produces an auditable **Right-to-Play recommendation** at search-field level
with a **"where to play" sub-field portfolio**.

## 1. Quick Start

### Prerequisites
- [Anaconda](https://www.anaconda.com/) with a conda env named `red` (Python 3.11)
- Node.js 18+

### Backend

```powershell
# Install dependencies (already done if using the repo)
conda run -n red pip install -r backend/requirements.txt

# Copy env (already configured if .env exists)
# Edit backend/.env with your farm keys if needed

# Create required directories
mkdir backend/playbook    # drop the Search-Field PDF here
mkdir backend/.chroma     # auto-created
mkdir backend/.cache      # auto-created

# Start the API server
Set-Location backend
conda run -n red uvicorn app.main:app --reload --port 8000

# Optional: ingest the playbook PDF once
Invoke-RestMethod -Method POST http://localhost:8000/api/playbook/ingest
```

### Frontend

```powershell
Set-Location frontend
npm install
npm run dev          # http://localhost:5173
```

The Vite dev server proxies `/api/*` to `http://localhost:8000` automatically.

## 2. Environment variables (backend/.env)

| Variable | Description |
|---|---|
| `MODEL_FARM_BASE_URL` | LLM Farm base URL (`https://aoai-farm.bosch-temp.com`) |
| `MODEL_FARM_API_KEY` | Bearer token for the farm |
| `ANALYSIS_MODEL` | Deep analysis model (`claude-sonnet-4-6`) |
| `UTILITY_MODEL` | Fast/cheap model (`claude-haiku-4-5`) |
| `EMBEDDING_MODEL` | Azure OpenAI embedding deployment (`text-embedding-3-large`) |
| `AZURE_OPENAI_ENDPOINT` | Azure OpenAI endpoint for embeddings |
| `AZURE_OPENAI_KEY` | Azure OpenAI API key |
| `AZURE_OPENAI_API_VERSION` | Azure API version (`2024-02-01`) |
| `PLAYBOOK_DIR` | Path to playbook PDFs (`./playbook`) |
| `CHROMA_DIR` | ChromaDB persistence path (`./.chroma`) |
| `CACHE_DIR` | Analysis cache path (`./.cache`) |

## 3. API

| Method | Path | Description |
|---|---|---|
| GET | `/api/fields` | All 16 search fields + criteria config |
| POST | `/api/deep-dive/{field_id}` | Full field analysis + sub-field roll-up + verdict |
| POST | `/api/deep-dive/{field_id}/{sub_id}` | Sub-field lens (no roll-up) |
| GET | `/api/recent-activity/{field_id}` | Live news (Google News RSS + GDELT) |
| POST | `/api/playbook/ingest` | Index PDFs from PLAYBOOK_DIR into ChromaDB |
| GET | `/api/export/{field_id}` | Download today's analysis as PPTX |
| DELETE | `/api/cache/{field_id}` | Clear today's cached analysis |
| GET | `/healthz` | Health check |

## 4. Agent architecture — one agent, not sixteen

The field is *data* (`app/data/search_fields.json`); the analytical skill is
the *agent*. There is:

- **One persona** (`agents/prompts.py: PERSONA`): the Bosch Mobility India
  Search-Field Analyst.
- **Ten framework runners** (one per criterion), all instances of a single
  generic runner (`agents/framework_agents.py`). Each run: targeted web
  searches → playbook RAG → JSON with citations + confidence.
- **One orchestrator** (`agents/orchestrator.py`) that fans out frameworks in
  parallel, runs the 5 matrix criteria for every sub-field (semaphore-capped),
  and writes the day's result to disk cache.
- **One recommendation engine** (`agents/recommendation.py`). Score is
  **computed in code** (confidence-weighted decision matrix). LLM writes only
  reasoning + sub-field portfolio and may shift the verdict ±0.5 max.

## 5. LLM integration

The farm exposes Claude models via **Google Vertex AI rawPredict** (not
OpenAI-compatible). `llm/client.py` posts directly with:
```
POST {MODEL_FARM_BASE_URL}/api/google/v1/publishers/anthropic/models/{model}:rawPredict
Authorization: Bearer {MODEL_FARM_API_KEY}
Body: {"anthropic_version": "vertex-2023-10-16", "max_tokens": N, "messages": [...]}
```

Embeddings use **Azure OpenAI** via the `openai.AzureOpenAI` SDK, with local
`bge-small-en-v1.5` as fallback if no Azure endpoint is configured.

## 6. Caching & Export

- **Disk cache**: results are written to `.cache/{md5(field+sub+date)}.json`
  after the first run. Subsequent calls today return instantly.
- **PPTX export**: `GET /api/export/{field_id}` reads today's cache and
  returns a 9-slide PowerPoint deck (title, decision matrix, reasoning, SWOT,
  Porter, market sizing, competency, 3 horizons, sub-field portfolio).

## 7. Running tests

```powershell
Set-Location backend
conda run -n red python -m pytest tests/ -v
```

All 14 smoke tests run with LLM and search layers mocked — no network calls.

## 8. Extending

- New search field → edit `app/data/search_fields.json`.
- Change criterion weights / verdict bands → `app/data/criteria.json`.
- New framework → add a prompt in `agents/prompts.py` + a search recipe in
  `agents/framework_agents.py`. No new classes.
- Drop PDFs into `backend/playbook/` and call `POST /api/playbook/ingest`.

`docs/SearchFieldDemo.jsx` is a standalone mock-data demo of the same UI.

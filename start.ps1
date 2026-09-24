# Search-Field Intelligence — local start (no Docker needed).
#   .\start.ps1           API on :8000, board on http://localhost:5190
#   .\start.ps1 -Test     run every check first: engine parity, round-trip, API
param([switch]$Test)
$root = $PSScriptRoot
$py = "$root\backend\.venv\Scripts\python.exe"

if (-not (Test-Path $py)) {
  Write-Host "Creating Python environment..."
  python -m venv "$root\backend\.venv"
  & $py -m pip install -q -r "$root\backend\requirements.txt"
}
if (-not (Test-Path "$root\frontend\node_modules")) {
  Write-Host "Installing frontend packages..."
  Push-Location "$root\frontend"; npm install --no-audit --no-fund; Pop-Location
}
if (-not (Test-Path "$root\backend\.env")) {
  Write-Warning "backend\.env missing - copy backend\.env.example and set LLM_FARM_API_KEY. The board runs without it; the LLM smoke test does not."
}

if ($Test) {
  Push-Location "$root\backend"; & $py -m pytest -q; $code = $LASTEXITCODE; Pop-Location
  if ($code -ne 0) { Write-Error "Tests failed - not starting."; exit $code }
}

Start-Process -FilePath $py -ArgumentList "-m","uvicorn","app.main:app","--port","8000" -WorkingDirectory "$root\backend"
Start-Process -FilePath "npm.cmd" -ArgumentList "run","dev" -WorkingDirectory "$root\frontend"
Write-Host "API   http://localhost:8000/api/health"
Write-Host "Board http://localhost:5190"

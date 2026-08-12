# Push the current branch to every configured remote (origin, market-intel, boschdevcloud).
# Run from the searchfield-app folder: .\push-all.ps1
# Skips a remote gracefully if it isn't configured or isn't reachable (e.g. VPN not connected).

$branch = git rev-parse --abbrev-ref HEAD
$remotes = git remote

if (-not $remotes) {
    Write-Host "No git remotes configured." -ForegroundColor Red
    exit 1
}

foreach ($r in $remotes) {
    Write-Host "==> Pushing to $r ($branch)..." -ForegroundColor Cyan
    git push $r $branch
    if ($LASTEXITCODE -ne 0) {
        Write-Host "    Push to $r FAILED (see error above) — continuing to next remote." -ForegroundColor Yellow
    } else {
        Write-Host "    OK" -ForegroundColor Green
    }
}

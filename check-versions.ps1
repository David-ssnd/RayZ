# RayZ Version Status Check (PowerShell)
# Run this to see all component versions

Write-Host "╔═══════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║           RayZ Version Status                             ║" -ForegroundColor Cyan
Write-Host "╚═══════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

Write-Host "📦 Main Repository:" -ForegroundColor Yellow
try {
    $version = git describe --tags 2>$null
    if (-not $version) { $version = "No tags yet" }
    Write-Host "   Version: $version"
    Write-Host "   Branch:  $(git branch --show-current)"
} catch {
    Write-Host "   ⚠️  Error reading git info" -ForegroundColor Red
}
Write-Host ""

Write-Host "🎯 Target Device (esp32/target):" -ForegroundColor Green
if (Test-Path "esp32/target/.git") {
    Push-Location esp32/target
    try {
        $version = git describe --tags 2>$null
        if (-not $version) { $version = "No tags yet" }
        Write-Host "   Version: $version"
        Write-Host "   Branch:  $(git branch --show-current)"
        Write-Host "   Commit:  $(git rev-parse --short HEAD)"
    } catch {
        Write-Host "   ⚠️  Error reading git info" -ForegroundColor Red
    }
    Pop-Location
} else {
    Write-Host "   ⚠️  Submodule not initialized" -ForegroundColor Red
}
Write-Host ""

Write-Host "🔫 Weapon Device (esp32/weapon):" -ForegroundColor Magenta
if (Test-Path "esp32/weapon/.git") {
    Push-Location esp32/weapon
    try {
        $version = git describe --tags 2>$null
        if (-not $version) { $version = "No tags yet" }
        Write-Host "   Version: $version"
        Write-Host "   Branch:  $(git branch --show-current)"
        Write-Host "   Commit:  $(git rev-parse --short HEAD)"
    } catch {
        Write-Host "   ⚠️  Error reading git info" -ForegroundColor Red
    }
    Pop-Location
} else {
    Write-Host "   ⚠️  Submodule not initialized" -ForegroundColor Red
}
Write-Host ""

Write-Host "📚 Shared Library (esp32/shared):" -ForegroundColor Blue
if (Test-Path "esp32/shared/library.json") {
    $json = Get-Content "esp32/shared/library.json" | ConvertFrom-Json
    Write-Host "   Version: $($json.version)"
} else {
    Write-Host "   ⚠️  library.json not found" -ForegroundColor Red
}
Write-Host ""

Write-Host "🌐 Web Interface (web):" -ForegroundColor Cyan
if (Test-Path "web/.git") {
    Push-Location web
    try {
        $version = git describe --tags 2>$null
        if (-not $version) { $version = "No tags yet" }
        Write-Host "   Version: $version"
        Write-Host "   Branch:  $(git branch --show-current)"
        Write-Host "   Commit:  $(git rev-parse --short HEAD)"
    } catch {
        Write-Host "   ⚠️  Error reading git info" -ForegroundColor Red
    }
    Pop-Location
} else {
    Write-Host "   ⚠️  Submodule not initialized" -ForegroundColor Red
}
Write-Host ""

Write-Host "╔═══════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║           Submodule Status                                ║" -ForegroundColor Cyan
Write-Host "╚═══════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
git submodule status

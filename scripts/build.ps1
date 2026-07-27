# ============================================================================
# AuditTest Vision — Build & Package Script
# 
# Usage: powershell -ExecutionPolicy Bypass -File scripts/build.ps1
# ============================================================================

Write-Host "[AuditTest Vision] Starting build..." -ForegroundColor Cyan

# Step 1: Clean previous build
if (Test-Path dist) { Remove-Item -Recurse -Force dist }
Write-Host "[1/5] Cleaned dist/" -ForegroundColor Green

# Step 2: Compile TypeScript
Write-Host "[2/5] Compiling TypeScript..." -ForegroundColor Yellow
npx tsc --project tsconfig.extension.json
if ($LASTEXITCODE -ne 0) {
    Write-Host "BUILD FAILED: TypeScript compilation errors" -ForegroundColor Red
    exit 1
}
Write-Host "[2/5] TypeScript compiled" -ForegroundColor Green

# Step 3: Copy static assets to dist/extension/
Write-Host "[3/5] Copying extension assets..." -ForegroundColor Yellow
Copy-Item src/extension/manifest.json dist/extension/manifest.json
Copy-Item src/extension/popup.html dist/extension/popup.html
Copy-Item src/extension/content.css dist/extension/content.css

# Create icons directory and copy icons
if (-not (Test-Path dist/extension/icons)) {
    New-Item -ItemType Directory -Path dist/extension/icons | Out-Null
}
Copy-Item src/extension/icons/* dist/extension/icons/ -ErrorAction SilentlyContinue

Write-Host "[3/5] Static assets copied" -ForegroundColor Green

# Step 4: Verify output
$fileCount = (Get-ChildItem dist -Recurse -File).Count
Write-Host "[4/5] Build output: $fileCount files in dist/" -ForegroundColor Green

# Step 5: Summary
Write-Host ""
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host " BUILD COMPLETE" -ForegroundColor Green
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Chrome Extension: dist/extension/"
Write-Host "  -> Load in chrome://extensions/ (Developer mode)"
Write-Host ""
Write-Host "Core modules: dist/core/, dist/modules/"
Write-Host ""

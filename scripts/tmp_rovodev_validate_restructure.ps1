# tmp_rovodev_validate_restructure.ps1
# Safe validation script: backup + optional import normalization + type-check

$ErrorActionPreference = 'Stop'

$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$source    = "C:\project\G-studio\G-Studio-v2.3.0-Complete"
$backup    = "C:\project\G-studio\G-Studio-v2.3.0-Complete-backup-$timestamp"

Write-Host "Creating backup at $backup ..."
# Exclude heavy folders; copy rest
robocopy $source $backup /E /MIR /R:0 /W:0 /XD node_modules dist coverage .git | Out-Null

# Verify root /components state
$rootComponents = Join-Path $source "components"
if (Test-Path $rootComponents) {
  $count = (Get-ChildItem -Recurse $rootComponents -File | Measure-Object).Count
  Write-Host "Root /components file count: $count"
  if ($count -gt 0) {
    Write-Host "WARNING: Found files in root /components. Review needed before proceeding." -ForegroundColor Yellow
  } else {
    Write-Host "Root /components is empty. OK."
  }
} else {
  Write-Host "Root /components folder not found. OK."
}

# Optional import updates (safe no-ops if not present)
$srcRoot = $source
$files = Get-ChildItem -Recurse $srcRoot -Include *.ts,*.tsx,*.js,*.jsx -File | Where-Object {
  $_.FullName -notmatch "\\node_modules\\|\\dist\\|\\coverage\\"
}

foreach ($file in $files) {
  $content = Get-Content $file.FullName -Raw
  $original = $content
  $content = $content.Replace("from 'components/", "from '@/components/")
  $content = $content.Replace('from "components/', 'from "@/components/')
  $content = $content.Replace("from './components/", "from '@/components/")
  $content = $content.Replace('from "./components/', 'from "@/components/')
  $content = $content.Replace("from '../components/", "from '@/components/")
  $content = $content.Replace('from "../components/', 'from "@/components/')
  $content = $content.Replace("require('components/", "require('@/components/")
  $content = $content.Replace('require("components/', 'require("@/components/')
  $content = $content.Replace("require('./components/", "require('@/components/")
  $content = $content.Replace('require("./components/', 'require("@/components/')
  $content = $content.Replace("require('../components/", "require('@/components/")
  $content = $content.Replace('require("../components/', 'require("@/components/')
  if ($content -ne $original) {
    Set-Content $file.FullName $content -NoNewline
    Write-Host "Updated imports in: $($file.FullName)"
  }
}

# Strict audit after potential updates (simple substring search)
$needles = @(
  "from 'components/", 'from "components/',
  "from './components/", 'from "./components/',
  "from '../components/", 'from "../components/',
  "require('components/", 'require("components/',
  "require('./components/", 'require("./components/',
  "require('../components/", 'require("../components/'
)

$findings = @()
foreach ($file in $files) {
  $text = Get-Content $file.FullName -Raw
  foreach ($n in $needles) {
    if ($text.Contains($n)) {
      $findings += [pscustomobject]@{ Path = $file.FullName; Pattern = $n }
    }
  }
}

if ($findings.Count -gt 0) {
  Write-Host "Potential legacy imports detected:" -ForegroundColor Yellow
  $findings | Select-Object -First 200 | Format-Table -AutoSize
} else {
  Write-Host "No legacy root /components-style imports detected. OK." -ForegroundColor Green
}

# Type check (if available)
Push-Location $source
try {
  if (Test-Path "package.json") {
    Write-Host "Running type check (npm run type-check) ..."
    npm run type-check
  } else {
    Write-Host "package.json not found; skipping type-check."
  }
} finally {
  Pop-Location
}

Write-Host "Validation complete."
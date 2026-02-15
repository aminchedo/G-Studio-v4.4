# Verification Script for Import Fixes
Write-Host ""
Write-Host "=== Import Path Fix Verification ===" -ForegroundColor Cyan
Write-Host ""

$filePath = "C:\project\G-studio\G-Studio-v4.4_1-Integratedzi\src\services\geminiService.ts"

# Check if file exists
if (-not (Test-Path $filePath)) {
    Write-Host "ERROR: File not found!" -ForegroundColor Red
    exit 1
}

Write-Host "File found successfully" -ForegroundColor Green
Write-Host ""

# Read file content
$content = Get-Content $filePath -Raw

# Verify each import path
Write-Host "Checking import paths..." -ForegroundColor Yellow
Write-Host ""

$passed = 0
$total = 0

# Check modelValidationStore
$total++
if ($content -match 'from ["'']\.\/ai\/modelValidationStore["'']') {
    Write-Host "  modelValidationStore: OK" -ForegroundColor Green
    $passed++
} else {
    Write-Host "  modelValidationStore: FAILED" -ForegroundColor Red
}

# Check modelSelectionService
$total++
if ($content -match 'from ["'']\.\/ai\/modelSelectionService["'']') {
    Write-Host "  modelSelectionService: OK" -ForegroundColor Green
    $passed++
} else {
    Write-Host "  modelSelectionService: FAILED" -ForegroundColor Red
}

# Check modelTestingService
$total++
if ($content -match 'from ["'']\.\/ai\/modelTestingService["'']') {
    Write-Host "  modelTestingService: OK" -ForegroundColor Green
    $passed++
} else {
    Write-Host "  modelTestingService: FAILED" -ForegroundColor Red
}

# Check streamLifecycleManager
$total++
if ($content -match 'from ["'']\.\.\/streamLifecycleManager["'']') {
    Write-Host "  streamLifecycleManager: OK" -ForegroundColor Green
    $passed++
} else {
    Write-Host "  streamLifecycleManager: FAILED" -ForegroundColor Red
}

# Check streamingMonitor
$total++
if ($content -match 'from ["'']\.\.\/monitoring\/streamingMonitor["'']') {
    Write-Host "  streamingMonitor: OK" -ForegroundColor Green
    $passed++
} else {
    Write-Host "  streamingMonitor: FAILED" -ForegroundColor Red
}

# Check fatalAIError
$total++
if ($content -match 'from ["'']\.\.\/fatalAIError["'']') {
    Write-Host "  fatalAIError: OK" -ForegroundColor Green
    $passed++
} else {
    Write-Host "  fatalAIError: FAILED" -ForegroundColor Red
}

# Check completionReporter
$total++
if ($content -match 'from ["'']\.\.\/monitoring\/completionReporter["'']') {
    Write-Host "  completionReporter: OK" -ForegroundColor Green
    $passed++
} else {
    Write-Host "  completionReporter: FAILED" -ForegroundColor Red
}

# Check runtimeUIVerification
$total++
if ($content -match 'from ["'']\.\.\/runtimeUIVerification["'']') {
    Write-Host "  runtimeUIVerification: OK" -ForegroundColor Green
    $passed++
} else {
    Write-Host "  runtimeUIVerification: FAILED" -ForegroundColor Red
}

# Check chaosTesting
$total++
if ($content -match 'from ["'']\.\.\/chaosTesting["'']') {
    Write-Host "  chaosTesting: OK" -ForegroundColor Green
    $passed++
} else {
    Write-Host "  chaosTesting: FAILED" -ForegroundColor Red
}

# Check llm/cost
$total++
if ($content -match 'from ["'']\.\.\/\.\.\/llm\/cost["'']') {
    Write-Host "  llm/cost: OK" -ForegroundColor Green
    $passed++
} else {
    Write-Host "  llm/cost: FAILED" -ForegroundColor Red
}

Write-Host ""
Write-Host "Results: $passed/$total imports verified" -ForegroundColor Cyan

if ($passed -eq $total) {
    Write-Host ""
    Write-Host "SUCCESS: All imports verified!" -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "WARNING: Some imports may need attention" -ForegroundColor Yellow
}

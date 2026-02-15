$filePath = "C:\project\G-studio\G-Studio-v4.4_1-Integratedzi\src\services\geminiService.ts"
Write-Host "Fixing dynamic import paths..." -ForegroundColor Cyan
$content = Get-Content $filePath -Raw

Write-Host "Applying fixes for dynamic imports..." -ForegroundColor Yellow

# Fix dynamic imports (await import statements)
# 1. modelValidationStore dynamic imports
$content = $content -replace "await import\([''\""]\.\/modelValidationStore[''\""]\)", "await import('./ai/modelValidationStore')"

# 2. modelSelectionService dynamic imports
$content = $content -replace "await import\([''\""]\.\/modelSelectionService[''\""]\)", "await import('./ai/modelSelectionService')"

# 3. modelTestingService dynamic imports  
$content = $content -replace "await import\([''\""]\.\/modelTestingService[''\""]\)", "await import('./ai/modelTestingService')"

# 4. streamLifecycleManager dynamic imports
$content = $content -replace "await import\([''\""]\.\/streamLifecycleManager[''\""]\)", "await import('../streamLifecycleManager')"

# 5. streamingMonitor dynamic imports
$content = $content -replace "await import\([''\""]\.\/monitoring\/streamingMonitor[''\""]\)", "await import('../monitoring/streamingMonitor')"

# 6. fatalAIError dynamic imports
$content = $content -replace "await import\([''\""]\.\/fatalAIError[''\""]\)", "await import('../fatalAIError')"

# 7. completionReporter dynamic imports
$content = $content -replace "await import\([''\""]\.\/monitoring\/completionReporter[''\""]\)", "await import('../monitoring/completionReporter')"

# 8. runtimeUIVerification dynamic imports
$content = $content -replace "await import\([''\""]\.\/runtimeUIVerification[''\""]\)", "await import('../runtimeUIVerification')"

# 9. chaosTesting dynamic imports
$content = $content -replace "await import\([''\""]\.\/chaosTesting[''\""]\)", "await import('../chaosTesting')"

Write-Host "Saving file..." -ForegroundColor Green
Set-Content -Path $filePath -Value $content -NoNewline

Write-Host ""
Write-Host "Dynamic import paths fixed successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "Fixed dynamic imports:" -ForegroundColor Cyan
Write-Host "  - modelValidationStore" -ForegroundColor White
Write-Host "  - modelSelectionService" -ForegroundColor White
Write-Host "  - modelTestingService" -ForegroundColor White  
Write-Host "  - streamLifecycleManager" -ForegroundColor White
Write-Host "  - streamingMonitor" -ForegroundColor White
Write-Host "  - fatalAIError" -ForegroundColor White
Write-Host "  - completionReporter" -ForegroundColor White
Write-Host "  - runtimeUIVerification" -ForegroundColor White
Write-Host "  - chaosTesting" -ForegroundColor White

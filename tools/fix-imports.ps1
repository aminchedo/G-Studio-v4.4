$filePath = "C:\project\G-studio\G-Studio-v4.4_1-Integratedzi\src\services\geminiService.ts"
Write-Host "Reading file..." -ForegroundColor Cyan
$content = Get-Content $filePath -Raw

Write-Host "Applying fixes..." -ForegroundColor Yellow

# 1. modelValidationStore imports
$content = $content -replace 'from [''"]\.\/modelValidationStore[''"]', 'from "./ai/modelValidationStore"'

# 2. modelSelectionService import
$content = $content -replace 'from [''"]\.\/modelSelectionService[''"]', 'from "./ai/modelSelectionService"'

# 3. modelTestingService import
$content = $content -replace 'from [''"]\.\/modelTestingService[''"]', 'from "./ai/modelTestingService"'

# 4. modelTelemetryService import (if needed)
$content = $content -replace 'from [''"]@\/services\/modelTelemetryService[''"]', 'from "./ai/modelTelemetryService"'

# 5. streamLifecycleManager import
$content = $content -replace 'from [''"]\.\.\/streamLifecycleManager[''"]', 'from "../streamLifecycleManager"'

# 6. streamingMonitor import
$content = $content -replace 'from [''"]\.\.\/monitoring\/streamingMonitor[''"]', 'from "../monitoring/streamingMonitor"'

# 7. fatalAIError imports
$content = $content -replace 'from [''"]\.\.\/fatalAIError[''"]', 'from "../fatalAIError"'

# 8. completionReporter imports
$content = $content -replace 'from [''"]\.\.\/monitoring\/completionReporter[''"]', 'from "../monitoring/completionReporter"'

# 9. runtimeUIVerification import
$content = $content -replace 'from [''"]\.\.\/runtimeUIVerification[''"]', 'from "../runtimeUIVerification"'

# 10. chaosTesting import
$content = $content -replace 'from [''"]\.\.\/chaosTesting[''"]', 'from "../chaosTesting"'

# 11. llm/cost import
$content = $content -replace 'from [''"]\.\.\/\.\.\/llm\/cost[''"]', 'from "../../llm/cost"'

Write-Host "Saving file..." -ForegroundColor Green
Set-Content -Path $filePath -Value $content -NoNewline

Write-Host ""
Write-Host "All import paths fixed successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "Fixed imports:" -ForegroundColor Cyan
Write-Host "  - modelValidationStore" -ForegroundColor White
Write-Host "  - modelSelectionService" -ForegroundColor White
Write-Host "  - modelTestingService" -ForegroundColor White
Write-Host "  - streamLifecycleManager" -ForegroundColor White
Write-Host "  - streamingMonitor" -ForegroundColor White
Write-Host "  - fatalAIError" -ForegroundColor White
Write-Host "  - completionReporter" -ForegroundColor White
Write-Host "  - runtimeUIVerification" -ForegroundColor White
Write-Host "  - chaosTesting" -ForegroundColor White
Write-Host "  - llm/cost" -ForegroundColor White

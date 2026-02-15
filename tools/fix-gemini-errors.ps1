# Fix geminiService.ts TypeScript errors
$filePath = "C:\project\G-studio\G-Studio-v4.4_1-Integratedzi\src\services\geminiService.ts"
$content = Get-Content $filePath -Raw

Write-Host "Fixing import paths..." -ForegroundColor Green

# Fix all import paths
$content = $content -replace 'import \{ recordTelemetry \} from "@/services/modelTelemetryService"', 'import { recordTelemetry } from "./ai/modelTelemetryService"'
$content = $content -replace 'from "/modelFallbackManager"', 'from "./ai/modelFallbackManager"'
$content = $content -replace 'from "\./geminiSmartLayer"', 'from "./ai/geminiSmartLayer"'
$content = $content -replace 'from "\./modelValidationStore"', 'from "./ai/modelValidationStore"'
$content = $content -replace 'from "\.\./network/degradedMode"', 'from "./network/degradedMode"'
$content = $content -replace 'from "\.\./network/providerLimit"', 'from "./network/providerLimit"'
$content = $content -replace 'from "\.\./streamLifecycleManager"', 'from "../streamLifecycleManager"'
$content = $content -replace 'from "\.\./monitoring/streamingMonitor"', 'from "../monitoring/streamingMonitor"'
$content = $content -replace 'from "\./modelSelectionService"', 'from "./ai/modelSelectionService"'
$content = $content -replace 'from "\.\./fatalAIError"', 'from "../fatalAIError"'
$content = $content -replace 'from "\.\./monitoring/completionReporter"', 'from "../monitoring/completionReporter"'
$content = $content -replace 'from "\.\./runtimeUIVerification"', 'from "../runtimeUIVerification"'
$content = $content -replace 'from "\.\./chaosTesting"', 'from "../chaosTesting"'
$content = $content -replace 'from "\.\./\.\./llm/cost"', 'from "../../llm/cost"'
$content = $content -replace 'from "\./modelTestingService"', 'from "./ai/modelTestingService"'

# Save the file
Set-Content -Path $filePath -Value $content -NoNewline

Write-Host "Import paths fixed successfully!" -ForegroundColor Green

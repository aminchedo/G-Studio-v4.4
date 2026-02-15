# Optimization Changes

**Date:** 2025-02-15

## 1. Conditional Simple-Message Routing (agentOrchestrator.ts)

- **Added:** `isSimpleMessage(message)` — returns true when message length ≤ 180 chars and contains no code/file keywords (create project, edit, create file, analyze, optimize, debug, file extensions, etc.).
- **Behavior:** When `useSimplePath === true`:
  - Skip `ContextDatabaseBridge.init()`
  - Skip `PromptProfessionalizer` (and prompt evolution)
  - Skip `getCurrentSession()` (sessionId stays null)
  - Skip SQLite context retrieval and memory pressure/summary
  - Skip context budget enforcement
  - Skip context persistence after response (sessionId is null)
  - Skip `saveToDatabase()` at end
- **Still run:** Model gate, ModelArbitrator, HybridDecisionEngine, detectIntent, then same intent switch; for "chat"/default, `this.chat()` → chatWithTools (single primary LLM). No removal of multi-agent system; only a fast path for simple text.

## 2. API Lifecycle Refinement (App.tsx) — No New Send Guard

- **False ERROR fix:** Validation effect now only sets `apiStatus("ERROR")` when `configReady && !effectiveApiKey`. Added `configReady` to effect dependency array. This avoids temporary ERROR before config/key has loaded.
- **LOADING vs ERROR UI:** When `apiStatus !== "READY"`, the message shown is now:
  - `apiStatus === "LOADING"` → "Initializing AI service…"
  - Otherwise (ERROR) → "API key is missing or invalid. Please check Settings."
- No additional send guard logic added.

## 3. Lightweight Performance Instrumentation

- **App.tsx:** `console.time("agent_pipeline")` before `AgentOrchestrator.processUserMessage`, `console.timeEnd("agent_pipeline")` after.
- **agentOrchestrator.ts:**
  - `console.time("agent_pipeline:orchestrator")` at pipeline start, `console.timeEnd("agent_pipeline:orchestrator")` before return.
  - `console.time("agent_pipeline:intent")` / `console.timeEnd("agent_pipeline:intent")` around `detectIntent`.

No heavy logging framework.

## 4. What Was Not Changed

- STT and mic: untouched.
- InputArea: untouched.
- No UI layout, styling, or Ribbon structure changes.
- Chat → TTS wiring preserved: `thinkingEngine.speak(result.response)` unchanged.
- Validation still runs once per (effectiveApiKey, configReady); multi-agent does not trigger re-validation.
- No new send guard.

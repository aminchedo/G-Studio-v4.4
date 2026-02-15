# Multi-Agent Latency Analysis

**Date:** 2025-02-15  
**Scope:** Request lifecycle from chat send → agent selection → LLM call → response aggregation → UI update.

## Request Lifecycle (Traced)

1. **Chat send** — `App.handleSend` (guard checks, then `AgentOrchestrator.processUserMessage`).
2. **Agent selection** — `AgentOrchestrator`: model gate, `ModelArbitrator.arbitrate`, `HybridDecisionEngine.decideMode`, then `detectIntent` (rule-based, sync).
3. **LLM call** — For intent `chat`/default: `this.chat()` → `chatWithTools` (Gemini stream). For create/edit/analyze/optimize/debug: dedicated methods (some use `MultiAgentService.orchestrateAgents`).
4. **Response aggregation** — Single response for chat; multi-step only in autonomous mode or multi-agent intents.
5. **UI update** — `setMessages` with `result.response`, then TTS hook if voice enabled.

## Findings

- **Multiple LLM calls per message:** Only for non-chat intents (e.g. optimize/debug use `MultiAgentService.orchestrateAgents`). For "chat" intent there is a single primary LLM path (`chatWithTools`).
- **Recursive agent invocation:** Autonomous mode can run multiple steps; each step can call `executeAutonomousStep` (LLM). Not used for simple chat.
- **Redundant validation:** API validation runs in App once per `effectiveApiKey` + `configReady`. AgentOrchestrator does not trigger re-validation; it uses `ModelValidationStore` / `ModelSelectionService` (read-only after validation).
- **Telemetry blocking:** No telemetry found that blocks the main pipeline; `sendAgentTelemetry` is fire-and-forget.
- **Synchronous blocking:** `detectIntent` is synchronous (keyword checks). Heavy work is async: Context DB init, session, context retrieval, prompt professionalizer, model arbitrator, decision engine.

## Instrumentation Added (Lightweight)

- **App.tsx:** `console.time("agent_pipeline")` before `processUserMessage`, `console.timeEnd("agent_pipeline")` after.
- **agentOrchestrator.ts:**
  - `console.time("agent_pipeline:orchestrator")` at start of pipeline, `console.timeEnd("agent_pipeline:orchestrator")` before return.
  - `console.time("agent_pipeline:intent")` / `console.timeEnd("agent_pipeline:intent")` around `detectIntent`.

Use browser DevTools Console to read these timers. No heavy logging framework introduced.

## Bottlenecks Identified

1. **Context DB + session + context retrieval** — Runs for every message when not using the simple path. Now skipped for simple messages (see optimization-changes.md).
2. **Prompt professionalization** — Optional; now skipped on simple path.
3. **Model arbitration + decision engine** — Kept for both paths (lightweight).
4. **Intent detection** — Fast (rule-based); timed separately.

## Validation Loop Check

- Validation runs in a single `useEffect` in App, dependencies `[effectiveApiKey, configReady, setApiStatus]`.
- Multi-agent and AgentOrchestrator do not modify `effectiveApiKey` or trigger re-mount of that effect. Validation runs once per key/config state; no loop.

# Modified Files

**Date:** 2025-02-15  
**Investigation:** Multi-agent latency, API lifecycle refinement, conditional simple-message routing.

## List

| File                                | Changes                                                                                                                                                                                                                                                                                                                                                                                                                             |
| ----------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/App.tsx`                       | 1) Validation effect: only set ERROR when `configReady && !effectiveApiKey`; added `configReady` to deps. 2) handleSend: distinct status message for LOADING vs ERROR. 3) Wrapped `AgentOrchestrator.processUserMessage` in `console.time("agent_pipeline")` / `console.timeEnd("agent_pipeline")`.                                                                                                                                 |
| `src/services/agentOrchestrator.ts` | 1) Added `isSimpleMessage(message)` and `useSimplePath`; skip context DB init, session, context retrieval, prompt professionalizer, memory/summary, context budget, context persistence, and saveToDatabase when useSimplePath. 2) Added `console.time("agent_pipeline:orchestrator")` / `console.timeEnd("agent_pipeline:orchestrator")` and `console.time("agent_pipeline:intent")` / `console.timeEnd("agent_pipeline:intent")`. |

## Not Modified

- InputArea, useSpeechRecognition, mic UI, chat layout, Ribbon, styling.
- Stores (appStore, etc.) — no new guard state.
- TTS wiring (thinkingEngine.speak) — unchanged.
- Validation logic aside from configReady gating and ERROR message clarity.

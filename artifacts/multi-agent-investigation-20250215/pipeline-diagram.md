# Pipeline Diagram

**Date:** 2025-02-15

## High-Level Flow

```
[User] → handleSend (App.tsx)
           │
           ├─ apiStatus !== READY? → Show LOADING or ERROR message, return
           ├─ DegradedMode / Cooldown checks → return if blocked
           ├─ configReady / effectiveApiKey / validationComplete checks → return if not ready
           │
           └─ console.time("agent_pipeline")
              AgentOrchestrator.processUserMessage(...)
                │
                ├─ Provider + model gate (ModelValidationStore, ModelSelectionService)
                ├─ useSimplePath = isSimpleMessage(message)
                │
                ├─ [if !useSimplePath] ContextDatabaseBridge.init()
                ├─ [if !useSimplePath && PromptProfessionalizer] professionalize(message)
                ├─ ModelArbitrator.arbitrate(...)
                ├─ HybridDecisionEngine.decideMode(...)
                ├─ [if !useSimplePath] getCurrentSession(), getRelevantContext(), memory/summary
                ├─ [if !useSimplePath] context budget enforcement
                │
                ├─ console.time("agent_pipeline:intent")
                ├─ detectIntent(message) → { type, target, confidence }
                ├─ console.timeEnd("agent_pipeline:intent")
                │
                ├─ [if autonomous] TaskDecompositionEngine → executeAutonomousStep loop
                │
                └─ switch (intent.type):
                     create_project → createProject() [LLM]
                     edit_file → editFile() [LLM]
                     create_file → createFile() [LLM]
                     analyze_code → analyzeCode() [LLM]
                     optimize_code → optimizeCode() [MultiAgentService]
                     debug → debugCode() [MultiAgentService]
                     chat / default → chat() [single LLM + tools]
                │
                ├─ [if sessionId] Context persistence, lineage, summary
                ├─ [if !useSimplePath] saveToDatabase()
                └─ console.timeEnd("agent_pipeline:orchestrator")
              console.timeEnd("agent_pipeline")
           │
           └─ setMessages(result.response), TTS if voiceEnabled
```

## Simple Path (Conditional Routing)

When `isSimpleMessage(message)` is true (short text, no code/file keywords):

- **Skipped:** ContextDatabaseBridge.init(), getCurrentSession(), getRelevantContext(), PromptProfessionalizer, memory pressure/summary, context budget enforcement, saveToDatabase(), context persistence block (sessionId remains null).
- **Kept:** Model gate, ModelArbitrator, HybridDecisionEngine, detectIntent, then same switch → chat/default → chat() → chatWithTools (primary LLM). No multi-agent for chat intent.

## Agent vs Single-LLM

| Intent         | Path            | LLM calls         |
| -------------- | --------------- | ----------------- |
| chat / default | this.chat()     | 1 (chatWithTools) |
| create_project | createProject() | 1                 |
| edit_file      | editFile()      | 1                 |
| create_file    | createFile()    | 1                 |
| analyze_code   | analyzeCode()   | 1 (stream)        |
| optimize_code  | optimizeCode()  | MultiAgentService |
| debug          | debugCode()     | MultiAgentService |

Multi-agent is only used for optimize and debug; chat is single primary LLM.

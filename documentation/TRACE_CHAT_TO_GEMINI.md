# Trace: Chat UI → Gemini stream

Execution path from user sending a message to `generateContentStream`.

---

## 1. UI → App

| Step | File      | Line (approx) | What happens                                                                                                                                                                                                                           |
| ---- | --------- | ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1    | `App.tsx` | 1871          | `InputArea` has `disabled={!agentConfig.apiKey}` — if no API key, Send is disabled and placeholder shows "Please set your API key in Settings first".                                                                                  |
| 2    | `App.tsx` | 1869          | `onSend={handleSend}` — when user submits, `handleSend` is called.                                                                                                                                                                     |
| 3    | `App.tsx` | 798–807       | `handleSend(userMessage)`: early exit if no message or `isLoading`; **if no `agentConfig.apiKey`**, shows error and opens settings modal, returns.                                                                                     |
| 4    | `App.tsx` | 809–828       | Adds user message to state, sets `isLoading`, adds empty AI message placeholder.                                                                                                                                                       |
| 5    | `App.tsx` | 831–866       | Builds context (active file, open files), takes last 10 messages as history, generates `requestId`.                                                                                                                                    |
| 6    | `App.tsx` | 852–866       | **Trace log:** `[Trace] handleSend → GeminiService.streamChat` with `requestId`, `model`, `apiKeySet`.                                                                                                                                 |
| 7    | `App.tsx` | 855–866       | Calls **`GeminiService.streamChat(selectedModel, historyMessages, userMessage+contextText, undefined, undefined, agentConfig.apiKey, true, true, false, requestId)`**. Import: `GeminiService` from **`@/services/ai/geminiService`**. |

---

## 2. GeminiService.streamChat (entry)

| Step | File                               | Line (approx) | What happens                                                                                                                                                        |
| ---- | ---------------------------------- | ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 8    | `src/services/ai/geminiService.ts` | 1295–1322     | `streamChat` static async generator: checks `requestId`, 429 cooldown, provider availability.                                                                       |
| 9    | `src/services/ai/geminiService.ts` | 1327–1422     | Imports stream lifecycle, registers stream, gets model from Model Ribbon via `ModelSelectionService.getValidatedModel(apiKey)`.                                     |
| 10   | `src/services/ai/geminiService.ts` | 1424–2095     | Retry/fallback loop: for each model attempt, builds `contents`, `generationConfig`, then either non-streaming or streaming branch.                                  |
| 11   | `src/services/ai/geminiService.ts` | 1946–1947     | **Streaming branch:** `const ai = new GoogleGenAI({ apiKey: finalApiKey });` (NEW SDK client).                                                                      |
| 12   | `src/services/ai/geminiService.ts` | 2107–2118     | **Trace log:** `[Trace] GeminiService.streamChat → ai.models.generateContentStream` with `requestId`, `model`, `hasModels: !!ai.models`.                            |
| 13   | `src/services/ai/geminiService.ts` | 2118–2132     | **`responseStream = await ai.models.generateContentStream({ model, contents, config })`** — the call that was undefined with OLD SDK; now valid with `GoogleGenAI`. |
| 14   | `src/services/ai/geminiService.ts` | 2258+         | `for await (const chunk of responseStream)` — consumes stream, yields `{ text }`, `{ toolCalls }`, `{ usage }`, etc.                                                |

---

## 3. App consumes stream

| Step | File      | Line (approx) | What happens                                                                                                                                                 |
| ---- | --------- | ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 15   | `App.tsx` | 893–911       | `for await (const chunk of stream)`: on `chunk.text` appends to `fullResponse` and updates AI message in state (live update).                                |
| 16   | `App.tsx` | 909–1053      | On `chunk.toolCalls`, runs tool callbacks (e.g. setFiles), then may call **`GeminiService.streamChat` again** (follow-up request with tool results) at 1021. |
| 17   | `App.tsx` | 1062–1084     | On completion: updates token usage, `showSuccess`; on error: removes empty AI message, `showError`, adds error message to chat.                              |

---

## 4. Console trace points

When you run the app and send a message (with API key set), you should see in **DevTools → Console**:

1. **`[Trace] handleSend → GeminiService.streamChat`**  
   `{ requestId, model, apiKeySet: true }`  
   → Confirms UI called the service with a request id and model.

2. **`[Trace] GeminiService.streamChat → ai.models.generateContentStream`**  
   `{ requestId, model, hasModels: true }`  
   → Confirms NEW SDK client has `ai.models` and we are about to call streaming.

3. Existing logs such as **`[GeminiService][requestId=...]`**, **`[GenConfig]`**, etc., for full request/response tracing.

---

## 5. Quick verification

1. Run: `npm run dev` → open http://localhost:3000/
2. Set API key: **AI Settings** (gear in sidebar) → Connection → set key → run **API Model Test** if required.
3. Send a message in the Conversation panel.
4. Open **F12 → Console** and confirm the two `[Trace]` logs above appear and that no `Cannot read properties of undefined (reading 'generateContentStream')` error occurs.

If the trace logs appear and the stream returns chunks, the path from chat → `handleSend` → `GeminiService.streamChat` → `ai.models.generateContentStream` is working end-to-end.

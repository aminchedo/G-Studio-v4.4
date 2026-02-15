# یک فایل کامل — معماری، نقش‌ها، و دستورات اجرایی

# Complete File: Architecture, Roles, and Operating Orders

This document covers **architecture**, **component roles**, and **implementation of operating orders** for the voice-conversation app (گفتگوی صوتی با اژنت).

---

## 1. Architecture (معماری)

### 1.1 High-level flow

```
[User] ──speak──► [Speech-to-Text] ──text──► [Chat UI] ──send──► [Model Service]
                                                                        │
                                                                        ▼
[User] ◄──speak── [TTS] ◄──reply text── [Model] ◄───────────────────────┘
```

### 1.2 Two paths

| Path  | Name             | Use case                                                        |
| ----- | ---------------- | --------------------------------------------------------------- |
| **A** | Modal voice chat | One window: speak → model answers → model speaks (2 components) |
| **B** | Main app voice   | Chat bar + mic → model → TTS for reply (5 components)           |

### 1.3 Component layout

```
master-update / src  →  integrated into project src/
├── components/
│   ├── modals/
│   │   └── VoiceChatModal.tsx     ← Option A (UI + TTS)
│   └── chat/
│       └── InputArea.tsx          ← Option B (chat + mic)
├── hooks/
│   └── useSpeechRecognition.tsx   ← Shared (speech → text)
├── stores/
│   └── voiceStore.ts              ← Option B (TTS state + startSpeaking) [ADDED]
└── services/
    └── ai/
        ├── geminiService.ts       ← Option B (existing; not replaced)
        └── ThinkingEngine.ts     ← Option B (minimal: speak → voiceStore) [ADDED]
```

---

## 2. Roles (نقش هر جزء)

| #   | File                         | Role (نقش)                                                                                                          |
| --- | ---------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| 1   | **VoiceChatModal.tsx**       | Option A UI: mic, send user text to model, play model reply with browser TTS. Full voice conversation in one modal. |
| 2   | **useSpeechRecognition.tsx** | Speech-to-text: turns microphone input into text. Used by both Option A and Option B.                               |
| 3   | **InputArea.tsx**            | Option B UI: chat input, mic button, sends text to main app send handler (→ model).                                 |
| 4   | **voiceStore.ts**            | Option B: voice state (listening/speaking) and **TTS** (`startSpeaking(text)`). Makes the model "talk".             |
| 5   | **geminiService.ts**         | Option B: calls Gemini API; existing production service not replaced.                                               |
| 6   | **ThinkingEngine.ts**        | Option B: `speak(reply)` calls `voiceStore.startSpeaking(reply)` so the reply is spoken.                            |

---

## 3. Operating orders — implementation (دستورات اجرایی)

(Unchanged from original; see master-update copy for full text.)

---

## 4. Known Issues Discovered During Local Merge

| Issue                                     | Reproduction                                                                                                  | Suggested fix                                                                                                                         | Status                         |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------ |
| thinkingStore not in project              | ThinkingEngine from master-update used thinkAbout/generateCode depending on thinkingStore                     | Minimal ThinkingEngine added with only `speak(text)` → voiceStore.startSpeaking; full flow deferred                                   | Resolved (minimal integration) |
| Option B reply→TTS not wired in main chat | Model reply in main app does not automatically call voiceStore.startSpeaking                                  | Where stream/chat completes, call `useVoiceStore.getState().startSpeaking(reply)` or `thinkingEngine.speak(reply)` when voice enabled | Pending (optional wiring)      |
| Pre-existing tsc errors                   | Running `tsc --noEmit` reports many errors in other files (ultimate-gemini-tester, panels, preview, etc.)     | Fix in separate PR; voice files are clean                                                                                             | Documented                     |
| Vosk/STT in voiceStore                    | voiceStore.startListening uses SpeechRecognitionService + Vosk fallback; Vosk may be unavailable in some envs | Already handled with fallback; no change                                                                                              | N/A                            |

---

## 5. Summary

- **Architecture:** Two paths (A = modal, B = main app); one shared hook (useSpeechRecognition); Option B uses voiceStore + ThinkingEngine.speak for TTS.
- **Merge:** voiceStore and minimal ThinkingEngine added; VoiceChatModal and useSpeechRecognition received logic-only / safety improvements; UI unchanged.
- **Known issues:** See §4 above.

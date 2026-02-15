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

| Path | Name | Use case |
|------|------|----------|
| **A** | Modal voice chat | One window: speak → model answers → model speaks (2 components) |
| **B** | Main app voice | Chat bar + mic → model → TTS for reply (5 components) |

### 1.3 Component layout

```
master-update / src
├── components/
│   ├── modals/
│   │   └── VoiceChatModal.tsx     ← Option A (UI + TTS)
│   └── chat/
│       └── InputArea.tsx          ← Option B (chat + mic)
├── hooks/
│   └── useSpeechRecognition.ts   ← Shared (speech → text)
├── stores/
│   └── voiceStore.ts              ← Option B (TTS state + startSpeaking)
└── services/
    └── ai/
        ├── geminiService.ts       ← Option B (model API)
        └── ThinkingEngine.ts      ← Option B (calls TTS on reply)
```

---

## 2. Roles (نقش هر جزء)

| # | File | Role (نقش) |
|---|------|------------|
| 1 | **VoiceChatModal.tsx** | Option A UI: mic, send user text to model, play model reply with browser TTS. Full voice conversation in one modal. |
| 2 | **useSpeechRecognition.ts** | Speech-to-text: turns microphone input into text. Used by both Option A and Option B. |
| 3 | **InputArea.tsx** | Option B UI: chat input, mic button, sends text to main app send handler (→ model). |
| 4 | **voiceStore.ts** | Option B: voice state (listening/speaking) and **TTS** (`startSpeaking(text)`). Makes the model "talk". |
| 5 | **geminiService.ts** | Option B: calls Gemini API; sends user message, returns model reply (streaming or full). |
| 6 | **ThinkingEngine.ts** | Option B: after model reply, calls `voiceStore.startSpeaking(reply)` so the reply is spoken. |

---

## 3. Operating orders — implementation (دستورات اجرایی)

### 3.1 Option A — Modal voice chat (۲ جزء)

**Operating order (دستور اجرایی):**

1. Open the app and open **Voice Chat** modal (e.g. from menu or ribbon).
2. Allow microphone when asked.
3. Choose language (e.g. fa-IR or en-US).
4. Press mic / start listening; speak.
5. When recognition is final, the modal sends text to the model and shows the reply.
6. The modal uses `speechSynthesis` to speak the reply (model talks).

**Implementation (پیاده‌سازی):**  
Use **VoiceChatModal.tsx** and **useSpeechRecognition.ts**. No need for voiceStore, ThinkingEngine, or main chat InputArea.

---

### 3.2 Option B — Main app voice + model talks (۵ جزء)

**Operating order (دستور اجرایی):**

1. User opens main app and focuses the **chat input** (InputArea).
2. User presses **mic** in InputArea; `useSpeechRecognition` turns speech into text.
3. User sends (or auto-send) the text; app calls **geminiService** (e.g. `streamChat`) with the message.
4. Model reply comes back; **ThinkingEngine** (or equivalent) receives the reply.
5. ThinkingEngine calls **voiceStore.startSpeaking(reply)** so the reply is played via TTS (model talks).

**Implementation (پیاده‌سازی):**

1. **InputArea:** render mic, wire to `useSpeechRecognition`, call `onSend(text)`.
2. **useSpeechRecognition:** set `lang`, `onResult`; start/stop listening.
3. **voiceStore:** provide `startSpeaking(text)` using `speechSynthesis`.
4. **geminiService:** implement `streamChat` (or equivalent) with API key and model.
5. **ThinkingEngine:** after receiving model reply, call `voiceStore.startSpeaking(reply)`.

---

### 3.3 Checklist (چک‌لیست اجرایی)

| Step | Action |
|------|--------|
| 1 | Ensure mic permission and HTTPS (or localhost) for Web Speech API. |
| 2 | For Option A: mount VoiceChatModal; pass API key (or read from storage). |
| 3 | For Option B: mount InputArea with onSend → geminiService; wire reply → ThinkingEngine → voiceStore.startSpeaking. |
| 4 | Set language (e.g. fa-IR) in recognition and TTS where needed. |

---

## 4. Summary

- **Architecture:** Two paths (A = modal, B = main app); one shared hook (useSpeechRecognition); Option B uses voiceStore + geminiService + ThinkingEngine for TTS.
- **Roles:** 6 files, each with a clear role (UI, STT, TTS, model, orchestration).
- **Operating orders:** Option A = open modal → speak → model answers and speaks; Option B = use InputArea mic → send → model reply → ThinkingEngine calls voiceStore.startSpeaking.

این فایل به‌صورت کامل معماری، نقش اجزا، و دستورات اجرایی را پوشش می‌دهد.

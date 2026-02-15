# API Stabilization + Safe Voice Wiring — Manual Verification

**Date:** 2025-02-15  
**MIGRATION NOTE:** API lifecycle stabilization and safe voice wiring. No STT changes, no InputArea/mic refactor.

## Scope

- API lifecycle state machine: `UNINITIALIZED` → `LOADING` → `READY` | `ERROR`
- First-message guard: show "Initializing AI service…" when `apiStatus !== "READY"`
- Chat reply → TTS when voice enabled and API READY
- Ribbon voice buttons (VCode, VChat) enabled only when `apiStatus === "READY"`
- VCode button opens Voice Conversation (VoiceChatModal)

## Manual Test Checklist

1. **Reload app**
   - [ ] App loads without error.
   - [ ] No console errors related to apiStatus or ThinkingEngine.

2. **First message (before API ready)**
   - [ ] Reload, then immediately send first message.
   - [ ] No "API not set" or raw error; user sees "Initializing AI service…" (or waits for validation then sends again).
   - [ ] After API validates, sending again works.

3. **API transitions**
   - [ ] With valid API key: status moves LOADING → READY (and validation message if any).
   - [ ] With invalid/missing key: status moves to ERROR; no crash.

4. **Reply received normally**
   - [ ] After READY, send a message; model reply appears in chat as before.
   - [ ] No duplicate messages, no mixed-language output from partial config.

5. **Reply auto-speaks (TTS)**
   - [ ] Enable voice output in settings (e.g. AI config / voice).
   - [ ] Send a message; when reply is received, it is spoken via TTS (if voiceEnabled and READY).
   - [ ] No change to message rendering or mic flow.

6. **Mic unchanged**
   - [ ] Microphone in chat input (web mode) still works.
   - [ ] STT behavior unchanged; no refactor to InputArea or useSpeechRecognition.

7. **VCode opens Voice Conversation**
   - [ ] Click VCode in ribbon (when READY).
   - [ ] Voice Chat modal opens (Voice Conversation AI).
   - [ ] No layout or style changes.

8. **Ribbon buttons enable after READY**
   - [ ] Before READY: VCode and VChat buttons disabled.
   - [ ] After READY: VCode and VChat buttons enabled.
   - [ ] No other ribbon layout/UI change.

9. **No UI regression**
   - [ ] Chat layout, input area, mic button, and styling unchanged.
   - [ ] No new voice engines or STT replacement.

## Backups

- `backup/api-stabilization-20250215/src/stores/appStore.tsx`
- `backup/api-stabilization-20250215/src/App.tsx`
- `backup/api-stabilization-20250215/src/components/ribbon/RibbonHomeTab.tsx`
- `backup/api-stabilization-20250215/src/components/layout/Ribbon.tsx`

## Files Touched

- `src/stores/appStore.tsx` — ApiStatus, apiStatus, setApiStatus, useApiStatus, useIsApiReady
- `src/stores/index.ts` — export ApiStatus, useApiStatus, useIsApiReady
- `src/App.tsx` — drive apiStatus (LOADING/READY/ERROR), send guard, TTS hook, isApiReady to Ribbon
- `src/components/ribbon/RibbonHomeTab.tsx` — isApiReady, VCode opens onOpenVoiceChat, voice buttons disabled when !isApiReady
- `src/components/layout/Ribbon.tsx` — isApiReady prop and pass-through

**Not modified:** InputArea, useSpeechRecognition, mic UI, chat layout, styling, unrelated TS files.

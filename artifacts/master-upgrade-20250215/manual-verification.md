# Manual verification — voice integration 20250215

## Checklist (to be performed by a human)

### Microphone permission
- [ ] Open app, open Voice Chat modal (or use mic in InputArea).
- [ ] When prompted, allow microphone access.
- [ ] Verify no console errors related to getUserMedia or permission.

### Speech recognition (STT)
- [ ] Start listening (mic button in Voice Chat modal or chat InputArea).
- [ ] Speak in selected language (fa-IR or en-US).
- [ ] Verify transcript appears (interim and/or final).
- [ ] Stop listening; verify state resets.

### Model reply → TTS
- [ ] Send a message that triggers a model reply (Voice Chat modal or main chat).
- [ ] Verify model reply is spoken when TTS is enabled (if wired in your build).
- [ ] Verify no crash when `speechSynthesis` is unavailable (e.g. in headless or restricted env).

### UI / no regression
- [ ] Voice Chat modal: layout, AIAvatar, buttons, and styling unchanged.
- [ ] No flicker or layout shift when opening/closing modal or toggling mic.
- [ ] InputArea: mic button and chat layout unchanged.
- [ ] No visual regression in ribbon or anywhere the voice trigger appears.

### Fallback / safety
- [ ] With voice disabled or unsupported: no runtime errors.
- [ ] TTS does not crash if speech API unavailable (guard in VoiceChatModal.speak and voiceStore.startSpeaking).

## Wiring note
- **VoiceChatModal**: Uses local `speak()` with `synthRef`; TTS guarded.
- **Main app / Option B**: To have model replies spoken, call `useVoiceStore.getState().startSpeaking(reply)` or `thinkingEngine.speak(reply)` from the place where the model reply is received (e.g. stream completion or conversation store). This wiring was not changed in this merge to avoid touching chat flow; add when desired.

## Result (fill after verification)
- Date: _______________
- Verified by: _______________
- UI regression: none / minor / documented
- Notes: _______________

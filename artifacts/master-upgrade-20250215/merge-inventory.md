# Master-Upgrade Merge Inventory

**Date:** 20250215  
**Source folder:** `master-update/` (improved voice components)  
**Target:** `src/`

| source_file                                            | target_file                              | status                | action_required                                                                                                                       |
| ------------------------------------------------------ | ---------------------------------------- | --------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| master-update/src/components/modals/VoiceChatModal.tsx | src/components/modals/VoiceChatModal.tsx | modified              | Keep existing UI (AIAvatar, emotion). Integrate logic-only improvements if any (e.g. TTS cancel safety). Backup target first.         |
| master-update/src/hooks/useSpeechRecognition.ts        | src/hooks/useSpeechRecognition.tsx       | modified              | Merge logic improvements (getUserMedia before start, error handling). Preserve API for VoiceChatModal/InputArea. Backup target first. |
| master-update/src/components/chat/InputArea.tsx        | src/components/chat/InputArea.tsx        | conflict-risk         | No merge. Existing InputArea is larger, already uses useSpeechRecognition. Keep existing. Backup only for safety.                     |
| master-update/src/stores/voiceStore.ts                 | src/stores/voiceStore.ts                 | missing               | Add new file. Fix imports to use existing src/services/speechRecognitionService and VoskRendererService.                              |
| master-update/src/services/ai/geminiService.ts         | src/services/ai/geminiService.ts         | conflict-risk         | Do not merge. Existing geminiService is full production (4000+ lines). Document as reference only.                                    |
| master-update/src/services/ai/ThinkingEngine.ts        | src/services/ai/ThinkingEngine.ts        | missing               | Add after voiceStore. Depends on thinkingStore—add minimal stub or optional dependency.                                               |
| master-update/ARCHITECTURE_ROLES_OPERATING_ORDERS.md   | documentation / project root             | improvement-candidate | Copy to artifacts; update project ARCHITECTURE section with "Known Issues" as required.                                               |

## Backup paths (before any edit)

- backup/voice-backups/src/components/modals/VoiceChatModal.tsx-20250215
- backup/voice-backups/src/components/chat/InputArea.tsx-20250215
- backup/voice-backups/src/hooks/useSpeechRecognition.tsx-20250215
- (voiceStore.ts and ThinkingEngine.ts do not exist in target; no backup needed for them)
- (geminiService.ts not modified; backup optional)

## Additional voice-related dependencies (detected)

- src/services/speechRecognitionService.ts (existing; used by voiceStore)
- src/services/VoskRendererService.ts (existing; used by voiceStore)
- src/hooks/voice/useSpeechRecognition.tsx (different API; used by index export; do not replace)
- thinkingStore: does not exist in src; required by ThinkingEngine → add stub or simplify ThinkingEngine

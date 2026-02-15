# G-Studio v2.0 Implementation Guide (from ------------------------------------------------------- folder)

## 🎯 Overview

This is the implementation guide for the refactored v2.0 files placed from the `-------------------------------------------------------` folder.

## 📍 File Placement Summary

| Source (-------------------------------------------------------) | Destination |
|------------------------------------------------------------------|-------------|
| ai.ts, conversation.ts, core.ts | src/types/ |
| EventBus.ts, errors.ts, errorHandler.ts | src/utils/ |
| GeminiClient.ts, RetryPolicy.ts, CircuitBreaker.ts, CacheManager.ts, types.ts | src/services/ai/gemini/ |
| RetryPolicy.test.ts | src/services/ai/gemini/__tests__/ |
| appStore.ts, conversationStore.ts | src/stores/ |
| useVisibilityAwareInterval.ts | src/hooks/ |
| setup.ts | src/test/ |
| ErrorBoundary.tsx, LoadingScreen.tsx | src/components/ |
| ChatView.tsx, MessageList.tsx, MessageInput.tsx (created) | src/components/chat/ |
| ConversationSidebar.tsx | src/components/conversation/ |
| CodeEditor.tsx, EditorView.tsx | src/components/editor/ |
| Header.tsx, SplitView.tsx | src/components/layout/ |
| SettingsModal.tsx | src/components/modals/ |
| App.tsx, main.tsx, App.css, index.css | src/ |

## ✅ Completeness

- **MessageInput** was missing from the folder; a minimal component was added at `src/components/chat/MessageInput.tsx` so ChatView works.
- **SplitView** import was updated from `../sidebar/ConversationSidebar` to `../conversation/ConversationSidebar` to match project structure.
- **types/index.ts** was updated to export `./ai`.
- **utils/index.ts** was updated to export EventBus, errors, and the new errorHandler (v2.0 singleton).

## 🔧 Using the v2.0 Entry

The project entry is currently `/index.tsx`. To use the v2.0 entry point (`src/main.tsx`), either:

1. Update `index.html` to use `<script type="module" src="/src/main.tsx"></script>`, or  
2. Keep the current entry and import the new components/stores where needed.

Backups of overwritten files are in `temp/placement_backup_20250207/`.

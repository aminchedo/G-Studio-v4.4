# G-Studio v2.0 - Refactored (from ------------------------------------------------------- folder)

A production-ready, AI-powered development studio with voice control and multi-agent architecture.

## 🎯 What's New in v2.0

### Fixed Critical Issues
- ✅ **Conversation Store Infinite Loop** - Replaced Map with Record to fix serialization issues
- ✅ **Aggressive Polling** - Implemented event-driven architecture with EventBus
- ✅ **Monolithic Services** - Refactored Gemini service into modular components
- ✅ **Poor Error Handling** - Comprehensive error handling with typed errors
- ✅ **TypeScript Strict Mode** - Enabled with 95%+ type safety

### Architecture (see IMPLEMENTATION_GUIDE_V2.md for full structure)

- **Types**: `src/types/` — ai.ts, conversation.ts, core.ts
- **Utils**: `src/utils/` — EventBus.ts, errors.ts, errorHandler.ts
- **Services**: `src/services/ai/gemini/` — GeminiClient, RetryPolicy, CircuitBreaker, CacheManager, types
- **Stores**: `src/stores/` — appStore.ts, conversationStore.ts
- **Components**: `src/components/` — ErrorBoundary, LoadingScreen, chat/, conversation/, editor/, layout/, modals/
- **Entry**: `src/main.tsx`, `src/App.tsx`, `src/App.css`, `src/index.css`

Files from the `-------------------------------------------------------` folder have been placed in these locations per the help file (README.md / IMPLEMENTATION_GUIDE.md).

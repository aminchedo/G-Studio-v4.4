# Phase 1 – Structural & TypeScript Repair Summary

**Status:** In progress / continued  
**Rule:** No dependencies installed. Fix paths, exports, and structure only.

## Completed Fixes

### 1. Import path casing
- **src/App.tsx:** `./components/layout/SplitView` → `./components/layout/splitView` (match actual filename).
- **src/components/preview/index.ts:** `./SplitView` → `./splitView`.

### 2. Missing module paths
- **theme/themeSystem:** In `EnhancedInputArea`, `VirtualizedMessageList`, `EnhancedFileTree`, `OnboardingSystem`: `../theme/themeSystem` → `../../theme/themeSystem` (or `@/theme/themeSystem` where applicable).
- **StreamingStatus:** `../services/streamingMonitor` → `../../services/monitoring/streamingMonitor`.
- **geminiServiceOptimized:** `./requestCoalescer` → `../network/requestCoalescer`.
- **geminiServiceOptimized:** `../../constants` → `@/config/constants`.
- **useNetworkStatus:** `./EventBus` → `@/utils/EventBus`.
- **useConversation:** `@stores/conversationStore` → `@/stores/conversationStore`.
- **useAgentConfig:** `@services/security/secureStorage` → `@/services/security/secureStorage`.
- **RibbonSettingsTab, CustomProviderModal, ProvidersTab, test-local-model:** `@services/...` → `@/services/...`.
- **useEditorHandlers:** `@components/ui/NotificationToast` → `@/components/ui/NotificationToast`.

### 3. AISettingsHub & features
- **AISettingsHub.tsx:** `../AISettingsHub/...` → `./AISettingsHub/...` (tabs live under `features/ai/AISettingsHub/`).
- **EnhancedSettingsPanel:** `../AISettingsHub/types` → `./AISettingsHub/types`.
- **CodeIntelligenceDashboard:** `../layout/ProjectTree` → `@/components/layout/ProjectTree`.
- **PreviewPane:** `../EmptyFilePreview` → `@/components/panels/EmptyFilePreview`.
- **ErrorHistoryPanel:** `./ErrorDisplay` → `../ui/ErrorDisplay`.

### 4. Barrel exports & re-exports
- **EditorTabs:** `export interface EditorTabsProps` in `editor/EditorTabs.tsx`.
- **InspectorPanel:** `export interface InspectorPanelProps` in `panels/InspectorPanel.tsx`.
- **InputArea:** `export interface InputAreaProps` in `chat/InputArea.tsx`.
- **BottomPanel:** Added `export interface BottomPanelProps` and typed component in `layout/BottomPanel.tsx`.
- **MessageList:** `export interface MessageListProps` in `chat/MessageList.tsx`.
- **Sidebar:** `export interface SidebarProps` in `layout/Sidebar.tsx`.
- **file-tree/index:** `export { FileTreeVirtualized }` → `export { default as FileTreeVirtualized } from './FileTreeVirtualized';`
- **SpeechContext:** Exported as alias in `hooks/voice/useSpeechRecognition.tsx`: `export { SpeechRecognitionContext as SpeechContext };`

### 5. Root index
- **src/index.ts:** `./conversationStore` / `./appStore` → `./stores/conversationStore` and `./stores/appStore`.

### 6. Runtime / DOM warnings
- **&lt;style jsx&gt;:** Removed invalid `jsx` prop from `<style>` in **App.tsx** and **ProgressIndicators.tsx** to fix React warning: “Received \`true\` for a non-boolean attribute \`jsx\`”. Replaced with plain `<style>{`...`}`.

### 7. TypeScript duplicate identifier
- **Ribbon.tsx:** Removed duplicate `onTogglePreview?: () => void` from `RibbonProps` interface (was declared twice).

### 8. Barrel exports (UI)
- **components/ui/index.ts:** Re-exported **ErrorBoundary**, **ErrorDisplay**, **NotificationToast** (and showSuccess, showError, showWarning, showInfo, notificationManager), and **Icons** so `@/components/ui` can be used as a single entry for these components.
- **NotificationToast.tsx:** Exported **NotificationToastProps** for the barrel.

### 9. Vite / ImportMeta.env types
- **src/vite-env.d.ts:** Added declaration file with `/// <reference types="vite/client" />` and custom `ImportMetaEnv` / `ImportMeta` so `import.meta.env` (DEV, PROD, VITE_*, etc.) is typed and no longer causes "Property 'env' does not exist on type 'ImportMeta'".

## Left for Phase 2 (dependency / runtime)

- Install deps: `npm install --legacy-peer-deps`.
- Type declarations: e.g. `react-syntax-highlighter`, `react-window`, `d3` (or add `.d.ts` stubs if needed).
- `react-window` API: `VariableSizeList`, `ListChildComponentProps` may differ by version; fix after install.
- Types from `@/types/types` or `@/types/core`: `AIConfig`, `ExtendedMessage`, `McpToolResult`, etc. – add or re-export in the right type modules.
- `ImportMeta.env` (Vite): ensure `vite-env.d.ts` or similar is present and included in `tsconfig`.
- Any remaining prop/type mismatches (e.g. `exactOptionalPropertyTypes`) after dependencies and types are fixed.

## Phase 1 completion criteria

- [x] All import paths resolve (no “Cannot find module” for in-repo paths).
- [x] Barrel/index exports match actual exports (no “has no exported member” for fixed barrels).
- [ ] Remaining TS errors are only dependency-related or type-augmentation (Phase 2).
- [ ] No feature code removed; no fixes by deleting or commenting out logic.

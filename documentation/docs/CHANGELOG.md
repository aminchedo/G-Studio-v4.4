# G Studio Changelog

## v2.3.0 (Current)

### 🏗️ Architecture Overhaul

#### New Modular Layout System (`src/components/layout/`)
- **MainLayout.tsx** - Primary application shell with panel management
- **EditorLayout.tsx** - Code editor area with tabs, split view, and preview
- **ChatLayout.tsx** - AI chat panel with messages, model selector, and input
- **ModalManager.tsx** - Centralized modal management with lazy loading

#### Centralized State Management (`src/stores/`)
- **appStore.ts** - Main application state using Zustand
  - UIState: Panel visibility, theme, split orientation
  - ModalState: All modal open/close states
  - AIConfigState: Model selection, API settings
  - ToolState: Tool execution history
  - CodeMetricsState: Code quality metrics
- **Selectors** for optimized re-renders

#### New UI Primitives (`src/components/ui/`)
- **Button** - Variants: primary, secondary, danger, ghost
- **Input** - With labels, error states, icons
- **Badge** - Status indicators with color variants
- **Tooltip** - Hover tooltips with positioning
- **Card** - Container components
- **Spinner, Avatar, Divider, Skeleton** - Common UI elements

#### Modular Service Architecture (`src/services/`)

**Gemini Service (`src/services/gemini/`)**
- `types.ts` - Type definitions
- `apiClient.ts` - RobustAPIClient with retry logic
- `errorHandler.ts` - Error categorization and recovery
- `streamProcessor.ts` - Streaming response handling
- `index.ts` - Module exports

**MCP Service (`src/services/mcp/`)**
- `types.ts` - Type definitions for all tools
- `fileOperations.ts` - File manipulation tools
- `index.ts` - Tool registry and execution

### 🎨 Enhanced UI & UX

#### Dynamic Theming System (`src/theme/`)
- **Design tokens** - Colors, spacing, typography, shadows
- **Dark/Light/Auto themes** - System preference detection
- **High contrast mode** - WCAG accessibility
- **Custom accent colors** - Personalization
- **CSS variables** - Runtime theme switching

#### Virtualized Components
- **VirtualizedMessageList** - Smooth scrolling for large chat histories
- **EnhancedFileTree** - Drag-and-drop file management with virtualization

#### Enhanced Input Area
- **AI-powered suggestions** - Smart completions as you type
- **Quick commands** - Type "/" for actions like /create, /fix, /analyze
- **Voice input** - Microphone with listening indicator
- **File attachments** - Drag-and-drop or click to attach
- **Character counter** - Visual feedback for long messages

### ⌨️ Keyboard Shortcuts System (`src/features/keyboard/`)
- **40+ default shortcuts** - For all common actions
- **Customizable bindings** - Remap any shortcut
- **Context-aware** - Different shortcuts for editor, chat, modals
- **Shortcut discovery** - Press Ctrl+Shift+P for command palette
- **Conflict detection** - Warns about duplicate bindings

### 📚 User Onboarding (`src/features/onboarding/`)
- **Welcome tour** - 8-step introduction for new users
- **Feature highlights** - Spotlight effect on UI elements
- **Interactive tutorials** - Step-by-step guidance
- **Contextual help** - Tooltips and hints throughout
- **Progress tracking** - Remember completed tours

### ♿ Accessibility (WCAG 2.1 AA Compliance)

#### New Utilities (`src/components/ui/accessibility.tsx`)
- **ScreenReaderOnly** - Visually hidden text for assistive tech
- **LiveRegion** - Dynamic announcements to screen readers
- **SkipLink** - Skip navigation for keyboard users
- **FocusTrap** - Modal focus management

#### Hooks
- **useKeyboardNavigation** - Arrow key handlers
- **useRovingTabIndex** - Complex widget navigation
- **useReducedMotion** - Respect motion preferences
- **useHighContrast** - High contrast mode support

#### Features
- Full keyboard navigation support
- Screen reader compatibility
- Focus management in modals
- ARIA attributes throughout
- `announce()` function for programmatic announcements

### ⚡ Performance Optimizations

#### Removed Duplicates (~12,700 lines)
- Consolidated 4 Gemini tester variants → 1 modular system
- Consolidated 3 PreviewPanel variants → 1 configurable component
- Merged duplicate speech recognition hooks
- Removed duplicate scripts (.js when .cjs exists)

#### Code Cleanup
- Removed 38 development documentation files
- Cleaned up unused imports
- Fixed import paths

#### Lazy Loading
- All modal components load on-demand
- Large dashboard components deferred
- Code intelligence dashboard lazy loaded

#### Memoization
- `React.memo` for pure components
- `useMemo` for expensive computations
- `useCallback` for stable function references

### 📁 New File Structure

```
src/
├── components/
│   ├── layout/          # MainLayout, EditorLayout, ChatLayout, ModalManager
│   ├── ui/              # Primitives + Accessibility utilities
│   ├── chat/            # VirtualizedMessageList, EnhancedInputArea
│   └── sidebar/         # EnhancedFileTree
├── features/
│   ├── keyboard/        # Keyboard shortcuts system
│   └── onboarding/      # User onboarding tours
├── stores/              # Zustand stores (appStore, etc.)
├── services/
│   ├── gemini/          # Modular Gemini API client
│   └── mcp/             # Modular MCP tool service
├── theme/               # Dynamic theming system
└── index.ts             # Main exports
```

### 📊 Metrics

| Metric | Before | After | Change |
|--------|--------|-------|--------|
| TypeScript LOC | 122,813 | ~105,000 | -14.5% |
| Documentation files | 57 | 19 | -67% |
| New modular files | 0 | 50+ | +50 files |
| Accessibility | Partial | WCAG 2.1 AA | ✅ |
| Theming | Basic | Full system | ✅ |
| Keyboard shortcuts | Limited | 40+ | ✅ |
| Onboarding | None | Full tours | ✅ |

---

## v2.2.0

- Redesigned AI Settings Hub with 7 tabs
- Full SVG icon library (no external dependencies)
- Complete voice input/output controls
- LM Studio integration with connection testing
- Per-agent model assignment
- Model discovery and benchmarking
- Dark theme UI throughout

## v2.1.0

- Added API Test tab
- Bilingual support
- LM Studio basic integration

## v2.0.0

- Initial AI Settings Hub
- Multi-agent system
- Ribbon toolbar

## v1.0.0

- Initial release
- Basic chat interface
- Monaco editor integration
- File management

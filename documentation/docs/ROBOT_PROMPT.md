# 🤖 Coding Robot Prompt - G-Studio UI Fix

## Task: Fix Non-Functional UI Buttons in G-Studio React App

### Context
React/TypeScript IDE with non-functional buttons. Handlers are optional/undefined in `App.tsx` and `Ribbon.tsx`.

### Requirements

**Create `hooks/useEditorHandlers.ts`:**
- Custom hook returning 11 handlers + state
- Handlers: `handleGoToLine`, `handleToggleWordWrap`, `handleRunCode`, `handleSearchFiles`, `handleDuplicateFile`, `handleCopyFilePath`, `handleFind`, `handleUndo`, `handleRedo`, `handleClearEditor`, `handleRefresh`
- State: `wordWrapEnabled` (boolean), `canUndo` (boolean), `canRedo` (boolean)
- History management: 50-state undo/redo using `useState` with `{past, present, future}` structure
- Auto-save files to localStorage on change (debounced 500ms)
- All notifications in Persian using `showSuccess`, `showError`, `showWarning`, `showInfo`
- Custom events for Monaco: `gstudio:gotoLine`, `gstudio:wordWrap`, `gstudio:find`, `gstudio:runCode`
- Props interface: `files`, `setFiles`, `activeFile`, `setActiveFile`, `openFiles`, `setOpenFiles`, `setPreviewVisible`, `setPromptDialog`, `setConfirmDialog`

**Handler Implementations:**
1. **handleGoToLine**: Prompt for line number, validate, emit `gstudio:gotoLine` event
2. **handleToggleWordWrap**: Toggle state, save to localStorage, emit `gstudio:wordWrap` event
3. **handleRunCode**: Check file type (js/ts/jsx/tsx/html), show preview, emit `gstudio:runCode` event
4. **handleSearchFiles**: Prompt for query, search in filenames and content, open first result
5. **handleDuplicateFile**: Copy active file with `_copy` suffix, handle duplicates with counter
6. **handleCopyFilePath**: Copy active file path to clipboard
7. **handleFind**: Prompt for query, search in active file, show match count, emit `gstudio:find` event
8. **handleUndo**: Pop from history.past, push to history.future, update files
9. **handleRedo**: Pop from history.future, push to history.past, update files
10. **handleClearEditor**: Confirm dialog, clear all files/state
11. **handleRefresh**: Load files from localStorage

**Update `App.tsx`:**
```typescript
import { useEditorHandlers } from './hooks/useEditorHandlers';

const handlers = useEditorHandlers({
  files, setFiles, activeFile, setActiveFile,
  openFiles, setOpenFiles, setPreviewVisible,
  setPromptDialog, setConfirmDialog
});

<Ribbon {...handlers} />
<CodeEditor wordWrap={handlers.wordWrapEnabled} />
```

**Update `Ribbon.tsx` interface:**
- Change all handler props from optional (`?`) to required
- Add: `onGoToLine`, `onToggleWordWrap`, `onRunCode`, `onSearchFiles`, `onDuplicateFile`, `onCopyFilePath`, `onFind`, `onUndo`, `onRedo`, `onClearEditor`, `onRefresh`

**Update `CodeEditor.tsx`:**
- Add `wordWrap?: boolean` prop
- Add event listeners for: `gstudio:gotoLine`, `gstudio:wordWrap`, `gstudio:find`
- Implement Monaco actions: `revealLineInCenter`, `setPosition`, `updateOptions`, `trigger('actions.find')`

**Update `PreviewPanel.tsx`:**
- Add event listener for `gstudio:runCode`
- Update preview content on event

### Code Style
- TypeScript strict mode
- Functional components with hooks
- useCallback for all handlers
- Persian strings for user messages
- 2-space indentation
- No console.log (use notification system)

### Output
Complete, production-ready code for all 5 files.

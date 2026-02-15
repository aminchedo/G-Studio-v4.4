# 🎯 CURSOR PROMPT - FIX REMAINING IMPORTS

## Task: Automatically Fix All Import Paths

All critical UI components have been copied to the project. Now we need to fix any remaining import paths to match the new folder structure.

## Current Folder Structure

```
src/components/
├── layout/          - Ribbon, Sidebar, RightActivityBar, ProjectTree
├── chat/            - MessageList, InputArea, StreamingStatus
├── editor/          - CodeEditor, EditorTabs
├── modals/          - SettingsModal, AgentModal, McpToolModal, ConfirmDialog, PromptDialog
├── panels/          - InspectorPanel, MonitorPanel, SystemStatusPanel, ExplainabilityPanel
├── preview/         - PreviewPanel, PreviewPanelEnhanced
├── ai/              - AgentCollaboration, AgentSelector, MultiAgentStatus, SpeechTest, etc.
├── ui/              - ErrorBoundary, NotificationToast
├── ribbon/          - All ribbon tab components and modals
├── AISettingsHub/   - All AI settings tabs
├── features/        - Feature components
└── (root)           - icons.tsx, CodeIntelligenceDashboard, etc.
```

## Import Pattern Rules

### 1. Component Imports
All component imports should use the `@/components/` alias pattern based on their location:

```typescript
// Chat components
import { MessageList } from '@/components/chat/MessageList';
import { InputArea } from '@/components/chat/InputArea';

// Layout components
import { Ribbon } from '@/components/layout/Ribbon';
import { Sidebar } from '@/components/layout/Sidebar';
import { RightActivityBar } from '@/components/layout/RightActivityBar';

// Editor components
import { CodeEditor } from '@/components/editor/CodeEditor';
import { EditorTabs } from '@/components/editor/EditorTabs';

// Modals
import { SettingsModal } from '@/components/modals/SettingsModal';
import { AgentModal } from '@/components/modals/AgentModal';
import { ConfirmDialog } from '@/components/modals/ConfirmDialog';

// Panels
import { InspectorPanel } from '@/components/panels/InspectorPanel';
import { MonitorPanel } from '@/components/panels/MonitorPanel';

// Preview
import { PreviewPanel } from '@/components/preview/PreviewPanel';

// AI components
import { AgentCollaboration } from '@/components/ai/AgentCollaboration';
import { SpeechTest } from '@/components/ai/SpeechTest';

// UI components
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { NotificationToast } from '@/components/ui/NotificationToast';

// Root components
import { icons } from '@/components/icons';
import { AISettingsHub } from '@/components/AISettingsHub';

// Ribbon
import { RibbonHomeTab } from '@/components/ribbon/RibbonHomeTab';
```

### 2. Infrastructure Imports
```typescript
// Types
import { Type } from '@/types';
import { SpecificType } from '@/types/specific';

// Constants
import { CONSTANT } from '@/constants';

// Config
import { config } from '@/config';

// Hooks
import { useHook } from '@/hooks/hookName';

// Services
import { ServiceName } from '@/services/serviceName';

// Utils
import { utilFunction } from '@/utils/utilName';

// Contexts
import { Context } from '@/contexts/ContextName';

// LLM
import { LLMComponent } from '@/llm/componentName';
```

## Task Instructions for Cursor

1. **Scan all TypeScript files** in `src/components/` (recursively)

2. **Identify import statements** that use relative paths like:
   - `from '../Component'`
   - `from './Component'`
   - `from '../../Component'`

3. **Convert to absolute @ paths** based on the folder structure above

4. **Fix imports in the following order:**
   - Components in subdirectories (chat, editor, modals, etc.)
   - Components in ribbon folder
   - Components in AISettingsHub folder
   - Root component imports
   - Infrastructure imports (types, hooks, services, etc.)

5. **Verify TypeScript compilation** after changes:
   ```bash
   npx tsc --noEmit
   ```

6. **Report any remaining errors** that aren't import-related

## Example Transformation

**Before:**
```typescript
// In src/components/layout/Ribbon.tsx
import { RibbonHomeTab } from './ribbon/RibbonHomeTab';
import { MessageList } from '../MessageList';
import { SettingsModal } from '../SettingsModal';
import { Type } from '../../types';
```

**After:**
```typescript
// In src/components/layout/Ribbon.tsx
import { RibbonHomeTab } from '@/components/ribbon/RibbonHomeTab';
import { MessageList } from '@/components/chat/MessageList';
import { SettingsModal } from '@/components/modals/SettingsModal';
import { Type } from '@/types';
```

## Common Import Patterns to Fix

Replace these patterns:
- `from '../Sidebar'` → `from '@/components/layout/Sidebar'`
- `from './icons'` → `from '@/components/icons'`
- `from '../MessageList'` → `from '@/components/chat/MessageList'`
- `from '../CodeEditor'` → `from '@/components/editor/CodeEditor'`
- `from '../InspectorPanel'` → `from '@/components/panels/InspectorPanel'`
- `from '../SettingsModal'` → `from '@/components/modals/SettingsModal'`
- `from '../../types'` → `from '@/types'`
- `from '../../hooks/'` → `from '@/hooks/'`
- `from '../../services/'` → `from '@/services/'`

## Expected Outcome

After running this fix:
- ✅ All imports use `@/` alias pattern
- ✅ No relative `../` or `./` imports for cross-folder references
- ✅ TypeScript compilation succeeds with no import errors
- ✅ All components can resolve their dependencies

## Verification

After fixing, run:
```bash
npx tsc --noEmit
```

Should see: ✅ NO ERRORS

## Notes

- The `@/` alias is configured in `tsconfig.json` to point to `src/`
- This is a standard pattern for clean imports in React/TypeScript projects
- Relative imports within the same folder (like `./ComponentInSameFolder`) are fine
- The goal is to eliminate confusing `../../` chains and make imports clear

---

**Cursor: Please execute this import fix automatically across all component files.**

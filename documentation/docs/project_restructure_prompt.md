# Project Restructure Task

## ⚠️ CRITICAL REQUIREMENTS - READ FIRST ⚠️

### 1. BACKUP REQUIREMENT (MANDATORY)
**BEFORE MAKING ANY CHANGES:**
```bash
# Create a complete backup of the project
cp -r project-folder project-folder-backup-$(date +%Y%m%d-%H%M%S)
# Or on Windows
xcopy project-folder project-folder-backup /E /I /H /Y
```
**DO NOT PROCEED WITHOUT A BACKUP!**

### 2. PRESERVE ALL FUNCTIONALITY
- **Zero functionality loss**: Every feature must work exactly as before
- **Zero code deletion**: Do not delete any code - only move and reorganize
- **Update ALL import paths**: Every import statement must be updated to reflect new locations
- **Maintain all relationships**: Component dependencies must remain intact
- **Test after migration**: Verify the application runs without errors

### 3. PATH UPDATE STRATEGY
- Scan ALL TypeScript/TSX files for import statements
- Update relative imports (`../`, `./`) to match new structure
- Update absolute imports if using path aliases
- Check for dynamic imports and require() statements
- Update any configuration that references file paths

## Objective
Analyze the current project structure and reorganize it into a proper, standardized architecture. Move all misplaced files from the project root into the appropriate locations within the `src` directory, ensuring consistency with existing component and folder organization.

## Current Issues

The project currently has several structural problems:

1. **Root-level clutter**: Many TypeScript/TSX files are located at the project root that should be inside `src/`
2. **Inconsistent organization**: There are duplicate component folders - one at root level (`/components`) and another inside src (`/src/components`)
3. **Configuration files scattered**: Config files like `config.ts`, `constants.ts`, `types.ts` are at root instead of in `src/`
4. **Mixed concerns**: Utility files, error handlers, and runtime stubs are not properly organized

## Files That Need to Be Moved to `src/`

Based on the attached project structure, move these files from root to `src/`:

### Core Application Files
- `index.tsx` → `src/index.tsx`
- `config.ts` → `src/config/config.ts` (create config folder)
- `constants.ts` → `src/config/constants.ts`
- `types.ts` → `src/types/types.ts` (merge with existing types)
- `uiPatterns.ts` → `src/types/uiPatterns.ts`

### Error Handling
- `error-handler-global.ts` → `src/services/error-handler-global.ts`

### Runtime Files
- `runtime-browser-stub.ts` → `src/runtime/browser-stub.ts` (create runtime folder)

## Root `/components` Folder - COMPLETE STRUCTURE

The root `/components` folder contains the following subfolders that need to be analyzed and migrated:

```
/components/
├── ai/
│   ├── AgentCollaboration.tsx
│   ├── AgentReasoning.tsx
│   ├── AgentSelector.tsx
│   ├── AISettingsHub.tsx
│   ├── AutonomousModeControl.tsx
│   ├── EnhancedSettingsPanel.tsx
│   ├── LocalAISettings.tsx
│   ├── McpConnectionStatus.tsx
│   ├── MultiAgentStatus.tsx
│   └── SpeechTest.tsx
├── AISettingsHub/
│   ├── APITestTab.tsx
│   ├── BehaviorTab.tsx
│   ├── ConnectionTab.tsx
│   ├── CustomProviderModal.tsx
│   ├── index.ts
│   ├── LocalAITab.tsx
│   ├── ModelsTab.tsx
│   ├── ProvidersTab.tsx
│   ├── types.ts
│   ├── VoiceInputTab.tsx
│   └── VoiceOutputTab.tsx
├── app/
│   ├── App.tsx
│   ├── App.txt
│   ├── AppNew.tsx
│   ├── AppProvider.tsx
│   └── index.ts
├── chat/
│   ├── ConversationBranching.tsx
│   ├── InputArea.tsx
│   ├── MessageList.tsx
│   └── StreamingStatus.tsx
├── code-intelligence/
│   ├── CodeIntelligenceDashboard.tsx
│   ├── CodeIntelligenceImpactMap.tsx
│   ├── CodeIntelligenceSettings.tsx
│   ├── CodeIntelligenceTimeline.tsx
│   ├── CodeNavigation.tsx
│   ├── DependencyGraph.tsx
│   ├── ImpactHeatmap.tsx
│   └── RefactoringSuggestions.tsx
├── common/
│   ├── AccessibilityChecker.tsx
│   ├── ErrorBoundary.tsx
│   ├── ErrorDisplay.tsx
│   ├── HelpSystem.tsx
│   ├── Icons.tsx
│   ├── KeyboardShortcuts.tsx
│   ├── NotificationToast.tsx
│   └── ProgressIndicators.tsx
├── editor/
│   ├── CodeEditor.tsx
│   ├── CSSLiveEditor.tsx
│   ├── DiffViewer.tsx
│   └── EditorTabs.tsx
├── features/
│   └── PreviewPane.tsx
├── file-tree/
│   ├── FileTreeTypes.ts
│   ├── FileTreeVirtualized.tsx
│   └── index.ts
├── gemini-tester/
│   ├── GeminiTesterConfig.ts
│   ├── GeminiTesterConfigPanel.tsx
│   ├── GeminiTesterContext.tsx
│   ├── GeminiTesterControls.tsx
│   ├── GeminiTesterCore.tsx
│   ├── GeminiTesterResults.tsx
│   ├── GeminiTesterService.ts
│   ├── GeminiTesterTypes.ts
│   ├── GeminiTesterUI.tsx
│   ├── GeminiTesterUtils.ts
│   └── index.tsx
├── layout/
│   ├── FileTree.tsx
│   ├── ProjectTree.tsx
│   ├── Ribbon.tsx
│   ├── RightActivityBar.tsx
│   ├── ScreenshotTools.tsx
│   ├── Sidebar.tsx
│   └── UserOnboarding.tsx
├── message-list/
│   ├── index.ts
│   ├── MessageItem.tsx
│   ├── MessageListVirtualized.tsx
│   ├── MessageTypes.ts
│   └── ToolLog.tsx
├── modals/
│   ├── AgentModal.tsx
│   ├── CommandPalette.tsx
│   ├── ConfirmDialog.tsx
│   ├── McpToolModal.tsx
│   ├── PromptDialog.tsx
│   ├── SettingsModal.tsx
│   └── VoiceChatModal.tsx
├── monitoring/
│   └── (needs analysis - may be empty or contain files)
├── panels/
│   ├── CodeMetricsPanel.tsx
│   ├── EmptyFilePreview.tsx
│   ├── EnhancedErrorDisplay.tsx
│   ├── ErrorHistoryPanel.tsx
│   ├── ExplainabilityPanel.tsx
│   ├── InspectorPanel.tsx
│   ├── LocalAITestPanel.tsx
│   ├── MonitorPanel.tsx
│   ├── PerformanceMetrics.tsx
│   ├── PreviewPanel.tsx
│   ├── RuntimeUIVerificationPanel.tsx
│   ├── SystemStatusDashboard.tsx
│   └── SystemStatusPanel.tsx
└── ribbon/
    ├── AISettingsTab.tsx
    ├── CodeMetricsModal.tsx
    ├── ProjectStructureModal.tsx
    ├── RibbonComponents.tsx
    └── RibbonHomeTab.tsx
```

**CRITICAL**: All these folders and files exist at `/components/` in the project root and need to be properly migrated to work with the existing `src/components/` structure.

### Strategy:
1. **Analyze both component folders** to identify duplicates and conflicts
2. **Merge duplicates** by keeping the most recent/complete version
3. **Organize by feature domain** rather than technical type
4. **Create proper index files** for each component folder

### Component Categories to Organize:

#### AI & Agent Components (root `/components/ai/`)
Move to: `src/features/ai/` or merge with existing `src/features/ai/`
- AgentCollaboration.tsx
- AgentReasoning.tsx
- AgentSelector.tsx
- AISettingsHub.tsx
- AutonomousModeControl.tsx
- EnhancedSettingsPanel.tsx
- LocalAISettings.tsx
- McpConnectionStatus.tsx
- MultiAgentStatus.tsx
- SpeechTest.tsx

#### Chat Components (root `/components/chat/`)
Merge with: `src/components/chat/`
- ConversationBranching.tsx → Keep most recent version
- InputArea.tsx → Compare with EnhancedInputArea.tsx
- MessageList.tsx → Compare with VirtualizedMessageList.tsx
- StreamingStatus.tsx

#### Code Intelligence Components (root `/components/code-intelligence/`)
Move to: `src/features/code-intelligence/`
- All code intelligence dashboard, settings, navigation components

#### Editor Components (root `/components/editor/`)
Move to: `src/components/editor/` or `src/features/editor/`
- CodeEditor.tsx
- CSSLiveEditor.tsx
- DiffViewer.tsx
- EditorTabs.tsx

#### Layout Components (root `/components/layout/`)
Merge with: `src/components/layout/`
- Ensure no duplicate MainLayout, ChatLayout, etc.

## Folder Structure Goals

After restructuring, the project should follow this structure:

```
project-root/
├── src/
│   ├── components/        # Shared/reusable UI components
│   │   ├── chat/
│   │   ├── editor/
│   │   ├── layout/
│   │   ├── sidebar/
│   │   └── ui/
│   ├── features/          # Feature-specific components and logic
│   │   ├── ai/
│   │   ├── code-intelligence/
│   │   ├── collaboration/
│   │   ├── help/
│   │   ├── keyboard/
│   │   └── onboarding/
│   ├── services/          # Business logic and API clients
│   │   ├── ai/
│   │   ├── gemini/
│   │   ├── mcp/
│   │   └── error-handler-global.ts
│   ├── stores/            # State management
│   ├── hooks/             # Custom React hooks
│   ├── types/             # TypeScript type definitions
│   ├── utils/             # Utility functions
│   ├── config/            # Configuration files
│   │   ├── config.ts
│   │   └── constants.ts
│   ├── runtime/           # Runtime-specific code
│   │   └── browser-stub.ts
│   ├── styles/            # Global styles
│   ├── theme/             # Theme system
│   └── index.tsx          # Application entry point
├── public/                # Static assets
├── assets/                # Icons and images
├── __tests__/             # Test files
├── .vscode/               # VSCode settings
├── analysis/              # Project analysis files
└── [config files]         # Root config files (package.json, vite.config.ts, etc.)
```

## Tasks for the AI Assistant

### Phase 1: Analysis (DO FIRST)
1. **Create complete file inventory**
   - List ALL files in root `/components/`
   - List ALL files in `src/components/`
   - Identify exact duplicates (same filename, compare content if possible)
   - Identify potential conflicts (same name, different content)

2. **Map all import dependencies**
   - Scan every .ts, .tsx, .js, .jsx file
   - Document all import statements and their targets
   - Create dependency graph showing file relationships
   - Identify circular dependencies if any

### Phase 2: Planning
3. **Create detailed migration plan** with three strategies:
   
   **Strategy A - Merge Duplicates:**
   - Files that exist in both root and src with same/similar content
   - Decision: Keep which version and why
   - Update all imports pointing to the deleted version
   
   **Strategy B - Move Unique Files:**
   - Files only in root `/components/` that don't exist in `src/`
   - Target location in `src/` directory
   - All import paths that need updating
   
   **Strategy C - Preserve Both (if truly different):**
   - Same filename but completely different functionality
   - Rename strategy to avoid conflicts
   - Update imports accordingly

4. **Generate import update map**
   ```
   OLD PATH                           → NEW PATH
   ====================================================
   /components/ai/AgentSelector       → src/features/ai/AgentSelector
   /components/chat/InputArea         → src/components/chat/InputArea
   ../components/common/ErrorBoundary → @/components/common/ErrorBoundary
   ```

### Phase 3: Execution Plan
5. **Provide step-by-step migration commands**
   ```bash
   # Example format:
   # 1. Move file
   mv components/ai/AgentSelector.tsx src/features/ai/
   
   # 2. Update all imports in files that reference it
   find src -type f -name "*.tsx" -o -name "*.ts" | xargs sed -i 's|from.*components/ai/AgentSelector|from "@/features/ai/AgentSelector"|g'
   ```

6. **Create verification checklist**
   - [ ] All files moved successfully
   - [ ] No orphaned files in old location
   - [ ] All import statements updated
   - [ ] TypeScript compilation succeeds (no errors)
   - [ ] Application starts without errors
   - [ ] All features work as before
   - [ ] No console errors at runtime

### Phase 4: Safety & Rollback
7. **Document rollback procedure**
   - How to restore from backup if something breaks
   - Which files to check first if errors occur
   - Common issues and their solutions

## Special Considerations

- **Preserve all Python scripts** at root (they're utility scripts, not part of the React app)
- **Keep configuration files** like package.json, vite.config.ts, tsconfig.json at root
- **Maintain style files**: index.css and tailwind.config.js should stay at root
- **Don't move test files**: __tests__ folder structure is fine as-is
- **Keep assets and analysis folders** at root level

## Deliverables

Please provide a comprehensive restructuring plan with:

### 1. Pre-Migration Checklist
- [ ] Backup command executed
- [ ] Current working directory confirmed
- [ ] Git status clean (or committed)
- [ ] Dependencies installed and working

### 2. Complete File Inventory
- **Duplicate files report**: List all files that exist in both locations
- **Unique files report**: Files only in root `/components/`
- **Conflict analysis**: Same filename, different content cases

### 3. Import Dependency Map
```
FILE                          → IMPORTS FROM                    → ACTION REQUIRED
================================================================================
src/App.tsx                   → /components/ai/AgentSelector    → Update import
components/app/App.tsx        → ./AppProvider                   → Move both files
```

### 4. Migration Strategy Document
For each folder in root `/components/`:
- **Decision**: Move, Merge, or Rename
- **Target location** in `src/`
- **Rationale**: Why this decision
- **Risk level**: Low/Medium/High
- **Files affected**: Count of imports to update

### 5. Automated Migration Script
Provide a complete script (bash/PowerShell) that:
- Creates backup
- Moves files to correct locations
- Updates all import statements
- Creates missing index.ts files
- Verifies structure after migration
- Runs TypeScript compiler to check for errors

### 6. Import Path Update Script
A find-and-replace script for all import paths:
```bash
# Update imports from old to new paths
# Include regex patterns for all moved files
```

### 7. Verification Procedure
Step-by-step instructions to verify:
1. **Build verification**: `npm run build` succeeds
2. **Type checking**: `npm run type-check` passes
3. **Linting**: `npm run lint` no new errors
4. **Runtime test**: Application starts and loads
5. **Feature testing**: Checklist of features to manually verify

### 8. Rollback Instructions
If migration fails:
```bash
# How to restore from backup
# How to revert specific changes
# Emergency recovery procedure
```

### 9. Post-Migration Cleanup
- List of old empty folders to delete
- Unused files to remove (if any)
- Updated folder structure diagram

### 10. Breaking Changes Documentation
⚠️ **CRITICAL**: Document ANY changes that might affect:
- Build process
- Import paths developers need to know about
- Configuration file updates
- Environment setup changes
- Third-party integrations

## Priority

This is a **HIGH-PRIORITY REFACTORING TASK** with **ZERO TOLERANCE FOR FUNCTIONALITY LOSS**.

### Success Criteria (ALL must be met):
✅ Backup created and verified  
✅ All files successfully moved to correct locations  
✅ Zero TypeScript compilation errors  
✅ Zero runtime errors on application start  
✅ All existing features work exactly as before  
✅ All import paths correctly updated  
✅ Build process completes successfully  
✅ No orphaned files in old locations  
✅ Consistent folder structure throughout  
✅ Index files created for all component folders  

### Failure is NOT acceptable if:
❌ Any feature stops working  
❌ Application won't build  
❌ Application won't start  
❌ Any code is permanently lost  
❌ Import errors appear  
❌ TypeScript errors increase  

---

**Attached File**: project-structure.txt (complete directory tree with 113,219 lines)

## ⚠️ FINAL REMINDER ⚠️

**BEFORE YOU START:**
1. ✅ Create a complete backup
2. ✅ Verify the backup is complete
3. ✅ Read the entire structure file
4. ✅ Understand all dependencies
5. ✅ Plan every single file move
6. ✅ Generate all path updates
7. ✅ Test the migration plan

**DO NOT:**
❌ Delete any code without verification  
❌ Skip import path updates  
❌ Assume similar files are identical  
❌ Break any working functionality  
❌ Proceed without a backup  

Please analyze the structure and provide a **SAFE**, **COMPLETE**, and **TESTED** reorganization plan that preserves 100% of functionality.

# G-STUDIO REFACTORING PROJECT
## STAGE 1 — FULL SOURCE MAP (CHECKPOINT 1)

**Date**: February 9, 2026  
**Status**: IN PROGRESS  
**Total Files**: 446 TypeScript files  
**Total Lines**: 131,569 lines of code  
**Average**: 294 lines per file  

---

## METHODOLOGY

This Stage 1 map catalogs EVERY file in src/ with:
- **Purpose**: What the file is responsible for
- **Exports**: Functions, types, components it provides
- **Dependencies**: What it imports and integrates with
- **Status**: Finished/Experimental/Partial/Stub
- **Notes**: Anything unusual or requiring investigation

**NO DECISIONS** are made about unused status yet.  
This is PURE MAPPING and INTENT DISCOVERY.

---

## ═══════════════════════════════════════════════════════
## PART 1: TOP-LEVEL src/ FILES
## ═══════════════════════════════════════════════════════

### 1.1 Entry Points (3 files)

#### `/index.tsx` (ROOT LEVEL - ACTIVE)
**Location**: `/home/claude/index.tsx` (517 bytes)
**Purpose**: PRIMARY application entry point (referenced by index.html)
**Exports**: None (bootstrap only)
**Imports**:
- React, ReactDOM
- `./index.css` (global styles)
- `./src/components/app/App` (ABSOLUTE path - NOTE!)
- `./src/services/error-handler-global` (error initialization)
**Flow**:
```typescript
1. Import App from src/components/app/App
2. Initialize global error handlers
3. Get root element
4. Render <React.StrictMode><App /></React.StrictMode>
```
**Status**: ✅ ACTIVE - This is the canonical entry point
**Notes**: Uses absolute paths instead of aliases - intentional for root-level location

---

#### `src/index.tsx` (458 bytes)
**Location**: `/home/claude/src/index.tsx`
**Purpose**: ALTERNATIVE entry point (NOT referenced by index.html)
**Exports**: None (bootstrap only)
**Imports**:
- React, ReactDOM
- `./index.css` (global styles)
- `@/components/app/App` (uses alias)
- `./error-handler-global` (relative path)
**Flow**: Identical to root index.tsx but with different import paths
**Status**: ⚠️ LIKELY LEGACY - Check if used by alternative build target
**Notes**: 
- Uses path alias `@/` instead of absolute path
- May be for Electron build or alternative configuration
- **DO NOT DELETE** - Investigate in Stage 2

---

#### `src/main.tsx` (1.2KB, 48 lines)
**Location**: `/home/claude/src/main.tsx`
**Purpose**: ALTERNATIVE entry point with enhanced bootstrap
**Exports**: None (bootstrap only)
**Imports**:
- React, ReactDOM
- `./App` (points to src/App.tsx - DIFFERENT APP!)
- `./index.css`
- `./utils/errorHandler`
- `./utils/EventBus`
**Features NOT in other entry points**:
- Global error handlers for `unhandledrejection` events
- Global error handlers for `error` events
- Network monitoring (online/offline event listeners)
- Event bus integration for network status
**Flow**:
```typescript
1. Set up global error handlers (window.addEventListener)
2. Set up network monitoring
3. Get root element
4. Render <React.StrictMode><App /></React.StrictMode>
```
**Status**: ⚠️ ALTERNATIVE BOOTSTRAP - More feature-rich than others
**Notes**:
- Points to `./App` (src/App.tsx) NOT `components/app/App`
- Has network monitoring that others lack
- May be intended as the "enhanced" entry point
- **DO NOT DELETE** - Investigate usage in Stage 2

---

### 1.2 App Components (2 files at src/ level)

#### `src/App.tsx` (2.5KB, 66 lines)
**Location**: `/home/claude/src/App.tsx`
**Purpose**: SIMPLE SHELL App component with lazy loading
**Exports**: `App` (default)
**Imports**:
- React hooks: Suspense, lazy, useEffect, useMemo
- `@/stores/appStore` (Zustand state)
- `./components/ErrorBoundary`
- `./components/LoadingScreen`
- `./components/layout/Header`
- `./App.css`
- **Lazy loaded**:
  - ChatView from `./components/chat/ChatView`
  - EditorView from `./components/editor/EditorView`
  - SplitView from `./components/layout/splitView`
**Features**:
- View mode switching (chat/editor/split)
- Dark/light theme application to HTML element
- Error boundary with fallback UI
- Suspense with LoadingScreen
**Status**: ✅ FUNCTIONAL - Simple shell implementation
**Notes**:
- Much simpler than `components/app/App.tsx` (66 lines vs 1409)
- May be a "minimal" or "legacy" version
- Connected to main.tsx (which imports `./App`)
- Uses path aliases throughout
- **PRESERVE** - May be intentional alternative

---

#### `src/App.css` (14KB)
**Location**: `/home/claude/src/App.css`
**Purpose**: Global application styles
**Contains**:
- Layout styles (.app, .app-main)
- Component-specific styles
- Utility classes
- Responsive breakpoints
**Status**: ✅ ACTIVE
**Notes**: Imported by App.tsx and index.css

---

### 1.3 Global Styles

#### `src/index.css` (112 bytes, 11 lines)
**Location**: `/home/claude/src/index.css`
**Purpose**: Root CSS entry point
**Contains**:
```css
@import './App.css';
body { margin: 0; padding: 0; }
html, body, #root { height: 100%; width: 100%; }
```
**Status**: ✅ ACTIVE
**Notes**: Imported by all entry points

---

### 1.4 Re-export Barrel Files

#### `src/constants.ts` (140 bytes, 3 lines)
**Location**: `/home/claude/src/constants.ts`
**Purpose**: Re-export barrel for config/constants.ts
**Exports**:
```typescript
export * from './config/constants';
export { FILE_TOOLS } from './config/constants';
export { FEATURE_FLAGS } from './config/constants';
```
**Status**: ✅ ACTIVE BARREL
**Notes**: Provides shorter import path for constants

---

#### `src/index.ts` (79 bytes, 2 lines)
**Location**: `/home/claude/src/index.ts`
**Purpose**: Re-export barrel for stores
**Exports**:
```typescript
export * from './stores/conversationStore';
export * from './stores/appStore';
```
**Status**: ✅ ACTIVE BARREL
**Notes**: Provides shorter import path for stores

---

### 1.5 Type Definitions

#### `src/vite-env.d.ts` (349 bytes)
**Location**: `/home/claude/src/vite-env.d.ts`
**Purpose**: Vite environment type definitions
**Contains**:
- `/// <reference types="vite/client" />`
- Interface augmentation for `ImportMetaEnv`
- Interface augmentation for `ImportMeta`
**Status**: ✅ ACTIVE
**Notes**: Standard Vite TypeScript setup

---

### 1.6 Utility Scripts (Non-TypeScript)

#### `src/test-local-model.ts` (617 bytes, 19 lines)
**Location**: `/home/claude/src/test-local-model.ts`
**Purpose**: Test/debug entry point for LocalAI
**Exports**: `LocalAIModelService` (re-export)
**Imports**: `@/services/ai/localAIModelService`
**Functionality**:
- Exposes LocalAIModelService to global window object
- Auto-initializes service on load
- Logs status to console
**Usage**: Designed to be loaded from HTML for testing
**Status**: ✅ UTILITY/TEST FILE
**Notes**: 
- Comment says "Entry point for HTML pages"
- Can be imported from HTML via Vite
- **PRESERVE** - Testing/debugging tool

---

#### `src/collect_debug_files.py` (2.0KB, 73 lines)
**Location**: `/home/claude/src/collect_debug_files.py`
**Purpose**: Utility to collect specific files for debugging
**Functionality**:
- Copies specified files from src/ to /debug/ at project root
- Handles name conflicts by appending folder names
- Flattens directory structure
**Target Files**: 
- Core services (mcpService, geminiService)
- Stores (conversationStore, projectStore, settingsStore)
- Utils (apiClient, errorHandler, EventBus, etc.)
- Main App component
**Status**: ✅ DEBUG UTILITY
**Notes**: 
- Lives in src/ but is not part of app
- **RELOCATE to /tools or /scripts** in later stage
- Lists 43 files for extraction

---

#### `src/fixing.py` (92KB, 2,243 lines!)
**Location**: `/home/claude/src/fixing.py`
**Purpose**: COMPREHENSIVE React/TypeScript project analyzer and fixer
**Functionality** (from header):
- Recursive project scanning
- Timestamped backup system with checkpoints
- Path alias resolution (tsconfig, vite.config)
- Auto import/export fixing
- Fuzzy name matching (Levenshtein distance)
- Auto-correct broken patterns
- Stub file generation
- Duplicate detection
- Circular dependency resolution
- Performance optimization suggestions
- Component enhancement (React.memo, lazy loading)
- Interactive HTML/JSON reports
- Real-time terminal logging
- Optional interactive Tinker UI
- Build verification (TypeScript + npm/pnpm/yarn)
- Atomic checkpoint system with rollback
- Feature tracking and reporting
**Version**: 8.0.0 - Enhanced Edition
**Author**: Claude 4.5 Sonnet (!)
**Status**: ✅ ADVANCED DEVELOPMENT TOOL
**Notes**:
- This is a PREVIOUS refactoring tool used on this project!
- Extremely comprehensive (2,243 lines)
- **RELOCATE to /tools** in later stage
- May contain valuable insights about project structure
- Could be re-run as part of verification

---

#### `src/fix.py` (0 bytes - EMPTY)
**Location**: `/home/claude/src/fix.py`
**Purpose**: Unknown (empty file)
**Status**: ⚠️ EMPTY STUB
**Notes**: 
- May be a placeholder or leftover
- **SAFE TO DELETE** but preserve until Stage 7

---

#### `src/error.bat` (2.6KB)
**Location**: `/home/claude/src/error.bat`
**Purpose**: Windows batch script for error collection
**Status**: ✅ WINDOWS UTILITY
**Notes**:
- Lives in src/ but not part of app
- **RELOCATE to /tools** in later stage

---

## ═══════════════════════════════════════════════════════
## PART 2: DIRECTORY-BY-DIRECTORY ANALYSIS
## ═══════════════════════════════════════════════════════

### DIRECTORY MANIFEST (by size, largest first):

```
2.0MB   services/          ⭐ Business logic (60+ services)
1.2MB   components/        ⭐ UI components (13 categories)
649KB   features/          ⭐ Feature modules (AI, code-intel, etc.)
365KB   hooks/             ⭐ Custom React hooks (40+ hooks)
111KB   mcp/               🔧 Model Context Protocol
103KB   llm/               🤖 LLM abstraction layer
78KB    utils/             🛠️ Utilities (11 files)
71KB    theme/             🎨 Design system
57KB    stores/            📦 Zustand state (6 stores)
56KB    config/            ⚙️ Configuration (2 files)
55KB    contexts/          📋 React contexts (5 files)
49KB    types/             📝 TypeScript types (10 files)
13KB    runtime/           ⚡ Runtime helpers (3 files)
12KB    styles/            💅 Global styles (1 file)
5KB     providers/         🔌 Providers (2 files)
5.5KB   test/              🧪 Test setup (1 file)
```

**Next**: I will systematically map each directory, starting with the largest (services/)

---

**STATUS**: STAGE 1 PART 1 COMPLETE  
**Next Section**: services/ directory (2.0MB, 60+ files)

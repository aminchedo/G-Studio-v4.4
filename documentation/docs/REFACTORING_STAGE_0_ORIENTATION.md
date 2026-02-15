# G-STUDIO REFACTORING PROJECT
## STAGE 0 — INITIAL ORIENTATION REPORT

**Date**: February 9, 2026  
**Project**: G-Studio v2.0.0 (Advanced AI-powered development studio)  
**Analyst**: Claude AI - Principal Software Architect  
**Total TypeScript Files**: 446  
**Codebase Size**: ~4.8MB (src directory)  

---

## ═══════════════════════════════════════════════════════
## 1. PROJECT TYPE & TECHNOLOGY STACK
## ═══════════════════════════════════════════════════════

### **Framework & Build System**
- **Framework**: React 18.3.1 with TypeScript 5.7.2
- **Build Tool**: Vite 6.4.1 (ESM, bundler mode resolution)
- **Module Type**: ES Modules (type: "module" in package.json)
- **Target**: ES2020, bundled for modern browsers
- **Development Server**: Port 3000 (strictPort: true)

### **Core Dependencies**
- **State Management**: Zustand 4.5.5 with persistence middleware
- **Code Editor**: Monaco Editor 0.52.0 (@monaco-editor/react 4.6.0)
- **AI Integration**: 
  - @google/generative-ai 0.21.0
  - @google/genai 1.40.0
- **UI Libraries**:
  - lucide-react 0.460.0 (icons)
  - react-markdown 10.1.0
  - react-syntax-highlighter 16.1.0
  - react-window 2.2.6 (virtualization)
- **Database**: idb 8.0.0 (IndexedDB wrapper)
- **Utilities**: 
  - zod 3.23.8 (validation)
  - diff 8.0.3 (text diffing)
  - date-fns 4.1.0

### **TypeScript Configuration**
```typescript
// CRITICAL SETTINGS:
"strict": true                          // ✅ All strict checks enabled
"noUnusedLocals": false                 // ⚠️ INTENTIONALLY DISABLED - preserves all features
"noUnusedParameters": false             // ⚠️ INTENTIONALLY DISABLED - preserves all features
"noUncheckedIndexedAccess": true        // ✅ Extra safety
"exactOptionalPropertyTypes": true      // ✅ Strict optionals
"noPropertyAccessFromIndexSignature": true // ✅ Strict indexing
```

**Path Aliases Configured**:
- `@/*` → `src/*`
- `@/components/*`, `@/services/*`, `@/hooks/*`, `@/stores/*`
- `@/types/*`, `@/utils/*`, `@/features/*`, `@/config/*`, `@/llm/*`

### **Testing Framework**
- **Test Runner**: Vitest 4.0.18
- **Testing Library**: @testing-library/react 16.0.1
- **Mock Environment**: happy-dom 20.5.0
- **IndexedDB Mock**: fake-indexeddb 6.2.5

### **Runtime Platform**
- **Primary**: Web Browser (React SPA)
- **Secondary**: Electron Desktop App (optional)
- **Electron Files**: `/electron/main.cjs`, `/electron/preload.cjs`

---

## ═══════════════════════════════════════════════════════
## 2. ARCHITECTURAL PATTERNS & ORGANIZATION
## ═══════════════════════════════════════════════════════

### **Overall Architecture**: Feature-Based Modular Monorepo

### **Directory Structure** (by size):
```
src/
├── services/          2.0MB   ⭐ Business logic layer
├── components/        1.2MB   ⭐ UI components
├── features/          649KB   ⭐ Feature modules
├── hooks/             365KB   ⭐ Reusable React hooks
├── mcp/               111KB   🔧 Model Context Protocol
├── llm/               103KB   🤖 LLM abstraction layer
├── utils/              78KB   🛠️ Utilities
├── theme/              71KB   🎨 Design system
├── stores/             57KB   📦 Zustand state stores
├── config/             56KB   ⚙️ Configuration
├── contexts/           55KB   📋 React contexts
├── types/              49KB   📝 TypeScript definitions
├── runtime/            13KB   ⚡ Runtime helpers
├── styles/             12KB   💅 Global styles
└── providers/           5KB   🔌 Provider components
```

### **Primary Organizational Pattern**: Layered Architecture
```
┌─────────────────────────────────────────┐
│  UI Layer (Components, Features)        │
├─────────────────────────────────────────┤
│  State Layer (Stores, Contexts, Hooks)  │
├─────────────────────────────────────────┤
│  Service Layer (Business Logic)         │
├─────────────────────────────────────────┤
│  Integration Layer (LLM, MCP, AI)       │
├─────────────────────────────────────────┤
│  Infrastructure (Utils, Runtime)         │
└─────────────────────────────────────────┘
```

---

## ═══════════════════════════════════════════════════════
## 3. ENTRY POINTS & BOOTSTRAP FLOW
## ═══════════════════════════════════════════════════════

### **⚠️ CRITICAL FINDING: Multiple Entry Points Detected**

#### **Entry Point 1: Root Level** (ACTIVE - referenced by index.html)
- **File**: `/home/claude/index.tsx` (517 bytes)
- **HTML Reference**: `<script type="module" src="/index.tsx"></script>`
- **App Import**: `./src/components/app/App` (absolute path)
- **Error Handler**: `./src/services/error-handler-global`
- **Status**: ✅ PRIMARY ENTRY POINT

#### **Entry Point 2: src Level**
- **File**: `/home/claude/src/index.tsx` (458 bytes)
- **App Import**: `@/components/app/App` (alias)
- **Error Handler**: `./error-handler-global`
- **Status**: ⚠️ DUPLICATE - likely unused

#### **Entry Point 3: src Level (Alternative)**
- **File**: `/home/claude/src/main.tsx` (1.2KB)
- **App Import**: `./App` (relative - points to src/App.tsx)
- **Features**: 
  - Global error handlers for unhandled rejections
  - Network monitoring (online/offline events)
  - Event bus integration
- **Status**: ⚠️ ALTERNATIVE - may be for different build target

### **⚠️ CRITICAL FINDING: Multiple App Components**

#### **App Component 1: Root App.tsx** (SMALLER)
- **File**: `/home/claude/src/App.tsx` (2.5KB, 66 lines)
- **Type**: Simple shell with lazy loading
- **Features**:
  - Lazy loads: ChatView, EditorView, SplitView
  - Uses appStore for state
  - Error boundary
  - View mode switching (chat/editor/split)

#### **App Component 2: Unified App.tsx** (MAIN)
- **File**: `/home/claude/src/components/app/App.tsx` (43KB, 1409 lines)
- **Type**: **MASSIVE UNIFIED COMPONENT** ⚠️
- **Features**: Everything (AI orchestration, UI, database, code intelligence, etc.)
- **Status**: ✅ ACTUAL APPLICATION COMPONENT

#### **App Component 3: AppNew.tsx**
- **File**: `/home/claude/src/components/app/AppNew.tsx` (14KB)
- **Status**: ⚠️ Alternative/experimental version

#### **App Component 4: AppProvider.tsx**
- **File**: `/home/claude/src/components/app/AppProvider.tsx` (12KB)
- **Type**: Context provider wrapper
- **Status**: ✅ ACTIVE (wraps app with contexts)

### **Bootstrap Flow** (Active Path):
```
index.html
  ↓
/index.tsx (root)
  ↓
/src/services/error-handler-global (initialize)
  ↓
/src/components/app/App.tsx (main component - 1409 lines)
  ↓
React.StrictMode → render
```

---

## ═══════════════════════════════════════════════════════
## 4. DETECTED SUBSYSTEMS (Deep Analysis)
## ═══════════════════════════════════════════════════════

### **4.1. AI & LLM Integration Layer** (`src/llm/`, `src/services/ai/`)

**Purpose**: Abstraction layer for LLM providers with advanced orchestration

**Files**: 103KB (llm/) + 506KB (services/ai/) = ~609KB

**Key Components**:
```
llm/
├── gateway.ts              - Request routing & load balancing
├── agent.ts                - Agent abstraction
├── contextAbstraction.ts   - Context window management (12KB)
├── cache.ts                - Response caching
├── cost.ts                 - Cost tracking
├── quota.ts                - Quota management
├── telemetry.ts            - Usage metrics
├── optimizer.ts            - Prompt optimization
├── stream.ts               - Streaming support
└── providers/
    └── geminiGateway.ts    - Google Gemini integration

services/ai/
├── geminiService.ts        - Main Gemini service (126KB) ⚠️ LARGE
├── geminiService - Copy.ts - Duplicate backup (126KB) ⚠️ DELETE CANDIDATE
├── geminiServiceOptimized.ts - Optimized version (17KB)
├── geminiSmartLayer.ts     - Smart model selection (8KB)
├── modelArbitrator.ts      - Multi-model orchestration
├── modelFallbackManager.ts - Fallback logic (14KB)
├── modelSelectionService.ts - Auto model selection (13KB)
├── smartModelSelector.ts   - AI-powered model picker (12KB)
├── modelTestingService.ts  - Model quality testing (24KB)
├── modelValidationStore.ts - Validation state (26KB)
├── localAIModelService.ts  - Local AI integration (39KB)
├── localAIWebEngine.ts     - Local model runner (11KB)
└── gemini/
    ├── geminiAdapter.ts    - API adapter
    ├── geminiModelManager.ts - Model lifecycle
    └── geminiClient.ts     - HTTP client
```

**Capabilities**:
- ✅ Multi-provider support (Gemini, local AI)
- ✅ Automatic model selection based on task
- ✅ Cost optimization & quota management
- ✅ Streaming responses
- ✅ Context window management
- ✅ Response caching
- ✅ Telemetry & monitoring

**Patterns Detected**:
- Gateway pattern for routing
- Strategy pattern for model selection
- Observer pattern for telemetry
- Decorator pattern for caching

---

### **4.2. MCP (Model Context Protocol)** (`src/mcp/`)

**Purpose**: Tool execution framework with policy enforcement

**Files**: 111KB + extensive documentation

**Structure**:
```
mcp/
├── README.md               - Main documentation
├── INTEGRATION_GUIDE.md    - Integration instructions
├── QUICK_REFERENCE.md      - API reference
├── EXECUTION_TRACE.md      - Debugging guide
├── SUMMARY.md              - Overview
├── index.ts                - Public API
├── demo.ts                 - Usage examples (13KB)
├── verify.ts               - Validation utilities (8.6KB)
├── policy/                 - Policy engine
│   ├── policyEngine.ts
│   └── policyValidator.ts
├── runtime/                - Runtime context
│   ├── contextManager.ts
│   └── sandboxIsolation.ts
└── tools/                  - Tool definitions
    ├── toolRegistry.ts
    ├── toolExecutor.ts
    └── toolValidator.ts
```

**Capabilities**:
- ✅ Tool registration & discovery
- ✅ Policy-based execution control
- ✅ Sandbox isolation for safety
- ✅ Runtime context management
- ✅ Execution tracing
- ✅ Tool validation

**Integration Points**:
- `services/mcpService.ts` (147KB - MASSIVE service)
- `services/mcpConnectionManager.ts` (12KB)
- `services/mcpAgentIntegration.ts` (2.2KB)
- `components/modals/McpToolModal.tsx`

---

### **4.3. Code Intelligence System** (`src/services/codeIntelligence/`)

**Purpose**: Advanced code analysis with AST, dependency mapping, impact analysis

**Files**: 234KB (largest subsystem in services/)

**Structure**:
```
codeIntelligence/
├── api.ts                  - Public API (9.5KB)
├── astExtractor.ts         - AST parsing (14KB)
├── changeTracker.ts        - File change detection (10KB)
├── dependencyMapper.ts     - Dependency graph (14KB)
├── indexer.ts              - Code indexing (12KB)
├── hashManager.ts          - File hashing (2.8KB)
├── nodeCompat.ts           - Node.js compatibility (5.2KB)
├── analysis/               - Analysis algorithms
│   ├── impactAnalysis.ts
│   ├── breakingChangeDetector.ts
│   └── refactoringSuggestions.ts
├── ast/                    - AST utilities
│   ├── astDiffer.ts
│   └── astQuery.ts
├── cpg/                    - Code Property Graph
│   ├── graphBuilder.ts
│   └── graphQuery.ts
├── history/                - Historical analysis
│   ├── snapshotManager.ts
│   └── trendAnalysis.ts
├── vcs/                    - Version control integration
│   └── gitIntegration.ts
└── vscode/                 - VSCode watcher
    └── fileWatcher.ts
```

**Capabilities**:
- ✅ AST extraction & diffing
- ✅ Dependency mapping (import/export graph)
- ✅ Impact analysis (what breaks if X changes)
- ✅ Breaking change detection
- ✅ Refactoring suggestions
- ✅ Code Property Graph (CPG) analysis
- ✅ Snapshot management
- ✅ Trend analysis
- ✅ Git integration
- ✅ VSCode file watching

**UI Components**:
- `features/code-intelligence/CodeIntelligenceDashboard.tsx`
- `features/code-intelligence/` (118KB total)

---

### **4.4. Multi-Agent Orchestration** (`src/services/agentOrchestrator.ts`)

**Purpose**: Coordinate multiple AI agents for complex tasks

**File**: 67KB (MASSIVE single file)

**Capabilities** (inferred from size & context):
- ✅ Agent lifecycle management
- ✅ Task decomposition & delegation
- ✅ Agent communication protocol
- ✅ Result aggregation
- ✅ Conflict resolution
- ✅ Agent collaboration

**Related Services**:
- `services/multiAgentService.ts` (15KB)
- `services/taskDecompositionEngine.ts` (12KB)
- `services/autonomousController.ts` (13KB)

**UI Components**:
- `features/ai/AgentCollaboration.tsx` (12KB)
- `features/ai/MultiAgentStatus.tsx` (5.4KB)
- `features/ai/AgentSelector.tsx` (11KB)
- `features/ai/AgentReasoning.tsx` (14KB)

---

### **4.5. State Management Layer** (`src/stores/`)

**Files**: 57KB across 6 stores

**Stores**:
```typescript
1. appStore.ts (13KB, 447 lines)
   - UI state (panel visibility, view modes)
   - Modal state (15+ modals)
   - AI configuration
   - Validation state
   - Performance metrics

2. conversationStore.ts (13KB)
   - Chat/conversation history
   - Message management
   - Conversation actions

3. projectStore.ts (10KB)
   - File/project state
   - File tree management
   - Active file tracking

4. settingsStore.ts (10KB)
   - User preferences
   - Settings persistence

5. codeIntelligenceStore.ts (5.5KB)
   - Code analysis results
   - Dependency graphs
   - Metrics

6. index.ts (1.5KB)
   - Store exports
```

**State Architecture**:
- Zustand with localStorage persistence
- Sliced state pattern (UI, modals, AI config separate)
- Typed selectors for type safety
- Middleware: persist (localStorage), devtools

---

### **4.6. Service Layer** (`src/services/`)

**Size**: 2.0MB (largest directory)

**Organization**: Highly granular, feature-specific services

**Major Services** (>10KB):
```
⭐ LARGE FILES (Refactoring Candidates):
├── mcpService.ts                   147KB  ⚠️ MASSIVE
├── geminiService.ts                126KB  ⚠️ MASSIVE + DUPLICATE
├── geminiService - Copy.ts         126KB  ⚠️ DELETE
├── agentOrchestrator.ts             67KB  ⚠️ LARGE
├── ultimateGeminiTester.ts          62KB  ⚠️ LARGE
├── localAIModelService.ts           39KB
├── runtimeUIVerification.ts         30KB
├── modelValidationStore.ts          26KB
├── modelTestingService.ts           24KB
├── sandboxAdvanced.ts               22KB
├── speechRecognitionService.ts      19KB
├── selfHealingEngine.ts             18KB
├── sandboxManager.ts                17KB
├── continuousVerification.ts        17KB
├── geminiServiceOptimized.ts        17KB
├── multiAgentService.ts             15KB
├── errorHandler.ts                  14KB
├── modelFallbackManager.ts          14KB
├── autonomousController.ts          13KB
├── stateTransaction.ts              13KB
├── modelSelectionService.ts         13KB
├── mcpConnectionManager.ts          12KB
├── taskDecompositionEngine.ts       12KB
├── smartModelSelector.ts            12KB
├── localAILogger.ts                 12KB
├── codeAnalysisService.ts           11KB
```

**Service Categories**:

1. **AI Services** (`services/ai/`)
   - Gemini integration
   - Local AI
   - Model selection & arbitration
   - Testing & validation

2. **Network Services** (`services/network/`)
   - circuitBreaker.ts
   - degradedMode.ts
   - rateLimiting.ts
   - requestCoalescer.ts

3. **Security Services** (`services/security/`)
   - adversarialDetector.ts
   - agentVerifier.ts
   - aiBehaviorValidation.ts
   - auditLogger.ts
   - killSwitch.ts
   - policyEngine.ts
   - runtimeGuardrails.ts
   - toolValidator.ts

4. **Monitoring Services** (`services/monitoring/`)
   - capabilityMonitor.ts
   - completionMonitor.ts
   - llmMonitoring.ts
   - memoryPressure.ts
   - streamingMonitor.ts
   - telemetry.ts

5. **Storage Services** (`services/storage/`)
   - databaseService.ts (19KB - real implementation)
   - contextManager.ts (15KB)
   - contextDatabaseBridge.ts (11KB)
   - responseCache.ts (5.7KB)
   - importanceCache.ts (3.5KB)

6. **Sandbox Services**
   - sandboxAdvanced.ts (22KB)
   - sandboxManager.ts (17KB)
   - sandboxIntegration.ts (9.4KB)

7. **Code Services** (`services/code/`)
   - filesystemAdapter.ts
   - codeCompletion.ts
   - codeFormatter.ts

**Pattern**: Service Locator + Dependency Injection

---

### **4.7. Component Layer** (`src/components/`)

**Size**: 1.2MB

**Structure**: Organized by function/feature

```
components/
├── app/                    179KB  ⚠️ Contains massive App.tsx (1409 lines)
│   ├── App.tsx             43KB   ⚠️ REFACTORING PRIORITY #1
│   ├── App.txt            106KB   ⚠️ Backup/documentation
│   ├── AppNew.tsx          14KB   ⚠️ Alternative version
│   └── AppProvider.tsx     12KB   ✅ Provider wrapper
│
├── layout/                 181KB
│   ├── Sidebar.tsx
│   ├── Header.tsx
│   ├── RightActivityBar.tsx
│   ├── Ribbon.tsx
│   ├── MainLayout.tsx
│   └── splitView.tsx
│
├── chat/                   119KB
│   ├── ChatView.tsx
│   ├── MessageList.tsx
│   ├── InputArea.tsx
│   ├── StreamingStatus.tsx
│   └── message-list/       - Virtualized list
│
├── ribbon/                 122KB  - Tab-based navigation
│   ├── HomeTab.tsx
│   ├── IntelligenceTab.tsx
│   ├── McpTab.tsx
│   ├── SettingsTab.tsx
│   ├── ViewTab.tsx
│   └── [modals...]
│
├── panels/                 113KB
│   ├── InspectorPanel.tsx
│   ├── MonitorPanel.tsx
│   ├── PerformanceMetrics.tsx
│   ├── ErrorDisplay.tsx
│   └── CodeMetricsPanel.tsx
│
├── modals/                 106KB  - 10+ modal components
│   ├── SettingsModal.tsx
│   ├── AgentModal.tsx
│   ├── McpToolModal.tsx
│   ├── ConfirmDialog.tsx
│   └── [...]
│
├── editor/                  47KB
│   ├── CodeEditor.tsx      - Monaco integration
│   ├── EditorTabs.tsx
│   └── DiffViewer.tsx
│
├── sidebar/                 63KB
│   ├── file-tree/          - File tree component
│   └── [...]
│
├── preview/                 23KB
│   ├── PreviewPanel.tsx
│   └── LiveCodeEditor.tsx
│
└── ui/                     138KB  - Reusable UI components
    ├── ErrorBoundary.tsx
    ├── NotificationToast.tsx
    ├── Button.tsx
    ├── Input.tsx
    └── [...]
```

**⚠️ Re-export Files Detected** (barrel pattern):
- `components/EditorTabs.ts` → re-exports from `editor/EditorTabs`
- `components/Sidebar.ts` → re-exports from `layout/Sidebar`
- `components/InputArea.ts` → re-exports from `chat/InputArea`
- `components/MessageList.ts` → re-exports from `chat/MessageList`
- `components/InspectorPanel.ts` → re-exports from `panels/InspectorPanel`

---

### **4.8. Hooks Layer** (`src/hooks/`)

**Size**: 365KB

**Organization**: By category

```
hooks/
├── ai/                     56KB
│   ├── useAIProvider.ts
│   ├── useLMStudio.ts
│   ├── useLocalAI.ts
│   └── useMultiAgent.ts
│
├── core/                  108KB
│   ├── useAgentOrchestrator.tsx
│   ├── useAutonomousMode.tsx
│   ├── useContextManager.tsx
│   ├── useGemini.tsx
│   ├── useMcp.tsx
│   ├── useModelSelection.tsx
│   ├── useSecureStorage.ts
│   └── useStateTransaction.ts
│
├── code/                   36KB
│   ├── useCodeIntelligence.ts
│   └── useSandbox.ts
│
├── voice/                  43KB
│   ├── useSpeechRecognition.tsx
│   └── useVoiceCommands.tsx
│
├── utils/                  46KB
│   ├── useCache.ts
│   ├── useNetworkReliability.ts
│   ├── useRuntimeGuardrails.ts
│   └── useTelemetry.ts
│
└── [standalone hooks]      76KB
    ├── useAgentConfig.ts
    ├── useButtonFeedback.ts    ⚠️ 6.5KB
    ├── useButtonFeedback.tsx   ⚠️ 6KB  (DUPLICATE!)
    ├── useCodeEditor.ts
    ├── useConversation.ts
    ├── useEditorHandlers.ts
    ├── useKeyboardShortcuts.ts
    ├── useNetworkStatus.ts
    ├── usePreview.ts
    ├── useSpeechRecognition.ts  ⚠️ 8.5KB (also in voice/)
    ├── useUIPanelState.ts
    └── useVisibilityAwareInterval.ts
```

**⚠️ DUPLICATES DETECTED**:
- `useButtonFeedback.ts` vs `useButtonFeedback.tsx` (both 6KB+)
- `useSpeechRecognition.ts` (root) vs `voice/useSpeechRecognition.tsx`

---

### **4.9. Features Layer** (`src/features/`)

**Size**: 649KB

**Structure**: High-level feature modules

```
features/
├── ai/                    427KB  ⭐ AI-specific features
│   ├── AISettingsHub.tsx           23KB  - 8-tab settings interface
│   ├── AISettingsHub/              - Tab components
│   │   ├── ModelsTab.tsx           23KB
│   │   ├── LocalAITab.tsx          24KB
│   │   ├── VoiceInputTab.tsx       18KB
│   │   ├── VoiceOutputTab.tsx      17KB
│   │   ├── APITestTab.tsx          18KB
│   │   ├── BehaviorTab.tsx         18KB
│   │   ├── ConnectionTab.tsx       18KB
│   │   ├── ProvidersTab.tsx        12KB
│   │   └── CustomProviderModal.tsx 12KB
│   │
│   ├── gemini-tester/             136KB  - Gemini testing suite
│   │   ├── GeminiTesterService.ts  17KB
│   │   ├── GeminiTesterUtils.ts    20KB
│   │   ├── GeminiTesterResults.tsx 14KB
│   │   ├── GeminiTesterContext.tsx 13KB
│   │   ├── GeminiTesterConfigPanel.tsx 11KB
│   │   └── [...]
│   │
│   ├── AgentCollaboration.tsx      12KB
│   ├── AgentReasoning.tsx          14KB
│   ├── AgentSelector.tsx           11KB
│   ├── AISuggestions.tsx           15KB
│   ├── AutonomousModeControl.tsx    8KB
│   ├── LocalAISettings.tsx         22KB
│   ├── McpConnectionStatus.tsx     11KB
│   ├── MultiAgentStatus.tsx         5KB
│   └── SpeechTest.tsx              10KB
│
├── code-intelligence/     118KB
│   ├── CodeIntelligenceDashboard.tsx
│   ├── ImpactMap.tsx
│   ├── DependencyGraph.tsx
│   ├── Timeline.tsx
│   └── RefactoringSuggestions.tsx
│
├── collaboration/          17KB
│   └── CollaborationPanel.tsx
│
├── help/                   26KB
│   └── HelpSystem.tsx
│
├── keyboard/               19KB
│   └── KeyboardShortcuts.tsx
│
├── onboarding/             20KB
│   └── OnboardingFlow.tsx
│
└── PreviewPane.tsx         16KB  - Standalone preview feature
```

---

### **4.10. Context & Provider Layer** (`src/contexts/`)

**Size**: 55KB

**Contexts**:
```typescript
1. AppStateContext.tsx (8.5KB)
   - Global app state provider
   
2. DatabaseContext.tsx (24KB) ⭐ LARGE
   - IndexedDB wrapper
   - Database operations
   
3. LMStudioProvider.tsx (4.5KB)
   - Local AI model provider
   
4. ModalContext.tsx (7KB)
   - Modal state management
   
5. NotificationContext.tsx (5.5KB)
   - Toast notifications
```

**Providers** (separate directory):
```typescript
src/providers/
├── DevAppProvider.tsx (16 lines)      - Dev mode provider
└── MinimalAppProvider.tsx (16 lines)  - Minimal provider
```

---

### **4.11. Theme & Styling System** (`src/theme/`)

**Size**: 71KB

**Structure**:
```
theme/
├── designTokens.ts          16KB  - Color, spacing, typography tokens
├── themeSystem.ts           28KB  - Theme engine
├── themeSystem - Copy.txt   13KB  ⚠️ BACKUP - DELETE CANDIDATE
├── index - Copy.txt         512B  ⚠️ BACKUP - DELETE CANDIDATE
└── index.ts                 164B  - Re-exports
```

**⚠️ Copy Files Detected**: Backup files should be removed

**Theme Features**:
- Dark/light mode
- Design tokens (colors, spacing, typography)
- CSS-in-JS system
- Theme provider

---

### **4.12. Configuration System** (`src/config/`)

**Size**: 56KB

**Files**:
```
config/
├── constants.ts       44KB  ⭐ MASSIVE
│   - Model definitions
│   - System instructions (969 lines!)
│   - Tool schemas
│   - Feature flags
│
└── config.ts          8.5KB
    - Runtime configuration
    - Environment variables
    - API endpoints
```

**constants.ts Analysis**:
- Contains AI system prompt (lines 27-100+)
- Model definitions (Gemini 3.0 Flash, Pro, etc.)
- Tool schemas for MCP
- Massive configuration object (969 lines!)

---

## ═══════════════════════════════════════════════════════
## 5. RUNTIME BOUNDARIES & BUILD CONFIGURATION
## ═══════════════════════════════════════════════════════

### **Runtime Environment**: Client-Side Only (No Backend)

### **Build Configuration** (vite.config.ts):
```typescript
optimizeDeps: {
  include: ['react', 'react-dom', 'zustand', 'lucide-react', '@google/generative-ai']
}

build: {
  target: 'esnext',
  sourcemap: true,
  minify: 'esbuild',
  chunkSizeWarningLimit: 1500,  // ⚠️ Large chunks expected
  
  rollupOptions: {
    output: {
      manualChunks: {
        'react-vendor': ['react', 'react-dom'],
        'monaco': ['monaco-editor', '@monaco-editor/react'],
        'ai-vendor': ['@google/generative-ai', '@google/genai'],
        'state-vendor': ['zustand'],
        'vendor': [...] // everything else
      }
    }
  }
}
```

**Chunk Strategy**: Manual chunking to optimize loading
- React in separate chunk
- Monaco Editor in separate chunk (large)
- AI SDKs in separate chunk
- State management separate
- Generic vendor chunk

### **Browser APIs Used**:
- IndexedDB (via `idb`)
- Web Speech API (speech recognition)
- Network Information API (online/offline)
- LocalStorage (Zustand persistence)
- Service Workers (potential - not confirmed)

---

## ═══════════════════════════════════════════════════════
## 6. CRITICAL FINDINGS & ISSUES
## ═══════════════════════════════════════════════════════

### **🔴 CRITICAL ISSUES**

#### **1. Multiple Entry Points Confusion**
**Severity**: HIGH  
**Files**:
- `/index.tsx` (root, 517B) - ✅ ACTIVE
- `src/index.tsx` (458B) - ⚠️ DUPLICATE
- `src/main.tsx` (1.2KB) - ⚠️ ALTERNATIVE

**Impact**: Potential confusion, unclear which is canonical

**Recommendation**: 
- Keep root `/index.tsx` (referenced by index.html)
- Investigate if `src/main.tsx` is for different build target
- Consider deleting `src/index.tsx` if truly unused

#### **2. Multiple App Components**
**Severity**: HIGH  
**Files**:
- `src/App.tsx` (2.5KB) - Simple shell
- `src/components/app/App.tsx` (43KB, 1409 lines) - MAIN ✅
- `src/components/app/AppNew.tsx` (14KB) - Alternative?
- `src/components/app/App.txt` (106KB) - Backup/doc?

**Impact**: Unclear which is active, massive App.tsx

**Recommendation**:
- Confirm `components/app/App.tsx` is active (1409 lines)
- Delete or archive unused versions
- Refactor 1409-line App.tsx (STAGE 3 priority)

#### **3. Massive Service Files**
**Severity**: MEDIUM  
**Files**:
- `services/mcpService.ts` (147KB) ⚠️
- `services/geminiService.ts` (126KB) ⚠️
- `services/agentOrchestrator.ts` (67KB) ⚠️
- `services/ultimateGeminiTester.ts` (62KB) ⚠️

**Impact**: Maintainability, testability, bundle size

**Recommendation**: Decompose into smaller modules (STAGE 3)

#### **4. Duplicate Files**
**Severity**: MEDIUM  
**Files**:
- `services/ai/geminiService - Copy.ts` (126KB) ⚠️ DELETE
- `hooks/useButtonFeedback.ts` + `.tsx` (both 6KB+) ⚠️ CONSOLIDATE
- `theme/themeSystem - Copy.txt` (13KB) ⚠️ DELETE
- `theme/index - Copy.txt` (512B) ⚠️ DELETE

**Impact**: Confusion, wasted space

**Recommendation**: Delete backup/copy files (STAGE 3)

#### **5. Non-Source Files in src/**
**Severity**: LOW  
**Files**:
- `src/fixing.py` (92KB) ⚠️
- `src/collect_debug_files.py` (2KB) ⚠️
- `src/error.bat` (2.6KB) ⚠️
- `src/fix.py` (0 bytes) ⚠️

**Impact**: Confusion, non-standard structure

**Recommendation**: Move to `/scripts` or delete (STAGE 3)

### **🟡 WARNINGS**

#### **6. TypeScript Unused Code Detection Disabled**
**Configuration**:
```json
{
  "noUnusedLocals": false,
  "noUnusedParameters": false
}
```

**Reason**: Intentionally disabled to preserve features during refactoring

**Impact**: Cannot rely on TS compiler to find dead code

**Recommendation**: Must use runtime analysis + manual inspection (STAGE 2)

#### **7. Large Config File**
**File**: `config/constants.ts` (969 lines, 44KB)

**Contains**:
- System prompts
- Model definitions
- Tool schemas
- Feature flags

**Recommendation**: Consider splitting (STAGE 4)

#### **8. Massive App Component**
**File**: `components/app/App.tsx` (1409 lines)

**Contains**: Everything (orchestration, UI, state)

**Recommendation**: HIGH PRIORITY for decomposition (STAGE 3)

---

## ═══════════════════════════════════════════════════════
## 7. CONFIGURATION SOURCES
## ═══════════════════════════════════════════════════════

### **Configuration Layers**:
```
1. Environment Variables (.env files)
   - Not visible in archive
   - Likely: VITE_API_KEY, etc.

2. config/config.ts (8.5KB)
   - Runtime configuration
   - API endpoints
   - Feature flags

3. config/constants.ts (44KB, 969 lines)
   - Model definitions
   - System prompts
   - Tool schemas
   - UI constants

4. Zustand Stores (persisted to localStorage)
   - User preferences
   - UI state
   - Settings

5. IndexedDB (via DatabaseContext)
   - Conversation history
   - Code intelligence data
   - Cache
```

### **Feature Flags** (inferred):
- Voice control enabled/disabled
- Local AI enabled/disabled
- Offline mode options
- Telemetry enabled/disabled
- Debug mode

---

## ═══════════════════════════════════════════════════════
## 8. ARCHITECTURE SUMMARY
## ═══════════════════════════════════════════════════════

### **Architectural Style**: Modular Monorepo with Layered Architecture

### **Design Patterns Detected**:
1. **Layered Architecture** (UI → State → Services → Infrastructure)
2. **Feature-Based Organization** (features/, services/ai/, etc.)
3. **Service Locator** (services/index.ts)
4. **Provider Pattern** (React contexts)
5. **Store Pattern** (Zustand stores)
6. **Facade Pattern** (service facades)
7. **Strategy Pattern** (model selection)
8. **Observer Pattern** (event bus, telemetry)
9. **Gateway Pattern** (llm/gateway.ts)
10. **Barrel Exports** (index.ts files everywhere)

### **Data Flow**:
```
User Interaction
  ↓
Components (UI)
  ↓
Hooks (Logic)
  ↓
Stores (State) ←→ Services (Business Logic)
  ↓
LLM Layer / MCP / Code Intelligence
  ↓
External APIs (Google AI, LocalStorage, IndexedDB)
```

### **State Management Strategy**:
- **Global State**: Zustand stores
- **Component State**: React useState/useReducer
- **Context State**: React contexts for cross-cutting concerns
- **Persistence**: localStorage (Zustand middleware) + IndexedDB

### **Performance Optimizations**:
- React.lazy for code splitting
- React.memo for component memoization
- Virtualized lists (react-window)
- Manual chunk splitting in Vite
- Response caching
- IndexedDB for large data

---

## ═══════════════════════════════════════════════════════
## 9. TESTING INFRASTRUCTURE
## ═══════════════════════════════════════════════════════

### **Test Files Location**: `__tests__/`

### **Test Coverage**:
```
__tests__/
├── components/
│   ├── EditorTabs.test.tsx
│   ├── InputArea.test.tsx
│   ├── InspectorPanel.test.tsx
│   ├── MessageList.test.tsx
│   └── Sidebar.test.tsx
│
├── integration/
│   └── file-workflow.test.tsx
│
├── services/
│   ├── agentOrchestrator.test.ts
│   ├── contextManager.test.ts
│   ├── databaseService.test.ts
│   ├── errorHandler.test.ts
│   ├── geminiService.test.ts
│   ├── secureStorage.test.ts
│   ├── stateTransaction.test.ts
│   ├── telemetryService.test.ts
│   └── toolValidator.test.ts
│
└── runtime-verification.test.tsx
```

### **Mocks**: `__mocks__/`
- google-genai.js
- react-markdown.js
- react-syntax-highlighter.js

### **Test Configuration**:
- **Framework**: Vitest
- **Environment**: happy-dom (browser simulation)
- **Coverage**: Available via `npm run test:coverage`

---

## ═══════════════════════════════════════════════════════
## 10. PRELIMINARY REFACTORING TARGETS
## ═══════════════════════════════════════════════════════

### **High Priority**:
1. ✅ **Massive App.tsx** (1409 lines) → Decompose
2. ✅ **mcpService.ts** (147KB) → Split into modules
3. ✅ **geminiService.ts** (126KB) → Refactor
4. ✅ **Duplicate Files** → Delete/consolidate
5. ✅ **Multiple Entry Points** → Clarify canonical path
6. ✅ **Non-source files in src/** → Move to /scripts

### **Medium Priority**:
7. ✅ **agentOrchestrator.ts** (67KB) → Decompose
8. ✅ **config/constants.ts** (969 lines) → Split
9. ✅ **Copy/backup files** → Remove
10. ✅ **Barrel exports** → Evaluate necessity

### **Low Priority**:
11. ✅ **Service granularity** → Evaluate if too granular
12. ✅ **Type definitions** → Consolidate if duplicated
13. ✅ **Unused imports** → Manual cleanup (TS disabled)

---

## ═══════════════════════════════════════════════════════
## ══════════════ CHECKPOINT 0 SUMMARY ═══════════════════
## ═══════════════════════════════════════════════════════

### **Project Understanding**: ✅ COMPLETE

**Project**: G-Studio v2.0.0 - Advanced AI-powered development studio

**Technology Stack**:
- React 18.3.1 + TypeScript 5.7.2 + Vite 6.4.1
- Zustand (state) + Monaco (editor) + Google AI (LLM)
- 446 TypeScript files, ~4.8MB codebase

**Architecture**: Layered, feature-based modular monorepo

**Primary Subsystems** (10 detected):
1. ✅ AI & LLM Layer (llm/, services/ai/)
2. ✅ MCP - Model Context Protocol (mcp/)
3. ✅ Code Intelligence (services/codeIntelligence/)
4. ✅ Multi-Agent Orchestration (agentOrchestrator.ts)
5. ✅ State Management (stores/)
6. ✅ Service Layer (services/)
7. ✅ Component Layer (components/)
8. ✅ Hooks Layer (hooks/)
9. ✅ Features Layer (features/)
10. ✅ Theme & Config (theme/, config/)

**Critical Issues Identified**:
- 🔴 Multiple entry points (3 files)
- 🔴 Multiple App components (4 files)
- 🔴 Massive files (147KB service)
- 🔴 Duplicate files (geminiService - Copy.ts, etc.)
- 🔴 Non-source files in src/ (Python scripts)

**Entry Point** (Active): `/index.tsx` → `src/components/app/App.tsx`

**Build System**: Vite with manual chunking (react-vendor, monaco, ai-vendor)

**Runtime**: Browser-only (Electron optional)

**Next Stage**: STAGE 1 - Full Source Map (Deep file-by-file analysis)

---

## ═══════════════════════════════════════════════════════
## 11. CONFIRMATION QUESTIONS FOR USER
## ═══════════════════════════════════════════════════════

Before proceeding to **STAGE 1**, I need to confirm:

### **Q1**: Entry Points
- Is `/index.tsx` (root) the ONLY active entry point?
- Should `src/index.tsx` and `src/main.tsx` be deleted?
- Or are they for different build targets (dev/prod/electron)?

### **Q2**: App Components
- Is `src/components/app/App.tsx` (1409 lines) the ACTIVE component?
- Should `src/App.tsx` (66 lines) be deleted?
- What about `AppNew.tsx`? Is it experimental?

### **Q3**: Duplicate Files
- Can I safely delete these files?
  - `services/ai/geminiService - Copy.ts`
  - `theme/themeSystem - Copy.txt`
  - `theme/index - Copy.txt`

### **Q4**: Build Targets
- Is there a specific Electron build configuration?
- Are dev/prod builds significantly different?

### **Q5**: Feature Flags
- Are there any features that should remain disabled?
- Any experimental features I should be aware of?

---

**✅ CHECKPOINT 0 COMPLETE**  
**Status**: AWAITING USER CONFIRMATION TO PROCEED TO STAGE 1

---

**Generated**: February 9, 2026  
**Analyst**: Claude AI  
**Next Stage**: STAGE 1 - Full Source Map & Intent Discovery

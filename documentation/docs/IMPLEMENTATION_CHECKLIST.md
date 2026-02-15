# G-Studio Implementation Checklist
## Quick Start Guide for AI Agent Execution

---

## 🎯 IMMEDIATE ACTION ITEMS (Week 1)

### Day 1: Environment Setup & Analysis

- [ ] **Task 1.1.1: Development Environment**
  ```bash
  # Clone and setup
  cd g-studio
  npm install
  
  # Verify build
  npm run build
  
  # Run tests
  npm run test
  
  # Check for existing issues
  npm run lint
  npm run type-check
  ```

- [ ] **Task 1.1.2: Install Monitoring Tools**
  ```bash
  # React DevTools Profiler
  # Install browser extension
  
  # Bundle analyzer
  npm install --save-dev vite-bundle-visualizer
  
  # Add to vite.config.ts:
  # import { visualizer } from 'rollup-plugin-visualizer'
  # plugins: [visualizer()]
  ```

- [ ] **Task 1.1.3: Code Audit**
  ```bash
  # Find infinite loop suspects
  grep -r "useEffect\|useState" src/ --include="*.tsx" | wc -l
  
  # Find polling code
  grep -r "setInterval" src/ --include="*.ts" --include="*.tsx" -n
  
  # Find type issues
  grep -r "@ts-ignore\|any" src/ --include="*.ts" --include="*.tsx" | wc -l
  
  # Check file sizes
  find src/ -name "*.ts" -o -name "*.tsx" | xargs wc -l | sort -rn | head -20
  ```

---

### Day 2-3: Fix Conversation Store

**Priority:** 🔴 CRITICAL

#### Step 1: Create Test File First (TDD)
```typescript
// stores/__tests__/conversationStore.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { 
  useConversationStore, 
  useCurrentConversation,
  useConversationActions 
} from '../conversationStore';

describe('ConversationStore', () => {
  beforeEach(() => {
    // Reset store before each test
    useConversationStore.setState({
      conversations: {},
      currentConversationId: null,
    });
  });

  it('should create conversation', () => {
    const { result } = renderHook(() => useConversationActions());
    
    let conversationId: string;
    act(() => {
      conversationId = result.current.createConversation('Test');
    });
    
    expect(conversationId).toBeDefined();
    
    const conversation = useConversationStore.getState().conversations[conversationId!];
    expect(conversation.title).toBe('Test');
  });

  it('should not cause infinite re-renders', () => {
    let renderCount = 0;
    
    const { result } = renderHook(() => {
      renderCount++;
      return useCurrentConversation();
    });
    
    // Initial render
    expect(renderCount).toBe(1);
    
    // Create conversation
    act(() => {
      useConversationActions().createConversation('Test');
    });
    
    // Should only re-render once after state change
    expect(renderCount).toBeLessThanOrEqual(3);
  });

  it('should persist across reloads', async () => {
    const { result } = renderHook(() => useConversationActions());
    
    let id: string;
    act(() => {
      id = result.current.createConversation('Persist Test');
    });
    
    // Simulate page reload by reading from localStorage
    const stored = localStorage.getItem('gstudio-conversations');
    expect(stored).toBeDefined();
    
    const parsed = JSON.parse(stored!);
    expect(parsed.state.conversations[id!]).toBeDefined();
  });
});
```

#### Step 2: Refactor Store Implementation
```typescript
// stores/conversationStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Conversation } from '@/types/conversation';

interface ConversationState {
  // CHANGED: Use plain object instead of Map
  conversations: Record<string, Conversation>;
  currentConversationId: string | null;
  
  // Actions
  createConversation: (title: string) => string;
  loadConversation: (id: string) => Conversation | null;
  deleteConversation: (id: string) => void;
  setCurrentConversation: (id: string | null) => void;
  addMessage: (conversationId: string, message: Message) => void;
}

export const useConversationStore = create<ConversationState>()(
  persist(
    (set, get) => ({
      conversations: {},
      currentConversationId: null,

      createConversation: (title: string) => {
        const id = crypto.randomUUID();
        const conversation: Conversation = {
          id,
          title,
          created: new Date(),
          updated: new Date(),
          messages: [],
          context: {},
          tags: [],
          archived: false,
        };
        
        set(state => ({
          conversations: {
            ...state.conversations,
            [id]: conversation,
          },
          currentConversationId: id,
        }));
        
        return id;
      },

      loadConversation: (id: string) => {
        return get().conversations[id] || null;
      },

      deleteConversation: (id: string) => {
        set(state => {
          const { [id]: removed, ...rest } = state.conversations;
          return {
            conversations: rest,
            currentConversationId: state.currentConversationId === id 
              ? null 
              : state.currentConversationId,
          };
        });
      },

      setCurrentConversation: (id: string | null) => {
        set({ currentConversationId: id });
      },

      addMessage: (conversationId: string, message: Message) => {
        set(state => {
          const conversation = state.conversations[conversationId];
          if (!conversation) return state;

          return {
            conversations: {
              ...state.conversations,
              [conversationId]: {
                ...conversation,
                messages: [...conversation.messages, message],
                updated: new Date(),
              },
            },
          };
        });
      },
    }),
    {
      name: 'gstudio-conversations',
    }
  )
);

// IMPROVED: Memoized selectors
export const useCurrentConversation = () => {
  const currentId = useConversationStore(state => state.currentConversationId);
  const conversation = useConversationStore(
    state => currentId ? state.conversations[currentId] : null
  );
  return conversation;
};

export const useConversationList = () => {
  return useConversationStore(
    state => Object.values(state.conversations)
      .filter(c => !c.archived)
      .sort((a, b) => b.updated.getTime() - a.updated.getTime())
  );
};

export const useConversationActions = () => {
  return useConversationStore(state => ({
    createConversation: state.createConversation,
    deleteConversation: state.deleteConversation,
    setCurrentConversation: state.setCurrentConversation,
    addMessage: state.addMessage,
  }));
};
```

#### Step 3: Update Components
```typescript
// components/ConversationSidebar.tsx
import { useConversationList, useConversationActions } from '@/stores/conversationStore';

export const ConversationSidebar = () => {
  const conversations = useConversationList();
  const { createConversation, setCurrentConversation } = useConversationActions();
  
  // RENDER COUNT TRACKING (dev only)
  if (process.env.NODE_ENV === 'development') {
    const renderCount = useRef(0);
    renderCount.current++;
    console.log('ConversationSidebar renders:', renderCount.current);
  }

  return (
    <aside className="conversation-sidebar">
      <button onClick={() => createConversation('New Chat')}>
        New Conversation
      </button>
      
      <ul>
        {conversations.map(conv => (
          <li 
            key={conv.id}
            onClick={() => setCurrentConversation(conv.id)}
          >
            {conv.title}
          </li>
        ))}
      </ul>
    </aside>
  );
};
```

#### Step 4: Verify Fix
```bash
# Run tests
npm run test stores/conversationStore

# Start dev server with React DevTools
npm run dev

# Check in browser:
# 1. Open React DevTools -> Profiler
# 2. Record a profile
# 3. Create a conversation
# 4. Stop recording
# 5. Verify < 3 re-renders per action
```

- [ ] Tests pass ✅
- [ ] < 3 re-renders per action ✅
- [ ] Conversations persist after reload ✅
- [ ] No console errors ✅

---

### Day 4-5: Optimize Polling

**Priority:** 🔴 CRITICAL

#### Step 1: Find All Polling
```bash
# Create audit report
echo "# Polling Audit Report" > polling-audit.md
echo "" >> polling-audit.md

grep -rn "setInterval" src/ --include="*.ts" --include="*.tsx" -A 5 >> polling-audit.md
```

#### Step 2: Create Event Bus
```typescript
// utils/events/EventBus.ts
type EventCallback<T = any> = (data: T) => void;

export class EventBus {
  private events = new Map<string, Set<EventCallback>>();

  on<T = any>(event: string, callback: EventCallback<T>): () => void {
    if (!this.events.has(event)) {
      this.events.set(event, new Set());
    }
    
    this.events.get(event)!.add(callback);
    
    // Return unsubscribe function
    return () => this.off(event, callback);
  }

  off<T = any>(event: string, callback: EventCallback<T>): void {
    this.events.get(event)?.delete(callback);
  }

  emit<T = any>(event: string, data?: T): void {
    this.events.get(event)?.forEach(cb => cb(data));
  }

  once<T = any>(event: string, callback: EventCallback<T>): void {
    const wrappedCallback = (data: T) => {
      callback(data);
      this.off(event, wrappedCallback);
    };
    
    this.on(event, wrappedCallback);
  }
}

export const eventBus = new EventBus();
```

#### Step 3: Replace Network Polling
```typescript
// hooks/useNetworkStatus.ts - BEFORE
export const useNetworkStatus = () => {
  const [isOnline, setIsOnline] = useState(true);
  
  useEffect(() => {
    // ❌ BAD: Polling every second
    const interval = setInterval(() => {
      fetch('/api/health')
        .then(() => setIsOnline(true))
        .catch(() => setIsOnline(false));
    }, 1000);
    
    return () => clearInterval(interval);
  }, []);
  
  return isOnline;
};

// hooks/useNetworkStatus.ts - AFTER
export const useNetworkStatus = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  
  useEffect(() => {
    // ✅ GOOD: Use browser events
    const handleOnline = () => {
      setIsOnline(true);
      eventBus.emit('network:online');
    };
    
    const handleOffline = () => {
      setIsOnline(false);
      eventBus.emit('network:offline');
    };
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);
  
  return isOnline;
};
```

#### Step 4: Create Visibility-Aware Hook
```typescript
// hooks/useVisibilityAwareInterval.ts
export const useVisibilityAwareInterval = (
  callback: () => void,
  delay: number
) => {
  const savedCallback = useRef(callback);
  const intervalRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  useEffect(() => {
    const tick = () => {
      // Only run if tab is visible
      if (!document.hidden) {
        savedCallback.current();
      }
    };

    // Start interval
    if (delay !== null) {
      intervalRef.current = setInterval(tick, delay);
      
      // Pause/resume on visibility change
      const handleVisibilityChange = () => {
        if (document.hidden && intervalRef.current) {
          clearInterval(intervalRef.current);
        } else if (!document.hidden) {
          intervalRef.current = setInterval(tick, delay);
        }
      };
      
      document.addEventListener('visibilitychange', handleVisibilityChange);
      
      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      };
    }
  }, [delay]);
};
```

#### Step 5: Replace Model Status Polling
```typescript
// services/ai/ModelStatusMonitor.ts
export class ModelStatusMonitor {
  private status: ModelStatus = 'idle';
  private lastCheck = 0;
  private checkInterval: NodeJS.Timeout | null = null;

  start() {
    // Event-driven updates
    eventBus.on('model:request', () => this.updateStatus('active'));
    eventBus.on('model:response', () => this.updateStatus('idle'));
    eventBus.on('model:error', () => this.updateStatus('error'));

    // Fallback polling (only if tab visible, every 30s)
    this.checkInterval = setInterval(() => {
      if (!document.hidden) {
        this.checkModelHealth();
      }
    }, 30000); // 30s instead of 1s
  }

  stop() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
    }
  }

  private updateStatus(status: ModelStatus) {
    if (this.status !== status) {
      this.status = status;
      eventBus.emit('model:status:changed', status);
    }
  }

  private async checkModelHealth() {
    const now = Date.now();
    if (now - this.lastCheck < 30000) return; // Debounce
    
    this.lastCheck = now;
    
    try {
      await fetch('/api/model/health');
      this.updateStatus('idle');
    } catch {
      this.updateStatus('error');
    }
  }
}

// Usage in components
export const useModelStatus = () => {
  const [status, setStatus] = useState<ModelStatus>('idle');
  
  useEffect(() => {
    return eventBus.on('model:status:changed', setStatus);
  }, []);
  
  return status;
};
```

#### Step 6: Verify Performance Improvement
```bash
# Before changes - measure CPU usage
# Open Chrome DevTools -> Performance
# Record for 10 seconds
# Note average CPU usage

# After changes - measure again
# Compare results
# Target: 30%+ reduction
```

- [ ] All polling > 30 seconds ✅
- [ ] Polling pauses when tab hidden ✅
- [ ] CPU usage reduced by 30%+ ✅
- [ ] All features still work ✅

---

### Day 6-10: Modularize Gemini Service

**Priority:** 🟡 HIGH

This is the largest refactoring task. Break it into manageable chunks.

#### Day 6: Setup Module Structure
```bash
# Create new directory structure
mkdir -p src/services/ai/gemini/{core,features,adapters,__tests__}

# Create placeholder files
touch src/services/ai/gemini/index.ts
touch src/services/ai/gemini/types.ts
touch src/services/ai/gemini/config.ts
touch src/services/ai/gemini/core/{GeminiClient,StreamHandler,ResponseParser}.ts
touch src/services/ai/gemini/features/{ModelManager,RetryPolicy,QuotaManager,CircuitBreaker,CacheManager}.ts
touch src/services/ai/gemini/adapters/{GeminiAdapter,MockAdapter}.ts
```

#### Day 7: Extract Types & Config
```typescript
// services/ai/gemini/types.ts
export interface GeminiConfig {
  apiKey: string;
  baseUrl?: string;
  defaultModel: string;
  timeout?: number;
  retryConfig?: RetryConfig;
}

export interface RetryConfig {
  maxAttempts: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
}

export interface GeminiRequest {
  model: string;
  prompt: string;
  systemInstruction?: string;
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
}

export interface GeminiResponse {
  text: string;
  model: string;
  usage: TokenUsage;
  finishReason: FinishReason;
}

export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export type FinishReason = 'stop' | 'length' | 'safety' | 'error';

export interface GeminiStreamChunk {
  text: string;
  done: boolean;
}

export interface IGeminiClient {
  sendRequest(request: GeminiRequest): Promise<GeminiResponse>;
  sendStreamRequest(
    request: GeminiRequest,
    onChunk: (chunk: GeminiStreamChunk) => void
  ): Promise<void>;
}

// services/ai/gemini/config.ts
export const DEFAULT_CONFIG: Partial<GeminiConfig> = {
  baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
  defaultModel: 'gemini-2.0-flash-exp',
  timeout: 30000,
  retryConfig: {
    maxAttempts: 3,
    baseDelay: 1000,
    maxDelay: 10000,
    backoffMultiplier: 2,
  },
};
```

#### Day 8: Extract Client & Stream Handler
Copy the code from the enhanced roadmap for:
- `GeminiClient.ts`
- `StreamHandler.ts`
- `ResponseParser.ts`

#### Day 9: Extract Features
Copy the code from the enhanced roadmap for:
- `ModelManager.ts`
- `RetryPolicy.ts`
- `QuotaManager.ts`
- `CircuitBreaker.ts`

#### Day 10: Create Adapter & Tests
Copy the code from the enhanced roadmap for:
- `GeminiAdapter.ts`
- `__tests__/GeminiClient.test.ts`
- `__tests__/RetryPolicy.test.ts`

Then migrate existing code:
```bash
# Find all imports of old service
grep -r "from.*geminiService" src/ --include="*.ts" --include="*.tsx"

# Replace with new adapter
# from '../services/ai/geminiService'
# →
# from '../services/ai/gemini'
```

- [ ] All modules < 500 LOC ✅
- [ ] Tests passing ✅
- [ ] Coverage > 80% ✅
- [ ] All imports updated ✅

---

## 🏃 WEEK 2 CHECKLIST

### Day 11-12: Error Handling

- [ ] Create `utils/errors/ErrorTypes.ts`
- [ ] Create `utils/errors/ErrorHandler.ts`
- [ ] Create `components/ErrorBoundary.tsx`
- [ ] Replace try-catch throughout codebase
- [ ] Test error scenarios
- [ ] Verify user sees friendly messages

### Day 13-14: Testing Infrastructure

- [ ] Setup Vitest configuration
- [ ] Setup React Testing Library
- [ ] Create test utilities
- [ ] Write example tests
- [ ] Configure coverage reporting

---

## 📊 PROGRESS TRACKING

### Daily Standup Template
```markdown
## Daily Progress Report - [Date]

### Completed Today
- [ ] Task 1
- [ ] Task 2

### In Progress
- [ ] Task 3

### Blocked
- [ ] Issue with X (need help)

### Tomorrow's Plan
- [ ] Task 4
- [ ] Task 5

### Metrics
- Tests passing: X/Y
- Coverage: Z%
- Build time: Xs
- Bundle size: YKB
```

### Weekly Review Template
```markdown
## Week X Review

### Accomplishments
1. Fixed conversation store infinite loop
2. Reduced polling by 80%
3. Refactored Gemini service

### Metrics Improved
- Test coverage: 20% → 65%
- CPU usage: -40%
- Bundle size: 800KB → 650KB

### Next Week Goals
1. Complete error handling
2. Start component decomposition
3. Reach 70% test coverage

### Challenges
- TypeScript migration slower than expected
- Need help with WebSocket setup
```

---

## 🚀 QUICK COMMANDS

```bash
# Development
npm run dev                 # Start dev server
npm run build              # Production build
npm run preview            # Preview build
npm run type-check         # Check types
npm run lint               # Lint code
npm run lint:fix           # Fix linting
npm run format             # Format code

# Testing
npm run test               # Run all tests
npm run test:unit          # Unit tests only
npm run test:integration   # Integration tests
npm run test:e2e           # E2E tests
npm run test:coverage      # Coverage report
npm run test:watch         # Watch mode

# Analysis
npm run analyze            # Bundle analysis
npm run perf               # Performance audit
npm run lighthouse         # Lighthouse audit

# Git
git checkout -b feature/task-X-Y
git commit -m "type(scope): message"
git push origin feature/task-X-Y
```

---

## ✅ QUALITY GATES

Before moving to next task, ensure:

- [ ] All tests passing
- [ ] No TypeScript errors
- [ ] No ESLint errors
- [ ] Coverage maintained or improved
- [ ] Documentation updated
- [ ] Performance not degraded
- [ ] Code reviewed (if applicable)

---

## 🎯 SUCCESS CRITERIA

**Phase 1 Complete When:**
- [x] Conversation store works without loops
- [x] Polling reduced by 60%+
- [x] Gemini service modularized
- [x] Standard error handling in place
- [x] All critical bugs fixed

**Phase 2 Complete When:**
- [ ] State management unified
- [ ] Components < 300 LOC
- [ ] TypeScript strict mode enabled
- [ ] 70%+ test coverage

**Phase 3 Complete When:**
- [ ] Voice wake word working
- [ ] Real-time collab prototype
- [ ] Code intelligence v2 released
- [ ] Performance targets met

**Production Ready When:**
- [ ] 80%+ test coverage
- [ ] Lighthouse score > 90
- [ ] Zero critical bugs
- [ ] Monitoring in place
- [ ] Documentation complete

---

**Next Step:** Start with Day 1 tasks immediately!

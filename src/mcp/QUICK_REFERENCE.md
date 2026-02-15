# Quick Reference Card

## System Overview

**Mandatory Tool Enforcement System** - Prevents code generation without validation

## File Structure

```
mcp/
├── policy/
│   ├── policy.json          # Tool policies
│   └── enforcement.ts       # Enforcement engine
├── runtime/
│   ├── executor.ts          # Execution engine
│   └── context.ts           # State tracking
├── tools/
│   ├── registry.ts          # Tool registry
│   ├── validators.ts        # Validation tools
│   ├── code-generation.ts   # Code gen tools
│   ├── analysis.ts          # Analysis tools
│   └── execution.ts         # Execution tools
└── demo.ts                  # Live demonstration
```

## Tool Requirements

| Tool Category | Tools | Required Prerequisites |
|--------------|-------|----------------------|
| **Code Generation** | write_code<br>generate_component<br>refactor_code | lint<br>typecheck<br>test |
| **File Operations** | create_file<br>edit_file<br>delete_file | validate_path<br>check_permissions |
| **Analysis** | analyze_code<br>detect_smells<br>dependency_graph | read_file<br>parse_ast |
| **Execution** | run<br>build<br>test | sandbox_ready<br>environment_verified |

## Quick Start

### 1. Initialize System

```typescript
import { getGlobalExecutor } from './mcp/runtime/executor';
import { getGlobalRegistry } from './mcp/tools/registry';
import { getAllValidatorTools } from './mcp/tools/validators';
import { getAllCodeGenerationTools } from './mcp/tools/code-generation';

const registry = getGlobalRegistry();
getAllValidatorTools().forEach(tool => registry.registerTool(tool));
getAllCodeGenerationTools().forEach(tool => registry.registerTool(tool));

const executor = getGlobalExecutor();
```

### 2. Execute Tools

```typescript
// This will FAIL - validators not run
try {
  await executor.execute('write_code', { code: 'const x = 1;' });
} catch (error) {
  console.log('Blocked:', error.message);
}

// Run validators first
await executor.execute('lint', { code: 'const x = 1;' });
await executor.execute('typecheck', { code: 'const x = 1;' });
await executor.execute('test');

// Now this will SUCCEED
await executor.execute('write_code', { code: 'const x = 1;' });
```

### 3. Check Execution History

```typescript
const context = executor.getContext();
const executedTools = context.getExecutedTools();
console.log('Executed:', executedTools);
```

## Key Classes

### ToolExecutor
```typescript
class ToolExecutor {
  async execute(toolName: string, args?: any): Promise<ToolExecutionResult>
  canExecute(toolName: string): { allowed: boolean; missingDependencies: string[] }
  getContext(): ExecutionContext
}
```

### PolicyEnforcer
```typescript
class PolicyEnforcer {
  enforcePolicy(toolName: string, context: ExecutionContext): void
  canExecute(toolName: string, context: ExecutionContext): { allowed: boolean; missingDependencies: string[] }
  getPolicy(toolName: string): ToolPolicy | undefined
}
```

### ExecutionContext
```typescript
class ExecutionContext {
  recordExecution(toolName: string, success: boolean, result?: any, error?: string): void
  hasExecuted(toolName: string): boolean
  getExecutedTools(): string[]
  getAllRecords(): ExecutionRecord[]
}
```

## Error Handling

```typescript
import { PolicyViolationError } from './mcp/policy/enforcement';

try {
  await executor.execute(toolName, args);
} catch (error) {
  if (error instanceof PolicyViolationError) {
    console.log('Tool:', error.toolName);
    console.log('Missing:', error.missingDependencies);
    
    // Execute missing dependencies
    for (const dep of error.missingDependencies) {
      await executor.execute(dep);
    }
    
    // Retry
    await executor.execute(toolName, args);
  }
}
```

## Running the Demo

```bash
cd mcp
npx ts-node demo.ts
```

## Policy Configuration

Edit `policy/policy.json`:

```json
{
  "toolPolicies": {
    "write_code": {
      "requires": ["lint", "typecheck", "test"],
      "forbidDirectOutput": true,
      "description": "Code generation requires validation"
    }
  },
  "enforcementMode": "strict",
  "allowBypass": false
}
```

## Enforcement Flow

```
Request → Executor → Enforcer → Check Context
                         ↓
                   Missing Deps?
                    ↙        ↘
                  YES        NO
                   ↓          ↓
                 Error     Execute
```

## Key Principles

1. **Hard Enforcement** - Runtime errors, not soft rules
2. **Fail-Closed** - Deny by default
3. **No Bypass** - No way to circumvent enforcement
4. **Auditable** - Full execution history
5. **Production-Ready** - No mocks or stubs

## Common Patterns

### Pattern 1: Code Generation
```typescript
await executor.execute('lint', { code });
await executor.execute('typecheck', { code });
await executor.execute('test');
await executor.execute('write_code', { path, code });
```

### Pattern 2: File Operations
```typescript
await executor.execute('validate_path', { path });
await executor.execute('check_permissions', { path, operation: 'write' });
await executor.execute('create_file', { path, content });
```

### Pattern 3: Code Analysis
```typescript
await executor.execute('read_file', { path });
await executor.execute('parse_ast', { code, language: 'typescript' });
await executor.execute('analyze_code', { path });
```

## Verification Checklist

- ✅ Tool blocked without dependencies
- ✅ Tool succeeds with dependencies
- ✅ PolicyViolationError thrown
- ✅ Execution history maintained
- ✅ No bypass possible

## Documentation

- **README.md** - Complete system documentation
- **EXECUTION_TRACE.md** - Proof of enforcement
- **INTEGRATION_GUIDE.md** - AI agent integration
- **SUMMARY.md** - Implementation summary
- **QUICK_REFERENCE.md** - This document

## Support

For issues or questions, refer to the full documentation in the files above.

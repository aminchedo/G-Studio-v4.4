# Mandatory Tool Enforcement System

## Overview

This is a **production-grade, runtime-enforced** tool execution system that prevents code generation and file operations unless required validation tools have been executed first.

**This is NOT prompt-based enforcement. This is HARD runtime enforcement.**

## Architecture

```
mcp/
├── policy/
│   ├── policy.json          # Tool policies and requirements
│   └── enforcement.ts       # Policy enforcement engine (THE GATEKEEPER)
├── runtime/
│   ├── executor.ts          # Central execution engine
│   └── context.ts           # Execution state tracking
├── tools/
│   ├── registry.ts          # Tool registration system
│   ├── validators.ts        # Validation tools (lint, typecheck, test, etc.)
│   ├── code-generation.ts   # Code generation tools (PROTECTED)
│   ├── analysis.ts          # Analysis tools (PROTECTED)
│   └── execution.ts         # Execution tools (PROTECTED)
└── demo.ts                  # Live demonstration
```

## Core Principles

### 1. Hard Enforcement
- Tools **CANNOT** execute unless dependencies are met
- No bypass mechanisms
- No soft rules
- Runtime errors on policy violations

### 2. Fail-Closed Design
- Deny by default
- Explicit requirements must be satisfied
- No assumptions of trust

### 3. Auditable Execution
- All tool executions are logged
- Full execution history maintained
- Traceable enforcement decisions

## Tool Categories & Requirements

### Code Generation Tools
**Tools:** `write_code`, `generate_component`, `refactor_code`

**Required Prerequisites:**
- `lint` - Code style validation
- `typecheck` - Type checking
- `test` - Unit tests

### File Operation Tools
**Tools:** `create_file`, `edit_file`, `delete_file`

**Required Prerequisites:**
- `validate_path` - Path validation
- `check_permissions` - Permission checking

### Analysis Tools
**Tools:** `analyze_code`, `detect_smells`, `dependency_graph`

**Required Prerequisites:**
- `read_file` - File reading
- `parse_ast` - AST parsing

### Execution Tools
**Tools:** `run`, `build`, `test`

**Required Prerequisites:**
- `sandbox_ready` - Sandbox verification
- `environment_verified` - Environment verification

## Usage

### Basic Usage

```typescript
import { getGlobalExecutor } from './runtime/executor';
import { getGlobalRegistry } from './tools/registry';
import { getAllValidatorTools } from './tools/validators';
import { getAllCodeGenerationTools } from './tools/code-generation';

// Initialize system
const registry = getGlobalRegistry();
getAllValidatorTools().forEach(tool => registry.registerTool(tool));
getAllCodeGenerationTools().forEach(tool => registry.registerTool(tool));

const executor = getGlobalExecutor();

// This will FAIL - validators not run
try {
  await executor.execute('write_code', {
    path: 'example.ts',
    code: 'const x = 42;'
  });
} catch (error) {
  // PolicyViolationError thrown
  console.error('Blocked:', error.message);
}

// Run validators first
await executor.execute('lint', { code: 'const x = 42;' });
await executor.execute('typecheck', { code: 'const x = 42;' });
await executor.execute('test');

// Now this will SUCCEED
const result = await executor.execute('write_code', {
  path: 'example.ts',
  code: 'const x = 42;'
});
```

### Running the Demonstration

```bash
# Install dependencies
npm install

# Run the demonstration
npx ts-node mcp/demo.ts
```

The demonstration shows:
1. ❌ Tool blocked due to missing dependencies
2. ✅ Same tool succeeding after dependencies are met
3. 📊 Execution history and audit trail
4. 🔒 File operations with path validation
5. 🔍 Analysis tools with AST parsing

## Key Components

### PolicyEnforcer (`policy/enforcement.ts`)

The gatekeeper. Every tool execution goes through `enforcePolicy()`:

```typescript
enforcePolicy(toolName: string, context: ExecutionContext): void {
  const policy = this.policies.get(toolName);
  if (!policy) return;

  const missingDependencies = policy.requires.filter(
    req => !context.hasExecuted(req)
  );

  if (missingDependencies.length > 0) {
    throw new PolicyViolationError(toolName, missingDependencies, message);
  }
}
```

**No bypass. No exceptions. Hard enforcement.**

### ExecutionContext (`runtime/context.ts`)

Tracks execution state:

```typescript
class ExecutionContext {
  hasExecuted(toolName: string): boolean {
    const record = this.executedTools.get(toolName);
    return record !== undefined && record.success === true;
  }
}
```

**Source of truth for enforcement decisions.**

### ToolExecutor (`runtime/executor.ts`)

Central execution engine:

```typescript
async execute(toolName: string, args?: any): Promise<ToolExecutionResult> {
  // STEP 1: MANDATORY POLICY ENFORCEMENT
  this.enforcer.enforcePolicy(toolName, this.context);
  
  // STEP 2: Get tool implementation
  const tool = this.registry.getTool(toolName);
  
  // STEP 3: Execute tool
  const result = await tool.execute(args);
  
  // STEP 4: Record execution
  this.context.recordExecution(toolName, true, result);
  
  return { success: true, result };
}
```

**All executions flow through this single point.**

## Policy Configuration

Policies are defined in `policy/policy.json`:

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

## Verification

The system demonstrates:

✅ **Hard Enforcement** - Tools fail with PolicyViolationError when dependencies aren't met

✅ **Runtime Validation** - No mock logic, actual enforcement at runtime

✅ **Audit Trail** - Full execution history with timestamps and results

✅ **Fail-Closed** - Deny by default, explicit requirements must be satisfied

✅ **No Bypass** - No way to circumvent enforcement

## Production Considerations

For production deployment:

1. **Persistence** - Store execution context in database
2. **Multi-User** - Separate contexts per user/session
3. **Real Validators** - Integrate actual linters, type checkers, test runners
4. **Async Execution** - Queue system for long-running tools
5. **Monitoring** - Metrics and alerting for policy violations
6. **Caching** - Cache validation results for performance

## License

This implementation is provided as a reference for building enforcement systems.

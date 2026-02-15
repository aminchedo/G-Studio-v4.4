# Integration Guide - AI Agent Integration

This guide shows how to integrate the mandatory tool enforcement system into an AI coding agent (like Cursor, Claude, Copilot, etc.).

## Overview

The enforcement system sits between the AI agent and the actual tool implementations, ensuring that validation tools are executed before code generation tools.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        AI Agent                             │
│                  (Cursor / Claude / etc.)                   │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      │ Tool Request
                      ↓
┌─────────────────────────────────────────────────────────────┐
│                   Tool Executor                             │
│              (Central Execution Engine)                     │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      │ Enforce Policy
                      ↓
┌─────────────────────────────────────────────────────────────┐
│                 Policy Enforcer                             │
│                  (THE GATEKEEPER)                           │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ Check Execution Context                              │  │
│  │   - Has lint been executed?                          │  │
│  │   - Has typecheck been executed?                     │  │
│  │   - Has test been executed?                          │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  Missing Dependencies? → throw PolicyViolationError         │
│  All Dependencies Met? → Allow Execution                    │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      │ Execute Tool
                      ↓
┌─────────────────────────────────────────────────────────────┐
│                  Tool Implementation                        │
│            (lint, typecheck, write_code, etc.)              │
└─────────────────────────────────────────────────────────────┘
```

## Integration Steps

### Step 1: Initialize the System

```typescript
import { getGlobalExecutor } from './mcp/runtime/executor';
import { getGlobalRegistry } from './mcp/tools/registry';
import { getAllValidatorTools } from './mcp/tools/validators';
import { getAllCodeGenerationTools } from './mcp/tools/code-generation';

// Initialize registry
const registry = getGlobalRegistry();

// Register all tools
getAllValidatorTools().forEach(tool => registry.registerTool(tool));
getAllCodeGenerationTools().forEach(tool => registry.registerTool(tool));

// Get executor
const executor = getGlobalExecutor();
```

### Step 2: Intercept AI Agent Tool Calls

Replace direct tool execution with enforced execution:

**Before (Unsafe):**
```typescript
// AI agent directly calls tools
async function handleAgentRequest(toolName: string, args: any) {
  const tool = getTool(toolName);
  return await tool.execute(args);  // ❌ No enforcement!
}
```

**After (Enforced):**
```typescript
// AI agent calls through executor
async function handleAgentRequest(toolName: string, args: any) {
  const executor = getGlobalExecutor();
  return await executor.execute(toolName, args);  // ✅ Enforced!
}
```

### Step 3: Handle Policy Violations

When the AI agent attempts to execute a tool without meeting dependencies:

```typescript
import { PolicyViolationError } from './mcp/policy/enforcement';

async function handleAgentRequest(toolName: string, args: any) {
  try {
    const result = await executor.execute(toolName, args);
    return result;
  } catch (error) {
    if (error instanceof PolicyViolationError) {
      // Return error to AI agent with instructions
      return {
        error: 'POLICY_VIOLATION',
        message: error.message,
        toolName: error.toolName,
        missingDependencies: error.missingDependencies,
        instructions: `You must execute these tools first: ${error.missingDependencies.join(', ')}`
      };
    }
    throw error;
  }
}
```

### Step 4: AI Agent Response Handling

The AI agent should:

1. **Receive the policy violation**
2. **Execute the required dependencies**
3. **Retry the original tool**

Example AI agent behavior:

```
User: "Write a function to calculate fibonacci"

AI Agent: Attempting to execute write_code...
System: PolicyViolationError - Missing: lint, typecheck, test

AI Agent: I need to run validators first.
AI Agent: Executing lint...
AI Agent: Executing typecheck...
AI Agent: Executing test...
AI Agent: Now executing write_code...
System: Success!

AI Agent: "I've created the fibonacci function in src/fibonacci.ts"
```

## Example Integration: MCP Server

For Model Context Protocol (MCP) servers:

```typescript
// mcp-server.ts
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { getGlobalExecutor } from './mcp/runtime/executor';
import { PolicyViolationError } from './mcp/policy/enforcement';

const server = new Server({
  name: 'enforced-tools-server',
  version: '1.0.0',
});

const executor = getGlobalExecutor();

// Register tool handlers
server.setRequestHandler('tools/call', async (request) => {
  const { name, arguments: args } = request.params;
  
  try {
    const result = await executor.execute(name, args);
    
    return {
      content: [{
        type: 'text',
        text: JSON.stringify(result.result)
      }]
    };
  } catch (error) {
    if (error instanceof PolicyViolationError) {
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            error: 'POLICY_VIOLATION',
            message: error.message,
            missingDependencies: error.missingDependencies
          })
        }],
        isError: true
      };
    }
    throw error;
  }
});

// Start server
const transport = new StdioServerTransport();
await server.connect(transport);
```

## Example Integration: REST API

For REST API-based agents:

```typescript
// api-server.ts
import express from 'express';
import { getGlobalExecutor } from './mcp/runtime/executor';
import { PolicyViolationError } from './mcp/policy/enforcement';

const app = express();
const executor = getGlobalExecutor();

app.post('/api/tools/execute', async (req, res) => {
  const { toolName, args } = req.body;
  
  try {
    const result = await executor.execute(toolName, args);
    
    res.json({
      success: true,
      result: result.result,
      executionTime: result.executionTime
    });
  } catch (error) {
    if (error instanceof PolicyViolationError) {
      res.status(403).json({
        success: false,
        error: 'POLICY_VIOLATION',
        message: error.message,
        toolName: error.toolName,
        missingDependencies: error.missingDependencies
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'INTERNAL_ERROR',
        message: error.message
      });
    }
  }
});

app.listen(3000, () => {
  console.log('Enforced tools API running on port 3000');
});
```

## AI Agent Prompt Integration

Add this to your AI agent's system prompt:

```
TOOL EXECUTION POLICY:

You have access to code generation tools, but they are protected by mandatory validation.

RULES:
1. Before executing write_code, generate_component, or refactor_code:
   - You MUST execute: lint, typecheck, test
   
2. Before executing create_file, edit_file, or delete_file:
   - You MUST execute: validate_path, check_permissions
   
3. Before executing analyze_code, detect_smells, or dependency_graph:
   - You MUST execute: read_file, parse_ast
   
4. Before executing run, build, or test:
   - You MUST execute: sandbox_ready, environment_verified

If you attempt to execute a tool without meeting its requirements, you will receive a PolicyViolationError with the list of missing dependencies.

WORKFLOW:
1. Identify which tool you need to execute
2. Check its requirements
3. Execute all required dependencies first
4. Then execute the target tool

This is NOT optional. The system will block execution if requirements are not met.
```

## Testing the Integration

```typescript
// test-integration.ts
import { getGlobalExecutor } from './mcp/runtime/executor';

async function testIntegration() {
  const executor = getGlobalExecutor();
  
  console.log('Test 1: Attempt write_code without validation');
  try {
    await executor.execute('write_code', { code: 'const x = 1;' });
    console.log('❌ FAILED: Tool executed without validation');
  } catch (error) {
    console.log('✅ PASSED: Tool blocked as expected');
  }
  
  console.log('\nTest 2: Execute with proper validation');
  await executor.execute('lint', { code: 'const x = 1;' });
  await executor.execute('typecheck', { code: 'const x = 1;' });
  await executor.execute('test');
  
  const result = await executor.execute('write_code', { code: 'const x = 1;' });
  console.log('✅ PASSED: Tool executed successfully');
}

testIntegration();
```

## Production Considerations

### 1. Session Management

```typescript
// Create separate contexts per user/session
import { ExecutionContext } from './mcp/runtime/context';
import { ToolExecutor } from './mcp/runtime/executor';

const userContexts = new Map<string, ExecutionContext>();

function getExecutorForUser(userId: string): ToolExecutor {
  if (!userContexts.has(userId)) {
    userContexts.set(userId, new ExecutionContext(userId));
  }
  return new ToolExecutor(userContexts.get(userId));
}
```

### 2. Persistence

```typescript
// Save execution context to database
async function saveContext(userId: string, context: ExecutionContext) {
  await db.contexts.upsert({
    userId,
    executedTools: context.getExecutedTools(),
    records: context.getAllRecords(),
    metadata: context.getMetadata()
  });
}

// Restore execution context from database
async function loadContext(userId: string): Promise<ExecutionContext> {
  const data = await db.contexts.findOne({ userId });
  const context = new ExecutionContext(userId);
  
  // Restore executed tools
  data.records.forEach(record => {
    context.recordExecution(
      record.toolName,
      record.success,
      record.result,
      record.error
    );
  });
  
  return context;
}
```

### 3. Real Validator Integration

```typescript
// Replace mock validators with real implementations
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export const lintTool: Tool = {
  name: 'lint',
  execute: async (args) => {
    const { stdout, stderr } = await execAsync('eslint . --format json');
    const results = JSON.parse(stdout);
    
    return {
      passed: results.errorCount === 0,
      issues: results.results.flatMap(r => r.messages),
      timestamp: new Date().toISOString()
    };
  }
};
```

## Conclusion

This integration ensures that AI agents **cannot** generate code or modify files without first running validation tools. The enforcement is:

- ✅ **Hard** - Runtime enforcement, not prompt-based
- ✅ **Mandatory** - No bypass mechanisms
- ✅ **Auditable** - Full execution history
- ✅ **Production-ready** - Real enforcement logic

The AI agent must adapt its behavior to work within these constraints, ensuring code quality and safety.

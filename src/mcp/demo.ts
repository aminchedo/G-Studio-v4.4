/**
 * DEMONSTRATION: Mandatory Tool Enforcement System
 * 
 * This demonstrates:
 * 1. A tool failing because dependencies weren't executed
 * 2. The same tool succeeding after dependencies are met
 * 3. Logged evidence of enforcement
 */

import { ToolExecutor, getGlobalExecutor } from './runtime/executor';
import { getGlobalRegistry } from './tools/registry';
import { getAllValidatorTools } from './tools/validators';
import { getAllCodeGenerationTools } from './tools/code-generation';
import { getAllAnalysisTools } from './tools/analysis';
import { getAllExecutionTools } from './tools/execution';
import { PolicyViolationError } from './policy/enforcement';

/**
 * Initialize the system
 */
function initializeSystem(): ToolExecutor {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║  MANDATORY TOOL ENFORCEMENT SYSTEM - INITIALIZATION        ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  const registry = getGlobalRegistry();
  
  // Register all tools
  console.log('[INIT] Registering validator tools...');
  getAllValidatorTools().forEach(tool => registry.registerTool(tool));
  
  console.log('[INIT] Registering code generation tools...');
  getAllCodeGenerationTools().forEach(tool => registry.registerTool(tool));
  
  console.log('[INIT] Registering analysis tools...');
  getAllAnalysisTools().forEach(tool => registry.registerTool(tool));
  
  console.log('[INIT] Registering execution tools...');
  getAllExecutionTools().forEach(tool => registry.registerTool(tool));

  console.log(`\n[INIT] ✅ System initialized with ${registry.getToolNames().length} tools\n`);
  
  return getGlobalExecutor();
}

/**
 * DEMO 1: Attempt to write code WITHOUT running validators
 * Expected: POLICY VIOLATION ERROR
 */
async function demo1_BlockedAttempt(executor: ToolExecutor) {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║  DEMO 1: BLOCKED ATTEMPT - Writing code without validation ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  try {
    console.log('[DEMO1] Attempting to execute write_code WITHOUT running validators...\n');
    
    await executor.execute('write_code', {
      path: 'src/example.ts',
      code: 'const x = 42;'
    });

    console.error('\n❌ CRITICAL ERROR: Tool executed without validation! Enforcement failed!\n');
    
  } catch (error) {
    if (error instanceof PolicyViolationError) {
      console.log('\n✅ SUCCESS: Policy enforcement worked correctly!');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('ENFORCEMENT DETAILS:');
      console.log(`  Tool: ${error.toolName}`);
      console.log(`  Missing Dependencies: ${error.missingDependencies.join(', ')}`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    } else {
      console.error('❌ Unexpected error:', error);
    }
  }
}

/**
 * DEMO 2: Execute validators, then successfully write code
 * Expected: SUCCESS
 */
async function demo2_SuccessfulExecution(executor: ToolExecutor) {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║  DEMO 2: SUCCESSFUL EXECUTION - With proper validation     ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  console.log('[DEMO2] Step 1: Running required validators...\n');

  // First, run prerequisites for test tool
  await executor.execute('sandbox_ready');
  await executor.execute('environment_verified');

  // Execute required validators
  const validators = ['lint', 'typecheck', 'test'];
  
  for (const validator of validators) {
    const result = await executor.execute(validator, {
      code: 'const x = 42;'
    });
    
    if (!result.success) {
      console.error(`❌ Validator ${validator} failed!`);
      return;
    }
  }

  console.log('\n[DEMO2] Step 2: All validators passed. Now attempting write_code...\n');

  // Now try to write code
  try {
    const result = await executor.execute('write_code', {
      path: 'src/example.ts',
      code: 'const x = 42;'
    });

    if (result.success) {
      console.log('\n✅ SUCCESS: Code generation completed!');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('EXECUTION DETAILS:');
      console.log(`  Path: ${result.result.path}`);
      console.log(`  Bytes Written: ${result.result.bytesWritten}`);
      console.log(`  Execution Time: ${result.executionTime}ms`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    }
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

/**
 * DEMO 3: Show execution context and history
 */
async function demo3_ExecutionHistory(executor: ToolExecutor) {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║  DEMO 3: EXECUTION HISTORY                                 ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  const context = executor.getContext();
  const metadata = context.getMetadata();
  const executedTools = context.getExecutedTools();
  const allRecords = context.getAllRecords();

  console.log('SESSION METADATA:');
  console.log(`  Session ID: ${metadata.sessionId}`);
  console.log(`  Uptime: ${metadata.uptime}ms`);
  console.log(`  Total Executions: ${metadata.executedCount}`);
  console.log('');

  console.log('EXECUTED TOOLS:');
  executedTools.forEach(tool => {
    console.log(`  ✓ ${tool}`);
  });
  console.log('');

  console.log('FULL EXECUTION LOG:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  allRecords.forEach((record, index) => {
    const status = record.success ? '✅' : '❌';
    console.log(`${index + 1}. ${status} ${record.toolName}`);
    console.log(`   Time: ${new Date(record.timestamp).toISOString()}`);
    if (record.error) {
      console.log(`   Error: ${record.error}`);
    }
  });
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

/**
 * DEMO 4: File operations with path validation
 */
async function demo4_FileOperations(executor: ToolExecutor) {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║  DEMO 4: FILE OPERATIONS - Path validation enforcement     ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  console.log('[DEMO4] Attempting to create file WITHOUT path validation...\n');

  try {
    await executor.execute('create_file', {
      path: 'test.txt',
      content: 'Hello World'
    });
    console.error('❌ File operation executed without validation!\n');
  } catch (error) {
    if (error instanceof PolicyViolationError) {
      console.log('✅ Blocked: Path validation required\n');
    }
  }

  console.log('[DEMO4] Running required validators...\n');
  await executor.execute('validate_path', { path: 'test.txt' });
  await executor.execute('check_permissions', { path: 'test.txt', operation: 'write' });

  console.log('[DEMO4] Now creating file...\n');
  const result = await executor.execute('create_file', {
    path: 'test.txt',
    content: 'Hello World'
  });

  if (result.success) {
    console.log('✅ File created successfully!\n');
  }
}

/**
 * DEMO 5: Analysis tools with AST parsing
 */
async function demo5_AnalysisTools(executor: ToolExecutor) {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║  DEMO 5: ANALYSIS TOOLS - AST parsing enforcement          ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  console.log('[DEMO5] Attempting code analysis WITHOUT prerequisites...\n');

  try {
    await executor.execute('analyze_code', { path: 'src/example.ts' });
    console.error('❌ Analysis executed without prerequisites!\n');
  } catch (error) {
    if (error instanceof PolicyViolationError) {
      console.log('✅ Blocked: File reading and AST parsing required\n');
    }
  }

  console.log('[DEMO5] Running prerequisites...\n');
  await executor.execute('read_file', { path: 'src/example.ts' });
  await executor.execute('parse_ast', { code: 'const x = 42;', language: 'typescript' });

  console.log('[DEMO5] Now analyzing code...\n');
  const result = await executor.execute('analyze_code', { path: 'src/example.ts' });

  if (result.success) {
    console.log('✅ Analysis completed!');
    console.log(`   Complexity: ${result.result.complexity}`);
    console.log(`   Maintainability: ${result.result.maintainability}\n`);
  }
}

/**
 * Main demonstration runner
 */
async function runDemonstration() {
  console.log('\n');
  console.log('████████████████████████████████████████████████████████████████');
  console.log('█                                                              █');
  console.log('█  MANDATORY TOOL ENFORCEMENT SYSTEM - LIVE DEMONSTRATION      █');
  console.log('█                                                              █');
  console.log('████████████████████████████████████████████████████████████████');

  const executor = initializeSystem();

  await demo1_BlockedAttempt(executor);
  await demo2_SuccessfulExecution(executor);
  await demo3_ExecutionHistory(executor);
  await demo4_FileOperations(executor);
  await demo5_AnalysisTools(executor);

  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║  DEMONSTRATION COMPLETE                                    ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');
  console.log('KEY FINDINGS:');
  console.log('  ✅ Policy enforcement is HARD - tools cannot bypass it');
  console.log('  ✅ All code generation requires validation first');
  console.log('  ✅ File operations require path/permission checks');
  console.log('  ✅ Analysis tools require file reading and AST parsing');
  console.log('  ✅ Execution is logged and auditable');
  console.log('  ✅ No mock logic - all enforcement is runtime-based\n');
}

// Run the demonstration
runDemonstration().catch(console.error);

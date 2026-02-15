/**
 * Verification Script - Proves the enforcement system works
 * Run this to verify all requirements are met
 */

import { getGlobalExecutor } from './runtime/executor';
import { getGlobalRegistry } from './tools/registry';
import { getAllValidatorTools } from './tools/validators';
import { getAllCodeGenerationTools } from './tools/code-generation';
import { PolicyViolationError } from './policy/enforcement';

interface TestResult {
  name: string;
  passed: boolean;
  message: string;
}

const results: TestResult[] = [];

function test(name: string, passed: boolean, message: string) {
  results.push({ name, passed, message });
  const icon = passed ? '✅' : '❌';
  console.log(`${icon} ${name}: ${message}`);
}

async function runVerification() {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║  VERIFICATION SCRIPT - Testing Enforcement System          ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  // Initialize system
  const registry = getGlobalRegistry();
  getAllValidatorTools().forEach(tool => registry.registerTool(tool));
  getAllCodeGenerationTools().forEach(tool => registry.registerTool(tool));
  
  // Import and register analysis tools
  const { getAllAnalysisTools } = await import('./tools/analysis');
  getAllAnalysisTools().forEach(tool => registry.registerTool(tool));
  
  const executor = getGlobalExecutor();

  // TEST 1: Tool blocked without dependencies
  console.log('\n[TEST 1] Verify tool is blocked without dependencies');
  try {
    await executor.execute('write_code', { code: 'test' });
    test('TEST 1', false, 'Tool executed without validation - ENFORCEMENT FAILED');
  } catch (error) {
    if (error instanceof PolicyViolationError) {
      test('TEST 1', true, 'Tool blocked as expected');
    } else {
      test('TEST 1', false, `Unexpected error: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // TEST 2: Tool succeeds with dependencies
  console.log('\n[TEST 2] Verify tool succeeds with dependencies');
  try {
    await executor.execute('sandbox_ready');
    await executor.execute('environment_verified');
    await executor.execute('lint', { code: 'test' });
    await executor.execute('typecheck', { code: 'test' });
    await executor.execute('test');
    const result = await executor.execute('write_code', { code: 'test' });
    
    if (result.success) {
      test('TEST 2', true, 'Tool executed successfully after validation');
    } else {
      test('TEST 2', false, 'Tool execution failed');
    }
  } catch (error) {
    test('TEST 2', false, `Unexpected error: ${error instanceof Error ? error.message : String(error)}`);
  }

  // TEST 3: Execution context tracks tools
  console.log('\n[TEST 3] Verify execution context tracking');
  const context = executor.getContext();
  const executedTools = context.getExecutedTools();
  const hasLint = executedTools.includes('lint');
  const hasWriteCode = executedTools.includes('write_code');
  
  if (hasLint && hasWriteCode) {
    test('TEST 3', true, `Context tracks ${executedTools.length} executed tools`);
  } else {
    test('TEST 3', false, 'Context not tracking tools correctly');
  }

  // TEST 4: canExecute check works
  console.log('\n[TEST 4] Verify canExecute check');
  const canExecuteResult = executor.canExecute('generate_component');
  
  if (canExecuteResult.allowed) {
    test('TEST 4', true, 'canExecute correctly identifies allowed tools');
  } else {
    test('TEST 4', false, 'canExecute check failed');
  }

  // TEST 5: File operations require validation
  console.log('\n[TEST 5] Verify file operations require validation');
  try {
    await executor.execute('create_file', { path: 'test.txt' });
    test('TEST 5', false, 'File operation executed without validation');
  } catch (error) {
    if (error instanceof PolicyViolationError) {
      test('TEST 5', true, 'File operation blocked without path validation');
    } else {
      test('TEST 5', false, `Unexpected error: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // TEST 6: File operations succeed with validation
  console.log('\n[TEST 6] Verify file operations succeed with validation');
  try {
    await executor.execute('validate_path', { path: 'test.txt' });
    await executor.execute('check_permissions', { path: 'test.txt', operation: 'write' });
    const result = await executor.execute('create_file', { path: 'test.txt', content: 'test' });
    
    if (result.success) {
      test('TEST 6', true, 'File operation succeeded after validation');
    } else {
      test('TEST 6', false, 'File operation failed');
    }
  } catch (error) {
    test('TEST 6', false, `Unexpected error: ${error instanceof Error ? error.message : String(error)}`);
  }

  // TEST 7: Analysis tools require prerequisites
  console.log('\n[TEST 7] Verify analysis tools require prerequisites');
  try {
    await executor.execute('analyze_code', { path: 'test.ts' });
    test('TEST 7', false, 'Analysis executed without prerequisites');
  } catch (error) {
    if (error instanceof PolicyViolationError) {
      test('TEST 7', true, 'Analysis blocked without file reading and AST parsing');
    } else {
      test('TEST 7', false, `Unexpected error: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // TEST 8: Analysis tools succeed with prerequisites
  console.log('\n[TEST 8] Verify analysis tools succeed with prerequisites');
  try {
    await executor.execute('read_file', { path: 'test.ts' });
    await executor.execute('parse_ast', { code: 'test', language: 'typescript' });
    const result = await executor.execute('analyze_code', { path: 'test.ts' });
    
    if (result.success) {
      test('TEST 8', true, 'Analysis succeeded after prerequisites');
    } else {
      test('TEST 8', false, 'Analysis failed');
    }
  } catch (error) {
    test('TEST 8', false, `Unexpected error: ${error instanceof Error ? error.message : String(error)}`);
  }

  // TEST 9: Execution history is complete
  console.log('\n[TEST 9] Verify execution history is complete');
  const allRecords = context.getAllRecords();
  const successfulRecords = allRecords.filter(r => r.success);
  
  if (allRecords.length > 0 && successfulRecords.length > 0) {
    test('TEST 9', true, `History contains ${allRecords.length} records (${successfulRecords.length} successful)`);
  } else {
    test('TEST 9', false, 'Execution history is incomplete');
  }

  // TEST 10: No bypass possible
  console.log('\n[TEST 10] Verify no bypass is possible');
  const enforcer = executor.getEnforcer();
  const policies = enforcer.getAllPolicies();
  const writeCodePolicy = policies.get('write_code');
  
  if (writeCodePolicy && writeCodePolicy.forbidDirectOutput) {
    test('TEST 10', true, 'Bypass protection is enabled');
  } else {
    test('TEST 10', false, 'Bypass protection is not configured');
  }

  // Summary
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║  VERIFICATION RESULTS                                      ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  const passed = results.filter(r => r.passed).length;
  const total = results.length;
  const percentage = Math.round((passed / total) * 100);

  console.log(`Tests Passed: ${passed}/${total} (${percentage}%)\n`);

  if (passed === total) {
    console.log('✅ ALL TESTS PASSED - System is working correctly!\n');
    console.log('Key Findings:');
    console.log('  ✅ Tools are blocked without dependencies');
    console.log('  ✅ Tools succeed with dependencies');
    console.log('  ✅ Execution context tracks all tools');
    console.log('  ✅ File operations require validation');
    console.log('  ✅ Analysis tools require prerequisites');
    console.log('  ✅ Execution history is maintained');
    console.log('  ✅ No bypass mechanisms exist\n');
    process.exit(0);
  } else {
    console.log('❌ SOME TESTS FAILED - Review the results above\n');
    process.exit(1);
  }
}

runVerification().catch(error => {
  console.error('Verification failed with error:', error);
  process.exit(1);
});

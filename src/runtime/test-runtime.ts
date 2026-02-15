/**
 * Runtime System Tests
 * Verifies that all tools execute correctly
 */

import { executeTool, getStatistics } from './index';

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
  duration: number;
}

const results: TestResult[] = [];

async function test(name: string, fn: () => Promise<void>): Promise<void> {
  const start = Date.now();
  try {
    await fn();
    results.push({
      name,
      passed: true,
      duration: Date.now() - start
    });
    console.log(`✅ ${name}`);
  } catch (error: any) {
    results.push({
      name,
      passed: false,
      error: error.message,
      duration: Date.now() - start
    });
    console.error(`❌ ${name}: ${error.message}`);
  }
}

async function runTests() {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║  RUNTIME SYSTEM TESTS                                      ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  const testFile = 'test-runtime-file.txt';
  const testContent = 'Test content for runtime system';

  // File Operations Tests
  console.log('\n[FILE OPERATIONS]');
  
  await test('write_file creates file', async () => {
    const result = await executeTool('write_file', {
      path: testFile,
      content: testContent
    });
    if (!result.success) throw new Error(result.error);
  });

  await test('file_exists returns true for existing file', async () => {
    const result = await executeTool('file_exists', { path: testFile });
    if (!result.result.exists) throw new Error('File should exist');
  });

  await test('read_file reads correct content', async () => {
    const result = await executeTool('read_file', { path: testFile });
    if (!result.success) throw new Error(result.error);
    if (result.result.content !== testContent) {
      throw new Error('Content mismatch');
    }
  });

  await test('get_file_stats returns file info', async () => {
    const result = await executeTool('get_file_stats', { path: testFile });
    if (!result.success) throw new Error(result.error);
    if (!result.result.stats.size) throw new Error('No size info');
  });

  await test('delete_file removes file', async () => {
    const result = await executeTool('delete_file', { path: testFile });
    if (!result.success) throw new Error(result.error);
  });

  await test('file_exists returns false after deletion', async () => {
    const result = await executeTool('file_exists', { path: testFile });
    if (result.result.exists) throw new Error('File should not exist');
  });

  // Command Execution Tests
  console.log('\n[COMMAND EXECUTION]');

  await test('run_command executes successfully', async () => {
    const result = await executeTool('run_command', {
      command: 'node --version'
    });
    if (!result.success) throw new Error(result.error);
    if (!result.result.stdout) throw new Error('No output');
  });

  await test('run_command captures output', async () => {
    const result = await executeTool('run_command', {
      command: 'echo "test output"'
    });
    if (!result.success) throw new Error(result.error);
    if (!result.result.stdout.includes('test')) {
      throw new Error('Output not captured');
    }
  });

  // Path Validation Tests
  console.log('\n[SECURITY]');

  await test('read_file blocks path traversal', async () => {
    const result = await executeTool('read_file', {
      path: '../../../etc/passwd'
    });
    if (result.success) throw new Error('Should block path traversal');
  });

  await test('write_file blocks absolute paths outside project', async () => {
    const result = await executeTool('write_file', {
      path: '/tmp/malicious.txt',
      content: 'test'
    });
    if (result.success) throw new Error('Should block absolute paths');
  });

  // Code Analysis Tests
  console.log('\n[CODE ANALYSIS]');

  const codeFile = 'test-code-analysis.ts';
  const code = `import { test } from 'test';\nexport const value = 42;`;

  await test('parse_ast parses TypeScript', async () => {
    await executeTool('write_file', { path: codeFile, content: code });
    const result = await executeTool('parse_ast', { path: codeFile });
    if (!result.success) throw new Error(result.error);
    await executeTool('delete_file', { path: codeFile });
  });

  await test('get_imports extracts imports', async () => {
    await executeTool('write_file', { path: codeFile, content: code });
    const result = await executeTool('get_imports', { path: codeFile });
    if (!result.success) throw new Error(result.error);
    if (!result.result.imports.includes('test')) {
      throw new Error('Import not found');
    }
    await executeTool('delete_file', { path: codeFile });
  });

  await test('get_exports extracts exports', async () => {
    await executeTool('write_file', { path: codeFile, content: code });
    const result = await executeTool('get_exports', { path: codeFile });
    if (!result.success) throw new Error(result.error);
    if (!result.result.exports.includes('value')) {
      throw new Error('Export not found');
    }
    await executeTool('delete_file', { path: codeFile });
  });

  // Error Handling Tests
  console.log('\n[ERROR HANDLING]');

  await test('read_file handles non-existent file', async () => {
    const result = await executeTool('read_file', {
      path: 'non-existent-file.txt'
    });
    if (result.success) throw new Error('Should fail for non-existent file');
  });

  await test('delete_file handles non-existent file', async () => {
    const result = await executeTool('delete_file', {
      path: 'non-existent-file.txt'
    });
    if (result.success) throw new Error('Should fail for non-existent file');
  });

  // Statistics Tests
  console.log('\n[STATISTICS]');

  await test('getStatistics returns data', async () => {
    const stats = getStatistics();
    if (stats.total === 0) throw new Error('No executions recorded');
    if (stats.successful === 0) throw new Error('No successful executions');
  });

  // Summary
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║  TEST RESULTS                                              ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  const total = results.length;
  const successRate = (passed / total) * 100;

  console.log(`Total tests: ${total}`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  console.log(`Success rate: ${successRate.toFixed(2)}%`);

  if (failed > 0) {
    console.log('\nFailed tests:');
    results.filter(r => !r.passed).forEach(r => {
      console.log(`  ❌ ${r.name}: ${r.error}`);
    });
  }

  const stats = getStatistics();
  console.log('\nExecution Statistics:');
  console.log(`  Total tool executions: ${stats.total}`);
  console.log(`  Success rate: ${stats.successRate.toFixed(2)}%`);
  console.log(`  Avg execution time: ${stats.avgExecutionTime}ms`);

  if (failed === 0) {
    console.log('\n✅ ALL TESTS PASSED - System is fully operational\n');
    process.exit(0);
  } else {
    console.log('\n❌ SOME TESTS FAILED - Review errors above\n');
    process.exit(1);
  }
}

// Run tests
if (require.main === module) {
  runTests().catch(error => {
    console.error('Test runner error:', error);
    process.exit(1);
  });
}

export { runTests };

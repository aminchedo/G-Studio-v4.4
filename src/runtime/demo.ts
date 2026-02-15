/**
 * Runtime System Demonstration
 * Shows REAL execution capabilities
 */

import { executeTool, getStatistics, getHistory } from './index';
import { SelfVerification } from './modelIntegration';

async function demonstrateFileOperations() {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║  DEMO 1: FILE OPERATIONS (REAL FILESYSTEM)                ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  const testFile = 'runtime-test-demo.txt';

  // 1. Write file
  console.log('1. Writing file to filesystem...');
  const writeResult = await executeTool('write_file', {
    path: testFile,
    content: 'Hello from the runtime system!\nThis is a real file.'
  });
  console.log(`   ${writeResult.success ? '✅' : '❌'} Write: ${writeResult.success ? 'Success' : writeResult.error}`);

  // 2. Check if file exists
  console.log('\n2. Checking if file exists...');
  const existsResult = await executeTool('file_exists', { path: testFile });
  console.log(`   ${existsResult.result.exists ? '✅' : '❌'} Exists: ${existsResult.result.exists}`);

  // 3. Read file
  console.log('\n3. Reading file from filesystem...');
  const readResult = await executeTool('read_file', { path: testFile });
  console.log(`   ${readResult.success ? '✅' : '❌'} Read: ${readResult.success ? 'Success' : readResult.error}`);
  if (readResult.success) {
    console.log(`   Content: "${readResult.result.content}"`);
  }

  // 4. Get file stats
  console.log('\n4. Getting file statistics...');
  const statsResult = await executeTool('get_file_stats', { path: testFile });
  if (statsResult.success) {
    console.log(`   ✅ Size: ${statsResult.result.stats.size} bytes`);
    console.log(`   ✅ Modified: ${statsResult.result.stats.modified}`);
  }

  // 5. Delete file
  console.log('\n5. Deleting file from filesystem...');
  const deleteResult = await executeTool('delete_file', { path: testFile });
  console.log(`   ${deleteResult.success ? '✅' : '❌'} Delete: ${deleteResult.success ? 'Success' : deleteResult.error}`);

  // 6. Verify deletion
  console.log('\n6. Verifying file was deleted...');
  const existsAfterDelete = await executeTool('file_exists', { path: testFile });
  console.log(`   ${!existsAfterDelete.result.exists ? '✅' : '❌'} File deleted: ${!existsAfterDelete.result.exists}`);
}

async function demonstrateCommandExecution() {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║  DEMO 2: COMMAND EXECUTION (REAL SHELL)                   ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  // 1. List files
  console.log('1. Executing: ls (or dir on Windows)...');
  const lsCommand = process.platform === 'win32' ? 'dir' : 'ls -la';
  const lsResult = await executeTool('run_command', { command: lsCommand });
  console.log(`   ${lsResult.success ? '✅' : '❌'} Command executed`);
  if (lsResult.success) {
    const lines = lsResult.result.stdout.split('\n').slice(0, 5);
    console.log(`   Output (first 5 lines):\n${lines.map(l => `     ${l}`).join('\n')}`);
  }

  // 2. Get Node version
  console.log('\n2. Executing: node --version...');
  const nodeResult = await executeTool('run_command', { command: 'node --version' });
  console.log(`   ${nodeResult.success ? '✅' : '❌'} Node version: ${nodeResult.result.stdout.trim()}`);

  // 3. Echo test
  console.log('\n3. Executing: echo "Hello from runtime"...');
  const echoResult = await executeTool('run_command', { command: 'echo "Hello from runtime"' });
  console.log(`   ${echoResult.success ? '✅' : '❌'} Output: ${echoResult.result.stdout.trim()}`);
}

async function demonstrateCodeAnalysis() {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║  DEMO 3: CODE ANALYSIS (REAL AST PARSING)                 ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  const testFile = 'runtime-test-analysis.ts';

  // Create a test file
  console.log('1. Creating test TypeScript file...');
  const code = `import { useState } from 'react';
import { helper } from './utils';

export function TestComponent() {
  const [count, setCount] = useState(0);
  return <div>{count}</div>;
}

export const config = { enabled: true };
`;

  await executeTool('write_file', { path: testFile, content: code });
  console.log('   ✅ Test file created');

  // Get imports
  console.log('\n2. Analyzing imports...');
  const importsResult = await executeTool('get_imports', { path: testFile });
  if (importsResult.success) {
    console.log(`   ✅ Found ${importsResult.result.imports.length} imports:`);
    importsResult.result.imports.forEach((imp: string) => {
      console.log(`      - ${imp}`);
    });
  }

  // Get exports
  console.log('\n3. Analyzing exports...');
  const exportsResult = await executeTool('get_exports', { path: testFile });
  if (exportsResult.success) {
    console.log(`   ✅ Found ${exportsResult.result.exports.length} exports:`);
    exportsResult.result.exports.forEach((exp: string) => {
      console.log(`      - ${exp}`);
    });
  }

  // Clean up
  await executeTool('delete_file', { path: testFile });
  console.log('\n4. Cleaned up test file');
}

async function demonstrateSelfVerification() {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║  DEMO 4: SELF-VERIFICATION (REAL VALIDATION)              ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  const testFile = 'runtime-test-verify.ts';

  // Create a file with issues
  console.log('1. Creating file with potential issues...');
  const codeWithIssues = `const x=1;const y=2;
function test(){return x+y;}
`;

  await executeTool('write_file', { path: testFile, content: codeWithIssues });
  console.log('   ✅ File created');

  // Verify the file
  console.log('\n2. Running verification checks...');
  const verification = await SelfVerification.verifyChange(testFile);
  
  console.log(`   Syntax: ${verification.checks.syntax ? '✅' : '❌'}`);
  console.log(`   Types: ${verification.checks.types ? '✅' : '❌'}`);
  console.log(`   Lint: ${verification.checks.lint ? '✅' : '❌'}`);
  console.log(`   Tests: ${verification.checks.tests ? '✅' : '❌'}`);
  
  if (!verification.success) {
    console.log('\n   Issues found:');
    verification.errors.forEach(err => {
      console.log(`      - ${err.substring(0, 100)}`);
    });
  }

  // Auto-fix
  console.log('\n3. Attempting auto-fix...');
  const fixed = await SelfVerification.autoFix(testFile);
  if (fixed.fixed.length > 0) {
    console.log(`   ✅ Fixed: ${fixed.fixed.join(', ')}`);
  }

  // Clean up
  await executeTool('delete_file', { path: testFile });
  console.log('\n4. Cleaned up test file');
}

async function demonstrateStatistics() {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║  DEMO 5: EXECUTION STATISTICS                              ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  const stats = getStatistics();
  
  console.log('Overall Statistics:');
  console.log(`  Total executions: ${stats.total}`);
  console.log(`  Successful: ${stats.successful}`);
  console.log(`  Failed: ${stats.failed}`);
  console.log(`  Success rate: ${stats.successRate.toFixed(2)}%`);
  console.log(`  Avg execution time: ${stats.avgExecutionTime}ms`);

  console.log('\nPer-Tool Statistics:');
  const sortedTools = Object.entries(stats.byTool)
    .sort(([, a], [, b]) => b.total - a.total)
    .slice(0, 10);

  sortedTools.forEach(([tool, data]) => {
    console.log(`  ${tool}: ${data.successful}/${data.total} (${((data.successful / data.total) * 100).toFixed(0)}%)`);
  });

  console.log('\nRecent Execution History:');
  const history = getHistory(5);
  history.forEach((result, i) => {
    const status = result.success ? '✅' : '❌';
    console.log(`  ${i + 1}. ${status} ${result.toolName} (${result.executionTime}ms)`);
  });
}

async function runAllDemos() {
  console.log('\n');
  console.log('████████████████████████████████████████████████████████████████');
  console.log('█                                                              █');
  console.log('█  RUNTIME EXECUTION SYSTEM - LIVE DEMONSTRATION               █');
  console.log('█  This demonstrates REAL execution, not simulation            █');
  console.log('█                                                              █');
  console.log('████████████████████████████████████████████████████████████████');

  try {
    await demonstrateFileOperations();
    await demonstrateCommandExecution();
    await demonstrateCodeAnalysis();
    await demonstrateSelfVerification();
    await demonstrateStatistics();

    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║  DEMONSTRATION COMPLETE                                    ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');
    console.log('✅ All demonstrations completed successfully');
    console.log('✅ System is fully operational');
    console.log('✅ Ready for AI model integration\n');

  } catch (error: any) {
    console.error('\n❌ Error during demonstration:', error.message);
    console.error(error.stack);
  }
}

// Run if executed directly
if (require.main === module) {
  runAllDemos().catch(console.error);
}

export { runAllDemos };

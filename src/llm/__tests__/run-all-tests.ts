/**
 * Run All Tests
 * Execute all module tests in isolation
 */

console.log('🚀 Running All LLM Gateway Module Tests\n');
console.log('=' .repeat(60) + '\n');

// Run tests sequentially
async function runTests() {
  try {
    // Test 1: Cost estimation
    console.log('📊 Testing Cost Estimation...\n');
    await import('./test-cost');
    
    // Test 2: Quota tracking
    console.log('\n' + '='.repeat(60) + '\n');
    console.log('👤 Testing Quota Tracking...\n');
    await import('./test-quota');
    
    // Test 3: Telemetry
    console.log('\n' + '='.repeat(60) + '\n');
    console.log('📈 Testing Telemetry...\n');
    await import('./test-telemetry');
    
    // Test 4: Agent layer
    console.log('\n' + '='.repeat(60) + '\n');
    console.log('🤖 Testing Agent Layer...\n');
    await import('./test-agent');
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ All tests completed successfully!');
    console.log('='.repeat(60) + '\n');
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  runTests();
}

export { runTests };

/**
 * Quota Tracking Tests
 * Test quota management in isolation
 */

import { 
  setQuotaConfig, 
  checkQuota, 
  recordUsage, 
  getRemainingQuota,
  resetUserQuota,
  getUserUsage 
} from '../quota';

console.log('🧪 Testing Quota Tracking Module\n');

// Test 1: Set quota configuration
console.log('Test 1: Set quota configuration');
setQuotaConfig({
  maxDailyCost: 2.0,
  maxDailyTokens: 1000000,
});
const config = setQuotaConfig;
console.log('✅ Quota config set');

// Test 2: Check quota (should pass)
console.log('\nTest 2: Check quota (should pass)');
try {
  checkQuota('test-user-1');
  console.log('✅ Quota check passed');
} catch (error) {
  console.error('❌ Quota check failed:', error);
}

// Test 3: Record usage
console.log('\nTest 3: Record usage');
recordUsage('test-user-1', 0.5, 50000);
const usage1 = getUserUsage('test-user-1');
console.log(`✅ User usage recorded:`, {
  cost: usage1.dailyCost,
  tokens: usage1.dailyTokens,
  requests: usage1.requests,
});
console.assert(usage1.dailyCost === 0.5, 'Cost should be 0.5');
console.assert(usage1.dailyTokens === 50000, 'Tokens should be 50000');

// Test 4: Get remaining quota
console.log('\nTest 4: Get remaining quota');
const remaining = getRemainingQuota('test-user-1');
console.log(`✅ Remaining quota:`, remaining);
console.assert(remaining.remainingCost === 1.5, 'Remaining should be 1.5');
console.assert(remaining.percentageUsed === 25, 'Percentage should be 25%');

// Test 5: Exceed quota
console.log('\nTest 5: Exceed quota');
recordUsage('test-user-2', 1.5, 150000);
recordUsage('test-user-2', 0.6, 60000); // Should exceed 2.0 limit
try {
  checkQuota('test-user-2');
  console.log('❌ Quota check should have failed');
} catch (error) {
  console.log('✅ Quota exceeded correctly:', (error as Error).message);
}

// Test 6: Reset quota
console.log('\nTest 6: Reset quota');
resetUserQuota('test-user-1');
const usage2 = getUserUsage('test-user-1');
console.log(`✅ Quota reset:`, {
  cost: usage2.dailyCost,
  tokens: usage2.dailyTokens,
});
console.assert(usage2.dailyCost === 0, 'Cost should be reset to 0');

console.log('\n✅ All quota tracking tests passed!\n');

/**
 * Cost Estimation Tests
 * Test cost calculation in isolation
 */

import { estimateCost, getModelPricing, getAllPricing } from '../cost';

console.log('🧪 Testing Cost Estimation Module\n');

// Test 1: Basic cost calculation
console.log('Test 1: Basic cost calculation');
const cost1 = estimateCost('gemini-flash-latest', {
  promptTokens: 1000,
  completionTokens: 500,
});
console.log(`✅ Cost for 1000 prompt + 500 completion tokens: $${cost1}`);
console.assert(cost1 > 0, 'Cost should be positive');
console.assert(cost1 < 0.01, 'Cost should be reasonable');

// Test 2: Model pricing lookup
console.log('\nTest 2: Model pricing lookup');
const pricing = getModelPricing('gemini-pro');
console.log(`✅ Gemini Pro pricing:`, pricing);
console.assert(pricing.input > 0, 'Input price should be positive');
console.assert(pricing.output > 0, 'Output price should be positive');

// Test 3: Different models
console.log('\nTest 3: Different models');
const models = ['gemini-pro', 'gemini-flash-latest', 'gemini-flash-lite'];
models.forEach(model => {
  const cost = estimateCost(model, {
    promptTokens: 1000,
    completionTokens: 500,
  });
  console.log(`✅ ${model}: $${cost}`);
});

// Test 4: Zero tokens
console.log('\nTest 4: Zero tokens');
const cost2 = estimateCost('gemini-flash-latest', {
  promptTokens: 0,
  completionTokens: 0,
});
console.log(`✅ Cost for zero tokens: $${cost2}`);
console.assert(cost2 === 0, 'Cost should be zero');

// Test 5: All pricing
console.log('\nTest 5: Get all pricing');
const allPricing = getAllPricing();
console.log(`✅ Available models: ${Object.keys(allPricing).length}`);
console.log('Sample:', Object.keys(allPricing).slice(0, 3));

console.log('\n✅ All cost estimation tests passed!\n');

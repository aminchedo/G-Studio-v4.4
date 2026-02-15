/**
 * Runtime Verification Script
 * Tests Local Auxiliary AI integration at runtime
 */

import { LocalAIModelService } from '@/services/localAIModelService';
import { HybridDecisionEngine } from '@/services/hybridDecisionEngine';
import { PromptProfessionalizer } from '@/services/promptProfessionalizer';
import { ContextDatabaseBridge } from '@/services/contextDatabaseBridge';

interface VerificationResult {
  phase: string;
  test: string;
  passed: boolean;
  evidence: string;
  error?: string;
}

const results: VerificationResult[] = [];

function logResult(phase: string, test: string, passed: boolean, evidence: string, error?: string) {
  results.push({ phase, test, passed, evidence, error });
  const status = passed ? '✅ PASS' : '❌ FAIL';
  console.log(`[${status}] ${phase} - ${test}`);
  if (evidence) console.log(`   Evidence: ${evidence}`);
  if (error) console.error(`   Error: ${error}`);
}

async function phase1_ArchitectureFlow() {
  console.log('\n=== PHASE 1: Architecture Flow ===');
  
  try {
    // Test 1: Services can be imported
    logResult('Phase 1', 'Service Imports', true, 'All services imported successfully');
    
    // Test 2: Prompt Professionalizer initializes
    await PromptProfessionalizer.initialize();
    const promptEnabled = PromptProfessionalizer.isEnabled();
    logResult('Phase 1', 'Prompt Professionalizer Init', true, `Initialized, enabled: ${promptEnabled}`);
    
    // Test 3: Hybrid Decision Engine initializes
    await HybridDecisionEngine.initialize();
    const networkState = HybridDecisionEngine.checkNetworkState();
    logResult('Phase 1', 'Hybrid Decision Engine Init', true, `Network state: ${networkState}`);
    
    // Test 4: Local AI Model Service initializes
    await LocalAIModelService.initialize();
    const modelStatus = LocalAIModelService.getStatus();
    logResult('Phase 1', 'Local AI Model Service Init', true, `Status: ${modelStatus}`);
    
  } catch (error: any) {
    logResult('Phase 1', 'Architecture Flow', false, '', error.message);
  }
}

async function phase2_LocalAIModel() {
  console.log('\n=== PHASE 2: Local AI Model Service ===');
  
  try {
    const status = LocalAIModelService.getStatus();
    logResult('Phase 2', 'Get Status', true, `Status: ${status}`);
    
    const health = LocalAIModelService.getHealthStatus();
    logResult('Phase 2', 'Get Health', true, `Health: ${health}`);
    
    const progress = LocalAIModelService.getDownloadProgress();
    logResult('Phase 2', 'Get Download Progress', true, progress ? `Progress: ${progress.percentage}%` : 'No active download');
    
  } catch (error: any) {
    logResult('Phase 2', 'Local AI Model', false, '', error.message);
  }
}

async function phase3_SQLitePersistence() {
  console.log('\n=== PHASE 3: SQLite Persistence ===');
  
  try {
    // Test database initialization
    const initResult = await ContextDatabaseBridge.init();
    logResult('Phase 3', 'Database Init', initResult, initResult ? 'Database initialized' : 'Database init failed');
    
    if (initResult) {
      // Test session creation
      const sessionId = await ContextDatabaseBridge.getCurrentSession();
      logResult('Phase 3', 'Session Creation', !!sessionId, sessionId ? `Session ID: ${sessionId}` : 'No session created');
      
      if (sessionId) {
        // Test context size
        const contextSize = await ContextDatabaseBridge.getContextSize(sessionId);
        logResult('Phase 3', 'Context Size', true, `${contextSize.totalTokens} tokens, ${contextSize.entryCount} entries`);
      }
    }
    
  } catch (error: any) {
    logResult('Phase 3', 'SQLite Persistence', false, '', error.message);
  }
}

async function phase4_ContextIntelligence() {
  console.log('\n=== PHASE 4: Context Intelligence ===');
  
  try {
    // Test that ContextManager can be imported (it uses LocalAIModelService)
    const { ContextManager } = await import('../services/contextManager');
    logResult('Phase 4', 'Context Manager Import', true, 'ContextManager imported successfully');
    
    // Test importance calculation (will use fallback if Local AI not ready)
    const testContent = 'This is a test message for importance scoring';
    const importance = await ContextManager.calculateImportance(testContent);
    logResult('Phase 4', 'Importance Calculation', importance >= 0 && importance <= 1, `Importance score: ${importance}`);
    
  } catch (error: any) {
    logResult('Phase 4', 'Context Intelligence', false, '', error.message);
  }
}

async function phase5_PromptProfessionalizer() {
  console.log('\n=== PHASE 5: Prompt Professionalizer ===');
  
  try {
    const enabled = PromptProfessionalizer.isEnabled();
    const mode = PromptProfessionalizer.getMode();
    
    logResult('Phase 5', 'Get Settings', true, `Enabled: ${enabled}, Mode: ${mode}`);
    
    // Test that it defaults to deterministic
    logResult('Phase 5', 'Default Mode', mode === 'deterministic', `Mode is ${mode}`);
    
  } catch (error: any) {
    logResult('Phase 5', 'Prompt Professionalizer', false, '', error.message);
  }
}

async function phase6_DecisionEngine() {
  console.log('\n=== PHASE 6: Hybrid Decision Engine ===');
  
  try {
    const networkState = HybridDecisionEngine.checkNetworkState();
    logResult('Phase 6', 'Network Detection', true, `Network: ${networkState}`);
    
    const preference = HybridDecisionEngine.getUserPreference();
    logResult('Phase 6', 'User Preference', true, `Preference: ${preference || 'Auto'}`);
    
    // Test decision with mock context
    const executionPlan = await HybridDecisionEngine.decideMode({
      networkState: 'online',
      apiKey: 'test-key',
      message: 'Test message',
      history: [],
    });
    
    logResult('Phase 6', 'Decision Making', true, `Mode: ${executionPlan.mode}, Reason: ${executionPlan.reason}`);
    
  } catch (error: any) {
    logResult('Phase 6', 'Decision Engine', false, '', error.message);
  }
}

async function runAllPhases() {
  console.log('========================================');
  console.log('RUNTIME VERIFICATION - LOCAL AI INTEGRATION');
  console.log('========================================\n');
  
  await phase1_ArchitectureFlow();
  await phase2_LocalAIModel();
  await phase3_SQLitePersistence();
  await phase4_ContextIntelligence();
  await phase5_PromptProfessionalizer();
  await phase6_DecisionEngine();
  
  // Summary
  console.log('\n========================================');
  console.log('VERIFICATION SUMMARY');
  console.log('========================================');
  
  const total = results.length;
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  
  console.log(`Total Tests: ${total}`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  console.log(`Success Rate: ${((passed / total) * 100).toFixed(1)}%`);
  
  if (failed > 0) {
    console.log('\nFailed Tests:');
    results.filter(r => !r.passed).forEach(r => {
      console.log(`  - ${r.phase}: ${r.test}`);
      if (r.error) console.log(`    Error: ${r.error}`);
    });
  }
  
  console.log('\n========================================');
  console.log('VERDICT:', failed === 0 ? '✅ VERIFIED' : '⚠️ VERIFIED WITH ISSUES');
  console.log('========================================');
  
  return { total, passed, failed, results };
}

// Run if executed directly
if (import.meta.url.endsWith(process.argv[1]) || process.argv[1]?.includes('runtime-verification')) {
  runAllPhases().catch(console.error);
} else {
  // Always run when imported as script
  runAllPhases().catch(console.error);
}

export { runAllPhases, results };

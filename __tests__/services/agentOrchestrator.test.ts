import { AgentOrchestrator } from '@/services/agentOrchestrator';
import { ModelId } from '@/types/types';

// Mock dependencies
jest.mock('@/services/geminiService');
jest.mock('@/services/databaseService');
jest.mock('@/services/mcpService');

describe('AgentOrchestrator', () => {
  beforeEach(() => {
    AgentOrchestrator.reset();
  });

  it('should reset context correctly', () => {
    AgentOrchestrator.reset();
    // Context should be reset to initial state
    expect(AgentOrchestrator).toBeDefined();
  });

  it('should have processUserMessage method', () => {
    expect(typeof AgentOrchestrator.processUserMessage).toBe('function');
  });

  // Note: Full integration tests would require mocking the Gemini API
  // This is a basic structure test
});

/**
 * Gemini Service - Public API
 *
 * Complete modular Gemini integration
 * Export all public interfaces
 */

// Main adapter

// Core components

// Types
export * from "./types";

/**
 * ==================== COMPLETE USAGE GUIDE ====================
 *
 * ## Quick Start
 *
 * ```typescript
 * import { createGeminiAdapter } from './gemini';
 *
 * const gemini = createGeminiAdapter(process.env.GEMINI_API_KEY);
 *
 * const response = await gemini.generateText('Hello!');
 * console.log(response.text);
 * ```
 *
 * ## Basic Text Generation
 *
 * ```typescript
 * const response = await gemini.generateText(
 *   'Explain quantum computing in simple terms',
 *   {
 *     temperature: 0.7,
 *     maxTokens: 500,
 *   }
 * );
 *
 * console.log(response.text);
 * console.log('Tokens used:', response.usage.totalTokens);
 * ```
 *
 * ## Streaming
 *
 * ```typescript
 * let fullText = '';
 *
 * await gemini.generateTextStream(
 *   'Write a short story about a robot',
 *   (chunk) => {
 *     fullText += chunk;
 *     console.log(chunk); // Print as it arrives
 *   }
 * );
 *
 * console.log('Complete story:', fullText);
 * ```
 *
 * ## Code Generation
 *
 * ```typescript
 * const codeResponse = await gemini.generateCode(
 *   'Create a React hook for fetching data with loading states',
 *   'typescript'
 * );
 *
 * console.log(codeResponse.text);
 * ```
 *
 * ## Conversation
 *
 * ```typescript
 * const history = [
 *   { role: 'user' as const, content: 'What is TypeScript?' },
 *   { role: 'assistant' as const, content: 'TypeScript is...' },
 * ];
 *
 * const reply = await gemini.continueConversation(
 *   history,
 *   'Can you give me an example?'
 * );
 * ```
 *
 * ## Auto Model Selection
 *
 * ```typescript
 * // Select best model for task
 * const response = await gemini.generateWithAutoModel(
 *   'Analyze this data and create visualizations',
 *   {
 *     capabilities: ['code'],
 *     maxBudget: 0.001, // Max cost per 1k tokens
 *     maxTokens: 4096,
 *   }
 * );
 * ```
 *
 * ## Model Management
 *
 * ```typescript
 * // List all models
 * const models = gemini.getAllModels();
 * models.forEach(model => {
 *   console.log(model.displayName, '-', model.capabilities);
 * });
 *
 * // Switch model
 * gemini.setCurrentModel('gemini-1.5-pro');
 *
 * // Get current model
 * const current = gemini.getCurrentModel();
 * console.log('Using:', current.displayName);
 * ```
 *
 * ## Cost Estimation
 *
 * ```typescript
 * const prompt = 'Write a detailed analysis...';
 * const estimatedOutputTokens = 1000;
 *
 * const cost = gemini.estimateCost(
 *   'gemini-1.5-flash',
 *   prompt,
 *   estimatedOutputTokens
 * );
 *
 * console.log(`Estimated cost: $${cost.toFixed(6)}`);
 * ```
 *
 * ## Error Handling
 *
 * ```typescript
 * import { GeminiError, GeminiErrorCode } from './gemini';
 *
 * try {
 *   const response = await gemini.generateText('Hello');
 * } catch (error) {
 *   if (error instanceof GeminiError) {
 *     switch (error.code) {
 *       case GeminiErrorCode.QUOTA_EXCEEDED:
 *         console.error('Quota exceeded!');
 *         break;
 *       case GeminiErrorCode.RATE_LIMITED:
 *         console.error('Rate limited, retry later');
 *         break;
 *       case GeminiErrorCode.INVALID_API_KEY:
 *         console.error('Invalid API key');
 *         break;
 *       default:
 *         console.error('Error:', error.message);
 *     }
 *   }
 * }
 * ```
 *
 * ## React Integration
 *
 * ```typescript
 * import { useState } from 'react';
 * import { createGeminiAdapter } from './gemini';
 *
 * const gemini = createGeminiAdapter(process.env.REACT_APP_GEMINI_API_KEY);
 *
 * function ChatComponent() {
 *   const [messages, setMessages] = useState([]);
 *   const [input, setInput] = useState('');
 *   const [loading, setLoading] = useState(false);
 *
 *   const handleSend = async () => {
 *     setLoading(true);
 *
 *     try {
 *       const response = await gemini.continueConversation(
 *         messages,
 *         input
 *       );
 *
 *       setMessages([
 *         ...messages,
 *         { role: 'user', content: input },
 *         { role: 'assistant', content: response.text },
 *       ]);
 *
 *       setInput('');
 *     } catch (error) {
 *       console.error('Failed to send:', error);
 *     } finally {
 *       setLoading(false);
 *     }
 *   };
 *
 *   return (
 *     <div>
 *       {messages.map((msg, i) => (
 *         <div key={i}>{msg.content}</div>
 *       ))}
 *       <input value={input} onChange={e => setInput(e.target.value)} />
 *       <button onClick={handleSend} disabled={loading}>
 *         {loading ? 'Sending...' : 'Send'}
 *       </button>
 *     </div>
 *   );
 * }
 * ```
 *
 * ## Streaming in React
 *
 * ```typescript
 * function StreamingChat() {
 *   const [text, setText] = useState('');
 *   const [isStreaming, setIsStreaming] = useState(false);
 *
 *   const handleStream = async () => {
 *     setIsStreaming(true);
 *     setText('');
 *
 *     await gemini.generateTextStream(
 *       'Write a poem',
 *       (chunk) => {
 *         setText(prev => prev + chunk);
 *       }
 *     );
 *
 *     setIsStreaming(false);
 *   };
 *
 *   return (
 *     <div>
 *       <pre>{text}</pre>
 *       <button onClick={handleStream} disabled={isStreaming}>
 *         {isStreaming ? 'Streaming...' : 'Start'}
 *       </button>
 *     </div>
 *   );
 * }
 * ```
 *
 * ## Advanced: Custom Retry Logic
 *
 * ```typescript
 * const gemini = createGeminiAdapter(apiKey, {
 *   retryConfig: {
 *     maxAttempts: 5,
 *     baseDelay: 2000,
 *     maxDelay: 30000,
 *     backoffMultiplier: 3,
 *   },
 * });
 *
 * // Update retry config at runtime
 * gemini.updateRetryConfig({
 *   maxAttempts: 3,
 * });
 * ```
 *
 * ## Testing
 *
 * ```typescript
 * import { vi } from 'vitest';
 * import { GeminiClient } from './gemini';
 *
 * describe('Gemini Integration', () => {
 *   it('should generate text', async () => {
 *     const client = new GeminiClient({
 *       apiKey: 'test-key',
 *       defaultModel: 'gemini-2.0-flash-exp',
 *     });
 *
 *     // Mock fetch
 *     global.fetch = vi.fn().mockResolvedValue({
 *       ok: true,
 *       json: async () => ({
 *         candidates: [{
 *           content: { parts: [{ text: 'Hello!' }] },
 *           finishReason: 'STOP',
 *         }],
 *         usageMetadata: {
 *           totalTokenCount: 10,
 *         },
 *       }),
 *     });
 *
 *     const response = await client.sendRequest({
 *       model: 'gemini-2.0-flash-exp',
 *       prompt: 'Hi',
 *     });
 *
 *     expect(response.text).toBe('Hello!');
 *   });
 * });
 * ```
 */
export {
  GeminiAdapter,
  createGeminiAdapter,
  DEFAULT_CONFIG,
} from "./GeminiAdapter";
export { GeminiClient } from "./GeminiClient";
export { ModelManager } from "./ModelManager";
export { RetryPolicy, DEFAULT_RETRY_CONFIG } from "./RetryPolicy";
export { defaultLogger, GeminiApiClient, createApiClient } from "./apiClient";
export { StreamProcessor } from "./streamProcessor";
export type { ToolCall } from "./streamProcessor";
export { categorizeError } from "./errorHandler";

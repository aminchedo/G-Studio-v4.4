import { GeminiService } from '@/services/geminiService';

// Mock fetch
global.fetch = jest.fn();

describe('GeminiService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockReset();
  });

  describe('Initialization', () => {
    it('should initialize with API key', () => {
      const service = new GeminiService('test-api-key');
      expect(service).toBeInstanceOf(GeminiService);
    });

    it('should throw error without API key', () => {
      expect(() => new GeminiService('')).toThrow();
    });
  });

  describe('Content Generation', () => {
    it('should generate content successfully', async () => {
      const mockResponse = {
        candidates: [
          {
            content: {
              parts: [{ text: 'Generated response' }]
            }
          }
        ]
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const service = new GeminiService('test-key');
      const result = await service.generateContent('Test prompt');

      expect(result).toContain('Generated response');
    });

    it('should handle API errors', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error'
      });

      const service = new GeminiService('test-key');
      
      await expect(service.generateContent('Test')).rejects.toThrow();
    });

    it('should handle network errors', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      const service = new GeminiService('test-key');
      
      await expect(service.generateContent('Test')).rejects.toThrow('Network error');
    });
  });

  describe('Streaming', () => {
    it('should support streaming responses', async () => {
      const mockStream = {
        getReader: () => ({
          read: jest.fn()
            .mockResolvedValueOnce({
              done: false,
              value: new TextEncoder().encode('data: {"text":"Hello "}\n')
            })
            .mockResolvedValueOnce({
              done: false,
              value: new TextEncoder().encode('data: {"text":"World"}\n')
            })
            .mockResolvedValueOnce({
              done: true
            })
        })
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        body: mockStream
      });

      const service = new GeminiService('test-key');
      const chunks: string[] = [];
      
      await service.streamContent('Test', (chunk) => {
        chunks.push(chunk);
      });

      expect(chunks.length).toBeGreaterThan(0);
    });
  });

  describe('Error Recovery', () => {
    it('should retry on rate limit', async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: false,
          status: 429,
          statusText: 'Too Many Requests'
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            candidates: [{ content: { parts: [{ text: 'Success' }] } }]
          })
        });

      const service = new GeminiService('test-key');
      const result = await service.generateContent('Test');

      expect(result).toContain('Success');
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    it('should respect retry limits', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 429
      });

      const service = new GeminiService('test-key');
      
      await expect(service.generateContent('Test')).rejects.toThrow();
    });
  });

  describe('Rate Limiting', () => {
    it('should track token usage', async () => {
      const mockResponse = {
        candidates: [{ content: { parts: [{ text: 'Response' }] } }],
        usageMetadata: {
          promptTokenCount: 10,
          candidatesTokenCount: 5,
          totalTokenCount: 15
        }
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const service = new GeminiService('test-key');
      await service.generateContent('Test');

      const usage = service.getTokenUsage();
      expect(usage.total).toBe(15);
    });

    it('should enforce token limits', async () => {
      const service = new GeminiService('test-key', { maxTokens: 10 });
      
      const longPrompt = 'word '.repeat(1000);
      
      await expect(service.generateContent(longPrompt)).rejects.toThrow(/token limit/i);
    });
  });
});

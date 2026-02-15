/**
 * Gemini Gateway Provider
 * Implements Gemini-specific API calls using @google/genai SDK
 * This is a provider implementation for the gateway abstraction layer
 * 
 * ⚠️ CRITICAL WARNING: This gateway BYPASSES API Model Test enforcement!
 * 
 * DO NOT USE THIS GATEWAY FOR USER-FACING REQUESTS.
 * This gateway is ONLY for internal/testing purposes.
 * 
 * For production Gemini calls, use GeminiService.streamChat() which enforces:
 * - API Model Test execution check
 * - usableModels validation
 * - rejected model blocking
 * - FatalAIError propagation
 * 
 * Using this gateway directly will:
 * - Bypass quota safety checks
 * - Allow rejected models to be used
 * - Waste API quota on invalid requests
 */

import { GoogleGenAI, GenerateContentResponse, UsageMetadata, Part } from '@google/genai';
import { GatewayConfig, GatewayResponse } from '../gateway';
import { LLMRequest } from '@/types';

/**
 * ⛔ DEPRECATED: Direct Gemini API call - BYPASSES API Model Test enforcement
 * 
 * This function is ONLY for internal testing and should NOT be used for
 * user-facing requests. Use GeminiService.streamChat() instead.
 * 
 * @deprecated Use GeminiService.streamChat() for production requests
 */
export async function callGeminiGateway(
  config: GatewayConfig,
  request: LLMRequest
): Promise<GatewayResponse> {
  // ⚠️ WARNING: This call bypasses API Model Test enforcement
  console.warn('[GeminiGateway] WARNING: Direct gateway call bypasses API Model Test enforcement. Use GeminiService.streamChat() for production requests.');
  
  const { apiKey, model, systemInstruction } = config;
  const { userInput, image, history = [] } = request;

  if (!apiKey || apiKey.trim() === '') {
    throw new Error('Gemini API key is required');
  }

  try {
    // Initialize Gemini SDK
    if (typeof GoogleGenAI === "undefined") {
      throw new Error(
        "GoogleGenAI SDK is not available in this runtime (likely the browser). Gemini API calls must run server-side or via a proxy."
      );
    }
    if (typeof GoogleGenAI === "undefined") {
      throw new Error(
        "GoogleGenAI SDK is not available in this runtime (likely the browser). Gemini API calls must run server-side or via a proxy."
      );
    }
    const ai = new GoogleGenAI({ apiKey });

    // Build content parts
    const parts: Part[] = [];

    // Add image if provided
    if (image) {
      const base64Data = image.includes(',') ? image.split(',')[1] : image;
      parts.push({
        inlineData: {
          mimeType: 'image/jpeg',
          data: base64Data,
        },
      });
    }

    // Add text content
    if (userInput) {
      parts.push({ text: userInput });
    }

    if (parts.length === 0) {
      throw new Error('No content provided (text or image required)');
    }

    // Build contents array with history
    const contents: Array<{ role: 'user' | 'model'; parts: Part[] }> = [];

    // Add history if provided (simple format conversion)
    if (history.length > 0) {
      // Convert history strings to alternating user/model messages
      // This is a simplified conversion - in production, you might want more sophisticated handling
      for (let i = 0; i < history.length; i++) {
        const role = i % 2 === 0 ? 'user' : 'model';
        contents.push({
          role,
          parts: [{ text: history[i] }],
        });
      }
    }

    // Add current message
    contents.push({
      role: 'user',
      parts,
    });

    // Check if Gemini 3.0 model (for thinking config)
    const isGemini3 = model.startsWith('gemini-3');

    // Build generationConfig according to Google API documentation
    // https://ai.google.dev/api/generate-content#generationconfig
    const generationConfig = {
      temperature: 0.9, // Standard creative temperature per Google docs
      topP: 0.95, // Standard nucleus sampling per Google docs
      maxOutputTokens: 8192, // Safe default (should use get_model to determine actual limit)
      candidateCount: 1 // Single candidate (standard)
    };

    // Call Gemini API
    const response = await ai.models.generateContent({
      model,
      contents,
      config: {
        systemInstruction: systemInstruction || undefined,
        generationConfig: generationConfig, // CRITICAL: Add generationConfig per Google API docs
        // Enable thinking for Gemini 3.0 models
        ...(isGemini3 ? {
          thinkingConfig: {
            thinkingBudget: model.includes('pro') ? 32768 : 16384,
          },
        } : {}),
      },
    });

    // Extract response data
    const responseData = response as GenerateContentResponse;
    const text = responseData.text || '';
    const usage = responseData.usageMetadata;

    // Parse tool calls if present
    const toolCalls: any[] = [];
    if (responseData.functionCalls) {
      for (const fc of responseData.functionCalls) {
        toolCalls.push({
          name: fc.name,
          args: fc.args,
        });
      }
    }

    return {
      text,
      usage: usage ? {
        promptTokens: usage.promptTokenCount,
        completionTokens: usage.candidatesTokenCount,
        totalTokens: usage.totalTokenCount,
      } : undefined,
      toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
    };
  } catch (error) {
    // Re-throw with context for proper error handling upstream
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Gemini gateway error: ${errorMessage}`);
  }
}

/**
 * ⛔ DEPRECATED: Stream response from Gemini API - BYPASSES API Model Test enforcement
 * 
 * This function is ONLY for internal testing and should NOT be used for
 * user-facing requests. Use GeminiService.streamChat() instead.
 * 
 * @deprecated Use GeminiService.streamChat() for production requests
 */
export async function* streamGeminiGateway(
  config: GatewayConfig,
  request: LLMRequest
): AsyncGenerator<string, void, unknown> {
  // ⚠️ WARNING: This call bypasses API Model Test enforcement
  console.warn('[GeminiGateway] WARNING: Direct gateway streaming call bypasses API Model Test enforcement. Use GeminiService.streamChat() for production requests.');
  
  const { apiKey, model, systemInstruction } = config;
  const { userInput, image, history = [] } = request;

  if (!apiKey || apiKey.trim() === '') {
    throw new Error('Gemini API key is required');
  }

  try {
    // Initialize Gemini SDK
    const ai = new GoogleGenAI({ apiKey });

    // Build content parts
    const parts: Part[] = [];

    // Add image if provided
    if (image) {
      const base64Data = image.includes(',') ? image.split(',')[1] : image;
      parts.push({
        inlineData: {
          mimeType: 'image/jpeg',
          data: base64Data,
        },
      });
    }

    // Add text content
    if (userInput) {
      parts.push({ text: userInput });
    }

    if (parts.length === 0) {
      throw new Error('No content provided (text or image required)');
    }

    // Build contents array with history
    const contents: Array<{ role: 'user' | 'model'; parts: Part[] }> = [];

    // Add history if provided
    if (history.length > 0) {
      for (let i = 0; i < history.length; i++) {
        const role = i % 2 === 0 ? 'user' : 'model';
        contents.push({
          role,
          parts: [{ text: history[i] }],
        });
      }
    }

    // Add current message
    contents.push({
      role: 'user',
      parts,
    });

    // Check if Gemini 3.0 model
    const isGemini3 = model.startsWith('gemini-3');

    // Build generationConfig according to Google API documentation
    // https://ai.google.dev/api/generate-content#generationconfig
    const generationConfig = {
      temperature: 0.9, // Standard creative temperature per Google docs
      topP: 0.95, // Standard nucleus sampling per Google docs
      maxOutputTokens: 8192, // Safe default (should use get_model to determine actual limit)
      candidateCount: 1 // Single candidate (standard)
    };

    // Stream response from Gemini API
    const responseStream = await ai.models.generateContentStream({
      model,
      contents,
      config: {
        systemInstruction: systemInstruction || undefined,
        generationConfig: generationConfig, // CRITICAL: Add generationConfig per Google API docs
        // Enable thinking for Gemini 3.0 models
        ...(isGemini3 ? {
          thinkingConfig: {
            thinkingBudget: model.includes('pro') ? 32768 : 16384,
          },
        } : {}),
      },
    });

    // Yield text chunks as they arrive
    for await (const chunk of responseStream) {
      const responseData = chunk as GenerateContentResponse;
      const text = responseData.text || '';
      if (text) {
        yield text;
      }
    }
  } catch (error) {
    // Re-throw with context for proper error handling upstream
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Gemini gateway streaming error: ${errorMessage}`);
  }
}

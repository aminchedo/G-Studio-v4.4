/**
 * Gemini Service Type Exports
 *
 * This module encapsulates all SDK type imports and re-exports them
 * to maintain architectural boundaries. All application code should
 * import types from this module instead of directly from SDK packages.
 *
 * ARCHITECTURAL RULE: Only this file and createGenAIClient.ts may import from @google/genai or @google/generative-ai
 */

// Import types from SDK packages (internal to service layer only)
import type {
  FunctionDeclaration as GenAIFunctionDeclaration,
  Content as GenAIContent,
  Part as GenAIPart,
  GenerateContentResponse as GenAIGenerateContentResponse,
  UsageMetadata as GenAIUsageMetadata,
} from "@google/genai";
// Type is a value/enum, not a type, so import as value
import { Type as GenAIType } from "@google/genai";

import type {
  Content as GenerativeAIContentType,
  Part as GenerativeAIPartType,
  GenerateContentResult as GenerativeAIGenerateContentResultType,
} from "@google/generative-ai";

// Re-export types with consistent naming
// Prefer @google/genai types for compatibility with existing code
export type FunctionDeclaration = GenAIFunctionDeclaration;
export const Type = GenAIType;
export type Content = GenAIContent;
export type Part = GenAIPart;
export type GenerateContentResponse = GenAIGenerateContentResponse;
export type UsageMetadata = GenAIUsageMetadata;

// Also export @google/generative-ai types for compatibility (aliased)
export type GenerativeAIContent = GenerativeAIContentType;
export type GenerativeAIPart = GenerativeAIPartType;
export type GenerativeAIGenerateContentResult =
  GenerativeAIGenerateContentResultType;

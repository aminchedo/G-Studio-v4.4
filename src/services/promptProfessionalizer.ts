/**
 * Prompt Professionalizer
 * 
 * Uses local AI to normalize and structure user prompts:
 * - Normalize intent
 * - Structure tasks
 * - Remove ambiguity
 * - Preserve meaning
 */

import { LocalAIModelService } from './localAIModelService';
import { SecureStorage } from './secureStorage';

export type ProfessionalizationMode = 'deterministic' | 'creative';

interface ProfessionalizationOptions {
  mode?: ProfessionalizationMode;
  preserveOriginal?: boolean;
}

interface ProfessionalizedPrompt {
  original: string;
  professionalized: string;
  task?: string;
  constraints?: string[];
  files?: string[];
  context?: string;
}

class PromptProfessionalizer {
  private static enabled: boolean = false;
  private static mode: ProfessionalizationMode = 'deterministic';
  private static initialized: boolean = false;

  /**
   * Initialize and load settings
   */
  static async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      const settings = await SecureStorage.getItem('gstudio_prompt_professionalizer');
      if (settings) {
        this.enabled = settings.enabled || false;
        this.mode = settings.mode || 'deterministic';
      }
      this.initialized = true;
      console.log('[PromptProfessionalizer] Initialized');
      console.log(`[PROMPT_OPT]: ${this.enabled ? 'enabled' : 'disabled'}`);
      console.log(`[PROMPT_MODE]: ${this.mode.toUpperCase()}`);
    } catch (error) {
      console.warn('[PromptProfessionalizer] Failed to load settings, using defaults');
      this.initialized = true;
    }
  }

  /**
   * Check if professionalization is enabled
   */
  static isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Enable or disable professionalization
   */
  static async setEnabled(enabled: boolean): Promise<void> {
    this.enabled = enabled;
    await this.saveSettings();
    console.log(`[PROMPT_OPT]: ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Get current mode
   */
  static getMode(): ProfessionalizationMode {
    return this.mode;
  }

  /**
   * Set professionalization mode
   */
  static async setMode(mode: ProfessionalizationMode): Promise<void> {
    this.mode = mode;
    await this.saveSettings();
    console.log(`[PROMPT_MODE]: ${mode.toUpperCase()}`);
  }

  /**
   * Save settings
   */
  private static async saveSettings(): Promise<void> {
    try {
      await SecureStorage.setItem('gstudio_prompt_professionalizer', {
        enabled: this.enabled,
        mode: this.mode,
      });
    } catch (error) {
      console.error('[PromptProfessionalizer] Failed to save settings:', error);
    }
  }

  /**
   * Professionalize a prompt
   */
  static async professionalize(
    prompt: string,
    options: ProfessionalizationOptions = {}
  ): Promise<ProfessionalizedPrompt> {
    if (!this.enabled) {
      return {
        original: prompt,
        professionalized: prompt,
      };
    }

    const mode = options.mode || this.mode;
    const isDeterministic = mode === 'deterministic';

    // Check if local AI is available
    const localAIStatus = LocalAIModelService.getStatus();
    if (localAIStatus !== 'READY') {
      console.warn('[PromptProfessionalizer] Local AI not ready, returning original prompt');
      return {
        original: prompt,
        professionalized: prompt,
      };
    }

    try {
      const systemPrompt = isDeterministic
        ? `You are a prompt normalizer. Your task is to structure user prompts into a clear, unambiguous format while preserving the EXACT original meaning. Do NOT expand intent, add speculative details, or embellish. Only normalize structure and remove ambiguity.

Output format:
TASK: [clear task description - preserve exact user intent]
CONSTRAINTS: [list of constraints mentioned by user - only if explicitly stated]
FILES: [relevant files mentioned - only if explicitly stated]
CONTEXT: [minimal context needed - only if user provided context]

Rules:
- Preserve exact user meaning
- No intent expansion
- No speculative additions
- No stylistic embellishment
- Only structure what the user provided`
        : `You are a prompt enhancer. Your task is to improve user prompts by clarifying intent, adding helpful context, and structuring them for better AI understanding.

Output format:
TASK: [clear, enhanced task description]
CONSTRAINTS: [inferred and explicit constraints]
FILES: [relevant files - inferred from context if helpful]
CONTEXT: [helpful context for understanding the task]

Rules:
- Enhance clarity while preserving core intent
- Add helpful context when beneficial
- Structure for better AI comprehension`;

      const result = await LocalAIModelService.infer(
        `Normalize this prompt:\n\n${prompt}`,
        {
          systemPrompt,
          maxTokens: 256,
          timeout: 10000,
          temperature: isDeterministic ? 0.3 : 0.7,
        }
      );

      const professionalized = result.text.trim();
      
      // Parse structured output
      const parsed = this.parseStructuredOutput(professionalized);

      console.log('[PromptProfessionalizer] Prompt professionalized');
      console.log(`[PROMPT_MODE]: ${mode.toUpperCase()}`);

      return {
        original: prompt,
        professionalized: parsed.task || professionalized,
        task: parsed.task,
        constraints: parsed.constraints,
        files: parsed.files,
        context: parsed.context,
      };
    } catch (error) {
      console.error('[PromptProfessionalizer] Professionalization failed:', error);
      // Return original on error
      return {
        original: prompt,
        professionalized: prompt,
      };
    }
  }

  /**
   * Parse structured output from AI
   */
  private static parseStructuredOutput(text: string): {
    task?: string;
    constraints?: string[];
    files?: string[];
    context?: string;
  } {
    const result: {
      task?: string;
      constraints?: string[];
      files?: string[];
      context?: string;
    } = {};

    // Extract TASK
    const taskMatch = text.match(/TASK:\s*(.+?)(?:\n|CONSTRAINTS:|FILES:|CONTEXT:|$)/is);
    if (taskMatch) {
      result.task = taskMatch[1].trim();
    }

    // Extract CONSTRAINTS
    const constraintsMatch = text.match(/CONSTRAINTS:\s*(.+?)(?:\n|FILES:|CONTEXT:|$)/is);
    if (constraintsMatch) {
      result.constraints = constraintsMatch[1]
        .split(/[,\n]/)
        .map(c => c.trim())
        .filter(c => c.length > 0);
    }

    // Extract FILES
    const filesMatch = text.match(/FILES:\s*(.+?)(?:\n|CONTEXT:|$)/is);
    if (filesMatch) {
      result.files = filesMatch[1]
        .split(/[,\n]/)
        .map(f => f.trim())
        .filter(f => f.length > 0);
    }

    // Extract CONTEXT
    const contextMatch = text.match(/CONTEXT:\s*(.+?)$/is);
    if (contextMatch) {
      result.context = contextMatch[1].trim();
    }

    return result;
  }

  /**
   * Preview professionalization (without applying)
   */
  static async preview(prompt: string): Promise<ProfessionalizedPrompt> {
    return this.professionalize(prompt, { preserveOriginal: true });
  }

  /**
   * Simple normalization (no AI, just basic cleanup)
   */
  static normalize(prompt: string): string {
    // Basic normalization without AI
    return prompt
      .trim()
      .replace(/\s+/g, ' ')
      .replace(/\n{3,}/g, '\n\n');
  }
}

// Initialize on import
PromptProfessionalizer.initialize().catch(console.error);

export { PromptProfessionalizer };

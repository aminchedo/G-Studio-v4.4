/**
 * Adversarial Prompt Detection
 * 
 * Lightweight classifier to detect adversarial inputs before task decomposition.
 */

export type AdversarialType = 
  | 'PROMPT_INJECTION'
  | 'PERMISSION_ESCALATION'
  | 'INSTRUCTION_OVERRIDE'
  | 'RECURSIVE_SELF_MODIFICATION'
  | 'NONE';

export interface AdversarialDetectionResult {
  isAdversarial: boolean;
  type: AdversarialType;
  confidence: number; // 0-1
  reason: string;
  indicators: string[];
}

export class AdversarialDetector {
  private static readonly CONFIDENCE_THRESHOLD = 0.7;
  
  // Patterns for detection
  private static readonly PROMPT_INJECTION_PATTERNS = [
    /ignore\s+(previous|all|above)\s+instructions?/i,
    /forget\s+(everything|all|previous)/i,
    /new\s+instructions?:/i,
    /system\s+prompt/i,
    /override\s+instructions?/i,
    /disregard\s+(previous|all)/i,
  ];

  private static readonly PERMISSION_ESCALATION_PATTERNS = [
    /enable\s+(all|full|unrestricted)\s+permissions?/i,
    /remove\s+(restrictions?|limits?|safety)/i,
    /bypass\s+(security|safety|guardrails?)/i,
    /disable\s+(autonomous|safety|guardrails?)/i,
    /grant\s+(admin|root|full)\s+access/i,
    /elevate\s+privileges?/i,
  ];

  private static readonly INSTRUCTION_OVERRIDE_PATTERNS = [
    /change\s+(your|the)\s+(goal|objective|purpose)/i,
    /modify\s+(your|the)\s+(behavior|instructions?)/i,
    /act\s+as\s+(if|though)\s+you\s+are/i,
    /pretend\s+(to\s+be|that)/i,
    /simulate\s+(being|acting)/i,
  ];

  private static readonly RECURSIVE_SELF_MODIFICATION_PATTERNS = [
    /modify\s+(yourself|your\s+code|your\s+system)/i,
    /change\s+(your|the)\s+(own|self|autonomous)/i,
    /update\s+(your|the)\s+(own|internal)/i,
    /rewrite\s+(your|the)\s+(own|code|system)/i,
    /alter\s+(your|the)\s+(own|behavior|system)/i,
  ];

  /**
   * Detect adversarial patterns in prompt
   */
  static detect(prompt: string): AdversarialDetectionResult {
    const indicators: string[] = [];
    let maxConfidence = 0;
    let detectedType: AdversarialType = 'NONE';
    let reason = 'No adversarial patterns detected';

    // Check for prompt injection
    const promptInjectionMatches = this.checkPatterns(prompt, this.PROMPT_INJECTION_PATTERNS);
    if (promptInjectionMatches.length > 0) {
      indicators.push(...promptInjectionMatches);
      const confidence = Math.min(0.9, 0.5 + (promptInjectionMatches.length * 0.1));
      if (confidence > maxConfidence) {
        maxConfidence = confidence;
        detectedType = 'PROMPT_INJECTION';
        reason = `Detected ${promptInjectionMatches.length} prompt injection pattern(s)`;
      }
    }

    // Check for permission escalation
    const permissionEscalationMatches = this.checkPatterns(prompt, this.PERMISSION_ESCALATION_PATTERNS);
    if (permissionEscalationMatches.length > 0) {
      indicators.push(...permissionEscalationMatches);
      const confidence = Math.min(0.95, 0.6 + (permissionEscalationMatches.length * 0.1));
      if (confidence > maxConfidence) {
        maxConfidence = confidence;
        detectedType = 'PERMISSION_ESCALATION';
        reason = `Detected ${permissionEscalationMatches.length} permission escalation pattern(s)`;
      }
    }

    // Check for instruction override
    const instructionOverrideMatches = this.checkPatterns(prompt, this.INSTRUCTION_OVERRIDE_PATTERNS);
    if (instructionOverrideMatches.length > 0) {
      indicators.push(...instructionOverrideMatches);
      const confidence = Math.min(0.85, 0.5 + (instructionOverrideMatches.length * 0.1));
      if (confidence > maxConfidence) {
        maxConfidence = confidence;
        detectedType = 'INSTRUCTION_OVERRIDE';
        reason = `Detected ${instructionOverrideMatches.length} instruction override pattern(s)`;
      }
    }

    // Check for recursive self-modification
    const recursiveMatches = this.checkPatterns(prompt, this.RECURSIVE_SELF_MODIFICATION_PATTERNS);
    if (recursiveMatches.length > 0) {
      indicators.push(...recursiveMatches);
      const confidence = Math.min(0.9, 0.7 + (recursiveMatches.length * 0.1));
      if (confidence > maxConfidence) {
        maxConfidence = confidence;
        detectedType = 'RECURSIVE_SELF_MODIFICATION';
        reason = `Detected ${recursiveMatches.length} recursive self-modification pattern(s)`;
      }
    }

    const isAdversarial = maxConfidence >= this.CONFIDENCE_THRESHOLD;

    return {
      isAdversarial,
      type: detectedType,
      confidence: maxConfidence,
      reason,
      indicators,
    };
  }

  /**
   * Check prompt against patterns
   */
  private static checkPatterns(prompt: string, patterns: RegExp[]): string[] {
    const matches: string[] = [];
    for (const pattern of patterns) {
      const match = prompt.match(pattern);
      if (match) {
        matches.push(match[0]);
      }
    }
    return matches;
  }

  /**
   * Get confidence threshold
   */
  static getConfidenceThreshold(): number {
    return this.CONFIDENCE_THRESHOLD;
  }
}

/**
 * PolicyEngine - Policy-Based Access Control System
 * 
 * Purpose: Enforce fine-grained access control policies for tool operations
 * - Role-based access control (RBAC)
 * - Resource-based policies
 * - Time-based restrictions
 * - Operation-specific rules
 * 
 * Phase 3: Advanced Safety & Policy Framework
 */

import { ErrorHandler, ErrorCode } from './errorHandler';
import { TelemetryService } from './telemetryService';

// ==================== TYPES ====================

export enum Role {
  ADMIN = 'admin',           // Full access
  DEVELOPER = 'developer',   // Read/write access
  REVIEWER = 'reviewer',     // Read-only access
  GUEST = 'guest',          // Minimal access
}

export enum PolicyEffect {
  ALLOW = 'allow',
  DENY = 'deny',
}

export interface PolicyRule {
  id: string;
  name: string;
  description: string;
  effect: PolicyEffect;
  
  // Conditions
  roles?: Role[];
  tools?: string[];
  paths?: string[];
  pathPatterns?: RegExp[];
  
  // Time-based restrictions
  timeRestrictions?: {
    allowedHours?: { start: number; end: number }; // 0-23
    allowedDays?: number[]; // 0-6 (Sunday-Saturday)
    timezone?: string;
  };
  
  // Resource limits
  resourceLimits?: {
    maxFileSize?: number;      // bytes
    maxOperationsPerHour?: number;
    maxConcurrentOps?: number;
  };
  
  // Additional metadata
  priority?: number; // Higher priority rules evaluated first
  enabled?: boolean;
  metadata?: Record<string, any>;
}

export interface Policy {
  id: string;
  name: string;
  description: string;
  version: string;
  rules: PolicyRule[];
  defaultEffect: PolicyEffect;
  metadata?: Record<string, any>;
}

export interface PolicyEvaluationContext {
  role: Role;
  tool: string;
  args: Record<string, any>;
  path?: string;
  timestamp: number;
  metadata?: Record<string, any>;
}

export interface PolicyEvaluationResult {
  allowed: boolean;
  effect: PolicyEffect;
  matchedRules: PolicyRule[];
  deniedBy?: PolicyRule;
  reason?: string;
  metadata: {
    evaluationTime: number;
    rulesEvaluated: number;
    timestamp: number;
  };
}

export interface PolicyStats {
  totalEvaluations: number;
  allowed: number;
  denied: number;
  byRole: Record<Role, { allowed: number; denied: number }>;
  byTool: Record<string, { allowed: number; denied: number }>;
  averageEvaluationTime: number;
}

// ==================== POLICY ENGINE ====================

export class PolicyEngine {
  private static policies: Map<string, Policy> = new Map();
  private static activePolicy: Policy | null = null;
  private static evaluationLog: Array<{
    context: PolicyEvaluationContext;
    result: PolicyEvaluationResult;
  }> = [];
  private static maxLogSize = 1000;

  /**
   * Load a policy into the engine
   */
  static loadPolicy(policy: Policy): void {
    this.validatePolicy(policy);
    this.policies.set(policy.id, policy);
    
    TelemetryService.recordEvent('policy_loaded', {
      policyId: policy.id,
      policyName: policy.name,
      rulesCount: policy.rules.length,
    });
  }

  /**
   * Set the active policy
   */
  static setActivePolicy(policyId: string): void {
    const policy = this.policies.get(policyId);
    if (!policy) {
      throw new Error(`Policy not found: ${policyId}`);
    }
    
    this.activePolicy = policy;
    
    TelemetryService.recordEvent('policy_activated', {
      policyId: policy.id,
      policyName: policy.name,
    });
  }

  /**
   * Evaluate access request against active policy
   */
  static evaluate(context: PolicyEvaluationContext): PolicyEvaluationResult {
    const startTime = Date.now();
    
    if (!this.activePolicy) {
      // No policy loaded - default to deny
      const result: PolicyEvaluationResult = {
        allowed: false,
        effect: PolicyEffect.DENY,
        matchedRules: [],
        reason: 'No active policy loaded',
        metadata: {
          evaluationTime: Date.now() - startTime,
          rulesEvaluated: 0,
          timestamp: Date.now(),
        },
      };
      
      this.logEvaluation(context, result);
      return result;
    }

    // Evaluate rules in priority order
    const sortedRules = [...this.activePolicy.rules]
      .filter(rule => rule.enabled !== false)
      .sort((a, b) => (b.priority || 0) - (a.priority || 0));

    const matchedRules: PolicyRule[] = [];
    let finalEffect = this.activePolicy.defaultEffect;
    let deniedBy: PolicyRule | undefined;
    let reason: string | undefined;

    for (const rule of sortedRules) {
      if (this.ruleMatches(rule, context)) {
        matchedRules.push(rule);
        
        // DENY rules take precedence
        if (rule.effect === PolicyEffect.DENY) {
          finalEffect = PolicyEffect.DENY;
          deniedBy = rule;
          reason = `Denied by rule: ${rule.name}`;
          break; // Stop on first DENY
        }
        
        // ALLOW rules
        if (rule.effect === PolicyEffect.ALLOW) {
          finalEffect = PolicyEffect.ALLOW;
        }
      }
    }

    const result: PolicyEvaluationResult = {
      allowed: finalEffect === PolicyEffect.ALLOW,
      effect: finalEffect,
      matchedRules,
      deniedBy,
      reason: reason || (finalEffect === PolicyEffect.DENY ? 'Default deny policy' : undefined),
      metadata: {
        evaluationTime: Date.now() - startTime,
        rulesEvaluated: sortedRules.length,
        timestamp: Date.now(),
      },
    };

    this.logEvaluation(context, result);
    
    TelemetryService.recordEvent('policy_evaluation', {
      role: context.role,
      tool: context.tool,
      allowed: result.allowed,
      rulesMatched: matchedRules.length,
      evaluationTime: result.metadata.evaluationTime,
    });

    return result;
  }

  /**
   * Check if a rule matches the context
   */
  private static ruleMatches(rule: PolicyRule, context: PolicyEvaluationContext): boolean {
    // Check role
    if (rule.roles && !rule.roles.includes(context.role)) {
      return false;
    }

    // Check tool
    if (rule.tools && !rule.tools.includes(context.tool)) {
      return false;
    }

    // Check path
    if (context.path) {
      if (rule.paths && !rule.paths.some(p => context.path!.startsWith(p))) {
        return false;
      }

      if (rule.pathPatterns && !rule.pathPatterns.some(p => p.test(context.path!))) {
        return false;
      }
    }

    // Check time restrictions
    if (rule.timeRestrictions) {
      const now = new Date(context.timestamp);
      
      if (rule.timeRestrictions.allowedHours) {
        const hour = now.getHours();
        const { start, end } = rule.timeRestrictions.allowedHours;
        if (hour < start || hour > end) {
          return false;
        }
      }

      if (rule.timeRestrictions.allowedDays) {
        const day = now.getDay();
        if (!rule.timeRestrictions.allowedDays.includes(day)) {
          return false;
        }
      }
    }

    // Check resource limits
    if (rule.resourceLimits) {
      // File size check
      if (rule.resourceLimits.maxFileSize && context.args.content) {
        const size = new Blob([context.args.content]).size;
        if (size > rule.resourceLimits.maxFileSize) {
          return false;
        }
      }

      // Operations per hour check
      if (rule.resourceLimits.maxOperationsPerHour) {
        const recentOps = this.getRecentOperations(context.role, context.tool, 3600000); // 1 hour
        if (recentOps >= rule.resourceLimits.maxOperationsPerHour) {
          return false;
        }
      }
    }

    return true;
  }

  /**
   * Get count of recent operations
   */
  private static getRecentOperations(role: Role, tool: string, timeWindow: number): number {
    const cutoff = Date.now() - timeWindow;
    return this.evaluationLog.filter(
      log => log.context.role === role &&
             log.context.tool === tool &&
             log.context.timestamp >= cutoff &&
             log.result.allowed
    ).length;
  }

  /**
   * Validate policy structure
   */
  private static validatePolicy(policy: Policy): void {
    if (!policy.id || !policy.name || !policy.version) {
      throw new Error('Policy must have id, name, and version');
    }

    if (!Array.isArray(policy.rules)) {
      throw new Error('Policy must have rules array');
    }

    for (const rule of policy.rules) {
      if (!rule.id || !rule.name || !rule.effect) {
        throw new Error('Rule must have id, name, and effect');
      }

      if (![PolicyEffect.ALLOW, PolicyEffect.DENY].includes(rule.effect)) {
        throw new Error(`Invalid rule effect: ${rule.effect}`);
      }
    }
  }

  /**
   * Log policy evaluation
   */
  private static logEvaluation(
    context: PolicyEvaluationContext,
    result: PolicyEvaluationResult
  ): void {
    this.evaluationLog.push({ context, result });

    if (this.evaluationLog.length > this.maxLogSize) {
      this.evaluationLog.shift();
    }
  }

  /**
   * Get policy statistics
   */
  static getStats(): PolicyStats {
    const byRole: Record<Role, { allowed: number; denied: number }> = {
      [Role.ADMIN]: { allowed: 0, denied: 0 },
      [Role.DEVELOPER]: { allowed: 0, denied: 0 },
      [Role.REVIEWER]: { allowed: 0, denied: 0 },
      [Role.GUEST]: { allowed: 0, denied: 0 },
    };

    const byTool: Record<string, { allowed: number; denied: number }> = {};
    let totalEvaluationTime = 0;

    for (const log of this.evaluationLog) {
      const { context, result } = log;
      
      // By role
      if (result.allowed) {
        byRole[context.role].allowed++;
      } else {
        byRole[context.role].denied++;
      }

      // By tool
      if (!byTool[context.tool]) {
        byTool[context.tool] = { allowed: 0, denied: 0 };
      }
      if (result.allowed) {
        byTool[context.tool].allowed++;
      } else {
        byTool[context.tool].denied++;
      }

      totalEvaluationTime += result.metadata.evaluationTime;
    }

    return {
      totalEvaluations: this.evaluationLog.length,
      allowed: this.evaluationLog.filter(l => l.result.allowed).length,
      denied: this.evaluationLog.filter(l => !l.result.allowed).length,
      byRole,
      byTool,
      averageEvaluationTime: this.evaluationLog.length > 0
        ? totalEvaluationTime / this.evaluationLog.length
        : 0,
    };
  }

  /**
   * Get evaluation history
   */
  static getEvaluationHistory(limit: number = 50): typeof PolicyEngine.evaluationLog {
    return this.evaluationLog.slice(-limit);
  }

  /**
   * Clear evaluation log
   */
  static clearLog(): void {
    this.evaluationLog = [];
  }

  /**
   * Get active policy
   */
  static getActivePolicy(): Policy | null {
    return this.activePolicy;
  }

  /**
   * Get all loaded policies
   */
  static getAllPolicies(): Policy[] {
    return Array.from(this.policies.values());
  }

  /**
   * Remove a policy
   */
  static removePolicy(policyId: string): void {
    if (this.activePolicy?.id === policyId) {
      this.activePolicy = null;
    }
    this.policies.delete(policyId);
  }
}

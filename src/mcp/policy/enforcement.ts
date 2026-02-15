/**
 * Policy Enforcement Engine
 * CRITICAL: This is the gatekeeper - no tool executes without passing through here
 */

import { ExecutionContext } from '../runtime/context';
import policyConfig from './policy.json';

export interface ToolPolicy {
  requires: string[];
  forbidDirectOutput: boolean;
  description: string;
}

export class PolicyViolationError extends Error {
  constructor(
    public toolName: string,
    public missingDependencies: string[],
    message: string
  ) {
    super(message);
    this.name = 'PolicyViolationError';
  }
}

export class PolicyEnforcer {
  private policies: Map<string, ToolPolicy>;
  private enforcementMode: 'strict' | 'permissive';
  private allowBypass: boolean;

  constructor() {
    this.policies = new Map();
    this.enforcementMode = policyConfig.enforcementMode as 'strict' | 'permissive';
    this.allowBypass = policyConfig.allowBypass;
    
    // Load policies from config
    Object.entries(policyConfig.toolPolicies).forEach(([toolName, policy]) => {
      this.policies.set(toolName, policy as ToolPolicy);
    });

    console.log(`[ENFORCER] Initialized with ${this.policies.size} policies`);
    console.log(`[ENFORCER] Mode: ${this.enforcementMode} | Bypass: ${this.allowBypass}`);
  }

  /**
   * CRITICAL ENFORCEMENT POINT
   * This function MUST be called before any tool execution
   * Throws PolicyViolationError if requirements are not met
   */
  enforcePolicy(toolName: string, context: ExecutionContext): void {
    const policy = this.policies.get(toolName);
    
    // If no policy exists, tool is unrestricted
    if (!policy) {
      console.log(`[ENFORCER] No policy for "${toolName}" - allowing execution`);
      return;
    }

    console.log(`[ENFORCER] Checking policy for "${toolName}"`);
    console.log(`[ENFORCER] Required dependencies: ${policy.requires.join(', ')}`);

    const missingDependencies: string[] = [];
    
    // Check each required dependency
    for (const requiredTool of policy.requires) {
      if (!context.hasExecuted(requiredTool)) {
        missingDependencies.push(requiredTool);
      }
    }

    // HARD ENFORCEMENT: Throw if any dependencies are missing
    if (missingDependencies.length > 0) {
      const errorMessage = this.buildViolationMessage(toolName, missingDependencies, policy);
      
      console.error(`[ENFORCER] ❌ POLICY VIOLATION`);
      console.error(`[ENFORCER] Tool: ${toolName}`);
      console.error(`[ENFORCER] Missing: ${missingDependencies.join(', ')}`);
      
      throw new PolicyViolationError(toolName, missingDependencies, errorMessage);
    }

    console.log(`[ENFORCER] ✅ Policy satisfied for "${toolName}"`);
  }

  /**
   * Build detailed violation message
   */
  private buildViolationMessage(
    toolName: string,
    missingDependencies: string[],
    policy: ToolPolicy
  ): string {
    const lines = [
      `POLICY VIOLATION: Cannot execute tool "${toolName}"`,
      ``,
      `Required dependencies not met:`,
      ...missingDependencies.map(dep => `  - ${dep} (NOT EXECUTED)`),
      ``,
      `Policy: ${policy.description}`,
      ``,
      `You must execute the following tools first:`,
      ...missingDependencies.map(dep => `  1. ${dep}`),
      ``,
      `Then retry "${toolName}"`
    ];
    
    return lines.join('\n');
  }

  /**
   * Check if a tool can be executed (without throwing)
   */
  canExecute(toolName: string, context: ExecutionContext): {
    allowed: boolean;
    missingDependencies: string[];
  } {
    const policy = this.policies.get(toolName);
    
    if (!policy) {
      return { allowed: true, missingDependencies: [] };
    }

    const missingDependencies = policy.requires.filter(
      req => !context.hasExecuted(req)
    );

    return {
      allowed: missingDependencies.length === 0,
      missingDependencies
    };
  }

  /**
   * Get policy for a tool
   */
  getPolicy(toolName: string): ToolPolicy | undefined {
    return this.policies.get(toolName);
  }

  /**
   * Get all policies
   */
  getAllPolicies(): Map<string, ToolPolicy> {
    return new Map(this.policies);
  }

  /**
   * Add or update a policy (runtime configuration)
   */
  setPolicy(toolName: string, policy: ToolPolicy): void {
    console.log(`[ENFORCER] Setting policy for "${toolName}"`);
    this.policies.set(toolName, policy);
  }
}

/**
 * Global enforcer singleton
 */
let globalEnforcer: PolicyEnforcer | null = null;

export function getGlobalEnforcer(): PolicyEnforcer {
  if (!globalEnforcer) {
    globalEnforcer = new PolicyEnforcer();
  }
  return globalEnforcer;
}

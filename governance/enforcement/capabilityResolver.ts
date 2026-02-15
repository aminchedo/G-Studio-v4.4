/**
 * RFC-0003 Enforcement: Capability Resolution and Authorization
 * 
 * This module implements capability authorization as specified in RFC-0003.
 * All tool executions MUST be authorized before execution.
 */

import { createHash, createHmac } from 'crypto';

// ============================================================================
// Types
// ============================================================================

export interface Capability {
  id: string;
  name: string;
  description: string;
  parent?: string;
  risk: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  requires: string[];
  conflicts: string[];
  delegatable?: boolean;
  metadata: CapabilityMetadata;
}

export interface CapabilityMetadata {
  version: string;
  createdAt: number;
  modifiedAt: number;
  deprecated: boolean;
  replacedBy?: string;
}

export interface CapabilityGrant {
  grantId: string;
  capabilityId: string;
  grantee: Grantee;
  grantor: string;
  scope: GrantScope;
  constraints: Constraint[];
  issuedAt: number;
  expiresAt?: number;
  revokedAt?: number;
  signature: string;
}

export interface DelegatedGrant extends CapabilityGrant {
  parentGrantId: string;
  delegationDepth: number;
  delegatable: boolean;
}

export interface Grantee {
  type: 'TOOL' | 'USER' | 'ROLE';
  id: string;
}

export interface GrantScope {
  resources: string[];
  actions: string[];
  conditions: Condition[];
}

export interface Condition {
  type: 'TIME' | 'LOCATION' | 'CONTEXT';
  expression: string;
}

export interface Constraint {
  type: string;
  value: unknown;
}

export interface ExecutionContext {
  toolId: string;
  userId?: string;
  action: string;
  resource: string;
  timestamp: number;
}

export interface AuthorizationDecision {
  granted: boolean;
  capabilities: CapabilityDecision[];
  timestamp: number;
  context: ExecutionContext;
}

export interface CapabilityDecision {
  capabilityId: string;
  granted: boolean;
  reason: string;
  grant?: CapabilityGrant;
}

export interface CapabilityViolation {
  executionId: string;
  toolId: string;
  capabilityId: string;
  action: string;
  resource: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  timestamp: number;
}

// ============================================================================
// Constants
// ============================================================================

const MAX_DELEGATION_DEPTH = 3;
const DEFAULT_DELEGATION_TTL = 86400000; // 24 hours
const SIGNATURE_SECRET = process.env.CAPABILITY_SECRET || 'default-secret-change-in-production';

// ============================================================================
// Capability Resolver Implementation
// ============================================================================

export class CapabilityResolver {
  private capabilities: Map<string, Capability>;
  private grants: Map<string, CapabilityGrant>;

  constructor() {
    this.capabilities = new Map();
    this.grants = new Map();
    this.initializeStandardCapabilities();
  }

  /**
   * RFC-0003 Section 5.1: Authorization Decision
   * 
   * Authorize all required capabilities for a tool execution
   */
  async authorize(
    requiredCapabilities: string[],
    context: ExecutionContext
  ): Promise<AuthorizationDecision> {
    const decisions: CapabilityDecision[] = [];

    // STEP 1: Check each required capability
    for (const capabilityId of requiredCapabilities) {
      const decision = await this.authorizeCapability(capabilityId, context);
      decisions.push(decision);
    }

    // STEP 2: Aggregate decisions
    const allGranted = decisions.every(d => d.granted);

    // STEP 3: Create authorization decision
    return {
      granted: allGranted,
      capabilities: decisions,
      timestamp: Date.now(),
      context,
    };
  }

  /**
   * RFC-0003 Section 5.2: Capability Authorization
   * 
   * Authorize a single capability
   */
  async authorizeCapability(
    capabilityId: string,
    context: ExecutionContext
  ): Promise<CapabilityDecision> {
    // RULE 1: Find applicable grants
    const grants = this.findGrants({
      capabilityId,
      grantee: { type: 'TOOL', id: context.toolId },
    });

    if (grants.length === 0) {
      return {
        capabilityId,
        granted: false,
        reason: 'No grant found',
      };
    }

    // RULE 2: Filter valid grants
    const validGrants = grants.filter(grant => this.isGrantValid(grant));

    if (validGrants.length === 0) {
      return {
        capabilityId,
        granted: false,
        reason: 'No valid grant found',
      };
    }

    // RULE 3: Check scope and constraints
    for (const grant of validGrants) {
      if (this.checkScope(grant.scope, context) && 
          this.checkConstraints(grant.constraints, context)) {
        return {
          capabilityId,
          granted: true,
          reason: 'Grant authorized',
          grant,
        };
      }
    }

    return {
      capabilityId,
      granted: false,
      reason: 'Scope or constraints not satisfied',
    };
  }

  /**
   * RFC-0003 Section 4.2: Grant Issuance
   * 
   * Issue a new capability grant
   */
  async issueGrant(
    capabilityId: string,
    grantee: Grantee,
    grantor: string,
    scope: GrantScope,
    constraints: Constraint[]
  ): Promise<CapabilityGrant> {
    // RULE 1: Validate capability exists
    const capability = this.capabilities.get(capabilityId);
    if (!capability) {
      throw new Error('Capability not found');
    }

    // RULE 2: Validate prerequisites
    for (const required of capability.requires) {
      const hasRequired = this.findGrants({
        capabilityId: required,
        grantee,
      }).length > 0;

      if (!hasRequired) {
        throw new Error(`Missing prerequisite: ${required}`);
      }
    }

    // RULE 3: Check conflicts
    for (const conflict of capability.conflicts) {
      const hasConflict = this.findGrants({
        capabilityId: conflict,
        grantee,
      }).length > 0;

      if (hasConflict) {
        throw new Error(`Conflicting capability: ${conflict}`);
      }
    }

    // RULE 4: Create grant
    const grant: CapabilityGrant = {
      grantId: this.generateGrantId(),
      capabilityId,
      grantee,
      grantor,
      scope,
      constraints,
      issuedAt: Date.now(),
      signature: '',
    };

    // RULE 5: Sign grant
    grant.signature = this.signGrant(grant);

    // RULE 6: Store grant
    this.grants.set(grant.grantId, grant);

    return grant;
  }

  /**
   * RFC-0003 Section 4.3: Grant Revocation
   * 
   * Revoke an existing grant
   */
  async revokeGrant(grantId: string): Promise<void> {
    // RULE 1: Validate grant exists
    const grant = this.grants.get(grantId);
    if (!grant) {
      throw new Error('Grant not found');
    }

    // RULE 2: Mark as revoked
    grant.revokedAt = Date.now();
    this.grants.set(grantId, grant);

    // RULE 3: Revoke delegated grants
    await this.revokeDelegatedGrants(grantId);
  }

  /**
   * RFC-0003 Section 6.3: Delegation Process
   * 
   * Delegate a capability grant
   */
  async delegateGrant(
    parentGrantId: string,
    delegatee: Grantee,
    scope: GrantScope
  ): Promise<DelegatedGrant> {
    // RULE 1: Validate parent grant
    const parentGrant = this.grants.get(parentGrantId);
    if (!parentGrant) {
      throw new Error('Parent grant not found');
    }

    // RULE 2: Check delegation allowed
    const capability = this.capabilities.get(parentGrant.capabilityId);
    if (!capability?.delegatable) {
      throw new Error('Capability not delegatable');
    }

    // RULE 3: Check delegation depth
    const depth = this.getDelegationDepth(parentGrant);
    if (depth >= MAX_DELEGATION_DEPTH) {
      throw new Error('Maximum delegation depth exceeded');
    }

    // RULE 4: Validate scope is subset
    if (!this.isScopeSubset(scope, parentGrant.scope)) {
      throw new Error('Delegated scope exceeds parent scope');
    }

    // RULE 5: Create delegated grant
    const delegatedGrant: DelegatedGrant = {
      ...parentGrant,
      grantId: this.generateGrantId(),
      parentGrantId,
      grantee: delegatee,
      scope,
      delegationDepth: depth + 1,
      delegatable: depth + 1 < MAX_DELEGATION_DEPTH,
      issuedAt: Date.now(),
      expiresAt: Math.min(
        parentGrant.expiresAt || Infinity,
        Date.now() + DEFAULT_DELEGATION_TTL
      ),
      signature: '',
    };

    // RULE 6: Sign and store
    delegatedGrant.signature = this.signGrant(delegatedGrant);
    this.grants.set(delegatedGrant.grantId, delegatedGrant);

    return delegatedGrant;
  }

  /**
   * Register a new capability
   */
  registerCapability(capability: Capability): void {
    // Validate parent exists
    if (capability.parent) {
      if (!this.capabilities.has(capability.parent)) {
        throw new Error('Parent capability not found');
      }
    }

    this.capabilities.set(capability.id, capability);
  }

  /**
   * Get capability by ID
   */
  getCapability(id: string): Capability | undefined {
    return this.capabilities.get(id);
  }

  /**
   * List all capabilities
   */
  listCapabilities(): Capability[] {
    return Array.from(this.capabilities.values());
  }

  /**
   * Get descendants of a capability
   */
  getDescendants(id: string): Capability[] {
    const descendants: Capability[] = [];
    
    for (const capability of this.capabilities.values()) {
      if (capability.parent === id) {
        descendants.push(capability);
        descendants.push(...this.getDescendants(capability.id));
      }
    }

    return descendants;
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private findGrants(filter: {
    capabilityId?: string;
    grantee?: Grantee;
  }): CapabilityGrant[] {
    const grants: CapabilityGrant[] = [];

    for (const grant of this.grants.values()) {
      if (filter.capabilityId && grant.capabilityId !== filter.capabilityId) {
        continue;
      }

      if (filter.grantee) {
        if (grant.grantee.type !== filter.grantee.type ||
            grant.grantee.id !== filter.grantee.id) {
          continue;
        }
      }

      grants.push(grant);
    }

    return grants;
  }

  private isGrantValid(grant: CapabilityGrant): boolean {
    // Check not revoked
    if (grant.revokedAt) return false;

    // Check not expired
    if (grant.expiresAt && grant.expiresAt < Date.now()) return false;

    // Verify signature
    if (!this.verifyGrantSignature(grant)) return false;

    return true;
  }

  private checkScope(scope: GrantScope, context: ExecutionContext): boolean {
    // Check resource restrictions
    if (scope.resources.length > 0) {
      const resourceMatch = scope.resources.some(pattern =>
        this.matchesPattern(context.resource, pattern)
      );
      if (!resourceMatch) return false;
    }

    // Check action restrictions
    if (scope.actions.length > 0) {
      if (!scope.actions.includes(context.action)) return false;
    }

    // Evaluate conditions
    for (const condition of scope.conditions) {
      if (!this.evaluateCondition(condition, context)) return false;
    }

    return true;
  }

  private checkConstraints(constraints: Constraint[], context: ExecutionContext): boolean {
    for (const constraint of constraints) {
      if (!this.evaluateConstraint(constraint, context)) return false;
    }
    return true;
  }

  private evaluateCondition(condition: Condition, context: ExecutionContext): boolean {
    // Simple condition evaluation
    // In production, use a proper expression evaluator
    if (condition.type === 'TIME') {
      const hour = new Date(context.timestamp).getHours();
      return eval(condition.expression.replace(/hour/g, hour.toString()));
    }
    return true;
  }

  private evaluateConstraint(constraint: Constraint, context: ExecutionContext): boolean {
    // Simple constraint evaluation
    // In production, implement proper constraint checking
    return true;
  }

  private matchesPattern(value: string, pattern: string): boolean {
    const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
    return regex.test(value);
  }

  private signGrant(grant: CapabilityGrant): string {
    const data = JSON.stringify({
      grantId: grant.grantId,
      capabilityId: grant.capabilityId,
      grantee: grant.grantee,
      grantor: grant.grantor,
      issuedAt: grant.issuedAt,
    });

    return createHmac('sha256', SIGNATURE_SECRET)
      .update(data)
      .digest('hex');
  }

  private verifyGrantSignature(grant: CapabilityGrant): boolean {
    const expectedSignature = this.signGrant(grant);
    return grant.signature === expectedSignature;
  }

  private generateGrantId(): string {
    return `grant-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private getDelegationDepth(grant: CapabilityGrant): number {
    if ('delegationDepth' in grant) {
      return (grant as DelegatedGrant).delegationDepth;
    }
    return 0;
  }

  private isScopeSubset(subset: GrantScope, superset: GrantScope): boolean {
    // Check resources
    if (subset.resources.length > 0 && superset.resources.length > 0) {
      const allResourcesAllowed = subset.resources.every(resource =>
        superset.resources.some(pattern => this.matchesPattern(resource, pattern))
      );
      if (!allResourcesAllowed) return false;
    }

    // Check actions
    if (subset.actions.length > 0 && superset.actions.length > 0) {
      const allActionsAllowed = subset.actions.every(action =>
        superset.actions.includes(action)
      );
      if (!allActionsAllowed) return false;
    }

    return true;
  }

  private async revokeDelegatedGrants(parentGrantId: string): Promise<void> {
    for (const grant of this.grants.values()) {
      if ('parentGrantId' in grant && 
          (grant as DelegatedGrant).parentGrantId === parentGrantId) {
        grant.revokedAt = Date.now();
        this.grants.set(grant.grantId, grant);
        await this.revokeDelegatedGrants(grant.grantId);
      }
    }
  }

  private initializeStandardCapabilities(): void {
    // Filesystem capabilities
    this.registerCapability({
      id: 'filesystem',
      name: 'Filesystem',
      description: 'Root filesystem capability',
      risk: 'HIGH',
      requires: [],
      conflicts: [],
      metadata: {
        version: '1.0.0',
        createdAt: Date.now(),
        modifiedAt: Date.now(),
        deprecated: false,
      },
    });

    this.registerCapability({
      id: 'filesystem.read',
      name: 'Filesystem Read',
      description: 'Read files and directories',
      parent: 'filesystem',
      risk: 'MEDIUM',
      requires: [],
      conflicts: [],
      delegatable: true,
      metadata: {
        version: '1.0.0',
        createdAt: Date.now(),
        modifiedAt: Date.now(),
        deprecated: false,
      },
    });

    this.registerCapability({
      id: 'filesystem.write',
      name: 'Filesystem Write',
      description: 'Write and modify files',
      parent: 'filesystem',
      risk: 'HIGH',
      requires: ['filesystem.read'],
      conflicts: [],
      delegatable: false,
      metadata: {
        version: '1.0.0',
        createdAt: Date.now(),
        modifiedAt: Date.now(),
        deprecated: false,
      },
    });

    // Network capabilities
    this.registerCapability({
      id: 'network',
      name: 'Network',
      description: 'Root network capability',
      risk: 'HIGH',
      requires: [],
      conflicts: [],
      metadata: {
        version: '1.0.0',
        createdAt: Date.now(),
        modifiedAt: Date.now(),
        deprecated: false,
      },
    });

    this.registerCapability({
      id: 'network.http',
      name: 'HTTP Network Access',
      description: 'Make HTTP requests',
      parent: 'network',
      risk: 'MEDIUM',
      requires: [],
      conflicts: [],
      delegatable: true,
      metadata: {
        version: '1.0.0',
        createdAt: Date.now(),
        modifiedAt: Date.now(),
        deprecated: false,
      },
    });
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

export const capabilityResolver = new CapabilityResolver();

// ============================================================================
// Convenience Functions
// ============================================================================

export async function authorize(
  requiredCapabilities: string[],
  context: ExecutionContext
): Promise<AuthorizationDecision> {
  return capabilityResolver.authorize(requiredCapabilities, context);
}

export async function issueGrant(
  capabilityId: string,
  grantee: Grantee,
  grantor: string,
  scope: GrantScope,
  constraints: Constraint[]
): Promise<CapabilityGrant> {
  return capabilityResolver.issueGrant(capabilityId, grantee, grantor, scope, constraints);
}

export async function revokeGrant(grantId: string): Promise<void> {
  return capabilityResolver.revokeGrant(grantId);
}

export function registerCapability(capability: Capability): void {
  capabilityResolver.registerCapability(capability);
}

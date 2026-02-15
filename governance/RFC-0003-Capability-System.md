# RFC-0003: Capability & Permission System

**Status**: ACTIVE  
**Version**: 1.0.0  
**Authors**: System Architecture Team  
**Created**: 2026-01-02  
**Last Modified**: 2026-01-02

---

## 1. Purpose and Scope

### 1.1 Purpose

This RFC defines the normative capability and permission model for tool execution. It establishes:

- Capability taxonomy and hierarchy
- Permission grant and revocation semantics
- Authorization decision logic
- Capability delegation rules
- Audit and compliance requirements

### 1.2 Scope

This specification applies to:

- All tool capability declarations
- Authorization decisions before tool execution
- Capability grant management
- Permission enforcement during execution

### 1.3 Conformance Language

The key words "MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT", "SHOULD", "SHOULD NOT", "RECOMMENDED", "MAY", and "OPTIONAL" in this document are to be interpreted as described in RFC 2119.

---

## 2. Threat Model

### 2.1 Threats

| ID | Threat | Severity | Mitigation |
|----|--------|----------|------------|
| T-201 | Unauthorized capability escalation | CRITICAL | Capability hierarchy enforcement |
| T-202 | Capability grant forgery | CRITICAL | Cryptographic signing of grants |
| T-203 | Time-of-check-time-of-use (TOCTOU) | HIGH | Atomic authorization checks |
| T-204 | Capability delegation abuse | HIGH | Delegation depth limits |
| T-205 | Permission confusion attacks | MEDIUM | Explicit capability naming |
| T-206 | Revocation bypass | HIGH | Immediate revocation enforcement |
| T-207 | Audit trail tampering | HIGH | Immutable audit logs |
| T-208 | Capability enumeration | MEDIUM | Capability obfuscation |

### 2.2 Trust Model

```
┌─────────────────────────────────────┐
│     System Administrator            │
│     (Full Trust)                    │
└──────────────┬──────────────────────┘
               │ grants
               ↓
┌─────────────────────────────────────┐
│     Capability Authority            │
│     (Trusted)                       │
└──────────────┬──────────────────────┘
               │ issues
               ↓
┌─────────────────────────────────────┐
│     Capability Grant                │
│     (Cryptographically Signed)      │
└──────────────┬──────────────────────┘
               │ authorizes
               ↓
┌─────────────────────────────────────┐
│     Tool Execution                  │
│     (Untrusted)                     │
└─────────────────────────────────────┘
```

---

## 3. Capability Taxonomy

### 3.1 Capability Hierarchy

```
root
├── filesystem
│   ├── filesystem.read
│   ├── filesystem.write
│   ├── filesystem.delete
│   └── filesystem.execute
├── network
│   ├── network.http
│   ├── network.https
│   ├── network.tcp
│   └── network.udp
├── process
│   ├── process.spawn
│   ├── process.kill
│   └── process.signal
├── system
│   ├── system.env
│   ├── system.time
│   └── system.info
├── state
│   ├── state.read
│   ├── state.write
│   └── state.delete
└── admin
    ├── admin.capability.grant
    ├── admin.capability.revoke
    └── admin.tool.install
```

### 3.2 Capability Definitions

```typescript
interface Capability {
  id: string;                    // Unique capability identifier
  name: string;                  // Human-readable name
  description: string;           // Capability purpose
  parent?: string;               // Parent capability ID
  risk: RiskLevel;               // Risk assessment
  requires: string[];            // Prerequisite capabilities
  conflicts: string[];           // Conflicting capabilities
  metadata: CapabilityMetadata;
}

type RiskLevel = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

interface CapabilityMetadata {
  version: string;
  createdAt: number;
  modifiedAt: number;
  deprecated: boolean;
  replacedBy?: string;
}
```

### 3.3 Standard Capabilities

#### 3.3.1 Filesystem Capabilities

```typescript
const FILESYSTEM_CAPABILITIES: Capability[] = [
  {
    id: "filesystem.read",
    name: "Filesystem Read",
    description: "Read files and directories",
    parent: "filesystem",
    risk: "MEDIUM",
    requires: [],
    conflicts: []
  },
  {
    id: "filesystem.write",
    name: "Filesystem Write",
    description: "Write and modify files",
    parent: "filesystem",
    risk: "HIGH",
    requires: ["filesystem.read"],
    conflicts: []
  },
  {
    id: "filesystem.delete",
    name: "Filesystem Delete",
    description: "Delete files and directories",
    parent: "filesystem",
    risk: "HIGH",
    requires: ["filesystem.read"],
    conflicts: []
  },
  {
    id: "filesystem.execute",
    name: "Filesystem Execute",
    description: "Execute files as programs",
    parent: "filesystem",
    risk: "CRITICAL",
    requires: ["filesystem.read"],
    conflicts: []
  }
];
```

#### 3.3.2 Network Capabilities

```typescript
const NETWORK_CAPABILITIES: Capability[] = [
  {
    id: "network.http",
    name: "HTTP Network Access",
    description: "Make HTTP requests",
    parent: "network",
    risk: "MEDIUM",
    requires: [],
    conflicts: []
  },
  {
    id: "network.https",
    name: "HTTPS Network Access",
    description: "Make HTTPS requests",
    parent: "network",
    risk: "MEDIUM",
    requires: [],
    conflicts: []
  },
  {
    id: "network.tcp",
    name: "TCP Network Access",
    description: "Create TCP connections",
    parent: "network",
    risk: "HIGH",
    requires: [],
    conflicts: []
  },
  {
    id: "network.udp",
    name: "UDP Network Access",
    description: "Send UDP packets",
    parent: "network",
    risk: "HIGH",
    requires: [],
    conflicts: []
  }
];
```

#### 3.3.3 Process Capabilities

```typescript
const PROCESS_CAPABILITIES: Capability[] = [
  {
    id: "process.spawn",
    name: "Process Spawn",
    description: "Spawn new processes",
    parent: "process",
    risk: "CRITICAL",
    requires: ["filesystem.execute"],
    conflicts: []
  },
  {
    id: "process.kill",
    name: "Process Kill",
    description: "Terminate processes",
    parent: "process",
    risk: "HIGH",
    requires: [],
    conflicts: []
  },
  {
    id: "process.signal",
    name: "Process Signal",
    description: "Send signals to processes",
    parent: "process",
    risk: "MEDIUM",
    requires: [],
    conflicts: []
  }
];
```

---

## 4. Capability Grants

### 4.1 Grant Structure

```typescript
interface CapabilityGrant {
  grantId: string;               // Unique grant identifier
  capabilityId: string;          // Capability being granted
  grantee: Grantee;              // Who receives the capability
  grantor: string;               // Who issued the grant
  scope: GrantScope;             // Grant limitations
  constraints: Constraint[];     // Additional restrictions
  issuedAt: number;              // Grant creation timestamp
  expiresAt?: number;            // Optional expiration
  revokedAt?: number;            // Revocation timestamp
  signature: string;             // Cryptographic signature
}

interface Grantee {
  type: "TOOL" | "USER" | "ROLE";
  id: string;
}

interface GrantScope {
  resources: string[];           // Specific resources allowed
  actions: string[];             // Specific actions allowed
  conditions: Condition[];       // Conditional restrictions
}

interface Constraint {
  type: string;
  value: unknown;
}

interface Condition {
  type: "TIME" | "LOCATION" | "CONTEXT";
  expression: string;
}
```

### 4.2 Grant Issuance

```typescript
async function issueGrant(
  capabilityId: string,
  grantee: Grantee,
  scope: GrantScope,
  constraints: Constraint[]
): Promise<CapabilityGrant> {
  // RULE 1: Validate capability exists
  const capability = await getCapability(capabilityId);
  if (!capability) {
    throw new ValidationError("Capability not found");
  }
  
  // RULE 2: Check grantor authority
  if (!hasGrantAuthority(getCurrentUser(), capabilityId)) {
    throw new AuthorizationError("Insufficient authority to grant");
  }
  
  // RULE 3: Validate prerequisites
  for (const required of capability.requires) {
    if (!hasGrant(grantee, required)) {
      throw new ValidationError(`Missing prerequisite: ${required}`);
    }
  }
  
  // RULE 4: Check conflicts
  for (const conflict of capability.conflicts) {
    if (hasGrant(grantee, conflict)) {
      throw new ValidationError(`Conflicting capability: ${conflict}`);
    }
  }
  
  // RULE 5: Create grant
  const grant: CapabilityGrant = {
    grantId: generateGrantId(),
    capabilityId,
    grantee,
    grantor: getCurrentUser(),
    scope,
    constraints,
    issuedAt: Date.now(),
    signature: ""
  };
  
  // RULE 6: Sign grant
  grant.signature = signGrant(grant);
  
  // RULE 7: Store grant
  await storeGrant(grant);
  
  // RULE 8: Emit audit event
  emitAuditEvent({
    event: "GRANT_ISSUED",
    grantId: grant.grantId,
    capabilityId,
    grantee
  });
  
  return grant;
}
```

### 4.3 Grant Revocation

```typescript
async function revokeGrant(grantId: string): Promise<void> {
  // RULE 1: Validate grant exists
  const grant = await getGrant(grantId);
  if (!grant) {
    throw new ValidationError("Grant not found");
  }
  
  // RULE 2: Check revocation authority
  if (!hasRevokeAuthority(getCurrentUser(), grant)) {
    throw new AuthorizationError("Insufficient authority to revoke");
  }
  
  // RULE 3: Mark as revoked
  grant.revokedAt = Date.now();
  await updateGrant(grant);
  
  // RULE 4: Invalidate cached grants
  await invalidateGrantCache(grantId);
  
  // RULE 5: Terminate active sessions
  await terminateSessionsWithGrant(grantId);
  
  // RULE 6: Emit audit event
  emitAuditEvent({
    event: "GRANT_REVOKED",
    grantId,
    revokedBy: getCurrentUser()
  });
}
```

---

## 5. Authorization Logic

### 5.1 Authorization Decision

```typescript
async function authorize(
  tool: ToolDeclaration,
  context: ExecutionContext
): Promise<AuthorizationDecision> {
  const decisions: CapabilityDecision[] = [];
  
  // STEP 1: Check each required capability
  for (const capabilityId of tool.requiredCapabilities) {
    const decision = await authorizeCapability(
      capabilityId,
      tool,
      context
    );
    decisions.push(decision);
  }
  
  // STEP 2: Aggregate decisions
  const allGranted = decisions.every(d => d.granted);
  
  // STEP 3: Create authorization decision
  return {
    granted: allGranted,
    capabilities: decisions,
    timestamp: Date.now(),
    context
  };
}

interface AuthorizationDecision {
  granted: boolean;
  capabilities: CapabilityDecision[];
  timestamp: number;
  context: ExecutionContext;
}

interface CapabilityDecision {
  capabilityId: string;
  granted: boolean;
  reason: string;
  grant?: CapabilityGrant;
}
```

### 5.2 Capability Authorization

```typescript
async function authorizeCapability(
  capabilityId: string,
  tool: ToolDeclaration,
  context: ExecutionContext
): Promise<CapabilityDecision> {
  // RULE 1: Find applicable grants
  const grants = await findGrants({
    capabilityId,
    grantee: { type: "TOOL", id: tool.id }
  });
  
  if (grants.length === 0) {
    return {
      capabilityId,
      granted: false,
      reason: "No grant found"
    };
  }
  
  // RULE 2: Filter valid grants
  const validGrants = grants.filter(grant => {
    // Check not revoked
    if (grant.revokedAt) return false;
    
    // Check not expired
    if (grant.expiresAt && grant.expiresAt < Date.now()) return false;
    
    // Verify signature
    if (!verifyGrantSignature(grant)) return false;
    
    return true;
  });
  
  if (validGrants.length === 0) {
    return {
      capabilityId,
      granted: false,
      reason: "No valid grant found"
    };
  }
  
  // RULE 3: Check scope and constraints
  for (const grant of validGrants) {
    if (checkScope(grant.scope, context) && 
        checkConstraints(grant.constraints, context)) {
      return {
        capabilityId,
        granted: true,
        reason: "Grant authorized",
        grant
      };
    }
  }
  
  return {
    capabilityId,
    granted: false,
    reason: "Scope or constraints not satisfied"
  };
}
```

### 5.3 Scope Validation

```typescript
function checkScope(scope: GrantScope, context: ExecutionContext): boolean {
  // RULE 1: Check resource restrictions
  if (scope.resources.length > 0) {
    if (!scope.resources.some(r => matchesResource(r, context.resource))) {
      return false;
    }
  }
  
  // RULE 2: Check action restrictions
  if (scope.actions.length > 0) {
    if (!scope.actions.includes(context.action)) {
      return false;
    }
  }
  
  // RULE 3: Evaluate conditions
  for (const condition of scope.conditions) {
    if (!evaluateCondition(condition, context)) {
      return false;
    }
  }
  
  return true;
}
```

---

## 6. Capability Delegation

### 6.1 Delegation Rules

Capability delegation MUST follow these rules:

1. Only capabilities with `delegatable: true` MAY be delegated
2. Delegated capabilities MUST have equal or lesser scope
3. Delegation depth MUST NOT exceed `maxDelegationDepth` (default: 3)
4. Delegated grants MUST expire before parent grant
5. Revoking parent grant MUST revoke all delegated grants

### 6.2 Delegation Structure

```typescript
interface DelegatedGrant extends CapabilityGrant {
  parentGrantId: string;         // Parent grant ID
  delegationDepth: number;       // Delegation level
  delegatable: boolean;          // Can be further delegated
}
```

### 6.3 Delegation Process

```typescript
async function delegateGrant(
  parentGrantId: string,
  delegatee: Grantee,
  scope: GrantScope
): Promise<DelegatedGrant> {
  // RULE 1: Validate parent grant
  const parentGrant = await getGrant(parentGrantId);
  if (!parentGrant) {
    throw new ValidationError("Parent grant not found");
  }
  
  // RULE 2: Check delegation allowed
  const capability = await getCapability(parentGrant.capabilityId);
  if (!capability.delegatable) {
    throw new AuthorizationError("Capability not delegatable");
  }
  
  // RULE 3: Check delegation depth
  const depth = getDelegationDepth(parentGrant);
  if (depth >= MAX_DELEGATION_DEPTH) {
    throw new ValidationError("Maximum delegation depth exceeded");
  }
  
  // RULE 4: Validate scope is subset
  if (!isScopeSubset(scope, parentGrant.scope)) {
    throw new ValidationError("Delegated scope exceeds parent scope");
  }
  
  // RULE 5: Create delegated grant
  const delegatedGrant: DelegatedGrant = {
    ...parentGrant,
    grantId: generateGrantId(),
    parentGrantId,
    grantee: delegatee,
    scope,
    delegationDepth: depth + 1,
    delegatable: depth + 1 < MAX_DELEGATION_DEPTH,
    issuedAt: Date.now(),
    expiresAt: Math.min(
      parentGrant.expiresAt || Infinity,
      Date.now() + DEFAULT_DELEGATION_TTL
    )
  };
  
  // RULE 6: Sign and store
  delegatedGrant.signature = signGrant(delegatedGrant);
  await storeGrant(delegatedGrant);
  
  return delegatedGrant;
}
```

---

## 7. Enforcement Rules

### 7.1 Runtime Enforcement

```typescript
function enforceCapability(
  capabilityId: string,
  action: string,
  resource: string
): void {
  // RULE 1: Get current execution context
  const context = getCurrentExecutionContext();
  
  // RULE 2: Check authorization decision
  const decision = context.authorizationDecision;
  if (!decision || !decision.granted) {
    throw new AuthorizationError("No authorization decision");
  }
  
  // RULE 3: Find capability decision
  const capDecision = decision.capabilities.find(
    c => c.capabilityId === capabilityId
  );
  
  if (!capDecision || !capDecision.granted) {
    throw new AuthorizationError(`Capability ${capabilityId} not granted`);
  }
  
  // RULE 4: Validate action and resource
  if (capDecision.grant) {
    if (!checkScope(capDecision.grant.scope, { action, resource })) {
      throw new AuthorizationError("Action or resource not in scope");
    }
  }
  
  // RULE 5: Emit telemetry
  emitTelemetry({
    event: "CAPABILITY_USED",
    capabilityId,
    action,
    resource
  });
}
```

### 7.2 Violation Handling

```typescript
function handleCapabilityViolation(
  violation: CapabilityViolation
): void {
  // RULE 1: Log violation
  logViolation(violation);
  
  // RULE 2: Emit security alert
  emitSecurityAlert({
    severity: "HIGH",
    type: "CAPABILITY_VIOLATION",
    details: violation
  });
  
  // RULE 3: Terminate execution
  terminateExecution(violation.executionId);
  
  // RULE 4: Rollback state
  StateTransaction.rollback();
  
  // RULE 5: Quarantine tool
  if (violation.severity === "CRITICAL") {
    quarantineTool(violation.toolId);
  }
}

interface CapabilityViolation {
  executionId: string;
  toolId: string;
  capabilityId: string;
  action: string;
  resource: string;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  timestamp: number;
}
```

---

## 8. Audit & Telemetry

### 8.1 Required Audit Events

```typescript
interface CapabilityAuditEvent {
  eventId: string;
  timestamp: number;
  event: CapabilityEvent;
  capabilityId: string;
  grantId?: string;
  grantee?: Grantee;
  grantor?: string;
  details: Record<string, unknown>;
}

type CapabilityEvent =
  | "GRANT_ISSUED"
  | "GRANT_REVOKED"
  | "GRANT_EXPIRED"
  | "GRANT_DELEGATED"
  | "AUTHORIZATION_GRANTED"
  | "AUTHORIZATION_DENIED"
  | "CAPABILITY_USED"
  | "CAPABILITY_VIOLATION";
```

### 8.2 Telemetry Metrics

The system MUST emit:

1. **Grant Issuance Rate**: Grants issued per time period
2. **Grant Revocation Rate**: Grants revoked per time period
3. **Authorization Success Rate**: Percentage of successful authorizations
4. **Authorization Denial Rate**: Percentage of denied authorizations
5. **Capability Usage**: Usage count per capability
6. **Violation Rate**: Violations per time period
7. **Delegation Depth**: Average and maximum delegation depth

---

## 9. Compliance Checklist

### 9.1 Implementation Compliance

- [ ] All capabilities are defined in taxonomy
- [ ] All grants are cryptographically signed
- [ ] All authorizations are audited
- [ ] All violations are detected and handled
- [ ] Grant revocation is immediate
- [ ] Delegation depth is enforced
- [ ] Scope validation is enforced
- [ ] Constraint evaluation is enforced

### 9.2 Security Compliance

- [ ] Capability escalation is prevented
- [ ] Grant forgery is prevented
- [ ] TOCTOU attacks are prevented
- [ ] Delegation abuse is prevented
- [ ] Revocation bypass is prevented
- [ ] Audit tampering is prevented

### 9.3 Integration Compliance

- [ ] Integrates with RFC-0001 execution model
- [ ] Integrates with RFC-0002 sandbox model
- [ ] Integrates with StateTransaction
- [ ] Integrates with ErrorHandler
- [ ] Integrates with Telemetry

---

## 10. Capability Registry

### 10.1 Registry Structure

```typescript
interface CapabilityRegistry {
  capabilities: Map<string, Capability>;
  grants: Map<string, CapabilityGrant>;
  hierarchy: CapabilityHierarchy;
}

interface CapabilityHierarchy {
  root: CapabilityNode;
}

interface CapabilityNode {
  capability: Capability;
  children: CapabilityNode[];
}
```

### 10.2 Registry Operations

```typescript
class CapabilityRegistryImpl implements CapabilityRegistry {
  async registerCapability(capability: Capability): Promise<void> {
    // Validate capability
    validateCapability(capability);
    
    // Check parent exists
    if (capability.parent) {
      const parent = await this.getCapability(capability.parent);
      if (!parent) {
        throw new ValidationError("Parent capability not found");
      }
    }
    
    // Store capability
    this.capabilities.set(capability.id, capability);
    
    // Update hierarchy
    this.updateHierarchy(capability);
  }
  
  async getCapability(id: string): Promise<Capability | null> {
    return this.capabilities.get(id) || null;
  }
  
  async listCapabilities(): Promise<Capability[]> {
    return Array.from(this.capabilities.values());
  }
  
  async getDescendants(id: string): Promise<Capability[]> {
    const node = this.findNode(id);
    if (!node) return [];
    
    return this.collectDescendants(node);
  }
}
```

---

## 11. References

- RFC-0001: Core Tool Execution Model
- RFC-0002: Sandbox & Isolation Model
- RFC 2119: Key words for use in RFCs
- OAuth 2.0 Token Introspection (RFC 7662)
- Capability-Based Security

---

## 12. Appendix A: Example Capability Grant

```typescript
const exampleGrant: CapabilityGrant = {
  grantId: "grant-12345",
  capabilityId: "filesystem.read",
  grantee: {
    type: "TOOL",
    id: "file.reader.v1"
  },
  grantor: "admin@system",
  scope: {
    resources: ["/data/**", "/config/**"],
    actions: ["read", "stat"],
    conditions: [
      {
        type: "TIME",
        expression: "hour >= 9 && hour <= 17"
      }
    ]
  },
  constraints: [
    {
      type: "rate_limit",
      value: { max: 100, window: 60000 }
    },
    {
      type: "max_file_size",
      value: 10485760
    }
  ],
  issuedAt: 1704153600000,
  expiresAt: 1735689600000,
  signature: "a1b2c3d4e5f6..."
};
```

---

## 13. Appendix B: Example Authorization Flow

```typescript
async function exampleAuthorizationFlow() {
  // Tool declaration
  const tool: ToolDeclaration = {
    id: "data.processor",
    requiredCapabilities: [
      "filesystem.read",
      "filesystem.write",
      "network.https"
    ],
    // ... other properties
  };
  
  // Execution context
  const context: ExecutionContext = {
    toolId: tool.id,
    userId: "user-123",
    action: "process",
    resource: "/data/input.csv",
    timestamp: Date.now()
  };
  
  // Authorize
  const decision = await authorize(tool, context);
  
  if (!decision.granted) {
    throw new AuthorizationError("Authorization denied");
  }
  
  // Execute with capabilities
  await executeTool(tool, context, decision);
}
```

---

**END OF RFC-0003**

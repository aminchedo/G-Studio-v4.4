# RFC-0002: Sandbox & Isolation Model

**Status**: ACTIVE  
**Version**: 1.0.0  
**Authors**: System Architecture Team  
**Created**: 2026-01-02  
**Last Modified**: 2026-01-02

---

## 1. Purpose and Scope

### 1.1 Purpose

This RFC defines the normative isolation and containment model for tool execution. It establishes:

- Sandbox architecture and boundaries
- Resource isolation mechanisms
- Filesystem and process containment
- Network isolation policies
- Escape prevention and detection

### 1.2 Scope

This specification applies to:

- All tool executions requiring isolation
- Sandbox runtime implementation
- Resource allocation and limits
- Security boundary enforcement

### 1.3 Conformance Language

The key words "MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT", "SHOULD", "SHOULD NOT", "RECOMMENDED", "MAY", and "OPTIONAL" in this document are to be interpreted as described in RFC 2119.

---

## 2. Threat Model

### 2.1 Threats

| ID | Threat | Severity | Mitigation |
|----|--------|----------|------------|
| T-101 | Filesystem escape via path traversal | CRITICAL | Path validation and chroot enforcement |
| T-102 | Process escape via fork/exec | CRITICAL | Process namespace isolation |
| T-103 | Resource exhaustion (CPU/memory) | HIGH | Resource limits and cgroups |
| T-104 | Network exfiltration | HIGH | Network namespace isolation |
| T-105 | Privilege escalation | CRITICAL | Capability dropping and seccomp |
| T-106 | Shared memory exploitation | HIGH | Memory namespace isolation |
| T-107 | Timing attacks | MEDIUM | Execution time normalization |
| T-108 | Side-channel leakage | MEDIUM | Resource usage monitoring |

### 2.2 Security Boundaries

```
┌─────────────────────────────────────────┐
│         Host System (Trusted)           │
│  ┌───────────────────────────────────┐  │
│  │   Sandbox Runtime (Trusted)       │  │
│  │  ┌─────────────────────────────┐  │  │
│  │  │  Tool Execution (Untrusted) │  │  │
│  │  │  - Isolated filesystem      │  │  │
│  │  │  - Isolated processes       │  │  │
│  │  │  - Isolated network         │  │  │
│  │  │  - Limited resources        │  │  │
│  │  └─────────────────────────────┘  │  │
│  └───────────────────────────────────┘  │
└─────────────────────────────────────────┘
```

---

## 3. Sandbox Architecture

### 3.1 Isolation Levels

The system defines three isolation levels:

#### 3.1.1 LEVEL_0: No Isolation

- No sandbox enforcement
- Direct host access
- MUST only be used for trusted system tools
- REQUIRES explicit administrator approval

#### 3.1.2 LEVEL_1: Process Isolation

- Separate process namespace
- Resource limits enforced
- Filesystem access restricted
- RECOMMENDED for low-risk tools

#### 3.1.3 LEVEL_2: Full Isolation

- Complete namespace isolation
- Chroot filesystem
- Network isolation
- Seccomp filtering
- REQUIRED for untrusted tools

### 3.2 Sandbox Declaration

Every tool MUST declare its isolation requirements:

```typescript
interface SandboxPolicy {
  isolationLevel: "LEVEL_0" | "LEVEL_1" | "LEVEL_2";
  filesystem: FilesystemPolicy;
  process: ProcessPolicy;
  network: NetworkPolicy;
  resources: ResourcePolicy;
  syscalls: SyscallPolicy;
}

interface FilesystemPolicy {
  rootPath: string;              // Sandbox root directory
  readOnlyPaths: string[];       // Read-only mount points
  readWritePaths: string[];      // Read-write mount points
  deniedPaths: string[];         // Explicitly denied paths
  maxFileSize: number;           // Maximum file size (bytes)
  maxTotalSize: number;          // Maximum total storage (bytes)
}

interface ProcessPolicy {
  maxProcesses: number;          // Maximum concurrent processes
  allowFork: boolean;            // Allow process forking
  allowExec: boolean;            // Allow exec syscalls
  allowedExecutables: string[];  // Whitelist of executables
}

interface NetworkPolicy {
  allowNetwork: boolean;         // Allow network access
  allowedHosts: string[];        // Whitelist of hosts
  allowedPorts: number[];        // Whitelist of ports
  maxConnections: number;        // Maximum concurrent connections
}

interface ResourcePolicy {
  maxCPU: number;                // Maximum CPU time (ms)
  maxMemory: number;             // Maximum memory (bytes)
  maxFileDescriptors: number;    // Maximum open files
  maxThreads: number;            // Maximum threads
}

interface SyscallPolicy {
  mode: "WHITELIST" | "BLACKLIST";
  syscalls: string[];            // Allowed or denied syscalls
}
```

---

## 4. Filesystem Isolation

### 4.1 Path Validation

All filesystem operations MUST:

1. Validate paths against allowed patterns
2. Resolve symbolic links before validation
3. Reject path traversal attempts (`..`, absolute paths)
4. Normalize paths to canonical form
5. Check against denied path list

```typescript
function validatePath(path: string, policy: FilesystemPolicy): boolean {
  // RULE 1: Normalize path
  const normalized = normalizePath(path);
  
  // RULE 2: Reject absolute paths outside sandbox
  if (isAbsolute(normalized) && !isWithinRoot(normalized, policy.rootPath)) {
    return false;
  }
  
  // RULE 3: Reject path traversal
  if (containsTraversal(normalized)) {
    return false;
  }
  
  // RULE 4: Check denied paths
  if (matchesDeniedPath(normalized, policy.deniedPaths)) {
    return false;
  }
  
  // RULE 5: Resolve symlinks and revalidate
  const resolved = resolveSymlinks(normalized);
  if (!isWithinRoot(resolved, policy.rootPath)) {
    return false;
  }
  
  return true;
}
```

### 4.2 Chroot Enforcement

For LEVEL_2 isolation, the system MUST:

1. Create isolated filesystem root
2. Mount only approved paths
3. Apply read-only flags where specified
4. Prevent mount namespace escape
5. Clean up on sandbox termination

### 4.3 File Size Limits

The system MUST enforce:

1. Maximum individual file size
2. Maximum total storage usage
3. Inode limits
4. Disk quota enforcement

---

## 5. Process Isolation

### 5.1 Process Namespace

For LEVEL_1 and LEVEL_2 isolation, the system MUST:

1. Create separate PID namespace
2. Prevent visibility of host processes
3. Isolate process tree
4. Prevent PID exhaustion attacks

### 5.2 Process Limits

The system MUST enforce:

```typescript
function enforceProcessLimits(policy: ProcessPolicy): void {
  // RULE 1: Maximum process count
  if (getProcessCount() >= policy.maxProcesses) {
    throw new ResourceError("Process limit exceeded");
  }
  
  // RULE 2: Fork restrictions
  if (!policy.allowFork && isForkAttempt()) {
    throw new SecurityError("Fork not allowed");
  }
  
  // RULE 3: Exec restrictions
  if (!policy.allowExec && isExecAttempt()) {
    throw new SecurityError("Exec not allowed");
  }
  
  // RULE 4: Executable whitelist
  if (policy.allowedExecutables.length > 0) {
    if (!isAllowedExecutable(getExecutablePath(), policy.allowedExecutables)) {
      throw new SecurityError("Executable not allowed");
    }
  }
}
```

### 5.3 Signal Handling

The sandbox MUST:

1. Intercept all signals to sandboxed processes
2. Prevent signal-based escape attempts
3. Terminate sandbox on critical signals
4. Log all signal events

---

## 6. Network Isolation

### 6.1 Network Namespace

For LEVEL_2 isolation, the system MUST:

1. Create separate network namespace
2. Provide isolated loopback interface
3. Restrict external network access
4. Monitor all network connections

### 6.2 Network Policy Enforcement

```typescript
function enforceNetworkPolicy(
  destination: string,
  port: number,
  policy: NetworkPolicy
): void {
  // RULE 1: Network access allowed
  if (!policy.allowNetwork) {
    throw new SecurityError("Network access denied");
  }
  
  // RULE 2: Host whitelist
  if (policy.allowedHosts.length > 0) {
    if (!isAllowedHost(destination, policy.allowedHosts)) {
      throw new SecurityError("Host not allowed");
    }
  }
  
  // RULE 3: Port whitelist
  if (policy.allowedPorts.length > 0) {
    if (!policy.allowedPorts.includes(port)) {
      throw new SecurityError("Port not allowed");
    }
  }
  
  // RULE 4: Connection limit
  if (getConnectionCount() >= policy.maxConnections) {
    throw new ResourceError("Connection limit exceeded");
  }
}
```

### 6.3 DNS Isolation

The system MUST:

1. Provide isolated DNS resolver
2. Log all DNS queries
3. Enforce DNS query limits
4. Prevent DNS tunneling

---

## 7. Resource Isolation

### 7.1 CPU Limits

The system MUST enforce:

```typescript
function enforceCPULimits(policy: ResourcePolicy): void {
  // RULE 1: CPU time limit
  if (getCPUTime() >= policy.maxCPU) {
    throw new ResourceError("CPU time limit exceeded");
  }
  
  // RULE 2: CPU throttling
  applyCPUThrottle(policy.maxCPU);
  
  // RULE 3: CPU affinity
  setCPUAffinity(getAllowedCPUs());
}
```

### 7.2 Memory Limits

The system MUST enforce:

```typescript
function enforceMemoryLimits(policy: ResourcePolicy): void {
  // RULE 1: Memory limit
  if (getMemoryUsage() >= policy.maxMemory) {
    throw new ResourceError("Memory limit exceeded");
  }
  
  // RULE 2: OOM killer configuration
  configureOOMKiller(policy.maxMemory);
  
  // RULE 3: Swap restrictions
  disableSwap();
}
```

### 7.3 I/O Limits

The system MUST enforce:

```typescript
function enforceIOLimits(policy: ResourcePolicy): void {
  // RULE 1: File descriptor limit
  if (getOpenFileCount() >= policy.maxFileDescriptors) {
    throw new ResourceError("File descriptor limit exceeded");
  }
  
  // RULE 2: I/O bandwidth throttling
  applyIOThrottle(policy.maxIOBandwidth);
  
  // RULE 3: I/O operation limits
  enforceIOPSLimit(policy.maxIOPS);
}
```

---

## 8. Syscall Filtering

### 8.1 Seccomp Profiles

For LEVEL_2 isolation, the system MUST:

1. Apply seccomp-bpf filters
2. Use whitelist mode by default
3. Deny dangerous syscalls
4. Log blocked syscall attempts

### 8.2 Dangerous Syscalls

The following syscalls MUST be blocked in LEVEL_2:

```typescript
const BLOCKED_SYSCALLS = [
  "ptrace",           // Process tracing
  "kexec_load",       // Kernel execution
  "open_by_handle_at",// Filesystem bypass
  "perf_event_open",  // Performance monitoring
  "bpf",              // BPF manipulation
  "userfaultfd",      // Memory manipulation
  "io_uring_setup",   // Async I/O bypass
  "mount",            // Filesystem mounting
  "umount",           // Filesystem unmounting
  "pivot_root",       // Root directory change
  "chroot",           // Chroot escape
  "unshare",          // Namespace manipulation
  "setns",            // Namespace joining
  "clone",            // Process cloning (if fork disabled)
];
```

### 8.3 Syscall Auditing

The system MUST:

1. Log all blocked syscall attempts
2. Include syscall number and arguments
3. Emit security alert on suspicious patterns
4. Terminate sandbox on repeated violations

---

## 9. Escape Prevention

### 9.1 Escape Detection

The system MUST monitor for:

```typescript
interface EscapeIndicator {
  type: "FILESYSTEM" | "PROCESS" | "NETWORK" | "SYSCALL";
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  description: string;
  timestamp: number;
}

const ESCAPE_INDICATORS: EscapeIndicator[] = [
  {
    type: "FILESYSTEM",
    severity: "CRITICAL",
    description: "Path traversal attempt detected"
  },
  {
    type: "PROCESS",
    severity: "CRITICAL",
    description: "Unauthorized exec attempt"
  },
  {
    type: "NETWORK",
    severity: "HIGH",
    description: "Unauthorized network connection"
  },
  {
    type: "SYSCALL",
    severity: "CRITICAL",
    description: "Blocked syscall attempted"
  }
];
```

### 9.2 Escape Response

On escape attempt detection, the system MUST:

1. Immediately terminate sandbox
2. Rollback all state changes
3. Emit critical security alert
4. Log full execution trace
5. Quarantine tool for review

### 9.3 Escape Prevention Checklist

- [ ] Path validation prevents traversal
- [ ] Symlinks are resolved and validated
- [ ] Process namespace prevents host visibility
- [ ] Network namespace prevents unauthorized access
- [ ] Seccomp filters block dangerous syscalls
- [ ] Resource limits prevent exhaustion
- [ ] Capability set is minimized
- [ ] Mount namespace prevents escape

---

## 10. Sandbox Lifecycle

### 10.1 Sandbox Creation

```typescript
async function createSandbox(policy: SandboxPolicy): Promise<Sandbox> {
  const sandboxId = generateSandboxId();
  
  // STEP 1: Create filesystem root
  const rootPath = await createSandboxRoot(sandboxId);
  
  // STEP 2: Mount required paths
  await mountSandboxPaths(rootPath, policy.filesystem);
  
  // STEP 3: Create namespaces
  const namespaces = await createNamespaces(policy.isolationLevel);
  
  // STEP 4: Apply resource limits
  await applyResourceLimits(sandboxId, policy.resources);
  
  // STEP 5: Configure seccomp
  await configureSeccomp(policy.syscalls);
  
  // STEP 6: Drop capabilities
  await dropCapabilities();
  
  return {
    id: sandboxId,
    rootPath,
    namespaces,
    policy,
    createdAt: Date.now()
  };
}
```

### 10.2 Sandbox Execution

```typescript
async function executeSandboxed(
  sandbox: Sandbox,
  tool: ToolDeclaration,
  input: unknown
): Promise<ToolResult> {
  try {
    // STEP 1: Enter sandbox
    await enterSandbox(sandbox);
    
    // STEP 2: Validate environment
    validateSandboxEnvironment(sandbox);
    
    // STEP 3: Execute tool
    const result = await tool.execute(input);
    
    // STEP 4: Exit sandbox
    await exitSandbox(sandbox);
    
    return result;
    
  } catch (error) {
    // Emergency sandbox termination
    await terminateSandbox(sandbox);
    throw error;
  }
}
```

### 10.3 Sandbox Cleanup

```typescript
async function destroySandbox(sandbox: Sandbox): Promise<void> {
  // STEP 1: Terminate all processes
  await terminateAllProcesses(sandbox);
  
  // STEP 2: Unmount filesystems
  await unmountSandboxPaths(sandbox.rootPath);
  
  // STEP 3: Remove filesystem root
  await removeSandboxRoot(sandbox.rootPath);
  
  // STEP 4: Release resources
  await releaseResources(sandbox.id);
  
  // STEP 5: Emit cleanup event
  emitAuditEvent({
    sandboxId: sandbox.id,
    event: "SANDBOX_DESTROYED",
    timestamp: Date.now()
  });
}
```

---

## 11. Audit & Telemetry

### 11.1 Required Audit Events

```typescript
interface SandboxAuditEvent {
  eventId: string;
  sandboxId: string;
  timestamp: number;
  event: SandboxEvent;
  details: Record<string, unknown>;
}

type SandboxEvent =
  | "SANDBOX_CREATED"
  | "SANDBOX_ENTERED"
  | "SANDBOX_EXITED"
  | "SANDBOX_DESTROYED"
  | "POLICY_VIOLATION"
  | "ESCAPE_ATTEMPT"
  | "RESOURCE_LIMIT_EXCEEDED"
  | "SYSCALL_BLOCKED";
```

### 11.2 Telemetry Metrics

The system MUST emit:

1. **Sandbox Creation Rate**: Sandboxes created per second
2. **Sandbox Lifetime**: Duration of sandbox existence
3. **Policy Violations**: Count of policy violations
4. **Escape Attempts**: Count of escape attempts
5. **Resource Usage**: CPU, memory, I/O per sandbox
6. **Syscall Blocks**: Count of blocked syscalls

---

## 12. Compliance Checklist

### 12.1 Implementation Compliance

- [ ] All isolation levels are implemented
- [ ] Filesystem isolation is enforced
- [ ] Process isolation is enforced
- [ ] Network isolation is enforced
- [ ] Resource limits are enforced
- [ ] Seccomp filtering is active
- [ ] Escape detection is active
- [ ] Audit events are emitted

### 12.2 Security Compliance

- [ ] Path traversal is prevented
- [ ] Symlink attacks are prevented
- [ ] Process escape is prevented
- [ ] Network exfiltration is prevented
- [ ] Privilege escalation is prevented
- [ ] Resource exhaustion is prevented
- [ ] Dangerous syscalls are blocked

### 12.3 Integration Compliance

- [ ] Integrates with RFC-0001 execution model
- [ ] Integrates with RFC-0003 capability system
- [ ] Integrates with StateTransaction
- [ ] Integrates with ErrorHandler
- [ ] Integrates with Telemetry

---

## 13. Platform-Specific Considerations

### 13.1 Linux

- Use namespaces (PID, mount, network, IPC, UTS)
- Use cgroups for resource limits
- Use seccomp-bpf for syscall filtering
- Use capabilities for privilege management

### 13.2 Windows

- Use Job Objects for resource limits
- Use AppContainer for isolation
- Use Restricted Tokens for privilege management
- Use Windows Filtering Platform for network isolation

### 13.3 macOS

- Use sandbox-exec for sandboxing
- Use launchd for resource limits
- Use TrustedBSD MAC framework
- Use Network Extension for network isolation

---

## 14. References

- RFC-0001: Core Tool Execution Model
- RFC-0003: Capability & Permission System
- Linux namespaces(7) man page
- seccomp(2) man page
- cgroups(7) man page

---

## 15. Appendix A: Example Sandbox Policy

```typescript
const examplePolicy: SandboxPolicy = {
  isolationLevel: "LEVEL_2",
  filesystem: {
    rootPath: "/var/sandbox/tool-12345",
    readOnlyPaths: ["/usr", "/lib", "/lib64"],
    readWritePaths: ["/tmp", "/var/tmp"],
    deniedPaths: ["/proc", "/sys", "/dev"],
    maxFileSize: 10485760,      // 10 MB
    maxTotalSize: 104857600     // 100 MB
  },
  process: {
    maxProcesses: 10,
    allowFork: true,
    allowExec: false,
    allowedExecutables: []
  },
  network: {
    allowNetwork: false,
    allowedHosts: [],
    allowedPorts: [],
    maxConnections: 0
  },
  resources: {
    maxCPU: 5000,               // 5 seconds
    maxMemory: 52428800,        // 50 MB
    maxFileDescriptors: 100,
    maxThreads: 10
  },
  syscalls: {
    mode: "WHITELIST",
    syscalls: [
      "read", "write", "open", "close",
      "stat", "fstat", "lstat",
      "mmap", "munmap", "brk",
      "exit", "exit_group"
    ]
  }
};
```

---

**END OF RFC-0002**

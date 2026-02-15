/**
 * RFC-0002 Enforcement: Sandbox Policy Engine
 * 
 * This module implements sandbox policy enforcement as specified in RFC-0002.
 * All tool executions MUST comply with declared sandbox policies.
 */

import { minimatch } from 'minimatch';
import { resolve, normalize, isAbsolute } from 'path';

// ============================================================================
// Types
// ============================================================================

export interface SandboxPolicy {
  isolationLevel: 'LEVEL_0' | 'LEVEL_1' | 'LEVEL_2';
  filesystem: FilesystemPolicy;
  process: ProcessPolicy;
  network: NetworkPolicy;
  resources: ResourcePolicy;
  syscalls: SyscallPolicy;
}

export interface FilesystemPolicy {
  rootPath: string;
  readOnlyPaths: string[];
  readWritePaths: string[];
  deniedPaths: string[];
  maxFileSize: number;
  maxTotalSize: number;
}

export interface ProcessPolicy {
  maxProcesses: number;
  allowFork: boolean;
  allowExec: boolean;
  allowedExecutables: string[];
}

export interface NetworkPolicy {
  allowNetwork: boolean;
  allowedHosts: string[];
  allowedPorts: number[];
  maxConnections: number;
}

export interface ResourcePolicy {
  maxCPU: number;
  maxMemory: number;
  maxFileDescriptors: number;
  maxThreads: number;
}

export interface SyscallPolicy {
  mode: 'WHITELIST' | 'BLACKLIST';
  syscalls: string[];
}

export interface PolicyViolation {
  type: 'FILESYSTEM' | 'PROCESS' | 'NETWORK' | 'RESOURCE' | 'SYSCALL';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  message: string;
  details: Record<string, unknown>;
}

export interface PathValidationResult {
  allowed: boolean;
  reason?: string;
}

export interface NetworkValidationResult {
  allowed: boolean;
  reason?: string;
}

// ============================================================================
// Constants
// ============================================================================

/**
 * RFC-0002 Section 8.2: Dangerous Syscalls
 * 
 * These syscalls MUST be blocked in LEVEL_2 isolation
 */
export const BLOCKED_SYSCALLS = [
  'ptrace',
  'kexec_load',
  'open_by_handle_at',
  'perf_event_open',
  'bpf',
  'userfaultfd',
  'io_uring_setup',
  'mount',
  'umount',
  'pivot_root',
  'chroot',
  'unshare',
  'setns',
  'clone',
] as const;

// ============================================================================
// Policy Engine Implementation
// ============================================================================

export class PolicyEngine {
  /**
   * RFC-0002 Section 4.1: Path Validation
   * 
   * All filesystem operations MUST:
   * 1. Validate paths against allowed patterns
   * 2. Resolve symbolic links before validation
   * 3. Reject path traversal attempts
   * 4. Normalize paths to canonical form
   * 5. Check against denied path list
   */
  validatePath(
    path: string,
    operation: 'read' | 'write' | 'delete' | 'execute',
    policy: FilesystemPolicy
  ): PathValidationResult {
    // RULE 1: Normalize path
    const normalized = normalize(path);

    // RULE 2: Reject absolute paths outside sandbox
    if (isAbsolute(normalized) && !this.isWithinRoot(normalized, policy.rootPath)) {
      return {
        allowed: false,
        reason: 'Path outside sandbox root',
      };
    }

    // RULE 3: Reject path traversal
    if (this.containsTraversal(normalized)) {
      return {
        allowed: false,
        reason: 'Path traversal detected',
      };
    }

    // RULE 4: Check denied paths
    if (this.matchesDeniedPath(normalized, policy.deniedPaths)) {
      return {
        allowed: false,
        reason: 'Path explicitly denied',
      };
    }

    // RULE 5: Check operation-specific permissions
    if (operation === 'write' || operation === 'delete') {
      if (!this.matchesAllowedPath(normalized, policy.readWritePaths)) {
        return {
          allowed: false,
          reason: 'Write operation not allowed on path',
        };
      }
    } else if (operation === 'read') {
      const readAllowed = this.matchesAllowedPath(normalized, policy.readOnlyPaths) ||
                         this.matchesAllowedPath(normalized, policy.readWritePaths);
      if (!readAllowed) {
        return {
          allowed: false,
          reason: 'Read operation not allowed on path',
        };
      }
    }

    return { allowed: true };
  }

  /**
   * RFC-0002 Section 5.2: Process Limits
   * 
   * The system MUST enforce process limits
   */
  validateProcessOperation(
    operation: 'fork' | 'exec' | 'spawn',
    executablePath: string | null,
    currentProcessCount: number,
    policy: ProcessPolicy
  ): PathValidationResult {
    // RULE 1: Maximum process count
    if (currentProcessCount >= policy.maxProcesses) {
      return {
        allowed: false,
        reason: 'Process limit exceeded',
      };
    }

    // RULE 2: Fork restrictions
    if (operation === 'fork' && !policy.allowFork) {
      return {
        allowed: false,
        reason: 'Fork not allowed',
      };
    }

    // RULE 3: Exec restrictions
    if ((operation === 'exec' || operation === 'spawn') && !policy.allowExec) {
      return {
        allowed: false,
        reason: 'Exec not allowed',
      };
    }

    // RULE 4: Executable whitelist
    if (executablePath && policy.allowedExecutables.length > 0) {
      if (!this.matchesAllowedPath(executablePath, policy.allowedExecutables)) {
        return {
          allowed: false,
          reason: 'Executable not in whitelist',
        };
      }
    }

    return { allowed: true };
  }

  /**
   * RFC-0002 Section 6.2: Network Policy Enforcement
   * 
   * The system MUST enforce network policies
   */
  validateNetworkOperation(
    destination: string,
    port: number,
    currentConnectionCount: number,
    policy: NetworkPolicy
  ): NetworkValidationResult {
    // RULE 1: Network access allowed
    if (!policy.allowNetwork) {
      return {
        allowed: false,
        reason: 'Network access denied',
      };
    }

    // RULE 2: Host whitelist
    if (policy.allowedHosts.length > 0) {
      if (!this.matchesAllowedHost(destination, policy.allowedHosts)) {
        return {
          allowed: false,
          reason: 'Host not in whitelist',
        };
      }
    }

    // RULE 3: Port whitelist
    if (policy.allowedPorts.length > 0) {
      if (!policy.allowedPorts.includes(port)) {
        return {
          allowed: false,
          reason: 'Port not in whitelist',
        };
      }
    }

    // RULE 4: Connection limit
    if (currentConnectionCount >= policy.maxConnections) {
      return {
        allowed: false,
        reason: 'Connection limit exceeded',
      };
    }

    return { allowed: true };
  }

  /**
   * RFC-0002 Section 8.1: Seccomp Profiles
   * 
   * The system MUST validate syscall operations
   */
  validateSyscall(syscall: string, policy: SyscallPolicy): PathValidationResult {
    if (policy.mode === 'WHITELIST') {
      if (!policy.syscalls.includes(syscall)) {
        return {
          allowed: false,
          reason: 'Syscall not in whitelist',
        };
      }
    } else {
      if (policy.syscalls.includes(syscall)) {
        return {
          allowed: false,
          reason: 'Syscall in blacklist',
        };
      }
    }

    return { allowed: true };
  }

  /**
   * RFC-0002 Section 7: Resource Isolation
   * 
   * Validate resource usage against limits
   */
  validateResourceUsage(
    resourceType: 'cpu' | 'memory' | 'fileDescriptors' | 'threads',
    currentUsage: number,
    policy: ResourcePolicy
  ): PathValidationResult {
    let limit: number;
    let resourceName: string;

    switch (resourceType) {
      case 'cpu':
        limit = policy.maxCPU;
        resourceName = 'CPU time';
        break;
      case 'memory':
        limit = policy.maxMemory;
        resourceName = 'Memory';
        break;
      case 'fileDescriptors':
        limit = policy.maxFileDescriptors;
        resourceName = 'File descriptors';
        break;
      case 'threads':
        limit = policy.maxThreads;
        resourceName = 'Threads';
        break;
    }

    if (currentUsage >= limit) {
      return {
        allowed: false,
        reason: `${resourceName} limit exceeded`,
      };
    }

    return { allowed: true };
  }

  /**
   * Validate complete sandbox policy
   */
  validatePolicy(policy: SandboxPolicy): PolicyViolation[] {
    const violations: PolicyViolation[] = [];

    // Validate isolation level
    if (!['LEVEL_0', 'LEVEL_1', 'LEVEL_2'].includes(policy.isolationLevel)) {
      violations.push({
        type: 'RESOURCE',
        severity: 'CRITICAL',
        message: 'Invalid isolation level',
        details: { isolationLevel: policy.isolationLevel },
      });
    }

    // Validate filesystem policy
    if (!policy.filesystem.rootPath) {
      violations.push({
        type: 'FILESYSTEM',
        severity: 'CRITICAL',
        message: 'Sandbox root path not specified',
        details: {},
      });
    }

    // Validate resource limits
    if (policy.resources.maxCPU < 1 || policy.resources.maxCPU > 300000) {
      violations.push({
        type: 'RESOURCE',
        severity: 'HIGH',
        message: 'Invalid CPU limit',
        details: { maxCPU: policy.resources.maxCPU },
      });
    }

    if (policy.resources.maxMemory < 1048576 || policy.resources.maxMemory > 1073741824) {
      violations.push({
        type: 'RESOURCE',
        severity: 'HIGH',
        message: 'Invalid memory limit',
        details: { maxMemory: policy.resources.maxMemory },
      });
    }

    // Validate syscall policy for LEVEL_2
    if (policy.isolationLevel === 'LEVEL_2') {
      if (policy.syscalls.mode === 'BLACKLIST') {
        const missingBlocked = BLOCKED_SYSCALLS.filter(
          syscall => !policy.syscalls.syscalls.includes(syscall)
        );
        if (missingBlocked.length > 0) {
          violations.push({
            type: 'SYSCALL',
            severity: 'CRITICAL',
            message: 'Dangerous syscalls not blocked in LEVEL_2',
            details: { missing: missingBlocked },
          });
        }
      }
    }

    return violations;
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private isWithinRoot(path: string, root: string): boolean {
    const resolvedPath = resolve(path);
    const resolvedRoot = resolve(root);
    return resolvedPath.startsWith(resolvedRoot);
  }

  private containsTraversal(path: string): boolean {
    return path.includes('..') || path.includes('./') || path.includes('.\\');
  }

  private matchesDeniedPath(path: string, deniedPaths: string[]): boolean {
    return deniedPaths.some(pattern => minimatch(path, pattern));
  }

  private matchesAllowedPath(path: string, allowedPaths: string[]): boolean {
    if (allowedPaths.length === 0) return true;
    return allowedPaths.some(pattern => minimatch(path, pattern));
  }

  private matchesAllowedHost(host: string, allowedHosts: string[]): boolean {
    return allowedHosts.some(pattern => minimatch(host, pattern));
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

export const policyEngine = new PolicyEngine();

// ============================================================================
// Convenience Functions
// ============================================================================

export function validatePath(
  path: string,
  operation: 'read' | 'write' | 'delete' | 'execute',
  policy: FilesystemPolicy
): PathValidationResult {
  return policyEngine.validatePath(path, operation, policy);
}

export function validateProcessOperation(
  operation: 'fork' | 'exec' | 'spawn',
  executablePath: string | null,
  currentProcessCount: number,
  policy: ProcessPolicy
): PathValidationResult {
  return policyEngine.validateProcessOperation(
    operation,
    executablePath,
    currentProcessCount,
    policy
  );
}

export function validateNetworkOperation(
  destination: string,
  port: number,
  currentConnectionCount: number,
  policy: NetworkPolicy
): NetworkValidationResult {
  return policyEngine.validateNetworkOperation(
    destination,
    port,
    currentConnectionCount,
    policy
  );
}

export function validateSyscall(
  syscall: string,
  policy: SyscallPolicy
): PathValidationResult {
  return policyEngine.validateSyscall(syscall, policy);
}

export function validatePolicy(policy: SandboxPolicy): PolicyViolation[] {
  return policyEngine.validatePolicy(policy);
}

/**
 * AuditLogger - Comprehensive Audit Trail System
 * 
 * Purpose: Track all filesystem operations for compliance and debugging
 * - Structured audit logs with full context
 * - Query and reporting capabilities
 * - Compliance tracking
 * - Forensic analysis support
 * 
 * Phase 3: Advanced Safety & Policy Framework
 */

import { TelemetryService } from './telemetryService';
import { Role } from './policyEngine';

// ==================== TYPES ====================

export enum AuditEventType {
  FILE_READ = 'file_read',
  FILE_WRITE = 'file_write',
  FILE_DELETE = 'file_delete',
  FILE_MOVE = 'file_move',
  DIRECTORY_CREATE = 'directory_create',
  POLICY_EVALUATION = 'policy_evaluation',
  ACCESS_DENIED = 'access_denied',
  ERROR = 'error',
}

export enum AuditSeverity {
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  CRITICAL = 'critical',
}

export interface AuditEntry {
  id: string;
  timestamp: number;
  eventType: AuditEventType;
  severity: AuditSeverity;
  
  // Actor information
  role: Role;
  userId?: string;
  sessionId?: string;
  
  // Operation details
  tool: string;
  operation: string;
  resource: string; // File path or resource identifier
  
  // Context
  args: Record<string, any>;
  result: {
    success: boolean;
    error?: string;
    data?: any;
  };
  
  // Policy & security
  policyEvaluated?: boolean;
  policyAllowed?: boolean;
  policyRules?: string[];
  
  // Performance
  duration: number;
  
  // Additional metadata
  metadata?: Record<string, any>;
}

export interface AuditQuery {
  // Time range
  startTime?: number;
  endTime?: number;
  
  // Filters
  eventTypes?: AuditEventType[];
  severities?: AuditSeverity[];
  roles?: Role[];
  tools?: string[];
  resources?: string[];
  
  // Search
  searchTerm?: string;
  
  // Pagination
  limit?: number;
  offset?: number;
  
  // Sorting
  sortBy?: 'timestamp' | 'severity' | 'duration';
  sortOrder?: 'asc' | 'desc';
}

export interface AuditReport {
  summary: {
    totalEvents: number;
    byEventType: Record<AuditEventType, number>;
    bySeverity: Record<AuditSeverity, number>;
    byRole: Record<Role, number>;
    successRate: number;
    averageDuration: number;
  };
  entries: AuditEntry[];
  timeRange: {
    start: number;
    end: number;
  };
  generatedAt: number;
}

export interface ComplianceReport {
  period: {
    start: number;
    end: number;
  };
  metrics: {
    totalOperations: number;
    successfulOperations: number;
    failedOperations: number;
    accessDenials: number;
    policyViolations: number;
    criticalEvents: number;
  };
  byRole: Record<Role, {
    operations: number;
    denials: number;
    violations: number;
  }>;
  topResources: Array<{
    resource: string;
    accessCount: number;
    lastAccessed: number;
  }>;
  securityEvents: AuditEntry[];
  generatedAt: number;
}

// ==================== AUDIT LOGGER ====================

export class AuditLogger {
  private static entries: AuditEntry[] = [];
  private static maxEntries = 10000;
  private static persistenceEnabled = false;
  private static persistencePath?: string;

  /**
   * Log an audit event
   */
  static log(entry: Omit<AuditEntry, 'id' | 'timestamp'>): void {
    const auditEntry: AuditEntry = {
      ...entry,
      id: this.generateId(),
      timestamp: Date.now(),
    };

    this.entries.push(auditEntry);

    // Maintain size limit
    if (this.entries.length > this.maxEntries) {
      this.entries.shift();
    }

    // Record in telemetry
    TelemetryService.recordEvent('audit_log', {
      eventType: entry.eventType,
      severity: entry.severity,
      role: entry.role,
      tool: entry.tool,
      success: entry.result.success,
    });

    // Persist if enabled
    if (this.persistenceEnabled) {
      this.persist(auditEntry);
    }
  }

  /**
   * Log a file operation
   */
  static logFileOperation(params: {
    eventType: AuditEventType;
    role: Role;
    tool: string;
    resource: string;
    args: Record<string, any>;
    result: { success: boolean; error?: string; data?: any };
    duration: number;
    policyEvaluated?: boolean;
    policyAllowed?: boolean;
    metadata?: Record<string, any>;
  }): void {
    this.log({
      eventType: params.eventType,
      severity: params.result.success ? AuditSeverity.INFO : AuditSeverity.ERROR,
      role: params.role,
      tool: params.tool,
      operation: params.tool,
      resource: params.resource,
      args: params.args,
      result: params.result,
      duration: params.duration,
      policyEvaluated: params.policyEvaluated,
      policyAllowed: params.policyAllowed,
      metadata: params.metadata,
    });
  }

  /**
   * Log an access denial
   */
  static logAccessDenial(params: {
    role: Role;
    tool: string;
    resource: string;
    reason: string;
    policyRules?: string[];
    metadata?: Record<string, any>;
  }): void {
    this.log({
      eventType: AuditEventType.ACCESS_DENIED,
      severity: AuditSeverity.WARNING,
      role: params.role,
      tool: params.tool,
      operation: 'access_denied',
      resource: params.resource,
      args: {},
      result: {
        success: false,
        error: params.reason,
      },
      duration: 0,
      policyEvaluated: true,
      policyAllowed: false,
      policyRules: params.policyRules,
      metadata: params.metadata,
    });
  }

  /**
   * Log an error
   */
  static logError(params: {
    role: Role;
    tool: string;
    resource: string;
    error: string;
    severity?: AuditSeverity;
    metadata?: Record<string, any>;
  }): void {
    this.log({
      eventType: AuditEventType.ERROR,
      severity: params.severity || AuditSeverity.ERROR,
      role: params.role,
      tool: params.tool,
      operation: 'error',
      resource: params.resource,
      args: {},
      result: {
        success: false,
        error: params.error,
      },
      duration: 0,
      metadata: params.metadata,
    });
  }

  /**
   * Query audit logs
   */
  static query(query: AuditQuery): AuditEntry[] {
    let results = [...this.entries];

    // Time range filter
    if (query.startTime) {
      results = results.filter(e => e.timestamp >= query.startTime!);
    }
    if (query.endTime) {
      results = results.filter(e => e.timestamp <= query.endTime!);
    }

    // Event type filter
    if (query.eventTypes && query.eventTypes.length > 0) {
      results = results.filter(e => query.eventTypes!.includes(e.eventType));
    }

    // Severity filter
    if (query.severities && query.severities.length > 0) {
      results = results.filter(e => query.severities!.includes(e.severity));
    }

    // Role filter
    if (query.roles && query.roles.length > 0) {
      results = results.filter(e => query.roles!.includes(e.role));
    }

    // Tool filter
    if (query.tools && query.tools.length > 0) {
      results = results.filter(e => query.tools!.includes(e.tool));
    }

    // Resource filter
    if (query.resources && query.resources.length > 0) {
      results = results.filter(e =>
        query.resources!.some(r => e.resource.includes(r))
      );
    }

    // Search term
    if (query.searchTerm) {
      const term = query.searchTerm.toLowerCase();
      results = results.filter(e =>
        e.resource.toLowerCase().includes(term) ||
        e.tool.toLowerCase().includes(term) ||
        e.operation.toLowerCase().includes(term) ||
        (e.result.error && e.result.error.toLowerCase().includes(term))
      );
    }

    // Sort
    const sortBy = query.sortBy || 'timestamp';
    const sortOrder = query.sortOrder || 'desc';
    results.sort((a, b) => {
      const aVal = a[sortBy];
      const bVal = b[sortBy];
      return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
    });

    // Pagination
    const offset = query.offset || 0;
    const limit = query.limit || 100;
    return results.slice(offset, offset + limit);
  }

  /**
   * Generate audit report
   */
  static generateReport(query: AuditQuery): AuditReport {
    const entries = this.query(query);
    
    const byEventType: Record<AuditEventType, number> = {} as any;
    const bySeverity: Record<AuditSeverity, number> = {} as any;
    const byRole: Record<Role, number> = {} as any;
    let totalDuration = 0;
    let successCount = 0;

    for (const entry of entries) {
      byEventType[entry.eventType] = (byEventType[entry.eventType] || 0) + 1;
      bySeverity[entry.severity] = (bySeverity[entry.severity] || 0) + 1;
      byRole[entry.role] = (byRole[entry.role] || 0) + 1;
      totalDuration += entry.duration;
      if (entry.result.success) successCount++;
    }

    return {
      summary: {
        totalEvents: entries.length,
        byEventType,
        bySeverity,
        byRole,
        successRate: entries.length > 0 ? successCount / entries.length : 0,
        averageDuration: entries.length > 0 ? totalDuration / entries.length : 0,
      },
      entries,
      timeRange: {
        start: query.startTime || (entries[0]?.timestamp || Date.now()),
        end: query.endTime || Date.now(),
      },
      generatedAt: Date.now(),
    };
  }

  /**
   * Generate compliance report
   */
  static generateComplianceReport(startTime: number, endTime: number): ComplianceReport {
    const entries = this.query({ startTime, endTime });
    
    const byRole: Record<Role, { operations: number; denials: number; violations: number }> = {
      [Role.ADMIN]: { operations: 0, denials: 0, violations: 0 },
      [Role.DEVELOPER]: { operations: 0, denials: 0, violations: 0 },
      [Role.REVIEWER]: { operations: 0, denials: 0, violations: 0 },
      [Role.GUEST]: { operations: 0, denials: 0, violations: 0 },
    };

    const resourceAccess: Map<string, { count: number; lastAccessed: number }> = new Map();
    const securityEvents: AuditEntry[] = [];
    
    let successfulOps = 0;
    let failedOps = 0;
    let accessDenials = 0;
    let policyViolations = 0;
    let criticalEvents = 0;

    for (const entry of entries) {
      // Count by role
      byRole[entry.role].operations++;
      
      if (entry.result.success) {
        successfulOps++;
      } else {
        failedOps++;
      }

      if (entry.eventType === AuditEventType.ACCESS_DENIED) {
        accessDenials++;
        byRole[entry.role].denials++;
        securityEvents.push(entry);
      }

      if (entry.policyEvaluated && !entry.policyAllowed) {
        policyViolations++;
        byRole[entry.role].violations++;
      }

      if (entry.severity === AuditSeverity.CRITICAL) {
        criticalEvents++;
        securityEvents.push(entry);
      }

      // Track resource access
      const existing = resourceAccess.get(entry.resource);
      if (existing) {
        existing.count++;
        existing.lastAccessed = Math.max(existing.lastAccessed, entry.timestamp);
      } else {
        resourceAccess.set(entry.resource, {
          count: 1,
          lastAccessed: entry.timestamp,
        });
      }
    }

    // Top resources
    const topResources = Array.from(resourceAccess.entries())
      .map(([resource, data]) => ({
        resource,
        accessCount: data.count,
        lastAccessed: data.lastAccessed,
      }))
      .sort((a, b) => b.accessCount - a.accessCount)
      .slice(0, 10);

    return {
      period: { start: startTime, end: endTime },
      metrics: {
        totalOperations: entries.length,
        successfulOperations: successfulOps,
        failedOperations: failedOps,
        accessDenials,
        policyViolations,
        criticalEvents,
      },
      byRole,
      topResources,
      securityEvents: securityEvents.slice(0, 50), // Top 50 security events
      generatedAt: Date.now(),
    };
  }

  /**
   * Get recent entries
   */
  static getRecentEntries(limit: number = 100): AuditEntry[] {
    return this.entries.slice(-limit);
  }

  /**
   * Get entry by ID
   */
  static getEntry(id: string): AuditEntry | undefined {
    return this.entries.find(e => e.id === id);
  }

  /**
   * Clear audit log
   */
  static clear(): void {
    this.entries = [];
  }

  /**
   * Get total entry count
   */
  static getCount(): number {
    return this.entries.length;
  }

  /**
   * Enable persistence
   */
  static enablePersistence(path: string): void {
    this.persistenceEnabled = true;
    this.persistencePath = path;
  }

  /**
   * Disable persistence
   */
  static disablePersistence(): void {
    this.persistenceEnabled = false;
  }

  /**
   * Persist entry (placeholder for actual implementation)
   */
  private static persist(entry: AuditEntry): void {
    // In a real implementation, this would write to a file or database
    // For now, just log to telemetry
    TelemetryService.recordEvent('audit_persisted', {
      entryId: entry.id,
      eventType: entry.eventType,
    });
  }

  /**
   * Generate unique ID
   */
  private static generateId(): string {
    return `audit_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }
}

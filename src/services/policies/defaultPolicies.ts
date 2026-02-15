/**
 * Default Policies - Pre-configured policy templates
 * 
 * Purpose: Provide ready-to-use policies for common scenarios
 * - Development policy (permissive)
 * - Production policy (restrictive)
 * - Review policy (read-only)
 * - Custom policies
 * 
 * Phase 3: Advanced Safety & Policy Framework
 */

import { Policy, PolicyEffect, PolicyRule, Role } from '../policyEngine';

// ==================== DEVELOPMENT POLICY ====================

export const DEVELOPMENT_POLICY: Policy = {
  id: 'dev-policy-v1',
  name: 'Development Policy',
  description: 'Permissive policy for development environment',
  version: '1.0.0',
  defaultEffect: PolicyEffect.DENY,
  rules: [
    // Admin - full access
    {
      id: 'dev-admin-full-access',
      name: 'Admin Full Access',
      description: 'Admins have full access to all operations',
      effect: PolicyEffect.ALLOW,
      roles: [Role.ADMIN],
      priority: 100,
      enabled: true,
    },
    
    // Developer - read/write access
    {
      id: 'dev-developer-read-write',
      name: 'Developer Read/Write Access',
      description: 'Developers can read and write files',
      effect: PolicyEffect.ALLOW,
      roles: [Role.DEVELOPER],
      tools: ['read_file', 'write_file', 'create_directory'],
      priority: 90,
      enabled: true,
    },
    
    // Developer - delete with restrictions
    {
      id: 'dev-developer-delete-src',
      name: 'Developer Delete in src/',
      description: 'Developers can delete files in src/ directory',
      effect: PolicyEffect.ALLOW,
      roles: [Role.DEVELOPER],
      tools: ['delete_file'],
      paths: ['src/', 'test/', 'tests/'],
      priority: 85,
      enabled: true,
    },
    
    // Developer - move files
    {
      id: 'dev-developer-move',
      name: 'Developer Move Files',
      description: 'Developers can move files within project',
      effect: PolicyEffect.ALLOW,
      roles: [Role.DEVELOPER],
      tools: ['move_file'],
      priority: 85,
      enabled: true,
    },
    
    // Reviewer - read-only access
    {
      id: 'dev-reviewer-read-only',
      name: 'Reviewer Read-Only Access',
      description: 'Reviewers can only read files',
      effect: PolicyEffect.ALLOW,
      roles: [Role.REVIEWER],
      tools: ['read_file'],
      priority: 80,
      enabled: true,
    },
    
    // Guest - minimal access
    {
      id: 'dev-guest-public-read',
      name: 'Guest Public Read',
      description: 'Guests can read public files only',
      effect: PolicyEffect.ALLOW,
      roles: [Role.GUEST],
      tools: ['read_file'],
      paths: ['public/', 'docs/'],
      priority: 70,
      enabled: true,
    },
    
    // Block sensitive files for non-admins
    {
      id: 'dev-block-sensitive',
      name: 'Block Sensitive Files',
      description: 'Block access to sensitive files for non-admins',
      effect: PolicyEffect.DENY,
      roles: [Role.DEVELOPER, Role.REVIEWER, Role.GUEST],
      pathPatterns: [/\.env/, /\.secret/, /\.key/, /password/, /credentials/],
      priority: 95,
      enabled: true,
    },
  ],
};

// ==================== PRODUCTION POLICY ====================

export const PRODUCTION_POLICY: Policy = {
  id: 'prod-policy-v1',
  name: 'Production Policy',
  description: 'Restrictive policy for production environment',
  version: '1.0.0',
  defaultEffect: PolicyEffect.DENY,
  rules: [
    // Admin - full access with time restrictions
    {
      id: 'prod-admin-business-hours',
      name: 'Admin Access (Business Hours)',
      description: 'Admins have full access during business hours',
      effect: PolicyEffect.ALLOW,
      roles: [Role.ADMIN],
      timeRestrictions: {
        allowedHours: { start: 9, end: 17 }, // 9 AM - 5 PM
        allowedDays: [1, 2, 3, 4, 5], // Monday-Friday
      },
      priority: 100,
      enabled: true,
    },
    
    // Admin - emergency access (24/7 read-only)
    {
      id: 'prod-admin-emergency-read',
      name: 'Admin Emergency Read Access',
      description: 'Admins can read files 24/7 for emergencies',
      effect: PolicyEffect.ALLOW,
      roles: [Role.ADMIN],
      tools: ['read_file'],
      priority: 95,
      enabled: true,
    },
    
    // Developer - read-only in production
    {
      id: 'prod-developer-read-only',
      name: 'Developer Read-Only',
      description: 'Developers have read-only access in production',
      effect: PolicyEffect.ALLOW,
      roles: [Role.DEVELOPER],
      tools: ['read_file'],
      priority: 80,
      enabled: true,
    },
    
    // Reviewer - read-only access
    {
      id: 'prod-reviewer-read-only',
      name: 'Reviewer Read-Only',
      description: 'Reviewers can read files',
      effect: PolicyEffect.ALLOW,
      roles: [Role.REVIEWER],
      tools: ['read_file'],
      priority: 70,
      enabled: true,
    },
    
    // Block all write operations for non-admins
    {
      id: 'prod-block-writes',
      name: 'Block Write Operations',
      description: 'Block all write operations for non-admins',
      effect: PolicyEffect.DENY,
      roles: [Role.DEVELOPER, Role.REVIEWER, Role.GUEST],
      tools: ['write_file', 'delete_file', 'move_file', 'create_directory'],
      priority: 90,
      enabled: true,
    },
    
    // Block sensitive files for all
    {
      id: 'prod-block-sensitive',
      name: 'Block Sensitive Files',
      description: 'Block access to sensitive files',
      effect: PolicyEffect.DENY,
      pathPatterns: [/\.env/, /\.secret/, /\.key/, /password/, /credentials/, /config\/prod/],
      priority: 100,
      enabled: true,
    },
    
    // Resource limits
    {
      id: 'prod-rate-limit',
      name: 'Rate Limiting',
      description: 'Limit operations per hour',
      effect: PolicyEffect.DENY,
      resourceLimits: {
        maxOperationsPerHour: 100,
      },
      priority: 85,
      enabled: true,
    },
  ],
};

// ==================== REVIEW POLICY ====================

export const REVIEW_POLICY: Policy = {
  id: 'review-policy-v1',
  name: 'Review Policy',
  description: 'Read-only policy for code review',
  version: '1.0.0',
  defaultEffect: PolicyEffect.DENY,
  rules: [
    // All roles - read-only access
    {
      id: 'review-read-only',
      name: 'Read-Only Access',
      description: 'All users have read-only access',
      effect: PolicyEffect.ALLOW,
      roles: [Role.ADMIN, Role.DEVELOPER, Role.REVIEWER, Role.GUEST],
      tools: ['read_file'],
      priority: 100,
      enabled: true,
    },
    
    // Block all write operations
    {
      id: 'review-block-writes',
      name: 'Block Write Operations',
      description: 'Block all write operations',
      effect: PolicyEffect.DENY,
      tools: ['write_file', 'delete_file', 'move_file', 'create_directory'],
      priority: 90,
      enabled: true,
    },
  ],
};

// ==================== TESTING POLICY ====================

export const TESTING_POLICY: Policy = {
  id: 'test-policy-v1',
  name: 'Testing Policy',
  description: 'Policy for testing environment',
  version: '1.0.0',
  defaultEffect: PolicyEffect.DENY,
  rules: [
    // All roles - full access to test directories
    {
      id: 'test-full-access',
      name: 'Full Access to Test Directories',
      description: 'All users have full access to test directories',
      effect: PolicyEffect.ALLOW,
      roles: [Role.ADMIN, Role.DEVELOPER, Role.REVIEWER],
      paths: ['test/', 'tests/', '__tests__/', 'spec/'],
      priority: 100,
      enabled: true,
    },
    
    // Block production directories
    {
      id: 'test-block-prod',
      name: 'Block Production Directories',
      description: 'Block access to production directories',
      effect: PolicyEffect.DENY,
      paths: ['dist/', 'build/', 'production/'],
      priority: 95,
      enabled: true,
    },
    
    // File size limits
    {
      id: 'test-file-size-limit',
      name: 'File Size Limit',
      description: 'Limit file size to 10MB',
      effect: PolicyEffect.DENY,
      resourceLimits: {
        maxFileSize: 10 * 1024 * 1024, // 10MB
      },
      priority: 90,
      enabled: true,
    },
  ],
};

// ==================== POLICY REGISTRY ====================

export const DEFAULT_POLICIES = {
  DEVELOPMENT: DEVELOPMENT_POLICY,
  PRODUCTION: PRODUCTION_POLICY,
  REVIEW: REVIEW_POLICY,
  TESTING: TESTING_POLICY,
};

/**
 * Get policy by environment
 */
export function getPolicyByEnvironment(env: 'development' | 'production' | 'review' | 'testing'): Policy {
  switch (env) {
    case 'development':
      return DEVELOPMENT_POLICY;
    case 'production':
      return PRODUCTION_POLICY;
    case 'review':
      return REVIEW_POLICY;
    case 'testing':
      return TESTING_POLICY;
    default:
      return DEVELOPMENT_POLICY;
  }
}

/**
 * Create custom policy from template
 */
export function createCustomPolicy(
  id: string,
  name: string,
  description: string,
  basePolicy: Policy,
  customRules: PolicyRule[]
): Policy {
  return {
    ...basePolicy,
    id,
    name,
    description,
    rules: [...basePolicy.rules, ...customRules],
  };
}

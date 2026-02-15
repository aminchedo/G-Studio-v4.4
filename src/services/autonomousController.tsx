/**
 * Autonomous Mode Enforcement
 * 
 * Controls autonomous execution with safety limits and permission gates.
 */

import { AdversarialDetector } from './security/adversarialDetector';
import { GoalIntegrityGuard } from './security/goalIntegrityGuard';
import { KillSwitch } from './security/killSwitch';
import { ProductivityMetrics } from './monitoring/productivityMetrics';

export type AutonomousMode = 'MANUAL' | 'AUTONOMOUS' | 'DRY_RUN';

interface AutonomousConfig {
  maxSteps: number;
  maxRetries: number;
  requirePermission: boolean;
  timeout: number; // milliseconds
}

interface AutonomousStep {
  step: number;
  action: string;
  result: 'success' | 'failure' | 'skipped';
  timestamp: number;
  duration: number;
}

export type TaskPermissionLevel = 'safe' | 'moderate' | 'risky' | 'forbidden';

interface PermissionMatrix {
  taskType: string;
  permissionLevel: TaskPermissionLevel;
  requiresExplicitConsent: boolean;
}

export class AutonomousController {
  private static mode: AutonomousMode = 'MANUAL';
  private static config: AutonomousConfig = {
    maxSteps: 10,
    maxRetries: 3,
    requirePermission: true,
    timeout: 300000, // 5 minutes
  };
  private static currentExecution: {
    id: string;
    steps: AutonomousStep[];
    startTime: number;
    task: string;
  } | null = null;
  private static emergencyStop: boolean = false;

  // Permission matrix: task type → permission level
  private static permissionMatrix: Map<string, TaskPermissionLevel> = new Map([
    ['general', 'safe'],
    ['documentation', 'safe'],
    ['analysis', 'moderate'],
    ['coding', 'moderate'],
    ['debugging', 'risky'],
    ['refactoring', 'risky'],
    ['create_project', 'forbidden'], // Too risky for autonomous
    ['delete_file', 'forbidden'], // Too risky for autonomous
  ]);

  /**
   * Check if autonomous mode is enabled
   */
  static isAutonomous(): boolean {
    return this.mode === 'AUTONOMOUS' || this.mode === 'DRY_RUN';
  }

  /**
   * Set autonomous mode
   */
  static setMode(mode: AutonomousMode, requirePermission: boolean = true): void {
    if (mode === 'AUTONOMOUS' && requirePermission && !this.hasPermission()) {
      console.error('[AutonomousController] Autonomous mode requires explicit user permission');
      return; // Don't throw, just return
    }

    this.mode = mode;
    this.config.requirePermission = requirePermission;
    console.log(`[AUTONOMOUS]: MODE_SET (${mode})`);
  }

  /**
   * Check if user has granted permission
   */
  private static hasPermission(): boolean {
    // Check localStorage for permission
    if (typeof window !== 'undefined') {
      return localStorage.getItem('gstudio_autonomous_permission') === 'true';
    }
    return false;
  }

  /**
   * Check if task is decomposable and bounded
   */
  static isTaskDecomposable(taskType: string): boolean {
    const permission = this.permissionMatrix.get(taskType) || 'forbidden';
    return permission !== 'forbidden';
  }

  /**
   * Get permission level for task
   */
  static getPermissionLevel(taskType: string): TaskPermissionLevel {
    return this.permissionMatrix.get(taskType) || 'forbidden';
  }

  /**
   * Validate permission before autonomous execution
   */
  static validatePermission(taskType: string): { allowed: boolean; reason?: string } {
    if (!this.isAutonomous()) {
      return { allowed: false, reason: 'Autonomous mode not enabled' };
    }

    if (this.emergencyStop) {
      return { allowed: false, reason: 'Emergency stop active' };
    }

    const permission = this.getPermissionLevel(taskType);
    
    if (permission === 'forbidden') {
      return { allowed: false, reason: `Task type '${taskType}' is forbidden in autonomous mode` };
    }

    if (permission === 'risky' && this.config.requirePermission) {
      if (!this.hasPermission()) {
        return { allowed: false, reason: 'Risky task requires explicit user permission' };
      }
    }

    return { allowed: true };
  }

  /**
   * Start autonomous execution
   */
  static startExecution(task: string, taskType: string): string {
    if (!this.isAutonomous()) {
      throw new Error('Autonomous mode not enabled');
    }

    // Check global kill-switch
    if (KillSwitch.isActive()) {
      throw new Error('Global kill-switch is active');
    }

    // Detect adversarial prompts
    const adversarialCheck = AdversarialDetector.detect(task);
    if (adversarialCheck.isAdversarial) {
      console.warn(`[AUTONOMOUS]: ADVERSARIAL_DETECTED (${adversarialCheck.type}, confidence: ${adversarialCheck.confidence.toFixed(2)})`);
      throw new Error(`Adversarial prompt detected: ${adversarialCheck.reason}`);
    }

    // Validate permission
    const validation = this.validatePermission(taskType);
    if (!validation.allowed) {
      throw new Error(`Permission denied: ${validation.reason}`);
    }

    // Reset emergency stop if starting new execution
    this.emergencyStop = false;

    const executionId = `autonomous_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    this.currentExecution = {
      id: executionId,
      steps: [],
      startTime: Date.now(),
      task,
    };

    // Lock goal for integrity checking
    GoalIntegrityGuard.lockGoal(executionId, task, taskType);

    console.log(`[AUTONOMOUS]: STARTED (${executionId}) - Task: ${taskType}`);
    return executionId;
  }

  /**
   * Record autonomous step
   */
  static recordStep(
    executionId: string,
    step: number,
    action: string,
    result: 'success' | 'failure' | 'skipped',
    duration: number
  ): void {
    if (!this.currentExecution || this.currentExecution.id !== executionId) {
      console.error('[AutonomousController] Invalid execution ID');
      return; // Don't throw, just return
    }

    // Check step limit
    if (step > this.config.maxSteps) {
      console.warn(`[AUTONOMOUS]: ABORTED (max steps exceeded: ${step}/${this.config.maxSteps})`);
      this.abortExecution(executionId);
      return;
    }

    // Check timeout
    const elapsed = Date.now() - this.currentExecution.startTime;
    if (elapsed > this.config.timeout) {
      console.warn(`[AUTONOMOUS]: ABORTED (timeout: ${elapsed}ms > ${this.config.timeout}ms)`);
      this.abortExecution(executionId);
      return;
    }

    this.currentExecution.steps.push({
      step,
      action,
      result,
      timestamp: Date.now(),
      duration,
    });

    console.log(`[AUTONOMOUS]: STEP (${step}/${this.config.maxSteps}) - ${action} - ${result}`);
  }

  /**
   * Complete autonomous execution
   */
  static completeExecution(executionId: string): void {
    if (!this.currentExecution || this.currentExecution.id !== executionId) {
      console.error('[AutonomousController] Invalid execution ID');
      return; // Don't throw, just return
    }

    const duration = Date.now() - this.currentExecution.startTime;
    const successCount = this.currentExecution.steps.filter(s => s.result === 'success').length;
    const failureCount = this.currentExecution.steps.filter(s => s.result === 'failure').length;

    console.log(`[AUTONOMOUS]: COMPLETED (${executionId}) - ${successCount} success, ${failureCount} failures, ${duration}ms`);
    
    // Release goal snapshot
    GoalIntegrityGuard.releaseGoal(executionId);
    
    this.currentExecution = null;
  }

  /**
   * Abort autonomous execution
   */
  static abortExecution(executionId: string): void {
    if (!this.currentExecution || this.currentExecution.id !== executionId) {
      return;
    }

    console.log(`[AUTONOMOUS]: ABORTED (${executionId})`);
    
    // Release goal snapshot
    GoalIntegrityGuard.releaseGoal(executionId);
    
    this.currentExecution = null;
  }

  /**
   * Check if step is allowed (with permission matrix enforcement)
   */
  static canProceed(executionId: string, step: number, action?: string): { allowed: boolean; reason?: string } {
    if (!this.currentExecution || this.currentExecution.id !== executionId) {
      return { allowed: false, reason: 'Invalid execution ID' };
    }

    // Check global kill-switch
    if (KillSwitch.isActive()) {
      return { allowed: false, reason: 'Global kill-switch active' };
    }

    if (this.emergencyStop) {
      return { allowed: false, reason: 'Emergency stop active' };
    }

    // Check step limit
    if (step > this.config.maxSteps) {
      return { allowed: false, reason: `Max steps exceeded: ${step}/${this.config.maxSteps}` };
    }

    // Check timeout
    const elapsed = Date.now() - this.currentExecution.startTime;
    if (elapsed > this.config.timeout) {
      return { allowed: false, reason: `Timeout exceeded: ${elapsed}ms > ${this.config.timeout}ms` };
    }

    // Check retry limit
    const recentFailures = this.currentExecution.steps
      .filter(s => s.result === 'failure')
      .slice(-this.config.maxRetries);
    if (recentFailures.length >= this.config.maxRetries) {
      return { allowed: false, reason: `Max retries exceeded: ${recentFailures.length}/${this.config.maxRetries}` };
    }

    return { allowed: true };
  }

  /**
   * Emergency stop (hard abort)
   */
  static emergencyStopExecution(executionId: string): void {
    if (this.currentExecution && this.currentExecution.id === executionId) {
      this.emergencyStop = true;
      this.abortExecution(executionId);
      console.log(`[AUTONOMOUS]: EMERGENCY_STOP (${executionId})`);
    }
  }

  /**
   * Check if emergency stop is active
   */
  static isEmergencyStopActive(): boolean {
    return this.emergencyStop;
  }

  /**
   * Get current execution status
   */
  static getExecutionStatus(): {
    active: boolean;
    executionId?: string;
    steps: number;
    elapsed: number;
  } | null {
    if (!this.currentExecution) {
      return null;
    }

    return {
      active: true,
      executionId: this.currentExecution.id,
      steps: this.currentExecution.steps.length,
      elapsed: Date.now() - this.currentExecution.startTime,
    };
  }

  /**
   * Get configuration
   */
  static getConfig(): AutonomousConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  static updateConfig(config: Partial<AutonomousConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Check if should suggest upgrading to autonomous mode
   * Based on productivity metrics and user patterns
   */
  static async shouldUpgradeToAutonomous(): Promise<boolean> {
    // Check productivity metrics
    const metrics = ProductivityMetrics.getMetrics();
    
    // Suggest autonomous if:
    // 1. High success rate (>80%)
    // 2. Low error rate (<10%)
    // 3. User has been using assisted mode effectively
    const successRate = metrics.totalTasks > 0 
      ? metrics.successfulTasks / metrics.totalTasks 
      : 0;
    const errorRate = metrics.totalTasks > 0 
      ? metrics.failedTasks / metrics.totalTasks 
      : 0;
    
    // Only suggest if metrics are good and user has experience
    if (metrics.totalTasks >= 5 && successRate > 0.8 && errorRate < 0.1) {
      return true;
    }
    
    return false;
  }

  /**
   * Check if should suggest downgrading to assisted mode
   * Based on error rates and safety concerns
   */
  static async shouldDowngradeToAssisted(): Promise<boolean> {
    // Check productivity metrics
    const metrics = ProductivityMetrics.getMetrics();
    
    // Suggest downgrade if:
    // 1. High error rate (>30%)
    // 2. Multiple failures in a row
    // 3. Safety concerns detected
    const errorRate = metrics.totalTasks > 0 
      ? metrics.failedTasks / metrics.totalTasks 
      : 0;
    
    // Check for emergency stop or kill switch
    if (this.emergencyStop || KillSwitch.isActive()) {
      return true;
    }
    
    // Suggest downgrade if error rate is too high
    if (metrics.totalTasks >= 3 && errorRate > 0.3) {
      return true;
    }
    
    return false;
  }
}

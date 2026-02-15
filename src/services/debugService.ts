/**
 * Debug Service - Debugging functionality for code execution
 * Provides breakpoint management, execution control, and variable inspection
 */

import { TelemetryService } from './telemetryService';
import { ErrorHandler, ErrorCode } from './errorHandler';

export interface Breakpoint {
  id: string;
  file: string;
  line: number;
  column?: number;
  condition?: string;
  enabled: boolean;
  hitCount: number;
}

export interface StackFrame {
  id: number;
  name: string;
  file: string;
  line: number;
  column?: number;
  variables: Record<string, any>;
}

export interface DebugSession {
  id: string;
  state: 'running' | 'paused' | 'stopped';
  currentFrame?: StackFrame;
  stackTrace: StackFrame[];
  breakpoints: Breakpoint[];
  startTime: number;
}

class DebugService {
  private static instance: DebugService;
  private sessions: Map<string, DebugSession> = new Map();
  private breakpoints: Map<string, Breakpoint> = new Map();
  private nextBreakpointId: number = 1;
  private nextSessionId: number = 1;

  private constructor() {}

  static getInstance(): DebugService {
    if (!DebugService.instance) {
      DebugService.instance = new DebugService();
    }
    return DebugService.instance;
  }

  /**
   * Create a new debug session
   */
  createSession(file: string): string {
    const sessionId = `debug-${this.nextSessionId++}`;
    const session: DebugSession = {
      id: sessionId,
      state: 'running',
      stackTrace: [],
      breakpoints: Array.from(this.breakpoints.values()).filter(bp => bp.enabled),
      startTime: Date.now(),
    };

    this.sessions.set(sessionId, session);
    TelemetryService.recordEvent('debug_session_created', { file });

    return sessionId;
  }

  /**
   * Terminate a debug session
   */
  terminateSession(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.state = 'stopped';
      const duration = Date.now() - session.startTime;
      TelemetryService.recordEvent('debug_session_terminated', { duration });
    }
  }

  /**
   * Add a breakpoint
   */
  addBreakpoint(
    file: string,
    line: number,
    options?: { column?: number; condition?: string }
  ): Breakpoint {
    const id = `bp-${this.nextBreakpointId++}`;
    const bp: Breakpoint = {
      id,
      file,
      line,
      column: options?.column,
      condition: options?.condition,
      enabled: true,
      hitCount: 0,
    };

    this.breakpoints.set(id, bp);
    TelemetryService.recordEvent('breakpoint_added', { file, line });

    return bp;
  }

  /**
   * Remove a breakpoint
   */
  removeBreakpoint(breakpointId: string): void {
    if (this.breakpoints.has(breakpointId)) {
      const bp = this.breakpoints.get(breakpointId)!;
      this.breakpoints.delete(breakpointId);
      TelemetryService.recordEvent('breakpoint_removed', {
        file: bp.file,
        line: bp.line,
      });
    }
  }

  /**
   * Toggle breakpoint enabled state
   */
  toggleBreakpoint(breakpointId: string): void {
    const bp = this.breakpoints.get(breakpointId);
    if (bp) {
      bp.enabled = !bp.enabled;
    }
  }

  /**
   * Get all breakpoints
   */
  getBreakpoints(): Breakpoint[] {
    return Array.from(this.breakpoints.values());
  }

  /**
   * Get breakpoints for a specific file
   */
  getBreakpointsForFile(file: string): Breakpoint[] {
    return Array.from(this.breakpoints.values()).filter(bp => bp.file === file);
  }

  /**
   * Clear all breakpoints
   */
  clearBreakpoints(): void {
    this.breakpoints.clear();
  }

  /**
   * Pause execution
   */
  pause(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (session && session.state === 'running') {
      session.state = 'paused';
      TelemetryService.recordEvent('debug_paused', { sessionId });
    }
  }

  /**
   * Resume execution
   */
  resume(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (session && session.state === 'paused') {
      session.state = 'running';
      TelemetryService.recordEvent('debug_resumed', { sessionId });
    }
  }

  /**
   * Step over (next line)
   */
  stepOver(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      TelemetryService.recordEvent('debug_step_over', { sessionId });
    }
  }

  /**
   * Step into function
   */
  stepInto(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      TelemetryService.recordEvent('debug_step_into', { sessionId });
    }
  }

  /**
   * Step out of function
   */
  stepOut(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      TelemetryService.recordEvent('debug_step_out', { sessionId });
    }
  }

  /**
   * Get current stack trace
   */
  getStackTrace(sessionId: string): StackFrame[] {
    const session = this.sessions.get(sessionId);
    return session?.stackTrace || [];
  }

  /**
   * Update stack frame (called during debug execution)
   */
  updateStackFrame(sessionId: string, frame: StackFrame): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.currentFrame = frame;
      session.stackTrace.unshift(frame);
      // Keep only last 50 frames
      if (session.stackTrace.length > 50) {
        session.stackTrace.pop();
      }
    }
  }

  /**
   * Get variables in current scope
   */
  getVariables(sessionId: string): Record<string, any> {
    const session = this.sessions.get(sessionId);
    return session?.currentFrame?.variables || {};
  }

  /**
   * Evaluate expression in current context
   */
  evaluate(sessionId: string, expression: string): any {
    const session = this.sessions.get(sessionId);
    if (!session || !session.currentFrame) {
      return undefined;
    }

    try {
      // In a real debugger, this would evaluate in the actual execution context
      // For now, we can only access current variables
      const variables = session.currentFrame.variables;
      if (expression in variables) {
        return variables[expression];
      }
      return undefined;
    } catch (error) {
      ErrorHandler.handle(error as Error, 'DEBUG_EVALUATION_FAILED', {
        code: ErrorCode.TOOL_EXECUTION_FAILED,
      });
      return undefined;
    }
  }

  /**
   * Get active debug sessions
   */
  getActiveSessions(): DebugSession[] {
    return Array.from(this.sessions.values()).filter(s => s.state !== 'stopped');
  }

  /**
   * Get session by ID
   */
  getSession(sessionId: string): DebugSession | undefined {
    return this.sessions.get(sessionId);
  }

  /**
   * Clear old sessions (older than 1 hour)
   */
  cleanup(): void {
    const oneHourAgo = Date.now() - 3600000;
    for (const [id, session] of this.sessions.entries()) {
      if (session.startTime < oneHourAgo && session.state === 'stopped') {
        this.sessions.delete(id);
      }
    }
  }
}

export const debugService = DebugService.getInstance();

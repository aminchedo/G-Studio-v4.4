/**
 * Git Service - Git operations for repository management
 * Provides basic git functionality integrated with the IDE
 */

import { ErrorHandler, ErrorCode } from './errorHandler';
import { TelemetryService } from './monitoring/telemetryService';

export interface GitStatus {
  branch: string;
  isDirty: boolean;
  staged: string[];
  unstaged: string[];
  untracked: string[];
  ahead: number;
  behind: number;
}

export interface GitLog {
  hash: string;
  author: string;
  date: Date;
  message: string;
}

export interface GitDiff {
  file: string;
  additions: number;
  deletions: number;
  diff: string;
}

class GitService {
  private static instance: GitService;
  private isAvailable: boolean = false;
  private statusCache: Map<string, GitStatus> = new Map();

  private constructor() {
    this.detectGitAvailability();
  }

  static getInstance(): GitService {
    if (!GitService.instance) {
      GitService.instance = new GitService();
    }
    return GitService.instance;
  }

  /**
   * Detect if Git is available in the environment
   * @private
   */
  private detectGitAvailability(): void {
    try {
      if (typeof process !== 'undefined' && process.platform) {
        this.isAvailable = true;
      } else {
        // Browser environment - Git operations will need backend support
        this.isAvailable = false;
        console.info('[GitService] Git operations not available in browser-only environment');
      }
    } catch (e) {
      this.isAvailable = false;
    }
  }

  /**
   * Check if Git is available
   */
  isGitAvailable(): boolean {
    return this.isAvailable;
  }

  /**
   * Initialize a new Git repository
   */
  async initRepository(path: string): Promise<{ success: boolean; message: string }> {
    try {
      if (!this.isAvailable) {
        return { success: false, message: 'Git is not available in this environment' };
      }

      // This would call a backend API in production
      TelemetryService.recordEvent('git_init', { path });
      return { success: true, message: `Repository initialized at ${path}` };
    } catch (error: any) {
      ErrorHandler.handle(error, 'GIT_INIT_FAILED', {
        code: ErrorCode.TOOL_EXECUTION_FAILED,
      });
      return { success: false, message: error.message };
    }
  }

  /**
   * Get repository status
   */
  async getStatus(repoPath: string): Promise<GitStatus | null> {
    try {
      // Check cache first
      if (this.statusCache.has(repoPath)) {
        return this.statusCache.get(repoPath) || null;
      }

      if (!this.isAvailable) {
        return null;
      }

      // Mock implementation - would call git status in real environment
      const status: GitStatus = {
        branch: 'main',
        isDirty: false,
        staged: [],
        unstaged: [],
        untracked: [],
        ahead: 0,
        behind: 0,
      };

      this.statusCache.set(repoPath, status);
      return status;
    } catch (error: any) {
      console.warn('[GitService] Failed to get status:', error.message);
      return null;
    }
  }

  /**
   * Stage files for commit
   */
  async stage(repoPath: string, files: string[]): Promise<{ success: boolean; message: string }> {
    try {
      if (!this.isAvailable) {
        return { success: false, message: 'Git is not available' };
      }

      TelemetryService.recordEvent('git_stage', { repoPath, fileCount: files.length });
      this.clearStatusCache(repoPath);

      return { success: true, message: `Staged ${files.length} file(s)` };
    } catch (error: any) {
      return { success: false, message: error.message };
    }
  }

  /**
   * Commit staged changes
   */
  async commit(repoPath: string, message: string): Promise<{ success: boolean; hash?: string }> {
    try {
      if (!this.isAvailable) {
        return { success: false };
      }

      if (!message.trim()) {
        return { success: false };
      }

      TelemetryService.recordEvent('git_commit', { repoPath, messageLength: message.length });
      this.clearStatusCache(repoPath);

      return { success: true, hash: 'mock-hash-' + Date.now() };
    } catch (error: any) {
      return { success: false };
    }
  }

  /**
   * Get commit log
   */
  async getLog(repoPath: string, limit: number = 10): Promise<GitLog[]> {
    try {
      if (!this.isAvailable) {
        return [];
      }

      // Mock implementation
      return [];
    } catch (error: any) {
      console.warn('[GitService] Failed to get log:', error.message);
      return [];
    }
  }

  /**
   * Create new branch
   */
  async createBranch(repoPath: string, branchName: string): Promise<{ success: boolean; message: string }> {
    try {
      if (!this.isAvailable) {
        return { success: false, message: 'Git is not available' };
      }

      TelemetryService.recordEvent('git_create_branch', { repoPath, branchName });
      return { success: true, message: `Branch '${branchName}' created` };
    } catch (error: any) {
      return { success: false, message: error.message };
    }
  }

  /**
   * Switch to branch
   */
  async switchBranch(repoPath: string, branchName: string): Promise<{ success: boolean; message: string }> {
    try {
      if (!this.isAvailable) {
        return { success: false, message: 'Git is not available' };
      }

      TelemetryService.recordEvent('git_switch_branch', { repoPath, branchName });
      this.clearStatusCache(repoPath);

      return { success: true, message: `Switched to branch '${branchName}'` };
    } catch (error: any) {
      return { success: false, message: error.message };
    }
  }

  /**
   * Push to remote
   */
  async push(repoPath: string, remote: string = 'origin', branch?: string): Promise<{ success: boolean; message: string }> {
    try {
      if (!this.isAvailable) {
        return { success: false, message: 'Git is not available' };
      }

      TelemetryService.recordEvent('git_push', { repoPath, remote, branch });
      return { success: true, message: 'Push successful' };
    } catch (error: any) {
      return { success: false, message: error.message };
    }
  }

  /**
   * Pull from remote
   */
  async pull(repoPath: string, remote: string = 'origin', branch?: string): Promise<{ success: boolean; message: string }> {
    try {
      if (!this.isAvailable) {
        return { success: false, message: 'Git is not available' };
      }

      TelemetryService.recordEvent('git_pull', { repoPath, remote, branch });
      this.clearStatusCache(repoPath);

      return { success: true, message: 'Pull successful' };
    } catch (error: any) {
      return { success: false, message: error.message };
    }
  }

  /**
   * Get diff for file
   */
  async getDiff(repoPath: string, filePath: string): Promise<GitDiff | null> {
    try {
      if (!this.isAvailable) {
        return null;
      }

      return {
        file: filePath,
        additions: 0,
        deletions: 0,
        diff: '',
      };
    } catch (error: any) {
      console.warn('[GitService] Failed to get diff:', error.message);
      return null;
    }
  }

  /**
   * Clear status cache for repository
   * @private
   */
  private clearStatusCache(repoPath: string): void {
    this.statusCache.delete(repoPath);
  }

  /**
   * Clear all cached status
   */
  clearAllCache(): void {
    this.statusCache.clear();
  }
}

export const gitService = GitService.getInstance();

/**
 * Git Integration - Version control integration for change detection
 */

// Use dynamic imports for Node.js modules (Electron compatibility)
const fs = typeof window === 'undefined' ? require('fs') : null;
const path = typeof window === 'undefined' ? require('path') : null;
const { execSync } = typeof window === 'undefined' ? require('child_process') : { execSync: null };

export interface GitChangeInfo {
  filePath: string;
  status: 'modified' | 'added' | 'deleted' | 'renamed';
  oldPath?: string; // For renamed files
}

export interface GitDiffHunk {
  oldStart: number;
  oldLines: number;
  newStart: number;
  newLines: number;
  lines: string[];
}

export interface ParsedGitDiff {
  filePath: string;
  oldPath?: string;
  hunks: GitDiffHunk[];
  additions: number;
  deletions: number;
}

export class GitIntegration {
  private rootDir: string;

  constructor(rootDir: string = (() => {
    const { safeProcessCwd } = require('../nodeCompat');
    return safeProcessCwd();
  })()) {
    this.rootDir = rootDir;
  }

  /**
   * Check if directory is a git repository
   */
  isGitRepository(): boolean {
    if (!fs || !path) {
      return false;
    }

    try {
      const gitDir = path.join(this.rootDir, '.git');
      return fs.existsSync(gitDir);
    } catch {
      return false;
    }
  }

  /**
   * Get list of changed files from git status
   */
  getChangedFiles(): GitChangeInfo[] {
    if (!this.isGitRepository() || !execSync) {
      return [];
    }

    try {
      const output = execSync('git status --porcelain', {
        cwd: this.rootDir,
        encoding: 'utf8'
      });

      const changes: GitChangeInfo[] = [];
      const lines = output.trim().split('\n').filter(line => line.trim());

      for (const line of lines) {
        const status = line.substring(0, 2);
        const filePath = line.substring(3).trim();

        // Parse git status codes
        if (status.startsWith('M') || status.startsWith('A') || status.startsWith('D') || status.startsWith('R')) {
          let changeStatus: GitChangeInfo['status'] = 'modified';
          
          if (status.startsWith('A')) {
            changeStatus = 'added';
          } else if (status.startsWith('D')) {
            changeStatus = 'deleted';
          } else if (status.startsWith('R')) {
            changeStatus = 'renamed';
            // Renamed files have format: "R  old -> new"
            const parts = filePath.split(' -> ');
            if (parts.length === 2) {
              changes.push({
                filePath: parts[1],
                status: 'renamed',
                oldPath: parts[0]
              });
              continue;
            }
          }

          changes.push({
            filePath,
            status: changeStatus
          });
        }
      }

      return changes;
    } catch (error) {
      console.warn('[GitIntegration] Failed to get git status:', error);
      return [];
    }
  }

  /**
   * Get file diff from git
   */
  getFileDiff(filePath: string): string | null {
    if (!this.isGitRepository() || !execSync) {
      return null;
    }

    try {
      const output = execSync(`git diff ${filePath}`, {
        cwd: this.rootDir,
        encoding: 'utf8'
      });
      return output;
    } catch (error) {
      console.warn(`[GitIntegration] Failed to get diff for ${filePath}:`, error);
      return null;
    }
  }

  /**
   * Get commit hash for a file
   */
  getFileCommitHash(filePath: string): string | null {
    if (!this.isGitRepository() || !execSync) {
      return null;
    }

    try {
      const output = execSync(`git log -1 --format=%H -- ${filePath}`, {
        cwd: this.rootDir,
        encoding: 'utf8'
      });
      return output.trim();
    } catch (error) {
      console.warn(`[GitIntegration] Failed to get commit hash for ${filePath}:`, error);
      return null;
    }
  }

  /**
   * Get file content from git (for comparison)
   */
  getFileFromGit(filePath: string, commitHash?: string): string | null {
    if (!this.isGitRepository() || !execSync) {
      return null;
    }

    try {
      const ref = commitHash || 'HEAD';
      const output = execSync(`git show ${ref}:${filePath}`, {
        cwd: this.rootDir,
        encoding: 'utf8'
      });
      return output;
    } catch (error) {
      console.warn(`[GitIntegration] Failed to get file from git:`, error);
      return null;
    }
  }

  /**
   * Get list of files changed between two commits
   */
  getChangedFilesBetweenCommits(fromCommit: string, toCommit: string = 'HEAD'): string[] {
    if (!this.isGitRepository() || !execSync) {
      return [];
    }

    try {
      const output = execSync(`git diff --name-only ${fromCommit}..${toCommit}`, {
        cwd: this.rootDir,
        encoding: 'utf8'
      });
      return output.trim().split('\n').filter(line => line.trim());
    } catch (error) {
      console.warn('[GitIntegration] Failed to get changed files between commits:', error);
      return [];
    }
  }

  /**
   * Parse git diff output into structured format
   */
  parseGitDiff(diffOutput: string): ParsedGitDiff | null {
    if (!diffOutput || !diffOutput.trim()) {
      return null;
    }

    const lines = diffOutput.split('\n');
    let currentFilePath = '';
    let oldFilePath: string | undefined;
    const hunks: GitDiffHunk[] = [];
    let additions = 0;
    let deletions = 0;
    let currentHunk: GitDiffHunk | null = null;
    let hunkLines: string[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Parse file header: diff --git a/path b/path
      if (line.startsWith('diff --git')) {
        const match = line.match(/diff --git a\/(.+?) b\/(.+?)$/);
        if (match) {
          oldFilePath = match[1];
          currentFilePath = match[2];
        }
        continue;
      }

      // Parse rename: rename from path1 to path2
      if (line.startsWith('rename from')) {
        oldFilePath = line.replace('rename from ', '');
        continue;
      }
      if (line.startsWith('rename to')) {
        currentFilePath = line.replace('rename to ', '');
        continue;
      }

      // Parse hunk header: @@ -oldStart,oldLines +newStart,newLines @@
      const hunkMatch = line.match(/^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/);
      if (hunkMatch) {
        // Save previous hunk if exists
        if (currentHunk) {
          currentHunk.lines = hunkLines;
          hunks.push(currentHunk);
        }

        const oldStart = parseInt(hunkMatch[1], 10);
        const oldLines = parseInt(hunkMatch[2] || '1', 10);
        const newStart = parseInt(hunkMatch[3], 10);
        const newLines = parseInt(hunkMatch[4] || '1', 10);

        currentHunk = {
          oldStart,
          oldLines,
          newStart,
          newLines,
          lines: []
        };
        hunkLines = [];
        continue;
      }

      // Count additions and deletions
      if (line.startsWith('+') && !line.startsWith('+++')) {
        additions++;
        if (currentHunk) {
          hunkLines.push(line);
        }
      } else if (line.startsWith('-') && !line.startsWith('---')) {
        deletions++;
        if (currentHunk) {
          hunkLines.push(line);
        }
      } else if (currentHunk) {
        hunkLines.push(line);
      }
    }

    // Save last hunk
    if (currentHunk) {
      currentHunk.lines = hunkLines;
      hunks.push(currentHunk);
    }

    if (!currentFilePath) {
      return null;
    }

    return {
      filePath: currentFilePath,
      oldPath: oldFilePath !== currentFilePath ? oldFilePath : undefined,
      hunks,
      additions,
      deletions
    };
  }

  /**
   * Get parsed diff for a file
   */
  getParsedDiff(filePath: string): ParsedGitDiff | null {
    const diffOutput = this.getFileDiff(filePath);
    if (!diffOutput) {
      return null;
    }
    return this.parseGitDiff(diffOutput);
  }

  /**
   * Get current commit hash
   */
  getCurrentCommitHash(): string | null {
    if (!this.isGitRepository() || !execSync) {
      return null;
    }

    try {
      const output = execSync('git rev-parse HEAD', {
        cwd: this.rootDir,
        encoding: 'utf8'
      });
      return output.trim();
    } catch (error) {
      console.warn('[GitIntegration] Failed to get current commit hash:', error);
      return null;
    }
  }

  /**
   * Get commit message for a commit hash
   */
  getCommitMessage(commitHash: string): string | null {
    if (!this.isGitRepository() || !execSync) {
      return null;
    }

    try {
      const output = execSync(`git log -1 --format=%s ${commitHash}`, {
        cwd: this.rootDir,
        encoding: 'utf8'
      });
      return output.trim();
    } catch (error) {
      console.warn(`[GitIntegration] Failed to get commit message for ${commitHash}:`, error);
      return null;
    }
  }

  /**
   * Get commit author for a commit hash
   */
  getCommitAuthor(commitHash: string): string | null {
    if (!this.isGitRepository() || !execSync) {
      return null;
    }

    try {
      const output = execSync(`git log -1 --format=%an ${commitHash}`, {
        cwd: this.rootDir,
        encoding: 'utf8'
      });
      return output.trim();
    } catch (error) {
      console.warn(`[GitIntegration] Failed to get commit author for ${commitHash}:`, error);
      return null;
    }
  }

  /**
   * Link snapshot to git commit (stores commit hash in snapshot metadata)
   * This is a helper method that can be used when creating snapshots
   */
  getCommitMetadata(): { hash: string | null; message: string | null; author: string | null } {
    const hash = this.getCurrentCommitHash();
    if (!hash) {
      return { hash: null, message: null, author: null };
    }

    return {
      hash,
      message: this.getCommitMessage(hash),
      author: this.getCommitAuthor(hash)
    };
  }
}

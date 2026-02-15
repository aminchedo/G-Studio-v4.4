/**
 * Code Intelligence API - Public read-only API for code intelligence system
 */

import { safeProcessCwd } from './nodeCompat';
import { Indexer } from './indexer';
import { ASTExtractor } from './astExtractor';
import { DependencyMapper } from './dependencyMapper';
import { ChangeTracker } from './changeTracker';
import { BreakingChangeDetector } from './analysis/breakingChangeDetector';
import { AIAnalyzer } from './analysis/aiAnalyzer';
import { VSCodeWatcher } from './vscode/vscodeWatcher';
import { CPGBuilder } from './cpg/cpgBuilder';
import { CPGAnalyzer } from './cpg/cpgAnalyzer';
import { ImpactAnalyzer } from './analysis/impactAnalyzer';
import { GitIntegration } from './vcs/gitIntegration';
import { TrendAnalyzer } from './history/trendAnalyzer';
import {
  FileMetadata,
  ASTSnapshot,
  DependencyGraph,
  Snapshot,
  ChangeReport,
  BreakingChangeReport,
  AIAnalysisReport,
  CodeIntelligenceConfig,
  CodePropertyGraph
} from '@/types/codeIntelligence';
import { ImpactResult } from './analysis/impactAnalyzer';

export class CodeIntelligenceAPI {
  private indexer: Indexer;
  private astExtractor: ASTExtractor;
  private dependencyMapper: DependencyMapper;
  private changeTracker: ChangeTracker;
  private breakingChangeDetector: BreakingChangeDetector;
  private aiAnalyzer: AIAnalyzer;
  private cpgBuilder: CPGBuilder;
  private cpgAnalyzer: CPGAnalyzer;
  private impactAnalyzer: ImpactAnalyzer;
  private gitIntegration: GitIntegration;
  private trendAnalyzer: TrendAnalyzer;
  private watcher: VSCodeWatcher | null = null;
  private config: CodeIntelligenceConfig;

  // Expose analyzers for route handlers
  get cpgAnalyzerInstance(): CPGAnalyzer {
    return this.cpgAnalyzer;
  }

  get impactAnalyzerInstance(): ImpactAnalyzer {
    return this.impactAnalyzer;
  }

  get trendAnalyzerInstance(): TrendAnalyzer {
    return this.trendAnalyzer;
  }

  constructor(rootDir: string = safeProcessCwd()) {
    this.indexer = new Indexer();
    this.astExtractor = new ASTExtractor();
    this.dependencyMapper = new DependencyMapper();
    this.changeTracker = new ChangeTracker();
    this.breakingChangeDetector = new BreakingChangeDetector();
    this.aiAnalyzer = new AIAnalyzer();
    this.cpgBuilder = new CPGBuilder();
    this.cpgAnalyzer = new CPGAnalyzer();
    this.impactAnalyzer = new ImpactAnalyzer();
    this.gitIntegration = new GitIntegration(rootDir);
    this.trendAnalyzer = new TrendAnalyzer();
    this.config = {
      enabled: true,
      autoIndex: true,
      watchFiles: false,
      aiAnalysisEnabled: true,
      snapshotInterval: 3600000 // 1 hour
    };
  }

  /**
   * Initialize the code intelligence system
   */
  async initialize(): Promise<void> {
    if (!this.config.enabled) {
      return;
    }

    if (this.config.autoIndex) {
      await this.indexer.scanProject();
    }

    if (this.config.watchFiles) {
      this.watcher = new VSCodeWatcher();
      this.watcher.startWatching();
    }
  }

  /**
   * Get file metadata
   */
  getFileMetadata(filePath: string): FileMetadata | null {
    const index = this.indexer.loadIndex();
    return index[filePath] || null;
  }

  /**
   * Get all file metadata
   */
  getAllFileMetadata(): Record<string, FileMetadata> {
    return this.indexer.loadIndex();
  }

  /**
   * Get AST snapshot for a file
   */
  getASTSnapshot(filePath: string): ASTSnapshot | null {
    return this.astExtractor.loadASTSnapshot(filePath);
  }

  /**
   * Get dependency graph
   */
  getDependencyGraph(): DependencyGraph | null {
    return this.dependencyMapper.loadDependencyGraph();
  }

  /**
   * Get dependencies for a file
   */
  getDependencies(filePath: string): string[] {
    const graph = this.getDependencyGraph();
    if (!graph) {
      return [];
    }
    return this.dependencyMapper.getDependencies(filePath, graph);
  }

  /**
   * Get dependents for a file
   */
  getDependents(filePath: string): string[] {
    const graph = this.getDependencyGraph();
    if (!graph) {
      return [];
    }
    return this.dependencyMapper.getDependents(filePath, graph);
  }

  /**
   * Check for circular dependencies
   */
  hasCircularDependency(filePath: string): boolean {
    const graph = this.getDependencyGraph();
    if (!graph) {
      return false;
    }
    return this.dependencyMapper.hasCircularDependency(filePath, graph);
  }

  /**
   * Create a snapshot
   */
  async createSnapshot(): Promise<Snapshot> {
    return await this.changeTracker.createSnapshot();
  }

  /**
   * Get latest snapshot
   */
  getLatestSnapshot(): Snapshot | null {
    return this.changeTracker.getLatestSnapshot();
  }

  /**
   * Get snapshot by ID
   */
  getSnapshot(snapshotId: string): Snapshot | null {
    return this.changeTracker.getSnapshot(snapshotId);
  }

  /**
   * List all snapshots
   */
  listSnapshots(): Snapshot[] {
    return this.changeTracker.listSnapshots();
  }

  /**
   * Detect breaking changes between two snapshots
   */
  detectBreakingChanges(oldSnapshotId: string, newSnapshotId: string): ChangeReport[] {
    const oldSnapshot = this.changeTracker.getSnapshot(oldSnapshotId);
    const newSnapshot = this.changeTracker.getSnapshot(newSnapshotId);

    if (!oldSnapshot || !newSnapshot) {
      return [];
    }

    return this.breakingChangeDetector.detectBreakingChanges(oldSnapshot, newSnapshot);
  }

  /**
   * Detect breaking changes from latest snapshot
   */
  async detectBreakingChangesFromLatest(): Promise<BreakingChangeReport> {
    const latestSnapshot = this.changeTracker.getLatestSnapshot();
    if (!latestSnapshot) {
      return {
        snapshotId: '',
        timestamp: Date.now(),
        changes: [],
        summary: { total: 0, safe: 0, risky: 0, breaking: 0 }
      };
    }

    // Create new snapshot
    const newSnapshot = await this.createSnapshot();

    // Detect changes
    const changes = this.breakingChangeDetector.detectBreakingChanges(latestSnapshot, newSnapshot);

    // AI analysis if enabled
    let aiReports: AIAnalysisReport[] = [];
    if (this.config.aiAnalysisEnabled) {
      aiReports = await this.aiAnalyzer.analyzeBreakingChanges(changes, latestSnapshot, newSnapshot);
    }

    const summary = {
      total: changes.length,
      safe: changes.filter(c => c.riskLevel === 'SAFE').length,
      risky: changes.filter(c => c.riskLevel === 'RISKY').length,
      breaking: changes.filter(c => c.riskLevel === 'BREAKING').length
    };

    return {
      snapshotId: newSnapshot.id,
      timestamp: Date.now(),
      changes,
      summary
    };
  }

  /**
   * Get AI analysis reports
   */
  getAIAnalysisReports(): AIAnalysisReport[] {
    return this.aiAnalyzer.loadReports();
  }

  /**
   * Get AI analysis for a specific file
   */
  getAIAnalysisForFile(filePath: string): AIAnalysisReport | null {
    const reports = this.aiAnalyzer.loadReports();
    return reports.find(r => r.filePath === filePath) || null;
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<CodeIntelligenceConfig>): void {
    this.config = { ...this.config, ...config };

    // Handle watcher changes
    if (config.watchFiles !== undefined) {
      if (config.watchFiles && !this.watcher) {
        this.watcher = new VSCodeWatcher();
        this.watcher.startWatching();
      } else if (!config.watchFiles && this.watcher) {
        this.watcher.stopWatching();
        this.watcher = null;
      }
    }
  }

  /**
   * Get current configuration
   */
  getConfig(): CodeIntelligenceConfig {
    return { ...this.config };
  }

  /**
   * Get Code Property Graph
   */
  getCPG(): CodePropertyGraph | null {
    return this.cpgBuilder.loadCPG();
  }

  /**
   * Build Code Property Graph from current state
   */
  async buildCPG(): Promise<CodePropertyGraph | null> {
    try {
      const latestSnapshot = this.getLatestSnapshot();
      if (!latestSnapshot) {
        return null;
      }
      return this.cpgBuilder.buildCPG(latestSnapshot.astSnapshots);
    } catch (error) {
      console.error('[CodeIntelligenceAPI] Failed to build CPG:', error);
      return null;
    }
  }

  /**
   * Analyze impact for changed files
   */
  analyzeImpact(changedFiles: string[]): ImpactResult | null {
    try {
      const graph = this.getDependencyGraph();
      if (!graph) {
        return null;
      }
      return this.impactAnalyzer.analyzeImpactFromDependencyGraph(graph, changedFiles);
    } catch (error) {
      console.error('[CodeIntelligenceAPI] Failed to analyze impact:', error);
      return null;
    }
  }

  /**
   * Get changed files from git
   */
  getGitChangedFiles(): any[] {
    return this.gitIntegration.getChangedFiles();
  }

  /**
   * Check if git repository
   */
  isGitRepository(): boolean {
    return this.gitIntegration.isGitRepository();
  }

  /**
   * Shutdown and cleanup
   */
  shutdown(): void {
    if (this.watcher) {
      this.watcher.stopWatching();
      this.watcher = null;
    }
  }
}

// Singleton instance
let apiInstance: CodeIntelligenceAPI | null = null;

/**
 * Get or create API instance
 */
export function getCodeIntelligenceAPI(rootDir?: string): CodeIntelligenceAPI {
  if (!apiInstance) {
    apiInstance = new CodeIntelligenceAPI(rootDir);
  }
  return apiInstance;
}

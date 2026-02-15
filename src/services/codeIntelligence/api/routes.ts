/**
 * REST API Routes - Route handlers for Code Intelligence API
 */

import { CodeIntelligenceAPI } from '../api';
import { ImpactResult } from '../analysis/impactAnalyzer';

export class APIRoutes {
  constructor(private api: CodeIntelligenceAPI) {}

  /**
   * Health check endpoint
   */
  healthCheck(req: any, res: any): void {
    res.json({ status: 'ok', timestamp: Date.now() });
  }

  /**
   * Trigger incremental analysis
   */
  async analyze(req: any, res: any): Promise<void> {
    try {
      const { files } = req.body;
      if (!files || !Array.isArray(files)) {
        res.status(400).json({ error: 'files array required' });
        return;
      }

      const result = await this.api.changeTracker.trackIncrementalChanges(files);
      res.json({
        success: true,
        changedFiles: result.changedFiles,
        impactSet: result.impactSet,
        snapshotId: result.snapshot?.id
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * Get dependency graph
   */
  getDependencyGraph(req: any, res: any): void {
    try {
      const graph = this.api.getDependencyGraph();
      if (!graph) {
        res.status(404).json({ error: 'Dependency graph not found' });
        return;
      }
      res.json(graph);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * Get breaking changes
   */
  async getBreakingChanges(req: any, res: any): Promise<void> {
    try {
      const report = await this.api.detectBreakingChangesFromLatest();
      res.json(report);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * Get history/snapshots with filtering
   */
  getHistory(req: any, res: any): void {
    try {
      const snapshots = this.api.listSnapshots();
      const limit = parseInt(req.query.limit || '10');
      const offset = parseInt(req.query.offset || '0');
      const tag = req.query.tag;
      
      let filtered = snapshots;
      if (tag) {
        // Filter by tag (would need metadata support)
        filtered = snapshots; // TODO: Implement tag filtering
      }
      
      const paginated = filtered.slice(offset, offset + limit);
      res.json({
        snapshots: paginated,
        total: filtered.length,
        limit,
        offset
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * Get specific snapshot
   */
  getSnapshot(req: any, res: any): void {
    try {
      const snapshotId = req.params.id;
      const snapshot = this.api.changeTracker.getSnapshot(snapshotId);
      
      if (!snapshot) {
        res.status(404).json({ error: 'Snapshot not found' });
        return;
      }
      
      res.json(snapshot);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * Get impact analysis for a file (enhanced with scoring)
   */
  getImpact(req: any, res: any): void {
    try {
      const filePath = decodeURIComponent(req.params.file);
      const graph = this.api.getDependencyGraph();
      
      if (!graph) {
        res.status(404).json({ error: 'Dependency graph not found' });
        return;
      }

      const dependencies = this.api.getDependencies(filePath);
      const dependents = this.api.getDependents(filePath);
      const hasCircular = this.api.hasCircularDependency(filePath);

      // Enhanced impact analysis with scoring
      const impactResult = this.api.impactAnalyzerInstance.analyzeImpactFromDependencyGraph(
        graph,
        [filePath],
        { includeHeatMap: true }
      );

      res.json({
        file: filePath,
        dependencies,
        dependents,
        hasCircularDependency: hasCircular,
        dependencyCount: dependencies.length,
        dependentCount: dependents.length,
        impactScore: impactResult.impactScore,
        heatMap: impactResult.heatMap
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * Get file metadata
   */
  getFileMetadata(req: any, res: any): void {
    try {
      const filePath = decodeURIComponent(req.params.file);
      const metadata = this.api.getFileMetadata(filePath);
      
      if (!metadata) {
        res.status(404).json({ error: 'File not found' });
        return;
      }

      const ast = this.api.getASTSnapshot(filePath);
      res.json({
        metadata,
        ast: ast || null
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * Get AI analysis reports
   */
  getAIAnalysis(req: any, res: any): void {
    try {
      const reports = this.api.getAIAnalysisReports();
      const filePath = req.query.file;
      
      if (filePath) {
        const report = this.api.getAIAnalysisForFile(filePath);
        res.json(report || null);
        return;
      }

      res.json(reports);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * Get Code Property Graph
   */
  getCPG(req: any, res: any): void {
    try {
      const cpg = this.api.getCPG();
      if (!cpg) {
        res.status(404).json({ error: 'Code Property Graph not found. Run buildCPG first.' });
        return;
      }
      res.json(cpg);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * Query Code Property Graph
   */
  queryCPG(req: any, res: any): void {
    try {
      const { query, nodeIds, edgeTypes } = req.body;
      const cpg = this.api.getCPG();
      
      if (!cpg) {
        res.status(404).json({ error: 'Code Property Graph not found' });
        return;
      }

      const cpgAnalyzer = this.api.cpgAnalyzerInstance;
      let result: any = null;

      switch (query) {
        case 'findCallers':
          if (!nodeIds || nodeIds.length === 0) {
            res.status(400).json({ error: 'nodeIds required for findCallers query' });
            return;
          }
          result = nodeIds.map((id: string) => cpgAnalyzer.findAllCallers(cpg, id));
          break;
        
        case 'findCallees':
          if (!nodeIds || nodeIds.length === 0) {
            res.status(400).json({ error: 'nodeIds required for findCallees query' });
            return;
          }
          result = nodeIds.map((id: string) => cpgAnalyzer.findAllCallees(cpg, id));
          break;
        
        case 'findPaths':
          const { sourceId, targetId, maxDepth } = req.body;
          if (!sourceId || !targetId) {
            res.status(400).json({ error: 'sourceId and targetId required for findPaths query' });
            return;
          }
          result = cpgAnalyzer.findAllPaths(cpg, sourceId, targetId, maxDepth || 10);
          break;
        
        case 'findSCC':
          result = cpgAnalyzer.findStronglyConnectedComponents(cpg);
          break;
        
        default:
          res.status(400).json({ error: `Unknown query type: ${query}` });
          return;
      }

      res.json({ result });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * Get trend analysis
   */
  getTrends(req: any, res: any): void {
    try {
      const snapshots = this.api.listSnapshots();
      const trendAnalyzer = this.api.trendAnalyzerInstance;
      const trends = trendAnalyzer.analyzeTrends(snapshots);
      res.json(trends);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * Restore snapshot (read-only preview)
   */
  restoreSnapshot(req: any, res: any): void {
    try {
      const snapshotId = req.params.id;
      const snapshot = this.api.changeTracker.getSnapshot(snapshotId);
      
      if (!snapshot) {
        res.status(404).json({ error: 'Snapshot not found' });
        return;
      }

      // Return snapshot metadata (read-only, doesn't actually restore)
      res.json({
        snapshotId: snapshot.id,
        timestamp: snapshot.timestamp,
        fileCount: Object.keys(snapshot.files).length,
        message: 'This is a read-only preview. Snapshot restoration is not implemented for safety.'
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
}

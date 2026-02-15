/**
 * Impact Analyzer - Graph-based impact analysis using BFS/DFS
 */

import { DependencyGraph, CodePropertyGraph } from '../../../types/codeIntelligence';
import { CPGAnalyzer } from '../cpg/cpgAnalyzer';

export interface ImpactResult {
  affectedFiles: string[];
  transitiveClosure: string[];
  impactScore: number;
  criticalPaths: string[][];
  heatMap?: Record<string, number>; // File -> heat score (0-1)
}

export interface DependencyWeights {
  direct: number;      // Direct dependency weight (default: 1.0)
  transitive: number;  // Transitive dependency weight (default: 0.5)
  circular: number;    // Circular dependency weight (default: 2.0)
  export: number;      // Export dependency weight (default: 1.5)
}

export class ImpactAnalyzer {
  private cpgAnalyzer: CPGAnalyzer;

  constructor() {
    this.cpgAnalyzer = new CPGAnalyzer();
  }

  /**
   * Analyze impact using dependency graph (BFS or DFS traversal)
   * Enhanced with weighted scoring and dependency heat propagation
   */
  analyzeImpactFromDependencyGraph(
    dependencyGraph: DependencyGraph,
    changedFiles: string[],
    options: {
      useDFS?: boolean;
      weights?: DependencyWeights;
      includeHeatMap?: boolean;
    } = {}
  ): ImpactResult {
    const { useDFS = false, weights, includeHeatMap = true } = options;
    const defaultWeights: DependencyWeights = {
      direct: 1.0,
      transitive: 0.5,
      circular: 2.0,
      export: 1.5,
      ...weights
    };

    const affectedFiles = new Set<string>(changedFiles);
    const visited = new Set<string>();
    const criticalPaths: string[][] = [];
    const heatMap: Record<string, number> = {};
    
    // Initialize heat map for changed files
    changedFiles.forEach(file => {
      heatMap[file] = 1.0; // Maximum heat for directly changed files
    });

    // Detect SCCs for circular dependency handling
    const sccs = this.findStronglyConnectedComponents(dependencyGraph);
    const fileToSCC = new Map<string, string[]>();
    sccs.forEach(scc => {
      scc.forEach(file => {
        fileToSCC.set(file, scc);
      });
    });

    if (useDFS) {
      // DFS traversal
      const dfs = (currentFile: string, depth: number, path: string[]): void => {
        if (visited.has(currentFile)) {
          return;
        }

        visited.add(currentFile);
        const newPath = [...path, currentFile];
        const node = dependencyGraph.nodes[currentFile];

        if (!node) {
          return;
        }

        // Calculate heat propagation
        const parentHeat = heatMap[path[path.length - 1]] || 1.0;
        const isCircular = fileToSCC.has(currentFile);
        const weight = depth === 1 
          ? defaultWeights.direct 
          : (isCircular ? defaultWeights.circular : defaultWeights.transitive);
        
        const propagatedHeat = parentHeat * weight * (1 / (depth + 1));
        heatMap[currentFile] = Math.max(heatMap[currentFile] || 0, propagatedHeat);

        // Add all dependents
        node.dependents.forEach(dependent => {
          if (!affectedFiles.has(dependent)) {
            affectedFiles.add(dependent);
            criticalPaths.push([...newPath, dependent]);
          }
          dfs(dependent, depth + 1, newPath);
        });
      };

      changedFiles.forEach(file => {
        dfs(file, 0, []);
      });
    } else {
      // BFS traversal (original implementation, enhanced)
      const queue: Array<{ file: string; depth: number; path: string[] }> = 
        changedFiles.map(f => ({ file: f, depth: 0, path: [f] }));

      while (queue.length > 0) {
        const { file: currentFile, depth, path } = queue.shift()!;

        if (visited.has(currentFile)) {
          continue;
        }

        visited.add(currentFile);
        const node = dependencyGraph.nodes[currentFile];

        if (!node) {
          continue;
        }

        // Calculate heat propagation
        const parentHeat = heatMap[path[path.length - 1]] || 1.0;
        const isCircular = fileToSCC.has(currentFile);
        const weight = depth === 0 
          ? defaultWeights.direct 
          : (isCircular ? defaultWeights.circular : defaultWeights.transitive);
        
        const propagatedHeat = parentHeat * weight * (1 / (depth + 1));
        heatMap[currentFile] = Math.max(heatMap[currentFile] || 0, propagatedHeat);

        // Add all dependents to affected set
        node.dependents.forEach(dependent => {
          if (!affectedFiles.has(dependent)) {
            affectedFiles.add(dependent);
            queue.push({ file: dependent, depth: depth + 1, path: [...path, dependent] });
            criticalPaths.push([...path, dependent]);
          }
        });
      }
    }

    // Normalize heat map to 0-1 range
    const maxHeat = Math.max(...Object.values(heatMap), 1);
    Object.keys(heatMap).forEach(file => {
      heatMap[file] = heatMap[file] / maxHeat;
    });

    // Calculate weighted impact score
    const totalFiles = Object.keys(dependencyGraph.nodes).length;
    let weightedScore = 0;
    affectedFiles.forEach(file => {
      const heat = heatMap[file] || 0;
      weightedScore += heat;
    });
    const impactScore = totalFiles > 0 ? weightedScore / totalFiles : 0;

    return {
      affectedFiles: Array.from(affectedFiles),
      transitiveClosure: Array.from(affectedFiles),
      impactScore,
      criticalPaths,
      heatMap: includeHeatMap ? heatMap : undefined
    };
  }

  /**
   * Find strongly connected components (SCC) using Kosaraju's algorithm
   */
  private findStronglyConnectedComponents(graph: DependencyGraph): string[][] {
    const components: string[][] = [];
    const visited = new Set<string>();
    const finished = new Set<string>();
    const stack: string[] = [];

    // Build reverse graph
    const reverseGraph = new Map<string, string[]>();
    Object.values(graph.nodes).forEach(node => {
      node.dependents.forEach(dep => {
        if (!reverseGraph.has(dep)) {
          reverseGraph.set(dep, []);
        }
        reverseGraph.get(dep)!.push(node.file);
      });
    });

    // First DFS pass (forward)
    const dfs1 = (file: string): void => {
      if (visited.has(file)) {
        return;
      }

      visited.add(file);
      const node = graph.nodes[file];
      if (node) {
        node.dependents.forEach(dep => {
          dfs1(dep);
        });
      }

      finished.add(file);
      stack.push(file);
    };

    Object.keys(graph.nodes).forEach(file => {
      if (!visited.has(file)) {
        dfs1(file);
      }
    });

    // Second DFS pass (reverse)
    visited.clear();
    const dfs2 = (file: string, component: string[]): void => {
      if (visited.has(file)) {
        return;
      }

      visited.add(file);
      component.push(file);

      const incoming = reverseGraph.get(file) || [];
      incoming.forEach(source => {
        dfs2(source, component);
      });
    };

    while (stack.length > 0) {
      const file = stack.pop()!;
      if (!visited.has(file)) {
        const component: string[] = [];
        dfs2(file, component);
        if (component.length > 1) {
          // Only include components with multiple files
          components.push(component);
        }
      }
    }

    return components;
  }

  /**
   * Analyze impact using Code Property Graph (more detailed)
   */
  analyzeImpactFromCPG(
    cpg: CodePropertyGraph,
    changedFilePaths: string[]
  ): ImpactResult {
    // Find node IDs for changed files
    const changedNodeIds: string[] = [];
    changedFilePaths.forEach(filePath => {
      const fileNodes = cpg.fileNodes[filePath] || [];
      changedNodeIds.push(...fileNodes);
    });

    if (changedNodeIds.length === 0) {
      return {
        affectedFiles: [],
        transitiveClosure: [],
        impactScore: 0,
        criticalPaths: []
      };
    }

    // Use CPG analyzer for impact analysis
    const impact = this.cpgAnalyzer.analyzeImpact(cpg, changedNodeIds, ['data-flow', 'call', 'import']);

    // Find critical paths
    const criticalPaths: string[][] = [];
    changedNodeIds.forEach(sourceNodeId => {
      // Find paths to other affected nodes
      impact.affectedNodes.forEach(targetNodeId => {
        if (sourceNodeId !== targetNodeId) {
          const path = this.cpgAnalyzer.findShortestPath(cpg, sourceNodeId, targetNodeId);
          if (path && path.length > 1) {
            criticalPaths.push(path);
          }
        }
      });
    });

    return {
      affectedFiles: impact.affectedFiles,
      transitiveClosure: impact.affectedNodes.map(nodeId => {
        const node = cpg.nodes[nodeId];
        return node ? node.filePath : '';
      }).filter(Boolean),
      impactScore: impact.impactScore,
      criticalPaths: criticalPaths.map(path => path.map(nodeId => {
        const node = cpg.nodes[nodeId];
        return node ? node.name : nodeId;
      }))
    };
  }

  /**
   * Compute reachability analysis
   */
  computeReachability(
    dependencyGraph: DependencyGraph,
    sourceFiles: string[],
    targetFiles: string[]
  ): {
    reachable: boolean;
    paths: string[][];
  } {
    const paths: string[][] = [];
    const visited = new Set<string>();

    const dfs = (currentFile: string, path: string[]): void => {
      if (visited.has(currentFile)) {
        return;
      }

      visited.add(currentFile);
      const newPath = [...path, currentFile];

      if (targetFiles.includes(currentFile)) {
        paths.push(newPath);
        return;
      }

      const node = dependencyGraph.nodes[currentFile];
      if (!node) {
        return;
      }

      // Traverse dependents
      node.dependents.forEach(dependent => {
        dfs(dependent, newPath);
      });
    };

    sourceFiles.forEach(sourceFile => {
      dfs(sourceFile, []);
    });

    return {
      reachable: paths.length > 0,
      paths
    };
  }

  /**
   * Clustering analysis for module boundaries
   */
  clusterModules(
    dependencyGraph: DependencyGraph,
    minClusterSize: number = 2
  ): Map<string, string[]> {
    const clusters = new Map<string, string[]>();
    const visited = new Set<string>();

    const dfsCluster = (file: string, cluster: string[]): void => {
      if (visited.has(file)) {
        return;
      }

      visited.add(file);
      cluster.push(file);

      const node = dependencyGraph.nodes[file];
      if (!node) {
        return;
      }

      // Add strongly connected files to cluster
      node.dependencies.forEach(dep => {
        const depNode = dependencyGraph.nodes[dep];
        if (depNode && depNode.dependents.includes(file)) {
          // Bidirectional dependency - same cluster
          dfsCluster(dep, cluster);
        }
      });

      node.dependents.forEach(dep => {
        const depNode = dependencyGraph.nodes[dep];
        if (depNode && depNode.dependencies.includes(file)) {
          // Bidirectional dependency - same cluster
          dfsCluster(dep, cluster);
        }
      });
    };

    Object.keys(dependencyGraph.nodes).forEach(file => {
      if (!visited.has(file)) {
        const cluster: string[] = [];
        dfsCluster(file, cluster);
        
        if (cluster.length >= minClusterSize) {
          clusters.set(file, cluster);
        }
      }
    });

    return clusters;
  }
}

/**
 * Dependency Mapper - Analyzes and maps dependencies between files
 */

// Use dynamic imports for Node.js modules (Electron compatibility)
const fs = typeof window === 'undefined' ? require('fs') : null;
const path = typeof window === 'undefined' ? require('path') : null;
import { DependencyGraph, DependencyNode, ASTSnapshot } from '../../types/codeIntelligence';
import { ASTExtractor } from './astExtractor';

export class DependencyMapper {
  private readonly DEPS_FILE: string;
  private astExtractor: ASTExtractor;
  private graphCache: DependencyGraph | null = null;

  constructor() {
    this.astExtractor = new ASTExtractor();
    this.DEPS_FILE = path ? path.join('.project-intel', 'index', 'deps', 'graph.json') : '.project-intel/index/deps/graph.json';
  }

  /**
   * Build dependency graph from AST snapshots
   */
  buildDependencyGraph(astSnapshots: Record<string, ASTSnapshot>): DependencyGraph {
    const nodes: Record<string, DependencyNode> = {};
    const circularDependencies: string[][] = [];
    const externalDependencies: Record<string, string[]> = {};

    // Initialize nodes
    Object.keys(astSnapshots).forEach(filePath => {
      nodes[filePath] = {
        file: filePath,
        dependencies: [],
        dependents: [],
        isExternal: false
      };
    });

    // Build dependency relationships
    Object.entries(astSnapshots).forEach(([filePath, snapshot]) => {
      snapshot.imports.forEach(importInfo => {
        if (!importInfo.isExternal) {
          // Resolve internal import
          const resolvedPath = this.resolveImportPath(filePath, importInfo.source);
          if (resolvedPath && nodes[resolvedPath]) {
            nodes[filePath].dependencies.push(resolvedPath);
            nodes[resolvedPath].dependents.push(filePath);
          }
        } else {
          // Track external dependencies
          if (!externalDependencies[filePath]) {
            externalDependencies[filePath] = [];
          }
          if (!externalDependencies[filePath].includes(importInfo.source)) {
            externalDependencies[filePath].push(importInfo.source);
          }
        }
      });
    });

    // Detect circular dependencies
    Object.keys(nodes).forEach(filePath => {
      const cycle = this.detectCycle(filePath, nodes, new Set());
      if (cycle && cycle.length > 0) {
        // Check if this cycle is already recorded
        const cycleKey = cycle.sort().join(' -> ');
        const isDuplicate = circularDependencies.some(existing => {
          const existingKey = existing.sort().join(' -> ');
          return existingKey === cycleKey;
        });
        if (!isDuplicate) {
          circularDependencies.push(cycle);
        }
      }
    });

    const graph: DependencyGraph = {
      nodes,
      circularDependencies,
      externalDependencies,
      timestamp: Date.now()
    };

    this.saveDependencyGraph(graph);
    return graph;
  }

  /**
   * Resolve import path to actual file path
   */
  private resolveImportPath(fromFile: string, importSource: string): string | null {
    // Remove file extension from import source
    const sourceWithoutExt = importSource.replace(/\.(ts|tsx|js|jsx)$/, '');

    // Try different resolution strategies
    const fromDir = path.dirname(fromFile);
    const possiblePaths = [
      path.join(fromDir, `${sourceWithoutExt}.ts`),
      path.join(fromDir, `${sourceWithoutExt}.tsx`),
      path.join(fromDir, `${sourceWithoutExt}.js`),
      path.join(fromDir, `${sourceWithoutExt}.jsx`),
      path.join(fromDir, sourceWithoutExt, 'index.ts'),
      path.join(fromDir, sourceWithoutExt, 'index.tsx'),
      path.join(fromDir, sourceWithoutExt, 'index.js'),
      path.join(fromDir, sourceWithoutExt, 'index.jsx')
    ];

    // Also try resolving from project root
    const { safeProcessCwd } = require('./nodeCompat');
    const projectRoot = safeProcessCwd();
    possiblePaths.push(
      path.join(projectRoot, `${sourceWithoutExt}.ts`),
      path.join(projectRoot, `${sourceWithoutExt}.tsx`),
      path.join(projectRoot, `${sourceWithoutExt}.js`),
      path.join(projectRoot, `${sourceWithoutExt}.jsx`)
    );

    // Normalize paths and check if they exist in our tracked files
    for (const possiblePath of possiblePaths) {
      const normalized = path.normalize(possiblePath);
      // Check if this path exists in our index (we'll need to check against actual files)
      // For now, return the normalized path
      if (normalized.startsWith(projectRoot)) {
        const relative = path.relative(projectRoot, normalized);
        return relative;
      }
    }

    return null;
  }

  /**
   * Detect circular dependency starting from a file
   */
  private detectCycle(
    startFile: string,
    nodes: Record<string, DependencyNode>,
    visited: Set<string>,
    path: string[] = []
  ): string[] | null {
    if (visited.has(startFile)) {
      // Found a cycle
      const cycleStart = path.indexOf(startFile);
      if (cycleStart !== -1) {
        return path.slice(cycleStart).concat([startFile]);
      }
      return null;
    }

    visited.add(startFile);
    path.push(startFile);

    const node = nodes[startFile];
    if (!node) {
      return null;
    }

    for (const dep of node.dependencies) {
      const cycle = this.detectCycle(dep, nodes, new Set(visited), [...path]);
      if (cycle) {
        return cycle;
      }
    }

    return null;
  }

  /**
   * Get dependencies for a file
   */
  getDependencies(filePath: string, graph: DependencyGraph): string[] {
    return graph.nodes[filePath]?.dependencies || [];
  }

  /**
   * Get dependents (files that depend on this file)
   */
  getDependents(filePath: string, graph: DependencyGraph): string[] {
    return graph.nodes[filePath]?.dependents || [];
  }

  /**
   * Check if file has circular dependencies
   */
  hasCircularDependency(filePath: string, graph: DependencyGraph): boolean {
    return graph.circularDependencies.some(cycle => cycle.includes(filePath));
  }

  /**
   * Find shortest path between two files
   */
  findShortestPath(
    graph: DependencyGraph,
    sourceFile: string,
    targetFile: string
  ): string[] | null {
    const visited = new Set<string>();
    const queue: { file: string; path: string[] }[] = [{ file: sourceFile, path: [sourceFile] }];

    while (queue.length > 0) {
      const { file, path } = queue.shift()!;

      if (file === targetFile) {
        return path;
      }

      if (visited.has(file)) {
        continue;
      }

      visited.add(file);
      const node = graph.nodes[file];

      if (!node) {
        continue;
      }

      // Add dependencies to queue
      node.dependencies.forEach(dep => {
        if (!visited.has(dep)) {
          queue.push({
            file: dep,
            path: [...path, dep]
          });
        }
      });
    }

    return null;
  }

  /**
   * Find strongly connected components (circular dependencies)
   */
  findStronglyConnectedComponents(graph: DependencyGraph): string[][] {
    const components: string[][] = [];
    const visited = new Set<string>();
    const finished = new Set<string>();
    const stack: string[] = [];

    // Build reverse graph
    const reverseGraph = new Map<string, string[]>();
    Object.values(graph.nodes).forEach(node => {
      node.dependencies.forEach(dep => {
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
        node.dependencies.forEach(dep => {
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
          components.push(component);
        }
      }
    }

    return components;
  }

  /**
   * Get cached graph or load from disk
   */
  getCachedGraph(): DependencyGraph | null {
    if (this.graphCache) {
      return this.graphCache;
    }

    const graph = this.loadDependencyGraph();
    if (graph) {
      this.graphCache = graph;
    }

    return graph;
  }

  /**
   * Invalidate cache
   */
  invalidateCache(): void {
    this.graphCache = null;
  }

  /**
   * Save dependency graph to disk
   */
  private saveDependencyGraph(graph: DependencyGraph): void {
    try {
      const dir = path.dirname(this.DEPS_FILE);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(this.DEPS_FILE, JSON.stringify(graph, null, 2));
    } catch (error) {
      console.error('[DependencyMapper] Failed to save dependency graph:', error);
    }
  }

  /**
   * Load dependency graph from disk
   */
  loadDependencyGraph(): DependencyGraph | null {
    try {
      if (fs.existsSync(this.DEPS_FILE)) {
        const content = fs.readFileSync(this.DEPS_FILE, 'utf8');
        return JSON.parse(content);
      }
    } catch (error) {
      console.warn('[DependencyMapper] Failed to load dependency graph:', error);
    }
    return null;
  }

  /**
   * Map dependencies at module level (group files by directory)
   */
  buildModuleDependencyMap(graph: DependencyGraph): Map<string, Set<string>> {
    const moduleMap = new Map<string, Set<string>>();

    // Group files by module (directory)
    const fileToModule = new Map<string, string>();
    Object.keys(graph.nodes).forEach(filePath => {
      const module = path.dirname(filePath);
      fileToModule.set(filePath, module);
    });

    // Build module-level dependencies
    Object.entries(graph.nodes).forEach(([filePath, node]) => {
      const sourceModule = fileToModule.get(filePath) || '';
      if (!moduleMap.has(sourceModule)) {
        moduleMap.set(sourceModule, new Set<string>());
      }

      node.dependencies.forEach(dep => {
        const targetModule = fileToModule.get(dep) || '';
        if (targetModule && targetModule !== sourceModule) {
          moduleMap.get(sourceModule)!.add(targetModule);
        }
      });
    });

    return moduleMap;
  }

  /**
   * Calculate dependency strength between two files
   * Returns a score 0-1 indicating how tightly coupled they are
   */
  calculateDependencyStrength(
    graph: DependencyGraph,
    file1: string,
    file2: string
  ): number {
    const node1 = graph.nodes[file1];
    const node2 = graph.nodes[file2];

    if (!node1 || !node2) {
      return 0;
    }

    let strength = 0;
    let factors = 0;

    // Factor 1: Direct dependency
    if (node1.dependencies.includes(file2) || node2.dependencies.includes(file1)) {
      strength += 0.5;
      factors++;
    }

    // Factor 2: Bidirectional dependency (circular)
    if (node1.dependencies.includes(file2) && node2.dependencies.includes(file1)) {
      strength += 0.3;
      factors++;
    }

    // Factor 3: Number of transitive paths
    const paths = this.findAllPaths(graph, file1, file2, 5);
    if (paths.length > 0) {
      strength += Math.min(0.2, paths.length * 0.05);
      factors++;
    }

    // Factor 4: Shared dependencies (coupling)
    const sharedDeps = node1.dependencies.filter(dep => node2.dependencies.includes(dep));
    if (sharedDeps.length > 0) {
      strength += Math.min(0.1, sharedDeps.length * 0.02);
      factors++;
    }

    // Normalize by number of factors
    return factors > 0 ? Math.min(1.0, strength) : 0;
  }

  /**
   * Find all paths between two files (up to maxDepth)
   */
  private findAllPaths(
    graph: DependencyGraph,
    source: string,
    target: string,
    maxDepth: number
  ): string[][] {
    const paths: string[][] = [];

    const dfs = (current: string, path: string[], depth: number): void => {
      if (depth > maxDepth) {
        return;
      }

      if (current === target) {
        paths.push([...path]);
        return;
      }

      // Avoid cycles
      if (path.includes(current)) {
        return;
      }

      const node = graph.nodes[current];
      if (!node) {
        return;
      }

      node.dependents.forEach(dep => {
        dfs(dep, [...path, dep], depth + 1);
      });
    };

    dfs(source, [source], 0);
    return paths;
  }
}

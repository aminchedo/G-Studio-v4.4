/**
 * CPG Analyzer - Graph analysis algorithms for Code Property Graph
 */

import { CodePropertyGraph, CPGNode, CPGEdge } from '../../../types/codeIntelligence';

export interface ReachabilityResult {
  reachableNodes: Set<string>;
  paths: string[][];
}

export interface ImpactAnalysis {
  affectedFiles: string[];
  affectedNodes: string[];
  impactScore: number;
}

export class CPGAnalyzer {
  /**
   * BFS traversal from a set of starting nodes
   */
  bfsTraversal(cpg: CodePropertyGraph, startNodeIds: string[], edgeTypes?: CPGEdge['type'][]): Set<string> {
    const visited = new Set<string>();
    const queue = [...startNodeIds];
    const result = new Set<string>();

    while (queue.length > 0) {
      const currentNodeId = queue.shift()!;
      
      if (visited.has(currentNodeId)) {
        continue;
      }
      
      visited.add(currentNodeId);
      result.add(currentNodeId);

      // Find all outgoing edges
      const outgoingEdges = cpg.edges.filter(edge => {
        if (edge.source !== currentNodeId) {
          return false;
        }
        if (edgeTypes && !edgeTypes.includes(edge.type)) {
          return false;
        }
        return true;
      });

      // Add target nodes to queue
      outgoingEdges.forEach(edge => {
        if (!visited.has(edge.target)) {
          queue.push(edge.target);
        }
      });
    }

    return result;
  }

  /**
   * DFS traversal from a set of starting nodes
   */
  dfsTraversal(cpg: CodePropertyGraph, startNodeIds: string[], edgeTypes?: CPGEdge['type'][]): Set<string> {
    const visited = new Set<string>();
    const result = new Set<string>();

    const dfs = (nodeId: string): void => {
      if (visited.has(nodeId)) {
        return;
      }

      visited.add(nodeId);
      result.add(nodeId);

      // Find all outgoing edges
      const outgoingEdges = cpg.edges.filter(edge => {
        if (edge.source !== nodeId) {
          return false;
        }
        if (edgeTypes && !edgeTypes.includes(edge.type)) {
          return false;
        }
        return true;
      });

      // Recursively visit target nodes
      outgoingEdges.forEach(edge => {
        dfs(edge.target);
      });
    };

    startNodeIds.forEach(nodeId => dfs(nodeId));
    return result;
  }

  /**
   * Compute reachability from source nodes to target nodes
   */
  computeReachability(
    cpg: CodePropertyGraph,
    sourceNodeIds: string[],
    targetNodeIds: string[],
    edgeTypes?: CPGEdge['type'][]
  ): ReachabilityResult {
    const reachableNodes = new Set<string>();
    const paths: string[][] = [];

    // BFS to find all reachable nodes
    const visited = new Set<string>();
    const queue: { nodeId: string; path: string[] }[] = sourceNodeIds.map(id => ({ nodeId: id, path: [id] }));

    while (queue.length > 0) {
      const { nodeId, path } = queue.shift()!;

      if (visited.has(nodeId)) {
        continue;
      }

      visited.add(nodeId);

      // Check if this is a target node
      if (targetNodeIds.includes(nodeId)) {
        reachableNodes.add(nodeId);
        paths.push([...path]);
      }

      // Find outgoing edges
      const outgoingEdges = cpg.edges.filter(edge => {
        if (edge.source !== nodeId) {
          return false;
        }
        if (edgeTypes && !edgeTypes.includes(edge.type)) {
          return false;
        }
        return true;
      });

      // Add neighbors to queue
      outgoingEdges.forEach(edge => {
        if (!visited.has(edge.target)) {
          queue.push({
            nodeId: edge.target,
            path: [...path, edge.target]
          });
        }
      });
    }

    return { reachableNodes, paths };
  }

  /**
   * Analyze impact of changes to specific nodes
   */
  analyzeImpact(
    cpg: CodePropertyGraph,
    changedNodeIds: string[],
    edgeTypes: CPGEdge['type'][] = ['data-flow', 'call', 'import']
  ): ImpactAnalysis {
    // Use BFS to find all nodes reachable from changed nodes
    const affectedNodes = this.bfsTraversal(cpg, changedNodeIds, edgeTypes);

    // Find affected files
    const affectedFiles = new Set<string>();
    affectedNodes.forEach(nodeId => {
      const node = cpg.nodes[nodeId];
      if (node && node.filePath) {
        affectedFiles.add(node.filePath);
      }
    });

    // Calculate impact score (number of affected nodes / total nodes)
    const totalNodes = Object.keys(cpg.nodes).length;
    const impactScore = totalNodes > 0 ? affectedNodes.size / totalNodes : 0;

    return {
      affectedFiles: Array.from(affectedFiles),
      affectedNodes: Array.from(affectedNodes),
      impactScore
    };
  }

  /**
   * Find strongly connected components (for circular dependency detection)
   */
  findStronglyConnectedComponents(cpg: CodePropertyGraph): string[][] {
    const components: string[][] = [];
    const visited = new Set<string>();
    const finished = new Set<string>();
    const stack: string[] = [];

    // Build reverse graph for Kosaraju's algorithm
    const reverseEdges = new Map<string, string[]>();
    cpg.edges.forEach(edge => {
      if (!reverseEdges.has(edge.target)) {
        reverseEdges.set(edge.target, []);
      }
      reverseEdges.get(edge.target)!.push(edge.source);
    });

    // First DFS pass (forward)
    const dfs1 = (nodeId: string): void => {
      if (visited.has(nodeId)) {
        return;
      }

      visited.add(nodeId);

      const outgoingEdges = cpg.edges.filter(e => e.source === nodeId);
      outgoingEdges.forEach(edge => {
        dfs1(edge.target);
      });

      finished.add(nodeId);
      stack.push(nodeId);
    };

    Object.keys(cpg.nodes).forEach(nodeId => {
      if (!visited.has(nodeId)) {
        dfs1(nodeId);
      }
    });

    // Second DFS pass (reverse)
    visited.clear();
    const dfs2 = (nodeId: string, component: string[]): void => {
      if (visited.has(nodeId)) {
        return;
      }

      visited.add(nodeId);
      component.push(nodeId);

      const incomingEdges = reverseEdges.get(nodeId) || [];
      incomingEdges.forEach(sourceId => {
        dfs2(sourceId, component);
      });
    };

    while (stack.length > 0) {
      const nodeId = stack.pop()!;
      if (!visited.has(nodeId)) {
        const component: string[] = [];
        dfs2(nodeId, component);
        if (component.length > 1) {
          // Only include components with multiple nodes
          components.push(component);
        }
      }
    }

    return components;
  }

  /**
   * Module clustering analysis
   */
  clusterModules(cpg: CodePropertyGraph, minClusterSize: number = 2): Map<string, string[]> {
    const clusters = new Map<string, string[]>();
    const visited = new Set<string>();

    // Group nodes by file
    const fileGroups = new Map<string, string[]>();
    Object.values(cpg.nodes).forEach(node => {
      if (node.filePath) {
        if (!fileGroups.has(node.filePath)) {
          fileGroups.set(node.filePath, []);
        }
        fileGroups.get(node.filePath)!.push(node.id);
      }
    });

    // Find clusters based on file groups and their connections
    fileGroups.forEach((nodeIds, filePath) => {
      if (nodeIds.length < minClusterSize) {
        return;
      }

      // Check if nodes in this file form a cluster
      const clusterNodes = new Set<string>(nodeIds);
      
      // Add connected nodes from other files
      nodeIds.forEach(nodeId => {
        const connectedEdges = cpg.edges.filter(
          e => (e.source === nodeId || e.target === nodeId) && 
               e.type !== 'syntax' // Exclude syntax edges
        );
        
        connectedEdges.forEach(edge => {
          const otherNodeId = edge.source === nodeId ? edge.target : edge.source;
          const otherNode = cpg.nodes[otherNodeId];
          if (otherNode && otherNode.filePath === filePath) {
            clusterNodes.add(otherNodeId);
          }
        });
      });

      if (clusterNodes.size >= minClusterSize) {
        clusters.set(filePath, Array.from(clusterNodes));
      }
    });

    return clusters;
  }

  /**
   * Find shortest path between two nodes
   */
  findShortestPath(
    cpg: CodePropertyGraph,
    sourceNodeId: string,
    targetNodeId: string
  ): string[] | null {
    const visited = new Set<string>();
    const queue: { nodeId: string; path: string[] }[] = [{ nodeId: sourceNodeId, path: [sourceNodeId] }];

    while (queue.length > 0) {
      const { nodeId, path } = queue.shift()!;

      if (nodeId === targetNodeId) {
        return path;
      }

      if (visited.has(nodeId)) {
        continue;
      }

      visited.add(nodeId);

      const outgoingEdges = cpg.edges.filter(e => e.source === nodeId);
      outgoingEdges.forEach(edge => {
        if (!visited.has(edge.target)) {
          queue.push({
            nodeId: edge.target,
            path: [...path, edge.target]
          });
        }
      });
    }

    return null;
  }

  /**
   * Find all paths between two nodes (up to maxDepth)
   */
  findAllPaths(
    cpg: CodePropertyGraph,
    sourceNodeId: string,
    targetNodeId: string,
    maxDepth: number = 10
  ): string[][] {
    const paths: string[][] = [];

    const dfs = (currentNodeId: string, path: string[], depth: number): void => {
      if (depth > maxDepth) {
        return;
      }

      if (currentNodeId === targetNodeId) {
        paths.push([...path]);
        return;
      }

      // Avoid cycles
      if (path.includes(currentNodeId)) {
        return;
      }

      const outgoingEdges = cpg.edges.filter(e => e.source === currentNodeId);
      outgoingEdges.forEach(edge => {
        dfs(edge.target, [...path, edge.target], depth + 1);
      });
    };

    dfs(sourceNodeId, [sourceNodeId], 0);
    return paths;
  }

  /**
   * Find all callers of a function (nodes that call this function)
   */
  findAllCallers(cpg: CodePropertyGraph, functionNodeId: string): string[] {
    const callers: string[] = [];
    
    // Find all edges of type 'call' that target this function
    cpg.edges.forEach(edge => {
      if (edge.type === 'call' && edge.target === functionNodeId) {
        callers.push(edge.source);
      }
    });

    return callers;
  }

  /**
   * Find all callees of a function (functions called by this function)
   */
  findAllCallees(cpg: CodePropertyGraph, functionNodeId: string): string[] {
    const callees: string[] = [];
    
    // Find all edges of type 'call' that originate from this function
    cpg.edges.forEach(edge => {
      if (edge.type === 'call' && edge.source === functionNodeId) {
        callees.push(edge.target);
      }
    });

    return callees;
  }

  /**
   * Find all nodes that use a variable (data-flow analysis)
   */
  findVariableUsages(cpg: CodePropertyGraph, variableNodeId: string): string[] {
    const usages: string[] = [];
    
    // Find all data-flow edges that target this variable
    cpg.edges.forEach(edge => {
      if (edge.type === 'data-flow' && edge.target === variableNodeId) {
        usages.push(edge.source);
      }
    });

    return usages;
  }

  /**
   * Find all nodes that define a variable (data-flow analysis)
   */
  findVariableDefinitions(cpg: CodePropertyGraph, variableNodeId: string): string[] {
    const definitions: string[] = [];
    
    // Find all data-flow edges that originate from this variable
    cpg.edges.forEach(edge => {
      if (edge.type === 'data-flow' && edge.source === variableNodeId) {
        definitions.push(edge.target);
      }
    });

    return definitions;
  }
}

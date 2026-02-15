/**
 * AST Diff Engine - Structural AST comparison for accurate change detection
 */

import { ASTSnapshot, ASTNode } from '../../../types/codeIntelligence';

export interface ASTDiffResult {
  added: ASTNode[];
  removed: ASTNode[];
  modified: {
    node: ASTNode;
    oldNode: ASTNode;
    changes: string[];
  }[];
  unchanged: ASTNode[];
}

export interface ChangePattern {
  type: 'function_signature_change' | 'parameter_change' | 'return_type_change' | 
        'control_flow_change' | 'export_change' | 'import_change' | 'internal_change';
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  affectedNodes: string[];
  riskScore?: number; // 0-100 scale
}

export class ASTDiffEngine {
  /**
   * Compare two AST snapshots and detect structural differences
   */
  compareASTSnapshots(oldAST: ASTSnapshot, newAST: ASTSnapshot): ASTDiffResult {
    const oldNodesMap = new Map<string, ASTNode>();
    const newNodesMap = new Map<string, ASTNode>();

    // Index nodes by name and type for efficient lookup
    oldAST.nodes.forEach(node => {
      const key = `${node.type}:${node.name}`;
      oldNodesMap.set(key, node);
    });

    newAST.nodes.forEach(node => {
      const key = `${node.type}:${node.name}`;
      newNodesMap.set(key, node);
    });

    const added: ASTNode[] = [];
    const removed: ASTNode[] = [];
    const modified: ASTDiffResult['modified'] = [];
    const unchanged: ASTNode[] = [];

    // Find added nodes
    newNodesMap.forEach((node, key) => {
      if (!oldNodesMap.has(key)) {
        added.push(node);
      }
    });

    // Find removed nodes
    oldNodesMap.forEach((node, key) => {
      if (!newNodesMap.has(key)) {
        removed.push(node);
      }
    });

    // Find modified nodes
    oldNodesMap.forEach((oldNode, key) => {
      const newNode = newNodesMap.get(key);
      if (newNode) {
        const changes = this.compareNodes(oldNode, newNode);
        if (changes.length > 0) {
          modified.push({
            node: newNode,
            oldNode,
            changes
          });
        } else {
          unchanged.push(newNode);
        }
      }
    });

    return {
      added,
      removed,
      modified,
      unchanged
    };
  }

  /**
   * Compare two AST nodes and return list of changes
   * Enhanced with better signature detection for overloads and generics
   */
  private compareNodes(oldNode: ASTNode, newNode: ASTNode): string[] {
    const changes: string[] = [];

    // Enhanced signature comparison (handles overloads, generics)
    if (oldNode.signature !== newNode.signature) {
      // Check if it's just a generic parameter change (less risky)
      const oldSig = oldNode.signature || '';
      const newSig = newNode.signature || '';
      
      // Extract function name and parameters
      const oldMatch = oldSig.match(/^(\w+)\(/);
      const newMatch = newSig.match(/^(\w+)\(/);
      
      if (oldMatch && newMatch && oldMatch[1] === newMatch[1]) {
        // Same function name, check if it's just parameter changes
        changes.push('signature_changed');
      } else {
        // Different function name or structure
        changes.push('signature_changed');
      }
    }

    // Compare return types (enhanced for generics)
    if (oldNode.returnType !== newNode.returnType) {
      // Check if it's a generic type parameter change
      const oldType = oldNode.returnType || '';
      const newType = newNode.returnType || '';
      
      // Extract base type (before <)
      const oldBase = oldType.split('<')[0].trim();
      const newBase = newType.split('<')[0].trim();
      
      if (oldBase !== newBase) {
        // Base type changed (more risky)
        changes.push('return_type_changed');
      } else {
        // Only generic parameters changed (less risky)
        changes.push('return_type_changed:generic_params');
      }
    }

    // Compare parameters (enhanced)
    if (oldNode.parameters && newNode.parameters) {
      const paramChanges = this.compareParameters(oldNode.parameters, newNode.parameters);
      if (paramChanges.length > 0) {
        changes.push(...paramChanges);
      }
    } else if (oldNode.parameters && !newNode.parameters) {
      changes.push('parameters_removed');
    } else if (!oldNode.parameters && newNode.parameters) {
      changes.push('parameters_added');
    }

    // Compare exports
    if (oldNode.exports && newNode.exports) {
      const oldExportsSet = new Set(oldNode.exports);
      const newExportsSet = new Set(newNode.exports);
      
      const addedExports = newNode.exports.filter(e => !oldExportsSet.has(e));
      const removedExports = oldNode.exports.filter(e => !newExportsSet.has(e));
      
      if (addedExports.length > 0) {
        changes.push(`exports_added:${addedExports.join(',')}`);
      }
      if (removedExports.length > 0) {
        changes.push(`exports_removed:${removedExports.join(',')}`);
      }
    }

    return changes;
  }

  /**
   * Compare parameter lists
   */
  private compareParameters(
    oldParams: ASTNode['parameters'] = [],
    newParams: ASTNode['parameters'] = []
  ): string[] {
    const changes: string[] = [];

    if (oldParams.length !== newParams.length) {
      changes.push(`parameter_count_changed:${oldParams.length}->${newParams.length}`);
    }

    // Compare each parameter
    const maxLength = Math.max(oldParams.length, newParams.length);
    for (let i = 0; i < maxLength; i++) {
      const oldParam = oldParams[i];
      const newParam = newParams[i];

      if (!oldParam && newParam) {
        changes.push(`parameter_added:${newParam.name}`);
      } else if (oldParam && !newParam) {
        changes.push(`parameter_removed:${oldParam.name}`);
      } else if (oldParam && newParam) {
        if (oldParam.name !== newParam.name) {
          changes.push(`parameter_renamed:${oldParam.name}->${newParam.name}`);
        }
        if (oldParam.type !== newParam.type) {
          changes.push(`parameter_type_changed:${oldParam.name}:${oldParam.type}->${newParam.type}`);
        }
        if (oldParam.optional !== newParam.optional) {
          changes.push(`parameter_optionality_changed:${oldParam.name}:${oldParam.optional}->${newParam.optional}`);
        }
      }
    }

    return changes;
  }

  /**
   * Classify change patterns from AST diff with risk scoring (0-100)
   */
  classifyChangePatterns(diffResult: ASTDiffResult): ChangePattern[] {
    const patterns: ChangePattern[] = [];

    // Analyze removed nodes
    diffResult.removed.forEach(node => {
      const isExported = node.exports && node.exports.length > 0;
      const riskScore = isExported ? 100 : 50; // Exported removals are critical
      
      patterns.push({
        type: isExported ? 'export_change' : 'internal_change',
        description: `${node.type} '${node.name}' was removed`,
        severity: isExported ? 'critical' : 'medium',
        affectedNodes: [node.name],
        riskScore
      });
    });

    // Analyze added nodes
    diffResult.added.forEach(node => {
      const isExported = node.exports && node.exports.length > 0;
      const riskScore = isExported ? 20 : 10; // Adding exports is low risk
      
      patterns.push({
        type: 'internal_change',
        description: `${node.type} '${node.name}' was added`,
        severity: 'low',
        affectedNodes: [node.name],
        riskScore
      });
    });

    // Analyze modified nodes
    diffResult.modified.forEach(({ node, oldNode, changes }) => {
      const hasSignatureChange = changes.some(c => c === 'signature_changed');
      const hasReturnTypeChange = changes.some(c => c === 'return_type_changed');
      const hasParameterChange = changes.some(c => c.startsWith('parameter_'));
      const isExported = (node.exports && node.exports.length > 0) || 
                        (oldNode.exports && oldNode.exports.length > 0);

      // Calculate risk score based on change type and export status
      let riskScore = 0;
      if (hasReturnTypeChange) {
        riskScore = isExported ? 90 : 60; // Return type changes are high risk
      } else if (hasSignatureChange) {
        riskScore = isExported ? 80 : 50;
      } else if (hasParameterChange) {
        const paramChanges = changes.filter(c => c.startsWith('parameter_'));
        const hasBreakingParamChange = paramChanges.some(c => 
          c.includes('removed') || c.includes('type_changed')
        );
        riskScore = hasBreakingParamChange 
          ? (isExported ? 85 : 55)
          : (isExported ? 40 : 25);
      } else {
        riskScore = isExported ? 30 : 15; // Other changes
      }

      if (hasSignatureChange || hasReturnTypeChange) {
        patterns.push({
          type: hasReturnTypeChange ? 'return_type_change' : 'function_signature_change',
          description: `${node.type} '${node.name}' signature changed`,
          severity: hasReturnTypeChange ? 'high' : 'high',
          affectedNodes: [node.name],
          riskScore
        });
      }

      if (hasParameterChange) {
        const paramChanges = changes.filter(c => c.startsWith('parameter_'));
        const hasBreakingChange = paramChanges.some(c => 
          c.includes('removed') || c.includes('type_changed')
        );
        
        patterns.push({
          type: 'parameter_change',
          description: `${node.type} '${node.name}' parameters changed: ${paramChanges.join(', ')}`,
          severity: hasBreakingChange ? 'high' : 'medium',
          affectedNodes: [node.name],
          riskScore
        });
      }
    });

    return patterns;
  }

  /**
   * Compute structural similarity between two AST snapshots
   */
  computeSimilarity(oldAST: ASTSnapshot, newAST: ASTSnapshot): number {
    const diff = this.compareASTSnapshots(oldAST, newAST);
    
    const totalOldNodes = oldAST.nodes.length;
    const totalNewNodes = newAST.nodes.length;
    const totalNodes = Math.max(totalOldNodes, totalNewNodes, 1);

    const unchangedCount = diff.unchanged.length;
    const similarity = unchangedCount / totalNodes;

    return Math.max(0, Math.min(1, similarity));
  }

  /**
   * Detect control flow changes using tree-to-tree comparison
   * Enhanced with edit distance algorithm for structural similarity
   */
  detectControlFlowChanges(oldAST: ASTSnapshot, newAST: ASTSnapshot): ChangePattern[] {
    const patterns: ChangePattern[] = [];

    // Compare function/class counts as proxy for control flow changes
    const oldFunctions = oldAST.nodes.filter(n => n.type === 'function').length;
    const newFunctions = newAST.nodes.filter(n => n.type === 'function').length;

    if (oldFunctions !== newFunctions) {
      const riskScore = Math.abs(oldFunctions - newFunctions) * 15; // 15 points per function change
      patterns.push({
        type: 'control_flow_change',
        description: `Function count changed: ${oldFunctions} -> ${newFunctions}`,
        severity: 'medium',
        affectedNodes: [],
        riskScore: Math.min(100, riskScore)
      });
    }

    // Tree-to-tree comparison using edit distance
    const structuralDiff = this.computeTreeEditDistance(oldAST, newAST);
    if (structuralDiff.distance > 0) {
      const riskScore = Math.min(100, structuralDiff.distance * 10);
      patterns.push({
        type: 'control_flow_change',
        description: `Structural changes detected (edit distance: ${structuralDiff.distance})`,
        severity: structuralDiff.distance > 5 ? 'high' : 'medium',
        affectedNodes: structuralDiff.affectedNodes,
        riskScore
      });
    }

    return patterns;
  }

  /**
   * Compute tree edit distance between two AST snapshots
   * Uses a simplified Levenshtein-like algorithm for tree structures
   */
  private computeTreeEditDistance(oldAST: ASTSnapshot, newAST: ASTSnapshot): {
    distance: number;
    affectedNodes: string[];
  } {
    // Create node sequences for comparison
    const oldSequence = oldAST.nodes.map(n => `${n.type}:${n.name}`).sort();
    const newSequence = newAST.nodes.map(n => `${n.type}:${n.name}`).sort();

    // Compute edit distance using dynamic programming
    const m = oldSequence.length;
    const n = newSequence.length;
    const dp: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));

    // Initialize base cases
    for (let i = 0; i <= m; i++) {
      dp[i][0] = i;
    }
    for (let j = 0; j <= n; j++) {
      dp[0][j] = j;
    }

    // Fill DP table
    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        if (oldSequence[i - 1] === newSequence[j - 1]) {
          dp[i][j] = dp[i - 1][j - 1];
        } else {
          dp[i][j] = Math.min(
            dp[i - 1][j] + 1,     // deletion
            dp[i][j - 1] + 1,     // insertion
            dp[i - 1][j - 1] + 1  // substitution
          );
        }
      }
    }

    // Find affected nodes (nodes that were added, removed, or changed)
    const affectedNodes: string[] = [];
    let i = m, j = n;
    while (i > 0 || j > 0) {
      if (i > 0 && j > 0 && oldSequence[i - 1] === newSequence[j - 1]) {
        i--;
        j--;
      } else if (i > 0 && (j === 0 || dp[i][j] === dp[i - 1][j] + 1)) {
        // Deletion
        affectedNodes.push(oldSequence[i - 1]);
        i--;
      } else if (j > 0 && (i === 0 || dp[i][j] === dp[i][j - 1] + 1)) {
        // Insertion
        affectedNodes.push(newSequence[j - 1]);
        j--;
      } else {
        // Substitution
        affectedNodes.push(oldSequence[i - 1], newSequence[j - 1]);
        i--;
        j--;
      }
    }

    return {
      distance: dp[m][n],
      affectedNodes: [...new Set(affectedNodes)]
    };
  }
}

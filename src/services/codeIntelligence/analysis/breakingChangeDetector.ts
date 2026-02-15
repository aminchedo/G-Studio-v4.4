/**
 * Breaking Change Detector - Detects breaking changes between snapshots
 */

import { ChangeReport, ChangeDetail, Snapshot, ASTSnapshot, ASTNode } from '../../../types/codeIntelligence';
import { ASTDiffEngine } from '../ast/astDiff';
import { CPGAnalyzer } from '../cpg/cpgAnalyzer';
import { CodePropertyGraph } from '../../../types/codeIntelligence';

export class BreakingChangeDetector {
  private astDiffEngine: ASTDiffEngine;
  private cpgAnalyzer: CPGAnalyzer;

  constructor() {
    this.astDiffEngine = new ASTDiffEngine();
    this.cpgAnalyzer = new CPGAnalyzer();
  }
  /**
   * Detect breaking changes between two snapshots
   */
  detectBreakingChanges(oldSnapshot: Snapshot, newSnapshot: Snapshot): ChangeReport[] {
    const reports: ChangeReport[] = [];

    // Compare files
    const oldFiles = new Set(Object.keys(oldSnapshot.files));
    const newFiles = new Set(Object.keys(newSnapshot.files));

    // Check for removed files
    oldFiles.forEach(filePath => {
      if (!newFiles.has(filePath)) {
        reports.push(this.createRemovedFileReport(filePath, oldSnapshot));
      }
    });

    // Check for added files (SAFE)
    newFiles.forEach(filePath => {
      if (!oldFiles.has(filePath)) {
        reports.push(this.createAddedFileReport(filePath));
      }
    });

    // Check for modified files
    oldFiles.forEach(filePath => {
      if (newFiles.has(filePath)) {
        const oldHash = oldSnapshot.files[filePath]?.hash;
        const newHash = newSnapshot.files[filePath]?.hash;
        
        if (oldHash !== newHash) {
          const report = this.compareFileAST(
            filePath,
            oldSnapshot.astSnapshots[filePath],
            newSnapshot.astSnapshots[filePath]
          );
          if (report) {
            reports.push(report);
          }
        }
      }
    });

    return reports;
  }

  /**
   * Compare AST snapshots of a file using AST diff engine
   */
  private compareFileAST(
    filePath: string,
    oldAST: ASTSnapshot | undefined,
    newAST: ASTSnapshot | undefined
  ): ChangeReport | null {
    if (!oldAST || !newAST) {
      return null;
    }

    // Use AST diff engine for structural comparison
    const diffResult = this.astDiffEngine.compareASTSnapshots(oldAST, newAST);
    const changePatterns = this.astDiffEngine.classifyChangePatterns(diffResult);
    
    // Detect control flow changes (semantic change detection)
    const controlFlowPatterns = this.astDiffEngine.detectControlFlowChanges(oldAST, newAST);
    changePatterns.push(...controlFlowPatterns);

    const changes: ChangeDetail[] = [];
    let riskLevel: ChangeReport['riskLevel'] = 'SAFE';
    let maxRiskScore = 0;
    let impactScore = 0;

    // Calculate impact score based on export visibility
    const exportedSymbols = new Set([
      ...oldAST.exports.map(e => e.name),
      ...newAST.exports.map(e => e.name)
    ]);

    // Use change patterns from AST diff
    changePatterns.forEach(pattern => {
      // Calculate risk level from risk score
      if (pattern.riskScore !== undefined) {
        maxRiskScore = Math.max(maxRiskScore, pattern.riskScore);
        
        // Adjust risk score based on export visibility
        const isExported = pattern.affectedNodes.some(name => exportedSymbols.has(name));
        const adjustedScore = isExported ? pattern.riskScore : pattern.riskScore * 0.7;
        maxRiskScore = Math.max(maxRiskScore, adjustedScore);
        
        if (maxRiskScore >= 80) {
          riskLevel = 'BREAKING';
        } else if (maxRiskScore >= 50 && riskLevel !== 'BREAKING') {
          riskLevel = 'RISKY';
        }
        
        // Calculate impact score (how many symbols affected)
        impactScore += pattern.affectedNodes.length * (pattern.riskScore / 100);
      } else {
        // Fallback to severity
        if (pattern.type === 'export_change' || pattern.type === 'return_type_change') {
          riskLevel = 'BREAKING';
          maxRiskScore = 100;
        } else if (pattern.type === 'function_signature_change' || pattern.type === 'parameter_change') {
          // Check if exported
          const isExported = oldAST.exports.some(e => pattern.affectedNodes.includes(e.name));
          if (isExported) {
            riskLevel = pattern.severity === 'high' ? 'BREAKING' : 'RISKY';
            maxRiskScore = pattern.severity === 'high' ? 90 : 60;
          }
        }
      }

      // Convert pattern to ChangeDetail with semantic information
      const changeDetail: ChangeDetail = {
        type: this.mapPatternTypeToChangeType(pattern.type),
        description: pattern.description,
        affectedSymbols: pattern.affectedNodes
      };

      // Add semantic change detection
      if (pattern.type === 'control_flow_change') {
        changeDetail.description += ' (behavioral change detected)';
      }

      changes.push(changeDetail);
    });

    // Also check exports directly
    const oldExports = new Map(oldAST.exports.map(e => [e.name, e]));
    const newExports = new Map(newAST.exports.map(e => [e.name, e]));

    oldExports.forEach((oldExport, name) => {
      if (!newExports.has(name)) {
        changes.push({
          type: 'export_removed',
          description: `Export '${name}' was removed`,
          affectedSymbols: [name]
        });
        riskLevel = 'BREAKING';
        maxRiskScore = 100;
        impactScore += 10; // High impact for removed exports
      }
    });

    // Add impact score to change details
    if (impactScore > 0 && changes.length > 0) {
      changes[0].description += ` [Impact Score: ${impactScore.toFixed(1)}]`;
    }

    if (changes.length === 0) {
      return null;
    }

    return {
      filePath,
      changeType: 'modified',
      riskLevel,
      changes,
      timestamp: Date.now()
    };
  }

  /**
   * Compare function/class signatures
   */
  private compareSignatures(oldNode: ASTNode, newNode: ASTNode): ChangeDetail | null {
    if (oldNode.type !== newNode.type) {
      return {
        type: 'type_changed',
        description: `Type changed from ${oldNode.type} to ${newNode.type}`,
        before: oldNode.signature,
        after: newNode.signature,
        affectedSymbols: [oldNode.name]
      };
    }

    // Compare parameters
    if (oldNode.parameters && newNode.parameters) {
      const paramChanges = this.compareParameters(oldNode.parameters, newNode.parameters);
      if (paramChanges) {
        return paramChanges;
      }
    }

    // Compare return types
    if (oldNode.returnType !== newNode.returnType) {
      return {
        type: 'return_type_changed',
        description: `Return type changed from '${oldNode.returnType}' to '${newNode.returnType}'`,
        before: oldNode.returnType,
        after: newNode.returnType,
        affectedSymbols: [oldNode.name]
      };
    }

    return null;
  }

  /**
   * Compare parameter lists
   */
  private compareParameters(
    oldParams: ASTNode['parameters'] = [],
    newParams: ASTNode['parameters'] = []
  ): ChangeDetail | null {
    // Check for removed required parameters (BREAKING)
    for (let i = 0; i < oldParams.length; i++) {
      const oldParam = oldParams[i];
      const newParam = newParams[i];

      if (!newParam) {
        if (!oldParam.optional) {
          return {
            type: 'parameter_changed',
            description: `Required parameter '${oldParam.name}' was removed`,
            before: oldParam.name,
            affectedSymbols: [oldParam.name]
          };
        }
      } else {
        // Parameter name or type changed
        if (oldParam.name !== newParam.name || oldParam.type !== newParam.type) {
          // If it's not optional, it's breaking
          if (!oldParam.optional && !newParam.optional) {
            return {
              type: 'parameter_changed',
              description: `Parameter '${oldParam.name}' changed to '${newParam.name}' or type changed`,
              before: `${oldParam.name}: ${oldParam.type}`,
              after: `${newParam.name}: ${newParam.type}`,
              affectedSymbols: [oldParam.name, newParam.name]
            };
          }
        }
      }
    }

    // New required parameters added (RISKY if exported)
    for (let i = oldParams.length; i < newParams.length; i++) {
      const newParam = newParams[i];
      if (!newParam.optional) {
        return {
          type: 'parameter_changed',
          description: `New required parameter '${newParam.name}' was added`,
          after: `${newParam.name}: ${newParam.type}`,
          affectedSymbols: [newParam.name]
        };
      }
    }

    return null;
  }

  /**
   * Create report for removed file
   */
  private createRemovedFileReport(filePath: string, snapshot: Snapshot): ChangeReport {
    const ast = snapshot.astSnapshots[filePath];
    const exportedSymbols = ast?.exports.map(e => e.name) || [];

    return {
      filePath,
      changeType: 'removed',
      riskLevel: exportedSymbols.length > 0 ? 'BREAKING' : 'RISKY',
      changes: [{
        type: 'export_removed',
        description: `File was removed${exportedSymbols.length > 0 ? ` with ${exportedSymbols.length} exported symbol(s)` : ''}`,
        affectedSymbols: exportedSymbols
      }],
      timestamp: Date.now()
    };
  }

  /**
   * Create report for added file
   */
  private createAddedFileReport(filePath: string): ChangeReport {
    return {
      filePath,
      changeType: 'added',
      riskLevel: 'SAFE',
      changes: [{
        type: 'internal_change',
        description: 'New file added'
      }],
      timestamp: Date.now()
    };
  }

  /**
   * Map pattern type to change detail type
   */
  private mapPatternTypeToChangeType(patternType: string): ChangeDetail['type'] {
    switch (patternType) {
      case 'function_signature_change':
        return 'signature_changed';
      case 'parameter_change':
        return 'parameter_changed';
      case 'return_type_change':
        return 'return_type_changed';
      case 'export_change':
        return 'export_removed';
      default:
        return 'internal_change';
    }
  }

  /**
   * Enhanced breaking change detection with CPG impact analysis
   */
  detectBreakingChangesWithImpact(
    oldSnapshot: Snapshot,
    newSnapshot: Snapshot,
    cpg?: CodePropertyGraph
  ): ChangeReport[] {
    const basicReports = this.detectBreakingChanges(oldSnapshot, newSnapshot);

    // If CPG is available, enhance reports with impact analysis
    if (cpg) {
      return basicReports.map(report => {
        if (report.riskLevel === 'BREAKING' || report.riskLevel === 'RISKY') {
          // Find affected nodes in CPG
          const fileNodes = cpg.fileNodes[report.filePath] || [];
          if (fileNodes.length > 0) {
            const impact = this.cpgAnalyzer.analyzeImpact(cpg, fileNodes);
            // Enhance report with impact information
            return {
              ...report,
              changes: report.changes.map(change => ({
                ...change,
                description: `${change.description} (Impact: ${impact.affectedFiles.length} files, ${impact.impactScore.toFixed(2)} score)`
              }))
            };
          }
        }
        return report;
      });
    }

    return basicReports;
  }
}

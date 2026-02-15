/**
 * Diagnostics - Display inline warnings and suggestions
 */

import * as vscode from 'vscode';
import { IPCClient } from './ipc';

export class Diagnostics {
  private diagnosticCollection: vscode.DiagnosticCollection;
  private ipcClient: IPCClient;

  constructor(private context: vscode.ExtensionContext) {
    this.diagnosticCollection = vscode.languages.createDiagnosticCollection('codeIntelligence');
    this.ipcClient = new IPCClient();
  }

  /**
   * Update diagnostics for a file based on analysis results
   * Enhanced with inline diagnostics and code lens support
   */
  async updateDiagnostics(uri: vscode.Uri, analysisResults: any): Promise<void> {
    const diagnostics: vscode.Diagnostic[] = [];

    // Convert analysis results to VS Code diagnostics
    if (analysisResults.breakingChanges) {
      analysisResults.breakingChanges.forEach((change: any) => {
        if (change.riskLevel === 'BREAKING' || change.riskLevel === 'RISKY') {
          // Try to get actual location from change details
          let range = new vscode.Range(0, 0, 0, 0);
          if (change.changes && change.changes.length > 0) {
            // Use first change location if available
            const firstChange = change.changes[0];
            if (firstChange.location) {
              const line = (firstChange.location.line || 1) - 1;
              range = new vscode.Range(line, 0, line, 100);
            }
          }

          const diagnostic = new vscode.Diagnostic(
            range,
            `Breaking change: ${change.description || 'Change detected'}`,
            change.riskLevel === 'BREAKING' 
              ? vscode.DiagnosticSeverity.Error 
              : vscode.DiagnosticSeverity.Warning
          );
          diagnostic.source = 'Code Intelligence';
          diagnostic.code = change.riskLevel;
          diagnostics.push(diagnostic);
        }
      });
    }

    // Add impact analysis diagnostics
    if (analysisResults.impact) {
      const impact = analysisResults.impact;
      if (impact.impactScore > 0.5) {
        const diagnostic = new vscode.Diagnostic(
          new vscode.Range(0, 0, 0, 0),
          `High impact change: ${(impact.impactScore * 100).toFixed(1)}% of codebase affected`,
          vscode.DiagnosticSeverity.Information
        );
        diagnostic.source = 'Code Intelligence';
        diagnostic.code = 'high-impact';
        diagnostics.push(diagnostic);
      }
    }

    this.diagnosticCollection.set(uri, diagnostics);
  }

  /**
   * Register code lens provider for impact analysis
   */
  registerCodeLensProvider(context: vscode.ExtensionContext): void {
    const codeLensProvider = vscode.languages.registerCodeLensProvider(
      { scheme: 'file', language: 'typescript' },
      {
        provideCodeLenses: async (document) => {
          try {
            const analysis = await this.ipcClient.getAnalysis(document.fileName);
            if (analysis && analysis.impact) {
              const impact = analysis.impact;
              return [
                new vscode.CodeLens(new vscode.Range(0, 0, 0, 0), {
                  title: `Impact: ${(impact.impactScore * 100).toFixed(1)}% | ${impact.affectedFiles.length} files`,
                  command: 'codeIntelligence.showImpact',
                  arguments: [document.fileName]
                })
              ];
            }
          } catch (error) {
            // Silently fail
          }
          return [];
        }
      }
    );

    context.subscriptions.push(codeLensProvider);
  }

  /**
   * Clear diagnostics for a file
   */
  clearDiagnostics(uri: vscode.Uri): void {
    this.diagnosticCollection.delete(uri);
  }

  /**
   * Clear all diagnostics
   */
  clearAll(): void {
    this.diagnosticCollection.clear();
  }

  dispose(): void {
    this.diagnosticCollection.dispose();
  }
}

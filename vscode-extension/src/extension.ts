/**
 * VS Code Extension - Main entry point
 */

import * as vscode from 'vscode';
import { FileWatcher } from './fileWatcher';
import { StatusBar } from './statusBar';
import { Diagnostics } from './diagnostics';

let fileWatcher: FileWatcher | null = null;
let statusBar: StatusBar | null = null;
let diagnostics: Diagnostics | null = null;

export function activate(context: vscode.ExtensionContext) {
  console.log('G Studio Code Intelligence extension is now active');

  // Detect workspace folder
  const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
  if (!workspaceFolder) {
    vscode.window.showWarningMessage('Code Intelligence: No workspace folder found');
    return;
  }

  // Initialize components
  fileWatcher = new FileWatcher(context);
  statusBar = new StatusBar(context);
  diagnostics = new Diagnostics(context);

  // Register commands
  const showStatusCommand = vscode.commands.registerCommand('codeIntelligence.showStatus', () => {
    vscode.window.showInformationMessage('Code Intelligence: Monitoring active');
    // Could open dashboard here if available
  });

  const analyzeCommand = vscode.commands.registerCommand('codeIntelligence.analyze', async () => {
    const activeEditor = vscode.window.activeTextEditor;
    if (activeEditor) {
      const filePath = activeEditor.document.fileName;
      statusBar.updateStatus('analyzing');
      
      try {
        // Trigger analysis via IPC
        const ipcClient = (fileWatcher as any).ipcClient;
        if (ipcClient) {
          const analysis = await ipcClient.getAnalysis(filePath);
          if (analysis) {
            // Update diagnostics
            await diagnostics.updateDiagnostics(activeEditor.document.uri, analysis);
            statusBar.updateStatus('active');
            vscode.window.showInformationMessage(`Analysis complete for: ${filePath}`);
          }
        }
      } catch (error) {
        statusBar.updateStatus('error');
        vscode.window.showErrorMessage(`Analysis failed: ${error}`);
      }
    } else {
      vscode.window.showWarningMessage('No active editor');
    }
  });

  const analyzeWorkspaceCommand = vscode.commands.registerCommand('codeIntelligence.analyzeWorkspace', async () => {
    statusBar.updateStatus('analyzing');
    vscode.window.showInformationMessage('Analyzing entire workspace...');
    // Trigger full workspace analysis
    // This would call the REST API to trigger full analysis
  });

  const showBreakingChangesCommand = vscode.commands.registerCommand('codeIntelligence.showBreakingChanges', async () => {
    try {
      const ipcClient = (fileWatcher as any).ipcClient;
      if (ipcClient) {
        const breakingChanges = await ipcClient.getBreakingChanges();
        if (breakingChanges && breakingChanges.changes) {
          const count = breakingChanges.changes.length;
          vscode.window.showInformationMessage(
            `Found ${count} breaking change(s). Check Problems panel for details.`
          );
        }
      }
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to get breaking changes: ${error}`);
    }
  });

  context.subscriptions.push(
    showStatusCommand,
    analyzeCommand,
    analyzeWorkspaceCommand,
    showBreakingChangesCommand
  );

  // Start file watching
  fileWatcher.start();
  statusBar.show();
  statusBar.updateStatus('active');

  // Setup hover provider for dependency information
  const hoverProvider = vscode.languages.registerHoverProvider(
    { scheme: 'file', language: 'typescript' },
    {
      provideHover: async (document, position) => {
        try {
          const ipcClient = (fileWatcher as any).ipcClient;
          if (ipcClient) {
            const analysis = await ipcClient.getAnalysis(document.fileName);
            if (analysis && analysis.metadata) {
              // Show dependency information on hover
              const hoverText = new vscode.MarkdownString();
              hoverText.appendMarkdown(`**Code Intelligence**\n\n`);
              hoverText.appendMarkdown(`File: ${analysis.metadata.path}\n`);
              hoverText.appendMarkdown(`Lines: ${analysis.metadata.lines}\n`);
              return new vscode.Hover(hoverText);
            }
          }
        } catch (error) {
          // Silently fail
        }
        return null;
      }
    }
  );

  context.subscriptions.push(hoverProvider);
}

export function deactivate() {
  if (fileWatcher) {
    fileWatcher.stop();
  }
  if (statusBar) {
    statusBar.dispose();
  }
  if (diagnostics) {
    diagnostics.dispose();
  }
}

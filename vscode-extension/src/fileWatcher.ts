/**
 * File Watcher - Monitors file saves and triggers analysis
 */

import * as vscode from 'vscode';
import { IPCClient } from './ipc';

export class FileWatcher {
  private disposables: vscode.Disposable[] = [];
  private ipcClient: IPCClient;

  constructor(private context: vscode.ExtensionContext) {
    this.ipcClient = new IPCClient();
  }

  start(): void {
    // Listen to file save events
    const onDidSaveTextDocument = vscode.workspace.onDidSaveTextDocument(
      async (document: vscode.TextDocument) => {
        // Only process TypeScript/JavaScript files
        if (this.isTargetFile(document)) {
          await this.handleFileSave(document);
        }
      }
    );

    // Listen to file changes
    const onDidChangeTextDocument = vscode.workspace.onDidChangeTextDocument(
      async (event: vscode.TextDocumentChangeEvent) => {
        if (this.isTargetFile(event.document)) {
          // Debounce changes
          this.debounceFileChange(event.document);
        }
      }
    );

    this.disposables.push(onDidSaveTextDocument, onDidChangeTextDocument);
  }

  stop(): void {
    this.disposables.forEach(d => d.dispose());
    this.disposables = [];
  }

  private isTargetFile(document: vscode.TextDocument): boolean {
    const ext = document.fileName.split('.').pop()?.toLowerCase();
    return ['ts', 'tsx', 'js', 'jsx'].includes(ext || '');
  }

  private async handleFileSave(document: vscode.TextDocument): Promise<void> {
    try {
      const filePath = document.fileName;
      
      // Send file change event to analysis backend
      await this.ipcClient.notifyFileChange(filePath, document.getText());

      console.log(`[FileWatcher] File saved: ${filePath}`);
    } catch (error) {
      console.error('[FileWatcher] Error handling file save:', error);
    }
  }

  private changeTimeouts = new Map<string, NodeJS.Timeout>();

  private debounceFileChange(document: vscode.TextDocument): void {
    const filePath = document.fileName;

    // Clear existing timeout
    const existingTimeout = this.changeTimeouts.get(filePath);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    // Set new timeout (debounce 2 seconds)
    const timeout = setTimeout(async () => {
      await this.handleFileChange(document);
      this.changeTimeouts.delete(filePath);
    }, 2000);

    this.changeTimeouts.set(filePath, timeout);
  }

  private async handleFileChange(document: vscode.TextDocument): Promise<void> {
    // Handle incremental changes (optional - can be disabled for performance)
    // This is just for tracking, not for immediate analysis
  }
}

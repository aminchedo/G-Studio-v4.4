/**
 * Status Bar - Shows code intelligence status in VS Code status bar
 */

import * as vscode from 'vscode';

export class StatusBar {
  private statusBarItem: vscode.StatusBarItem;

  constructor(private context: vscode.ExtensionContext) {
    this.statusBarItem = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Right,
      100
    );
    this.statusBarItem.command = 'codeIntelligence.showStatus';
    this.statusBarItem.tooltip = 'G Studio Code Intelligence';
  }

  show(): void {
    this.statusBarItem.text = '$(pulse) Code Intel';
    this.statusBarItem.show();
  }

  updateStatus(status: 'active' | 'analyzing' | 'error' | 'warning'): void {
    switch (status) {
      case 'active':
        this.statusBarItem.text = '$(check) Code Intel';
        this.statusBarItem.backgroundColor = undefined;
        this.statusBarItem.color = undefined;
        break;
      case 'analyzing':
        this.statusBarItem.text = '$(sync~spin) Analyzing...';
        this.statusBarItem.backgroundColor = undefined;
        this.statusBarItem.color = undefined;
        break;
      case 'warning':
        this.statusBarItem.text = '$(warning) Code Intel';
        this.statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
        break;
      case 'error':
        this.statusBarItem.text = '$(error) Code Intel';
        this.statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.errorBackground');
        break;
    }
  }

  /**
   * Update status with health indicator and breaking changes count
   */
  updateHealth(breakingChangesCount: number, riskLevel: 'safe' | 'risky' | 'breaking'): void {
    if (breakingChangesCount > 0) {
      this.statusBarItem.text = `$(alert) Code Intel (${breakingChangesCount})`;
      this.updateStatus(riskLevel === 'breaking' ? 'error' : 'warning');
    } else {
      this.statusBarItem.text = '$(check) Code Intel';
      this.updateStatus('active');
    }
    this.statusBarItem.show();
  }

  dispose(): void {
    this.statusBarItem.dispose();
  }
}

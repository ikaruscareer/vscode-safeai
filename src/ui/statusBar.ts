import * as vscode from 'vscode';
import { SafeAiScanResult, SafeAiSeverity, SEVERITY_LABELS } from '../safeai/types';

export class SafeAiStatusBar implements vscode.Disposable {
  private readonly item: vscode.StatusBarItem;
  private readonly disposables: vscode.Disposable[] = [];

  constructor() {
    this.item = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    this.item.command = 'safeai.scanWorkspace';
    this.item.tooltip = 'SafeAI: Click to scan workspace';
    this.setIdle();
    this.disposables.push(this.item);
  }

  setScanning(): void {
    this.item.text = '$(loading~spin) SafeAI';
    this.item.tooltip = 'SafeAI: Scanning...';
    this.item.color = undefined;
    this.item.show();
  }

  setResults(result: SafeAiScanResult): void {
    const parts: string[] = [];
    const { bySeverity } = result.summary;

    if (bySeverity.critical > 0) parts.push(`$(error) ${bySeverity.critical}`);
    if (bySeverity.high > 0) parts.push(`$(warning) ${bySeverity.high}`);
    if (bySeverity.medium > 0) parts.push(`$(alert) ${bySeverity.medium}`);
    if (bySeverity.low > 0) parts.push(`$(info) ${bySeverity.low}`);
    if (bySeverity.info > 0) parts.push(`$(lightbulb) ${bySeverity.info}`);

    if (parts.length === 0) {
      this.item.text = '$(check) SafeAI';
      this.item.tooltip = 'SafeAI: No findings';
      this.item.color = undefined;
    } else {
      this.item.text = `$(shield) SafeAI ${parts.join(' ')}`;
      this.item.tooltip = this.buildTooltip(result);
      this.item.color = bySeverity.critical > 0 || bySeverity.high > 0
        ? new vscode.ThemeColor('statusBarItem.warningForeground')
        : undefined;
    }

    this.item.show();
  }

  setError(message: string): void {
    this.item.text = '$(error) SafeAI';
    this.item.tooltip = `SafeAI: ${message}`;
    this.item.color = new vscode.ThemeColor('statusBarItem.errorForeground');
    this.item.show();
  }

  setIdle(): void {
    this.item.text = '$(shield) SafeAI';
    this.item.tooltip = 'SafeAI: Click to scan workspace';
    this.item.color = undefined;
    this.item.show();
  }

  dispose(): void {
    this.item.dispose();
    for (const d of this.disposables) d.dispose();
  }

  private buildTooltip(result: SafeAiScanResult): string {
    const lines = ['SafeAI Scan Results', ''];
    const { bySeverity } = result.summary;
    const severities: SafeAiSeverity[] = ['critical', 'high', 'medium', 'low', 'info'];
    for (const sev of severities) {
      if (bySeverity[sev] > 0) {
        lines.push(`${SEVERITY_LABELS[sev]}: ${bySeverity[sev]}`);
      }
    }
    if (result.summary.trustScore !== undefined) {
      lines.push('', `Trust Score: ${result.summary.trustScore}/100`);
    }
    lines.push('', `${result.summary.totalFindings} total finding(s)`);
    return lines.join('\n');
  }
}

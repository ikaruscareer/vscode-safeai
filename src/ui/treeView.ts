import * as path from 'node:path';
import * as vscode from 'vscode';
import { SafeAiFinding, SafeAiScanResult, SafeAiSeverity, SEVERITY_LABELS, SEVERITY_ORDER } from '../safeai/types';

type TreeNode = SeverityNode | FindingNode;

interface SeverityNode {
  type: 'severity';
  severity: SafeAiSeverity;
  count: number;
}

interface FindingNode {
  type: 'finding';
  finding: SafeAiFinding;
  label: string;
}

export class SafeAiTreeDataProvider implements vscode.TreeDataProvider<TreeNode>, vscode.Disposable {
  private readonly emitter = new vscode.EventEmitter<TreeNode | TreeNode | undefined | void>();
  readonly onDidChangeTreeData = this.emitter.event;

  private result: SafeAiScanResult | undefined;
  private readonly disposables: vscode.Disposable[] = [];

  constructor() {
    this.disposables.push(this.emitter);
  }

  refresh(result?: SafeAiScanResult): void {
    this.result = result;
    this.emitter.fire();
  }

  getTreeItem(element: TreeNode): vscode.TreeItem {
    if (element.type === 'severity') {
      return this.buildSeverityItem(element);
    }
    return this.buildFindingItem(element);
  }

  getChildren(element?: TreeNode): TreeNode[] {
    if (!element) {
      return this.getRootNodes();
    }
    if (element.type === 'severity') {
      return this.getFindingNodes(element.severity);
    }
    return [];
  }

  getParent(element: TreeNode): TreeNode | undefined {
    if (element.type === 'finding') {
      return { type: 'severity', severity: element.finding.severity, count: 0 };
    }
    return undefined;
  }

  dispose(): void {
    this.emitter.dispose();
    for (const d of this.disposables) d.dispose();
  }

  private getRootNodes(): SeverityNode[] {
    if (!this.result) return [];
    const nodes: SeverityNode[] = [];
    const severities: SafeAiSeverity[] = ['critical', 'high', 'medium', 'low', 'info'];
    for (const sev of severities) {
      const count = this.result.summary.bySeverity[sev];
      if (count > 0) {
        nodes.push({ type: 'severity', severity: sev, count });
      }
    }
    return nodes;
  }

  private getFindingNodes(severity: SafeAiSeverity): FindingNode[] {
    if (!this.result) return [];
    return this.result.findings
      .filter(f => f.severity === severity)
      .sort((a, b) => (a.filePath ?? '').localeCompare(b.filePath ?? '') || (a.line ?? 0) - (b.line ?? 0))
      .map(f => ({
        type: 'finding' as const,
        finding: f,
        label: f.ruleId + ': ' + f.message,
      }));
  }

  private buildSeverityItem(node: SeverityNode): vscode.TreeItem {
    const item = new vscode.TreeItem(
      `${SEVERITY_LABELS[node.severity]} (${node.count})`,
      vscode.TreeItemCollapsibleState.Expanded
    );
    item.iconPath = new vscode.ThemeIcon(this.getSeverityIcon(node.severity));
    item.contextValue = 'severity';
    return item;
  }

  private buildFindingItem(node: FindingNode): vscode.TreeItem {
    const f = node.finding;
    const label = `${f.ruleId}: ${f.message}`;
    const item = new vscode.TreeItem(label, vscode.TreeItemCollapsibleState.None);

    const location = f.filePath ? `${f.filePath}${f.line ? `:${f.line}` : ''}` : 'unknown location';
    item.description = location;

    if (f.filePath && f.line) {
      const root = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath ?? '';
      const absolute = path.resolve(root, f.filePath);
      item.resourceUri = vscode.Uri.file(absolute);
      item.command = {
        command: 'vscode.open',
        title: 'Open Finding',
        arguments: [
          vscode.Uri.file(absolute),
          {
            selection: new vscode.Range(
              Math.max(0, (f.line ?? 1) - 1),
              Math.max(0, (f.column ?? 1) - 1),
              Math.max(0, (f.line ?? 1) - 1),
              Math.max(0, (f.column ?? 1))
            ),
          },
        ],
      };
    }

    item.iconPath = new vscode.ThemeIcon(this.getSeverityIcon(f.severity));
    item.contextValue = 'finding';
    return item;
  }

  private getSeverityIcon(severity: SafeAiSeverity): string {
    switch (severity) {
      case 'critical': return 'error';
      case 'high': return 'warning';
      case 'medium': return 'alert';
      case 'low': return 'info';
      case 'info': return 'lightbulb';
    }
  }
}

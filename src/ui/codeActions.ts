import * as vscode from 'vscode';
import { SafeAiFinding } from '../safeai/types';

export class SafeAiCodeActionProvider implements vscode.CodeActionProvider, vscode.Disposable {
  static readonly providedCodeActionKinds = [vscode.CodeActionKind.QuickFix];

  private findings: SafeAiFinding[] = [];
  private readonly disposables: vscode.Disposable[] = [];

  updateFindings(findings: SafeAiFinding[]): void {
    this.findings = findings;
  }

  provideCodeActions(
    document: vscode.TextDocument,
    range: vscode.Range | vscode.Selection,
    context: vscode.CodeActionContext,
    _token: vscode.CancellationToken
  ): vscode.CodeAction[] {
    const actions: vscode.CodeAction[] = [];

    const diagnostics = context.diagnostics.filter(d => d.source === 'SafeAI');
    for (const diagnostic of diagnostics) {
      const ruleId = typeof diagnostic.code === 'object' ? diagnostic.code.value : diagnostic.code;
      const finding = this.findings.find(f => f.ruleId === ruleId);
      if (!finding) continue;

      if (finding.remediation) {
        const action = new vscode.CodeAction(
          `SafeAI: ${finding.remediation}`,
          vscode.CodeActionKind.QuickFix
        );
        action.diagnostics = [diagnostic];
        action.isPreferred = true;

        action.command = {
          command: 'safeai.showRemediation',
          title: 'Show Remediation Details',
          arguments: [finding],
        };

        actions.push(action);
      }

      if (finding.documentationUrl) {
        const docAction = new vscode.CodeAction(
          `SafeAI: Open documentation for ${finding.ruleId}`,
          vscode.CodeActionKind.QuickFix
        );
        docAction.command = {
          command: 'vscode.open',
          title: 'Open Documentation',
          arguments: [vscode.Uri.parse(finding.documentationUrl)],
        };
        actions.push(docAction);
      }
    }

    return actions;
  }

  dispose(): void {
    for (const d of this.disposables) d.dispose();
  }
}

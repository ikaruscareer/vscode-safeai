import * as path from 'node:path';
import * as vscode from 'vscode';
import { SafeAiFinding, SafeAiSeverity } from '../safeai/types';

const SEVERITY_MAP: Record<SafeAiSeverity, vscode.DiagnosticSeverity> = {
  critical: vscode.DiagnosticSeverity.Error,
  high: vscode.DiagnosticSeverity.Error,
  medium: vscode.DiagnosticSeverity.Warning,
  low: vscode.DiagnosticSeverity.Information,
  info: vscode.DiagnosticSeverity.Hint,
};

export function publishDiagnostics(
  collection: vscode.DiagnosticCollection,
  workspaceRoot: string,
  findings: SafeAiFinding[]
): void {
  collection.clear();

  const grouped = new Map<string, vscode.Diagnostic[]>();
  const normalizedRoot = path.resolve(workspaceRoot);

  for (const finding of findings) {
    if (!finding.filePath) continue;

    const absolute = path.resolve(workspaceRoot, finding.filePath);
    const normalizedAbsolute = path.resolve(absolute);

    if (!normalizedAbsolute.startsWith(normalizedRoot) && normalizedAbsolute !== normalizedRoot) {
      continue;
    }

    const uri = vscode.Uri.file(absolute);
    const line = Math.max(0, (finding.line ?? 1) - 1);
    const column = Math.max(0, (finding.column ?? 1) - 1);
    const endLine = finding.endLine ? Math.max(0, finding.endLine - 1) : line;
    const endColumn = finding.endColumn ? Math.max(0, finding.endColumn - 1) : column + 1;

    const diagnostic = new vscode.Diagnostic(
      new vscode.Range(line, column, endLine, endColumn),
      finding.message,
      SEVERITY_MAP[finding.severity]
    );
    diagnostic.source = 'SafeAI';
    diagnostic.code = finding.ruleId;

    if (finding.documentationUrl) {
      diagnostic.code = {
        value: finding.ruleId,
        target: vscode.Uri.parse(finding.documentationUrl),
      };
    }

    const existing = grouped.get(uri.toString()) ?? [];
    existing.push(diagnostic);
    grouped.set(uri.toString(), existing);
  }

  for (const [uriString, diagnostics] of grouped) {
    collection.set(vscode.Uri.parse(uriString), diagnostics);
  }
}

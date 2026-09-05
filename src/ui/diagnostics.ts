import * as path from 'node:path';
import * as vscode from 'vscode';
import { SafeAiFinding } from '../safeai/types';

export function publishDiagnostics(collection: vscode.DiagnosticCollection, root: string, findings: SafeAiFinding[]): void {
  collection.clear();
  for (const finding of findings) {
    if (!finding.filePath) continue;
    const absolute = path.resolve(root, finding.filePath);
    if (!absolute.startsWith(path.resolve(root) + path.sep) && absolute !== path.resolve(root)) continue;
    const uri = vscode.Uri.file(absolute);
    const line = Math.max(0, (finding.line ?? 1) - 1);
    const column = Math.max(0, (finding.column ?? 1) - 1);
    const map: Record<string, vscode.DiagnosticSeverity> = { critical: vscode.DiagnosticSeverity.Error, high: vscode.DiagnosticSeverity.Error, medium: vscode.DiagnosticSeverity.Warning, low: vscode.DiagnosticSeverity.Information, info: vscode.DiagnosticSeverity.Hint };
    const diagnostic = new vscode.Diagnostic(new vscode.Range(line, column, line, column + 1), finding.message, map[finding.severity]);
    diagnostic.source = 'SafeAI';
    diagnostic.code = finding.ruleId;
    collection.set(uri, [...(collection.get(uri) ?? []), diagnostic]);
  }
}

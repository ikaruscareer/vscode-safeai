import * as vscode from 'vscode';
import { runSafeAi } from './safeai/runner';
import { publishDiagnostics } from './ui/diagnostics';

export function activate(context: vscode.ExtensionContext): void {
  const output = vscode.window.createOutputChannel('SafeAI');
  const diagnostics = vscode.languages.createDiagnosticCollection('safeai');
  context.subscriptions.push(output, diagnostics);

  const scan = async (currentFile: boolean) => {
    if (!vscode.workspace.isTrusted) {
      void vscode.window.showWarningMessage('SafeAI scans run only in trusted workspaces.');
      return;
    }
    const folder = vscode.workspace.workspaceFolders?.[0];
    if (!folder) { void vscode.window.showWarningMessage('Open a folder before running SafeAI.'); return; }
    const target = currentFile ? vscode.window.activeTextEditor?.document.uri.fsPath : folder.uri.fsPath;
    if (!target) { void vscode.window.showWarningMessage('Open a file before scanning the current file.'); return; }
    const config = vscode.workspace.getConfiguration('safeai');
    await vscode.window.withProgress({ location: vscode.ProgressLocation.Notification, title: 'SafeAI scan', cancellable: true }, async (_, token) => {
      try {
        output.show(true); output.appendLine(`Scanning ${target}`);
        const result = await runSafeAi(target, { cliPath: config.get<string>('cliPath', 'safeai'), pythonPath: config.get<string>('pythonPath', 'python'), extraArgs: config.get<string[]>('extraArgs', []) }, token);
        publishDiagnostics(diagnostics, folder.uri.fsPath, result.findings);
        output.appendLine(`SafeAI returned ${result.findings.length} finding(s).`);
        void vscode.window.showInformationMessage(`SafeAI: ${result.findings.length} finding(s).`);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        output.appendLine(`SafeAI error: ${message}`);
        void vscode.window.showErrorMessage(`SafeAI: ${message}`);
      }
    });
  };

  context.subscriptions.push(
    vscode.commands.registerCommand('safeai.scanWorkspace', () => scan(false)),
    vscode.commands.registerCommand('safeai.scanCurrentFile', () => scan(true)),
    vscode.commands.registerCommand('safeai.clearResults', () => diagnostics.clear())
  );
}

export function deactivate(): void {}

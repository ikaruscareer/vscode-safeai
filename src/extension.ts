import * as vscode from 'vscode';
import { findCli, ensureCli } from './safeai/cli';
import { runSafeAi } from './safeai/runner';
import { SafeAiCliInfo, SafeAiFinding, ScanTarget } from './safeai/types';
import { getScanOptions, getAutoScanEnabled, getAutoScanDebounce, getAutoScanPatterns } from './config';
import { publishDiagnostics } from './ui/diagnostics';
import { SafeAiTreeDataProvider } from './ui/treeView';
import { SafeAiCodeActionProvider } from './ui/codeActions';
import { SafeAiStatusBar } from './ui/statusBar';

let cliInfo: SafeAiCliInfo | undefined;
let scanInProgress = false;
let autoScanTimer: ReturnType<typeof setTimeout> | undefined;

export async function activate(context: vscode.ExtensionContext): Promise<void> {
  const output = vscode.window.createOutputChannel('SafeAI');
  const diagnostics = vscode.languages.createDiagnosticCollection('safeai');
  const treeDataProvider = new SafeAiTreeDataProvider();
  const codeActionProvider = new SafeAiCodeActionProvider();
  const statusBar = new SafeAiStatusBar();

  context.subscriptions.push(
    output,
    diagnostics,
    treeDataProvider,
    codeActionProvider,
    statusBar,
    vscode.window.registerTreeDataProvider('safeaiFindings', treeDataProvider),
  );

  output.appendLine('SafeAI extension activating...');

  try {
    const options = getScanOptions();
    cliInfo = await findCli(options.cliPath, options.pythonPath, output);
    if (cliInfo.isValid) {
      output.appendLine(`SafeAI CLI ready: ${cliInfo.path} (v${cliInfo.version ?? 'unknown'})`);
    }
  } catch (err) {
    output.appendLine(`CLI detection failed during activation: ${err}`);
  }

  const scan = async (currentFile: boolean) => {
    if (!vscode.workspace.isTrusted) {
      void vscode.window.showWarningMessage('SafeAI scans run only in trusted workspaces.');
      return;
    }

    const folder = vscode.workspace.workspaceFolders?.[0];
    if (!folder) {
      void vscode.window.showWarningMessage('Open a folder before running SafeAI.');
      return;
    }

    let targetPath: string | undefined;
    let isFile = false;

    if (currentFile) {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        void vscode.window.showWarningMessage('Open a file before scanning the current file.');
        return;
      }
      targetPath = editor.document.uri.fsPath;
      isFile = true;
    } else {
      targetPath = folder.uri.fsPath;
    }

    if (!targetPath) return;

    if (scanInProgress) {
      void vscode.window.showInformationMessage('SafeAI scan already in progress.');
      return;
    }

    const options = getScanOptions();
    cliInfo = await ensureCli(cliInfo, options.cliPath, options.pythonPath, output);

    const target: ScanTarget = {
      fsPath: targetPath,
      isFile,
      workspaceFolder: folder.uri.fsPath,
    };

    scanInProgress = true;
    statusBar.setScanning();

    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: 'SafeAI scan',
        cancellable: true,
      },
      async (_, token) => {
        try {
          output.appendLine(`Scanning ${targetPath}`);
          const result = await runSafeAi(target, cliInfo!, options, token, output);

          publishDiagnostics(diagnostics, folder.uri.fsPath, result.findings);
          treeDataProvider.refresh(result);
          codeActionProvider.updateFindings(result.findings);
          statusBar.setResults(result);

          output.appendLine(`SafeAI returned ${result.summary.totalFindings} finding(s).`);
          if (result.summary.trustScore !== undefined) {
            output.appendLine(`Trust score: ${result.summary.trustScore}/100`);
          }

          const summary = result.summary;
          const parts: string[] = [];
          if (summary.bySeverity.critical > 0) parts.push(`${summary.bySeverity.critical} critical`);
          if (summary.bySeverity.high > 0) parts.push(`${summary.bySeverity.high} high`);
          if (summary.bySeverity.medium > 0) parts.push(`${summary.bySeverity.medium} medium`);
          if (summary.bySeverity.low > 0) parts.push(`${summary.bySeverity.low} low`);

          const msg = parts.length > 0
            ? `SafeAI: ${parts.join(', ')} finding(s)`
            : `SafeAI: No findings`;
          void vscode.window.showInformationMessage(msg);
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          output.appendLine(`SafeAI error: ${message}`);
          statusBar.setError(message);
          void vscode.window.showErrorMessage(`SafeAI: ${message}`);
        } finally {
          scanInProgress = false;
        }
      }
    );
  };

  context.subscriptions.push(
    vscode.commands.registerCommand('safeai.scanWorkspace', () => scan(false)),
    vscode.commands.registerCommand('safeai.scanCurrentFile', () => scan(true)),
    vscode.commands.registerCommand('safeai.clearResults', () => {
      diagnostics.clear();
      treeDataProvider.refresh();
      statusBar.setIdle();
    }),
    vscode.commands.registerCommand('safeai.refresh', () => {
      void scan(false);
    }),
    vscode.commands.registerCommand('safeai.showRemediation', (finding: SafeAiFinding) => {
      if (finding.remediation) {
        void vscode.window.showInformationMessage(finding.remediation, { modal: false });
      }
    }),
    vscode.commands.registerCommand('safeai.openSettings', () => {
      void vscode.commands.executeCommand('workbench.action.openSettings', 'safeai');
    }),
  );

  context.subscriptions.push(
    vscode.languages.registerCodeActionsProvider(
      { scheme: '*', language: '*' },
      codeActionProvider,
      { providedCodeActionKinds: SafeAiCodeActionProvider.providedCodeActionKinds }
    ),
  );

  if (getAutoScanEnabled()) {
    registerAutoScan(context, folder => {
      const target: ScanTarget = {
        fsPath: folder.uri.fsPath,
        isFile: false,
        workspaceFolder: folder.uri.fsPath,
      };
      void scanTarget(target, folder, output, diagnostics, treeDataProvider, codeActionProvider, statusBar);
    });
  }

  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration(e => {
      if (e.affectsConfiguration('safeai.autoScan')) {
        if (getAutoScanEnabled()) {
          const folder = vscode.workspace.workspaceFolders?.[0];
          if (folder) {
            registerAutoScan(context, f => {
              const target: ScanTarget = {
                fsPath: f.uri.fsPath,
                isFile: false,
                workspaceFolder: f.uri.fsPath,
              };
              void scanTarget(target, f, output, diagnostics, treeDataProvider, codeActionProvider, statusBar);
            });
          }
        } else {
          if (autoScanTimer) clearTimeout(autoScanTimer);
        }
      }
    }),
  );

  output.appendLine('SafeAI extension activated.');
}

function registerAutoScan(
  context: vscode.ExtensionContext,
  onScan: (folder: vscode.WorkspaceFolder) => void
): void {
  const patterns = getAutoScanPatterns();
  const debounce = getAutoScanDebounce();

  context.subscriptions.push(
    vscode.workspace.onDidSaveTextDocument(doc => {
      if (!vscode.workspace.isTrusted) return;
      if (!getAutoScanEnabled()) return;
      if (scanInProgress) return;

      const folder = vscode.workspace.workspaceFolders?.[0];
      if (!folder) return;

      const relativePath = vscode.workspace.asRelativePath(doc.uri);
      const matches = patterns.some(p => matchGlob(relativePath, p));

      if (!matches) return;

      if (autoScanTimer) clearTimeout(autoScanTimer);
      autoScanTimer = setTimeout(() => onScan(folder), debounce);
    }),
  );
}

function matchGlob(filePath: string, pattern: string): boolean {
  const normalized = filePath.replace(/\\/g, '/');
  const parts = normalized.split('/');
  const patternParts = pattern.replace(/\\/g, '/').split('/');

  return matchParts(parts, patternParts, 0, 0);
}

function matchParts(pathParts: string[], patternParts: string[], pi: number, pp: number): boolean {
  if (pp === patternParts.length) return pi === pathParts.length;

  const pat = patternParts[pp];

  if (pat === '**') {
    if (pp === patternParts.length - 1) return true;
    for (let skip = pi; skip <= pathParts.length; skip++) {
      if (matchParts(pathParts, patternParts, skip, pp + 1)) return true;
    }
    return false;
  }

  if (pi >= pathParts.length) return false;

  if (pat === '*') return matchParts(pathParts, patternParts, pi + 1, pp + 1);

  if (pat.includes('*')) {
    const regex = new RegExp('^' + pat.replace(/\./g, '\\.').replace(/\*/g, '[^/]*') + '$');
    if (regex.test(pathParts[pi])) return matchParts(pathParts, patternParts, pi + 1, pp + 1);
    return false;
  }

  if (pathParts[pi] === pat) return matchParts(pathParts, patternParts, pi + 1, pp + 1);
  return false;
}

async function scanTarget(
  target: ScanTarget,
  folder: vscode.WorkspaceFolder,
  output: vscode.OutputChannel,
  diagnostics: vscode.DiagnosticCollection,
  treeDataProvider: SafeAiTreeDataProvider,
  codeActionProvider: SafeAiCodeActionProvider,
  statusBar: SafeAiStatusBar
): Promise<void> {
  if (scanInProgress) return;
  if (!vscode.workspace.isTrusted) return;

  const options = getScanOptions();
  try {
    cliInfo = await ensureCli(cliInfo, options.cliPath, options.pythonPath, output);
  } catch {
    return;
  }

  scanInProgress = true;
  statusBar.setScanning();

  try {
    output.appendLine(`Auto-scanning ${target.fsPath}`);
    const result = await runSafeAi(target, cliInfo!, options, new vscode.CancellationTokenSource().token, output);

    publishDiagnostics(diagnostics, folder.uri.fsPath, result.findings);
    treeDataProvider.refresh(result);
    codeActionProvider.updateFindings(result.findings);
    statusBar.setResults(result);

    output.appendLine(`Auto-scan: ${result.summary.totalFindings} finding(s).`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    output.appendLine(`Auto-scan error: ${message}`);
    statusBar.setError(message);
  } finally {
    scanInProgress = false;
  }
}

export function deactivate(): void {
  if (autoScanTimer) clearTimeout(autoScanTimer);
}

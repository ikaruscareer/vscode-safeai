import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import * as vscode from 'vscode';
import { SafeAiCliInfo } from './types';

const execFileAsync = promisify(execFile);

const MINIMUM_VERSION = '2.0.0';
const VERSION_TIMEOUT = 10_000;

export function parseCliVersion(output: string): string | null {
  const match = output.match(/(\d+\.\d+\.\d+)/);
  return match ? match[1] : null;
}

export function compareSemver(a: string, b: string): number {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    const na = pa[i] ?? 0;
    const nb = pb[i] ?? 0;
    if (na !== nb) return na - nb;
  }
  return 0;
}

export function isVersionAtLeast(version: string, minimum: string): boolean {
  return compareSemver(version, minimum) >= 0;
}

export async function findCli(cliPath: string, pythonPath: string, output: vscode.OutputChannel): Promise<SafeAiCliInfo> {
  const trimmedCli = cliPath.trim();

  if (trimmedCli) {
    try {
      const { stdout } = await execFileAsync(trimmedCli, ['--version'], { timeout: VERSION_TIMEOUT, windowsHide: true });
      const version = parseCliVersion(stdout);
      output.appendLine(`CLI found at: ${trimmedCli} (v${version ?? 'unknown'})`);
      return { path: trimmedCli, version, isValid: true, isModule: false };
    } catch {
      output.appendLine(`CLI at "${trimmedCli}" not responding to --version, trying python module fallback.`);
    }
  }

  const pyPath = pythonPath.trim() || 'python';
  try {
    const { stdout } = await execFileAsync(pyPath, ['-m', 'safeai', '--version'], { timeout: VERSION_TIMEOUT, windowsHide: true });
    const version = parseCliVersion(stdout);
    output.appendLine(`CLI found via python module (v${version ?? 'unknown'})`);
    return { path: pyPath, version, isValid: true, isModule: true };
  } catch {
    output.appendLine('SafeAI CLI not found via binary or python module.');
  }

  return { path: '', version: null, isValid: false, isModule: false };
}

export async function ensureCli(
  cliInfo: SafeAiCliInfo | undefined,
  cliPath: string,
  pythonPath: string,
  output: vscode.OutputChannel
): Promise<SafeAiCliInfo> {
  if (cliInfo?.isValid) return cliInfo;

  const info = await findCli(cliPath, pythonPath, output);

  if (!info.isValid) {
    const choice = await vscode.window.showErrorMessage(
      'SafeAI CLI not found. Install it with: pip install SafeAI-Static-Analyzer',
      'Open Settings'
    );
    if (choice === 'Open Settings') {
      void vscode.commands.executeCommand('workbench.action.openSettings', 'safeai.cliPath');
    }
    throw new Error('SafeAI CLI is not installed or not found on PATH.');
  }

  if (info.version && !isVersionAtLeast(info.version, MINIMUM_VERSION)) {
    void vscode.window.showWarningMessage(
      `SafeAI CLI v${info.version} detected. v${MINIMUM_VERSION}+ recommended for full feature support.`
    );
  }

  return info;
}

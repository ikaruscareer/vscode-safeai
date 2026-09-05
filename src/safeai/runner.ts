import { spawn } from 'node:child_process';
import * as vscode from 'vscode';
import { parseSafeAiJson } from './parser';
import { SafeAiScanResult } from './types';

const MAX_OUTPUT = 10 * 1024 * 1024;

export interface RunOptions { cliPath: string; pythonPath: string; extraArgs: string[]; }

export function buildCommand(target: string, options: RunOptions): { command: string; args: string[] } {
  const args = [target, '--format', 'json', ...options.extraArgs];
  return options.cliPath.trim() ? { command: options.cliPath, args } : { command: options.pythonPath, args: ['-m', 'safeai', ...args] };
}

export async function runSafeAi(target: string, options: RunOptions, token: vscode.CancellationToken): Promise<SafeAiScanResult> {
  const { command, args } = buildCommand(target, options);
  return await new Promise((resolve, reject) => {
    const process = spawn(command, args, { cwd: target, shell: false, windowsHide: true });
    let stdout = ''; let stderr = '';
    const cancel = token.onCancellationRequested(() => process.kill());
    process.stdout.on('data', chunk => { stdout += String(chunk); if (stdout.length > MAX_OUTPUT) process.kill(); });
    process.stderr.on('data', chunk => { stderr += String(chunk); if (stderr.length > MAX_OUTPUT) process.kill(); });
    process.on('error', error => { cancel.dispose(); reject(new Error(`Unable to start SafeAI: ${error.message}`)); });
    process.on('close', code => {
      cancel.dispose();
      if (token.isCancellationRequested) return reject(new Error('SafeAI scan cancelled.'));
      try {
        const result = parseSafeAiJson(stdout);
        if (code !== 0 && result.findings.length === 0) return reject(new Error(stderr || `SafeAI exited with code ${code}.`));
        resolve(result);
      } catch (error) { reject(error); }
    });
  });
}

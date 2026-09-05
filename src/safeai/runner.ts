import { spawn, ChildProcess } from 'node:child_process';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import * as vscode from 'vscode';
import { parseSafeAiJson } from './parser';
import { SafeAiCliInfo, SafeAiScanResult, ScanOptions, ScanTarget } from './types';

const MAX_OUTPUT = 10 * 1024 * 1024;
const DEFAULT_TIMEOUT = 120_000;

export function buildArgs(target: ScanTarget, cliInfo: SafeAiCliInfo, options: ScanOptions, jsonOutPath: string): string[] {
  const args: string[] = ['scan', target.fsPath, '--json', jsonOutPath];

  if (options.severityThreshold !== 'low') {
    args.push('--fail-on', options.severityThreshold);
  }

  args.push(...options.extraArgs);
  return args;
}

export function getCommand(target: ScanTarget, cliInfo: SafeAiCliInfo, options: ScanOptions, jsonOutPath: string): { command: string; args: string[] } {
  const args = buildArgs(target, cliInfo, options, jsonOutPath);
  if (cliInfo.isModule) {
    return { command: cliInfo.path, args: ['-m', 'safeai', ...args] };
  }
  return { command: cliInfo.path, args };
}

function getCwd(target: ScanTarget): string {
  return target.isFile ? path.dirname(target.fsPath) : target.fsPath;
}

export async function runSafeAi(
  target: ScanTarget,
  cliInfo: SafeAiCliInfo,
  options: ScanOptions,
  token: vscode.CancellationToken,
  output: vscode.OutputChannel
): Promise<SafeAiScanResult> {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'safeai-'));
  const jsonPath = path.join(tmpDir, 'report.json');

  try {
    const { command, args } = getCommand(target, cliInfo, options, jsonPath);
    output.appendLine(`Running: ${command} ${args.join(' ')}`);

    const result = await spawnCli(command, args, getCwd(target), token, output, options.timeout ?? DEFAULT_TIMEOUT);

    if (token.isCancellationRequested) {
      throw new Error('SafeAI scan cancelled.');
    }

    if (!fs.existsSync(jsonPath)) {
      if (result.code !== 0 && result.stderr) {
        throw new Error(result.stderr.slice(0, 2000));
      }
      throw new Error(`SafeAI exited with code ${result.code}. No JSON output produced.`);
    }

    const jsonContent = fs.readFileSync(jsonPath, 'utf-8');
    const scanResult = parseSafeAiJson(jsonContent);

    if (result.code !== 0 && scanResult.findings.length === 0 && result.stderr) {
      output.appendLine(`SafeAI stderr: ${result.stderr.slice(0, 1000)}`);
    }

    return scanResult;
  } finally {
    try {
      if (fs.existsSync(jsonPath)) fs.unlinkSync(jsonPath);
      if (fs.existsSync(tmpDir)) fs.rmdirSync(tmpDir);
    } catch {
      // best-effort cleanup
    }
  }
}

interface SpawnResult {
  code: number;
  stderr: string;
}

function spawnCli(
  command: string,
  args: string[],
  cwd: string,
  token: vscode.CancellationToken,
  output: vscode.OutputChannel,
  timeoutMs: number
): Promise<SpawnResult> {
  return new Promise((resolve, reject) => {
    let proc: ChildProcess;
    try {
      proc = spawn(command, args, { cwd, shell: false, windowsHide: true });
    } catch (error) {
      reject(new Error(`Unable to start SafeAI: ${error instanceof Error ? error.message : String(error)}`));
      return;
    }

    let stdout = '';
    let stderr = '';
    let killed = false;

    const timeoutHandle = setTimeout(() => {
      killed = true;
      proc.kill();
      reject(new Error(`SafeAI scan timed out after ${timeoutMs / 1000}s.`));
    }, timeoutMs);

    const cancelDisposable = token.onCancellationRequested(() => {
      killed = true;
      proc.kill();
    });

    proc.stdout?.on('data', (chunk: Buffer) => {
      stdout += chunk.toString();
      if (stdout.length > MAX_OUTPUT) {
        killed = true;
        proc.kill();
      }
    });

    proc.stderr?.on('data', (chunk: Buffer) => {
      stderr += chunk.toString();
      if (stderr.length > MAX_OUTPUT) {
        killed = true;
        proc.kill();
      }
    });

    proc.on('error', (error) => {
      clearTimeout(timeoutHandle);
      cancelDisposable.dispose();
      reject(new Error(`Unable to start SafeAI: ${error.message}`));
    });

    proc.on('close', (code) => {
      clearTimeout(timeoutHandle);
      cancelDisposable.dispose();

      if (killed && !token.isCancellationRequested) {
        return;
      }

      resolve({ code: code ?? 1, stderr });
    });
  });
}

import * as vscode from 'vscode';
import { SafeAiSeverity, ScanOptions } from './safeai/types';

const SEVERITY_VALUES: SafeAiSeverity[] = ['critical', 'high', 'medium', 'low'];

export function getScanOptions(): ScanOptions {
  const config = vscode.workspace.getConfiguration('safeai');
  return {
    cliPath: config.get<string>('cliPath', 'safeai'),
    pythonPath: config.get<string>('pythonPath', 'python'),
    extraArgs: config.get<string[]>('extraArgs', []),
    timeout: config.get<number>('timeout', 120_000),
    severityThreshold: config.get<SafeAiSeverity>('severityThreshold', 'low'),
  };
}

export function getAutoScanEnabled(): boolean {
  return vscode.workspace.getConfiguration('safeai').get<boolean>('autoScan', false);
}

export function getAutoScanDebounce(): number {
  return vscode.workspace.getConfiguration('safeai').get<number>('autoScanDebounce', 1000);
}

export function getAutoScanPatterns(): string[] {
  return vscode.workspace.getConfiguration('safeai').get<string[]>('scanOnSavePatterns', ['**/*']);
}

export function isSeverityAboveThreshold(severity: SafeAiSeverity, threshold: SafeAiSeverity): boolean {
  return SEVERITY_VALUES.indexOf(severity) <= SEVERITY_VALUES.indexOf(threshold);
}

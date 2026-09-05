import { describe, expect, it } from 'vitest';
import { buildArgs, getCommand } from '../src/safeai/runner';
import { SafeAiCliInfo, ScanOptions, ScanTarget } from '../src/safeai/types';

function makeTarget(overrides: Partial<ScanTarget> = {}): ScanTarget {
  return { fsPath: '/workspace', isFile: false, workspaceFolder: '/workspace', ...overrides };
}

function makeCliInfo(overrides: Partial<SafeAiCliInfo> = {}): SafeAiCliInfo {
  return { path: 'safeai', version: '2.0.0', isValid: true, isModule: false, ...overrides };
}

function makeOptions(overrides: Partial<ScanOptions> = {}): ScanOptions {
  return { cliPath: 'safeai', pythonPath: 'python', extraArgs: [], timeout: 120000, severityThreshold: 'low', ...overrides };
}

describe('buildArgs', () => {
  it('builds basic scan command args', () => {
    const args = buildArgs(makeTarget(), makeCliInfo(), makeOptions(), '/tmp/report.json');
    expect(args).toContain('scan');
    expect(args).toContain('/workspace');
    expect(args).toContain('--json');
    expect(args).toContain('/tmp/report.json');
  });

  it('includes --fail-on when threshold is not low', () => {
    const args = buildArgs(makeTarget(), makeCliInfo(), makeOptions({ severityThreshold: 'high' }), '/tmp/r.json');
    expect(args).toContain('--fail-on');
    expect(args).toContain('high');
  });

  it('does not include --fail-on when threshold is low', () => {
    const args = buildArgs(makeTarget(), makeCliInfo(), makeOptions({ severityThreshold: 'low' }), '/tmp/r.json');
    expect(args).not.toContain('--fail-on');
  });

  it('appends extra args', () => {
    const args = buildArgs(makeTarget(), makeCliInfo(), makeOptions({ extraArgs: ['--verbose'] }), '/tmp/r.json');
    expect(args).toContain('--verbose');
  });
});

describe('getCommand', () => {
  it('uses direct binary when not module', () => {
    const result = getCommand(makeTarget(), makeCliInfo(), makeOptions(), '/tmp/r.json');
    expect(result.command).toBe('safeai');
    expect(result.args[0]).toBe('scan');
    expect(result.args).not.toContain('-m');
  });

  it('uses python -m safeai when isModule', () => {
    const result = getCommand(makeTarget(), makeCliInfo({ isModule: true, path: 'python' }), makeOptions(), '/tmp/r.json');
    expect(result.command).toBe('python');
    expect(result.args[0]).toBe('-m');
    expect(result.args[1]).toBe('safeai');
  });
});

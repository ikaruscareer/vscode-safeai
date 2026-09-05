import { describe, expect, it } from 'vitest';
import { parseSafeAiJson } from '../src/safeai/parser';
import * as fs from 'node:fs';
import * as path from 'node:path';

describe('parseSafeAiJson', () => {
  it('parses a v2 schema findings report', () => {
    const result = parseSafeAiJson(JSON.stringify({
      schemaVersion: '0.1',
      findings: [
        { ruleId: 'SAFEAI-MCP-001', severity: 'high', message: 'MCP risk', filePath: 'agent.py', line: 12, column: 3 }
      ]
    }));
    expect(result.findings).toHaveLength(1);
    expect(result.findings[0].ruleId).toBe('SAFEAI-MCP-001');
    expect(result.findings[0].severity).toBe('high');
    expect(result.findings[0].filePath).toBe('agent.py');
    expect(result.findings[0].line).toBe(12);
  });

  it('parses an array format (legacy)', () => {
    const result = parseSafeAiJson(JSON.stringify([
      { ruleId: 'R1', severity: 'medium', message: 'Test finding' }
    ]));
    expect(result.findings).toHaveLength(1);
    expect(result.findings[0].ruleId).toBe('R1');
  });

  it('extracts trust score', () => {
    const result = parseSafeAiJson(JSON.stringify({
      findings: [],
      trustScore: 72
    }));
    expect(result.summary.trustScore).toBe(72);
  });

  it('extracts trust_score (snake_case)', () => {
    const result = parseSafeAiJson(JSON.stringify({
      findings: [],
      trust_score: 85
    }));
    expect(result.summary.trustScore).toBe(85);
  });

  it('ignores out-of-range trust score', () => {
    const result = parseSafeAiJson(JSON.stringify({
      findings: [],
      trustScore: 150
    }));
    expect(result.summary.trustScore).toBeUndefined();
  });

  it('builds correct severity summary', () => {
    const result = parseSafeAiJson(JSON.stringify({
      findings: [
        { ruleId: 'R1', severity: 'critical', message: 'C' },
        { ruleId: 'R2', severity: 'high', message: 'H' },
        { ruleId: 'R3', severity: 'high', message: 'H2' },
        { ruleId: 'R4', severity: 'low', message: 'L' },
      ]
    }));
    expect(result.summary.totalFindings).toBe(4);
    expect(result.summary.bySeverity.critical).toBe(1);
    expect(result.summary.bySeverity.high).toBe(2);
    expect(result.summary.bySeverity.low).toBe(1);
    expect(result.summary.bySeverity.medium).toBe(0);
  });

  it('rejects malformed JSON', () => {
    expect(() => parseSafeAiJson('{')).toThrow('valid JSON');
  });

  it('handles empty findings array', () => {
    const result = parseSafeAiJson(JSON.stringify({ findings: [] }));
    expect(result.findings).toHaveLength(0);
    expect(result.summary.totalFindings).toBe(0);
  });

  it('skips findings without message', () => {
    const result = parseSafeAiJson(JSON.stringify({
      findings: [
        { ruleId: 'R1', severity: 'high' },
        { ruleId: 'R2', severity: 'medium', message: 'Valid' }
      ]
    }));
    expect(result.findings).toHaveLength(1);
    expect(result.findings[0].message).toBe('Valid');
  });

  it('normalizes severity to lowercase', () => {
    const result = parseSafeAiJson(JSON.stringify({
      findings: [
        { ruleId: 'R1', severity: 'HIGH', message: 'Test' }
      ]
    }));
    expect(result.findings[0].severity).toBe('high');
  });

  it('defaults unknown severity to info', () => {
    const result = parseSafeAiJson(JSON.stringify({
      findings: [
        { ruleId: 'R1', severity: 'unknown', message: 'Test' }
      ]
    }));
    expect(result.findings[0].severity).toBe('info');
  });

  it('accepts title and description as message fallbacks', () => {
    const result = parseSafeAiJson(JSON.stringify({
      findings: [
        { ruleId: 'R1', severity: 'low', title: 'From Title' },
        { ruleId: 'R2', severity: 'low', description: 'From Description' }
      ]
    }));
    expect(result.findings[0].message).toBe('From Title');
    expect(result.findings[1].message).toBe('From Description');
  });

  it('accepts rule_id and id as ruleId fallbacks', () => {
    const result = parseSafeAiJson(JSON.stringify({
      findings: [
        { rule_id: 'R-1', severity: 'low', message: 'A' },
        { id: 'R-2', severity: 'low', message: 'B' }
      ]
    }));
    expect(result.findings[0].ruleId).toBe('R-1');
    expect(result.findings[1].ruleId).toBe('R-2');
  });

  it('defaults ruleId to SAFEAI-UNKNOWN when missing', () => {
    const result = parseSafeAiJson(JSON.stringify({
      findings: [
        { severity: 'low', message: 'No rule' }
      ]
    }));
    expect(result.findings[0].ruleId).toBe('SAFEAI-UNKNOWN');
  });

  it('preserves raw output', () => {
    const raw = { findings: [{ ruleId: 'R1', severity: 'low', message: 'X' }] };
    const result = parseSafeAiJson(JSON.stringify(raw));
    expect(result.raw).toEqual(raw);
  });

  it('reads fixture file', () => {
    const fixture = fs.readFileSync(path.join(__dirname, 'fixtures', 'findings.json'), 'utf-8');
    const result = parseSafeAiJson(fixture);
    expect(result.findings).toHaveLength(1);
    expect(result.findings[0].ruleId).toBe('SAFEAI-MCP-001');
    expect(result.findings[0].remediation).toBeDefined();
  });
});

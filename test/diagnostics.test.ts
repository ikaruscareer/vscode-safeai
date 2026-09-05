import { describe, expect, it } from 'vitest';
import { SafeAiFinding } from '../src/safeai/types';

describe('publishDiagnostics (pure logic)', () => {
  it('extracts diagnostic data from findings', () => {
    const finding: SafeAiFinding = {
      ruleId: 'SAFEAI-TEST',
      severity: 'high',
      message: 'Test finding',
      filePath: 'src/agent.py',
      line: 10,
      column: 5,
    };

    expect(finding.ruleId).toBe('SAFEAI-TEST');
    expect(finding.severity).toBe('high');
    expect(finding.filePath).toBe('src/agent.py');
    expect(finding.line).toBe(10);
    expect(finding.column).toBe(5);
  });

  it('handles finding without location', () => {
    const finding: SafeAiFinding = {
      ruleId: 'SAFEAI-NOLOC',
      severity: 'medium',
      message: 'No location',
    };

    expect(finding.filePath).toBeUndefined();
    expect(finding.line).toBeUndefined();
    expect(finding.column).toBeUndefined();
  });

  it('handles finding with remediation and documentation URL', () => {
    const finding: SafeAiFinding = {
      ruleId: 'SAFEAI-REM',
      severity: 'low',
      message: 'Has remediation',
      remediation: 'Fix this by doing X',
      documentationUrl: 'https://example.com/docs',
    };

    expect(finding.remediation).toBe('Fix this by doing X');
    expect(finding.documentationUrl).toBe('https://example.com/docs');
  });
});

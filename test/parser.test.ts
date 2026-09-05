import { describe, expect, it } from 'vitest';
import { parseSafeAiJson } from '../src/safeai/parser';

describe('parseSafeAiJson', () => {
  it('parses a SafeAI findings report', () => {
    const result = parseSafeAiJson(JSON.stringify({ findings: [{ ruleId: 'SAFEAI-1', severity: 'high', message: 'Risk', filePath: 'agent.py', line: 2 }] }));
    expect(result.findings).toHaveLength(1);
    expect(result.findings[0].ruleId).toBe('SAFEAI-1');
    expect(result.findings[0].severity).toBe('high');
  });

  it('rejects malformed JSON', () => {
    expect(() => parseSafeAiJson('{')).toThrow('valid JSON');
  });
});

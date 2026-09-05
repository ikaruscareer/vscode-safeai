import { describe, expect, it } from 'vitest';
import { isSeverityAboveThreshold } from '../src/config';
import { SafeAiSeverity } from '../src/safeai/types';

describe('isSeverityAboveThreshold', () => {
  it('critical is above all thresholds', () => {
    expect(isSeverityAboveThreshold('critical', 'low')).toBe(true);
    expect(isSeverityAboveThreshold('critical', 'medium')).toBe(true);
    expect(isSeverityAboveThreshold('critical', 'high')).toBe(true);
    expect(isSeverityAboveThreshold('critical', 'critical')).toBe(true);
  });

  it('high is above low and medium thresholds', () => {
    expect(isSeverityAboveThreshold('high', 'low')).toBe(true);
    expect(isSeverityAboveThreshold('high', 'medium')).toBe(true);
    expect(isSeverityAboveThreshold('high', 'high')).toBe(true);
    expect(isSeverityAboveThreshold('high', 'critical')).toBe(false);
  });

  it('medium is above low threshold only', () => {
    expect(isSeverityAboveThreshold('medium', 'low')).toBe(true);
    expect(isSeverityAboveThreshold('medium', 'medium')).toBe(true);
    expect(isSeverityAboveThreshold('medium', 'high')).toBe(false);
  });

  it('low is not above any threshold except itself', () => {
    expect(isSeverityAboveThreshold('low', 'low')).toBe(true);
    expect(isSeverityAboveThreshold('low', 'medium')).toBe(false);
  });
});

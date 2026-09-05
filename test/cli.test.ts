import { describe, expect, it } from 'vitest';
import { parseCliVersion, compareSemver, isVersionAtLeast } from '../src/safeai/cli';

describe('parseCliVersion', () => {
  it('extracts version from typical output', () => {
    expect(parseCliVersion('safeai 2.0.1')).toBe('2.0.1');
  });

  it('extracts version from multi-line output', () => {
    expect(parseCliVersion('SafeAI Static Analyzer\nVersion: 2.1.0\nBuild: abc')).toBe('2.1.0');
  });

  it('extracts version from python module output', () => {
    expect(parseCliVersion('safeai-static-analyzer 2.0.0')).toBe('2.0.0');
  });

  it('returns null for empty string', () => {
    expect(parseCliVersion('')).toBeNull();
  });

  it('returns null when no version present', () => {
    expect(parseCliVersion('no version info here')).toBeNull();
  });

  it('extracts first version when multiple present', () => {
    expect(parseCliVersion('v1.0.0 to v2.0.0')).toBe('1.0.0');
  });
});

describe('compareSemver', () => {
  it('returns 0 for equal versions', () => {
    expect(compareSemver('2.0.0', '2.0.0')).toBe(0);
  });

  it('returns positive when a > b (major)', () => {
    expect(compareSemver('3.0.0', '2.0.0')).toBeGreaterThan(0);
  });

  it('returns negative when a < b (major)', () => {
    expect(compareSemver('1.0.0', '2.0.0')).toBeLessThan(0);
  });

  it('compares minor versions', () => {
    expect(compareSemver('2.1.0', '2.0.0')).toBeGreaterThan(0);
    expect(compareSemver('2.0.0', '2.1.0')).toBeLessThan(0);
  });

  it('compares patch versions', () => {
    expect(compareSemver('2.0.1', '2.0.0')).toBeGreaterThan(0);
    expect(compareSemver('2.0.0', '2.0.1')).toBeLessThan(0);
  });

  it('handles missing parts as zero', () => {
    expect(compareSemver('2.0', '2.0.0')).toBe(0);
    expect(compareSemver('2', '2.0.0')).toBe(0);
  });
});

describe('isVersionAtLeast', () => {
  it('returns true when version meets minimum', () => {
    expect(isVersionAtLeast('2.0.0', '2.0.0')).toBe(true);
    expect(isVersionAtLeast('2.1.0', '2.0.0')).toBe(true);
    expect(isVersionAtLeast('3.0.0', '2.0.0')).toBe(true);
  });

  it('returns false when version is below minimum', () => {
    expect(isVersionAtLeast('1.9.0', '2.0.0')).toBe(false);
    expect(isVersionAtLeast('1.0.0', '2.0.0')).toBe(false);
  });
});

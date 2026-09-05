import { SafeAiFinding, SafeAiScanResult, SafeAiSeverity } from './types';

const severities = new Set<SafeAiSeverity>(['critical', 'high', 'medium', 'low', 'info']);

function text(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function number(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? Math.floor(value) : undefined;
}

function severity(value: unknown): SafeAiSeverity {
  const candidate = text(value)?.toLowerCase();
  return candidate && severities.has(candidate as SafeAiSeverity) ? candidate as SafeAiSeverity : 'info';
}

function parseFinding(value: unknown): SafeAiFinding | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const item = value as Record<string, unknown>;
  const message = text(item.message) ?? text(item.title) ?? text(item.description);
  const ruleId = text(item.ruleId) ?? text(item.rule_id) ?? text(item.id) ?? 'SAFEAI-UNKNOWN';
  if (!message) return undefined;
  return {
    ruleId,
    severity: severity(item.severity),
    message,
    filePath: text(item.filePath) ?? text(item.file) ?? text(item.path),
    line: number(item.line) ?? number(item.startLine),
    column: number(item.column) ?? number(item.startColumn),
    remediation: text(item.remediation),
    documentationUrl: text(item.documentationUrl) ?? text(item.documentation_url)
  };
}

export function parseSafeAiJson(stdout: string): SafeAiScanResult {
  let raw: unknown;
  try { raw = JSON.parse(stdout); } catch { throw new Error('SafeAI did not return valid JSON.'); }
  const report = raw && typeof raw === 'object' ? raw as Record<string, unknown> : undefined;
  const candidates = Array.isArray(raw) ? raw : Array.isArray(report?.findings) ? report.findings : [];
  return { findings: candidates.map(parseFinding).filter((f): f is SafeAiFinding => Boolean(f)), raw };
}

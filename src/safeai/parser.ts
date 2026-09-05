import { SafeAiFinding, SafeAiScanResult, SafeAiSeverity, SafeAiSummary } from './types';

const SEVERITIES = new Set<SafeAiSeverity>(['critical', 'high', 'medium', 'low', 'info']);

function text(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function number(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? Math.floor(value) : undefined;
}

function severity(value: unknown): SafeAiSeverity {
  const candidate = text(value)?.toLowerCase();
  return candidate && SEVERITIES.has(candidate as SafeAiSeverity) ? candidate as SafeAiSeverity : 'info';
}

function parseFinding(value: unknown): SafeAiFinding | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const item = value as Record<string, unknown>;

  const message = text(item.message) ?? text(item.title) ?? text(item.description);
  if (!message) return undefined;

  return {
    ruleId: text(item.ruleId) ?? text(item.rule_id) ?? text(item.id) ?? 'SAFEAI-UNKNOWN',
    severity: severity(item.severity),
    message,
    filePath: text(item.filePath) ?? text(item.file) ?? text(item.path),
    line: number(item.line) ?? number(item.startLine),
    column: number(item.column) ?? number(item.startColumn),
    endLine: number(item.endLine),
    endColumn: number(item.endColumn),
    remediation: text(item.remediation),
    documentationUrl: text(item.documentationUrl) ?? text(item.documentation_url),
    category: text(item.category),
    framework: text(item.framework),
    tool: text(item.tool),
  };
}

function buildSummary(findings: SafeAiFinding[]): SafeAiSummary {
  const bySeverity: Record<SafeAiSeverity, number> = { critical: 0, high: 0, medium: 0, low: 0, info: 0 };
  for (const f of findings) {
    bySeverity[f.severity]++;
  }
  return { totalFindings: findings.length, bySeverity };
}

export function parseSafeAiJson(output: string): SafeAiScanResult {
  let raw: unknown;
  try {
    raw = JSON.parse(output);
  } catch {
    throw new Error('SafeAI did not return valid JSON.');
  }

  const report = raw && typeof raw === 'object' ? raw as Record<string, unknown> : undefined;
  const candidates = Array.isArray(raw) ? raw : Array.isArray(report?.findings) ? report.findings : [];
  const findings = candidates.map(parseFinding).filter((f): f is SafeAiFinding => Boolean(f));

  let trustScore: number | undefined;
  if (report) {
    const ts = number(report.trustScore) ?? number(report.trust_score);
    if (ts !== undefined && ts >= 0 && ts <= 100) trustScore = ts;
  }

  const summary = buildSummary(findings);
  summary.trustScore = trustScore;

  return { findings, summary, raw };
}

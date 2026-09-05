export type SafeAiSeverity = 'critical' | 'high' | 'medium' | 'low' | 'info';

export interface SafeAiFinding {
  ruleId: string;
  severity: SafeAiSeverity;
  message: string;
  filePath?: string;
  line?: number;
  column?: number;
  endLine?: number;
  endColumn?: number;
  remediation?: string;
  documentationUrl?: string;
  category?: string;
  framework?: string;
  tool?: string;
}

export interface SafeAiSummary {
  totalFindings: number;
  bySeverity: Record<SafeAiSeverity, number>;
  trustScore?: number;
}

export interface SafeAiScanResult {
  findings: SafeAiFinding[];
  summary: SafeAiSummary;
  raw: unknown;
}

export interface SafeAiCliInfo {
  path: string;
  version: string | null;
  isValid: boolean;
  isModule: boolean;
}

export interface ScanOptions {
  cliPath: string;
  pythonPath: string;
  extraArgs: string[];
  timeout: number;
  severityThreshold: SafeAiSeverity;
}

export interface ScanTarget {
  fsPath: string;
  isFile: boolean;
  workspaceFolder: string;
}

export const SEVERITY_ORDER: Record<SafeAiSeverity, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
  info: 4,
};

export const SEVERITY_LABELS: Record<SafeAiSeverity, string> = {
  critical: 'Critical',
  high: 'High',
  medium: 'Medium',
  low: 'Low',
  info: 'Info',
};

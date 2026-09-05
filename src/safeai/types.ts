export type SafeAiSeverity = 'critical' | 'high' | 'medium' | 'low' | 'info';

export interface SafeAiFinding {
  ruleId: string;
  severity: SafeAiSeverity;
  message: string;
  filePath?: string;
  line?: number;
  column?: number;
  remediation?: string;
  documentationUrl?: string;
}

export interface SafeAiScanResult {
  findings: SafeAiFinding[];
  raw: unknown;
}

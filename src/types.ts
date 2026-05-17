// src/types.ts

export type Severity = "critical" | "warning" | "suggestion";

export interface ReviewIssueV2 {
  type: "architecture" | "readability" | "naming" | "complexity" | "maintainability" | "security" | "performance";
  severity: Severity;
  description: string;
  file?: string;      // opsional: nama file tempat issue ditemukan
  line?: number;      // opsional: line number
  suggestion?: string; // opsional: saran perbaikan
}

export interface ReviewResultV2 {
  decision: "APPROVE" | "REJECT";
  summary: {
    totalIssues: number;
    critical: number;
    warning: number;
    suggestion: number;
  };
  issues: ReviewIssueV2[];
}
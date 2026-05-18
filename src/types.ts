// src/types.ts

export type Severity = "critical" | "warning" | "suggestion";
export type Provider = "openai" | "deepseek" | "nvidia";

export interface ReviewIssueV2 {
  type: "architecture" | "readability" | "naming" | "complexity" | "maintainability" | "security" | "performance";
  severity: Severity;
  description: string;
  file?: string;
  line?: number;
  suggestion?: string;
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

export interface APIRequest {
  model: string;
  temperature: number;
  maxTokens: number;
  messages: Array<{ role: "system" | "user"; content: string }>;
}

export interface APIResponse {
  id?: string;
  choices?: Array<{ message?: { content?: string; reasoning?: string } }>;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
  [key: string]: any;
}

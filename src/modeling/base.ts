// src/modeling/base.ts
import type { APIRequest, APIResponse, Provider } from "../types";

export interface ModelAdapter {
  readonly provider: Provider;
  readonly modelName: string;

  buildRequest(systemPrompt: string, userContent: string): APIRequest;
  extractContent(response: APIResponse): string;
  getAPIEndpoint(): string;
  getHeaders(): Record<string, string>;
}

export function extractJSONFromResponse(content: string): any {
  let cleaned = content.trim();
  const codeBlockMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlockMatch) cleaned = codeBlockMatch[1].trim();

  const sanitized = sanitizeJSON(cleaned);
  try {
    return JSON.parse(sanitized);
  } catch (err) {
    throw new Error(`Invalid JSON: ${sanitized.substring(0, 200)}`);
  }
}

export function sanitizeJSON(raw: string): string {
  const firstBrace = raw.indexOf('{');
  if (firstBrace === -1) throw new Error("No opening brace found");

  let cleaned = raw.slice(firstBrace);
  let braceCount = 0;
  let lastValidIndex = -1;

  for (let i = 0; i < cleaned.length; i++) {
    if (cleaned[i] === '{') braceCount++;
    else if (cleaned[i] === '}') {
      braceCount--;
      if (braceCount === 0) {
        lastValidIndex = i;
        break;
      }
    }
  }

  if (lastValidIndex !== -1) cleaned = cleaned.substring(0, lastValidIndex + 1);
  cleaned = cleaned.replace(/,\s*}/g, '}').replace(/,\s*]/g, ']');

  return cleaned;
}
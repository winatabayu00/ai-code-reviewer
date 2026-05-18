// src/modeling/nvidia/nemotron-3-nano-omni-free/adapter.ts
import { ModelAdapter } from '../../base';
import type { APIRequest, APIResponse } from '../../../types';

function extractJSONFromText(text: string): string {
  const firstBrace = text.indexOf('{');
  if (firstBrace === -1) return "";

  let braceCount = 0;
  let lastValid = -1;
  for (let i = firstBrace; i < text.length; i++) {
    if (text[i] === '{') braceCount++;
    if (text[i] === '}') {
      braceCount--;
      if (braceCount === 0) {
        lastValid = i;
        break;
      }
    }
  }
  if (lastValid === -1) return "";

  let jsonStr = text.substring(firstBrace, lastValid + 1);
  jsonStr = jsonStr.replace(/,\s*}/g, '}').replace(/,\s*]/g, ']');
  return jsonStr;
}

export class OpenAiGptOs120bFreeAdapter implements ModelAdapter {
  readonly provider = "openai" as const;
  readonly modelName = "openai/gpt-oss-120b:free";

  buildRequest(systemPrompt: string, userContent: string): APIRequest {
    return {
      model: this.modelName,
      temperature: 0,
      maxTokens: 2000,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userContent }
      ]
    };
  }

  extractContent(response: APIResponse): string {
    return response.choices?.[0]?.message?.content || "";
  }

  getAPIEndpoint(): string {
    return "https://openrouter.ai/api/v1/chat/completions";
  }

  getHeaders(): Record<string, string> {
    return {
      Authorization: `Bearer ${process.env.OPENROUTER_API_KEY || ""}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "http://localhost:3000",
      "X-Title": "ai-code-reviewer"
    };
  }
}
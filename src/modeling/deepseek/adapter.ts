// src/modeling/deepseek/adapter.ts
import { ModelAdapter } from "../base";
import type { APIRequest, APIResponse } from "../../types";

export class DeepSeekAdapter implements ModelAdapter {
  readonly provider = "deepseek" as const;
  readonly modelName = "deepseek/deepseek-chat";

  buildRequest(systemPrompt: string, userContent: string): APIRequest {
    return {
      model: this.modelName,
      temperature: 0,
      maxTokens: 2048,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userContent }
      ]
    };
  }

  extractContent(response: APIResponse): string {
    const content = response.choices?.[0]?.message?.content;
    return content?.trim() || "";
  }

  getAPIEndpoint(): string {
    return process.env.OPENROUTER_ENDPOINT || '';
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
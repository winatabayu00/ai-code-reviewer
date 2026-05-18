// src/api-client.ts
import axios from "axios";
import type { APIRequest, APIResponse } from "./types";
import type { ModelAdapter } from "./modeling/base";

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function createAndSend(
  adapter: ModelAdapter,
  request: APIRequest,
  retries: number = 3
): Promise<{ response: APIResponse; content: string }> {
  const payload = {
    model: request.model,
    temperature: request.temperature,
    max_tokens: request.maxTokens,
    messages: request.messages
  };

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const response = await axios.post<APIResponse>(
        adapter.getAPIEndpoint(),
        payload,
        {
          headers: adapter.getHeaders(),
          timeout: 120000
        }
      );

      const content = adapter.extractContent(response.data);
      return { response: response.data, content };
    } catch (err: any) {
      const status = err?.response?.status;
      const isRetryable = status === 429 || status === 503 || status === 502 || status === 504;

      if (!isRetryable || attempt === retries - 1) {
        throw err;
      }

      const delayMs = Math.pow(2, attempt) * 1000 + Math.random() * 1000;
      console.log(`⏳ Request failed (${status}), retrying in ${Math.round(delayMs)}ms... (attempt ${attempt + 1}/${retries})`);
      await sleep(delayMs);
    }
  }

  throw new Error("Max retries exceeded");
}



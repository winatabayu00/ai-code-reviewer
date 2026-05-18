// src/modeling/factory.ts
import type { Provider } from "../types";
import type { ModelAdapter } from "./base";
import { DeepSeekAdapter } from "./deepseek/adapter";
import { NvidiaNemotronAdapter } from "./nvidia/nemotron-3-nano-omni-free/adapter";
import { OpenAiGptOs120bFreeAdapter } from "./openai/gpt-oss-120b-free/adapter";

export function getModelAdapter(provider?: Provider | string): ModelAdapter {
  const selected = (provider || process.env.AI_MODEL_TYPE || "nvidia") as string;

  if (selected.includes("openai") || selected === "openai") return new OpenAiGptOs120bFreeAdapter();
  if (selected.includes("deepseek") || selected === "deepseek") return new DeepSeekAdapter();
  return new NvidiaNemotronAdapter();
}

export const DEFAULT_CONFIG = {
  temperature: 0,
  maxTokens: 2048,
  timeout: 60000,
  retries: 2
};

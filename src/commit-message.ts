// src/commit-message.ts
import dotenv from "dotenv";
import { COMMIT_MESSAGE_PROMPT } from "./prompts";
import { getModelAdapter } from "./modeling/factory";
import { createAndSend } from "./api-client";

dotenv.config();

export async function generateCommitMessage(diff: string): Promise<string> {
  const adapter = getModelAdapter();
  console.log(`📝 Generating commit message using model: ${adapter.modelName}`);

  const request = adapter.buildRequest(COMMIT_MESSAGE_PROMPT, diff || "No changes detected");
  const { content } = await createAndSend(adapter, request);

  console.log(content);

  if (!content.trim()) throw new Error("Empty AI response");

  let message = content.replace(/```[\s\S]*?```/g, "").trim();

  const lines = message.split("\n");
  const cleanedLines: string[] = [];
  let foundSubject = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (/^(here|commit message|sure|output|following|this is)/i.test(trimmed)) continue;
    if (trimmed === "") {
      if (cleanedLines.length > 0 && cleanedLines[cleanedLines.length - 1] !== "") {
        cleanedLines.push("");
      }
      continue;
    }
    if (trimmed.startsWith("-")) {
      cleanedLines.push(trimmed);
      continue;
    }
    if (!foundSubject && trimmed.length > 0) {
      cleanedLines.push(trimmed);
      foundSubject = true;
      continue;
    }
    if (trimmed.length > 0) {
      cleanedLines.push(trimmed);
    }
  }

  message = cleanedLines.join("\n").trim();
  if (!message) throw new Error("No valid commit message after cleaning");

  const firstLine = message.split("\n")[0];
  const typePattern = /^(feat|fix|docs|style|refactor|perf|test|chore)(\([a-z][a-z0-9\-]*\))?: [a-z][a-z0-9\s\-]{1,70}$/;
  if (!typePattern.test(firstLine)) {
    throw new Error(`Generated message does not follow Conventional Commits format: ${firstLine}`);
  }

  return message;
}
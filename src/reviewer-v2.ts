// src/reviewer-v2.ts
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import type { ReviewResultV2, ReviewIssueV2 } from "./types";
import { getModelAdapter } from "./modeling/factory";
import { createAndSend } from "./api-client";

dotenv.config();

function loadReviewerContext(): string {
  const possiblePaths = [
    path.join(process.cwd(), "docs", "reviewer-context.md"),
    path.join(process.cwd(), ".ai", "reviewer-context.md"),
    path.join(process.cwd(), "reviewer-context.md"),
  ];
  for (const filePath of possiblePaths) {
    if (fs.existsSync(filePath)) {
      try {
        const content = fs.readFileSync(filePath, "utf-8");
        console.log(`📄 Loaded reviewer context from ${filePath}`);
        return content;
      } catch (err) {
        console.warn(`⚠️ Failed to read ${filePath}:`, err);
      }
    }
  }
  return "";
}

function simpleParseJSON(content: string): any {
  try {
    return JSON.parse(content);
  } catch {
    // Cari JSON di dalam teks
    const match = content.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("No JSON found");
    let jsonStr = match[0].replace(/,\s*}/g, '}').replace(/,\s*]/g, ']');
    return JSON.parse(jsonStr);
  }
}

export async function reviewCodeV2(diff: string): Promise<ReviewResultV2> {
  const customContext = loadReviewerContext();

  const systemPrompt = `You are a code reviewer. Output ONLY valid JSON, no other text.
${customContext ? `Context: ${customContext}` : ""}
Example: {"decision":"APPROVE","issues":[{"type":"architecture","severity":"critical","description":"issue","suggestion":"fix"}]}
If no issues: {"decision":"APPROVE","issues":[]}`;

  const userPrompt = `Review code:\n${diff || "No changes"}`;

  const adapter = getModelAdapter("nvidia");
  console.log(`🤖 Using model: ${adapter.modelName}`);

  const request = adapter.buildRequest(systemPrompt, userPrompt);
  request.maxTokens = 1024;

  const { content } = await createAndSend(adapter, request);

  if (!content) throw new Error("Empty AI response");

  let parsed;
  try {
    parsed = simpleParseJSON(content);
  } catch (err) {
    console.error("Failed to parse, raw content:", content.substring(0, 500));
    throw new Error(`Failed to parse AI response: ${err instanceof Error ? err.message : err}`);
  }

  const issues: ReviewIssueV2[] = Array.isArray(parsed.issues) ? parsed.issues : [];
  const summary = {
    totalIssues: issues.length,
    critical: issues.filter(i => i.severity === "critical").length,
    warning: issues.filter(i => i.severity === "warning").length,
    suggestion: issues.filter(i => i.severity === "suggestion").length,
  };

  return {
    decision: parsed.decision === "REJECT" ? "REJECT" : "APPROVE",
    summary,
    issues,
  };
}
// src/update-brain.ts
import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import { contexts } from "./contexts";
import { getGitDiff } from "./git";
import { filterFullDiff } from "./filters";
import { getModelAdapter } from "./modeling/factory";
import { createAndSend } from "./api-client";

dotenv.config();

// ============================================================
// 1. Baca file-file kunci untuk dipelajari AI
// ============================================================
function gatherCodeSamples(): string {
  const srcDir = path.join(process.cwd(), "src");
  const importantFiles = [
    "modeling/base.ts",
    "modeling/factory.ts",
    "api-client.ts",
    "reviewer-v2.ts",
    "filters.ts",
    "contexts.ts",
    "prompts.ts",
    "types.ts",
  ];
  let samples = "";
  for (const relPath of importantFiles) {
    const fullPath = path.join(srcDir, relPath);
    if (fs.existsSync(fullPath)) {
      const content = fs.readFileSync(fullPath, "utf-8");
      // Batasi panjang agar tidak overload
      const truncated = content.length > 2000 ? content.slice(0, 2000) + "\n... (truncated)" : content;
      samples += `\n### File: ${relPath}\n\`\`\`typescript\n${truncated}\n\`\`\`\n`;
    }
  }
  return samples;
}

// ============================================================
// 2. Minta AI untuk menganalisis kode dan menghasilkan konteks
// ============================================================
async function generateContextWithAI(): Promise<string> {
  const codeSamples = gatherCodeSamples();
  const systemPrompt = `You are an expert software architect. Analyze the provided TypeScript code files and produce a concise "AI Code Reviewer Context" markdown document. This document will be used by an AI reviewer to understand the project's architecture, patterns, coding style, and review focus.

Output ONLY valid markdown. Do not include extra text. Use the following structure:

# AI Code Reviewer Context

## Project Stack
(Derived from package.json or inferred)

## Coding Style Guidelines
(Indentation, quotes, semicolons, naming conventions observed in the code)

## Architecture Overview
(Describe main components: adapters, API client, filters, etc.)

## Key Patterns
(List important design patterns: e.g., ModelAdapter, factory, etc.)

## Response Format Standard
(If any consistent response format is used, describe it)

## Required Review Focus
(What to check in code reviews: e.g., adapter implementation, error handling, etc.)

## Instructions for AI Reviewer
(How to use this context)

Base your analysis strictly on the provided code. Be accurate and practical.`;

  const userPrompt = `Here are the important code files from the project:\n\n${codeSamples}\n\nGenerate the "AI Code Reviewer Context" markdown document as instructed.`;

  // Gunakan DeepSeek karena stabil untuk tugas analisis
  const adapter = getModelAdapter(process.env.AI_MODEL_TYPE);
  console.log(`🤖 Generating context using AI model: ${adapter.modelName}`);

  const request = adapter.buildRequest(systemPrompt, userPrompt);
  request.maxTokens = 4000;
  request.temperature = 0.2;

  const { content } = await createAndSend(adapter, request);
  if (!content) throw new Error("AI failed to generate context");
  console.log(content);
  return content;
}

// ============================================================
// 3. Main update function
// ============================================================
async function updateBrain() {
  console.log("🧠 Generating AI reviewer context from project code (AI analysis)...");
  try {
    const aiContext = await generateContextWithAI();
    const contextPath = path.join(process.cwd(), "docs", "reviewer-context.md");
    const dir = path.dirname(contextPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(contextPath, aiContext, "utf-8");
    console.log(`✅ Updated ${contextPath} with AI-generated context.`);
  } catch (err) {
    console.error("❌ Failed to generate context with AI:", err);
    // Fallback: buat context minimal
    const fallback = `# AI Code Reviewer Context\n\nProject is a TypeScript Node.js application.\nSee code files for details.\n`;
    fs.writeFileSync(path.join(process.cwd(), "docs", "reviewer-context.md"), fallback);
    console.log("⚠️ Used fallback context due to AI error.");
  }

  console.log("🔄 Updating known files & functions from git diff...");
  const rawDiff = await getGitDiff();
  if (rawDiff.trim()) {
    const filteredDiff = filterFullDiff(rawDiff);
    contexts.updateFromDiff(filteredDiff);
    console.log("✅ Updated state (known files/functions).");
  } else {
    console.log("No staged changes, state unchanged.");
  }

  console.log("🎉 AI brain update complete. Reviewer will now understand project architecture.");
}

updateBrain().catch(console.error);
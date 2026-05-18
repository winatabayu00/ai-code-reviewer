// src/reviewer.ts
import axios from "axios";
import dotenv from "dotenv";
import { CODE_REVIEW_V1_PROMPT } from "./prompts";

dotenv.config();

export interface ReviewIssue {
  type: "architecture" | "readability" | "naming" | "complexity" | "maintainability";
  description: string;
}

export interface ReviewResult {
  decision: "APPROVE" | "REJECT";
  issues: ReviewIssue[];
}

export async function reviewCode(diff: string): Promise<ReviewResult> {
  const res = await axios.post(
    "https://openrouter.ai/api/v1/chat/completions",
    {
      model: process.env.AI_MODEL_TYPE,
      temperature: 0,
      max_tokens: 1500,
      messages: [
        {
          role: "system",
          content: CODE_REVIEW_V1_PROMPT,
        },
        {
          role: "user",
          content: diff || "No changes detected",
        },
      ],
    },
    {
      headers: {
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "http://localhost:3000",
        "X-Title": "ai-code-reviewer",
      },
    }
  );

  const choice = res.data.choices?.[0]?.message;
  if (!choice) {
    throw new Error("No AI response choice");
  }

  const output = choice.content ?? choice.reasoning ?? "";
  if (!output || output.trim().length === 0) {
    throw new Error("Empty AI response (content + reasoning)");
  }

  if (!choice.content && choice.reasoning) {
    console.warn("⚠️ Model returned reasoning instead of content");
  }

  let jsonMatch = output.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error(`No JSON object found in AI response: ${output.substring(0, 200)}`);
  }

  let parsed;
  try {
    parsed = JSON.parse(jsonMatch[0]);
  } catch (err) {
    throw new Error(`Invalid JSON from AI: ${jsonMatch[0]}`);
  }

  if (!parsed.decision || !Array.isArray(parsed.issues)) {
    throw new Error(`Missing 'decision' or 'issues' array in AI response`);
  }

  if (parsed.decision !== "APPROVE" && parsed.decision !== "REJECT") {
    throw new Error(`Invalid decision value: ${parsed.decision}`);
  }

  for (const issue of parsed.issues) {
    if (!issue.type || !issue.description) {
      throw new Error(`Malformed issue object: ${JSON.stringify(issue)}`);
    }
    const allowedTypes = ["architecture", "readability", "naming", "complexity", "maintainability"];
    if (!allowedTypes.includes(issue.type)) {
      throw new Error(`Unknown issue type: ${issue.type}`);
    }
  }

  return parsed as ReviewResult;
}
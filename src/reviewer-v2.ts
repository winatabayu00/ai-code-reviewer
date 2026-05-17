// src/reviewer-v2.ts
import axios from "axios";
import dotenv from "dotenv";
import { ReviewResultV2, ReviewIssueV2 } from "./types";

dotenv.config();

/**
 * Mengekstrak objek JSON pertama dari response AI yang mungkin
 * mengandung teks tambahan, markdown code blocks, atau multiple JSON.
 */
function extractJSON(content: string): any {
  // 1. Trim whitespace
  let cleaned = content.trim();

  // 2. Hapus markdown code blocks (```json ... ``` or ``` ... ```)
  const codeBlockMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlockMatch) {
    cleaned = codeBlockMatch[1].trim();
  }

  // 3. Coba parse langsung
  try {
    return JSON.parse(cleaned);
  } catch (e) {
    // 4. Cari dengan regex greedy (ambil dari { pertama sampai } terakhir)
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("No JSON object found in AI response");
    }
    let jsonStr = jsonMatch[0];

    // 5. Perbaiki trailing commas (sederhana: hapus koma sebelum } atau ])
    jsonStr = jsonStr.replace(/,\s*}/g, '}').replace(/,\s*]/g, ']');

    try {
      return JSON.parse(jsonStr);
    } catch (innerErr) {
      throw new Error(`Invalid JSON even after cleaning: ${jsonStr.substring(0, 200)}`);
    }
  }
}

export async function reviewCodeV2(diff: string): Promise<ReviewResultV2> {
  const systemPrompt = `
You are a Senior Staff Engineer doing REAL code review with severity levels.

Rules:
- Ignore .env keys unless exposed in code (not diff)
- Only flag issues that are production-relevant
- Do NOT comment on intentional renames in diff unless harmful
- Be strict but realistic
- Assign severity: "critical" (bugs, security, data loss), "warning" (code smell, performance), "suggestion" (style, minor refactor)

Output ONLY valid JSON with this schema. Do NOT include any explanation, markdown formatting, or extra text.
{
  "decision": "APPROVE" | "REJECT",
  "issues": [
    {
      "type": "architecture|readability|naming|complexity|maintainability|security|performance",
      "severity": "critical|warning|suggestion",
      "description": "specific explanation tied to code diff",
      "file": "optional filename",
      "line": optional number,
      "suggestion": "optional fix"
    }
  ]
}

If no issues, return empty array.
`;

  const res = await axios.post(
    "https://openrouter.ai/api/v1/chat/completions",
    {
      model: "deepseek/deepseek-v4-flash",  // ✅ FIXED: model name
      temperature: 0,
      max_tokens: 2000,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: diff || "No changes" }
      ]
    },
    {
      headers: {
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "http://localhost:3000",
        "X-Title": "ai-code-reviewer-v2"
      },
      timeout: 30000  // ✅ ADDED: 30 second timeout
    }
  );

  const choice = res.data.choices?.[0]?.message;
  if (!choice) throw new Error("No AI response");

  let content = choice.content ?? "";
  if (!content.trim()) throw new Error("Empty AI response");

  let parsed: any;
  try {
    parsed = extractJSON(content);
  } catch (err) {
    throw new Error(`Failed to parse AI response: ${err instanceof Error ? err.message : err}\nRaw content: ${content.substring(0, 300)}`);
  }

  const issues: ReviewIssueV2[] = Array.isArray(parsed.issues) ? parsed.issues : [];
  const summary = {
    totalIssues: issues.length,
    critical: issues.filter(i => i.severity === "critical").length,
    warning: issues.filter(i => i.severity === "warning").length,
    suggestion: issues.filter(i => i.severity === "suggestion").length,
  };

  const result: ReviewResultV2 = {
    decision: parsed.decision === "REJECT" ? "REJECT" : "APPROVE",
    summary,
    issues,
  };
  return result;
}
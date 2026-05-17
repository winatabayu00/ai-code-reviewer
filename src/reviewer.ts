import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

export async function reviewCode(diff: string) {
  const res = await axios.post(
    "https://openrouter.ai/api/v1/chat/completions",
    {
      model: "deepseek/deepseek-v4-flash",
      temperature: 0,
      max_tokens: 500,
      messages: [
        {
          role: "system",
          content: `
You are a Senior Staff Engineer doing REAL code review.

Rules:
- Ignore .env keys unless exposed in code (not diff)
- Only flag issues that are production-relevant
- Do NOT comment on intentional renames in diff unless harmful
- Be strict but realistic
- Avoid generic advice

Output ONLY JSON:
{
  "decision": "APPROVE | REJECT",
  "issues": [
    {
      "type": "architecture | readability | naming | complexity | maintainability",
      "description": "specific explanation tied to code diff"
    }
  ]
}
          `
        },
        {
          role: "user",
          content: diff || "No changes detected"
        }
      ]
    },
    {
      headers: {
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "http://localhost:3000",
        "X-Title": "ai-code-reviewer"
      }
    }
  );

  const choice = res.data.choices?.[0]?.message;

  if (!choice) {
    throw new Error("No AI response choice");
  }

  const output =
    choice.content ??
    choice.reasoning ??
    "";

  if (!output || output.trim().length === 0) {
    throw new Error("Empty AI response (content + reasoning)");
  }

  if (!choice.content && choice.reasoning) {
    console.warn("⚠️ Model returned reasoning instead of content");
  }

  return output;
}
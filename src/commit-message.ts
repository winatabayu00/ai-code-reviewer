import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

export async function generateCommitMessage(diff: string): Promise<string> {
  const res = await axios.post(
    "https://openrouter.ai/api/v1/chat/completions",
    {
      model: "deepseek/deepseek-chat",
      temperature: 0.3,
      max_tokens: 200,
      messages: [
        {
          role: "system",
          content: `
You are an expert software engineer. Generate a concise, meaningful git commit message based on the provided git diff.

Rules:
- Follow Conventional Commits format: <type>(<scope>): <subject>
- Types: feat, fix, docs, style, refactor, perf, test, chore
- Subject: imperative, lowercase, max 72 chars
- Body (optional, only if needed): explain WHAT and WHY, not HOW
- Do NOT add any extra text, explanation, or markdown outside the commit message.
- Output ONLY the commit message (single line or multi-line, but no backticks).
          `,
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
        "X-Title": "ai-commit-message",
      },
    }
  );

  const choice = res.data.choices?.[0]?.message;
  if (!choice) throw new Error("No AI response choice");

  let message = choice.content ?? choice.reasoning ?? "";
  if (!message.trim()) throw new Error("Empty AI response");

  message = message.replace(/```[\s\S]*?```/g, "").trim();
  const lines = message.split("\n");
  const cleanedLines = lines.filter((line: string) =>   // <-- tambah tipe :string
    !line.match(/^(here|commit message|sure|output|following)/i)
  );
  message = cleanedLines.join("\n").trim();

  if (!message) throw new Error("No valid commit message after cleaning");
  return message;
}
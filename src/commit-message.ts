import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

export async function generateCommitMessage(diff: string): Promise<string> {
  const res = await axios.post(
    "https://openrouter.ai/api/v1/chat/completions",
    {
      model: "deepseek/deepseek-v4-flash",
      temperature: 0.3,
      max_tokens: 500,
      messages: [
        {
          role: "system",
          content: `
You are an expert software engineer. Generate a git commit message based on the provided diff.

Follow this EXACT format (GitHub standard):
1. First line: <type>(<scope>): <subject>
   - Allowed types: feat, fix, docs, style, refactor, perf, test, chore
   - Scope is optional, use lowercase with hyphens if needed (e.g., auth, api, ui)
   - Subject: imperative, lowercase, max 72 chars, no period at end
2. Then a blank line
3. Then a bullet list (each line starting with '- ') describing WHAT changed (one bullet per logical change)
   - Use past tense or imperative
   - No extra empty lines between bullets

Example:
feat(auth): add login with Google OAuth

- Add Google OAuth strategy using passport
- Create callback handler for /auth/google/callback
- Store user profile in session

Rules:
- Output ONLY the commit message (no extra text, no markdown, no backticks)
- If the diff has only one trivial change, you may omit the bullet list (just the subject line)
- Do NOT include any introductory phrases like "Here is the commit message"
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
      timeout: 15000,
    }
  );

  const choice = res.data.choices?.[0]?.message;
  if (!choice) throw new Error("No AI response choice");

  let message = choice.content ?? choice.reasoning ?? "";
  if (!message.trim()) throw new Error("Empty AI response");

  // Remove markdown code blocks
  message = message.replace(/```[\s\S]*?```/g, "").trim();

  // Split into lines and clean
  const lines = message.split("\n");
  const cleanedLines: string[] = [];
  let foundSubject = false;

  for (const line of lines) {
    const trimmed = line.trim();
    // Skip lines that are AI commentary (common prefixes)
    if (/^(here|commit message|sure|output|following|this is)/i.test(trimmed)) continue;
    // Keep empty lines (for blank line between subject and body)
    if (trimmed === "") {
      // Only keep one blank line at most
      if (cleanedLines.length > 0 && cleanedLines[cleanedLines.length - 1] !== "") {
        cleanedLines.push("");
      }
      continue;
    }
    // Keep bullet points (starting with '-')
    if (trimmed.startsWith("-")) {
      cleanedLines.push(trimmed);
      continue;
    }
    // Keep subject line (first non-empty, non-bullet line)
    if (!foundSubject && trimmed.length > 0) {
      cleanedLines.push(trimmed);
      foundSubject = true;
      continue;
    }
    // Any other line (should not happen in good output) - keep if not empty
    if (trimmed.length > 0) {
      cleanedLines.push(trimmed);
    }
  }

  // Join back
  message = cleanedLines.join("\n").trim();

  if (!message) throw new Error("No valid commit message after cleaning");

  // Validate format: first line must match type(scope?): subject
  const firstLine = message.split("\n")[0];
  const typePattern = /^(feat|fix|docs|style|refactor|perf|test|chore)(\([a-z][a-z0-9\-]*\))?: [a-z][a-z0-9\s\-]{1,70}$/;
  if (!typePattern.test(firstLine)) {
    throw new Error(`Generated message does not follow Conventional Commits format: ${firstLine}`);
  }

  return message;
}
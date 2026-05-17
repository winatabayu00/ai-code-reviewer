import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

export async function reviewCode(diff: string) {
  const res = await axios.post(
    "https://openrouter.ai/api/v1/chat/completions",
    {
      model: "deepseek/deepseek-chat",
      messages: [
        {
          role: "system",
          content: `
You are a Senior Software Engineer.

Review code strictly:
- architecture
- readability
- naming
- complexity
- maintainability

Output ONLY JSON:
{
  "decision": "APPROVE | REJECT",
  "issues": []
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
        "Content-Type": "application/json"
      }
    }
  );

  return res.data.choices[0].message.content;
}
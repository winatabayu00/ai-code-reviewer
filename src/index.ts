import { getGitDiff } from "./git";
import { reviewCode, ReviewResult } from "./reviewer";

async function main() {
  console.log("🔍 Reading git diff...\n");

  let diff: string;
  try {
    diff = await getGitDiff();
  } catch (err) {
    console.error("❌ Failed to read git diff:", err);
    process.exit(1);
  }

  if (!diff || diff.trim().length === 0) {
    console.log("✅ No changes detected. Nothing to review.");
    return;
  }

  console.log("🤖 Sending to Senior Engineer AI (this may take a few seconds)...\n");

  let result: ReviewResult;
  try {
    result = await reviewCode(diff);
  } catch (err) {
    console.error("❌ AI review failed:", err instanceof Error ? err.message : err);
    process.exit(1);
  }

  console.log("📋 AI REVIEW RESULT:\n");
  console.log(`Decision: ${result.decision === "APPROVE" ? "✅ APPROVE" : "❌ REJECT"}\n`);

  if (result.issues.length === 0) {
    console.log("No issues found. Good job!");
  } else {
    console.log("Issues:");
    for (const issue of result.issues) {
      console.log(`  • [${issue.type}] ${issue.description}`);
    }
  }

  // ✅ Exit dengan kode error jika REJECT, berguna untuk CI/CD
  if (result.decision === "REJECT") {
    process.exit(1);
  }
}

main();
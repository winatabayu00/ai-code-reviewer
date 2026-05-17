import { getGitDiff } from "./git";
import { generateCommitMessage } from "./commit-message";

async function main() {
  console.log("📝 Generating AI commit message...\n");

  let diff: string;
  try {
    diff = await getGitDiff();
  } catch (err) {
    console.error("❌ Failed to read git diff:", err);
    process.exit(1);
  }

  if (!diff || diff.trim().length === 0) {
    console.log("❌ No changes detected. Stage your changes first (git add).");
    process.exit(1);
  }

  console.log("🤖 Asking AI to write commit message...\n");

  let message: string;
  try {
    message = await generateCommitMessage(diff);
  } catch (err) {
    console.error("❌ Failed to generate commit message:", err instanceof Error ? err.message : err);
    process.exit(1);
  }

  console.log("✅ Suggested commit message:\n");
  console.log("─".repeat(50));
  console.log(message);
  console.log("─".repeat(50));
  console.log("\n💡 You can use it with: git commit -m \"<message>\"");
  console.log("   Or copy-paste the above.");
}

main();
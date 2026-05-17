import { getGitDiff } from "./git";
import { reviewCode } from "./reviewer";

async function main() {
  console.log("🔍 Reading git diff...\n");

  const diff = getGitDiff();

  if (!diff) {
    console.log("No changes found.");
    return;
  }

  console.log("🤖 Sending to Senior Engineer AI...\n");

  const result = await reviewCode(diff);

  console.log("📋 AI REVIEW RESULT:\n");
  console.log(result);
}

main();
// src/index-v2.ts
import { getGitDiff } from "./git";
import { filterFullDiff } from "./filters";
import { reviewCodeV2 } from "./reviewer-v2";
import { ReviewResultV2 } from "./types";

async function main() {
  console.log("🔍 Reading git diff...\n");
  const rawDiff = await getGitDiff();
  if (!rawDiff.trim()) {
    console.log("✅ No changes detected.");
    return;
  }

  console.log("🧹 Filtering noise (ignored files & whitespace-only changes)...\n");
  const filteredDiff = filterFullDiff(rawDiff);
  if (!filteredDiff.trim()) {
    console.log("⚠️ All changes were filtered out as noise. Nothing to review.");
    return;
  }

  console.log("🤖 Sending filtered diff to AI for review + severity...\n");
  let result: ReviewResultV2;
  try {
    result = await reviewCodeV2(filteredDiff);
  } catch (err) {
    console.error("❌ AI review failed:", err instanceof Error ? err.message : err);
    process.exit(1);
  }

  // Cetak structured report
  console.log("\n📋 AI REVIEW RESULT (with severity)\n");
  console.log(`Decision: ${result.decision === "APPROVE" ? "✅ APPROVE" : "❌ REJECT"}\n`);
  console.log(`📊 Summary: ${result.summary.totalIssues} issues total`);
  console.log(`   🔴 Critical: ${result.summary.critical}`);
  console.log(`   🟡 Warning : ${result.summary.warning}`);
  console.log(`   🔵 Suggestion: ${result.summary.suggestion}\n`);

  if (result.issues.length > 0) {
    console.log("Issues details:");
    for (const issue of result.issues) {
      const severityIcon =
        issue.severity === "critical" ? "🔴" : issue.severity === "warning" ? "🟡" : "🔵";
      console.log(`  ${severityIcon} [${issue.severity}] (${issue.type}): ${issue.description}`);
      if (issue.suggestion) console.log(`     💡 Suggestion: ${issue.suggestion}`);
      if (issue.file) console.log(`     📁 File: ${issue.file}${issue.line ? `:${issue.line}` : ""}`);
    }
  } else {
    console.log("✨ No issues found. Great code!");
  }

  if (result.decision === "REJECT") process.exit(1);
}

main();
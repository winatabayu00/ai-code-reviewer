import { execSync } from "child_process";

export function getGitDiff(): string {
  try {
    return execSync("git diff").toString();
  } catch (err) {
    return "";
  }
}
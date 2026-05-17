import { exec } from "child_process";
import { promisify } from "util";

const execPromise = promisify(exec);

export async function getGitDiff(): Promise<string> {
  try {
    const { stdout } = await execPromise("git diff");
    return stdout;
  } catch (err) {
    return "";
  }
}
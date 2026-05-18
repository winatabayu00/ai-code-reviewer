// src/contexts.ts
import fs from "fs";
import path from "path";

const CONTEXT_MD_PATH = path.join(process.cwd(), "docs", "reviewer-context.md");
const STATE_JSON_PATH = path.join(process.cwd(), ".ai", "context-state.json");

// ------------------------------------------------------------
// 1. Deteksi stack project
// ------------------------------------------------------------
function detectProjectStack(): { language: string; framework: string; testing: string } {
  let language = "unknown";
  let framework = "unknown";
  let testing = "unknown";

  if (fs.existsSync(path.join(process.cwd(), "package.json"))) {
    language = "JavaScript/TypeScript";
    try {
      const pkg = JSON.parse(fs.readFileSync(path.join(process.cwd(), "package.json"), "utf-8"));
      const deps = { ...pkg.dependencies, ...pkg.devDependencies };
      if (deps.react) framework = "React";
      else if (deps.vue) framework = "Vue";
      else if (deps.next) framework = "Next.js";
      else if (deps.express) framework = "Express";
      else framework = "Node.js";
      if (deps.jest) testing = "Jest";
      else if (deps.vitest) testing = "Vitest";
    } catch {}
  } else if (fs.existsSync(path.join(process.cwd(), "composer.json"))) {
    language = "PHP";
    try {
      const composer = JSON.parse(fs.readFileSync(path.join(process.cwd(), "composer.json"), "utf-8"));
      const deps = { ...composer.require, ...composer["require-dev"] };
      if (deps.laravel) framework = "Laravel";
      else if (deps.symfony) framework = "Symfony";
      else framework = "PHP";
      if (deps.phpunit) testing = "PHPUnit";
      else if (deps.pest) testing = "Pest";
    } catch {}
  } else if (fs.existsSync(path.join(process.cwd(), "requirements.txt")) || fs.existsSync(path.join(process.cwd(), "pyproject.toml"))) {
    language = "Python";
    framework = "Unknown (detect Django/Flask from imports)";
  } else if (fs.existsSync(path.join(process.cwd(), "go.mod"))) {
    language = "Go";
  }
  return { language, framework, testing };
}

// ------------------------------------------------------------
// 2. Baca atau buat file markdown konteks
// ------------------------------------------------------------
function ensureContextFile(): string {
  if (fs.existsSync(CONTEXT_MD_PATH)) {
    return fs.readFileSync(CONTEXT_MD_PATH, "utf-8");
  }

  // Buat template dinamis berdasarkan stack
  const stack = detectProjectStack();
  const template = `# AI Code Reviewer Context

## Project Stack
- Language: ${stack.language}
- Framework: ${stack.framework}
- Testing: ${stack.testing}

## Branch Naming Convention
- feature/* , bugfix/* , hotfix/* , release/* , improvement/*

## Commit Message Standard
Format: <type>(<scope>): <subject>
Types: feat, fix, docs, style, refactor, perf, test, chore

## Coding Style Guidelines
(Adjust based on your team's preferences)

## Application Flows
Describe important flows (e.g., login, checkout) with expected request/response formats.

## API Error Response Standard
- 200: Success
- 400: Bad request (validation)
- 401: Unauthorized
- 403: Forbidden
- 404: Not found
- 422: Unprocessable entity
- 500: Internal server error

## Instructions for AI Reviewer
- Use this context when reviewing code.
- Flag any deviation from the standards as warnings or critical issues.
- Suggest fixes in line with the coding style.
`;

  const dir = path.dirname(CONTEXT_MD_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(CONTEXT_MD_PATH, template, "utf-8");
  console.log(`📝 Created default reviewer context at ${CONTEXT_MD_PATH} (please customize it!)`);
  return template;
}

// ------------------------------------------------------------
// 3. State management (known files/functions)
// ------------------------------------------------------------
function loadState(): { knownFiles: string[]; knownFunctions: string[] } {
  if (fs.existsSync(STATE_JSON_PATH)) {
    try {
      return JSON.parse(fs.readFileSync(STATE_JSON_PATH, "utf-8"));
    } catch {
      return { knownFiles: [], knownFunctions: [] };
    }
  }
  return { knownFiles: [], knownFunctions: [] };
}

function saveState(state: { knownFiles: string[]; knownFunctions: string[] }) {
  const dir = path.dirname(STATE_JSON_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(STATE_JSON_PATH, JSON.stringify(state, null, 2));
}

// ------------------------------------------------------------
// 4. Export context object
// ------------------------------------------------------------
export const contexts = {
  standards: "", // akan diisi setelah load
  knownFiles: new Set<string>(),
  knownFunctions: new Set<string>(),

  load() {
    this.standards = ensureContextFile(); // bikin atau baca file
    const state = loadState();
    this.knownFiles = new Set(state.knownFiles);
    this.knownFunctions = new Set(state.knownFunctions);
  },

  save() {
    saveState({
      knownFiles: Array.from(this.knownFiles),
      knownFunctions: Array.from(this.knownFunctions),
    });
  },

  updateFromDiff(diff: string) {
    const lines = diff.split("\n");
    let currentFile = "";
    for (const line of lines) {
      const fileMatch = line.match(/^diff --git a\/(.*) b\/(.*)$/);
      if (fileMatch) {
        currentFile = fileMatch[1];
        if (!this.knownFiles.has(currentFile)) {
          this.knownFiles.add(currentFile);
          console.log(`📄 New file detected: ${currentFile}`);
        }
      }
      if (line.startsWith("+") && !line.startsWith("+++")) {
        // Function declaration
        const funcMatch = line.match(/^\+\s*(export\s+)?function\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/);
        if (funcMatch) {
          const funcName = funcMatch[2];
          if (!this.knownFunctions.has(funcName)) {
            this.knownFunctions.add(funcName);
            console.log(`🔧 New function: ${funcName} in ${currentFile || "unknown"}`);
          }
        }
        // Arrow function / const
        const arrowMatch = line.match(/^\+\s*(export\s+)?(const|let|var)\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*=\s*\(/);
        if (arrowMatch) {
          const funcName = arrowMatch[3];
          if (!this.knownFunctions.has(funcName)) {
            this.knownFunctions.add(funcName);
            console.log(`🔧 New arrow function: ${funcName} in ${currentFile || "unknown"}`);
          }
        }
        // Class method (optional)
        const methodMatch = line.match(/^\+\s*(public|private|protected)\s+function\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/);
        if (methodMatch) {
          const methodName = methodMatch[2];
          if (!this.knownFunctions.has(methodName)) {
            this.knownFunctions.add(methodName);
            console.log(`🔧 New method: ${methodName} in ${currentFile || "unknown"}`);
          }
        }
      }
    }
    this.save();
  },

  getFullContext(): string {
    let ctx = "";
    if (this.standards) {
      ctx += `## Repository Standards (from reviewer-context.md):\n${this.standards}\n\n`;
    }
    ctx += `## Known Files (already exist):\n${Array.from(this.knownFiles).map(f => `- ${f}`).join("\n")}\n\n`;
    ctx += `## Known Functions (already exist):\n${Array.from(this.knownFunctions).map(f => `- ${f}`).join("\n")}\n`;
    return ctx;
  }
};

// Inisialisasi
contexts.load();
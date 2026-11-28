import { spawn } from "node:child_process";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

/**
 * Runs a command and resolves with its exit code and output; never rejects.
 * `timeoutMs` kills the whole process group, so an agent's child processes
 * (dev servers, MCP servers) don't outlive the task.
 */
export function run(command, args, { cwd, input, timeoutMs, env, shell = false, onStdout } = {}) {
  return new Promise((resolve) => {
    const started = Date.now();
    const child = spawn(command, args, {
      cwd,
      shell,
      env: { ...process.env, ...env },
      detached: true,
      stdio: ["pipe", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    let timedOut = false;
    child.stdout.on("data", (d) => {
      stdout += d;
      onStdout?.(String(d));
    });
    child.stderr.on("data", (d) => (stderr += d));
    const kill = () => {
      try {
        process.kill(-child.pid, "SIGTERM");
        setTimeout(() => {
          try {
            process.kill(-child.pid, "SIGKILL");
          } catch {}
        }, 5000).unref();
      } catch {}
    };
    const timer = timeoutMs ? setTimeout(() => ((timedOut = true), kill()), timeoutMs) : null;
    child.on("error", (error) => {
      stderr += String(error);
    });
    child.on("close", (code) => {
      if (timer) clearTimeout(timer);
      resolve({ code: code ?? 1, stdout, stderr, timedOut, durationMs: Date.now() - started });
    });
    if (input != null) child.stdin.end(input);
    else child.stdin.end();
  });
}

/** POSIX single-quote escaping for substituting values into a shell command. */
export const shellQuote = (value) => `'${String(value).replace(/'/g, `'\\''`)}'`;

/** "/delete/i" → RegExp; any other string is returned as is (Playwright substring match). */
export function toMatcher(value) {
  if (typeof value !== "string") return value;
  const m = value.match(/^\/(.+)\/([a-z]*)$/s);
  return m ? new RegExp(m[1], m[2]) : value;
}

/** Every file under `dir` (relative paths), skipping node_modules and dist. */
export function listFiles(dir, base = dir) {
  if (!existsSync(dir)) return [];
  const out = [];
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name === "dist" || name.startsWith(".")) continue;
    const path = join(dir, name);
    if (statSync(path).isDirectory()) out.push(...listFiles(path, base));
    else out.push(relative(base, path));
  }
  return out;
}

/** The app's own source: everything under src/ plus index.html. */
export function readSources(dir) {
  const files = listFiles(join(dir, "src")).map((f) => join("src", f));
  if (existsSync(join(dir, "index.html"))) files.push("index.html");
  return files
    .filter((f) => /\.(tsx?|jsx?|html|css)$/.test(f))
    .map((file) => ({ file, text: readFileSync(join(dir, file), "utf8") }));
}

export const truncate = (text, max = 4000) => (text.length > max ? `${text.slice(0, max)}\n… (${text.length - max} more characters)` : text);

export const escapeHtml = (value) =>
  String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

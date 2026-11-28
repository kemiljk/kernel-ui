import { readFile } from "node:fs/promises";
import path from "node:path";
import { checkCode, formatFindings } from "../lib/check.js";
import { log } from "../lib/output.js";
import type { GlobalOptions } from "../lib/types.js";

/** `kernel check <file…>`: the MCP check_code review, from a terminal or CI. */
export async function runCheck(global: GlobalOptions, rest: string[]) {
  const files = rest.filter((arg) => !arg.startsWith("-") && arg !== global.cwd);
  if (files.length === 0) throw new Error("Pass one or more files: kernel check src/App.tsx");
  let errors = 0;
  for (const file of files) {
    const findings = checkCode(await readFile(path.resolve(global.cwd, file), "utf8"));
    errors += findings.filter((f) => f.severity === "error").length;
    log(`${file}\n${formatFindings(findings).replace(/^/gm, "  ")}\n`);
  }
  if (errors > 0) process.exitCode = 1;
}

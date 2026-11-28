/**
 * Shared `--browser` handling for the Playwright scripts (check-a11y,
 * check-agent-bridge, screenshot-suite, the testing kit's smoke test), so
 * every one of them takes the same flag check-patterns already did:
 *
 *   --browser=chromium            the default
 *   --browser=firefox,webkit      a comma list, run in turn
 *   --browser=all                 chromium, firefox and webkit
 *
 * Also readable from the KERNEL_BROWSER environment variable, for scripts
 * whose positional arguments are already taken.
 */
import { chromium, firefox, webkit } from "playwright";

export const ENGINES = { chromium, firefox, webkit };

/** Parses `--browser` (or `--browser <list>`) out of argv; returns engine names. */
export function parseBrowsers(args, { fallback = "chromium", script = "script" } = {}) {
  const i = args.findIndex((a) => a === "--browser" || a.startsWith("--browser="));
  const raw = i === -1 ? process.env.KERNEL_BROWSER || fallback : args[i].includes("=") ? args[i].split("=")[1] : args[i + 1];
  const names = raw === "all" ? Object.keys(ENGINES) : raw.split(",").filter(Boolean);
  for (const name of names) {
    if (!ENGINES[name]) {
      console.error(`${script}: unknown --browser "${name}". Use chromium, firefox, webkit or all.`);
      process.exit(1);
    }
  }
  return names;
}

/** argv with the `--browser` flag (and its separate value, if any) removed. */
export function withoutBrowserFlag(args) {
  return args.filter((a, i) => !(a === "--browser" || a.startsWith("--browser=") || args[i - 1] === "--browser"));
}

/**
 * Launches an engine. A locally installed Chrome stands in when
 * Playwright's own Chromium isn't downloaded; Firefox and WebKit have no
 * stand-in, so their launch error is rethrown with the install hint.
 */
export async function launchBrowser(name, options = {}) {
  try {
    return await ENGINES[name].launch(options);
  } catch (error) {
    if (name === "chromium") return chromium.launch({ ...options, channel: "chrome" });
    const reason = String(error?.message ?? error).split("\n")[0];
    throw new Error(`${name} didn't launch (${reason}). Install it with \`bunx playwright install ${name}\`.`);
  }
}

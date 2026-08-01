import { execSync } from "node:child_process";
import {
  detectFramework,
  detectPackageManager,
  installCommand,
} from "../lib/detect.js";
import {
  applyPlans,
  planAccentTheme,
  planCssImports,
  planJsImports,
} from "../lib/css.js";
import { info, log, success } from "../lib/output.js";
import type { Framework, GlobalOptions, InitOptions, PackageManager } from "../lib/types.js";

const ACCENTS = new Set(["amber", "blue", "green", "orange", "red", "teal", "violet"]);

function parseInitFlags(rest: string[], global: GlobalOptions): InitOptions {
  const options: InitOptions = { ...global };

  for (let i = 0; i < rest.length; i++) {
    const arg = rest[i];
    if (arg === "--tailwind") options.tailwind = true;
    else if (arg === "--tokens-only") options.tokensOnly = true;
    else if (arg === "--package-manager" && rest[i + 1]) {
      options.packageManager = rest[++i] as PackageManager;
    } else if (arg === "--framework" && rest[i + 1]) {
      options.framework = rest[++i] as Framework;
    } else if (arg === "--accent" && rest[i + 1]) {
      options.accent = rest[++i];
    }
  }

  return options;
}

export async function runInit(global: GlobalOptions, rest: string[]) {
  const options = parseInitFlags(rest, global);
  const pm = options.packageManager ?? (await detectPackageManager(options.cwd));
  const framework = options.framework ?? (await detectFramework(options.cwd));

  if (options.accent && !ACCENTS.has(options.accent)) {
    throw new Error(`Unknown accent "${options.accent}". Choose one of: ${[...ACCENTS].join(", ")}`);
  }

  const packages = options.tokensOnly
    ? ["@kernelui-lib/styles"]
    : ["@kernelui-lib/react", "@kernelui-lib/styles"];

  const install = installCommand(pm, packages);
  log(`Detected ${framework === "unknown" ? "a React" : framework} project (${pm}).`);

  if (options.dryRun) {
    info(`Would run: ${install}`);
  } else if (options.yes || process.stdin.isTTY === false) {
    execSync(install, { cwd: options.cwd, stdio: "inherit" });
  } else {
    log(`Running: ${install}`);
    execSync(install, { cwd: options.cwd, stdio: "inherit" });
  }

  const cssPlans = await planCssImports({
    cwd: options.cwd,
    framework,
    tailwind: options.tailwind ?? false,
    tokensOnly: options.tokensOnly ?? false,
  });
  const jsPlans =
    framework === "vite"
      ? await planJsImports({
          cwd: options.cwd,
          framework,
          tokensOnly: options.tokensOnly ?? false,
        })
      : [];

  const accentPlan = options.accent
    ? await planAccentTheme(options.cwd, options.accent)
    : null;

  const plans = [...cssPlans, ...jsPlans, ...(accentPlan ? [accentPlan] : [])];

  if (plans.length === 0) {
    success("Packages installed. Kernel styles already wired up.");
  } else {
    for (const plan of plans) {
      if (options.dryRun) {
        info(`Would ${plan.action} ${plan.file}`);
      } else {
        await applyPlans(options.cwd, [plan], false);
        success(`${plan.action === "create" ? "Created" : "Updated"} ${plan.file}`);
      }
    }
  }

  if (framework === "next" && !options.tokensOnly) {
    info("Next.js: add the CSS imports to src/app/globals.css if they are not there yet.");
  }

  if (framework === "unknown") {
    info("Framework not detected. Add these imports manually:");
    info('  import "@kernelui-lib/styles";');
    if (!options.tokensOnly) info('  import "@kernelui-lib/react/styles.css";');
  }

  log("");
  log("Next steps:");
  info("Run `kernel doctor` to verify setup.");
  info("Read the migration guide: https://www.kernelui.com/migration/");
  info("Browse components: https://www.kernelui.com/components/");
}

import { runDoctor } from "./commands/doctor.js";
import { runDocs } from "./commands/docs.js";
import { runInit } from "./commands/init.js";
import { printHelp } from "./lib/output.js";
import type { GlobalOptions } from "./lib/types.js";

function parseArgs(argv: string[]) {
  const args = argv.slice(2);
  const global: GlobalOptions = {
    cwd: process.cwd(),
    dryRun: false,
    yes: false,
  };

  let command = args[0];
  let rest = args.slice(1);

  if (!command || command === "--help" || command === "-h") {
    return { command: "help" as const, global, rest: [] as string[] };
  }

  if (command === "--version" || command === "-v") {
    return { command: "version" as const, global, rest: [] as string[] };
  }

  for (let i = 0; i < rest.length; i++) {
    const arg = rest[i];
    if (arg === "--dry-run") global.dryRun = true;
    else if (arg === "--yes" || arg === "-y") global.yes = true;
    else if (arg === "--path" && rest[i + 1]) {
      global.cwd = rest[++i]!;
    } else if (arg?.startsWith("--path=")) {
      global.cwd = arg.slice("--path=".length);
    }
  }

  if (command.startsWith("-")) {
    command = "help";
    rest = [];
  }

  return { command, global, rest };
}

export async function runCli(argv: string[]) {
  const { command, global, rest } = parseArgs(argv);

  switch (command) {
    case "help":
      printHelp();
      return;
    case "version": {
      const pkg = await import("../package.json", { with: { type: "json" } });
      console.log(pkg.default.version);
      return;
    }
    case "init":
      await runInit(global, rest);
      return;
    case "doctor":
      await runDoctor(global, rest);
      return;
    case "docs":
      await runDocs(global, rest);
      return;
    default:
      throw new Error(`Unknown command "${command}". Run kernel --help.`);
  }
}

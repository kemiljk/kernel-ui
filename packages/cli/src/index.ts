#!/usr/bin/env node

import { runCli } from "./cli.js";

runCli(process.argv).catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`kernel: ${message}`);
  process.exit(1);
});

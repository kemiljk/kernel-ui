#!/usr/bin/env node
/**
 * Copies @kernelui-lib/cli's version into packages/cli/server.json (the MCP
 * Registry metadata). The registry refuses a publish whose version differs
 * from npm's, and `changeset version` only bumps package.json, so
 * `bun run version-packages` runs this to put the bump in the Version
 * Packages PR. The CLI build (scripts/bundle-registry.mjs) does the same, so
 * a release can never publish a stale file.
 */
import { readFileSync, writeFileSync } from "node:fs";

const root = new URL("../packages/cli/", import.meta.url);
const pkg = JSON.parse(readFileSync(new URL("package.json", root), "utf8"));
const serverUrl = new URL("server.json", root);
const server = JSON.parse(readFileSync(serverUrl, "utf8"));
if (server.name !== pkg.mcpName) throw new Error("server.json name must equal package.json mcpName");
server.version = pkg.version;
for (const entry of server.packages) entry.version = pkg.version;
writeFileSync(serverUrl, `${JSON.stringify(server, null, 2)}\n`);
console.log(`[sync-server-json] server.json at ${pkg.version}`);

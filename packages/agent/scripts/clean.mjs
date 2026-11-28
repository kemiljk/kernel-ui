#!/usr/bin/env node
// Removes dist/ before a build so a renamed source file can't leave a stale
// module in the published tarball.
import { rmSync } from "node:fs";

rmSync(new URL("../dist", import.meta.url), { recursive: true, force: true });

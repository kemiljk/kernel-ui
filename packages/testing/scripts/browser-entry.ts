// Entry for dist/kernel-testing.global.js: the whole API on `window.KernelTesting`,
// for `page.addScriptTag()` and other script-tag use.
import * as KernelTesting from "../src/index.js";

(globalThis as unknown as { KernelTesting: typeof KernelTesting }).KernelTesting = KernelTesting;

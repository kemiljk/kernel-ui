import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { defineConfig, type Plugin } from "vite";
import dts from "vite-plugin-dts";

/**
 * Writes dist/kernel.layer.css: the same component CSS as kernel.css, wrapped
 * in `@layer kernel.components`, after an order statement that puts it above
 * `@kernelui-lib/styles`' tokens and reset. Any unlayered CSS a consumer
 * writes then beats every Kernel rule regardless of specificity. Opt-in via
 * `@kernelui-lib/elements/styles.layer.css`; kernel.css stays unlayered
 * because layering it would let a consumer's unlayered element resets
 * override Kernel's components. Same plugin as packages/react's.
 */
function layeredCss(): Plugin {
  return {
    name: "kernel-layered-css",
    apply: "build",
    writeBundle(options) {
      const dir = options.dir ?? resolve(import.meta.dirname, "dist");
      const css = readFileSync(resolve(dir, "kernel.css"), "utf8");
      const layered = `@layer kernel.tokens, kernel.base, kernel.components;\n@layer kernel.components {\n${css.trimEnd()}\n}\n`;
      writeFileSync(resolve(dir, "kernel.layer.css"), layered);
    },
  };
}

export default defineConfig({
  plugins: [layeredCss(), dts({ include: ["src"], rollupTypes: false, insertTypesEntry: true })],
  build: {
    lib: {
      entry: resolve(import.meta.dirname, "src/index.ts"),
      formats: ["es"],
      fileName: () => "index.js",
    },
    cssCodeSplit: false,
    sourcemap: true,
    rollupOptions: {
      output: {
        assetFileNames: (asset) =>
          asset.names?.[0]?.endsWith(".css") ? "kernel.css" : "assets/[name][extname]",
      },
    },
  },
});

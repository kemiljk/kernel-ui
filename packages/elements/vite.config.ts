import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { defineConfig, type Plugin } from "vite";
import dts from "vite-plugin-dts";
import { kernelSchemaJson } from "./src/components/SchemaRenderer/schema";

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

/**
 * Writes dist/schema.json: SchemaRenderer's JSON Schema document, the same
 * object the package exports as `kernelSchemaJson`, as a file a model
 * provider's structured-output option (or any validator) can load
 * directly. Generated from the source, so it can't drift from what the
 * renderer accepts.
 */
function schemaJson(): Plugin {
  return {
    name: "kernel-schema-json",
    apply: "build",
    writeBundle(options) {
      const dir = options.dir ?? resolve(import.meta.dirname, "dist");
      writeFileSync(resolve(dir, "schema.json"), `${JSON.stringify(kernelSchemaJson, null, 2)}\n`);
    },
  };
}

export default defineConfig({
  plugins: [layeredCss(), schemaJson(), dts({ include: ["src"], rollupTypes: false, insertTypesEntry: true })],
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

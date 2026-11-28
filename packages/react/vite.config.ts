import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import dts from "vite-plugin-dts";

/**
 * Writes dist/kernel.layer.css: the same component CSS as kernel.css, wrapped
 * in `@layer kernel.components`, after an order statement that puts it above
 * `@kernelui-lib/styles`' tokens and reset. Any unlayered CSS a consumer
 * writes then beats every Kernel rule regardless of specificity. Opt-in via
 * `@kernelui-lib/react/styles.layer.css`; kernel.css stays unlayered because
 * layering it would let a consumer's unlayered element resets override
 * Kernel's components.
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
  plugins: [
    react(),
    layeredCss(),
    dts({ include: ["src"], exclude: ["src/**/*.test.*", "src/test/**"], rollupTypes: false, insertTypesEntry: true }),
  ],
  css: {
    modules: {
      // Human-readable, low-collision class names: kernel-Button-root,
      // kernel-Button-icon, etc. Stable across builds so consumers can
      // target them from outside the module if they ever need to.
      generateScopedName: "kernel-[folder]-[local]",
    },
  },
  build: {
    lib: {
      entry: resolve(import.meta.dirname, "src/index.ts"),
      formats: ["es", "cjs"],
      fileName: (format) => `index.${format === "es" ? "js" : "cjs"}`,
    },
    cssCodeSplit: false,
    sourcemap: true,
    rollupOptions: {
      external: ["react", "react-dom", "react/jsx-runtime"],
      output: {
        // Every component is interactive, so the whole bundle is a client
        // module. The directive lets a Next.js App Router Server Component
        // import Kernel directly. It has to be the first statement, so it
        // goes in the banner rather than in src (the bundler drops
        // module-level directives from source files).
        banner: '"use client";',
        assetFileNames: (asset) =>
          asset.names?.[0]?.endsWith(".css") ? "kernel.css" : "assets/[name][extname]",
      },
    },
  },
});

import { resolve } from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  // Same class names as the published build (see vite.config.ts), so tests
  // see `kernel-Button-root`, the names `@kernelui-lib/elements` emits via
  // `kernelClass()`, and parity.test.tsx can compare the two packages' DOM.
  css: {
    modules: {
      generateScopedName: "kernel-[folder]-[local]",
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    css: {
      include: [/\.module\.css$/],
      modules: {
        classNameStrategy: "scoped",
      },
    },
  },
  resolve: {
    alias: {
      "@kernelui-lib/styles": resolve(__dirname, "../styles/src/index.css"),
    },
  },
});

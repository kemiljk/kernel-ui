import { resolve } from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    css: {
      modules: {
        classNameStrategy: "non-scoped",
      },
    },
  },
  resolve: {
    alias: {
      "@kernelui-lib/styles": resolve(__dirname, "../styles/src/index.css"),
    },
  },
});

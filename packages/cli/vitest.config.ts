import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
  },
  resolve: {
    alias: {
      "@kernelui-lib/registry": new URL("../registry/dist/index.js", import.meta.url).pathname,
    },
  },
});

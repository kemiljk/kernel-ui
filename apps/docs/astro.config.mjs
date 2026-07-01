import { defineConfig } from "astro/config";
import react from "@astrojs/react";

export default defineConfig({
  integrations: [react()],
  vite: {
    // @kernelui/react is a workspace package that rebuilds its dist/
    // output on save during `bun run dev` (see the root package.json).
    // Vite ignores node_modules changes and aggressively caches
    // pre-bundled deps by default; these two settings make it notice
    // the rebuilt files instead of needing a dev server restart.
    optimizeDeps: {
      exclude: ["@kernelui/react", "@kernelui/styles", "@kernelui/elements"],
    },
    server: {
      watch: {
        ignored: ["!**/node_modules/@kernelui/**"],
      },
    },
  },
});

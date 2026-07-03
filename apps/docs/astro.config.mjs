import { defineConfig } from "astro/config";
import react from "@astrojs/react";
import sitemap from "@astrojs/sitemap";

export default defineConfig({
  site: "https://www.kernelui.com",
  integrations: [
    react(),
    sitemap({
      filter: (page) => !page.includes("/labs/"),
    }),
  ],
  vite: {
    // @kernelui-lib/react is a workspace package that rebuilds its dist/
    // output on save during `bun run dev` (see the root package.json).
    // Vite ignores node_modules changes and aggressively caches
    // pre-bundled deps by default; these two settings make it notice
    // the rebuilt files instead of needing a dev server restart.
    optimizeDeps: {
      exclude: ["@kernelui-lib/react", "@kernelui-lib/styles", "@kernelui-lib/elements"],
    },
    server: {
      watch: {
        ignored: ["!**/node_modules/@kernelui-lib/**"],
      },
    },
  },
});

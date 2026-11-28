import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// A relative base, so the built app works from any static server path.
export default defineConfig({
  base: "./",
  plugins: [react()],
});

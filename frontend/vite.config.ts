import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// On GitHub Pages the site is served from /<repo>/, so assets need that base.
// Vercel (and local dev) serve from the root. Flip with GITHUB_PAGES=1 at build.
const base = process.env.GITHUB_PAGES ? "/prior-art-court/" : "/";

export default defineConfig({
  base,
  plugins: [react()],
});

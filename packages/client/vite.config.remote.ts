/**
 * Vite config for remote (static) client build.
 *
 * This builds a standalone static site that can be deployed to GitHub Pages.
 * It uses remote.html as the entry point instead of index.html.
 */

import { resolve } from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// Port for dev server (different from regular client to allow parallel dev)
const remoteDevPort = process.env.REMOTE_PORT
  ? Number.parseInt(process.env.REMOTE_PORT, 10)
  : 3403;

export default defineConfig({
  clearScreen: false,
  plugins: [react()],
  resolve: {
    conditions: ["source"],
  },
  // Build configuration for static site
  build: {
    outDir: "dist-remote",
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: resolve(__dirname, "remote.html"),
      },
    },
  },
  // Dev server configuration
  server: {
    port: remoteDevPort,
    // Allow connections from any host (for LAN testing)
    host: true,
    // No HMR config needed for remote - it's standalone
  },
});

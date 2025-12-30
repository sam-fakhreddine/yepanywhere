import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { reloadNotify } from "./vite-plugin-reload-notify";

// VITE_API_PORT: Backend API port (default: 3400)
// E2E tests set this to avoid conflicts with the real dev server
const apiPort = process.env.VITE_API_PORT || "3400";

// NO_FRONTEND_RELOAD: Disable HMR and use manual reload notifications instead
const noFrontendReload = process.env.NO_FRONTEND_RELOAD === "true";

export default defineConfig({
  plugins: [
    react(),
    // When HMR is disabled, use reload-notify plugin to tell backend about changes
    reloadNotify({ enabled: noFrontendReload }),
  ],
  resolve: {
    conditions: ["source"],
  },
  server: {
    port: 5555, // also referenced in root package.json dev-tailscale script
    allowedHosts: true,
    // Disable HMR when NO_FRONTEND_RELOAD is set
    hmr: noFrontendReload ? false : undefined,
    proxy: {
      "/api": {
        target: `http://localhost:${apiPort}`,
        changeOrigin: true,
      },
    },
  },
});

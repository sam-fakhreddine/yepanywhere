import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// VITE_API_PORT: Backend API port (default: 3400)
// E2E tests set this to avoid conflicts with the real dev server
const apiPort = process.env.VITE_API_PORT || "3400";

export default defineConfig({
  plugins: [react()],
  resolve: {
    conditions: ["source"],
  },
  server: {
    port: 5555, // also referenced in root package.json dev-tailscale script
    allowedHosts: true,
    proxy: {
      "/api": {
        target: `http://localhost:${apiPort}`,
        changeOrigin: true,
      },
    },
  },
});

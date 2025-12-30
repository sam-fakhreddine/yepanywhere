import { defineConfig } from "@playwright/test";

// Port configuration:
// - E2E_CLIENT_PORT: Client port (default: 5174, different from pnpm dev's 5555)
// - E2E_SERVER_PORT: Mock server port (default: 3401, different from dev's 3400)
// - E2E_REUSE_DEV: Set to "true" to run against existing dev server on port 5555
//   (skips starting mock server - tests run against real Claude SDK)
const reuseDevServer = process.env.E2E_REUSE_DEV === "true";
// When reusing dev server, use dev's port 5555; otherwise use isolated ports
const clientPort = Number.parseInt(
  process.env.E2E_CLIENT_PORT || (reuseDevServer ? "5555" : "5174"),
);
const serverPort = Number.parseInt(process.env.E2E_SERVER_PORT || "3401");

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false, // Run sequentially - we're hitting one server
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: "list",
  timeout: 15000, // 15s per test
  expect: {
    timeout: 5000, // 5s for assertions
  },
  use: {
    baseURL: `http://localhost:${clientPort}`,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    actionTimeout: 5000, // 5s for actions like click
  },
  webServer: reuseDevServer
    ? [] // When reusing dev server, don't start any servers
    : [
        {
          command: `E2E_SERVER_PORT=${serverPort} pnpm --filter @claude-anywhere/server dev:mock`,
          port: serverPort,
          reuseExistingServer: !process.env.CI,
        },
        {
          command: `VITE_API_PORT=${serverPort} pnpm --filter @claude-anywhere/client dev --port ${clientPort}`,
          port: clientPort,
          reuseExistingServer: !process.env.CI,
        },
      ],
});

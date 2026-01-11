import { existsSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test as base } from "@playwright/test";

const PORT_FILE = join(tmpdir(), "claude-e2e-port");
const MAINTENANCE_PORT_FILE = join(tmpdir(), "claude-e2e-maintenance-port");
const PATHS_FILE = join(tmpdir(), "claude-e2e-paths.json");

function getServerPort(): number {
  if (existsSync(PORT_FILE)) {
    return Number.parseInt(readFileSync(PORT_FILE, "utf-8"), 10);
  }
  throw new Error(`Port file not found: ${PORT_FILE}. Did global-setup run?`);
}

function getMaintenancePort(): number {
  if (existsSync(MAINTENANCE_PORT_FILE)) {
    return Number.parseInt(readFileSync(MAINTENANCE_PORT_FILE, "utf-8"), 10);
  }
  throw new Error(
    `Maintenance port file not found: ${MAINTENANCE_PORT_FILE}. Did global-setup run?`,
  );
}

interface E2EPaths {
  testDir: string;
  claudeSessionsDir: string;
  codexSessionsDir: string;
  geminiSessionsDir: string;
  dataDir: string;
}

function getTestPaths(): E2EPaths {
  if (existsSync(PATHS_FILE)) {
    return JSON.parse(readFileSync(PATHS_FILE, "utf-8"));
  }
  throw new Error(`Paths file not found: ${PATHS_FILE}. Did global-setup run?`);
}

// Export paths for tests to use instead of hardcoded homedir() paths
export const e2ePaths = {
  get testDir() {
    return getTestPaths().testDir;
  },
  get claudeSessionsDir() {
    return getTestPaths().claudeSessionsDir;
  },
  get codexSessionsDir() {
    return getTestPaths().codexSessionsDir;
  },
  get geminiSessionsDir() {
    return getTestPaths().geminiSessionsDir;
  },
  get dataDir() {
    return getTestPaths().dataDir;
  },
};

/**
 * Helper to configure remote access for tests.
 * Uses the REST API to set up SRP credentials.
 */
export interface RemoteAccessConfig {
  username: string;
  password: string;
}

export async function configureRemoteAccess(
  baseURL: string,
  config: RemoteAccessConfig,
): Promise<void> {
  const response = await fetch(`${baseURL}/api/remote-access/configure`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Yep-Anywhere": "true", // Required by security middleware
    },
    body: JSON.stringify(config),
  });
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to configure remote access: ${error}`);
  }
}

export async function disableRemoteAccess(baseURL: string): Promise<void> {
  const response = await fetch(`${baseURL}/api/remote-access/clear`, {
    method: "POST",
    headers: {
      "X-Yep-Anywhere": "true", // Required by security middleware
    },
  });
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to disable remote access: ${error}`);
  }
}

// Extended test fixtures
interface TestFixtures {
  baseURL: string;
  maintenanceURL: string;
  wsURL: string;
}

// Extend base test with dynamic baseURL and maintenanceURL
export const test = base.extend<TestFixtures>({
  // biome-ignore lint/correctness/noEmptyPattern: Playwright fixture pattern requires empty destructure
  baseURL: async ({}, use) => {
    const port = getServerPort();
    await use(`http://localhost:${port}`);
  },
  // biome-ignore lint/correctness/noEmptyPattern: Playwright fixture pattern requires empty destructure
  maintenanceURL: async ({}, use) => {
    const port = getMaintenancePort();
    await use(`http://localhost:${port}`);
  },
  // biome-ignore lint/correctness/noEmptyPattern: Playwright fixture pattern requires empty destructure
  wsURL: async ({}, use) => {
    const port = getServerPort();
    await use(`ws://localhost:${port}/api/ws`);
  },
});

export { expect } from "@playwright/test";

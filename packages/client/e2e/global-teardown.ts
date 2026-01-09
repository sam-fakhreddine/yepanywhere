import { existsSync, readFileSync, rmSync, unlinkSync } from "node:fs";
import { homedir, hostname, tmpdir } from "node:os";
import { join } from "node:path";

const PORT_FILE = join(tmpdir(), "claude-e2e-port");
const PID_FILE = join(tmpdir(), "claude-e2e-pid");

export default async function globalTeardown() {
  // Kill the server process
  if (existsSync(PID_FILE)) {
    const pid = Number.parseInt(readFileSync(PID_FILE, "utf-8"), 10);
    try {
      // Kill the process group (negative PID kills the group)
      process.kill(-pid, "SIGTERM");
      console.log(`[E2E] Killed server process group ${pid}`);
    } catch (err) {
      // Process may already be dead
      if ((err as NodeJS.ErrnoException).code !== "ESRCH") {
        console.error("[E2E] Error killing server:", err);
      }
    }
    unlinkSync(PID_FILE);
  }

  // Clean up port file
  if (existsSync(PORT_FILE)) {
    unlinkSync(PORT_FILE);
  }

  // Clean up mock project data created by dev-mock.ts setupMockProjects()
  // This mirrors cleanupMockProjects() from server/src/testing/mockProjectData.ts
  const mockProjectPath = join(tmpdir(), "mockproject");
  const encodedPath = mockProjectPath.replace(/\//g, "-");
  const mockProjectDir = join(
    homedir(),
    ".claude",
    "projects",
    hostname(),
    encodedPath,
  );

  try {
    rmSync(mockProjectPath, { recursive: true, force: true });
  } catch {
    // Ignore cleanup errors
  }

  try {
    rmSync(mockProjectDir, { recursive: true, force: true });
  } catch {
    // Ignore cleanup errors
  }
}

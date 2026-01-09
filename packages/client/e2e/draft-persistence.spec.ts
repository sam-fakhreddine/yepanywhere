import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { hostname, tmpdir } from "node:os";
import { join } from "node:path";
import { expect, test } from "./fixtures.js";

// Create a test project for draft persistence tests
// This is similar to how codex-oss tests create their own project
const mockProjectPath = join(tmpdir(), "claude-e2e-draft");
const claudeProjectsDir = join(
  process.env.HOME || "",
  ".claude",
  "projects",
  hostname(),
);
const encodedPath = mockProjectPath.replace(/\//g, "-");
const sessionDir = join(claudeProjectsDir, encodedPath);

// Helper to encode project path to base64url (same as server's encodeProjectId)
function encodeProjectId(path: string): string {
  return Buffer.from(path).toString("base64url");
}

test.describe("Draft Persistence", () => {
  // Set up mock project before all tests
  test.beforeAll(async () => {
    // Create project directory
    if (!existsSync(mockProjectPath)) {
      mkdirSync(mockProjectPath, { recursive: true });
    }

    // Create session directory under ~/.claude/projects
    mkdirSync(sessionDir, { recursive: true });

    // Create a mock session file with cwd field
    const sessionFile = join(sessionDir, "draft-test-session.jsonl");
    if (!existsSync(sessionFile)) {
      const sessionData = {
        type: "user",
        cwd: mockProjectPath,
        message: { role: "user", content: "Test message" },
        timestamp: new Date().toISOString(),
        uuid: "draft-test-1",
      };
      writeFileSync(sessionFile, `${JSON.stringify(sessionData)}\n`);
    }
  });

  test.describe("New Session Input", () => {
    test("persists draft to localStorage while typing", async ({ page }) => {
      // Use our pre-created project ID
      const projectId = encodeProjectId(mockProjectPath);
      expect(projectId).toBeTruthy();

      // Navigate to new session page
      await page.goto(`/new-session?projectId=${projectId}`);
      await page.waitForSelector(".new-session-form textarea");

      // Type a message
      const textarea = page.locator(".new-session-form textarea");
      await textarea.fill("My draft message");

      // Wait for debounce (500ms + buffer)
      await page.waitForTimeout(700);

      // Check localStorage has the draft
      const draft = await page.evaluate((pid) => {
        return localStorage.getItem(`draft-new-session-${pid}`);
      }, projectId);
      expect(draft).toBe("My draft message");
    });

    test("restores draft after page reload", async ({ page }) => {
      // Use our pre-created project ID
      const projectId = encodeProjectId(mockProjectPath);
      expect(projectId).toBeTruthy();

      // Navigate to new session page
      await page.goto(`/new-session?projectId=${projectId}`);
      await page.waitForSelector(".new-session-form textarea");

      // Type a message
      const textarea = page.locator(".new-session-form textarea");
      await textarea.fill("Draft to restore");

      // Wait for debounce
      await page.waitForTimeout(700);

      // Reload the page
      await page.reload();
      // Wait for the form to appear again after reload
      await page.waitForSelector(".new-session-form textarea", {
        timeout: 10000,
      });

      // Draft should be restored
      const restoredTextarea = page.locator(".new-session-form textarea");
      await expect(restoredTextarea).toHaveValue("Draft to restore");
    });

    test("clears draft after successful session start", async ({ page }) => {
      // Use our pre-created project ID
      const projectId = encodeProjectId(mockProjectPath);
      expect(projectId).toBeTruthy();

      // Navigate to new session page
      await page.goto(`/new-session?projectId=${projectId}`);
      await page.waitForSelector(".new-session-form textarea");

      // Type and submit
      const textarea = page.locator(".new-session-form textarea");
      await textarea.fill("Starting a session");
      await page.waitForTimeout(700); // Wait for debounce
      await page.click(".new-session-form .send-button");

      // Wait for navigation to session page (allow longer timeout for session creation)
      await expect(page).toHaveURL(/\/sessions\//, { timeout: 15000 });

      // Draft should be cleared
      const draft = await page.evaluate((pid) => {
        return localStorage.getItem(`draft-new-session-${pid}`);
      }, projectId);
      expect(draft).toBeNull();
    });
  });
});

import { mkdirSync, writeFileSync } from "node:fs";
import { hostname } from "node:os";
import { join } from "node:path";
import { devices } from "@playwright/test";
import { e2ePaths, expect, test } from "./fixtures.js";

// Mobile viewport for swipe tests
const mobileViewport = devices["iPhone 13"]?.viewport ?? {
  width: 390,
  height: 844,
};

/**
 * Helper to simulate a touch swipe gesture on an element.
 * Uses Playwright's page.evaluate to dispatch TouchEvents.
 */
async function simulateSwipe(
  page: import("@playwright/test").Page,
  selector: string,
  options: {
    direction: "left" | "right";
    distance: number;
    duration?: number;
  },
) {
  const { direction, distance, duration = 100 } = options;

  await page.evaluate(
    ({ selector, direction, distance, duration }) => {
      const element = document.querySelector(selector);
      if (!element) throw new Error(`Element not found: ${selector}`);

      const rect = element.getBoundingClientRect();
      const startX = rect.left + rect.width / 2;
      const startY = rect.top + rect.height / 2;
      const endX =
        direction === "right" ? startX + distance : startX - distance;

      // Create touch objects
      const createTouch = (x: number, y: number) =>
        new Touch({
          identifier: 0,
          target: element,
          clientX: x,
          clientY: y,
          pageX: x,
          pageY: y,
          screenX: x,
          screenY: y,
        });

      // Dispatch touchstart
      const touchStart = new TouchEvent("touchstart", {
        bubbles: true,
        cancelable: true,
        touches: [createTouch(startX, startY)],
        targetTouches: [createTouch(startX, startY)],
        changedTouches: [createTouch(startX, startY)],
      });
      element.dispatchEvent(touchStart);

      // Simulate incremental touchmove events
      const steps = 5;
      const stepDelay = duration / steps;
      const stepDistance = (endX - startX) / steps;

      let currentX = startX;
      const moveStep = (stepIndex: number) => {
        currentX += stepDistance;
        const touchMove = new TouchEvent("touchmove", {
          bubbles: true,
          cancelable: true,
          touches: [createTouch(currentX, startY)],
          targetTouches: [createTouch(currentX, startY)],
          changedTouches: [createTouch(currentX, startY)],
        });
        element.dispatchEvent(touchMove);

        if (stepIndex < steps - 1) {
          setTimeout(() => moveStep(stepIndex + 1), stepDelay);
        } else {
          // Dispatch touchend after all moves
          setTimeout(() => {
            const touchEnd = new TouchEvent("touchend", {
              bubbles: true,
              cancelable: true,
              touches: [],
              targetTouches: [],
              changedTouches: [createTouch(endX, startY)],
            });
            element.dispatchEvent(touchEnd);
          }, stepDelay);
        }
      };

      moveStep(0);
    },
    { selector, direction, distance, duration },
  );

  // Wait for the swipe animation to complete
  await page.waitForTimeout(duration + 300);
}

// Session directory and file setup
let mockProjectPath: string;
let sessionId: string;

test.beforeAll(() => {
  // Create a mock project and session for swipe tests
  mockProjectPath = join(e2ePaths.tempDir, "swipe-test-project");
  mkdirSync(mockProjectPath, { recursive: true });

  const encodedPath = mockProjectPath.replace(/\//g, "-");
  const mockSessionDir = join(
    e2ePaths.claudeSessionsDir,
    hostname(),
    encodedPath,
  );
  mkdirSync(mockSessionDir, { recursive: true });

  sessionId = "swipe-test-session-001";
  const sessionFile = join(mockSessionDir, `${sessionId}.jsonl`);
  const mockMessages = [
    {
      type: "user",
      cwd: mockProjectPath,
      message: { role: "user", content: "Test message for swipe" },
      timestamp: new Date().toISOString(),
      uuid: "1",
    },
  ];
  writeFileSync(
    sessionFile,
    mockMessages.map((m) => JSON.stringify(m)).join("\n"),
  );
});

test.describe("Swipe Gestures", () => {
  test.beforeEach(async ({ page, baseURL }) => {
    // Set mobile viewport
    await page.setViewportSize(mobileViewport);

    // Navigate to the sessions page
    await page.goto(`${baseURL}/`);

    // Wait for sessions to load
    await page.waitForSelector(".session-list", { timeout: 10000 });
  });

  test("shows swipe action indicator on swipe right (star)", async ({
    page,
  }) => {
    // Find any swipeable session item
    const sessionItem = page
      .locator("[data-testid^='swipeable-session-']")
      .first();
    await expect(sessionItem).toBeVisible();

    // Get the selector for the element
    const testId = await sessionItem.getAttribute("data-testid");
    const selector = `[data-testid="${testId}"]`;

    // Simulate a partial swipe right (not enough to trigger action)
    await simulateSwipe(page, selector, {
      direction: "right",
      distance: 40, // Just enough to show indicator
    });

    // The swipe-action indicator should be visible
    const actionIndicator = page.locator(".swipeable-action--star");
    await expect(actionIndicator).toBeVisible();
  });

  test("shows archive indicator on swipe left", async ({ page }) => {
    const sessionItem = page
      .locator("[data-testid^='swipeable-session-']")
      .first();
    await expect(sessionItem).toBeVisible();

    const testId = await sessionItem.getAttribute("data-testid");
    const selector = `[data-testid="${testId}"]`;

    // Simulate swipe left
    await simulateSwipe(page, selector, {
      direction: "left",
      distance: 60,
    });

    // Archive indicator should show
    const actionIndicator = page.locator(".swipeable-action--archive");
    await expect(actionIndicator).toBeVisible();
  });

  test("star action triggers on full swipe right", async ({
    page,
    baseURL,
  }) => {
    const sessionItem = page
      .locator("[data-testid^='swipeable-session-']")
      .first();
    await expect(sessionItem).toBeVisible();

    const testId = await sessionItem.getAttribute("data-testid");
    const sessionId = await sessionItem.getAttribute("data-session-id");
    const selector = `[data-testid="${testId}"]`;

    // Check initial star state via API
    const initialResponse = await page.request.get(
      `${baseURL}/api/session-metadata`,
    );
    const initialData = await initialResponse.json();
    const initialStarred = initialData.starred?.includes(sessionId) ?? false;

    // Simulate full swipe right to trigger star
    await simulateSwipe(page, selector, {
      direction: "right",
      distance: 120, // Past threshold
    });

    // Wait for API call to complete
    await page.waitForTimeout(500);

    // Verify star state changed via API
    const response = await page.request.get(`${baseURL}/api/session-metadata`);
    const data = await response.json();
    const nowStarred = data.starred?.includes(sessionId) ?? false;

    // Star state should have toggled
    expect(nowStarred).toBe(!initialStarred);
  });

  test("archive action triggers on full swipe left", async ({
    page,
    baseURL,
  }) => {
    const sessionItem = page
      .locator("[data-testid^='swipeable-session-']")
      .first();
    await expect(sessionItem).toBeVisible();

    const testId = await sessionItem.getAttribute("data-testid");
    const sessionId = await sessionItem.getAttribute("data-session-id");
    const selector = `[data-testid="${testId}"]`;

    // Check initial archive state
    const initialResponse = await page.request.get(
      `${baseURL}/api/session-metadata`,
    );
    const initialData = await initialResponse.json();
    const initialArchived = initialData.archived?.includes(sessionId) ?? false;

    // Simulate full swipe left to trigger archive
    await simulateSwipe(page, selector, {
      direction: "left",
      distance: 120, // Past threshold
    });

    // Wait for API call
    await page.waitForTimeout(500);

    // Verify archive state changed
    const response = await page.request.get(`${baseURL}/api/session-metadata`);
    const data = await response.json();
    const nowArchived = data.archived?.includes(sessionId) ?? false;

    expect(nowArchived).toBe(!initialArchived);
  });

  test("long swipe left shows delete confirmation dialog", async ({ page }) => {
    const sessionItem = page
      .locator("[data-testid^='swipeable-session-']")
      .first();
    await expect(sessionItem).toBeVisible();

    const testId = await sessionItem.getAttribute("data-testid");
    const selector = `[data-testid="${testId}"]`;

    // Simulate long swipe left to trigger delete
    await simulateSwipe(page, selector, {
      direction: "left",
      distance: 200, // Past delete threshold
    });

    // Delete dialog should appear
    const dialog = page.locator("[data-testid='delete-dialog']");
    await expect(dialog).toBeVisible();

    // Dialog should have cancel and confirm buttons
    await expect(
      page.locator("[data-testid='delete-dialog-cancel']"),
    ).toBeVisible();
    await expect(
      page.locator("[data-testid='delete-dialog-confirm']"),
    ).toBeVisible();
  });

  test("delete dialog can be cancelled", async ({ page }) => {
    const sessionItem = page
      .locator("[data-testid^='swipeable-session-']")
      .first();
    await expect(sessionItem).toBeVisible();

    const testId = await sessionItem.getAttribute("data-testid");
    const selector = `[data-testid="${testId}"]`;

    // Trigger delete dialog
    await simulateSwipe(page, selector, {
      direction: "left",
      distance: 200,
    });

    const dialog = page.locator("[data-testid='delete-dialog']");
    await expect(dialog).toBeVisible();

    // Click cancel
    await page.locator("[data-testid='delete-dialog-cancel']").click();

    // Dialog should close
    await expect(dialog).not.toBeVisible();

    // Session should still exist
    await expect(sessionItem).toBeVisible();
  });

  test("swipe is disabled on wide screens", async ({ page }) => {
    // Set desktop viewport
    await page.setViewportSize({ width: 1200, height: 800 });

    // Wait for re-render
    await page.waitForTimeout(100);

    const sessionItem = page
      .locator("[data-testid^='swipeable-session-']")
      .first();
    await expect(sessionItem).toBeVisible();

    const testId = await sessionItem.getAttribute("data-testid");
    const selector = `[data-testid="${testId}"]`;

    // Try to swipe - should not work on wide screens
    await simulateSwipe(page, selector, {
      direction: "right",
      distance: 120,
    });

    // No swipe action indicator should appear
    const actionIndicator = page.locator(".swipeable-action");
    await expect(actionIndicator).not.toBeVisible();
  });
});

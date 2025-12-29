import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { detectClaudeCli } from "../../src/sdk/cli-detection.js";
import { RealClaudeSDK } from "../../src/sdk/real.js";
import type { SDKMessage } from "../../src/sdk/types.js";

/**
 * E2E tests for the real Claude SDK.
 *
 * These tests require:
 * - Claude CLI installed
 * - Valid Claude authentication (API key or OAuth)
 *
 * Tests will be skipped if prerequisites are not met.
 * Run with: REAL_SDK_TESTS=true pnpm test:e2e
 * Add FOREGROUND=1 for verbose real-time logging
 */

const FOREGROUND = process.env.FOREGROUND === "1";

function log(...args: unknown[]) {
  if (FOREGROUND) {
    console.log(...args);
  }
}

function logMessage(message: SDKMessage) {
  if (!FOREGROUND) return;

  const subtype = (message as { subtype?: string }).subtype;
  console.log(`[${message.type}${subtype ? `:${subtype}` : ""}]`);

  if (message.type === "assistant" || message.type === "user") {
    const msg = message as { message?: { content?: unknown } };
    const content = msg.message?.content;
    if (typeof content === "string") {
      console.log(
        `  ${content.slice(0, 200)}${content.length > 200 ? "..." : ""}`,
      );
    } else if (Array.isArray(content)) {
      for (const block of content) {
        if (block.type === "text") {
          const text = block.text as string;
          console.log(
            `  ${text.slice(0, 200)}${text.length > 200 ? "..." : ""}`,
          );
        } else if (block.type === "tool_use") {
          console.log(`  [tool_use] ${block.name}`);
        } else if (block.type === "tool_result") {
          console.log("  [tool_result]");
        }
      }
    }
  }
}

describe("Real SDK E2E", () => {
  let sdk: RealClaudeSDK;
  let testDir: string;
  let cliAvailable = false;

  beforeAll(() => {
    // Check if we should run real SDK tests
    if (process.env.REAL_SDK_TESTS !== "true") {
      console.log(
        "Skipping real SDK tests - set REAL_SDK_TESTS=true to enable",
      );
      return;
    }

    // Check if CLI is installed
    const cliInfo = detectClaudeCli();
    if (!cliInfo.found) {
      console.log("Skipping real SDK tests - Claude CLI not installed");
      console.log(cliInfo.error);
      return;
    }

    console.log(`Using Claude CLI: ${cliInfo.path} (${cliInfo.version})`);
    cliAvailable = true;

    // Create a temp directory for the test project
    testDir = mkdtempSync(join(tmpdir(), "claude-anywhere-e2e-"));

    // Create a simple test file
    writeFileSync(join(testDir, "test.txt"), "Hello from test file");

    sdk = new RealClaudeSDK();
  });

  afterAll(() => {
    if (testDir) {
      try {
        rmSync(testDir, { recursive: true });
      } catch {
        // Ignore cleanup errors
      }
    }
  });

  it("should start a session and receive messages", async () => {
    if (!cliAvailable) {
      return; // Skip if CLI not installed
    }

    const { iterator, abort } = await sdk.startSession({
      cwd: testDir,
      initialMessage: { text: 'Say "hello test" and nothing else' },
      permissionMode: "bypassPermissions", // For E2E tests only
    });

    const messages: SDKMessage[] = [];

    // Collect messages with a timeout
    const timeout = setTimeout(() => abort(), 30000);

    try {
      for await (const message of iterator) {
        messages.push(message);
        logMessage(message);

        // Stop after we get a result
        if (message.type === "result") {
          break;
        }
      }
    } finally {
      clearTimeout(timeout);
    }

    // We should have received at least init + assistant + result
    expect(messages.length).toBeGreaterThanOrEqual(2);
    expect(messages[0]?.type).toBe("system");
    expect((messages[0] as { subtype?: string }).subtype).toBe("init");
  }, 60000); // 60s timeout for real API call

  it("should handle tool approval callbacks", async () => {
    if (!cliAvailable) {
      return; // Skip if CLI not installed
    }

    const toolRequests: Array<{ toolName: string; input: unknown }> = [];

    const { iterator, abort } = await sdk.startSession({
      cwd: testDir,
      initialMessage: { text: "Read the file test.txt" },
      permissionMode: "default", // Will trigger approval
      onToolApproval: async (toolName, input) => {
        toolRequests.push({ toolName, input });
        log(`[tool_approval] ${toolName}`, input);
        // Auto-approve for test
        return { behavior: "allow" as const };
      },
    });

    const messages: SDKMessage[] = [];
    const timeout = setTimeout(() => abort(), 60000);

    try {
      for await (const message of iterator) {
        messages.push(message);
        logMessage(message);
        if (message.type === "result") break;
      }
    } finally {
      clearTimeout(timeout);
    }

    // Should have triggered at least one tool approval for Read
    expect(toolRequests.length).toBeGreaterThan(0);
  }, 90000); // 90s timeout

  it("should abort a running session", async () => {
    if (!cliAvailable) {
      return; // Skip if CLI not installed
    }

    const { iterator, abort } = await sdk.startSession({
      cwd: testDir,
      initialMessage: {
        text: "Count slowly from 1 to 100, saying each number",
      },
      permissionMode: "bypassPermissions",
    });

    const messages: SDKMessage[] = [];

    // Abort after a short delay
    setTimeout(() => {
      log("[abort] Aborting session...");
      abort();
    }, 2000);

    try {
      for await (const message of iterator) {
        messages.push(message);
        logMessage(message);
      }
    } catch (error) {
      // AbortError is expected
      if (error instanceof Error && error.name !== "AbortError") {
        throw error;
      }
    }

    // We should have received at least init message
    expect(messages.length).toBeGreaterThanOrEqual(1);
    expect(messages[0]?.type).toBe("system");
  }, 30000);
});

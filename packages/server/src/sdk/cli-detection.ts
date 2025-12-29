import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import * as os from "node:os";

/**
 * Information about the Claude CLI installation.
 */
export interface ClaudeCliInfo {
  /** Whether the CLI was found */
  found: boolean;
  /** Path to the CLI executable */
  path?: string;
  /** CLI version string */
  version?: string;
  /** Error message if not found */
  error?: string;
}

/**
 * Detect the Claude CLI installation.
 *
 * Checks:
 * 1. PATH via `which claude`
 * 2. Common installation locations
 *
 * @returns Information about the CLI installation
 */
export function detectClaudeCli(): ClaudeCliInfo {
  // Try to find claude in PATH
  try {
    const claudePath = execSync("which claude", {
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
    }).trim();

    if (claudePath) {
      const version = getVersion(claudePath);
      return { found: true, path: claudePath, version };
    }
  } catch {
    // Not in PATH, continue to check common locations
  }

  // Check common installation locations
  const commonPaths = [
    `${os.homedir()}/.local/bin/claude`,
    "/usr/local/bin/claude",
    `${os.homedir()}/.npm-global/bin/claude`,
    `${os.homedir()}/.nvm/versions/node/*/bin/claude`,
  ];

  for (const path of commonPaths) {
    if (existsSync(path)) {
      const version = getVersion(path);
      if (version) {
        return { found: true, path, version };
      }
    }
  }

  return {
    found: false,
    error:
      "Claude CLI not found. Install via: curl -fsSL https://claude.ai/install.sh | bash",
  };
}

/**
 * Get the version of the Claude CLI at the given path.
 */
function getVersion(claudePath: string): string | undefined {
  try {
    const output = execSync(`"${claudePath}" --version`, {
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
    }).trim();
    return output;
  } catch {
    return undefined;
  }
}

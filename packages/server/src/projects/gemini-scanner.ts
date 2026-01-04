/**
 * GeminiSessionScanner - Scans Gemini sessions and groups them by project.
 *
 * Gemini stores sessions at ~/.gemini/tmp/<projectHash>/chats/session-*.json
 * where projectHash is a SHA-256 hash of the working directory.
 *
 * Unlike Claude/Codex which store the cwd in the session file, Gemini only
 * stores the hash. We use two strategies to resolve the cwd:
 * 1. Hash known project paths from Claude/Codex to create a reverse mapping
 * 2. Look for file paths in tool calls to infer the project directory
 *
 * Sessions are grouped by their cwd (if known) or by projectHash (if unknown).
 */

import { createHash } from "node:crypto";
import { readFile, readdir, stat } from "node:fs/promises";
import { homedir } from "node:os";
import { basename, dirname, join } from "node:path";
import {
  type GeminiSessionFile,
  type UrlProjectId,
  parseGeminiSessionFile,
} from "@claude-anywhere/shared";
import type { Project } from "../supervisor/types.js";
import { encodeProjectId } from "./paths.js";

export const GEMINI_DIR = join(homedir(), ".gemini");
export const GEMINI_TMP_DIR = join(GEMINI_DIR, "tmp");

interface GeminiSessionInfo {
  id: string;
  projectHash: string;
  filePath: string;
  startTime: string;
  mtime: number;
}

export interface GeminiScannerOptions {
  sessionsDir?: string; // override for testing (~/.gemini/tmp)
}

/**
 * Compute SHA-256 hash of a path (how Gemini creates projectHash).
 */
export function hashProjectPath(path: string): string {
  return createHash("sha256").update(path).digest("hex");
}

export class GeminiSessionScanner {
  private sessionsDir: string;

  // Cache of projectHash -> cwd for resolving hashes
  private hashToCwd: Map<string, string> = new Map();

  constructor(options: GeminiScannerOptions = {}) {
    this.sessionsDir = options.sessionsDir ?? GEMINI_TMP_DIR;
  }

  /**
   * Register known project paths for hash resolution.
   * Call this with paths from Claude/Codex projects to enable cwd lookup.
   */
  registerKnownPaths(paths: string[]): void {
    for (const path of paths) {
      const hash = hashProjectPath(path);
      this.hashToCwd.set(hash, path);
    }
  }

  /**
   * Get the hash-to-cwd mapping for use by readers.
   */
  getHashToCwd(): Map<string, string> {
    return this.hashToCwd;
  }

  /**
   * Scan all Gemini sessions and group them by project (cwd or hash).
   * Returns projects sorted by last activity (most recent first).
   */
  async listProjects(): Promise<Project[]> {
    const sessions = await this.scanAllSessions();

    // Group sessions by cwd (if known) or projectHash
    const projectMap = new Map<
      string,
      {
        sessions: GeminiSessionInfo[];
        lastActivity: number;
        cwd: string | null;
        projectHash: string;
      }
    >();

    for (const session of sessions) {
      const cwd = this.hashToCwd.get(session.projectHash) ?? null;
      const key = cwd ?? session.projectHash;

      const existing = projectMap.get(key);
      if (existing) {
        existing.sessions.push(session);
        if (session.mtime > existing.lastActivity) {
          existing.lastActivity = session.mtime;
        }
      } else {
        projectMap.set(key, {
          sessions: [session],
          lastActivity: session.mtime,
          cwd,
          projectHash: session.projectHash,
        });
      }
    }

    // Convert to Project[]
    const projects: Project[] = [];
    for (const [key, data] of projectMap) {
      const path = data.cwd ?? `gemini:${data.projectHash.slice(0, 8)}`;
      const name = data.cwd
        ? basename(data.cwd)
        : `Gemini ${data.projectHash.slice(0, 8)}`;

      projects.push({
        id: encodeProjectId(path),
        path,
        name,
        sessionCount: data.sessions.length,
        sessionDir: join(this.sessionsDir, data.projectHash, "chats"),
        activeOwnedCount: 0,
        activeExternalCount: 0,
        lastActivity: new Date(data.lastActivity).toISOString(),
        provider: "gemini",
      });
    }

    // Sort by last activity descending
    projects.sort((a, b) => {
      if (!a.lastActivity) return 1;
      if (!b.lastActivity) return -1;
      return (
        new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime()
      );
    });

    return projects;
  }

  /**
   * Get sessions for a specific project (by cwd or projectHash).
   */
  async getSessionsForProject(
    projectPath: string,
  ): Promise<GeminiSessionInfo[]> {
    const sessions = await this.scanAllSessions();

    // Check if projectPath is a hash prefix (gemini:xxxxxxxx format)
    if (projectPath.startsWith("gemini:")) {
      const hashPrefix = projectPath.slice(7);
      return sessions
        .filter((s) => s.projectHash.startsWith(hashPrefix))
        .sort((a, b) => b.mtime - a.mtime);
    }

    // Otherwise, hash the path and look for matching sessions
    const targetHash = hashProjectPath(projectPath);
    const matchingSessions = sessions
      .filter((s) => s.projectHash === targetHash)
      .sort((a, b) => b.mtime - a.mtime);

    // Register the path mapping if we found sessions
    // This allows the reader to filter sessions by project path later
    if (matchingSessions.length > 0 && !this.hashToCwd.has(targetHash)) {
      this.hashToCwd.set(targetHash, projectPath);
    }

    return matchingSessions;
  }

  /**
   * Scan all session files and extract metadata.
   */
  private async scanAllSessions(): Promise<GeminiSessionInfo[]> {
    const sessions: GeminiSessionInfo[] = [];

    try {
      await stat(this.sessionsDir);
    } catch {
      // Sessions directory doesn't exist
      return [];
    }

    // Find all project hash directories
    let projectHashDirs: string[];
    try {
      const entries = await readdir(this.sessionsDir, { withFileTypes: true });
      projectHashDirs = entries
        .filter((e) => e.isDirectory())
        .map((e) => e.name);
    } catch {
      return [];
    }

    // Scan each project hash directory in parallel
    const BATCH_SIZE = 20;
    for (let i = 0; i < projectHashDirs.length; i += BATCH_SIZE) {
      const batch = projectHashDirs.slice(i, i + BATCH_SIZE);
      const results = await Promise.all(
        batch.map((hash) => this.scanProjectHash(hash)),
      );
      for (const result of results) {
        sessions.push(...result);
      }
    }

    return sessions;
  }

  /**
   * Scan sessions for a specific project hash directory.
   */
  private async scanProjectHash(
    projectHash: string,
  ): Promise<GeminiSessionInfo[]> {
    const sessions: GeminiSessionInfo[] = [];
    const chatsDir = join(this.sessionsDir, projectHash, "chats");

    try {
      await stat(chatsDir);
    } catch {
      // No chats directory
      return [];
    }

    let files: string[];
    try {
      const entries = await readdir(chatsDir, { withFileTypes: true });
      files = entries
        .filter(
          (e) =>
            e.isFile() &&
            e.name.startsWith("session-") &&
            e.name.endsWith(".json"),
        )
        .map((e) => e.name);
    } catch {
      return [];
    }

    // Read session files in parallel
    const results = await Promise.all(
      files.map((f) => this.readSessionMeta(join(chatsDir, f), projectHash)),
    );

    for (const result of results) {
      if (result) {
        sessions.push(result);
      }
    }

    return sessions;
  }

  /**
   * Read session metadata from a JSON file.
   */
  private async readSessionMeta(
    filePath: string,
    projectHash: string,
  ): Promise<GeminiSessionInfo | null> {
    try {
      const stats = await stat(filePath);
      const content = await readFile(filePath, "utf-8");
      const session = parseGeminiSessionFile(content);

      if (!session) return null;

      // Try to infer cwd from file paths in tool calls (if not already known)
      if (!this.hashToCwd.has(projectHash)) {
        const inferredCwd = this.inferCwdFromSession(session);
        if (inferredCwd) {
          // Verify the hash matches
          if (hashProjectPath(inferredCwd) === projectHash) {
            this.hashToCwd.set(projectHash, inferredCwd);
          }
        }
      }

      return {
        id: session.sessionId,
        projectHash,
        filePath,
        startTime: session.startTime,
        mtime: stats.mtimeMs,
      };
    } catch {
      return null;
    }
  }

  /**
   * Try to infer the cwd from file paths referenced in tool calls.
   * This is a heuristic - we look for common path prefixes in file operations.
   */
  private inferCwdFromSession(session: GeminiSessionFile): string | null {
    const paths: string[] = [];

    for (const msg of session.messages) {
      if (msg.type === "gemini" && msg.toolCalls) {
        for (const toolCall of msg.toolCalls) {
          // Look for file path arguments in tool calls
          const args = toolCall.args;
          if (args && typeof args === "object") {
            // Common file path argument names
            for (const key of [
              "file_path",
              "path",
              "filePath",
              "file",
              "filename",
            ]) {
              const value = args[key];
              if (typeof value === "string" && value.startsWith("/")) {
                paths.push(value);
              }
            }
          }

          // Also check tool results for file paths
          if (toolCall.result) {
            for (const result of toolCall.result) {
              const output = result.functionResponse.response.output;
              // Look for absolute paths in output
              const matches = output.match(/\/[^\s:,]+/g);
              if (matches) {
                for (const match of matches) {
                  if (match.includes("/home/") || match.includes("/Users/")) {
                    paths.push(match);
                  }
                }
              }
            }
          }
        }
      }
    }

    if (paths.length === 0) return null;

    // Find common path prefix
    // Start with the first path's directory
    const firstPath = paths[0];
    if (!firstPath) return null;
    let commonPrefix = dirname(firstPath);

    for (const path of paths.slice(1)) {
      const pathDir = dirname(path);
      while (commonPrefix && !pathDir.startsWith(commonPrefix)) {
        commonPrefix = dirname(commonPrefix);
      }
    }

    // Return the common prefix if it looks like a valid project directory
    if (commonPrefix && commonPrefix !== "/" && commonPrefix.length > 1) {
      return commonPrefix;
    }

    return null;
  }
}

// Singleton for convenience
export const geminiSessionScanner = new GeminiSessionScanner();

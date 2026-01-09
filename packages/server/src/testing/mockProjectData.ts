import fs from "node:fs";
import os from "node:os";
import path from "node:path";

export function setupMockProjects() {
  const claudeDir = path.join(os.homedir(), ".claude", "projects");
  const hostname = os.hostname();
  // Project path encoded with / replaced by - (per scanner.ts)
  // Using /tmp/mockproject to avoid permission issues with root paths
  const mockProjectPath = path.join(os.tmpdir(), "mockproject");
  const encodedPath = mockProjectPath.replace(/\//g, "-");
  const mockProjectDir = path.join(claudeDir, hostname, encodedPath);

  // Create the mock project directory on disk (required for scanner)
  fs.mkdirSync(mockProjectPath, { recursive: true });

  // Create session directory
  fs.mkdirSync(mockProjectDir, { recursive: true });

  // Create a mock session file with cwd field for scanner discovery
  const sessionFile = path.join(mockProjectDir, "mock-session-001.jsonl");
  if (!fs.existsSync(sessionFile)) {
    const mockMessages = [
      {
        type: "user",
        cwd: mockProjectPath, // Required for scanner to find project path
        message: { role: "user", content: "Previous message" },
        timestamp: new Date().toISOString(),
        uuid: "1",
      },
    ];
    fs.writeFileSync(
      sessionFile,
      mockMessages.map((m) => JSON.stringify(m)).join("\n"),
    );
  }

  return { projectDir: mockProjectDir, sessionFile, mockProjectPath };
}

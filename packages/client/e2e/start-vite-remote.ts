/**
 * Wrapper script to start Vite dev server programmatically.
 * Writes the resolved port to a file for the test harness to read.
 * This is more reliable than parsing stdout.
 */
import { writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PORT_FILE = join(tmpdir(), "claude-e2e-remote-port");

async function main() {
  const clientRoot = join(__dirname, "..");

  const server = await createServer({
    configFile: join(clientRoot, "vite.config.remote.ts"),
    server: {
      port: 0, // Let Vite pick an available port
      strictPort: false,
      host: true,
    },
  });

  await server.listen();

  const address = server.httpServer?.address();
  if (!address || typeof address === "string") {
    console.error("Failed to get server address");
    process.exit(1);
  }

  const port = address.port;
  writeFileSync(PORT_FILE, String(port));
  console.log(`[Vite Remote] Server listening on port ${port}`);

  // Keep the process alive
  process.on("SIGTERM", async () => {
    await server.close();
    process.exit(0);
  });

  process.on("SIGINT", async () => {
    await server.close();
    process.exit(0);
  });
}

main().catch((err) => {
  console.error("Failed to start Vite server:", err);
  process.exit(1);
});

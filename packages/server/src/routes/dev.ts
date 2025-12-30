import { Hono } from "hono";
import type { EventBus, SourceChangeEvent } from "../watcher/index.js";

export interface DevDeps {
  eventBus: EventBus;
}

/**
 * Dev-only routes for manual reload workflow.
 * Only mounted when NO_BACKEND_RELOAD or NO_FRONTEND_RELOAD is set.
 */
export function createDevRoutes(deps: DevDeps): Hono {
  const routes = new Hono();

  // POST /api/dev/frontend-changed - Called by Vite plugin when frontend files change
  routes.post("/frontend-changed", async (c) => {
    const body = await c.req
      .json<{ files?: string[] }>()
      .catch(() => ({ files: [] as string[] }));

    const event: SourceChangeEvent = {
      type: "source-change",
      target: "frontend",
      files: body.files ?? [],
      timestamp: new Date().toISOString(),
    };

    deps.eventBus.emit(event);
    console.log(
      `[Dev] Frontend source changed: ${event.files.join(", ") || "(unknown files)"}`,
    );

    return c.json({ ok: true });
  });

  // POST /api/dev/reload - Trigger server restart
  routes.post("/reload", (c) => {
    console.log("[Dev] Manual reload requested, exiting...");

    // Respond before exiting
    const response = c.json({ ok: true, message: "Server restarting..." });

    // Schedule exit after response is sent
    // The dev wrapper script (scripts/dev.js) will restart the server
    setTimeout(() => {
      process.exit(0);
    }, 100);

    return response;
  });

  // GET /api/dev/status - Get dev mode status
  routes.get("/status", (c) => {
    return c.json({
      noBackendReload: process.env.NO_BACKEND_RELOAD === "true",
      noFrontendReload: process.env.NO_FRONTEND_RELOAD === "true",
      timestamp: new Date().toISOString(),
    });
  });

  return routes;
}

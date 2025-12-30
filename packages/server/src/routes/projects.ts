import { Hono } from "hono";
import type { ProjectScanner } from "../projects/scanner.js";
import type { SessionReader } from "../sessions/reader.js";
import type { ExternalSessionTracker } from "../supervisor/ExternalSessionTracker.js";
import type { Supervisor } from "../supervisor/Supervisor.js";

export interface ProjectsDeps {
  scanner: ProjectScanner;
  readerFactory: (sessionDir: string) => SessionReader;
  supervisor?: Supervisor;
  externalTracker?: ExternalSessionTracker;
}

export function createProjectsRoutes(deps: ProjectsDeps): Hono {
  const routes = new Hono();

  // Helper to enrich sessions with real status from Supervisor/ExternalTracker
  function enrichSessionsWithStatus<
    T extends { id: string; status: { state: string } },
  >(sessions: T[]): T[] {
    return sessions.map((session) => {
      const process = deps.supervisor?.getProcessForSession(session.id);
      const isExternal = deps.externalTracker?.isExternal(session.id) ?? false;

      const status = process
        ? {
            state: "owned" as const,
            processId: process.id,
            permissionMode: process.permissionMode,
            modeVersion: process.modeVersion,
          }
        : isExternal
          ? { state: "external" as const }
          : session.status;

      return { ...session, status };
    });
  }

  // GET /api/projects - List all projects
  routes.get("/", async (c) => {
    const projects = await deps.scanner.listProjects();
    return c.json({ projects });
  });

  // GET /api/projects/:projectId - Get project with sessions
  routes.get("/:projectId", async (c) => {
    const projectId = c.req.param("projectId");

    const project = await deps.scanner.getProject(projectId);
    if (!project) {
      return c.json({ error: "Project not found" }, 404);
    }

    // Get sessions for this project using the stored sessionDir
    const reader = deps.readerFactory(project.sessionDir);
    const sessions = await reader.listSessions(projectId);

    return c.json({ project, sessions: enrichSessionsWithStatus(sessions) });
  });

  // GET /api/projects/:projectId/sessions - List sessions
  routes.get("/:projectId/sessions", async (c) => {
    const projectId = c.req.param("projectId");

    const project = await deps.scanner.getProject(projectId);
    if (!project) {
      return c.json({ error: "Project not found" }, 404);
    }

    const reader = deps.readerFactory(project.sessionDir);
    const sessions = await reader.listSessions(projectId);

    return c.json({ sessions: enrichSessionsWithStatus(sessions) });
  });

  return routes;
}

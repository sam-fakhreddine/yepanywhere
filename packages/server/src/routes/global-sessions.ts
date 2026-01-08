/**
 * Global sessions route - returns all sessions across all projects.
 *
 * Unlike the inbox route which categorizes sessions into tiers,
 * this returns a flat list suitable for navigation/sidebar use.
 */

import {
  type ProviderName,
  getSessionDisplayTitle,
} from "@yep-anywhere/shared";
import { Hono } from "hono";
import type { SessionIndexService } from "../indexes/index.js";
import type { SessionMetadataService } from "../metadata/SessionMetadataService.js";
import type { NotificationService } from "../notifications/index.js";
import type { ProjectScanner } from "../projects/scanner.js";
import type { ISessionReader } from "../sessions/types.js";
import type { ExternalSessionTracker } from "../supervisor/ExternalSessionTracker.js";
import type { Supervisor } from "../supervisor/Supervisor.js";
import type {
  PendingInputType,
  ProcessStateType,
  Project,
  SessionStatus,
  SessionSummary,
} from "../supervisor/types.js";

export interface GlobalSessionsDeps {
  scanner: ProjectScanner;
  readerFactory: (project: Project) => ISessionReader;
  supervisor?: Supervisor;
  externalTracker?: ExternalSessionTracker;
  notificationService?: NotificationService;
  sessionIndexService?: SessionIndexService;
  sessionMetadataService?: SessionMetadataService;
}

export interface GlobalSessionItem {
  // From cache (cheap)
  id: string;
  title: string | null;
  createdAt: string;
  updatedAt: string;
  messageCount: number;
  provider: ProviderName;
  // Project context
  projectId: string;
  projectName: string;
  // Enrichment (all in-memory, cheap)
  status: SessionStatus;
  pendingInputType?: PendingInputType;
  processState?: ProcessStateType;
  hasUnread?: boolean;
  customTitle?: string;
  isArchived?: boolean;
  isStarred?: boolean;
}

export interface GlobalSessionsResponse {
  sessions: GlobalSessionItem[];
  hasMore: boolean;
}

/** Default limit for sessions per page */
const DEFAULT_LIMIT = 100;

/** Maximum allowed limit */
const MAX_LIMIT = 500;

export function createGlobalSessionsRoutes(deps: GlobalSessionsDeps): Hono {
  const routes = new Hono();

  // GET /api/sessions - Get all sessions with pagination
  routes.get("/", async (c) => {
    // Parse query params
    const filterProjectId = c.req.query("project");
    const searchQuery = c.req.query("q")?.toLowerCase();
    const afterCursor = c.req.query("after");
    const includeArchived = c.req.query("includeArchived") === "true";
    const limitParam = c.req.query("limit");
    const limit = Math.min(
      Math.max(1, Number.parseInt(limitParam || "", 10) || DEFAULT_LIMIT),
      MAX_LIMIT,
    );

    // Get all projects
    const allProjects = await deps.scanner.listProjects();

    // Filter to single project if projectId query param provided
    const projects = filterProjectId
      ? allProjects.filter((p) => p.id === filterProjectId)
      : allProjects;

    // Build a map of projectId -> projectName for enrichment
    const projectNameMap = new Map<string, string>();
    for (const project of allProjects) {
      projectNameMap.set(project.id, project.name);
    }

    // Collect all sessions with enriched data
    const allSessions: GlobalSessionItem[] = [];

    for (const project of projects) {
      const reader = deps.readerFactory(project);

      // Get sessions using cache if available
      // SessionIndexService only works with Claude's directory structure
      let sessions: SessionSummary[];
      if (deps.sessionIndexService && project.provider === "claude") {
        sessions = await deps.sessionIndexService.getSessionsWithCache(
          project.sessionDir,
          project.id,
          reader,
        );
      } else {
        sessions = await reader.listSessions(project.id);
      }

      // Enrich each session
      for (const session of sessions) {
        // Get session metadata
        const metadata = deps.sessionMetadataService?.getMetadata(session.id);
        const isArchived = metadata?.isArchived ?? session.isArchived ?? false;

        // Skip archived sessions unless explicitly requested
        if (isArchived && !includeArchived) continue;

        // Compute status
        const process = deps.supervisor?.getProcessForSession(session.id);
        const isExternal =
          deps.externalTracker?.isExternal(session.id) ?? false;

        const status: SessionStatus = process
          ? {
              state: "owned",
              processId: process.id,
              permissionMode: process.permissionMode,
              modeVersion: process.modeVersion,
            }
          : isExternal
            ? { state: "external" }
            : (session.status ?? { state: "idle" });

        // Get process state
        let pendingInputType: PendingInputType | undefined;
        let processState: ProcessStateType | undefined;
        if (process) {
          const pendingRequest = process.getPendingInputRequest();
          if (pendingRequest) {
            pendingInputType =
              pendingRequest.type === "tool-approval"
                ? "tool-approval"
                : "user-question";
          }
          const state = process.state.type;
          if (state === "running" || state === "waiting-input") {
            processState = state;
          }
        }

        // Get unread status
        const hasUnread = deps.notificationService
          ? deps.notificationService.hasUnread(session.id, session.updatedAt)
          : undefined;

        const customTitle = metadata?.customTitle ?? session.customTitle;
        const isStarred = metadata?.isStarred ?? session.isStarred;

        // Apply search filter
        if (searchQuery) {
          const titleMatch = session.title?.toLowerCase().includes(searchQuery);
          const customTitleMatch = customTitle
            ?.toLowerCase()
            .includes(searchQuery);
          const projectNameMatch = project.name
            .toLowerCase()
            .includes(searchQuery);

          if (!titleMatch && !customTitleMatch && !projectNameMatch) {
            continue;
          }
        }

        allSessions.push({
          id: session.id,
          title: session.title,
          createdAt: session.createdAt,
          updatedAt: session.updatedAt,
          messageCount: session.messageCount,
          provider: session.provider,
          projectId: session.projectId,
          projectName: project.name,
          status,
          pendingInputType,
          processState,
          hasUnread,
          customTitle,
          isArchived,
          isStarred,
        });
      }
    }

    // Sort by updatedAt descending (most recent first)
    allSessions.sort(
      (a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    );

    // Apply cursor pagination
    let filteredSessions = allSessions;
    if (afterCursor) {
      const afterTime = new Date(afterCursor).getTime();
      filteredSessions = allSessions.filter(
        (s) => new Date(s.updatedAt).getTime() < afterTime,
      );
    }

    // Get one extra to determine hasMore
    const sessionsWithExtra = filteredSessions.slice(0, limit + 1);
    const hasMore = sessionsWithExtra.length > limit;
    const sessions = sessionsWithExtra.slice(0, limit);

    const response: GlobalSessionsResponse = {
      sessions,
      hasMore,
    };

    return c.json(response);
  });

  return routes;
}

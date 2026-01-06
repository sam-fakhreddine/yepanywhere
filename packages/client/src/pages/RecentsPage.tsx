import { useEffect, useMemo, useState } from "react";
import { api } from "../api/client";
import { PageHeader } from "../components/PageHeader";
import { SessionListItem } from "../components/SessionListItem";
import {
  type RecentSessionEntry,
  useRecentSessions,
} from "../hooks/useRecentSessions";
import { useSessionStatuses } from "../hooks/useSessionStatuses";
import { useNavigationLayout } from "../layouts";
import type { Project, SessionSummary } from "../types";

interface RecentItemData {
  entry: RecentSessionEntry;
  session: SessionSummary | null;
  project: Project | null;
}

/**
 * Recents page showing recently visited sessions.
 * Sessions are tracked on the server and displayed with project context.
 */
export function RecentsPage() {
  const { openSidebar, isWideScreen, toggleSidebar, isSidebarCollapsed } =
    useNavigationLayout();
  const {
    recentSessions,
    isLoading: recentsLoading,
    error: recentsError,
    clearRecents,
  } = useRecentSessions();

  // Fetch projects to get session data
  const [projects, setProjects] = useState<Map<string, Project>>(new Map());
  const [sessions, setSessions] = useState<Map<string, SessionSummary>>(
    new Map(),
  );
  const [projectsLoading, setProjectsLoading] = useState(true);
  const [projectsError, setProjectsError] = useState<Error | null>(null);

  // Combined loading/error state
  const loading = recentsLoading || projectsLoading;
  const error = recentsError || projectsError;

  // Get unique project IDs from recent sessions
  const projectIds = useMemo(() => {
    const ids = new Set<string>();
    for (const entry of recentSessions) {
      ids.add(entry.projectId);
    }
    return Array.from(ids);
  }, [recentSessions]);

  // Get session IDs for status tracking
  const sessionIds = useMemo(
    () => recentSessions.map((e) => e.sessionId),
    [recentSessions],
  );

  // Track real-time status updates for all recent sessions
  const sessionStatuses = useSessionStatuses(sessionIds, sessions);

  // Fetch project data for all projects containing recent sessions
  useEffect(() => {
    if (projectIds.length === 0) {
      setProjectsLoading(false);
      return;
    }

    let cancelled = false;

    async function fetchData() {
      setProjectsLoading(true);
      setProjectsError(null);

      try {
        const results = await Promise.all(
          projectIds.map((id) => api.getProject(id).catch(() => null)),
        );

        if (cancelled) return;

        const projectMap = new Map<string, Project>();
        const sessionMap = new Map<string, SessionSummary>();

        for (const result of results) {
          if (result) {
            projectMap.set(result.project.id, result.project);
            for (const session of result.sessions) {
              sessionMap.set(session.id, session);
            }
          }
        }

        setProjects(projectMap);
        setSessions(sessionMap);
      } catch (err) {
        if (!cancelled) {
          setProjectsError(
            err instanceof Error ? err : new Error("Failed to load"),
          );
        }
      } finally {
        if (!cancelled) {
          setProjectsLoading(false);
        }
      }
    }

    fetchData();

    return () => {
      cancelled = true;
    };
  }, [projectIds]);

  // Build display data for each recent session
  const recentItems: RecentItemData[] = useMemo(() => {
    return recentSessions.map((entry) => ({
      entry,
      session: sessions.get(entry.sessionId) ?? null,
      project: projects.get(entry.projectId) ?? null,
    }));
  }, [recentSessions, sessions, projects]);

  const isEmpty = recentSessions.length === 0;

  return (
    <div
      className={isWideScreen ? "main-content-wrapper" : "main-content-mobile"}
    >
      <div
        className={
          isWideScreen
            ? "main-content-constrained"
            : "main-content-mobile-inner"
        }
      >
        <PageHeader
          title="Recent Sessions"
          onOpenSidebar={openSidebar}
          onToggleSidebar={toggleSidebar}
          isWideScreen={isWideScreen}
          isSidebarCollapsed={isSidebarCollapsed}
        />

        <main className="page-scroll-container">
          <div className="page-content-inner">
            {/* Toolbar with clear button */}
            {!isEmpty && (
              <div className="inbox-toolbar">
                <button
                  type="button"
                  className="inbox-refresh-button"
                  onClick={clearRecents}
                  title="Clear recent sessions"
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M3 6h18" />
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
                    <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  </svg>
                  Clear History
                </button>
              </div>
            )}

            {loading && <p className="loading">Loading recent sessions...</p>}

            {error && (
              <p className="error">Error loading sessions: {error.message}</p>
            )}

            {!loading && !error && isEmpty && (
              <div className="inbox-empty">
                <svg
                  width="48"
                  height="48"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
                <h3>No recent sessions</h3>
                <p>Sessions you visit will appear here.</p>
              </div>
            )}

            {!loading && !error && !isEmpty && (
              <ul className="sessions-list recents-list">
                {recentItems.map((item) => {
                  if (!item.session) {
                    // Session not found - show minimal placeholder
                    return (
                      <li
                        key={item.entry.sessionId}
                        className="session-list-item session-list-item--card"
                      >
                        <span className="session-list-item__title">
                          Unknown session
                        </span>
                      </li>
                    );
                  }

                  const status = sessionStatuses.get(item.entry.sessionId);

                  return (
                    <SessionListItem
                      key={item.entry.sessionId}
                      session={item.session}
                      projectId={item.entry.projectId}
                      mode="card"
                      processState={status?.processState}
                      onNavigate={() => {}}
                    />
                  );
                })}
              </ul>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

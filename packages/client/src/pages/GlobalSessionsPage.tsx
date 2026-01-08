import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import type { GlobalSessionItem } from "../api/client";
import { PageHeader } from "../components/PageHeader";
import { SessionListItem } from "../components/SessionListItem";
import { useGlobalSessions } from "../hooks/useGlobalSessions";
import { useNavigationLayout } from "../layouts";
import { type SessionSummary, toUrlProjectId } from "../types";

/**
 * Global sessions page showing all sessions across all projects.
 * Supports filtering by project and search query.
 */
export function GlobalSessionsPage() {
  const { openSidebar, isWideScreen, toggleSidebar, isSidebarCollapsed } =
    useNavigationLayout();
  const [searchParams, setSearchParams] = useSearchParams();

  // Get filter params from URL
  const searchQuery = searchParams.get("q") || "";
  const projectFilter = searchParams.get("project") || undefined;

  // Local state for search input
  const [searchInput, setSearchInput] = useState(searchQuery);

  const { sessions, loading, error, hasMore, loadMore, refetch } =
    useGlobalSessions({
      projectId: projectFilter,
      searchQuery,
    });

  // Get unique projects for filter dropdown
  const projectOptions = useMemo(() => {
    const projects = new Map<string, string>();
    for (const session of sessions) {
      if (!projects.has(session.projectId)) {
        projects.set(session.projectId, session.projectName);
      }
    }
    return Array.from(projects.entries()).map(([id, name]) => ({ id, name }));
  }, [sessions]);

  // Handle search form submit
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const newParams = new URLSearchParams(searchParams);
    if (searchInput.trim()) {
      newParams.set("q", searchInput.trim());
    } else {
      newParams.delete("q");
    }
    setSearchParams(newParams);
  };

  // Handle project filter change
  const handleProjectFilter = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newParams = new URLSearchParams(searchParams);
    if (e.target.value) {
      newParams.set("project", e.target.value);
    } else {
      newParams.delete("project");
    }
    setSearchParams(newParams);
  };

  // Clear all filters
  const clearFilters = () => {
    setSearchInput("");
    setSearchParams(new URLSearchParams());
  };

  // Convert GlobalSessionItem to SessionSummary for SessionListItem
  const toSessionSummary = (session: GlobalSessionItem): SessionSummary => ({
    id: session.id,
    projectId: toUrlProjectId(session.projectId),
    title: session.title,
    fullTitle: session.customTitle || session.title,
    customTitle: session.customTitle,
    createdAt: session.createdAt,
    updatedAt: session.updatedAt,
    messageCount: session.messageCount,
    provider: session.provider,
    status: session.status,
    pendingInputType: session.pendingInputType,
    processState: session.processState,
    hasUnread: session.hasUnread,
    isArchived: session.isArchived,
    isStarred: session.isStarred,
  });

  const isEmpty = sessions.length === 0;
  const hasFilters = searchQuery || projectFilter;

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
          title="All Sessions"
          onOpenSidebar={openSidebar}
          onToggleSidebar={toggleSidebar}
          isWideScreen={isWideScreen}
          isSidebarCollapsed={isSidebarCollapsed}
        />

        <main className="page-scroll-container">
          <div className="page-content-inner">
            {/* Search and filter toolbar */}
            <div className="global-sessions-toolbar">
              <form onSubmit={handleSearch} className="global-sessions-search">
                <input
                  type="text"
                  placeholder="Search sessions..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="global-sessions-search-input"
                />
                <button type="submit" className="global-sessions-search-button">
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
                    <circle cx="11" cy="11" r="8" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                </button>
              </form>

              {projectOptions.length > 0 && (
                <select
                  value={projectFilter || ""}
                  onChange={handleProjectFilter}
                  className="global-sessions-filter"
                >
                  <option value="">All projects</option>
                  {projectOptions.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
                </select>
              )}

              {hasFilters && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="global-sessions-clear"
                >
                  Clear filters
                </button>
              )}
            </div>

            {loading && sessions.length === 0 && (
              <p className="loading">Loading sessions...</p>
            )}

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
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
                <h3>No sessions found</h3>
                <p>
                  {hasFilters
                    ? "Try adjusting your search or filters."
                    : "Start a new session to get started."}
                </p>
              </div>
            )}

            {!error && !isEmpty && (
              <>
                <ul className="sessions-list">
                  {sessions.map((session) => (
                    <SessionListItem
                      key={session.id}
                      session={toSessionSummary(session)}
                      projectId={session.projectId}
                      mode="card"
                      processState={session.processState}
                      onNavigate={() => {}}
                      showProjectName={!projectFilter}
                      projectName={session.projectName}
                    />
                  ))}
                </ul>

                {hasMore && (
                  <div className="global-sessions-load-more">
                    <button
                      type="button"
                      onClick={loadMore}
                      className="global-sessions-load-more-button"
                      disabled={loading}
                    >
                      {loading ? "Loading..." : "Load more"}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

import { type KeyboardEvent, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api } from "../api/client";
import { SessionStatusBadge } from "../components/StatusBadge";
import { ENTER_SENDS_MESSAGE } from "../constants";
import { useDraftPersistence } from "../hooks/useDraftPersistence";
import { useSessions } from "../hooks/useSessions";

export function SessionsPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { project, sessions, loading, error } = useSessions(projectId);
  const [newMessage, setNewMessage, draftControls] = useDraftPersistence(
    `draft-new-session-${projectId}`,
  );
  const [starting, setStarting] = useState(false);

  // Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [showArchived, setShowArchived] = useState(false);

  // Filter sessions based on search and archive status
  const filteredSessions = useMemo(() => {
    return sessions.filter((session) => {
      // Filter by archived status
      if (!showArchived && session.isArchived) {
        return false;
      }

      // Filter by search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const title = (
          session.customTitle ??
          session.title ??
          ""
        ).toLowerCase();
        const fullTitle = (session.fullTitle ?? "").toLowerCase();
        if (!title.includes(query) && !fullTitle.includes(query)) {
          return false;
        }
      }

      return true;
    });
  }, [sessions, searchQuery, showArchived]);

  // Count archived sessions for badge
  const archivedCount = useMemo(
    () => sessions.filter((s) => s.isArchived).length,
    [sessions],
  );

  const handleStartSession = async () => {
    if (!projectId || !newMessage.trim()) return;

    const message = newMessage.trim();
    setStarting(true);
    draftControls.clearInput(); // Clear input but keep localStorage
    try {
      const { sessionId } = await api.startSession(projectId, message);
      draftControls.clearDraft(); // Success - clear localStorage
      navigate(`/projects/${projectId}/sessions/${sessionId}`);
    } catch (err) {
      console.error("Failed to start session:", err);
      draftControls.restoreFromStorage(); // Restore on failure
      setStarting(false);
    }
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Enter") {
      if (ENTER_SENDS_MESSAGE) {
        if (e.ctrlKey || e.shiftKey) {
          return;
        }
        e.preventDefault();
        handleStartSession();
      } else {
        if (e.ctrlKey || e.shiftKey) {
          e.preventDefault();
          handleStartSession();
        }
      }
    }
  };

  if (loading) return <div className="loading">Loading sessions...</div>;
  if (error) return <div className="error">Error: {error.message}</div>;

  return (
    <div className="page">
      <nav className="breadcrumb">
        <Link to="/projects">Projects</Link> / {project?.name}
      </nav>

      <h1>{project?.name}</h1>

      <div className="new-session-form">
        <textarea
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Start a new session..."
          disabled={starting}
          rows={3}
        />
        <button
          type="button"
          onClick={handleStartSession}
          disabled={starting || !newMessage.trim()}
          className="send-button"
          aria-label="Start session"
        >
          <span className="send-icon">{starting ? "..." : "↑"}</span>
        </button>
      </div>

      <h2>Sessions</h2>

      {/* Filter bar */}
      <div className="filter-bar">
        <input
          type="text"
          className="filter-search"
          placeholder="Search sessions..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        <div className="filter-chips">
          <button
            type="button"
            className={`filter-chip ${showArchived ? "active" : ""}`}
            onClick={() => setShowArchived(!showArchived)}
          >
            Archived{archivedCount > 0 && ` (${archivedCount})`}
          </button>
        </div>
      </div>

      {sessions.length === 0 ? (
        <p>No sessions yet</p>
      ) : filteredSessions.length === 0 ? (
        <p className="no-results">No sessions match your filters</p>
      ) : (
        <ul className="session-list">
          {filteredSessions.map((session) => (
            <li
              key={session.id}
              className={session.isArchived ? "archived" : ""}
            >
              <Link to={`/projects/${projectId}/sessions/${session.id}`}>
                <strong title={session.fullTitle || undefined}>
                  {session.customTitle ?? session.title ?? "Untitled"}
                  {session.isArchived && (
                    <span className="archived-badge">Archived</span>
                  )}
                </strong>
                <span className="meta">
                  {session.messageCount} messages
                  <SessionStatusBadge
                    status={session.status}
                    pendingInputType={session.pendingInputType}
                    hasUnread={session.hasUnread}
                  />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

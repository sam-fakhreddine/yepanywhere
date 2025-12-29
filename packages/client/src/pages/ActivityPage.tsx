import { useState } from "react";
import { Link } from "react-router-dom";
import {
  type FileChangeEvent,
  type FileType,
  useFileActivity,
} from "../hooks/useFileActivity";

function formatTime(timestamp: string): string {
  return new Date(timestamp).toLocaleTimeString();
}

function formatDate(timestamp: string): string {
  return new Date(timestamp).toLocaleDateString();
}

function getTypeIcon(type: FileChangeEvent["type"]): string {
  switch (type) {
    case "create":
      return "+";
    case "modify":
      return "~";
    case "delete":
      return "-";
  }
}

function getTypeColor(type: FileChangeEvent["type"]): string {
  switch (type) {
    case "create":
      return "#4f4";
    case "modify":
      return "#ff4";
    case "delete":
      return "#f44";
  }
}

function getTypeLabel(type: FileChangeEvent["type"]): string {
  switch (type) {
    case "create":
      return "created";
    case "modify":
      return "modified";
    case "delete":
      return "deleted";
  }
}

function getFileTypeLabel(fileType: FileType): string {
  switch (fileType) {
    case "session":
      return "Session";
    case "agent-session":
      return "Agent Session";
    case "settings":
      return "Settings";
    case "credentials":
      return "Credentials";
    default:
      return "Other";
  }
}

const FILE_TYPE_OPTIONS: FileType[] = [
  "session",
  "agent-session",
  "settings",
  "credentials",
  "other",
];

export function ActivityPage() {
  const [pathFilter, setPathFilter] = useState("");
  const [typeFilters, setTypeFilters] = useState<Set<FileType>>(new Set());
  const { events, connected, paused, clearEvents, togglePause } =
    useFileActivity();

  // Apply filters
  let displayedEvents = events;

  if (pathFilter) {
    const regex = new RegExp(pathFilter, "i");
    displayedEvents = displayedEvents.filter((e) => regex.test(e.relativePath));
  }

  if (typeFilters.size > 0) {
    displayedEvents = displayedEvents.filter((e) =>
      typeFilters.has(e.fileType),
    );
  }

  const toggleTypeFilter = (type: FileType) => {
    setTypeFilters((prev) => {
      const next = new Set(prev);
      if (next.has(type)) {
        next.delete(type);
      } else {
        next.add(type);
      }
      return next;
    });
  };

  // Group events by date
  const eventsByDate = displayedEvents.reduce(
    (acc, event) => {
      const date = formatDate(event.timestamp);
      if (!acc[date]) {
        acc[date] = [];
      }
      acc[date].push(event);
      return acc;
    },
    {} as Record<string, FileChangeEvent[]>,
  );

  return (
    <div className="page" style={{ maxWidth: "1000px" }}>
      <nav className="breadcrumb">
        <Link to="/projects">Projects</Link> / Activity
      </nav>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <h1>File Activity</h1>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <span
            style={{
              width: 10,
              height: 10,
              borderRadius: "50%",
              background: connected ? "#4f4" : "#f44",
            }}
          />
          <span style={{ fontSize: "0.875rem", color: "#888" }}>
            {connected ? "Connected" : "Disconnected"}
          </span>
        </div>
      </div>

      {/* Controls */}
      <div
        style={{
          display: "flex",
          gap: "1rem",
          marginBottom: "1.5rem",
          flexWrap: "wrap",
        }}
      >
        <input
          type="text"
          value={pathFilter}
          onChange={(e) => setPathFilter(e.target.value)}
          placeholder="Filter by path (regex)..."
          style={{
            flex: 1,
            minWidth: "200px",
            padding: "0.75rem",
            background: "#2a2a2a",
            border: "1px solid #444",
            borderRadius: "8px",
            color: "inherit",
            fontSize: "1rem",
          }}
        />
        <button
          type="button"
          onClick={togglePause}
          style={{
            background: paused ? "#a44" : "#444",
          }}
        >
          {paused ? "Resume" : "Pause"}
        </button>
        <button
          type="button"
          onClick={clearEvents}
          style={{ background: "#444" }}
        >
          Clear
        </button>
      </div>

      {/* Type filters */}
      <div
        style={{
          display: "flex",
          gap: "0.5rem",
          marginBottom: "1.5rem",
          flexWrap: "wrap",
        }}
      >
        {FILE_TYPE_OPTIONS.map((type) => (
          <button
            type="button"
            key={type}
            onClick={() => toggleTypeFilter(type)}
            style={{
              padding: "0.5rem 0.75rem",
              fontSize: "0.875rem",
              background: typeFilters.has(type) ? "#4a4aff" : "#333",
              border: typeFilters.has(type)
                ? "1px solid #5a5aff"
                : "1px solid #444",
            }}
          >
            {getFileTypeLabel(type)}
          </button>
        ))}
        {typeFilters.size > 0 && (
          <button
            type="button"
            onClick={() => setTypeFilters(new Set())}
            style={{
              padding: "0.5rem 0.75rem",
              fontSize: "0.875rem",
              background: "#444",
            }}
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Stats */}
      <div
        style={{
          display: "flex",
          gap: "2rem",
          marginBottom: "1.5rem",
          fontSize: "0.875rem",
          color: "#888",
        }}
      >
        <span>Total: {events.length} events</span>
        <span>Showing: {displayedEvents.length}</span>
      </div>

      {/* Events */}
      {Object.entries(eventsByDate).length === 0 ? (
        <div style={{ textAlign: "center", padding: "3rem", color: "#888" }}>
          {events.length === 0
            ? "Waiting for file changes..."
            : "No events match current filters"}
        </div>
      ) : (
        Object.entries(eventsByDate).map(([date, dateEvents]) => (
          <div key={date} style={{ marginBottom: "2rem" }}>
            <h3
              style={{
                color: "#888",
                fontSize: "0.875rem",
                marginBottom: "0.5rem",
              }}
            >
              {date}
            </h3>
            <div
              style={{
                background: "#2a2a2a",
                borderRadius: "8px",
                overflow: "hidden",
              }}
            >
              {dateEvents.map((event, i) => (
                <div
                  key={`${event.timestamp}-${event.path}-${i}`}
                  style={{
                    padding: "0.75rem 1rem",
                    borderBottom:
                      i < dateEvents.length - 1 ? "1px solid #333" : "none",
                    display: "grid",
                    gridTemplateColumns: "80px 24px 100px 1fr",
                    gap: "0.75rem",
                    alignItems: "center",
                    fontFamily: "monospace",
                    fontSize: "0.875rem",
                  }}
                >
                  <span style={{ color: "#666" }}>
                    {formatTime(event.timestamp)}
                  </span>
                  <span
                    style={{
                      color: getTypeColor(event.type),
                      fontWeight: "bold",
                      textAlign: "center",
                    }}
                    title={getTypeLabel(event.type)}
                  >
                    {getTypeIcon(event.type)}
                  </span>
                  <span
                    style={{
                      color: "#888",
                      fontSize: "0.75rem",
                      background: "#333",
                      padding: "0.25rem 0.5rem",
                      borderRadius: "4px",
                      textAlign: "center",
                    }}
                  >
                    {getFileTypeLabel(event.fileType)}
                  </span>
                  <span
                    style={{
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                    title={event.path}
                  >
                    {event.relativePath}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}

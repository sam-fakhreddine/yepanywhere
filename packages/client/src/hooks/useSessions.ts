import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "../api/client";
import type { Project, SessionSummary } from "../types";
import {
  type FileChangeEvent,
  type SessionStatusEvent,
  useFileActivity,
} from "./useFileActivity";

const REFETCH_DEBOUNCE_MS = 500;

export function useSessions(projectId: string | undefined) {
  const [project, setProject] = useState<Project | null>(null);
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const refetchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetch = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await api.getProject(projectId);
      setProject(data.project);
      setSessions(data.sessions);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  // Debounced refetch for file change events
  const debouncedRefetch = useCallback(() => {
    if (refetchTimerRef.current) {
      clearTimeout(refetchTimerRef.current);
    }
    refetchTimerRef.current = setTimeout(() => {
      fetch();
    }, REFETCH_DEBOUNCE_MS);
  }, [fetch]);

  // Handle file change events
  const handleFileChange = useCallback(
    (event: FileChangeEvent) => {
      // Only care about session files
      if (event.fileType !== "session" && event.fileType !== "agent-session") {
        return;
      }

      // Check if this file belongs to the current project
      // Path format: projects/<encoded-project-id>/<session-id>.jsonl
      if (projectId && event.relativePath.includes(`projects/${projectId}/`)) {
        debouncedRefetch();
      }
    },
    [projectId, debouncedRefetch],
  );

  // Handle session status changes (real-time updates without refetch)
  const handleSessionStatusChange = useCallback(
    (event: SessionStatusEvent) => {
      if (event.projectId !== projectId) return;

      setSessions((prev) =>
        prev.map((session) =>
          session.id === event.sessionId
            ? { ...session, status: event.status }
            : session,
        ),
      );
    },
    [projectId],
  );

  // Subscribe to file activity and status changes
  useFileActivity({
    onFileChange: handleFileChange,
    onSessionStatusChange: handleSessionStatusChange,
  });

  // Initial fetch
  useEffect(() => {
    fetch();
  }, [fetch]);

  // Cleanup debounce timer
  useEffect(() => {
    return () => {
      if (refetchTimerRef.current) {
        clearTimeout(refetchTimerRef.current);
      }
    };
  }, []);

  return { project, sessions, loading, error, refetch: fetch };
}

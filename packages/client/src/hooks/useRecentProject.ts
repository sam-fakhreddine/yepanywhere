import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "yep-anywhere-recent-project";

/**
 * Get the most recently visited project ID from sessionStorage.
 * Returns null if none has been set.
 */
export function getRecentProjectId(): string | null {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem(STORAGE_KEY);
}

/**
 * Set the most recently visited project ID in sessionStorage.
 */
export function setRecentProjectId(projectId: string): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(STORAGE_KEY, projectId);
}

/**
 * Hook that tracks the most recently visited project.
 * - Returns the current recent project ID
 * - Provides a setter to update it (call when navigating to a project)
 * - Uses sessionStorage (tab-local, clears on tab close)
 */
export function useRecentProject(): [
  string | null,
  (projectId: string) => void,
] {
  const [recentProjectId, setRecentProjectIdState] = useState<string | null>(
    () => getRecentProjectId(),
  );

  const setRecentProject = useCallback((projectId: string) => {
    setRecentProjectId(projectId);
    setRecentProjectIdState(projectId);
  }, []);

  // Sync with sessionStorage on mount (in case another component updated it)
  useEffect(() => {
    setRecentProjectIdState(getRecentProjectId());
  }, []);

  return [recentProjectId, setRecentProject];
}

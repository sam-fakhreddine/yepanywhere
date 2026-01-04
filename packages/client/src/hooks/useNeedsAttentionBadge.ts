import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "../api/client";
import { useFileActivity } from "./useFileActivity";

// Debounce interval for refetch on SSE events
const REFETCH_DEBOUNCE_MS = 500;

// Regex to match and strip existing badge prefix like "(3) "
const BADGE_PREFIX_REGEX = /^\(\d+\)\s*/;

/**
 * Hook that monitors the global inbox "needs attention" count and updates
 * the browser tab title with a badge prefix like "(3) ".
 *
 * This hook works independently of useDocumentTitle - it observes title changes
 * and prepends/updates the badge as needed.
 */
export function useNeedsAttentionBadge() {
  const [count, setCount] = useState(0);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Fetch just the needs attention count
  const fetchCount = useCallback(async () => {
    try {
      const data = await api.getInbox();
      setCount(data.needsAttention.length);
    } catch {
      // Silently ignore errors - badge is non-critical
    }
  }, []);

  // Debounced refetch for SSE events
  const debouncedRefetch = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = setTimeout(fetchCount, REFETCH_DEBOUNCE_MS);
  }, [fetchCount]);

  // Subscribe to SSE events for real-time updates
  // onProcessStateChange fires when sessions enter/exit "waiting-input" state
  useFileActivity({
    onProcessStateChange: debouncedRefetch,
    onReconnect: fetchCount, // Refetch immediately on reconnect
  });

  // Initial fetch
  useEffect(() => {
    fetchCount();
  }, [fetchCount]);

  // Cleanup debounce timer
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  // Update document title when count changes
  useEffect(() => {
    // Track if we're currently updating to avoid observer loop
    let isUpdating = false;

    const updateTitle = () => {
      isUpdating = true;
      // Strip any existing badge prefix
      const baseTitle = document.title.replace(BADGE_PREFIX_REGEX, "");

      if (count > 0) {
        document.title = `(${count}) ${baseTitle}`;
      } else {
        document.title = baseTitle;
      }
      // Use setTimeout to reset flag after current mutation cycle completes
      setTimeout(() => {
        isUpdating = false;
      }, 0);
    };

    updateTitle();

    // Also observe title changes from useDocumentTitle and re-apply badge
    const observer = new MutationObserver(() => {
      // Skip if we're the ones who triggered the change
      if (isUpdating) return;

      // Check if the badge needs to be (re)applied
      const currentTitle = document.title;
      const hasCorrectBadge =
        count > 0
          ? currentTitle.startsWith(`(${count}) `)
          : !BADGE_PREFIX_REGEX.test(currentTitle);

      if (!hasCorrectBadge) {
        updateTitle();
      }
    });

    const titleElement = document.querySelector("title");
    if (titleElement) {
      observer.observe(titleElement, {
        childList: true,
        characterData: true,
        subtree: true,
      });
    }

    return () => {
      observer.disconnect();
      // Clean up badge on unmount
      document.title = document.title.replace(BADGE_PREFIX_REGEX, "");
    };
  }, [count]);

  return count;
}

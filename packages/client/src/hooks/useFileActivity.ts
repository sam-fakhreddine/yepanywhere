import { useCallback, useEffect, useRef, useState } from "react";

export type FileChangeType = "create" | "modify" | "delete";
export type FileType =
  | "session"
  | "agent-session"
  | "settings"
  | "credentials"
  | "other";

export interface FileChangeEvent {
  path: string;
  relativePath: string;
  type: FileChangeType;
  timestamp: string;
  fileType: FileType;
}

interface UseFileActivityOptions {
  /** Maximum number of events to keep in buffer (default: 500) */
  maxEvents?: number;
  /** Whether to connect on mount (default: true) */
  autoConnect?: boolean;
  /** Callback when a file change occurs */
  onFileChange?: (event: FileChangeEvent) => void;
}

const API_BASE = "/api";
const DEFAULT_MAX_EVENTS = 500;

export function useFileActivity(options: UseFileActivityOptions = {}) {
  const {
    maxEvents = DEFAULT_MAX_EVENTS,
    autoConnect = true,
    onFileChange,
  } = options;

  const [events, setEvents] = useState<FileChangeEvent[]>([]);
  const [connected, setConnected] = useState(false);
  const [paused, setPaused] = useState(false);

  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const onFileChangeRef = useRef(onFileChange);
  onFileChangeRef.current = onFileChange;

  const connect = useCallback(() => {
    if (eventSourceRef.current) return;

    const es = new EventSource(`${API_BASE}/activity/stream`);

    es.onopen = () => {
      setConnected(true);
    };

    const handleFileChange = (event: MessageEvent) => {
      if (event.data === undefined || event.data === null) return;

      try {
        const data = JSON.parse(event.data) as FileChangeEvent;

        // Call the callback
        onFileChangeRef.current?.(data);

        // Add to events buffer (unless paused)
        setEvents((prev) => {
          const next = [data, ...prev];
          return next.slice(0, maxEvents);
        });
      } catch {
        // Ignore malformed JSON
      }
    };

    es.addEventListener("connected", () => {
      // Connection acknowledged
    });

    es.addEventListener("file-change", handleFileChange);
    es.addEventListener("heartbeat", () => {
      // Keep-alive, no action needed
    });

    es.onerror = () => {
      setConnected(false);
      es.close();
      eventSourceRef.current = null;

      // Auto-reconnect after 2s
      reconnectTimeoutRef.current = setTimeout(connect, 2000);
    };

    eventSourceRef.current = es;
  }, [maxEvents]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    setConnected(false);
  }, []);

  const clearEvents = useCallback(() => {
    setEvents([]);
  }, []);

  const togglePause = useCallback(() => {
    setPaused((p) => !p);
  }, []);

  // Filter helpers
  const filterByPath = useCallback(
    (pattern: string) => {
      const regex = new RegExp(pattern, "i");
      return events.filter((e) => regex.test(e.relativePath));
    },
    [events],
  );

  const filterByType = useCallback(
    (fileType: FileType) => {
      return events.filter((e) => e.fileType === fileType);
    },
    [events],
  );

  // Auto-connect on mount
  useEffect(() => {
    if (autoConnect) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [autoConnect, connect, disconnect]);

  return {
    events,
    connected,
    paused,
    connect,
    disconnect,
    clearEvents,
    togglePause,
    filterByPath,
    filterByType,
  };
}

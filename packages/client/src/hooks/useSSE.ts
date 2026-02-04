import { useCallback, useEffect, useRef, useState } from "react";
import { authEvents } from "../lib/authEvents";
import {
  type Subscription,
  getGlobalConnection,
  getWebSocketConnection,
  isNonRetryableError,
} from "../lib/connection";
import { FetchSSE } from "../lib/connection/FetchSSE";
import { getWebsocketTransportEnabled } from "./useDeveloperMode";

/**
 * Time without events before considering connection stale and forcing reconnect.
 * Server sends heartbeats every 30s, so 45s gives margin for network latency.
 */
const STALE_THRESHOLD_MS = 45_000;
/** How often to check for stale connections */
const STALE_CHECK_INTERVAL_MS = 10_000;
/** How long page must be hidden before forcing reconnect on visibility change */
const VISIBILITY_RECONNECT_THRESHOLD_MS = 5_000;

interface UseSSEOptions {
  onMessage: (data: { eventType: string; [key: string]: unknown }) => void;
  onError?: (error: Event) => void;
  onOpen?: () => void;
}

/**
 * Extract sessionId from a session stream URL like /api/sessions/{id}/stream
 */
function extractSessionId(url: string): string | null {
  const match = url.match(/\/api\/sessions\/([^/]+)\/stream/);
  return match?.[1] ?? null;
}

export function useSSE(url: string | null, options: UseSSEOptions) {
  const [connected, setConnected] = useState(false);
  const eventSourceRef = useRef<FetchSSE | null>(null);
  const wsSubscriptionRef = useRef<Subscription | null>(null);
  const lastEventIdRef = useRef<string | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const optionsRef = useRef(options);
  optionsRef.current = options;
  // Track connected URL to skip StrictMode double-mount (not reset in cleanup)
  const mountedUrlRef = useRef<string | null>(null);
  // Track if using WebSocket
  const useWebSocketRef = useRef(false);
  // Track last event time for stale connection detection
  const lastEventTimeRef = useRef<number | null>(null);
  const staleCheckIntervalRef = useRef<ReturnType<typeof setInterval> | null>(
    null,
  );
  // Track if we've received heartbeats (proves server supports them)
  const hasReceivedHeartbeatRef = useRef(false);
  // Track when page was last visible (for visibility change reconnect)
  const lastVisibleTimeRef = useRef<number>(Date.now());

  // Start periodic stale connection check
  // Only triggers if we've received heartbeats (backward compat with old servers)
  const startStaleCheck = useCallback((connectFn: () => void) => {
    if (staleCheckIntervalRef.current) return;

    staleCheckIntervalRef.current = setInterval(() => {
      // Only check if we've received heartbeats and have a lastEventTime
      if (!lastEventTimeRef.current || !hasReceivedHeartbeatRef.current) return;

      const timeSinceLastEvent = Date.now() - lastEventTimeRef.current;
      if (timeSinceLastEvent > STALE_THRESHOLD_MS) {
        console.warn(
          `[useSSE] Connection stale (no events in ${Math.round(timeSinceLastEvent / 1000)}s), forcing reconnect`,
        );
        // Stop the interval first to prevent multiple reconnects
        if (staleCheckIntervalRef.current) {
          clearInterval(staleCheckIntervalRef.current);
          staleCheckIntervalRef.current = null;
        }
        // Clear current connections
        if (eventSourceRef.current) {
          eventSourceRef.current.close();
          eventSourceRef.current = null;
        }
        if (wsSubscriptionRef.current) {
          wsSubscriptionRef.current.close();
          wsSubscriptionRef.current = null;
        }
        setConnected(false);
        mountedUrlRef.current = null;
        // Reconnect after short delay
        reconnectTimeoutRef.current = setTimeout(connectFn, 500);
      }
    }, STALE_CHECK_INTERVAL_MS);
  }, []);

  // Stop the stale connection check
  const stopStaleCheck = useCallback(() => {
    if (staleCheckIntervalRef.current) {
      clearInterval(staleCheckIntervalRef.current);
      staleCheckIntervalRef.current = null;
    }
  }, []);

  const connect = useCallback(() => {
    if (!url) {
      // Reset tracking when URL becomes null so we can reconnect later
      // (e.g., when status goes idle → owned again for the same session)
      mountedUrlRef.current = null;
      return;
    }

    // Don't create duplicate connections
    if (eventSourceRef.current || wsSubscriptionRef.current) return;

    // Skip StrictMode double-mount (same URL, already connected once)
    if (mountedUrlRef.current === url) return;
    mountedUrlRef.current = url;

    const sessionId = extractSessionId(url);
    if (!sessionId) {
      // Not a session stream URL
      connectSSE(url);
      return;
    }

    // Check for global connection first (remote mode with SecureConnection)
    const globalConn = getGlobalConnection();
    if (globalConn) {
      useWebSocketRef.current = true;
      connectWithConnection(sessionId, globalConn);
      return;
    }

    // Check if WebSocket transport is enabled (developer mode)
    const useWebSocket = getWebsocketTransportEnabled();
    if (useWebSocket) {
      useWebSocketRef.current = true;
      connectWebSocket(sessionId);
    } else {
      useWebSocketRef.current = false;
      connectSSE(url);
    }
  }, [url]);

  /**
   * Connect using a provided connection (for remote mode).
   */
  const connectWithConnection = useCallback(
    (
      sessionId: string,
      connection: {
        subscribeSession: (
          sessionId: string,
          handlers: {
            onEvent: (
              eventType: string,
              eventId: string | undefined,
              data: unknown,
            ) => void;
            onOpen?: () => void;
            onError?: (err: Error) => void;
          },
          lastEventId?: string,
        ) => Subscription;
      },
    ) => {
      // Close any existing subscription before creating a new one
      if (wsSubscriptionRef.current) {
        wsSubscriptionRef.current.close();
        wsSubscriptionRef.current = null;
      }

      const handlers = {
        onEvent: (
          eventType: string,
          eventId: string | undefined,
          data: unknown,
        ) => {
          // Track last event time for stale detection
          lastEventTimeRef.current = Date.now();
          if (eventType === "heartbeat") {
            hasReceivedHeartbeatRef.current = true;
          }
          if (eventId) {
            lastEventIdRef.current = eventId;
          }
          optionsRef.current.onMessage({
            ...(data as Record<string, unknown>),
            eventType,
          });
        },
        onOpen: () => {
          setConnected(true);
          lastEventTimeRef.current = Date.now();
          startStaleCheck(connect);
          optionsRef.current.onOpen?.();
        },
        onError: (error: Error) => {
          setConnected(false);
          stopStaleCheck();
          optionsRef.current.onError?.(new Event("error"));

          // Don't reconnect for non-retryable errors (e.g., auth required)
          if (isNonRetryableError(error)) {
            console.warn(
              "[useSSE] Non-retryable error, not reconnecting:",
              error.message,
            );
            wsSubscriptionRef.current?.close();
            wsSubscriptionRef.current = null;
            return;
          }

          // Auto-reconnect after 2s
          wsSubscriptionRef.current?.close();
          wsSubscriptionRef.current = null;
          mountedUrlRef.current = null;
          reconnectTimeoutRef.current = setTimeout(connect, 2000);
        },
        onClose: () => {
          // Connection closed cleanly (e.g., relay restart) - trigger reconnect
          setConnected(false);
          stopStaleCheck();
          wsSubscriptionRef.current = null;
          mountedUrlRef.current = null;
          reconnectTimeoutRef.current = setTimeout(connect, 2000);
        },
      };

      wsSubscriptionRef.current = connection.subscribeSession(
        sessionId,
        handlers,
        lastEventIdRef.current ?? undefined,
      );
    },
    [connect, startStaleCheck, stopStaleCheck],
  );

  const connectWebSocket = useCallback(
    (sessionId: string) => {
      // Close any existing subscription before creating a new one
      if (wsSubscriptionRef.current) {
        wsSubscriptionRef.current.close();
        wsSubscriptionRef.current = null;
      }

      const connection = getWebSocketConnection();
      const handlers = {
        onEvent: (
          eventType: string,
          eventId: string | undefined,
          data: unknown,
        ) => {
          // Track last event time for stale detection
          lastEventTimeRef.current = Date.now();
          if (eventId) {
            lastEventIdRef.current = eventId;
          }
          // Route event to handler
          optionsRef.current.onMessage({
            ...(data as Record<string, unknown>),
            eventType,
          });
        },
        onOpen: () => {
          setConnected(true);
          lastEventTimeRef.current = Date.now();
          startStaleCheck(connect);
          optionsRef.current.onOpen?.();
        },
        onError: (error: Error) => {
          setConnected(false);
          stopStaleCheck();
          // Create a synthetic error event for compatibility
          optionsRef.current.onError?.(new Event("error"));

          // Don't reconnect for non-retryable errors (e.g., auth required)
          if (isNonRetryableError(error)) {
            console.warn(
              "[useSSE] Non-retryable error, not reconnecting:",
              error.message,
            );
            wsSubscriptionRef.current?.close();
            wsSubscriptionRef.current = null;
            return;
          }

          // Auto-reconnect after 2s
          wsSubscriptionRef.current?.close();
          wsSubscriptionRef.current = null;
          mountedUrlRef.current = null;
          reconnectTimeoutRef.current = setTimeout(connect, 2000);
        },
        onClose: () => {
          // Connection closed cleanly (e.g., relay restart) - trigger reconnect
          setConnected(false);
          stopStaleCheck();
          wsSubscriptionRef.current = null;
          mountedUrlRef.current = null;
          reconnectTimeoutRef.current = setTimeout(connect, 2000);
        },
      };

      wsSubscriptionRef.current = connection.subscribeSession(
        sessionId,
        handlers,
        lastEventIdRef.current ?? undefined,
      );
    },
    [connect, startStaleCheck, stopStaleCheck],
  );

  const connectSSE = useCallback(
    (url: string) => {
      // Don't connect if login is already required
      if (authEvents.loginRequired) {
        console.log("[useSSE] Skipping SSE connection - login required");
        return;
      }

      // FetchSSE handles lastEventId internally, but we pass it in the URL
      // for consistency with the existing behavior
      const fullUrl = lastEventIdRef.current
        ? `${url}?lastEventId=${lastEventIdRef.current}`
        : url;

      // Use FetchSSE instead of EventSource to detect 401 errors
      const sse = new FetchSSE(fullUrl, { autoReconnect: false });

      sse.onopen = () => {
        setConnected(true);
        lastEventTimeRef.current = Date.now();
        startStaleCheck(connect);
        optionsRef.current.onOpen?.();
      };

      // Handle named events from SSE stream
      const handleEvent = (eventType: string) => (event: MessageEvent) => {
        // Track last event time for stale detection
        lastEventTimeRef.current = Date.now();
        if (eventType === "heartbeat") {
          hasReceivedHeartbeatRef.current = true;
        }
        if (event.lastEventId) {
          lastEventIdRef.current = event.lastEventId;
        }
        // Guard against undefined data (can happen on connection errors)
        if (event.data === undefined || event.data === null) {
          return;
        }
        try {
          const data = JSON.parse(event.data);
          // Use eventType (SSE event name), not data.type (SDK message type)
          optionsRef.current.onMessage({ ...data, eventType });
        } catch {
          // Ignore malformed JSON
        }
      };

      sse.addEventListener("connected", handleEvent("connected"));
      sse.addEventListener("message", handleEvent("message"));
      sse.addEventListener("status", handleEvent("status"));
      sse.addEventListener("mode-change", handleEvent("mode-change"));
      sse.addEventListener("error", handleEvent("error"));
      sse.addEventListener("complete", handleEvent("complete"));
      sse.addEventListener("heartbeat", handleEvent("heartbeat"));
      sse.addEventListener("markdown-augment", handleEvent("markdown-augment"));
      sse.addEventListener("pending", handleEvent("pending"));
      sse.addEventListener("edit-augment", handleEvent("edit-augment"));
      sse.addEventListener("claude-login", handleEvent("claude-login"));
      sse.addEventListener(
        "session-id-changed",
        handleEvent("session-id-changed"),
      );

      sse.onerror = (error) => {
        setConnected(false);
        stopStaleCheck();
        optionsRef.current.onError?.(new Event("error"));

        // Don't reconnect for auth errors (FetchSSE handles signaling)
        if (error.isAuthError) {
          console.log("[useSSE] Auth error, not reconnecting");
          sse.close();
          eventSourceRef.current = null;
          return;
        }

        // Auto-reconnect after 2s for other errors
        sse.close();
        eventSourceRef.current = null;
        mountedUrlRef.current = null; // Reset so reconnect isn't blocked
        reconnectTimeoutRef.current = setTimeout(connect, 2000);
      };

      eventSourceRef.current = sse;
    },
    [connect, startStaleCheck, stopStaleCheck],
  );

  useEffect(() => {
    connect();

    // Handle visibility changes to force reconnect when page becomes visible
    // This is needed because:
    // - Local mode: SSE connections go stale during phone sleep
    // - Remote mode: SecureConnection.forceReconnect() doesn't re-establish session subscriptions
    //   (only ActivityBus explicitly re-subscribes, session streams are orphaned)
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        const hiddenDuration = Date.now() - lastVisibleTimeRef.current;
        if (hiddenDuration > VISIBILITY_RECONNECT_THRESHOLD_MS) {
          console.log(
            `[useSSE] Page visible after ${Math.round(hiddenDuration / 1000)}s, forcing reconnect`,
          );
          // Clear current connections
          stopStaleCheck();
          if (eventSourceRef.current) {
            eventSourceRef.current.close();
            eventSourceRef.current = null;
          }
          if (wsSubscriptionRef.current) {
            wsSubscriptionRef.current.close();
            wsSubscriptionRef.current = null;
          }
          setConnected(false);
          mountedUrlRef.current = null;
          // Reconnect immediately
          connect();
        }
      } else {
        lastVisibleTimeRef.current = Date.now();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      stopStaleCheck();
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      eventSourceRef.current?.close();
      eventSourceRef.current = null;
      wsSubscriptionRef.current?.close();
      wsSubscriptionRef.current = null;
      // Reset mountedUrlRef so the next mount can connect
      // This is needed for StrictMode where cleanup runs between mounts
      mountedUrlRef.current = null;
    };
  }, [connect, stopStaleCheck]);

  return { connected };
}

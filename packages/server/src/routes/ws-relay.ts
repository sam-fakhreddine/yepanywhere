import type { HttpBindings } from "@hono/node-server";
import type {
  RelayEvent,
  RelayRequest,
  RelayResponse,
  RelaySubscribe,
  RelayUnsubscribe,
  RemoteClientMessage,
  YepMessage,
} from "@yep-anywhere/shared";
import type { Context, Hono } from "hono";
import type { WSContext, WSEvents } from "hono/ws";
import type { Supervisor } from "../supervisor/Supervisor.js";
import type { EventBus } from "../watcher/index.js";

// biome-ignore lint/suspicious/noExplicitAny: Complex third-party type from @hono/node-ws
type UpgradeWebSocketFn = (createEvents: (c: Context) => WSEvents) => any;

export interface WsRelayDeps {
  upgradeWebSocket: UpgradeWebSocketFn;
  /** The main Hono app to route requests through */
  app: Hono<{ Bindings: HttpBindings }>;
  /** Base URL for internal requests (e.g., "http://localhost:3400") */
  baseUrl: string;
  /** Supervisor for subscribing to session events */
  supervisor: Supervisor;
  /** Event bus for subscribing to activity events */
  eventBus: EventBus;
}

/**
 * Create WebSocket relay routes for Phase 2b/2c.
 *
 * This endpoint allows clients to send HTTP-like requests over WebSocket,
 * which are then routed to the existing Hono handlers and responses returned.
 *
 * Supports:
 * - request/response (Phase 2b)
 * - subscriptions for session and activity events (Phase 2c)
 */
export function createWsRelayRoutes(
  deps: WsRelayDeps,
): ReturnType<typeof deps.upgradeWebSocket> {
  const { upgradeWebSocket, app, baseUrl, supervisor, eventBus } = deps;

  const sendMessage = (ws: WSContext, msg: YepMessage) => {
    ws.send(JSON.stringify(msg));
  };

  const sendError = (
    ws: WSContext,
    requestId: string,
    status: number,
    message: string,
  ) => {
    const response: RelayResponse = {
      type: "response",
      id: requestId,
      status,
      body: { error: message },
    };
    sendMessage(ws, response);
  };

  /**
   * Handle a RelayRequest by routing it through the Hono app.
   */
  const handleRequest = async (
    ws: WSContext,
    request: RelayRequest,
  ): Promise<void> => {
    try {
      // Build the full URL
      const url = new URL(request.path, baseUrl);

      // Build headers
      const headers = new Headers(request.headers);
      // Add the custom header required by security middleware
      headers.set("X-Yep-Anywhere", "true");
      // Mark as coming from WebSocket relay for debugging
      headers.set("X-Ws-Relay", "true");
      if (request.body !== undefined) {
        headers.set("Content-Type", "application/json");
      }

      // Build the fetch request
      const fetchInit: RequestInit = {
        method: request.method,
        headers,
      };

      // Add body for methods that support it
      if (
        request.body !== undefined &&
        request.method !== "GET" &&
        request.method !== "DELETE"
      ) {
        fetchInit.body = JSON.stringify(request.body);
      }

      // Create a Request object
      const fetchRequest = new Request(url.toString(), fetchInit);

      // Route through Hono app's fetch handler
      const response = await app.fetch(fetchRequest);

      // Parse response body
      let body: unknown;
      const contentType = response.headers.get("Content-Type") ?? "";
      if (contentType.includes("application/json")) {
        try {
          body = await response.json();
        } catch {
          body = null;
        }
      } else {
        // For non-JSON responses, include the text
        const text = await response.text();
        body = text || null;
      }

      // Extract response headers we care about
      const responseHeaders: Record<string, string> = {};
      for (const [key, value] of response.headers.entries()) {
        // Only include relevant headers
        if (
          key.toLowerCase().startsWith("x-") ||
          key.toLowerCase() === "content-type" ||
          key.toLowerCase() === "etag"
        ) {
          responseHeaders[key] = value;
        }
      }

      // Send response
      const relayResponse: RelayResponse = {
        type: "response",
        id: request.id,
        status: response.status,
        headers:
          Object.keys(responseHeaders).length > 0 ? responseHeaders : undefined,
        body,
      };
      sendMessage(ws, relayResponse);
    } catch (err) {
      console.error("[WS Relay] Request error:", err);
      sendError(ws, request.id, 500, "Internal server error");
    }
  };

  /**
   * Handle a session subscription.
   * Subscribes to process events and forwards them as RelayEvent messages.
   */
  const handleSessionSubscribe = (
    ws: WSContext,
    subscriptions: Map<string, () => void>,
    msg: RelaySubscribe,
  ): void => {
    const { subscriptionId, sessionId } = msg;

    if (!sessionId) {
      sendError(
        ws,
        subscriptionId,
        400,
        "sessionId required for session channel",
      );
      return;
    }

    const process = supervisor.getProcessForSession(sessionId);
    if (!process) {
      sendError(ws, subscriptionId, 404, "No active process for session");
      return;
    }

    let eventId = 0;

    // Send initial connected event with current state
    const currentState = process.state;
    const connectedEvent: RelayEvent = {
      type: "event",
      subscriptionId,
      eventType: "connected",
      eventId: String(eventId++),
      data: {
        processId: process.id,
        sessionId: process.sessionId,
        state: currentState.type,
        permissionMode: process.permissionMode,
        modeVersion: process.modeVersion,
        provider: process.provider,
        model: process.model,
        ...(currentState.type === "waiting-input"
          ? { request: currentState.request }
          : {}),
      },
    };
    sendMessage(ws, connectedEvent);

    // Replay buffered messages for clients that connect after messages were emitted
    for (const message of process.getMessageHistory()) {
      const messageEvent: RelayEvent = {
        type: "event",
        subscriptionId,
        eventType: "message",
        eventId: String(eventId++),
        data: message,
      };
      sendMessage(ws, messageEvent);
    }

    // Set up heartbeat
    const heartbeatInterval = setInterval(() => {
      try {
        const heartbeatEvent: RelayEvent = {
          type: "event",
          subscriptionId,
          eventType: "heartbeat",
          eventId: String(eventId++),
          data: { timestamp: new Date().toISOString() },
        };
        sendMessage(ws, heartbeatEvent);
      } catch {
        clearInterval(heartbeatInterval);
      }
    }, 30000);

    // Subscribe to process events
    const unsubscribe = process.subscribe((event) => {
      try {
        let eventType: string;
        let data: unknown;

        switch (event.type) {
          case "message":
            eventType = "message";
            data = event.message;
            break;

          case "state-change":
            eventType = "status";
            data = {
              state: event.state.type,
              ...(event.state.type === "waiting-input"
                ? { request: event.state.request }
                : {}),
            };
            break;

          case "mode-change":
            eventType = "mode-change";
            data = {
              permissionMode: event.mode,
              modeVersion: event.version,
            };
            break;

          case "error":
            eventType = "error";
            data = { message: event.error.message };
            break;

          case "claude-login":
            eventType = "claude-login";
            data = event.event;
            break;

          case "session-id-changed":
            eventType = "session-id-changed";
            data = {
              oldSessionId: event.oldSessionId,
              newSessionId: event.newSessionId,
            };
            break;

          case "complete":
            eventType = "complete";
            data = { timestamp: new Date().toISOString() };
            break;

          default:
            return; // Unknown event type, skip
        }

        const relayEvent: RelayEvent = {
          type: "event",
          subscriptionId,
          eventType,
          eventId: String(eventId++),
          data,
        };
        sendMessage(ws, relayEvent);
      } catch (err) {
        console.error("[WS Relay] Error sending session event:", err);
      }
    });

    // Store cleanup function
    subscriptions.set(subscriptionId, () => {
      clearInterval(heartbeatInterval);
      unsubscribe();
    });

    console.log(
      `[WS Relay] Subscribed to session ${sessionId} (${subscriptionId})`,
    );
  };

  /**
   * Handle an activity subscription.
   * Subscribes to event bus and forwards events as RelayEvent messages.
   */
  const handleActivitySubscribe = (
    ws: WSContext,
    subscriptions: Map<string, () => void>,
    msg: RelaySubscribe,
  ): void => {
    const { subscriptionId } = msg;

    let eventId = 0;

    // Send initial connected event
    const connectedEvent: RelayEvent = {
      type: "event",
      subscriptionId,
      eventType: "connected",
      eventId: String(eventId++),
      data: { timestamp: new Date().toISOString() },
    };
    sendMessage(ws, connectedEvent);

    // Set up heartbeat
    const heartbeatInterval = setInterval(() => {
      try {
        const heartbeatEvent: RelayEvent = {
          type: "event",
          subscriptionId,
          eventType: "heartbeat",
          eventId: String(eventId++),
          data: { timestamp: new Date().toISOString() },
        };
        sendMessage(ws, heartbeatEvent);
      } catch {
        clearInterval(heartbeatInterval);
      }
    }, 30000);

    // Subscribe to event bus
    const unsubscribe = eventBus.subscribe((event) => {
      try {
        const relayEvent: RelayEvent = {
          type: "event",
          subscriptionId,
          eventType: event.type,
          eventId: String(eventId++),
          data: event,
        };
        sendMessage(ws, relayEvent);
      } catch (err) {
        console.error("[WS Relay] Error sending activity event:", err);
      }
    });

    // Store cleanup function
    subscriptions.set(subscriptionId, () => {
      clearInterval(heartbeatInterval);
      unsubscribe();
    });

    console.log(`[WS Relay] Subscribed to activity (${subscriptionId})`);
  };

  /**
   * Handle a subscribe message.
   */
  const handleSubscribe = (
    ws: WSContext,
    subscriptions: Map<string, () => void>,
    msg: RelaySubscribe,
  ): void => {
    const { subscriptionId, channel } = msg;

    // Check if already subscribed with this ID
    if (subscriptions.has(subscriptionId)) {
      sendError(ws, subscriptionId, 400, "Subscription ID already in use");
      return;
    }

    switch (channel) {
      case "session":
        handleSessionSubscribe(ws, subscriptions, msg);
        break;

      case "activity":
        handleActivitySubscribe(ws, subscriptions, msg);
        break;

      default:
        sendError(ws, subscriptionId, 400, `Unknown channel: ${channel}`);
    }
  };

  /**
   * Handle an unsubscribe message.
   */
  const handleUnsubscribe = (
    subscriptions: Map<string, () => void>,
    msg: RelayUnsubscribe,
  ): void => {
    const { subscriptionId } = msg;
    const cleanup = subscriptions.get(subscriptionId);
    if (cleanup) {
      cleanup();
      subscriptions.delete(subscriptionId);
      console.log(`[WS Relay] Unsubscribed (${subscriptionId})`);
    }
  };

  /**
   * Handle incoming WebSocket messages.
   */
  const handleMessage = async (
    ws: WSContext,
    subscriptions: Map<string, () => void>,
    data: unknown,
  ): Promise<void> => {
    // Parse message
    let msg: RemoteClientMessage;
    try {
      if (typeof data !== "string") {
        console.warn("[WS Relay] Ignoring non-string message");
        return;
      }
      msg = JSON.parse(data) as RemoteClientMessage;
    } catch {
      console.warn("[WS Relay] Failed to parse message:", data);
      return;
    }

    // Route by message type
    switch (msg.type) {
      case "request":
        await handleRequest(ws, msg);
        break;

      case "subscribe":
        handleSubscribe(ws, subscriptions, msg);
        break;

      case "unsubscribe":
        handleUnsubscribe(subscriptions, msg);
        break;

      case "upload_start":
      case "upload_chunk":
      case "upload_end":
        // Phase 2d - not yet implemented
        sendError(ws, "uploads", 501, "Uploads not yet implemented");
        break;

      default:
        console.warn(
          "[WS Relay] Unknown message type:",
          (msg as { type?: string }).type,
        );
    }
  };

  // Return the WebSocket handler
  return upgradeWebSocket((_c) => {
    // Track active subscriptions for this connection
    const subscriptions = new Map<string, () => void>();
    // Message queue to serialize async message handling
    let messageQueue: Promise<void> = Promise.resolve();

    return {
      onOpen(_evt, ws) {
        console.log("[WS Relay] Client connected");
      },

      onMessage(evt, ws) {
        // Queue messages for sequential processing
        messageQueue = messageQueue.then(() =>
          handleMessage(ws, subscriptions, evt.data).catch((err) => {
            console.error("[WS Relay] Unexpected error:", err);
          }),
        );
      },

      onClose(_evt, _ws) {
        // Clean up all subscriptions
        for (const [id, cleanup] of subscriptions) {
          try {
            cleanup();
          } catch (err) {
            console.error(
              `[WS Relay] Error cleaning up subscription ${id}:`,
              err,
            );
          }
        }
        subscriptions.clear();
        console.log("[WS Relay] Client disconnected");
      },

      onError(evt, _ws) {
        console.error("[WS Relay] WebSocket error:", evt);
      },
    };
  });
}

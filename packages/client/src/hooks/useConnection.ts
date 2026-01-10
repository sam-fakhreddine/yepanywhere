import {
  type Connection,
  directConnection,
  getWebSocketConnection,
} from "../lib/connection";
import { useDeveloperMode } from "./useDeveloperMode";

/**
 * Hook that provides the current connection to the server.
 *
 * Returns DirectConnection by default, or WebSocketConnection
 * if the "WebSocket transport" developer setting is enabled.
 *
 * Phase 3+ will add SecureConnection support for encrypted relay connections.
 *
 * @returns The active Connection instance
 */
export function useConnection(): Connection {
  const { websocketTransportEnabled } = useDeveloperMode();

  // Phase 2b: Check developer setting for WebSocket transport
  if (websocketTransportEnabled) {
    return getWebSocketConnection();
  }

  // Default: use direct connection (fetch + SSE)
  return directConnection;
}

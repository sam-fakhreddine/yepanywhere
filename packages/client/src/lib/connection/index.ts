export type {
  Connection,
  StreamHandlers,
  Subscription,
  UploadOptions,
} from "./types";
export { DirectConnection, directConnection } from "./DirectConnection";
export {
  WebSocketConnection,
  getWebSocketConnection,
} from "./WebSocketConnection";
export { SecureConnection } from "./SecureConnection";

import type { Connection } from "./types";

/**
 * Global connection for remote mode.
 *
 * When set, this connection is used for all API calls instead of
 * the default DirectConnection/WebSocketConnection.
 *
 * Set this after successful SRP authentication in remote mode.
 */
let globalConnection: Connection | null = null;

/**
 * Set the global connection (for remote mode).
 */
export function setGlobalConnection(connection: Connection | null): void {
  globalConnection = connection;
}

/**
 * Get the global connection if set.
 */
export function getGlobalConnection(): Connection | null {
  return globalConnection;
}

/**
 * Check if running in remote mode (global connection is set).
 */
export function isRemoteMode(): boolean {
  return globalConnection !== null;
}

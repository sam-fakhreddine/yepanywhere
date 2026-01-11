/**
 * RelayClientService manages the connection from a yepanywhere server to a relay server.
 *
 * The relay enables phone clients to connect to yepanywhere servers behind NAT.
 * This service:
 * - Maintains a persistent "waiting" connection to the relay
 * - Handles registration with the relay using username and installId
 * - Detects when the connection is "claimed" by a phone client
 * - Hands off claimed connections to the WebSocket relay handler
 * - Automatically reconnects with exponential backoff
 */

import {
  type RelayServerRegister,
  type RelayServerRejected,
  isRelayServerRegistered,
  isRelayServerRejected,
} from "@yep-anywhere/shared";
import { WebSocket } from "ws";

export interface RelayClientConfig {
  /** WebSocket URL of the relay server (e.g., wss://relay.yepanywhere.com/ws) */
  relayUrl: string;
  /** Username to register with the relay */
  username: string;
  /** Installation ID for ownership verification */
  installId: string;
  /**
   * Called when a connection is claimed by a phone client.
   * The first message (SRP init) is passed along with the WebSocket.
   */
  onRelayConnection: (ws: WebSocket, firstMessage: string | Buffer) => void;
  /** Called when connection status changes (for UI updates) */
  onStatusChange?: (status: RelayClientStatus) => void;
}

export type RelayClientStatus =
  | "disconnected"
  | "connecting"
  | "registering"
  | "waiting"
  | "rejected";

export interface RelayClientState {
  status: RelayClientStatus;
  /** Error message if status is "rejected" */
  error?: string;
  /** Number of consecutive reconnection attempts */
  reconnectAttempts: number;
}

/**
 * Exponential backoff calculator for reconnection delays.
 */
class ExponentialBackoff {
  private attempts = 0;

  constructor(
    private readonly initialDelay: number = 1000,
    private readonly maxDelay: number = 60_000,
    private readonly multiplier: number = 2,
  ) {}

  /**
   * Get the next delay and increment the attempt counter.
   */
  next(): number {
    const delay = Math.min(
      this.initialDelay * this.multiplier ** this.attempts,
      this.maxDelay,
    );
    this.attempts++;
    return delay;
  }

  /**
   * Reset the backoff counter (call on successful connection).
   */
  reset(): void {
    this.attempts = 0;
  }

  /**
   * Get current attempt count for status reporting.
   */
  getAttempts(): number {
    return this.attempts;
  }
}

export class RelayClientService {
  /** WebSocket that has completed registration and is waiting for a client */
  private waitingWs: WebSocket | null = null;
  /** WebSocket that is currently connecting/registering (not yet waiting) */
  private connectingWs: WebSocket | null = null;
  private backoff: ExponentialBackoff;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private state: RelayClientState = {
    status: "disconnected",
    reconnectAttempts: 0,
  };
  private enabled = false;
  private config: RelayClientConfig | null = null;

  constructor() {
    this.backoff = new ExponentialBackoff(1000, 60_000, 2);
  }

  /**
   * Configure and start the relay client.
   * Call this when relay settings are updated.
   */
  start(config: RelayClientConfig): void {
    // Stop any existing connection
    this.stop();

    this.config = config;
    this.enabled = true;
    this.connect();
  }

  /**
   * Stop the relay client and disconnect.
   */
  stop(): void {
    this.enabled = false;
    this.clearReconnectTimer();

    if (this.connectingWs) {
      this.connectingWs.close();
      this.connectingWs = null;
    }

    if (this.waitingWs) {
      this.waitingWs.close();
      this.waitingWs = null;
    }

    this.updateState({ status: "disconnected", reconnectAttempts: 0 });
  }

  /**
   * Get the current connection state.
   */
  getState(): RelayClientState {
    return { ...this.state };
  }

  /**
   * Check if the relay client is enabled and configured.
   */
  isEnabled(): boolean {
    return this.enabled && this.config !== null;
  }

  /**
   * Update the relay URL without changing other settings.
   * Reconnects if already connected.
   */
  updateRelayUrl(relayUrl: string): void {
    if (!this.config) return;
    this.start({ ...this.config, relayUrl });
  }

  /**
   * Update the username without changing other settings.
   * Reconnects if already connected.
   */
  updateUsername(username: string): void {
    if (!this.config) return;
    this.start({ ...this.config, username });
  }

  private connect(): void {
    if (!this.enabled || !this.config) return;

    this.updateState({ status: "connecting" });

    try {
      const ws = new WebSocket(this.config.relayUrl);
      this.connectingWs = ws;

      ws.on("open", () => {
        this.handleOpen(ws);
      });

      ws.on("message", (data: Buffer | string) => {
        this.handleMessage(ws, data);
      });

      ws.on("close", () => {
        this.handleClose(ws);
      });

      ws.on("error", (error: Error) => {
        this.handleError(ws, error);
      });
    } catch (error) {
      console.error("[RelayClient] Failed to create WebSocket:", error);
      this.scheduleReconnect();
    }
  }

  private handleOpen(ws: WebSocket): void {
    if (!this.config) return;

    console.log(`[RelayClient] Connected to relay: ${this.config.relayUrl}`);
    this.updateState({ status: "registering" });

    // Send registration message
    const register: RelayServerRegister = {
      type: "server_register",
      username: this.config.username,
      installId: this.config.installId,
    };
    ws.send(JSON.stringify(register));
  }

  private handleMessage(ws: WebSocket, data: Buffer | string): void {
    // Try to parse as JSON for relay protocol messages
    let parsed: unknown;
    try {
      const str = typeof data === "string" ? data : data.toString("utf-8");
      parsed = JSON.parse(str);
    } catch {
      // Not JSON - this is the first message from a phone client (SRP init)
      this.handleClaimed(ws, data);
      return;
    }

    // Handle relay protocol responses
    if (isRelayServerRegistered(parsed)) {
      console.log(
        `[RelayClient] Registered with relay as: ${this.config?.username}`,
      );
      // Transition from connecting to waiting
      this.connectingWs = null;
      this.waitingWs = ws;
      this.backoff.reset();
      this.updateState({ status: "waiting", reconnectAttempts: 0 });
      return;
    }

    if (isRelayServerRejected(parsed)) {
      this.handleRejection(ws, parsed);
      return;
    }

    // Unknown message type - could be first message from client
    // Relay switches to passthrough mode after pairing, so any non-protocol
    // message indicates the connection has been claimed
    this.handleClaimed(ws, data);
  }

  private handleRejection(ws: WebSocket, msg: RelayServerRejected): void {
    console.warn(`[RelayClient] Registration rejected: ${msg.reason}`);

    // Close the connection
    ws.close();

    if (msg.reason === "username_taken") {
      // Permanent error - don't reconnect
      this.updateState({
        status: "rejected",
        error: `Username "${this.config?.username}" is already registered by another server`,
      });
      // Disable auto-reconnect for this error
      this.enabled = false;
    } else if (msg.reason === "invalid_username") {
      // Permanent error - username format is wrong
      this.updateState({
        status: "rejected",
        error: `Invalid username format: "${this.config?.username}"`,
      });
      this.enabled = false;
    } else {
      // Unknown rejection reason - try to reconnect
      this.scheduleReconnect();
    }
  }

  private handleClaimed(ws: WebSocket, firstMessage: Buffer | string): void {
    if (!this.config) return;

    console.log("[RelayClient] Connection claimed by phone client");

    // Remove from waiting state (it's now claimed)
    this.waitingWs = null;

    // Hand off to the WebSocket relay handler
    this.config.onRelayConnection(ws, firstMessage);

    // Immediately open a new waiting connection
    this.connect();
  }

  private handleClose(ws: WebSocket): void {
    // Only handle close for connections we're managing
    // Claimed connections are handed off and managed elsewhere
    if (ws === this.connectingWs) {
      console.log("[RelayClient] Connecting socket closed");
      this.connectingWs = null;
      this.scheduleReconnect();
      return;
    }

    if (ws === this.waitingWs) {
      console.log("[RelayClient] Connection closed");
      this.waitingWs = null;
      this.scheduleReconnect();
      return;
    }

    // Not our connection (either claimed or already replaced), ignore
  }

  private handleError(ws: WebSocket, error: Error): void {
    // Only log errors for connections we're managing
    if (ws !== this.waitingWs && ws !== this.connectingWs) return;

    console.error("[RelayClient] WebSocket error:", error.message);
    // Close event will trigger reconnection
  }

  private scheduleReconnect(): void {
    if (!this.enabled) return;

    this.clearReconnectTimer();

    const delay = this.backoff.next();
    const attempts = this.backoff.getAttempts();

    console.log(
      `[RelayClient] Reconnecting in ${delay}ms (attempt ${attempts})`,
    );
    this.updateState({
      status: "disconnected",
      reconnectAttempts: attempts,
    });

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, delay);
  }

  private clearReconnectTimer(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  private updateState(updates: Partial<RelayClientState>): void {
    const newState = { ...this.state, ...updates };

    // Only notify if status changed
    if (
      newState.status !== this.state.status ||
      newState.error !== this.state.error
    ) {
      this.state = newState;
      this.config?.onStatusChange?.(newState.status);
    } else {
      this.state = newState;
    }
  }
}

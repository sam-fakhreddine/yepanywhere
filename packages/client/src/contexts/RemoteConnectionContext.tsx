/**
 * RemoteConnectionContext - Provides SecureConnection for remote client.
 *
 * This context manages the SecureConnection lifecycle and provides it to
 * the app. Unlike the regular client which uses DirectConnection by default,
 * the remote client ONLY uses SecureConnection.
 */

import {
  type ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { setGlobalConnection } from "../lib/connection";
import { SecureConnection } from "../lib/connection/SecureConnection";
import type { Connection } from "../lib/connection/types";

/** Stored credentials for auto-reconnect */
interface StoredCredentials {
  wsUrl: string;
  username: string;
  // Note: We don't store the password. User must re-enter on page refresh.
  // The session key is derived from password during SRP, not stored.
}

interface RemoteConnectionState {
  /** The active connection (null if not connected) */
  connection: Connection | null;
  /** Whether a connection attempt is in progress */
  isConnecting: boolean;
  /** Error from last connection attempt */
  error: string | null;
  /** Connect to server with credentials */
  connect: (wsUrl: string, username: string, password: string) => Promise<void>;
  /** Disconnect and clear credentials */
  disconnect: () => void;
  /** Stored server URL (for pre-filling form) */
  storedUrl: string | null;
  /** Stored username (for pre-filling form) */
  storedUsername: string | null;
}

const RemoteConnectionContext = createContext<RemoteConnectionState | null>(
  null,
);

const STORAGE_KEY = "yep-anywhere-remote-credentials";

function loadStoredCredentials(): StoredCredentials | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored) as StoredCredentials;
    }
  } catch {
    // Ignore parse errors
  }
  return null;
}

function saveCredentials(wsUrl: string, username: string): void {
  try {
    const creds: StoredCredentials = { wsUrl, username };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(creds));
  } catch {
    // Ignore storage errors
  }
}

function clearStoredCredentials(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore storage errors
  }
}

interface Props {
  children: ReactNode;
}

export function RemoteConnectionProvider({ children }: Props) {
  const [connection, setConnection] = useState<SecureConnection | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load stored credentials for form pre-fill
  const stored = loadStoredCredentials();

  const connect = useCallback(
    async (wsUrl: string, username: string, password: string) => {
      setIsConnecting(true);
      setError(null);

      try {
        // Create and authenticate connection
        const conn = new SecureConnection(wsUrl, username, password);

        // Test the connection by making a simple request
        // This triggers the SRP handshake and verifies auth
        await conn.fetch("/auth/status");

        // Save credentials (without password) for reconnection
        saveCredentials(wsUrl, username);

        setConnection(conn);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Connection failed";
        setError(message);
        throw err;
      } finally {
        setIsConnecting(false);
      }
    },
    [],
  );

  const disconnect = useCallback(() => {
    if (connection) {
      connection.close();
      setConnection(null);
    }
    clearStoredCredentials();
    setError(null);
  }, [connection]);

  // Set global connection for fetchJSON routing
  useEffect(() => {
    setGlobalConnection(connection);
    return () => {
      setGlobalConnection(null);
      connection?.close();
    };
  }, [connection]);

  const value: RemoteConnectionState = {
    connection,
    isConnecting,
    error,
    connect,
    disconnect,
    storedUrl: stored?.wsUrl ?? null,
    storedUsername: stored?.username ?? null,
  };

  return (
    <RemoteConnectionContext.Provider value={value}>
      {children}
    </RemoteConnectionContext.Provider>
  );
}

export function useRemoteConnection(): RemoteConnectionState {
  const context = useContext(RemoteConnectionContext);
  if (!context) {
    throw new Error(
      "useRemoteConnection must be used within RemoteConnectionProvider",
    );
  }
  return context;
}

/**
 * Hook to get the connection, throwing if not connected.
 * Use this in components that require an active connection.
 */
export function useRequiredConnection(): Connection {
  const { connection } = useRemoteConnection();
  if (!connection) {
    throw new Error("No active connection");
  }
  return connection;
}

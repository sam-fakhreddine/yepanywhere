/**
 * RemoteApp - Wrapper for remote client mode.
 *
 * This replaces the regular App wrapper for the remote (static) client.
 * Key differences:
 * - No AuthProvider (SRP handles authentication)
 * - Shows login page when not connected
 * - Uses RemoteConnectionProvider for connection state
 */

import type { ReactNode } from "react";
import { FloatingActionButton } from "./components/FloatingActionButton";
import { InboxProvider } from "./contexts/InboxContext";
import {
  RemoteConnectionProvider,
  useRemoteConnection,
} from "./contexts/RemoteConnectionContext";
import { SchemaValidationProvider } from "./contexts/SchemaValidationContext";
import { ToastProvider } from "./contexts/ToastContext";
import { useNeedsAttentionBadge } from "./hooks/useNeedsAttentionBadge";
import { useSyncNotifyInAppSetting } from "./hooks/useNotifyInApp";
import { useRemoteActivityBusConnection } from "./hooks/useRemoteActivityBusConnection";
import { RemoteLoginPage } from "./pages/RemoteLoginPage";

interface Props {
  children: ReactNode;
}

/**
 * Inner content that requires connection.
 * Only rendered when we have an active SecureConnection.
 */
function RemoteAppContent({ children }: Props) {
  // Manage activity bus connection (via SecureConnection subscribeActivity)
  useRemoteActivityBusConnection();

  // Sync notifyInApp setting to service worker on app startup and SW restarts
  useSyncNotifyInAppSetting();

  // Update tab title with needs-attention badge count (uses InboxContext)
  useNeedsAttentionBadge();

  return (
    <>
      {children}
      <FloatingActionButton />
    </>
  );
}

/**
 * Gate component that shows login or app based on connection state.
 */
function ConnectionGate({ children }: Props) {
  const { connection } = useRemoteConnection();

  // Show login page if not connected
  if (!connection) {
    return <RemoteLoginPage />;
  }

  // Connected - show the app with providers that need connection
  return (
    <InboxProvider>
      <SchemaValidationProvider>
        <RemoteAppContent>{children}</RemoteAppContent>
      </SchemaValidationProvider>
    </InboxProvider>
  );
}

/**
 * RemoteApp wrapper for remote client mode.
 *
 * Provides:
 * - ToastProvider (always available)
 * - RemoteConnectionProvider for connection management
 * - Login gate that shows login or app
 */
export function RemoteApp({ children }: Props) {
  return (
    <ToastProvider>
      <RemoteConnectionProvider>
        <ConnectionGate>{children}</ConnectionGate>
      </RemoteConnectionProvider>
    </ToastProvider>
  );
}

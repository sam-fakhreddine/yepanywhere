import type { ReactNode } from "react";
import { FloatingActionButton } from "./components/FloatingActionButton";
import { ReloadBanner } from "./components/ReloadBanner";
import { AuthProvider } from "./contexts/AuthContext";
import { SchemaValidationProvider } from "./contexts/SchemaValidationContext";
import { ToastProvider } from "./contexts/ToastContext";
import { useNeedsAttentionBadge } from "./hooks/useNeedsAttentionBadge";
import { useSyncNotifyInAppSetting } from "./hooks/useNotifyInApp";
import { useReloadNotifications } from "./hooks/useReloadNotifications";

interface Props {
  children: ReactNode;
}

/**
 * App wrapper that provides global functionality like reload notifications, toasts,
 * and schema validation.
 */
export function App({ children }: Props) {
  // Sync notifyInApp setting to service worker on app startup and SW restarts
  useSyncNotifyInAppSetting();

  // Update tab title with needs-attention badge count
  useNeedsAttentionBadge();

  const {
    isManualReloadMode,
    pendingReloads,
    reloadBackend,
    reloadFrontend,
    dismiss,
    unsafeToRestart,
    workerActivity,
  } = useReloadNotifications();

  return (
    <ToastProvider>
      <AuthProvider>
        <SchemaValidationProvider>
          {isManualReloadMode && pendingReloads.backend && (
            <ReloadBanner
              target="backend"
              onReload={reloadBackend}
              onDismiss={() => dismiss("backend")}
              unsafeToRestart={unsafeToRestart}
              activeWorkers={workerActivity.activeWorkers}
            />
          )}
          {isManualReloadMode && pendingReloads.frontend && (
            <ReloadBanner
              target="frontend"
              onReload={reloadFrontend}
              onDismiss={() => dismiss("frontend")}
            />
          )}
          {children}
          <FloatingActionButton />
        </SchemaValidationProvider>
      </AuthProvider>
    </ToastProvider>
  );
}

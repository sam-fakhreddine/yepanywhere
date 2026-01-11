import { useEffect } from "react";
import { activityBus } from "../lib/activityBus";

/**
 * Manages the activityBus connection for remote mode.
 *
 * Unlike useActivityBusConnection, this doesn't check auth state
 * because remote mode is already authenticated via SRP when
 * this hook runs (the connection gate ensures this).
 */
export function useRemoteActivityBusConnection(): void {
  useEffect(() => {
    activityBus.connect();

    // Disconnect on unmount
    return () => {
      activityBus.disconnect();
    };
  }, []);
}

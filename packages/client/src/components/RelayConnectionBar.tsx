/**
 * RelayConnectionBar - A thin colored bar at the top of the screen
 * showing relay connection status.
 *
 * Colors:
 * - Green: connected
 * - Orange (pulsing): connecting/reconnecting
 * - Red: disconnected/error
 */

import { useLocation } from "react-router-dom";
import { useRemoteConnection } from "../contexts/RemoteConnectionContext";

/** Routes where we don't show the connection bar */
const LOGIN_ROUTES = ["/login", "/login/direct", "/login/relay"];

export function RelayConnectionBar() {
  const { connection, isConnecting, isAutoResuming, error, autoResumeError } =
    useRemoteConnection();
  const location = useLocation();

  // Don't show on login routes
  const isLoginRoute = LOGIN_ROUTES.some(
    (route) =>
      location.pathname === route || location.pathname.startsWith(`${route}/`),
  );
  if (isLoginRoute) {
    return null;
  }

  // Determine connection state
  let status: "connected" | "connecting" | "disconnected";
  if (connection) {
    status = "connected";
  } else if (isConnecting || isAutoResuming) {
    status = "connecting";
  } else {
    status = "disconnected";
  }

  // Also show disconnected state if there's an error
  if (error || autoResumeError) {
    status = "disconnected";
  }

  return <div className={`relay-connection-bar relay-connection-${status}`} />;
}

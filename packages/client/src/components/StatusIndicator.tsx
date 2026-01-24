import type { ProcessState } from "../hooks/useSession";
import type { SessionStatus } from "../types";

interface Props {
  status: SessionStatus;
  connected: boolean;
  processState?: ProcessState;
}

export function StatusIndicator({
  status,
  connected,
  processState = "idle",
}: Props) {
  // Hide when session has no owner (no active subprocess from UX perspective)
  if (status.owner === "none") {
    return null;
  }

  // Hide in-turn state - now shown in ProviderBadge's thinking indicator
  if (processState === "in-turn" && connected && status.owner === "self") {
    return null;
  }

  // Determine status text for tooltip/accessibility
  const getStatusText = () => {
    if (!connected && status.owner === "self") return "Reconnecting...";
    if (status.owner === "external") return "External process";
    if (processState === "in-turn") return "Processing";
    if (processState === "waiting-input") return "Waiting for input";
    return "Ready";
  };

  const statusText = getStatusText();

  return (
    <div
      className="status-indicator"
      title={statusText}
      aria-label={statusText}
    >
      <span
        className={`status-dot status-${status.owner} process-${processState}${!connected ? " disconnected" : ""}`}
        role="status"
      />
    </div>
  );
}

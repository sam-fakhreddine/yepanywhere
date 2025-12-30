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
  // Hide when session is idle (no active subprocess from UX perspective)
  if (status.state === "idle") {
    return null;
  }

  // Determine display text for owned sessions based on process state
  const getOwnedText = () => {
    if (processState === "running") return "Processing";
    if (processState === "waiting-input") return "Waiting for input";
    return "Ready"; // subprocess is warm but idle
  };

  return (
    <div className="status-indicator">
      <span
        className={`status-dot status-${status.state} process-${processState}`}
      />
      <span className="status-text">
        {status.state === "owned" && getOwnedText()}
        {status.state === "external" && "External process"}
      </span>
      {!connected && status.state === "owned" && (
        <span className="status-disconnected">Reconnecting...</span>
      )}
    </div>
  );
}

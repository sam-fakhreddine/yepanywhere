import type { SessionStatus } from "../types";

type BadgeVariant = "owned" | "external" | "idle";

interface SessionStatusBadgeProps {
  /** Session status object */
  status: SessionStatus;
}

interface CountBadgeProps {
  /** Badge variant */
  variant: BadgeVariant;
  /** Count to display (e.g., "2 Active") */
  count: number;
}

/**
 * Status badge for a single session in a list.
 * Displays: "Active", "Active, External", or "Idle"
 */
export function SessionStatusBadge({ status }: SessionStatusBadgeProps) {
  const label =
    status.state === "owned"
      ? "Active"
      : status.state === "external"
        ? "Active, External"
        : "Idle";

  return <span className={`status-badge status-${status.state}`}>{label}</span>;
}

/**
 * Status badge showing a count of active sessions.
 * Used on the projects list page.
 */
export function ActiveCountBadge({ variant, count }: CountBadgeProps) {
  if (count === 0) return null;

  const label =
    variant === "owned"
      ? `${count} Active`
      : variant === "external"
        ? `${count} External`
        : null;

  if (!label) return null;

  return <span className={`status-badge status-${variant}`}>{label}</span>;
}

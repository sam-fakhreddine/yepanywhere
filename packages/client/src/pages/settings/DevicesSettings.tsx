import { useBrowserProfiles } from "../../hooks/useBrowserProfiles";
import { useConnectedDevices } from "../../hooks/useConnectedDevices";
import { usePushNotifications } from "../../hooks/usePushNotifications";
import { parseUserAgent } from "../../lib/deviceDetection";

/**
 * Format a date for display with relative time.
 */
function formatDate(isoDate: string): string {
  const date = new Date(isoDate);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMinutes < 1) {
    return "just now";
  }
  if (diffMinutes < 60) {
    return `${diffMinutes} minute${diffMinutes === 1 ? "" : "s"} ago`;
  }
  if (diffHours < 24) {
    return `${diffHours} hour${diffHours === 1 ? "" : "s"} ago`;
  }
  if (diffDays === 1) {
    return "yesterday";
  }
  if (diffDays < 7) {
    return `${diffDays} days ago`;
  }
  return date.toLocaleDateString();
}

/**
 * Format an origin URL for display.
 * Shows a simplified version with just scheme://hostname:port
 */
function formatOrigin(origin: string): string {
  return origin;
}

/**
 * Devices settings page.
 * Shows all browser profiles with their connection origin history.
 */
export function DevicesSettings() {
  const { profiles, isLoading, error, deleteProfile } = useBrowserProfiles();
  const { browserProfileId: currentBrowserProfileId } = usePushNotifications();
  const { connections } = useConnectedDevices();

  return (
    <>
      <section className="settings-section">
        <h2>Browser Profiles</h2>
        <p className="settings-section-description">
          Devices that have connected to this server, with their access origins.
          Each browser profile may connect from multiple URLs (localhost,
          Tailscale, etc.).
        </p>

        {error && <p className="form-error">{error}</p>}

        <div className="settings-group">
          {isLoading ? (
            <p className="settings-hint">Loading profiles...</p>
          ) : profiles.length === 0 ? (
            <p className="settings-hint">
              No browser profiles recorded yet. Connect from a browser to see
              profiles here.
            </p>
          ) : (
            <div className="device-list">
              {profiles.map((profile) => {
                const isCurrentDevice =
                  profile.browserProfileId === currentBrowserProfileId;
                const isConnected = connections.has(profile.browserProfileId);
                const displayName =
                  profile.deviceName ||
                  `${profile.browserProfileId.slice(0, 8)}...`;

                return (
                  <div
                    key={profile.browserProfileId}
                    className="device-list-item device-profile-item"
                  >
                    <div className="device-list-info">
                      <strong>
                        <span
                          className={`device-status ${isConnected ? "device-status-online" : "device-status-offline"}`}
                          title={isConnected ? "Connected" : "Disconnected"}
                        />
                        {displayName}
                        {isCurrentDevice && (
                          <span className="device-current-badge">
                            This device
                          </span>
                        )}
                      </strong>

                      {/* Origin list */}
                      <div className="device-origins">
                        {profile.origins.map((origin) => {
                          const { browser, os } = parseUserAgent(
                            origin.userAgent,
                          );
                          return (
                            <div key={origin.origin} className="device-origin">
                              <code className="device-origin-url">
                                {formatOrigin(origin.origin)}
                              </code>
                              <span className="device-origin-details">
                                {browser} · {os}
                              </span>
                              <span className="device-origin-time">
                                Last seen {formatDate(origin.lastSeen)}
                              </span>
                            </div>
                          );
                        })}
                      </div>

                      <p className="device-profile-meta">
                        First seen {formatDate(profile.createdAt)}
                      </p>
                    </div>

                    <button
                      type="button"
                      className="settings-button settings-button-danger-subtle"
                      onClick={() => deleteProfile(profile.browserProfileId)}
                      title="Forget this device"
                    >
                      Forget
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </>
  );
}

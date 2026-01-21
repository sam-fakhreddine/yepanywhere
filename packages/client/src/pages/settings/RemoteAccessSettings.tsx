import { RemoteAccessSetup } from "../../components/RemoteAccessSetup";
import { useOptionalRemoteConnection } from "../../contexts/RemoteConnectionContext";

export function RemoteAccessSettings() {
  const remoteConnection = useOptionalRemoteConnection();

  // When connected via relay, show connection info and logout
  if (remoteConnection) {
    return (
      <section className="settings-section">
        <h2>Remote Access</h2>
        <p className="settings-section-description">
          You are connected to a remote server via relay.
        </p>
        <div className="settings-group">
          <div className="settings-item">
            <div className="settings-item-info">
              <strong>Connected to</strong>
              <p>{remoteConnection.storedUsername || "Remote server"}</p>
            </div>
            <span className="settings-status-badge settings-status-detected">
              Connected
            </span>
          </div>
          <div className="settings-item">
            <div className="settings-item-info">
              <strong>Logout</strong>
              <p>Disconnect from the remote server</p>
            </div>
            <button
              type="button"
              className="settings-button settings-button-danger"
              onClick={remoteConnection.disconnect}
            >
              Logout
            </button>
          </div>
        </div>
      </section>
    );
  }

  // Server-side: show relay configuration
  return (
    <section className="settings-section">
      <RemoteAccessSetup
        title="Remote Access"
        description="Access your yepanywhere server from anywhere through an encrypted relay connection."
      />
    </section>
  );
}

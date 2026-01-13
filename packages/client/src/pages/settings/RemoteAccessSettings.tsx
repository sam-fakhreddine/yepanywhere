import { RemoteAccessSetup } from "../../components/RemoteAccessSetup";

export function RemoteAccessSettings() {
  return (
    <section className="settings-section">
      <RemoteAccessSetup
        title="Remote Access"
        description="Access your yepanywhere server from anywhere through an encrypted relay connection."
      />
    </section>
  );
}

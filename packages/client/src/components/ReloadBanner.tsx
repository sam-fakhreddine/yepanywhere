interface Props {
  target: "backend" | "frontend";
  onReload: () => void;
  onDismiss: () => void;
}

export function ReloadBanner({ target, onReload, onDismiss }: Props) {
  const label = target === "backend" ? "Server" : "Frontend";

  return (
    <div className="reload-banner">
      <span className="reload-banner-message">
        {label} code changed - reload to see changes
      </span>
      <button
        type="button"
        className="reload-banner-button reload-banner-button-primary"
        onClick={onReload}
      >
        Reload {label}
      </button>
      <button
        type="button"
        className="reload-banner-button"
        onClick={onDismiss}
      >
        Dismiss
      </button>
      <span className="reload-banner-shortcut">Ctrl+Shift+R</span>
    </div>
  );
}

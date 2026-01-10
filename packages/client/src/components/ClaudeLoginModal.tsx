import { useState } from "react";
import { api } from "../api/client";
import { Modal } from "./ui/Modal";

interface ClaudeLoginModalProps {
  /** OAuth URL (null while loading) */
  url: string | null;
  /** Loading status message to show while starting */
  statusMessage?: string;
  /** Error that occurred during startup */
  startupError?: string | null;
  onSuccess: () => void;
  onCancel: () => void;
}

/**
 * Modal for Claude CLI re-authentication flow.
 * Shows a loading state while starting, then the OAuth URL and code input.
 */
export function ClaudeLoginModal({
  url,
  statusMessage,
  startupError,
  onSuccess,
  onCancel,
}: ClaudeLoginModalProps) {
  const [code, setCode] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isLoading = !url && !startupError;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) {
      setError("Please enter the authorization code");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const result = await api.submitClaudeLoginCode(code.trim());
      if (result.success) {
        onSuccess();
      } else {
        setError(result.error || "Failed to submit code");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit code");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = async () => {
    try {
      await api.cancelClaudeLogin();
    } catch {
      // Ignore errors on cancel
    }
    onCancel();
  };

  return (
    <Modal title="Claude Max/Pro Login" onClose={handleCancel}>
      <div className="claude-login-modal-content">
        {isLoading ? (
          // Loading state while starting tmux and getting URL
          <div className="claude-login-loading">
            <div className="claude-login-spinner" />
            <p className="claude-login-status">
              {statusMessage || "Starting login flow..."}
            </p>
          </div>
        ) : startupError ? (
          // Error state
          <div className="claude-login-error-state">
            <p className="claude-login-error">{startupError}</p>
            <div className="claude-login-actions">
              <button
                type="button"
                className="btn-secondary"
                onClick={onCancel}
              >
                Close
              </button>
            </div>
          </div>
        ) : (
          // Ready state with URL
          <>
            <p className="claude-login-instructions">
              Your Claude authentication has expired. Please complete the login
              flow to continue.
            </p>

            <div className="claude-login-step">
              <span className="step-number">1</span>
              <div className="step-content">
                <p>Click the link below to open the authorization page:</p>
                <a
                  href={url ?? undefined}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="claude-login-url"
                >
                  Open Claude Authorization
                </a>
              </div>
            </div>

            <div className="claude-login-step">
              <span className="step-number">2</span>
              <div className="step-content">
                <p>
                  After authorizing, you'll be redirected to a page with an
                  authorization code. Copy the entire code from the URL.
                </p>
              </div>
            </div>

            <div className="claude-login-step">
              <span className="step-number">3</span>
              <div className="step-content">
                <p>Paste the authorization code below:</p>
                <form onSubmit={handleSubmit}>
                  <textarea
                    className="claude-login-code-input"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="Paste authorization code here..."
                    rows={3}
                    disabled={isSubmitting}
                  />
                  {error && <p className="claude-login-error">{error}</p>}
                  <div className="claude-login-actions">
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={handleCancel}
                      disabled={isSubmitting}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="btn-primary"
                      disabled={isSubmitting || !code.trim()}
                    >
                      {isSubmitting ? "Submitting..." : "Submit Code"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}

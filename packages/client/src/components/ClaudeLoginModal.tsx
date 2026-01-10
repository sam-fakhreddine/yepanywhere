import { useState } from "react";
import { api } from "../api/client";
import { Modal } from "./ui/Modal";

export type AuthMethod = "oauth" | "apikey";

interface ClaudeLoginModalProps {
  /** Current auth method (null = show selection screen) */
  authMethod: AuthMethod | null;
  /** Callback when user selects an auth method */
  onSelectMethod: (method: AuthMethod) => void;
  /** OAuth URL (null while loading, only used for oauth method) */
  url: string | null;
  /** Loading status message to show while starting */
  statusMessage?: string;
  /** Error that occurred during startup */
  startupError?: string | null;
  onSuccess: () => void;
  onCancel: () => void;
}

/**
 * Modal for Claude CLI authentication.
 * Shows method selection first, then either OAuth flow or API key input.
 */
export function ClaudeLoginModal({
  authMethod,
  onSelectMethod,
  url,
  statusMessage,
  startupError,
  onSuccess,
  onCancel,
}: ClaudeLoginModalProps) {
  const [code, setCode] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isLoading = authMethod === "oauth" && !url && !startupError;

  const handleOAuthSubmit = async (e: React.FormEvent) => {
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

  const handleApiKeySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiKey.trim()) {
      setError("Please enter your API key");
      return;
    }

    // Basic validation - Anthropic API keys start with "sk-ant-"
    if (!apiKey.trim().startsWith("sk-ant-")) {
      setError(
        "Invalid API key format. Anthropic API keys start with 'sk-ant-'",
      );
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const result = await api.setClaudeApiKey(apiKey.trim());
      if (result.success) {
        onSuccess();
      } else {
        setError(result.error || "Failed to set API key");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to set API key");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = async () => {
    // Only cancel tmux session if we're in OAuth flow
    if (authMethod === "oauth") {
      try {
        await api.cancelClaudeLogin();
      } catch {
        // Ignore errors on cancel
      }
    }
    onCancel();
  };

  // Method selection screen
  if (!authMethod) {
    return (
      <Modal title="Authenticate Claude CLI" onClose={onCancel}>
        <div className="claude-login-modal-content">
          <p className="claude-login-instructions">
            Choose how you'd like to authenticate with Claude:
          </p>

          <div className="claude-login-methods">
            <button
              type="button"
              className="claude-login-method-option"
              onClick={() => onSelectMethod("oauth")}
            >
              <div className="method-option-header">
                <span className="method-option-title">Claude Max/Pro</span>
              </div>
              <p className="method-option-desc">
                For Claude Max, Pro, or Team subscriptions. Authenticates via
                OAuth.
              </p>
            </button>

            <button
              type="button"
              className="claude-login-method-option"
              onClick={() => onSelectMethod("apikey")}
            >
              <div className="method-option-header">
                <span className="method-option-title">API Key</span>
              </div>
              <p className="method-option-desc">
                For Anthropic API users. Enter your API key directly.
              </p>
            </button>
          </div>

          <div className="claude-login-actions">
            <button type="button" className="btn-secondary" onClick={onCancel}>
              Cancel
            </button>
          </div>
        </div>
      </Modal>
    );
  }

  // API Key flow - simple input
  if (authMethod === "apikey") {
    return (
      <Modal title="API Key Authentication" onClose={handleCancel}>
        <div className="claude-login-modal-content">
          {startupError ? (
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
            <>
              <p className="claude-login-instructions">
                Enter your Anthropic API key. You can find this in the{" "}
                <a
                  href="https://console.anthropic.com/settings/keys"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Anthropic Console
                </a>
                .
              </p>

              <form onSubmit={handleApiKeySubmit}>
                <input
                  type="password"
                  className="claude-login-apikey-input"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="sk-ant-..."
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
                    disabled={isSubmitting || !apiKey.trim()}
                  >
                    {isSubmitting ? "Saving..." : "Save API Key"}
                  </button>
                </div>
              </form>
            </>
          )}
        </div>
      </Modal>
    );
  }

  // OAuth flow
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
              Complete the OAuth flow to authenticate with your Claude
              subscription.
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
                <form onSubmit={handleOAuthSubmit}>
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

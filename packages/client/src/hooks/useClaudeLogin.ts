import { useCallback, useState } from "react";
import { api } from "../api/client";
import type { AuthMethod } from "../components/ClaudeLoginModal";

export interface ClaudeLoginState {
  isOpen: boolean;
  authMethod: AuthMethod | null;
  url: string | null;
  error: string | null;
  statusMessage: string;
}

/**
 * Hook to manage Claude CLI login flow.
 * Shows method selection first, then OAuth or API key flow.
 */
export function useClaudeLogin() {
  const [state, setState] = useState<ClaudeLoginState>({
    isOpen: false,
    authMethod: null,
    url: null,
    error: null,
    statusMessage: "",
  });

  /**
   * Start the Claude login flow.
   * Opens modal with method selection screen.
   */
  const startLogin = useCallback((): void => {
    // Show modal with method selection
    setState({
      isOpen: true,
      authMethod: null,
      url: null,
      error: null,
      statusMessage: "",
    });
  }, []);

  /**
   * Handle method selection from the modal.
   * For OAuth, starts the tmux flow. For API key, just shows the input.
   */
  const selectMethod = useCallback(
    async (method: AuthMethod): Promise<void> => {
      setState((prev) => ({
        ...prev,
        authMethod: method,
        error: null,
      }));

      if (method === "oauth") {
        // Start OAuth flow via tmux
        setState((prev) => ({
          ...prev,
          statusMessage: "Starting Claude CLI...",
        }));

        try {
          setState((prev) => ({
            ...prev,
            statusMessage: "Waiting for login prompt...",
          }));

          const result = await api.startClaudeLogin();

          if (result.success && result.url) {
            setState((prev) => ({
              ...prev,
              url: result.url ?? null,
              statusMessage: "",
            }));
          } else {
            setState((prev) => ({
              ...prev,
              error: result.error || "Failed to start login flow",
              statusMessage: "",
            }));
          }
        } catch (err) {
          const message =
            err instanceof Error ? err.message : "Failed to start login";
          setState((prev) => ({
            ...prev,
            error: message,
            statusMessage: "",
          }));
        }
      }
      // For API key method, no async setup needed - just show the input form
    },
    [],
  );

  /**
   * Close the login modal (on success or cancel).
   */
  const closeLogin = useCallback(() => {
    setState({
      isOpen: false,
      authMethod: null,
      url: null,
      error: null,
      statusMessage: "",
    });
  }, []);

  /**
   * Handle successful login completion.
   */
  const handleSuccess = useCallback(() => {
    closeLogin();
  }, [closeLogin]);

  /**
   * Handle login cancellation.
   */
  const handleCancel = useCallback(async () => {
    // Only cancel tmux session if we're in OAuth flow
    if (state.authMethod === "oauth") {
      try {
        await api.cancelClaudeLogin();
      } catch {
        // Ignore cancel errors
      }
    }
    closeLogin();
  }, [closeLogin, state.authMethod]);

  return {
    ...state,
    startLogin,
    selectMethod,
    closeLogin,
    handleSuccess,
    handleCancel,
  };
}

import { useCallback, useState } from "react";
import { api } from "../api/client";

export interface ClaudeLoginState {
  isOpen: boolean;
  url: string | null;
  error: string | null;
  statusMessage: string;
}

/**
 * Hook to manage Claude CLI login flow.
 * Shows modal immediately with loading state, then updates when URL is ready.
 */
export function useClaudeLogin() {
  const [state, setState] = useState<ClaudeLoginState>({
    isOpen: false,
    url: null,
    error: null,
    statusMessage: "",
  });

  /**
   * Start the Claude login flow.
   * Opens modal immediately with loading state.
   */
  const startLogin = useCallback(async (): Promise<void> => {
    // Show modal immediately with loading state
    setState({
      isOpen: true,
      url: null,
      error: null,
      statusMessage: "Starting Claude CLI...",
    });

    try {
      // Update status as we progress
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
  }, []);

  /**
   * Close the login modal (on success or cancel).
   */
  const closeLogin = useCallback(() => {
    setState({
      isOpen: false,
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
    try {
      await api.cancelClaudeLogin();
    } catch {
      // Ignore cancel errors
    }
    closeLogin();
  }, [closeLogin]);

  return {
    ...state,
    startLogin,
    closeLogin,
    handleSuccess,
    handleCancel,
  };
}

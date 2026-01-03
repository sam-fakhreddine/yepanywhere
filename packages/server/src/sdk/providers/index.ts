/**
 * Provider exports.
 *
 * Re-exports all provider implementations and types.
 */

// Types
import type { AgentProvider, ProviderName } from "./types.js";
export type {
  AgentProvider,
  AgentSession,
  AuthStatus,
  ProviderName,
  StartSessionOptions,
} from "./types.js";

// Claude provider (uses @anthropic-ai/claude-agent-sdk)
import { claudeProvider } from "./claude.js";
export { ClaudeProvider, claudeProvider } from "./claude.js";

// Codex provider (uses codex CLI)
import { codexProvider } from "./codex.js";
export {
  CodexProvider,
  codexProvider,
  type CodexProviderConfig,
} from "./codex.js";

// Gemini provider (uses gemini CLI)
import { geminiProvider } from "./gemini.js";
export {
  GeminiProvider,
  geminiProvider,
  type GeminiProviderConfig,
} from "./gemini.js";

// Local model provider (uses Ollama)
import { localModelProvider } from "./local-model.js";
export {
  LocalModelProvider,
  localModelProvider,
  type LocalModelConfig,
} from "./local-model.js";

/**
 * Get all available provider instances.
 * Useful for provider detection UI.
 */
export function getAllProviders(): AgentProvider[] {
  return [claudeProvider, codexProvider, geminiProvider, localModelProvider];
}

/**
 * Get a provider by name.
 */
export function getProvider(name: ProviderName): AgentProvider | null {
  switch (name) {
    case "claude":
      return claudeProvider;
    case "codex":
      return codexProvider;
    case "gemini":
      return geminiProvider;
    case "local":
      return localModelProvider;
    default:
      return null;
  }
}

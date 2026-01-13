import { useCallback, useState } from "react";
import {
  LEGACY_KEYS,
  getServerScoped,
  setServerScoped,
} from "../lib/storageKeys";

/**
 * Available model options.
 * "default" uses the CLI's default model.
 */
export type ModelOption = "default" | "sonnet" | "opus" | "haiku";

/**
 * Thinking budget presets (levels when thinking is enabled).
 */
export type ThinkingLevel = "light" | "medium" | "thorough";

/**
 * Full thinking option including off state (for API compatibility).
 */
export type ThinkingOption = "off" | ThinkingLevel;

export const MODEL_OPTIONS: { value: ModelOption; label: string }[] = [
  { value: "default", label: "Default" },
  { value: "sonnet", label: "Sonnet" },
  { value: "opus", label: "Opus" },
  { value: "haiku", label: "Haiku" },
];

export const THINKING_LEVEL_OPTIONS: {
  value: ThinkingLevel;
  label: string;
  tokens: number;
  description: string;
}[] = [
  { value: "light", label: "Light", tokens: 4096, description: "4K tokens" },
  {
    value: "medium",
    label: "Medium",
    tokens: 16000,
    description: "16K tokens",
  },
  {
    value: "thorough",
    label: "Thorough",
    tokens: 32000,
    description: "32K tokens",
  },
];

function loadModel(): ModelOption {
  const stored = getServerScoped("model", LEGACY_KEYS.model);
  if (stored && ["default", "sonnet", "opus", "haiku"].includes(stored)) {
    return stored as ModelOption;
  }
  return "default";
}

function saveModel(model: ModelOption) {
  setServerScoped("model", model, LEGACY_KEYS.model);
}

function loadThinkingLevel(): ThinkingLevel {
  const stored = getServerScoped("thinkingLevel", LEGACY_KEYS.thinkingLevel);
  if (stored && ["light", "medium", "thorough"].includes(stored)) {
    return stored as ThinkingLevel;
  }
  return "medium"; // Default level when enabled
}

function saveThinkingLevel(level: ThinkingLevel) {
  setServerScoped("thinkingLevel", level, LEGACY_KEYS.thinkingLevel);
}

function loadThinkingEnabled(): boolean {
  const stored = getServerScoped(
    "thinkingEnabled",
    LEGACY_KEYS.thinkingEnabled,
  );
  return stored === "true";
}

function saveThinkingEnabled(enabled: boolean) {
  setServerScoped(
    "thinkingEnabled",
    enabled ? "true" : "false",
    LEGACY_KEYS.thinkingEnabled,
  );
}

function loadVoiceInputEnabled(): boolean {
  const stored = getServerScoped(
    "voiceInputEnabled",
    LEGACY_KEYS.voiceInputEnabled,
  );
  // Default to true (enabled) if not set
  return stored !== "false";
}

function saveVoiceInputEnabled(enabled: boolean) {
  setServerScoped(
    "voiceInputEnabled",
    enabled ? "true" : "false",
    LEGACY_KEYS.voiceInputEnabled,
  );
}

/**
 * Hook to manage model and thinking preferences.
 */
export function useModelSettings() {
  const [model, setModelState] = useState<ModelOption>(loadModel);
  const [thinkingLevel, setThinkingLevelState] =
    useState<ThinkingLevel>(loadThinkingLevel);
  const [thinkingEnabled, setThinkingEnabledState] =
    useState<boolean>(loadThinkingEnabled);
  const [voiceInputEnabled, setVoiceInputEnabledState] = useState<boolean>(
    loadVoiceInputEnabled,
  );

  const setModel = useCallback((m: ModelOption) => {
    setModelState(m);
    saveModel(m);
  }, []);

  const setThinkingLevel = useCallback((level: ThinkingLevel) => {
    setThinkingLevelState(level);
    saveThinkingLevel(level);
  }, []);

  const setThinkingEnabled = useCallback((enabled: boolean) => {
    setThinkingEnabledState(enabled);
    saveThinkingEnabled(enabled);
  }, []);

  const toggleThinking = useCallback(() => {
    const newEnabled = !thinkingEnabled;
    setThinkingEnabledState(newEnabled);
    saveThinkingEnabled(newEnabled);
  }, [thinkingEnabled]);

  const setVoiceInputEnabled = useCallback((enabled: boolean) => {
    setVoiceInputEnabledState(enabled);
    saveVoiceInputEnabled(enabled);
  }, []);

  const toggleVoiceInput = useCallback(() => {
    const newEnabled = !voiceInputEnabled;
    setVoiceInputEnabledState(newEnabled);
    saveVoiceInputEnabled(newEnabled);
  }, [voiceInputEnabled]);

  return {
    model,
    setModel,
    thinkingLevel,
    setThinkingLevel,
    thinkingEnabled,
    setThinkingEnabled,
    toggleThinking,
    voiceInputEnabled,
    setVoiceInputEnabled,
    toggleVoiceInput,
  };
}

/**
 * Get model setting without React state (for non-component code).
 */
export function getModelSetting(): ModelOption {
  return loadModel();
}

/**
 * Get thinking setting as ThinkingOption (for API compatibility).
 * Returns "off" if disabled, otherwise returns the current level.
 */
export function getThinkingSetting(): ThinkingOption {
  const enabled = loadThinkingEnabled();
  if (!enabled) {
    return "off";
  }
  return loadThinkingLevel();
}

/**
 * Get thinking enabled state without React state.
 */
export function getThinkingEnabled(): boolean {
  return loadThinkingEnabled();
}

/**
 * Set thinking enabled state without React state.
 */
export function setThinkingEnabled(enabled: boolean): void {
  saveThinkingEnabled(enabled);
}

/**
 * Convert thinking level to token budget.
 */
export function getThinkingTokens(level: ThinkingLevel): number {
  const opt = THINKING_LEVEL_OPTIONS.find((o) => o.value === level);
  return opt?.tokens ?? 16000; // Default to medium
}

/**
 * Get voice input enabled state without React state.
 */
export function getVoiceInputEnabled(): boolean {
  return loadVoiceInputEnabled();
}

import type { ReactNode } from "react";
import type { RenderContext } from "../types";

/**
 * Bash tool types
 */
export interface BashInput {
  command: string;
  description?: string;
  timeout?: number;
  run_in_background?: boolean;
}

export interface BashResult {
  stdout: string;
  stderr: string;
  interrupted: boolean;
  isImage: boolean;
  backgroundTaskId?: string;
}

/**
 * Read tool types
 */
export interface ReadInput {
  file_path: string;
  offset?: number;
  limit?: number;
}

export interface ReadResult {
  type: "text" | "image";
  file: TextFile | ImageFile;
}

export interface TextFile {
  filePath: string;
  content: string;
  numLines: number;
  startLine: number;
  totalLines: number;
}

export interface ImageFile {
  base64: string;
  type: string; // MIME type
  originalSize: number;
  dimensions: {
    originalWidth: number;
    originalHeight: number;
    displayWidth: number;
    displayHeight: number;
  };
}

/**
 * Edit tool types
 */
export interface EditInput {
  file_path: string;
  old_string: string;
  new_string: string;
  replace_all?: boolean;
}

export interface EditResult {
  filePath: string;
  oldString: string;
  newString: string;
  originalFile: string;
  replaceAll: boolean;
  userModified: boolean;
  structuredPatch: PatchHunk[];
}

export interface PatchHunk {
  oldStart: number;
  oldLines: number;
  newStart: number;
  newLines: number;
  lines: string[]; // Prefixed with ' ', '-', or '+'
}

/**
 * Tool renderer interface
 */
export interface ToolRenderer<TInput = unknown, TResult = unknown> {
  /** Tool name (e.g., "Bash", "Edit", "Read") */
  tool: string;
  /** Render the tool_use block (what Claude wants to do) */
  renderToolUse(input: TInput, context: RenderContext): ReactNode;
  /** Render the tool_result block (what happened) */
  renderToolResult(
    result: TResult,
    isError: boolean,
    context: RenderContext,
  ): ReactNode;
  /** Summary for collapsed tool_use view */
  getUseSummary?(input: TInput): string;
  /** Summary for collapsed tool_result view */
  getResultSummary?(result: TResult, isError: boolean): string;
}

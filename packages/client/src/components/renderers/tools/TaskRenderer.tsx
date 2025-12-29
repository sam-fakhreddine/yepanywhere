import { useState } from "react";
import { ContentBlockRenderer } from "../ContentBlockRenderer";
import type { TaskInput, TaskResult, ToolRenderer } from "./types";

const MAX_PROMPT_LENGTH = 200;

/**
 * Format duration in ms to human readable
 */
function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60000).toFixed(1)}m`;
}

/**
 * Task tool use - shows description and subagent type
 */
function TaskToolUse({ input }: { input: TaskInput }) {
  const [showPrompt, setShowPrompt] = useState(false);
  const promptTruncated =
    input.prompt.length > MAX_PROMPT_LENGTH
      ? `${input.prompt.slice(0, MAX_PROMPT_LENGTH)}...`
      : input.prompt;

  return (
    <div className="task-tool-use">
      <div className="task-header">
        <span className="task-description">{input.description}</span>
        <span className="badge badge-info">{input.subagent_type}</span>
        {input.model && <span className="badge">{input.model}</span>}
      </div>
      {input.prompt && (
        <div className="task-prompt">
          <button
            type="button"
            className="task-prompt-toggle"
            onClick={() => setShowPrompt(!showPrompt)}
          >
            {showPrompt ? "Hide prompt" : "Show prompt"}
          </button>
          {showPrompt && (
            <pre className="task-prompt-content">
              <code>{showPrompt ? input.prompt : promptTruncated}</code>
            </pre>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Task tool result - shows agent response with nested content
 */
function TaskToolResult({
  result,
  isError,
}: {
  result: TaskResult;
  isError: boolean;
}) {
  const [isExpanded, setIsExpanded] = useState(true);

  if (isError) {
    return (
      <div className="task-error">
        {typeof result === "object" && "content" in result
          ? String(result.content)
          : "Task failed"}
      </div>
    );
  }

  if (!result) {
    return <div className="task-empty">No result</div>;
  }

  const statusClass =
    result.status === "completed"
      ? "badge-success"
      : result.status === "failed"
        ? "badge-error"
        : "badge-warning";

  return (
    <div className="task-result">
      <div className="task-result-header">
        <span className={`badge ${statusClass}`}>{result.status}</span>
        <span className="task-stats">
          {formatDuration(result.totalDurationMs)} &middot;{" "}
          {result.totalTokens.toLocaleString()} tokens &middot;{" "}
          {result.totalToolUseCount} tools
        </span>
        <button
          type="button"
          className="expand-button"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          {isExpanded ? "Collapse" : "Expand"}
        </button>
      </div>
      {isExpanded && result.content && result.content.length > 0 && (
        <div className="task-content">
          {result.content.map((block, i) => (
            <ContentBlockRenderer
              key={`${result.agentId}-${i}`}
              block={block}
              context={{ isStreaming: false, theme: "dark" }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export const taskRenderer: ToolRenderer<TaskInput, TaskResult> = {
  tool: "Task",

  renderToolUse(input, _context) {
    return <TaskToolUse input={input as TaskInput} />;
  },

  renderToolResult(result, isError, _context) {
    return <TaskToolResult result={result as TaskResult} isError={isError} />;
  },

  getUseSummary(input) {
    return (input as TaskInput).description;
  },

  getResultSummary(result, isError) {
    if (isError) return "Error";
    const r = result as TaskResult;
    return r?.status
      ? `${r.status} (${r.totalToolUseCount} tools)`
      : "Complete";
  },
};

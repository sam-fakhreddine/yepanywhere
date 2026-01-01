import { useCallback, useContext, useMemo, useState } from "react";
import { AgentContentContext } from "../../../contexts/AgentContentContext";
import { preprocessMessages } from "../../../lib/preprocessMessages";
import type { Message } from "../../../types";
import type { RenderItem } from "../../../types/renderItems";
import { RenderItemComponent } from "../../RenderItemComponent";
import { ContentBlockRenderer } from "../ContentBlockRenderer";
import type { TaskInput, TaskResult, ToolRenderer } from "./types";

const MAX_PROMPT_LENGTH = 200;
const PREVIEW_ITEM_COUNT = 3;

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
 * Get a brief summary of a render item for preview display
 */
function getItemSummary(item: RenderItem): string {
  switch (item.type) {
    case "tool_call":
      return `[${item.toolName}] ${getToolInputSummary(item.toolName, item.toolInput)}`;
    case "text":
      return item.text.slice(0, 80) + (item.text.length > 80 ? "..." : "");
    case "thinking":
      return "Thinking...";
    case "user_prompt":
      return "[User input]";
    default:
      return "";
  }
}

/**
 * Get a brief summary of tool input for preview
 */
function getToolInputSummary(toolName: string, input: unknown): string {
  if (!input || typeof input !== "object") return "";
  const obj = input as Record<string, unknown>;

  switch (toolName) {
    case "Read":
      return typeof obj.file_path === "string" ? obj.file_path : "";
    case "Grep":
      return typeof obj.pattern === "string" ? `"${obj.pattern}"` : "";
    case "Glob":
      return typeof obj.pattern === "string" ? obj.pattern : "";
    case "Edit":
      return typeof obj.file_path === "string" ? obj.file_path : "";
    case "Bash":
      return typeof obj.command === "string"
        ? obj.command.slice(0, 40) + (obj.command.length > 40 ? "..." : "")
        : "";
    default:
      return "";
  }
}

/**
 * Task preview - shows last N items as a compact summary
 */
function TaskPreview({ items }: { items: RenderItem[] }) {
  const previewItems = items.slice(-PREVIEW_ITEM_COUNT);

  return (
    <div className="task-preview">
      {previewItems.map((item, i) => (
        <div key={item.id} className="task-preview-item">
          <span className="task-preview-connector">
            {i === previewItems.length - 1 ? "└─" : "├─"}
          </span>
          <span className="task-preview-text">{getItemSummary(item)}</span>
        </div>
      ))}
    </div>
  );
}

/**
 * Task nested content - renders full agent messages
 */
function TaskNestedContent({
  messages,
  isStreaming,
}: {
  messages: Message[];
  isStreaming: boolean;
}) {
  const [thinkingExpanded, setThinkingExpanded] = useState(false);
  const toggleThinkingExpanded = useCallback(() => {
    setThinkingExpanded((prev) => !prev);
  }, []);

  const renderItems = useMemo(() => preprocessMessages(messages), [messages]);

  return (
    <div className="task-nested-content">
      {renderItems.map((item) => (
        <RenderItemComponent
          key={item.id}
          item={item}
          isStreaming={isStreaming}
          thinkingExpanded={thinkingExpanded}
          toggleThinkingExpanded={toggleThinkingExpanded}
        />
      ))}
    </div>
  );
}

/**
 * Task inline renderer - shows complete Task UI with nested content
 */
function TaskInline({
  input,
  result,
  isError,
  status,
}: {
  input: TaskInput;
  result: TaskResult | undefined;
  isError: boolean;
  status: "pending" | "complete" | "error" | "aborted";
}) {
  const context = useContext(AgentContentContext);
  const agentId = result?.agentId;

  // Get live content from context if available
  const liveContent = agentId ? context?.agentContent[agentId] : undefined;

  // Determine if task is running (no result yet, or content status is running)
  const isRunning = status === "pending" || liveContent?.status === "running";

  // Start expanded if running, otherwise collapsed for completed tasks
  const [isExpanded, setIsExpanded] = useState(isRunning);
  const [isLoadingContent, setIsLoadingContent] = useState(false);

  // Get render items from live content for preview/full display
  const renderItems = useMemo(() => {
    if (!liveContent?.messages.length) return [];
    return preprocessMessages(liveContent.messages);
  }, [liveContent?.messages]);

  // Handle expand with lazy-loading
  const handleExpand = async () => {
    if (!isExpanded && agentId && context && !liveContent?.messages.length) {
      // Need to lazy-load content
      setIsLoadingContent(true);
      try {
        // Get projectId and sessionId from somewhere... we need to pass these
        // For now, the context has them captured in the loadAgentContent closure
        // We'll need to read from a data attribute or similar
        const sessionEl = document.querySelector("[data-session-id]");
        const projectEl = document.querySelector("[data-project-id]");
        const projectId = projectEl?.getAttribute("data-project-id") || "";
        const sessionId = sessionEl?.getAttribute("data-session-id") || "";
        await context.loadAgentContent(projectId, sessionId, agentId);
      } finally {
        setIsLoadingContent(false);
      }
    }
    setIsExpanded(!isExpanded);
  };

  // Determine status badge and styling
  const getStatusBadge = () => {
    if (isError) return { class: "badge-error", text: "failed" };
    if (status === "aborted")
      return { class: "badge-warning", text: "interrupted" };
    if (isRunning) return { class: "badge-running", text: "running" };
    if (result?.status === "completed")
      return { class: "badge-success", text: "completed" };
    if (result?.status === "failed")
      return { class: "badge-error", text: "failed" };
    return { class: "badge-pending", text: "pending" };
  };

  const statusBadge = getStatusBadge();

  return (
    <div
      className={`task-inline ${isExpanded ? "expanded" : "collapsed"} status-${statusBadge.text}`}
    >
      {/* Header row */}
      <button
        type="button"
        className="task-inline-header"
        onClick={handleExpand}
      >
        <span className="task-expand-icon">{isExpanded ? "▼" : "▶"}</span>
        {isRunning && (
          <span className="task-spinner" aria-label="Running">
            <Spinner />
          </span>
        )}
        <span className="task-inline-title">Task: {input.description}</span>
        <span className="badge badge-info task-agent-type">
          {input.subagent_type}
        </span>
        {input.model && <span className="badge task-model">{input.model}</span>}
        <span className={`badge ${statusBadge.class}`}>{statusBadge.text}</span>
        {result && (
          <span className="task-stats">
            {formatDuration(result.totalDurationMs)} ·{" "}
            {result.totalTokens.toLocaleString()} tokens ·{" "}
            {result.totalToolUseCount} tools
          </span>
        )}
      </button>

      {/* Preview (shown when collapsed and has content) */}
      {!isExpanded && renderItems.length > 0 && (
        <TaskPreview items={renderItems} />
      )}

      {/* Loading indicator */}
      {isLoadingContent && (
        <div className="task-loading">
          <Spinner /> Loading agent content...
        </div>
      )}

      {/* Expanded content */}
      {isExpanded && (
        <div className="task-inline-content">
          {/* Show live nested content if available */}
          {liveContent?.messages.length ? (
            <TaskNestedContent
              messages={liveContent.messages}
              isStreaming={isRunning}
            />
          ) : result?.content?.length ? (
            // Fall back to result content blocks (original behavior)
            <div className="task-content">
              {result.content.map((block) => (
                <ContentBlockRenderer
                  key={
                    block.id ??
                    `${agentId}-${block.type}-${block.text?.slice(0, 20) ?? ""}`
                  }
                  block={block}
                  context={{ isStreaming: false, theme: "dark" }}
                />
              ))}
            </div>
          ) : (
            <div className="task-empty">
              {isRunning ? "Waiting for agent activity..." : "No content"}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Spinner() {
  return (
    <svg
      className="spinner"
      viewBox="0 0 16 16"
      width="12"
      height="12"
      aria-hidden="true"
    >
      <circle
        cx="8"
        cy="8"
        r="6"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeDasharray="24"
        strokeDashoffset="8"
      />
    </svg>
  );
}

/**
 * Task tool result - shows agent response with nested content
 * (Legacy - used when expanded in standard tool row)
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

  // Use inline rendering to bypass standard tool row structure
  // This gives us full control over expand/collapse and nested content display
  renderInline(input, result, isError, status, _context) {
    return (
      <TaskInline
        input={input as TaskInput}
        result={result as TaskResult | undefined}
        isError={isError}
        status={status}
      />
    );
  },
};

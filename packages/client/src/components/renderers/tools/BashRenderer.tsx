import { useState } from "react";
import type { RenderContext } from "../types";
import type { BashInput, BashResult, ToolRenderer } from "./types";

const MAX_LINES_COLLAPSED = 20;

/**
 * Bash tool use - shows command in code block
 */
function BashToolUse({ input }: { input: BashInput }) {
  return (
    <div className="bash-tool-use">
      {input.description && (
        <div className="bash-description">{input.description}</div>
      )}
      <pre className="code-block">
        <code>{input.command}</code>
      </pre>
    </div>
  );
}

/**
 * Bash tool result - shows stdout/stderr with collapse for long output
 */
function BashToolResult({
  result,
  isError,
}: {
  result: BashResult;
  isError: boolean;
}) {
  const [isExpanded, setIsExpanded] = useState(false);

  const stdout = result?.stdout || "";
  const stderr = result?.stderr || "";
  const stdoutLines = stdout.split("\n");
  const needsCollapse = stdoutLines.length > MAX_LINES_COLLAPSED;
  const displayStdout =
    needsCollapse && !isExpanded
      ? `${stdoutLines.slice(0, MAX_LINES_COLLAPSED).join("\n")}\n...`
      : stdout;

  return (
    <div className={`bash-result ${isError ? "bash-result-error" : ""}`}>
      {result?.interrupted && (
        <span className="badge badge-warning">Interrupted</span>
      )}
      {result?.backgroundTaskId && (
        <span className="badge badge-info">
          Background: {result.backgroundTaskId}
        </span>
      )}
      {stdout && (
        <div className="bash-stdout">
          <pre className="code-block">
            <code>{displayStdout}</code>
          </pre>
          {needsCollapse && (
            <button
              type="button"
              className="expand-button"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded
                ? "Show less"
                : `Show all ${stdoutLines.length} lines`}
            </button>
          )}
        </div>
      )}
      {stderr && (
        <div className="bash-stderr">
          <pre className="code-block code-block-error">
            <code>{stderr}</code>
          </pre>
        </div>
      )}
      {!stdout && !stderr && !result?.interrupted && (
        <div className="bash-empty">No output</div>
      )}
    </div>
  );
}

export const bashRenderer: ToolRenderer<BashInput, BashResult> = {
  tool: "Bash",

  renderToolUse(input, _context) {
    return <BashToolUse input={input as BashInput} />;
  },

  renderToolResult(result, isError, _context) {
    return <BashToolResult result={result as BashResult} isError={isError} />;
  },

  getUseSummary(input) {
    const cmd = (input as BashInput).command;
    return cmd.length > 60 ? `${cmd.slice(0, 57)}...` : cmd;
  },

  getResultSummary(result, isError) {
    const r = result as BashResult;
    if (r?.interrupted) return "Interrupted";
    if (isError || r?.stderr) return "Error";
    const lines = r?.stdout?.split("\n").length || 0;
    return `${lines} lines`;
  },
};

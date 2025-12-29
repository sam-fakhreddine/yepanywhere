import { useState } from "react";
import type {
  ExitPlanModeInput,
  ExitPlanModeResult,
  ToolRenderer,
} from "./types";

const MAX_PLAN_LINES = 30;

/**
 * Extract filename from path
 */
function getFileName(filePath: string): string {
  return filePath.split("/").pop() || filePath;
}

/**
 * ExitPlanMode tool use - simple indicator
 */
function ExitPlanModeToolUse({ input }: { input: ExitPlanModeInput }) {
  return (
    <div className="exitplan-tool-use">
      <span className="exitplan-label">Exiting plan mode</span>
      {input.plan && (
        <span className="exitplan-has-plan">(with plan content)</span>
      )}
    </div>
  );
}

/**
 * ExitPlanMode tool result - shows plan content
 */
function ExitPlanModeToolResult({
  result,
  isError,
}: {
  result: ExitPlanModeResult;
  isError: boolean;
}) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (isError) {
    const errorResult = result as unknown as { content?: unknown } | undefined;
    return (
      <div className="exitplan-error">
        {typeof result === "object" && errorResult?.content
          ? String(errorResult.content)
          : "Exit plan mode failed"}
      </div>
    );
  }

  if (!result) {
    return <div className="exitplan-empty">No plan</div>;
  }

  const lines = result.plan?.split("\n") || [];
  const needsCollapse = lines.length > MAX_PLAN_LINES;
  const displayLines =
    needsCollapse && !isExpanded ? lines.slice(0, MAX_PLAN_LINES) : lines;

  return (
    <div className="exitplan-result">
      <div className="exitplan-header">
        <span className="exitplan-filepath">
          {result.filePath ? getFileName(result.filePath) : "Plan"}
        </span>
        {result.isAgent && <span className="badge">Agent</span>}
        {result.filePath && (
          <span className="exitplan-fullpath">{result.filePath}</span>
        )}
      </div>
      {result.plan && (
        <>
          <pre className="exitplan-content code-block">
            <code>{displayLines.join("\n")}</code>
          </pre>
          {needsCollapse && (
            <button
              type="button"
              className="expand-button"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? "Show less" : `Show all ${lines.length} lines`}
            </button>
          )}
        </>
      )}
    </div>
  );
}

export const exitPlanModeRenderer: ToolRenderer<
  ExitPlanModeInput,
  ExitPlanModeResult
> = {
  tool: "ExitPlanMode",

  renderToolUse(input, _context) {
    return <ExitPlanModeToolUse input={input as ExitPlanModeInput} />;
  },

  renderToolResult(result, isError, _context) {
    return (
      <ExitPlanModeToolResult
        result={result as ExitPlanModeResult}
        isError={isError}
      />
    );
  },

  getUseSummary(_input) {
    return "Exit plan mode";
  },

  getResultSummary(result, isError) {
    if (isError) return "Error";
    const r = result as ExitPlanModeResult;
    return r?.filePath ? getFileName(r.filePath) : "Plan saved";
  },
};

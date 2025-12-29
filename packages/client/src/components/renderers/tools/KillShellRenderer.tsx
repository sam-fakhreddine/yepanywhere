import type { KillShellInput, KillShellResult, ToolRenderer } from "./types";

/**
 * KillShell tool use - shows shell_id being killed
 */
function KillShellToolUse({ input }: { input: KillShellInput }) {
  return (
    <div className="killshell-tool-use">
      <span className="killshell-label">Killing shell</span>
      <code className="killshell-id">{input.shell_id}</code>
    </div>
  );
}

/**
 * KillShell tool result - shows confirmation message
 */
function KillShellToolResult({
  result,
  isError,
}: {
  result: KillShellResult;
  isError: boolean;
}) {
  if (isError) {
    const errorResult = result as unknown as { content?: unknown } | undefined;
    return (
      <div className="killshell-error">
        {typeof result === "object" && errorResult?.content
          ? String(errorResult.content)
          : "Failed to kill shell"}
      </div>
    );
  }

  if (!result) {
    return <div className="killshell-empty">No result</div>;
  }

  return (
    <div className="killshell-result">
      <span className="killshell-message">{result.message}</span>
      {result.shell_id && (
        <code className="killshell-id">{result.shell_id}</code>
      )}
    </div>
  );
}

export const killShellRenderer: ToolRenderer<KillShellInput, KillShellResult> =
  {
    tool: "KillShell",

    renderToolUse(input, _context) {
      return <KillShellToolUse input={input as KillShellInput} />;
    },

    renderToolResult(result, isError, _context) {
      return (
        <KillShellToolResult
          result={result as KillShellResult}
          isError={isError}
        />
      );
    },

    getUseSummary(input) {
      return (input as KillShellInput).shell_id;
    },

    getResultSummary(result, isError) {
      if (isError) return "Error";
      const r = result as KillShellResult;
      return r?.message || "Killed";
    },
  };

import { useEffect, useMemo, useState } from "react";
import type { RenderContext } from "../types";
import type { EditInput, EditResult, PatchHunk, ToolRenderer } from "./types";

const MAX_VISIBLE_LINES = 12;

/**
 * Extract filename from path
 */
function getFileName(filePath: string): string {
  return filePath.split("/").pop() || filePath;
}

/**
 * Render a single diff hunk (without @@ header for cleaner display)
 */
function DiffHunk({ hunk }: { hunk: PatchHunk }) {
  return (
    <div className="diff-hunk">
      <pre className="diff-content">
        {hunk.lines.map((line, i) => {
          const prefix = line[0];
          const className =
            prefix === "-"
              ? "diff-removed"
              : prefix === "+"
                ? "diff-added"
                : "diff-context";
          return (
            <div key={`${hunk.oldStart}-${i}`} className={className}>
              {line}
            </div>
          );
        })}
      </pre>
    </div>
  );
}

/**
 * Edit tool use - shows file path being edited
 */
function EditToolUse({ input }: { input: EditInput }) {
  const fileName = getFileName(input.file_path);
  return (
    <div className="edit-tool-use">
      <span className="file-path">{fileName}</span>
      <span className="edit-action">Editing file...</span>
    </div>
  );
}

/**
 * Full-screen modal for viewing complete diff
 */
function DiffModal({
  result,
  onClose,
}: {
  result: EditResult;
  onClose: () => void;
}) {
  const fileName = getFileName(result.filePath);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div
      className="diff-modal-overlay"
      onClick={onClose}
      onKeyDown={(e) => e.key === "Escape" && onClose()}
      role="presentation"
    >
      <div
        className="diff-modal"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        <div className="diff-modal-header">
          <span className="file-path">{fileName}</span>
          <button
            type="button"
            className="diff-modal-close"
            onClick={onClose}
            aria-label="Close"
          >
            ✕
          </button>
        </div>
        <div className="diff-modal-content">
          <div className="diff-view">
            {result.structuredPatch.map((hunk, i) => (
              <DiffHunk key={`modal-hunk-${hunk.oldStart}-${i}`} hunk={hunk} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Edit tool result - shows diff view with truncation and modal expand
 */
function EditToolResult({
  result,
  isError,
}: {
  result: EditResult;
  isError: boolean;
}) {
  const [showModal, setShowModal] = useState(false);

  // Count total lines in all hunks
  const totalLines = useMemo(() => {
    if (!result?.structuredPatch) return 0;
    return result.structuredPatch.reduce(
      (sum, hunk) => sum + hunk.lines.length + 1, // +1 for hunk header
      0,
    );
  }, [result?.structuredPatch]);

  const isTruncated = totalLines > MAX_VISIBLE_LINES;

  // Compute change summary
  const changeSummary = useMemo(() => {
    if (!result?.structuredPatch) return null;
    const additions = result.structuredPatch
      .flatMap((h) => h.lines)
      .filter((l) => l.startsWith("+")).length;
    const deletions = result.structuredPatch
      .flatMap((h) => h.lines)
      .filter((l) => l.startsWith("-")).length;

    if (additions > 0 && deletions > 0) {
      return `Modified ${additions + deletions} lines`;
    }
    if (additions > 0) {
      return `Added ${additions} line${additions !== 1 ? "s" : ""}`;
    }
    if (deletions > 0) {
      return `Removed ${deletions} line${deletions !== 1 ? "s" : ""}`;
    }
    return null;
  }, [result?.structuredPatch]);

  if (isError) {
    const errorResult = result as unknown as { content?: unknown } | undefined;
    const hasContent = typeof result === "object" && errorResult?.content;
    return (
      <div className="edit-result edit-result-error">
        <span className="badge badge-error">Edit failed</span>
        {hasContent ? (
          <div className="edit-error-message">
            {String(errorResult.content)}
          </div>
        ) : null}
      </div>
    );
  }

  // Handle case where result doesn't have structuredPatch
  if (!result?.structuredPatch || result.structuredPatch.length === 0) {
    return (
      <div className="edit-result">
        <div className="edit-header">
          <span className="file-path">
            {result?.filePath ? getFileName(result.filePath) : "File"}
          </span>
          {result?.userModified && (
            <span className="badge badge-info">User modified</span>
          )}
        </div>
        <div className="edit-simple">
          <div className="edit-old">
            <div className="edit-label">Removed:</div>
            <pre className="code-block">
              <code>{result?.oldString || "(empty)"}</code>
            </pre>
          </div>
          <div className="edit-new">
            <div className="edit-label">Added:</div>
            <pre className="code-block">
              <code>{result?.newString || "(empty)"}</code>
            </pre>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="edit-result">
        {changeSummary && (
          <div className="edit-change-summary">{changeSummary}</div>
        )}
        {result.userModified && (
          <span className="badge badge-info">User modified</span>
        )}
        <div
          className={`diff-view-container ${isTruncated ? "truncated" : ""}`}
        >
          <div className="diff-view">
            {result.structuredPatch.map((hunk, i) => (
              <DiffHunk key={`hunk-${hunk.oldStart}-${i}`} hunk={hunk} />
            ))}
          </div>
          {isTruncated && (
            <>
              <div className="diff-fade-overlay" />
              <button
                type="button"
                className="diff-expand-button"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowModal(true);
                }}
              >
                Click to expand
              </button>
            </>
          )}
        </div>
      </div>
      {showModal && (
        <DiffModal result={result} onClose={() => setShowModal(false)} />
      )}
    </>
  );
}

export const editRenderer: ToolRenderer<EditInput, EditResult> = {
  tool: "Edit",

  renderToolUse(input, _context) {
    return <EditToolUse input={input as EditInput} />;
  },

  renderToolResult(result, isError, _context) {
    return <EditToolResult result={result as EditResult} isError={isError} />;
  },

  getUseSummary(input) {
    return getFileName((input as EditInput).file_path);
  },

  getResultSummary(result, isError) {
    if (isError) return "Failed";
    const r = result as EditResult;
    return r?.filePath ? getFileName(r.filePath) : "file";
  },
};

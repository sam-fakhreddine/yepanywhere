import { useState } from "react";
import type { RenderContext } from "../types";
import type {
  ImageFile,
  ReadInput,
  ReadResult,
  TextFile,
  ToolRenderer,
} from "./types";

const MAX_LINES_COLLAPSED = 30;

/**
 * Extract filename from path
 */
function getFileName(filePath: string): string {
  return filePath.split("/").pop() || filePath;
}

/**
 * Read tool use - shows file path being read
 */
function ReadToolUse({ input }: { input: ReadInput }) {
  const fileName = getFileName(input.file_path);
  return (
    <div className="read-tool-use">
      <span className="file-path">{fileName}</span>
      {(input.offset !== undefined || input.limit !== undefined) && (
        <span className="read-range">
          {input.offset !== undefined && ` from line ${input.offset}`}
          {input.limit !== undefined && ` (${input.limit} lines)`}
        </span>
      )}
    </div>
  );
}

/**
 * Text file result - shows content with line numbers
 */
function TextFileResult({ file }: { file: TextFile }) {
  const [isExpanded, setIsExpanded] = useState(false);

  const lines = file.content.split("\n");
  const needsCollapse = lines.length > MAX_LINES_COLLAPSED;
  const displayLines =
    needsCollapse && !isExpanded ? lines.slice(0, MAX_LINES_COLLAPSED) : lines;

  const fileName = getFileName(file.filePath);
  const showRange = file.startLine > 1 || file.numLines < file.totalLines;

  return (
    <div className="read-text-result">
      <div className="file-header">
        <span className="file-path">{fileName}</span>
        {showRange && (
          <span className="file-range">
            lines {file.startLine}-{file.startLine + file.numLines - 1} of{" "}
            {file.totalLines}
          </span>
        )}
      </div>
      <div className="file-content-with-lines">
        <div className="line-numbers">
          {displayLines.map((_, i) => {
            const lineNum = file.startLine + i;
            return <div key={`line-${lineNum}`}>{lineNum}</div>;
          })}
          {needsCollapse && !isExpanded && <div>...</div>}
        </div>
        <pre className="line-content">
          <code>{displayLines.join("\n")}</code>
        </pre>
      </div>
      {needsCollapse && (
        <button
          type="button"
          className="expand-button"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          {isExpanded ? "Show less" : `Show all ${lines.length} lines`}
        </button>
      )}
    </div>
  );
}

/**
 * Image file result - renders as img tag
 */
function ImageFileResult({ file }: { file: ImageFile }) {
  const sizeKB = Math.round(file.originalSize / 1024);

  return (
    <div className="read-image-result">
      <div className="image-info">
        {file.dimensions.originalWidth}x{file.dimensions.originalHeight} (
        {sizeKB}
        KB)
      </div>
      <img
        className="read-image"
        src={`data:${file.type};base64,${file.base64}`}
        alt="File content"
        width={file.dimensions.displayWidth}
        height={file.dimensions.displayHeight}
      />
    </div>
  );
}

/**
 * Read tool result - dispatches to text or image handler
 */
function ReadToolResult({
  result,
  isError,
}: {
  result: ReadResult;
  isError: boolean;
}) {
  if (isError || !result?.file) {
    const errorResult = result as unknown as { content?: unknown } | undefined;
    return (
      <div className="read-error">
        {typeof result === "object" && errorResult?.content
          ? String(errorResult.content)
          : "Failed to read file"}
      </div>
    );
  }

  if (result.type === "image") {
    return <ImageFileResult file={result.file as ImageFile} />;
  }

  return <TextFileResult file={result.file as TextFile} />;
}

export const readRenderer: ToolRenderer<ReadInput, ReadResult> = {
  tool: "Read",

  renderToolUse(input, _context) {
    return <ReadToolUse input={input as ReadInput} />;
  },

  renderToolResult(result, isError, _context) {
    return <ReadToolResult result={result as ReadResult} isError={isError} />;
  },

  getUseSummary(input) {
    return getFileName((input as ReadInput).file_path);
  },

  getResultSummary(result, isError) {
    if (isError) return "Error";
    const r = result as ReadResult;
    if (r?.type === "image") return "Image";
    const file = r?.file as TextFile | undefined;
    return file ? `${file.numLines} lines` : "File";
  },
};

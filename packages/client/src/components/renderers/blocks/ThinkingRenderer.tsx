import { useState } from "react";
import type { ContentBlock, ContentRenderer, RenderContext } from "../types";

interface ThinkingBlock extends ContentBlock {
  type: "thinking";
  thinking: string;
  signature?: string; // Never rendered
}

/**
 * Thinking renderer - collapsible block, starts collapsed, shows first line as summary
 */
function ThinkingRendererComponent({ block }: { block: ThinkingBlock }) {
  const [isCollapsed, setIsCollapsed] = useState(true);

  const thinking = block.thinking || "";
  const firstLine = thinking.split("\n")[0] || "";
  const summary =
    firstLine.length > 80 ? `${firstLine.slice(0, 77)}...` : firstLine;

  return (
    <div className="thinking-block">
      <button
        type="button"
        className="thinking-toggle"
        onClick={() => setIsCollapsed(!isCollapsed)}
        aria-expanded={!isCollapsed}
      >
        <span className="thinking-icon">{isCollapsed ? ">" : "v"}</span>
        <span className="thinking-label">Thinking</span>
        {isCollapsed && <span className="thinking-summary">{summary}</span>}
      </button>
      {!isCollapsed && <div className="thinking-content">{thinking}</div>}
    </div>
  );
}

export const thinkingRenderer: ContentRenderer<ThinkingBlock> = {
  type: "thinking",
  render(block, _context) {
    return <ThinkingRendererComponent block={block as ThinkingBlock} />;
  },
  getSummary(block) {
    const thinking = (block as ThinkingBlock).thinking || "";
    const firstLine = thinking.split("\n")[0] || "";
    return firstLine.length > 80 ? `${firstLine.slice(0, 77)}...` : firstLine;
  },
};

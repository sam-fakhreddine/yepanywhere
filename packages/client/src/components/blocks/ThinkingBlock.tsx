import { memo } from "react";

interface Props {
  thinking: string;
  status: "streaming" | "complete";
  isExpanded: boolean;
  onToggle: () => void;
}

export const ThinkingBlock = memo(function ThinkingBlock({
  thinking,
  status,
  isExpanded,
  onToggle,
}: Props) {
  if (isExpanded) {
    return (
      <button
        type="button"
        className="thinking-block thinking-block-expanded"
        onClick={onToggle}
        aria-expanded={true}
      >
        <div className="thinking-toggle-expanded">
          <span className="thinking-label">
            {status === "streaming" ? "Thinking..." : "Thinking"}
          </span>
          <span className="thinking-icon">▲</span>
        </div>
        <div className="thinking-content">{thinking}</div>
      </button>
    );
  }

  return (
    <div className="thinking-block">
      <button
        type="button"
        className="thinking-toggle-collapsed"
        onClick={onToggle}
        aria-expanded={false}
      >
        <span className="thinking-label">
          {status === "streaming" ? "Thinking..." : "Thinking"}
        </span>
        <span className="thinking-icon">▼</span>
      </button>
    </div>
  );
});

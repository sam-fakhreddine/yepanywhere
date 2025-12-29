import { memo } from "react";
import type { ContentBlock } from "../../types";

interface Props {
  content: string | ContentBlock[];
}

export const UserPromptBlock = memo(function UserPromptBlock({
  content,
}: Props) {
  if (typeof content === "string") {
    return (
      <div className="message message-user-prompt">
        <div className="message-content">
          <div className="text-block">{content}</div>
        </div>
      </div>
    );
  }

  // Array content - extract text blocks for display
  const textContent = content
    .filter((block) => block.type === "text" && block.text)
    .map((block) => block.text)
    .join("\n");

  return (
    <div className="message message-user-prompt">
      <div className="message-content">
        <div className="text-block">{textContent || "[Complex content]"}</div>
      </div>
    </div>
  );
});

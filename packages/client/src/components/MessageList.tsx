import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { preprocessMessages } from "../lib/preprocessMessages";
import type { Message } from "../types";
import type { RenderItem } from "../types/renderItems";
import { ProcessingIndicator } from "./ProcessingIndicator";
import { RenderItemComponent } from "./RenderItemComponent";

/**
 * Groups consecutive assistant items (text, thinking, tool_call) into turns.
 * User prompts break the grouping and are returned as separate groups.
 */
function groupItemsIntoTurns(
  items: RenderItem[],
): Array<{ isUserPrompt: boolean; items: RenderItem[] }> {
  const groups: Array<{ isUserPrompt: boolean; items: RenderItem[] }> = [];
  let currentAssistantGroup: RenderItem[] = [];

  for (const item of items) {
    if (item.type === "user_prompt") {
      // Flush any pending assistant items
      if (currentAssistantGroup.length > 0) {
        groups.push({ isUserPrompt: false, items: currentAssistantGroup });
        currentAssistantGroup = [];
      }
      // User prompt is its own group
      groups.push({ isUserPrompt: true, items: [item] });
    } else {
      // Accumulate assistant items
      currentAssistantGroup.push(item);
    }
  }

  // Flush remaining assistant items
  if (currentAssistantGroup.length > 0) {
    groups.push({ isUserPrompt: false, items: currentAssistantGroup });
  }

  return groups;
}

interface Props {
  messages: Message[];
  isStreaming?: boolean;
  isProcessing?: boolean;
  /** Increment this to force scroll to bottom (e.g., when user sends a message) */
  scrollTrigger?: number;
}

export const MessageList = memo(function MessageList({
  messages,
  isStreaming = false,
  isProcessing = false,
  scrollTrigger = 0,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const shouldAutoScrollRef = useRef(true);
  const [thinkingExpanded, setThinkingExpanded] = useState(false);

  // Preprocess messages into render items and group into turns
  const renderItems = useMemo(() => preprocessMessages(messages), [messages]);
  const turnGroups = useMemo(
    () => groupItemsIntoTurns(renderItems),
    [renderItems],
  );

  const toggleThinkingExpanded = useCallback(() => {
    setThinkingExpanded((prev) => !prev);
  }, []);

  // Track scroll position to determine if user is near bottom
  const handleScroll = useCallback(() => {
    const container = containerRef.current?.parentElement;
    if (!container) return;

    const threshold = 100; // pixels from bottom
    const distanceFromBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight;
    shouldAutoScrollRef.current = distanceFromBottom < threshold;
  }, []);

  // Attach scroll listener to parent container
  useEffect(() => {
    const container = containerRef.current?.parentElement;
    if (!container) return;

    container.addEventListener("scroll", handleScroll);
    return () => container.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  // Force scroll to bottom when scrollTrigger changes (user sent a message)
  useEffect(() => {
    if (scrollTrigger > 0) {
      shouldAutoScrollRef.current = true;
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [scrollTrigger]);

  // Auto-scroll when content changes or processing starts (if near bottom)
  // biome-ignore lint/correctness/useExhaustiveDependencies: scroll on render item/processing changes is intentional
  useEffect(() => {
    if (shouldAutoScrollRef.current) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [renderItems, isProcessing]);

  return (
    <div className="message-list" ref={containerRef}>
      {turnGroups.map((group) => {
        if (group.isUserPrompt) {
          // User prompts render directly without timeline wrapper
          const item = group.items[0];
          if (!item) return null;
          return (
            <RenderItemComponent
              key={item.id}
              item={item}
              isStreaming={isStreaming}
              thinkingExpanded={thinkingExpanded}
              toggleThinkingExpanded={toggleThinkingExpanded}
            />
          );
        }
        // Assistant items wrapped in timeline container - key based on first item
        const firstItem = group.items[0];
        if (!firstItem) return null;
        return (
          <div key={`turn-${firstItem.id}`} className="assistant-turn">
            {group.items.map((item) => (
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
      })}
      <ProcessingIndicator isProcessing={isProcessing} />
      <div ref={bottomRef} />
    </div>
  );
});

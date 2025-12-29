import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { preprocessMessages } from "../lib/preprocessMessages";
import type { Message } from "../types";
import { RenderItemComponent } from "./RenderItemComponent";

interface Props {
  messages: Message[];
  isStreaming?: boolean;
}

export const MessageList = memo(function MessageList({
  messages,
  isStreaming = false,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const shouldAutoScrollRef = useRef(true);
  const [thinkingExpanded, setThinkingExpanded] = useState(false);

  // Preprocess messages into render items
  const renderItems = useMemo(() => preprocessMessages(messages), [messages]);

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

  // Only auto-scroll if user is near the bottom
  // biome-ignore lint/correctness/useExhaustiveDependencies: scroll on render item changes is intentional
  useEffect(() => {
    if (shouldAutoScrollRef.current) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [renderItems]);

  return (
    <div className="message-list" ref={containerRef}>
      {renderItems.map((item) => (
        <RenderItemComponent
          key={item.id}
          item={item}
          isStreaming={isStreaming}
          thinkingExpanded={thinkingExpanded}
          toggleThinkingExpanded={toggleThinkingExpanded}
        />
      ))}
      <div ref={bottomRef} />
    </div>
  );
});

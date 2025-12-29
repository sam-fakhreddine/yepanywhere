import type { ContentBlock, ContentRenderer, RenderContext } from "../types";

interface TextBlock extends ContentBlock {
  type: "text";
  text: string;
}

/**
 * Text renderer - displays text content with pre-wrap formatting
 */
function TextRendererComponent({ block }: { block: TextBlock }) {
  return <div className="text-block">{block.text}</div>;
}

export const textRenderer: ContentRenderer<TextBlock> = {
  type: "text",
  render(block, _context) {
    return <TextRendererComponent block={block as TextBlock} />;
  },
  getSummary(block) {
    const text = (block as TextBlock).text;
    return text.length > 100 ? `${text.slice(0, 97)}...` : text;
  },
};

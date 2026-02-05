/**
 * AugmentGenerator - Renders completed markdown blocks to HTML
 *
 * Uses shiki for syntax highlighting of code blocks and marked for
 * rendering other markdown blocks. Also provides lightweight inline
 * formatting for pending/incomplete text during streaming.
 */

import { marked } from "marked";
import {
  type BundledLanguage,
  type Highlighter,
  bundledLanguages,
  createHighlighter,
} from "shiki";
import { createCssVariablesTheme } from "shiki/core";
import type {
  CompletedBlock,
  StreamingCodeBlock,
  StreamingList,
} from "./block-detector.js";

/** CSS variables theme - outputs `style="color: var(--shiki-...)"` */
const cssVarsTheme = createCssVariablesTheme({
  name: "css-variables",
  variablePrefix: "--shiki-",
  fontStyle: true,
});

export interface Augment {
  blockIndex: number;
  html: string;
  type: CompletedBlock["type"];
}

export interface AugmentGeneratorConfig {
  languages: string[]; // Languages to pre-load for sync highlighting
}

export interface AugmentGenerator {
  processBlock(block: CompletedBlock, blockIndex: number): Promise<Augment>;
  renderPending(pending: string): string; // Lightweight inline formatting for trailing text
  renderStreamingCodeBlock(
    block: StreamingCodeBlock,
    blockIndex: number,
  ): Promise<Augment>; // Render incomplete code block optimistically
  renderStreamingList(block: StreamingList, blockIndex: number): Augment; // Render incomplete list optimistically
}

/**
 * Creates an AugmentGenerator instance with pre-loaded syntax highlighting.
 *
 * @param config - Configuration for languages and theme
 * @returns Promise that resolves to an AugmentGenerator
 */
export async function createAugmentGenerator(
  config: AugmentGeneratorConfig,
): Promise<AugmentGenerator> {
  // Filter languages to only include valid bundled languages
  const validLanguages = config.languages.filter(
    (lang) => lang in bundledLanguages,
  ) as BundledLanguage[];

  // Create highlighter with CSS variables theme for light/dark mode support
  const highlighter = await createHighlighter({
    themes: [cssVarsTheme],
    langs:
      validLanguages.length > 0 ? validLanguages : ["javascript", "typescript"],
  });

  // Track loaded languages for sync checking
  const loadedLanguages = new Set<string>(validLanguages);

  return {
    async processBlock(
      block: CompletedBlock,
      blockIndex: number,
    ): Promise<Augment> {
      if (block.type === "code") {
        const html = await renderCodeBlock(block, highlighter, loadedLanguages);
        return { blockIndex, html, type: block.type };
      }

      const html = renderMarkdownBlock(block);
      return { blockIndex, html, type: block.type };
    },

    renderPending(pending: string): string {
      return renderInlineFormatting(pending);
    },

    async renderStreamingCodeBlock(
      block: StreamingCodeBlock,
      blockIndex: number,
    ): Promise<Augment> {
      const code = extractStreamingCodeContent(block.content);
      const lang = block.lang ?? "";

      const html = await renderCodeWithHighlighter(
        code,
        lang,
        highlighter,
        loadedLanguages,
      );
      return { blockIndex, html, type: "code" };
    },

    renderStreamingList(block: StreamingList, blockIndex: number): Augment {
      const html = renderMarkdownBlock({
        type: "list",
        content: block.content,
        startOffset: block.startOffset,
        endOffset: block.startOffset + block.content.length,
      });
      return { blockIndex, html, type: "list" };
    },
  };
}

/**
 * Extract code content from a code block, removing the fence markers.
 */
function extractCodeContent(content: string): string {
  const lines = content.split("\n");
  if (lines.length < 2) return "";

  // Remove first line (opening fence) and last line (closing fence if present)
  const hasClosingFence =
    lines.length > 1 &&
    /^(`{3,}|~{3,})$/.test((lines[lines.length - 1] ?? "").trim());

  const codeLines = hasClosingFence ? lines.slice(1, -1) : lines.slice(1);

  return codeLines.join("\n");
}

/**
 * Extract code content from a streaming code block (no closing fence).
 */
function extractStreamingCodeContent(content: string): string {
  const lines = content.split("\n");
  if (lines.length < 2) return "";

  // Remove first line (opening fence), keep everything else
  return lines.slice(1).join("\n");
}

/**
 * Render code with syntax highlighting (shared by completed and streaming code blocks).
 */
async function renderCodeWithHighlighter(
  code: string,
  lang: string,
  highlighter: Highlighter,
  loadedLanguages: Set<string>,
): Promise<string> {
  // Check if language is loaded and valid
  const isValidLang = lang && lang in bundledLanguages;

  if (isValidLang && !loadedLanguages.has(lang)) {
    // Load the language dynamically
    try {
      await highlighter.loadLanguage(lang as BundledLanguage);
      loadedLanguages.add(lang);
    } catch {
      // Language loading failed, fall back to plain text
      return renderPlainCodeBlock(code, lang);
    }
  }

  if (isValidLang && loadedLanguages.has(lang)) {
    try {
      const html = highlighter.codeToHtml(code, {
        lang: lang as BundledLanguage,
        theme: "css-variables",
      });
      return html;
    } catch {
      // Highlighting failed, fall back to plain text
      return renderPlainCodeBlock(code, lang);
    }
  }

  // Unknown or empty language - render as plain code block
  return renderPlainCodeBlock(code, lang);
}

/**
 * Render a code block with syntax highlighting.
 */
async function renderCodeBlock(
  block: CompletedBlock,
  highlighter: Highlighter,
  loadedLanguages: Set<string>,
): Promise<string> {
  const code = extractCodeContent(block.content);
  const lang = block.lang ?? "";
  return renderCodeWithHighlighter(code, lang, highlighter, loadedLanguages);
}

/**
 * Render a plain code block without syntax highlighting.
 */
function renderPlainCodeBlock(code: string, lang: string): string {
  const escapedCode = escapeHtml(code);
  const langClass = lang ? ` class="language-${escapeHtml(lang)}"` : "";
  return `<pre class="shiki"><code${langClass}>${escapedCode}</code></pre>`;
}

/**
 * Render a non-code markdown block using marked.
 */
function renderMarkdownBlock(block: CompletedBlock): string {
  // Use marked to render the markdown, then sanitize to prevent XSS
  const html = marked.parse(block.content, { async: false }) as string;
  return sanitizeHtml(html.trim());
}

/**
 * Render lightweight inline formatting for pending/streaming text.
 * Handles: **bold**, *italic*, `code`, [text](url)
 */
function renderInlineFormatting(text: string): string {
  // Escape HTML first
  let result = escapeHtml(text);

  // Bold: **text**
  result = result.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");

  // Italic: *text* (but not if it's actually bold marker)
  // Use negative lookbehind/lookahead to avoid matching inside bold
  result = result.replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, "<em>$1</em>");

  // Inline code: `text`
  result = result.replace(/`([^`]+)`/g, "<code>$1</code>");

  // Links: [text](url) - validate URL to prevent javascript: injection
  result = result.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    (_match, text: string, url: string) => {
      if (hasUnsafeUrl(url)) {
        return text;
      }
      return `<a href="${url}">${text}</a>`;
    },
  );

  return result;
}

/**
 * Sanitize HTML to prevent XSS attacks.
 *
 * Strips dangerous tags (script, iframe, object, embed, form, base),
 * event handler attributes (on*), and dangerous URL protocols
 * (javascript:, data:text/html) from href/src/action attributes.
 *
 * This is applied after marked.parse() to ensure all HTML output
 * is safe before being sent to the client for dangerouslySetInnerHTML.
 */
export function sanitizeHtml(html: string): string {
  let result = html;

  // 1. Remove <script> tags and their content
  result = result.replace(/<script\b[\s\S]*?<\/script\s*>/gi, "");
  // Remove any remaining unclosed/self-closing script tags
  result = result.replace(/<script\b[^>]*\/?>/gi, "");

  // 2. Remove dangerous tags and their content
  for (const tag of ["iframe", "object", "embed", "form", "base"]) {
    result = result.replace(
      new RegExp(`<${tag}\\b[\\s\\S]*?<\\/${tag}\\s*>`, "gi"),
      "",
    );
    result = result.replace(new RegExp(`<${tag}\\b[^>]*/?>`, "gi"), "");
  }

  // 3. Process each HTML tag to remove event handlers and dangerous URLs
  result = result.replace(/<[^>]+>/g, (tag) => {
    // Remove event handler attributes (onerror, onload, onclick, etc.)
    let cleaned = tag.replace(
      /\s+on[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi,
      "",
    );

    // Neutralize dangerous href/src/action attribute values
    cleaned = cleaned.replace(
      /(href|src|action)\s*=\s*("[^"]*"|'[^']*')/gi,
      (attrMatch, attr: string, quotedValue: string) => {
        const quote = quotedValue[0];
        const value = quotedValue.slice(1, -1);
        if (hasUnsafeUrl(value)) {
          return `${attr}=${quote}${quote}`;
        }
        return attrMatch;
      },
    );

    return cleaned;
  });

  return result;
}

/**
 * Check if a URL value contains an unsafe protocol (javascript:, data:text/html).
 * Handles HTML entity encoding and whitespace obfuscation that browsers normalize.
 */
function hasUnsafeUrl(value: string): boolean {
  // Decode numeric HTML entities (&#NNN; and &#xHH;) to catch encoded bypasses
  const decoded = value
    .replace(/&#x([0-9a-f]+);?/gi, (_, hex) =>
      String.fromCharCode(Number.parseInt(hex, 16)),
    )
    .replace(/&#(\d+);?/g, (_, dec) =>
      String.fromCharCode(Number.parseInt(dec, 10)),
    )
    // Strip whitespace/control chars that browsers ignore within protocol
    .replace(/[\s\t\n\r\0\u200B]+/g, "")
    .toLowerCase();

  return (
    decoded.startsWith("javascript:") || decoded.startsWith("data:text/html")
  );
}

/**
 * Escape HTML special characters.
 */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

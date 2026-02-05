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
      if (!isSafeUrl(url)) {
        return text;
      }
      return `<a href="${url}">${text}</a>`;
    },
  );

  return result;
}

/**
 * Sanitize HTML to prevent XSS attacks using a whitelist approach.
 *
 * Threat model:
 * - Input HTML comes from marked.parse() rendering markdown and should be
 *   treated as untrusted (markdown content may originate from files read by Claude).
 * - We whitelist only the tags and attributes needed for rendered markdown.
 * - Any tag not in the whitelist is stripped entirely (contents preserved as text).
 * - URL-bearing attributes (href, src) are validated against safe schemes only.
 * - Event handler attributes, style attributes, and all other attributes are stripped.
 *
 * This runs after marked.parse() and before dangerouslySetInnerHTML on the client.
 */
export function sanitizeHtml(html: string): string {
  let result = html;

  // Belt-and-suspenders: strip dangerous tags and their content before whitelist pass.
  // This catches nested/malformed cases the tag regex might miss.
  result = result.replace(/<script\b[\s\S]*?<\/script\s*>/gi, "");
  result = result.replace(/<script\b[^>]*\/?>/gi, "");
  for (const tag of [
    "iframe",
    "object",
    "embed",
    "form",
    "base",
    "link",
    "meta",
    "style",
    "svg",
    "math",
  ]) {
    result = result.replace(
      new RegExp(`<${tag}\\b[\\s\\S]*?<\\/${tag}\\s*>`, "gi"),
      "",
    );
    result = result.replace(new RegExp(`<${tag}\\b[^>]*/?>`, "gi"), "");
  }

  // Whitelist-based tag/attribute sanitizer
  result = result.replace(
    /<\/?([a-zA-Z][a-zA-Z0-9-]*)\b([^>]*?)\s*\/?>/g,
    (match, tagNameRaw: string, attrsChunk: string) => {
      const tagName = tagNameRaw.toLowerCase();
      const isClosing = match.startsWith("</");
      const isSelfClosing = match.endsWith("/>");

      if (!ALLOWED_TAGS.has(tagName)) {
        return "";
      }

      if (isClosing) {
        return `</${tagName}>`;
      }

      const attrs = sanitizeAttributes(tagName, attrsChunk);
      const suffix = isSelfClosing ? " /" : "";
      return attrs ? `<${tagName} ${attrs}${suffix}>` : `<${tagName}${suffix}>`;
    },
  );

  return result;
}

/** Tags permitted in sanitized markdown output. */
const ALLOWED_TAGS = new Set([
  // Inline formatting
  "a",
  "strong",
  "em",
  "b",
  "i",
  "code",
  "del",
  "sup",
  "sub",
  "br",
  "span",
  // Block elements
  "p",
  "pre",
  "blockquote",
  "hr",
  // Headings
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  // Lists
  "ul",
  "ol",
  "li",
  // Tables
  "table",
  "thead",
  "tbody",
  "tr",
  "th",
  "td",
  // Description lists
  "dl",
  "dt",
  "dd",
  // Details/summary
  "details",
  "summary",
  // Images (src validated)
  "img",
  // Input (for task list checkboxes from GFM)
  "input",
]);

/**
 * Per-tag allowed attributes. Tags not listed here get no attributes.
 * All attributes not in these sets are stripped.
 */
const ALLOWED_ATTRS: Record<string, Set<string>> = {
  a: new Set(["href", "title", "target", "rel"]),
  img: new Set(["src", "alt", "title", "width", "height"]),
  code: new Set(["class"]),
  pre: new Set(["class"]),
  span: new Set(["class"]),
  td: new Set(["align"]),
  th: new Set(["align"]),
  ol: new Set(["start"]),
  input: new Set(["type", "checked", "disabled"]),
};

/** Attributes that hold URLs and need scheme validation. */
const URL_ATTRS = new Set(["href", "src"]);

/**
 * Parse and sanitize attributes for an allowed tag.
 * Only keeps attributes from the per-tag whitelist.
 * URL-bearing attributes are validated against safe schemes.
 */
function sanitizeAttributes(
  tagName: string,
  rawAttrs: string | undefined,
): string {
  if (!rawAttrs?.trim()) return "";

  const allowedForTag = ALLOWED_ATTRS[tagName];
  if (!allowedForTag || allowedForTag.size === 0) return "";

  // Match quoted and unquoted attribute values
  const attrRegex =
    /([a-zA-Z][a-zA-Z0-9_-]*)\s*(?:=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;

  const keptAttrs: string[] = [];
  let hasRel = false;
  let targetBlank = false;

  for (const attrMatch of rawAttrs.matchAll(attrRegex)) {
    const attrNameRaw = attrMatch[1];
    if (!attrNameRaw) continue;
    const attrName = attrNameRaw.toLowerCase();
    if (!allowedForTag.has(attrName)) continue;

    const value = attrMatch[2] ?? attrMatch[3] ?? attrMatch[4] ?? "";

    // Validate URL attributes against safe schemes
    if (URL_ATTRS.has(attrName) && !isSafeUrl(value)) continue;

    // Track target and rel for security enforcement
    if (attrName === "target" && value === "_blank") targetBlank = true;
    if (attrName === "rel") hasRel = true;

    keptAttrs.push(`${attrName}="${escapeHtmlAttr(value)}"`);
  }

  // Enforce rel="noopener noreferrer" on target="_blank" links
  if (tagName === "a" && targetBlank && !hasRel) {
    keptAttrs.push('rel="noopener noreferrer"');
  }

  return keptAttrs.join(" ");
}

/** Escape a value for safe use inside an HTML attribute. */
function escapeHtmlAttr(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/**
 * Check if a URL is safe for use in href/src attributes.
 * Allows http(s), mailto, tel, relative paths, and anchors.
 * Blocks javascript:, data:text/html, vbscript:, and unknown schemes.
 * Handles HTML entity encoding and whitespace obfuscation.
 */
function isSafeUrl(value: string): boolean {
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

  // Anchors and relative paths are safe
  if (decoded.startsWith("#") || decoded.startsWith("/")) return true;

  // No scheme = relative URL (safe)
  if (!/^[a-z][a-z0-9+.-]*:/i.test(decoded)) return true;

  // Explicitly allow common safe protocols
  if (
    decoded.startsWith("http:") ||
    decoded.startsWith("https:") ||
    decoded.startsWith("mailto:") ||
    decoded.startsWith("tel:")
  ) {
    return true;
  }

  // Block everything else (javascript:, data:, vbscript:, etc.)
  return false;
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

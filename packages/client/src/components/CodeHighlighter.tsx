import {
  Suspense,
  lazy,
  memo,
  startTransition,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { SyntaxHighlighterProps } from "react-syntax-highlighter";

// Skip syntax highlighting for files with more than this many lines
// Prism's synchronous parsing blocks the main thread
const MAX_LINES_FOR_HIGHLIGHTING = 1000;

// Lazy load the syntax highlighter and styles
const SyntaxHighlighter = lazy(async () => {
  const [{ PrismAsyncLight }, { oneDark }] = await Promise.all([
    import("react-syntax-highlighter"),
    import("react-syntax-highlighter/dist/esm/styles/prism"),
  ]);

  // Return a component that uses PrismAsyncLight with the theme
  return {
    default: function HighlighterWithTheme(
      props: SyntaxHighlighterProps & { children: string },
    ) {
      return (
        <PrismAsyncLight
          style={oneDark}
          PreTag="div"
          customStyle={{
            margin: 0,
            padding: "0.75rem",
            background: "transparent",
            fontSize: "0.875rem",
            lineHeight: 1.5,
          }}
          {...props}
        />
      );
    },
  };
});

interface CodeHighlighterProps {
  code: string;
  language: string;
  showLineNumbers?: boolean;
  /** Lines to highlight (1-indexed). Can be single line or range. */
  highlightLines?: { start: number; end?: number };
  /** Callback when a line element is rendered, for scroll-to-line */
  onLineRef?: (lineNumber: number, element: HTMLElement | null) => void;
}

/**
 * Plain code display without syntax highlighting.
 * Used as fallback while loading and for very large files.
 */
function PlainCode({
  code,
  showLineNumbers,
  highlightLines,
  onLineRef,
}: {
  code: string;
  showLineNumbers?: boolean;
  highlightLines?: { start: number; end?: number };
  onLineRef?: (lineNumber: number, element: HTMLElement | null) => void;
}) {
  const lines = code.split("\n");
  const highlightStart = highlightLines?.start ?? 0;
  const highlightEnd = highlightLines?.end ?? highlightStart;

  if (showLineNumbers) {
    return (
      <div className="code-highlighter-plain">
        <div className="code-line-numbers">
          {lines.map((_, i) => (
            <div key={`line-num-${i + 1}`}>{i + 1}</div>
          ))}
        </div>
        <pre className="code-content">
          <code>
            {lines.map((line, i) => {
              const lineNum = i + 1;
              const isHighlighted =
                highlightLines &&
                lineNum >= highlightStart &&
                lineNum <= highlightEnd;
              return (
                <div
                  key={`line-${i + 1}`}
                  ref={
                    onLineRef && lineNum === highlightStart
                      ? (el) => onLineRef(lineNum, el)
                      : undefined
                  }
                  className={isHighlighted ? "highlighted-line" : undefined}
                  style={
                    isHighlighted
                      ? {
                          backgroundColor: "rgba(255, 255, 0, 0.15)",
                          marginLeft: "-0.75rem",
                          marginRight: "-0.75rem",
                          paddingLeft: "0.75rem",
                          paddingRight: "0.75rem",
                        }
                      : undefined
                  }
                >
                  {line || " "}
                </div>
              );
            })}
          </code>
        </pre>
      </div>
    );
  }

  return (
    <pre className="code-highlighter-plain">
      <code>{code}</code>
    </pre>
  );
}

/**
 * Syntax highlighter component with async loading and deferred highlighting.
 *
 * - Shows plain code immediately (no blocking)
 * - Applies syntax highlighting after initial render via startTransition
 * - Skips highlighting entirely for very large files (> MAX_LINES_FOR_HIGHLIGHTING)
 */
export const CodeHighlighter = memo(function CodeHighlighter({
  code,
  language,
  showLineNumbers = false,
  highlightLines,
  onLineRef,
}: CodeHighlighterProps) {
  const lineCount = useMemo(() => code.split("\n").length, [code]);
  const tooLarge = lineCount > MAX_LINES_FOR_HIGHLIGHTING;

  // Start with plain code, then transition to highlighted
  // Reset when code changes by using code length as a proxy
  const codeKey = `${code.length}-${code.slice(0, 100)}`;
  const [showHighlighted, setShowHighlighted] = useState(false);
  const [lastCodeKey, setLastCodeKey] = useState("");

  useEffect(() => {
    // Reset if code changed
    if (codeKey !== lastCodeKey) {
      setShowHighlighted(false);
      setLastCodeKey(codeKey);
    }

    if (tooLarge || showHighlighted) return;

    // Use startTransition to keep UI responsive while highlighting loads
    startTransition(() => {
      setShowHighlighted(true);
    });
  }, [codeKey, lastCodeKey, tooLarge, showHighlighted]);

  // Normalize language name to match Prism's expectations
  const normalizedLanguage = useMemo(() => {
    const langMap: Record<string, string> = {
      typescript: "tsx",
      javascript: "jsx",
      js: "jsx",
      ts: "tsx",
      sh: "bash",
      shell: "bash",
      zsh: "bash",
      plaintext: "text",
    };
    return langMap[language.toLowerCase()] || language.toLowerCase();
  }, [language]);

  // Build lineProps function for highlighting and refs
  const lineProps = useMemo(() => {
    if (!highlightLines && !onLineRef) return undefined;

    return (lineNumber: number) => {
      const start = highlightLines?.start ?? 0;
      const end = highlightLines?.end ?? start;
      const isHighlighted =
        highlightLines && lineNumber >= start && lineNumber <= end;

      const props: React.HTMLAttributes<HTMLElement> & {
        ref?: (el: HTMLElement | null) => void;
      } = {};

      if (isHighlighted) {
        props.className = "highlighted-line";
        props.style = {
          backgroundColor: "rgba(255, 255, 0, 0.15)",
          display: "block",
          marginLeft: "-0.75rem",
          marginRight: "-0.75rem",
          paddingLeft: "0.75rem",
          paddingRight: "0.75rem",
        };
      }

      // Attach ref for the first highlighted line (for scrolling)
      if (onLineRef && lineNumber === start) {
        props.ref = (el: HTMLElement | null) => onLineRef(lineNumber, el);
      }

      return props;
    };
  }, [highlightLines, onLineRef]);

  // For very large files or before highlighting is ready, show plain code
  if (tooLarge || !showHighlighted) {
    return (
      <PlainCode
        code={code}
        showLineNumbers={showLineNumbers}
        highlightLines={highlightLines}
        onLineRef={onLineRef}
      />
    );
  }

  // Need wrapLines for lineProps to work
  const needsWrapLines = showLineNumbers || !!lineProps;

  return (
    <Suspense
      fallback={
        <PlainCode
          code={code}
          showLineNumbers={showLineNumbers}
          highlightLines={highlightLines}
          onLineRef={onLineRef}
        />
      }
    >
      <SyntaxHighlighter
        language={normalizedLanguage}
        showLineNumbers={showLineNumbers}
        wrapLines={needsWrapLines}
        lineProps={lineProps}
        lineNumberStyle={{
          minWidth: "2.5em",
          paddingRight: "1em",
          textAlign: "right",
          userSelect: "none",
          opacity: 0.5,
        }}
      >
        {code}
      </SyntaxHighlighter>
    </Suspense>
  );
});

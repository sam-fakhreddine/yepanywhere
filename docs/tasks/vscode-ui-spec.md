# VS Code Claude UI Visual Specification

> **Purpose**: This document serves as the authoritative visual reference for making claude-anywhere's message rendering match VS Code's Claude Code extension. Include this file in context when working on renderers.

## How to Populate This Spec

1. Open VS Code with Claude Code extension
2. Open DevTools: `Help → Toggle Developer Tools`
3. Find the webview frame in the Elements panel
4. Inspect each component type and extract:
   - CSS properties (colors, spacing, fonts)
   - HTML structure
   - Class names and their purposes

---

## Color Palette

Extract these from VS Code's CSS variables or computed styles:

```css
/* Core colors - FILL THESE IN */
--timeline-line: #3c3c3c;        /* Vertical line color */
--timeline-dot-idle: #3c3c3c;    /* Completed/idle state */
--timeline-dot-working: #0078d4; /* Blue pulsing when active */
--timeline-dot-pending: #f0c674; /* Amber when awaiting approval */

--text-primary: #cccccc;
--text-muted: #888888;
--text-dimmed: #666666;

--bg-surface: #1e1e1e;
--bg-hover: #2a2a2a;
--bg-code: #1a1a1a;

--link-color: #4fc1ff;
--error-color: #f48771;
--success-color: #89d185;
```

---

## Timeline Structure

The left-side timeline with status dots.

### Visual Reference
```
[INSERT SCREENSHOT HERE]
Annotate with measurements
```

### CSS/Layout
```css
.timeline-container {
  position: relative;
  padding-left: 24px; /* Space for timeline */
}

.timeline-line {
  position: absolute;
  left: 12px;
  top: 0;
  bottom: 0;
  width: 2px;
  background: var(--timeline-line);
}

.timeline-dot {
  position: absolute;
  left: 8px; /* Center on line: 12px - 4px (half of 8px dot) */
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--timeline-dot-idle);
}

.timeline-dot.working {
  background: var(--timeline-dot-working);
  animation: pulse 1.5s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}
```

---

## Tool Call Row (Collapsed)

Single-line compact display of a tool operation.

### Visual Reference
```
[INSERT SCREENSHOT: Collapsed Read/Bash/Grep rows]

Example layout:
┌─────────────────────────────────────────────────────────┐
│ ● │ Read  types.ts                               ▸     │
│   │       └── muted filename, clickable                │
└─────────────────────────────────────────────────────────┘
```

### Structure
```tsx
<div className="tool-row collapsed">
  <span className="timeline-dot" />
  <span className="tool-icon">{icon}</span>
  <span className="tool-name">Read</span>
  <span className="tool-summary">types.ts</span>
  <span className="tool-meta">(lines 1-50)</span>
  <button className="expand-toggle">▸</button>
</div>
```

### CSS
```css
.tool-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 8px;
  min-height: 28px;
  cursor: pointer;
}

.tool-row:hover {
  background: var(--bg-hover);
}

.tool-name {
  font-weight: 600;
  font-size: 13px;
  color: var(--text-primary);
}

.tool-summary {
  font-family: var(--font-mono);
  font-size: 13px;
  color: var(--link-color);
}

.tool-meta {
  font-size: 12px;
  color: var(--text-dimmed);
}

.expand-toggle {
  margin-left: auto;
  background: none;
  border: none;
  color: var(--text-dimmed);
  font-size: 10px;
}
```

---

## Tool Call Row (Expanded)

When user clicks to expand a tool call.

### Visual Reference
```
[INSERT SCREENSHOT: Expanded tool showing file contents]
```

### Structure
```tsx
<div className="tool-row expanded">
  <div className="tool-row-header">
    {/* Same as collapsed header */}
    <button className="expand-toggle">▾</button>
  </div>
  <div className="tool-row-content">
    {/* Tool-specific expanded content */}
  </div>
</div>
```

### Per-Tool Expanded Content

**Read**: Show file contents with line numbers (or truncated preview with "Show more")
**Bash**: Show command + output (stdout/stderr)
**Edit**: Show diff view
**Glob**: Show file list
**Grep**: Show matches with context

---

## Thinking Block

Claude's internal reasoning, collapsed by default.

### Collapsed State
```
[INSERT SCREENSHOT]

Visual: "Thinking ▸" in italic, muted
```

```css
.thinking-collapsed {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: var(--text-dimmed);
  font-style: italic;
  font-size: 13px;
  cursor: pointer;
}
```

### Expanded State
```
[INSERT SCREENSHOT]

Visual: "Thinking ▾" followed by thinking content below
```

```css
.thinking-expanded .thinking-content {
  padding: 8px 0;
  color: var(--text-muted);
  font-size: 13px;
  white-space: pre-wrap;
}
```

---

## Text/Assistant Message

Claude's conversational responses.

### Visual Reference
```
[INSERT SCREENSHOT]
```

### CSS
```css
.assistant-text {
  font-size: 14px;
  line-height: 1.5;
  color: var(--text-primary);
}

.assistant-text code {
  font-family: var(--font-mono);
  background: var(--bg-code);
  padding: 2px 4px;
  border-radius: 3px;
}
```

---

## Streaming/Loading States

### Tool In Progress
```
[INSERT SCREENSHOT: Tool with spinner or "Running..."]
```

### Thinking In Progress
```
[INSERT SCREENSHOT: "Thinking..." with animation]
```

---

## Typography

```css
:root {
  --font-sans: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  --font-mono: 'SF Mono', Monaco, 'Cascadia Code', Consolas, monospace;
  
  --font-size-sm: 12px;
  --font-size-base: 13px;
  --font-size-lg: 14px;
}
```

---

## Spacing Scale

```css
:root {
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 24px;
}
```

---

## Reference: Cline Source Code

The open-source Cline extension has similar UI patterns. Key files to reference:
- `webview-ui/src/components/chat/ChatRow.tsx` - Main message row component
- `webview-ui/src/index.css` - Theme variables and base styles

GitHub: https://github.com/cline/cline

---

## Checklist for Implementation

- [ ] Timeline line and dots
- [ ] Collapsed tool row with summary
- [ ] Expand/collapse animation
- [ ] Read tool: filename + line count + expandable content
- [ ] Bash tool: command + exit code + expandable output
- [ ] Grep tool: query + match count + expandable results
- [ ] Edit tool: filename + diff stats + expandable diff
- [ ] Thinking: collapsed toggle + expandable content
- [ ] Text: markdown rendering with code highlighting
- [ ] Streaming states for all components

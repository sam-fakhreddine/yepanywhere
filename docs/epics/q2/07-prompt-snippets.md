# Epic: Prompt Snippets Library

**Epic ID:** Q2-007
**Priority:** P1
**Quarter:** Q2 2026
**Estimated Effort:** 1-2 weeks
**Status:** Planning

---

## Problem Statement

Users type similar prompt patterns repeatedly: "Review this file for...", "Refactor to...", "Add tests for...". This repetition wastes time and leads to inconsistent instructions.

**Target Outcome:** Save, organize, and quickly insert reusable prompt snippets with variable placeholders.

---

## User Stories

### US-001: Save prompt as snippet
- [ ] Select text in prompt input, "Save as Snippet"
- [ ] Name and categorize the snippet
- [ ] Identify variable placeholders (e.g., `{{filename}}`)
- [ ] Snippets stored in user's library

### US-002: Insert snippet
- [ ] Keyboard shortcut (Cmd/Ctrl + J) opens snippet picker
- [ ] Search snippets by name/content
- [ ] Insert fills placeholders with prompt
- [ ] Tab between placeholders
- [ ] Recent snippets at top

### US-003: Variable placeholders
- [ ] Support `{{variable}}` syntax
- [ ] Common variables: `{{filename}}`, `{{selection}}`, `{{language}}`
- [ ] Custom variable prompts
- [ ] Default values for variables

### US-004: Snippet management
- [ ] List, edit, delete snippets
- [ ] Categories for organization
- [ ] Import/export as JSON
- [ ] Share snippets with team (future)

---

## Technical Approach

```typescript
interface PromptSnippet {
  id: string;
  name: string;
  content: string;
  category: string;
  variables: SnippetVariable[];
  usageCount: number;
  createdAt: string;
}

interface SnippetVariable {
  name: string;
  defaultValue?: string;
  description?: string;
}

// Parse variables from content
function parseVariables(content: string): SnippetVariable[] {
  const matches = content.matchAll(/\{\{(\w+)(?::([^}]+))?\}\}/g);
  return Array.from(matches).map(m => ({
    name: m[1],
    defaultValue: m[2],
  }));
}

// Expand snippet with values
function expandSnippet(snippet: PromptSnippet, values: Record<string, string>): string {
  return snippet.content.replace(/\{\{(\w+)(?::[^}]+)?\}\}/g, (_, name) =>
    values[name] ?? `{{${name}}}`
  );
}
```

---

## Subagent Assignments

### Frontend Agent
- Snippet picker overlay with search
- Snippet creation dialog with variable detection
- Tab-stop navigation for placeholders
- Snippet management page
- Keyboard shortcut integration

### Backend Agent
- Snippet CRUD API
- Import/export endpoints
- Usage tracking

---

## Success Metrics

| Metric | Target |
|--------|--------|
| Snippet creation | 30% of users create snippets |
| Snippet usage | 20% of prompts use snippets |
| Time saved | 50% faster repeated prompts |

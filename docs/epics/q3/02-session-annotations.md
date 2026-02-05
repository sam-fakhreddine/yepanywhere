# Epic: Session Annotations and Handoff Notes

**Epic ID:** Q3-002
**Priority:** P0
**Quarter:** Q3 2026
**Estimated Effort:** 2-3 weeks
**Status:** Planning

---

## Problem Statement

When team members pick up someone else's session, they lack context about what was tried, what worked, and what to do next. This creates confusion and wasted time re-discovering context.

**Target Outcome:** Inline annotations and AI-generated handoff summaries that enable seamless async collaboration.

---

## User Stories

### US-001: Add inline annotations
- [ ] Click any message to add timestamped note
- [ ] Support markdown in annotations
- [ ] @mention team members (triggers notification)
- [ ] Edit/delete own annotations
- [ ] Annotations visible in timeline with distinct styling

### US-002: AI-generated handoff summary
- [ ] "Generate Handoff" button creates context summary
- [ ] Includes: what was accomplished, blockers, next steps
- [ ] Based on last N messages and any annotations
- [ ] Editable before sharing
- [ ] Auto-generates when session idle >1 hour

### US-003: Pin important annotations
- [ ] Pin annotations to session header
- [ ] Pinned items visible on session card
- [ ] Quick access to critical context
- [ ] Max 3 pinned per session

### US-004: Export with annotations
- [ ] Annotations included in session exports
- [ ] Filter export to annotated sections only
- [ ] Generate report from annotations

---

## Technical Approach

```typescript
interface SessionAnnotation {
  id: string;
  sessionId: string;
  messageId: string; // Which message this annotates
  author: string;
  content: string;
  mentions: string[]; // @mentioned usernames
  pinned: boolean;
  createdAt: string;
  updatedAt: string;
}

interface HandoffSummary {
  id: string;
  sessionId: string;
  generatedAt: string;
  accomplished: string[];
  blockers: string[];
  nextSteps: string[];
  editedContent?: string;
  messageRange: { start: string; end: string };
}

// Generate handoff using Claude
async function generateHandoff(session: Session): Promise<HandoffSummary> {
  const recentMessages = await getRecentMessages(session.id, 50);
  const annotations = await getAnnotations(session.id);

  const prompt = `Summarize this AI agent session for handoff to another developer.

Session: ${session.title}
Messages: ${formatMessages(recentMessages)}
Annotations: ${formatAnnotations(annotations)}

Generate:
1. What was accomplished (bullet points)
2. Current blockers or issues
3. Suggested next steps

Be concise and actionable.`;

  const response = await claude.complete(prompt);
  return parseHandoffResponse(response);
}
```

---

## Subagent Assignments

### Backend Agent
- Annotation CRUD API
- Handoff generation with Claude
- @mention notification triggers
- Export integration

### Frontend Agent
- Inline annotation UI (click to add)
- Annotation display in timeline
- Handoff summary generator and editor
- Pin management UI

---

## Success Metrics

| Metric | Target |
|--------|--------|
| Sessions with annotations | 20% |
| Handoff generation usage | 30% of shared sessions |
| @mention engagement | 50% receive response |

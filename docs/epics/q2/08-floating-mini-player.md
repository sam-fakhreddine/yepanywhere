# Epic: Floating Mini-Player

**Epic ID:** Q2-008
**Priority:** P2
**Quarter:** Q2 2026
**Estimated Effort:** 2 weeks
**Status:** Planning

---

## Problem Statement

When navigating away from an active session (to view other sessions, settings, etc.), users lose visibility into what their agent is doing. They must navigate back repeatedly to check progress.

**Target Outcome:** A floating, collapsible card showing the current session's latest activity, visible throughout the app.

---

## User Stories

### US-001: Mini-player shows latest message
- [ ] Floating card at bottom of screen when session active
- [ ] Shows last message preview (truncated)
- [ ] Typing indicator when agent is working
- [ ] Tool use indicator with tool name

### US-002: Expand/collapse
- [ ] Tap to expand for more detail
- [ ] Swipe down to collapse to minimal state
- [ ] Swipe away to dismiss entirely
- [ ] Remembers last state

### US-003: Quick actions
- [ ] Tap expanded player to go to session
- [ ] Approve/deny if pending (optional expansion)
- [ ] Pause/resume session button

### US-004: Multi-session awareness
- [ ] Select which session to show
- [ ] Badge for other sessions needing attention
- [ ] Quick switch between sessions

---

## Technical Approach

```typescript
interface MiniPlayerState {
  visible: boolean;
  expanded: boolean;
  sessionId: string | null;
  latestMessage: MessagePreview | null;
  status: 'typing' | 'tool_use' | 'idle' | 'waiting';
  currentTool?: string;
}

// Floating component using portal
const MiniPlayer: React.FC = () => {
  const { state, expand, collapse, dismiss } = useMiniPlayer();

  if (!state.visible || !state.sessionId) return null;

  return createPortal(
    <motion.div
      className="fixed bottom-4 left-4 right-4 z-50"
      drag="y"
      onDragEnd={handleDragEnd}
    >
      {state.expanded ? (
        <ExpandedMiniPlayer {...state} />
      ) : (
        <CollapsedMiniPlayer {...state} />
      )}
    </motion.div>,
    document.body
  );
};
```

---

## Subagent Assignments

### Frontend Agent
- Create MiniPlayer component with animations
- Implement drag gestures for expand/collapse
- Subscribe to session events for real-time updates
- Handle multi-session selection

---

## Success Metrics

| Metric | Target |
|--------|--------|
| Mini-player engagement | 50% of multi-page navigation uses it |
| Quick return to session | 30% faster than manual navigation |

# Epic: Session Watch

**Epic ID:** Q3-010
**Priority:** P2
**Quarter:** Q3 2026
**Estimated Effort:** 2-3 weeks
**Status:** Planning

---

## Problem Statement

Team members want to observe sessions in real-time for pair programming or mentoring without interfering with the session owner.

**Target Outcome:** Real-time read-only session observation with optional suggestion capability.

---

## User Stories

### US-001: Watch live session
- [ ] "Watch" link opens read-only live view
- [ ] See typing, tool calls, outputs in real-time
- [ ] Viewer count indicator for owner
- [ ] Watch from share link

### US-002: Watcher experience
- [ ] Clear "Watching" banner
- [ ] Cannot send messages or approve
- [ ] See same view as owner
- [ ] Smooth real-time updates

### US-003: Suggestions (optional)
- [ ] Owner can enable suggestions
- [ ] Watchers can propose messages
- [ ] Owner sees suggestions in sidebar
- [ ] Owner can accept/ignore suggestions

### US-004: Watcher management
- [ ] See who's watching
- [ ] Remove watchers
- [ ] Disable watching entirely
- [ ] Watch session timeout

---

## Technical Approach

```typescript
interface SessionWatcher {
  sessionId: string;
  watcherId: string;
  joinedAt: string;
  canSuggest: boolean;
}

interface WatcherSuggestion {
  id: string;
  sessionId: string;
  watcherId: string;
  content: string;
  status: 'pending' | 'accepted' | 'ignored';
  createdAt: string;
}

// WebSocket events for watchers
type WatcherEvent =
  | { type: 'watcher_joined'; watcher: SessionWatcher }
  | { type: 'watcher_left'; watcherId: string }
  | { type: 'suggestion'; suggestion: WatcherSuggestion }
  | { type: 'suggestion_status'; id: string; status: string };

// Server-side: broadcast session updates to watchers
class WatcherBroadcast {
  private watchers: Map<string, Set<WebSocket>> = new Map();

  addWatcher(sessionId: string, ws: WebSocket): void {
    if (!this.watchers.has(sessionId)) {
      this.watchers.set(sessionId, new Set());
    }
    this.watchers.get(sessionId)!.add(ws);
  }

  broadcast(sessionId: string, event: SessionEvent): void {
    const watchers = this.watchers.get(sessionId);
    if (!watchers) return;

    const message = JSON.stringify(event);
    for (const ws of watchers) {
      ws.send(message);
    }
  }
}
```

---

## Subagent Assignments

### Backend Agent
- Watcher WebSocket management
- Suggestion handling
- Watcher count tracking
- Session broadcast optimization

### Frontend Agent
- Watch view (read-only session)
- Watcher indicator for owner
- Suggestion UI (sidebar)
- Watcher management panel

---

## Success Metrics

| Metric | Target |
|--------|--------|
| Sessions watched | 15% have watchers |
| Suggestion acceptance | 30% of suggestions accepted |
| Watch duration | Avg 5+ minutes |

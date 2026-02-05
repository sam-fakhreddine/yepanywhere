# Epic: Offline Session History Cache

**Epic ID:** Q2-004
**Priority:** P1
**Quarter:** Q2 2026
**Estimated Effort:** 2 weeks
**Status:** Planning

---

## Problem Statement

Mobile users on unreliable connections (commute, travel, spotty WiFi) cannot access session history when offline. This breaks the mobile-first promise since users must have connectivity to see what their agents have been doing.

**Target Outcome:** Full read-only access to recent session history when offline, with seamless sync when connectivity returns.

---

## User Stories

### US-001: Cache session metadata offline
**As a** mobile user on the subway
**I want to** see my session list when offline
**So that** I can review what sessions exist

**Acceptance Criteria:**
- [ ] Session list loads from cache when offline
- [ ] Shows session title, status, last activity
- [ ] Indicates cached data with visual marker
- [ ] Refresh button shows "offline" state
- [ ] Last sync timestamp visible

### US-002: Cache session messages
**As a** mobile user without connectivity
**I want to** read recent messages in a session
**So that** I can review agent progress

**Acceptance Criteria:**
- [ ] Last 100 messages per session cached
- [ ] Messages load from cache when offline
- [ ] Tool outputs included in cache
- [ ] Images/files show placeholder if not cached
- [ ] Scroll position preserved

### US-003: Background sync
**As a** user regaining connectivity
**I want to** session data to sync automatically
**So that** I see the latest without manual refresh

**Acceptance Criteria:**
- [ ] Sync triggers on connectivity restore
- [ ] New messages fetch incrementally
- [ ] Sync indicator while updating
- [ ] Conflict-free merge of new data
- [ ] Notifications for significant changes

### US-004: Storage management
**As a** user with limited device storage
**I want to** control offline cache size
**So that** the app doesn't fill my phone

**Acceptance Criteria:**
- [ ] Settings to control max cache size
- [ ] LRU eviction for old sessions
- [ ] Option to clear cache
- [ ] Storage usage indicator
- [ ] Pin important sessions to prevent eviction

---

## Technical Approach

### Architecture

```
┌─────────────────────────────────────────────────────────┐
│                  Offline Cache System                    │
├─────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐ │
│  │ IndexedDB   │  │ Sync        │  │ Network         │ │
│  │ Store       │  │ Manager     │  │ Monitor         │ │
│  │             │  │             │  │                 │ │
│  │ - sessions  │  │ - delta     │  │ - online/off    │ │
│  │ - messages  │  │ - conflict  │  │ - background    │ │
│  │ - metadata  │  │ - queue     │  │ - service worker│ │
│  └─────────────┘  └─────────────┘  └─────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

### Data Model (IndexedDB)

```typescript
// IndexedDB schema
interface OfflineDB {
  sessions: {
    key: string; // sessionId
    value: CachedSession;
    indexes: ['lastAccessed', 'projectId'];
  };
  messages: {
    key: string; // `${sessionId}:${messageId}`
    value: CachedMessage;
    indexes: ['sessionId', 'timestamp'];
  };
  syncState: {
    key: string; // 'global' or sessionId
    value: SyncState;
  };
}

interface CachedSession {
  sessionId: string;
  title: string;
  projectPath: string;
  status: SessionStatus;
  lastActivity: string;
  messageCount: number;
  cachedMessageCount: number;
  lastSyncedAt: string;
  pinnedAt?: string;
  sizeBytes: number;
}

interface CachedMessage {
  messageId: string;
  sessionId: string;
  type: 'user' | 'assistant' | 'system';
  content: MessageContent[];
  timestamp: string;
  toolUse?: CachedToolUse;
}

interface SyncState {
  lastSyncTimestamp: string;
  pendingActions: OfflineAction[];
  syncVersion: number;
}
```

### Implementation

```typescript
class OfflineCacheService {
  private db: IDBDatabase;

  async initialize(): Promise<void> {
    this.db = await openDB('yep-anywhere-cache', 1, {
      upgrade(db) {
        const sessionStore = db.createObjectStore('sessions', { keyPath: 'sessionId' });
        sessionStore.createIndex('lastAccessed', 'lastAccessed');
        sessionStore.createIndex('projectId', 'projectId');

        const messageStore = db.createObjectStore('messages', { keyPath: ['sessionId', 'messageId'] });
        messageStore.createIndex('sessionId', 'sessionId');
        messageStore.createIndex('timestamp', 'timestamp');

        db.createObjectStore('syncState', { keyPath: 'key' });
      },
    });
  }

  async cacheSessions(sessions: Session[]): Promise<void> {
    const tx = this.db.transaction('sessions', 'readwrite');
    for (const session of sessions) {
      await tx.store.put(this.toCachedSession(session));
    }
    await tx.done;
  }

  async getCachedSessions(): Promise<CachedSession[]> {
    return this.db.getAllFromIndex('sessions', 'lastAccessed');
  }

  async cacheMessages(sessionId: string, messages: Message[]): Promise<void> {
    const tx = this.db.transaction('messages', 'readwrite');
    for (const message of messages) {
      await tx.store.put({
        sessionId,
        messageId: message.id,
        ...this.toCachedMessage(message),
      });
    }
    await tx.done;

    // Enforce message limit per session
    await this.pruneOldMessages(sessionId, 100);
  }

  async getCachedMessages(sessionId: string): Promise<CachedMessage[]> {
    return this.db.getAllFromIndex('messages', 'sessionId', sessionId);
  }

  async pruneCache(maxSizeBytes: number): Promise<void> {
    const sessions = await this.getCachedSessions();
    let totalSize = sessions.reduce((sum, s) => sum + s.sizeBytes, 0);

    // Sort by lastAccessed, keep pinned
    const toEvict = sessions
      .filter(s => !s.pinnedAt)
      .sort((a, b) => new Date(a.lastAccessed).getTime() - new Date(b.lastAccessed).getTime());

    for (const session of toEvict) {
      if (totalSize <= maxSizeBytes) break;
      await this.evictSession(session.sessionId);
      totalSize -= session.sizeBytes;
    }
  }
}
```

### Sync Manager

```typescript
class SyncManager {
  async sync(): Promise<SyncResult> {
    const syncState = await this.getSyncState();
    const serverChanges = await this.fetchChanges(syncState.lastSyncTimestamp);

    // Apply server changes to local cache
    await this.applyChanges(serverChanges);

    // Upload pending offline actions
    await this.uploadPendingActions(syncState.pendingActions);

    // Update sync state
    await this.updateSyncState({
      lastSyncTimestamp: new Date().toISOString(),
      pendingActions: [],
      syncVersion: syncState.syncVersion + 1,
    });

    return {
      sessionsUpdated: serverChanges.sessions.length,
      messagesUpdated: serverChanges.messages.length,
      actionsUploaded: syncState.pendingActions.length,
    };
  }

  async scheduleBackgroundSync(): Promise<void> {
    if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
      const registration = await navigator.serviceWorker.ready;
      await registration.sync.register('session-sync');
    }
  }
}

// Service Worker background sync
self.addEventListener('sync', (event: SyncEvent) => {
  if (event.tag === 'session-sync') {
    event.waitUntil(syncManager.sync());
  }
});
```

### Network Monitor

```typescript
class NetworkMonitor {
  private online = navigator.onLine;
  private listeners: Set<(online: boolean) => void> = new Set();

  constructor() {
    window.addEventListener('online', () => this.setOnline(true));
    window.addEventListener('offline', () => this.setOnline(false));
  }

  private setOnline(online: boolean) {
    if (this.online !== online) {
      this.online = online;
      this.notify();

      if (online) {
        // Trigger sync when coming back online
        syncManager.sync();
      }
    }
  }

  isOnline(): boolean {
    return this.online;
  }

  subscribe(callback: (online: boolean) => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }
}
```

### API Endpoints

```
GET /api/sync/changes?since=:timestamp    # Get changes since timestamp
POST /api/sync/actions                    # Upload offline actions
GET /api/sessions/:id/messages?after=:id  # Incremental message fetch
```

---

## Dependencies

| Dependency | Type | Status | Notes |
|------------|------|--------|-------|
| IndexedDB | Browser | Available | Core storage |
| Service Worker | Browser | Exists | Background sync |
| idb library | External | New | IndexedDB wrapper |
| Network Information API | Browser | Limited | Fallback to online events |

---

## Subagent Assignments

### Frontend Agent
**Expertise:** React, IndexedDB, offline-first PWA
**Tasks:**
1. Create OfflineCacheService with IndexedDB
2. Implement SyncManager with delta sync
3. Build NetworkMonitor with event handling
4. Add offline indicators throughout UI
5. Create storage settings page
6. Implement pinned sessions feature

**Deliverables:**
- `packages/client/src/services/offline/`
- Offline-aware components
- Storage settings UI

### PWA Agent
**Expertise:** Service workers, background sync, caching
**Tasks:**
1. Configure service worker for background sync
2. Implement sync event handler
3. Cache API responses for offline
4. Handle stale-while-revalidate patterns
5. Test offline scenarios

**Deliverables:**
- Updated service worker
- Cache strategies documentation
- Offline test suite

### QA Agent
**Expertise:** Offline testing, data sync, edge cases
**Tasks:**
1. Test complete offline workflow
2. Test sync after long offline period
3. Test storage limit enforcement
4. Test conflict resolution
5. Test across browsers and devices

**Deliverables:**
- Offline test matrix
- Sync reliability report
- Browser compatibility report

---

## Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Offline session list load | <500ms | Performance timing |
| Offline message access | 90% of recent messages | Cache hit rate |
| Background sync success | >95% | Sync completion tracking |
| Storage efficiency | <50MB for 20 sessions | Storage measurement |

---

## Risks & Mitigations

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| IndexedDB quota exceeded | High | Medium | Proactive pruning, user warnings |
| Sync conflicts | Medium | Low | Server-wins conflict resolution |
| Stale data confusion | Medium | Medium | Clear offline indicators |
| Background sync not supported | Low | Medium | Graceful fallback to manual |

---

## References

- IndexedDB: https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API
- Background Sync: https://developer.chrome.com/docs/workbox/modules/workbox-background-sync/
- idb library: https://github.com/jakearchibald/idb

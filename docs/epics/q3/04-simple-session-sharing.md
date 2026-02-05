# Epic: Simple Session Sharing

**Epic ID:** Q3-004
**Priority:** P1
**Quarter:** Q3 2026
**Estimated Effort:** 3 weeks
**Status:** Planning

---

## Problem Statement

Small teams need to share sessions without enterprise RBAC complexity. Currently there's no way to show a colleague what an agent did without screen sharing.

**Target Outcome:** Generate shareable links for view-only or interactive session access without requiring accounts.

---

## User Stories

### US-001: Generate shareable link
- [ ] "Share" button generates unique URL
- [ ] Link expires after configurable time (default 24h)
- [ ] Option: view-only or allow messages
- [ ] Option: require passcode
- [ ] Revoke link at any time

### US-002: View-only access
- [ ] Recipients see full session history
- [ ] Real-time updates if session active
- [ ] Cannot send messages or approve
- [ ] Clear "View Only" indicator

### US-003: Interactive access (optional)
- [ ] Owner can allow link recipients to send messages
- [ ] Owner approves all tool operations
- [ ] Clear indicator of who sent each message
- [ ] Revoke interactive access independently

### US-004: No account required
- [ ] Link works without login
- [ ] Rate limiting to prevent abuse
- [ ] Cannot access other sessions
- [ ] All actions attributed to "Guest"

---

## Technical Approach

```typescript
interface ShareLink {
  id: string;
  sessionId: string;
  token: string; // Random URL-safe token
  permissions: 'view' | 'interact';
  passcode?: string; // Hashed
  expiresAt: string;
  createdBy: string;
  createdAt: string;
  accessCount: number;
  lastAccessedAt?: string;
  revoked: boolean;
}

// Share link URL: /share/{token}
// With passcode: /share/{token}?code={passcode}

// Middleware to validate share access
async function validateShareAccess(token: string, passcode?: string): Promise<ShareLink | null> {
  const link = await db.shareLinks.findByToken(token);

  if (!link || link.revoked) return null;
  if (new Date(link.expiresAt) < new Date()) return null;
  if (link.passcode && !verifyPasscode(passcode, link.passcode)) return null;

  await db.shareLinks.incrementAccess(link.id);
  return link;
}

// Rate limiting for unauthenticated access
const shareRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  keyGenerator: (req) => req.ip,
});
```

---

## Subagent Assignments

### Backend Agent
- Share link CRUD API
- Token generation and validation
- Passcode hashing
- Access tracking
- Rate limiting

### Frontend Agent
- Share dialog with options
- Shared session view (guest experience)
- Active links management
- Passcode entry UI

---

## Success Metrics

| Metric | Target |
|--------|--------|
| Users who share | 30% |
| Link access rate | 60% of links viewed |
| Interactive shares | 20% of total shares |

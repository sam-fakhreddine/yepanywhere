# Epic: Quick Approval Actions from Notification

**Epic ID:** Q2-001
**Priority:** P0
**Quarter:** Q2 2026
**Estimated Effort:** 2 weeks
**Status:** Planning

---

## Problem Statement

When an agent needs approval, users must:
1. See push notification
2. Unlock phone
3. Open Yep Anywhere app
4. Navigate to the session
5. Review and approve

This 5-step process takes 30-60 seconds. For developers on the go, this is too slow.

**Target Outcome:** Approve or deny directly from the notification in <5 seconds without unlocking the phone.

---

## User Stories

### US-001: Approve from notification
**As a** developer who received an approval notification
**I want to** tap "Approve" directly on the notification
**So that** I can unblock my agent without opening the app

**Acceptance Criteria:**
- [ ] Notification shows "Approve" action button
- [ ] Tapping "Approve" sends approval immediately
- [ ] Success confirmed with notification update
- [ ] Works without unlocking device (iOS) or from lock screen (Android)
- [ ] Agent continues immediately after approval
- [ ] Approval logged in session history

### US-002: Deny from notification
**As a** developer who sees a risky operation
**I want to** tap "Deny" directly on the notification
**So that** I can prevent the operation without delay

**Acceptance Criteria:**
- [ ] Notification shows "Deny" action button
- [ ] Tapping "Deny" rejects the operation
- [ ] Agent receives rejection and can request alternatives
- [ ] Denial logged in session history

### US-003: View details from notification
**As a** developer who needs more context
**I want to** tap "View" to see the full approval request
**So that** I can make an informed decision

**Acceptance Criteria:**
- [ ] "View Details" opens app to approval screen
- [ ] Full context visible (file content, bash command, etc.)
- [ ] Can approve/deny from detail view
- [ ] Deep link works even if app not running

### US-004: Always allow option
**As a** developer who sees a recurring safe operation
**I want to** choose "Always Allow" from notification
**So that** I create an approval rule without opening settings

**Acceptance Criteria:**
- [ ] Expanded notification shows "Always Allow" option
- [ ] Creates approval rule matching this operation type
- [ ] Confirms rule creation in notification
- [ ] Approves current operation automatically
- [ ] Rule visible in Approval Rules settings

### US-005: Rich notification content
**As a** developer deciding on approval
**I want to** see relevant context in the notification
**So that** I can decide without opening the app

**Acceptance Criteria:**
- [ ] Notification title: "{Session} needs approval"
- [ ] Body shows: tool name, key details (filename, command)
- [ ] Expandable to show more context
- [ ] Syntax highlighting for code (if supported)
- [ ] Truncation with "..." for long content

---

## Technical Approach

### Architecture

```
┌─────────────────────────────────────────────────────────┐
│                Push Notification System                  │
├─────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐ │
│  │ Web Push    │  │ Native Push │  │ Action Handler  │ │
│  │ (PWA)       │  │ (Capacitor) │  │                 │ │
│  │             │  │             │  │ - approve       │ │
│  │ - vapid     │  │ - FCM       │  │ - deny          │ │
│  │ - sw.js     │  │ - APNs      │  │ - always_allow  │ │
│  └─────────────┘  └─────────────┘  └─────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

### Notification Payload Structure

```typescript
interface ApprovalNotificationPayload {
  // Core identification
  sessionId: string;
  approvalId: string;
  requestId: string;

  // Display content
  title: string;
  body: string;
  expandedBody?: string;

  // Tool context
  tool: string;
  details: {
    type: 'file_edit' | 'file_read' | 'bash' | 'other';
    path?: string;
    command?: string;
    preview?: string;
  };

  // Action configuration
  actions: NotificationAction[];

  // Metadata
  timestamp: string;
  priority: 'high' | 'normal';
}

interface NotificationAction {
  action: 'approve' | 'deny' | 'view' | 'always_allow';
  title: string;
  icon?: string;
}
```

### Web Push Service Worker

```typescript
// sw.js - Service Worker notification handler

self.addEventListener('notificationclick', async (event) => {
  const { action, notification } = event;
  const data = notification.data as ApprovalNotificationPayload;

  event.waitUntil((async () => {
    switch (action) {
      case 'approve':
        await handleApprovalAction(data, true);
        notification.close();
        // Update notification to show success
        await showConfirmation('Approved', data);
        break;

      case 'deny':
        await handleApprovalAction(data, false);
        notification.close();
        await showConfirmation('Denied', data);
        break;

      case 'always_allow':
        await handleApprovalAction(data, true);
        await createApprovalRule(data);
        notification.close();
        await showConfirmation('Approved & Rule Created', data);
        break;

      case 'view':
      default:
        // Open app to approval detail
        const url = `/session/${data.sessionId}?approval=${data.approvalId}`;
        await clients.openWindow(url);
        notification.close();
        break;
    }
  })());
});

async function handleApprovalAction(data: ApprovalNotificationPayload, approve: boolean) {
  const response = await fetch(`/api/approvals/${data.approvalId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ approved: approve, source: 'notification' }),
  });

  if (!response.ok) {
    throw new Error('Approval failed');
  }
}
```

### Native (Capacitor) Implementation

```typescript
// iOS: UNNotificationAction configuration
const notificationActions = [
  {
    id: 'approve',
    title: 'Approve',
    options: {
      foreground: false, // Don't open app
    },
  },
  {
    id: 'deny',
    title: 'Deny',
    options: {
      foreground: false,
      destructive: true, // Red text on iOS
    },
  },
  {
    id: 'view',
    title: 'View Details',
    options: {
      foreground: true, // Opens app
    },
  },
];

// Register notification category
PushNotifications.createChannel({
  id: 'approvals',
  name: 'Approval Requests',
  importance: 5, // Max importance
  sound: 'approval.wav',
  actions: notificationActions,
});
```

### API Endpoints

```
POST /api/approvals/:approvalId           # Submit approval decision
  Body: { approved: boolean, source: 'notification' | 'app', createRule?: boolean }

GET  /api/approvals/:approvalId           # Get approval details
POST /api/approvals/:approvalId/rule      # Create rule from approval
```

### Deep Linking

```typescript
// URL scheme: yepanywhere://session/{sessionId}?approval={approvalId}

// Universal links config (apple-app-site-association)
{
  "applinks": {
    "apps": [],
    "details": [{
      "appID": "TEAM_ID.com.yepanywhere.app",
      "paths": ["/session/*"]
    }]
  }
}

// Android App Links (assetlinks.json)
{
  "relation": ["delegate_permission/common.handle_all_urls"],
  "target": {
    "namespace": "android_app",
    "package_name": "com.yepanywhere.app",
    "sha256_cert_fingerprints": ["..."]
  }
}
```

---

## Dependencies

| Dependency | Type | Status | Notes |
|------------|------|--------|-------|
| Push notification system | Internal | Exists | Extend with actions |
| Service worker | Internal | Exists | Add action handlers |
| Approval API | Internal | Exists | Add notification source |
| Deep linking | Internal | New | For "View Details" |
| Native push (Capacitor) | External | New | For lock screen actions |

---

## Subagent Assignments

### Backend Agent
**Expertise:** Node.js, TypeScript, push notifications, API design
**Tasks:**
1. Extend approval notification payload with action data
2. Create approval submission endpoint with source tracking
3. Implement rule creation from notification context
4. Add notification action analytics
5. Handle offline approval queuing

**Deliverables:**
- Extended push notification service
- Approval action API endpoints
- Action analytics tracking

### PWA Agent
**Expertise:** Service workers, Web Push API, PWA best practices
**Tasks:**
1. Implement notification action handlers in service worker
2. Create notification update/replacement logic
3. Handle approval API calls from service worker
4. Implement offline queuing with sync
5. Test across browsers (Chrome, Safari, Firefox)

**Deliverables:**
- Updated service worker with action handlers
- Browser compatibility report
- Offline handling implementation

### Native Agent
**Expertise:** Capacitor, iOS UNNotification, Android notifications
**Tasks:**
1. Configure notification categories with actions
2. Implement action handlers in native layer
3. Set up deep linking for "View Details"
4. Test lock screen interactions
5. Handle authentication for background actions

**Deliverables:**
- Native notification configuration
- Deep link handling
- Lock screen action testing

### QA Agent
**Expertise:** Mobile testing, notification testing, edge cases
**Tasks:**
1. Test notification actions on iOS (locked/unlocked)
2. Test notification actions on Android (all states)
3. Test PWA notification actions
4. Verify approval state sync
5. Test "Always Allow" rule creation

**Deliverables:**
- Cross-platform test report
- Edge case documentation
- Bug reports

---

## Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Notification approval rate | 60% of approvals from notifications | Analytics source tracking |
| Time to approval | <5 seconds | Timestamp comparison |
| Action success rate | >99% | Error tracking |
| "Always Allow" adoption | 20% of notification approvals | Action tracking |

---

## Risks & Mitigations

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| iOS restricts background actions | High | Medium | Test thoroughly, document limitations |
| Network failure during action | High | Medium | Queue and retry with sync |
| Accidental approvals | High | Low | Require deliberate tap, confirm dangerous ops |
| Notification dismissed before action | Medium | Medium | Keep approval pending, re-notify after timeout |

---

## Platform Limitations

### iOS (PWA)
- Actions may not work without opening app
- Limited to 4 action buttons
- No lock screen actions in Safari PWA

### iOS (Native)
- Full action support with UNNotificationAction
- Can work without unlocking (certain actions)
- Requires notification permission

### Android (PWA)
- Actions work in background
- Up to 3 action buttons
- Requires notification permission

### Android (Native)
- Full action support
- Direct reply supported
- Works from lock screen

---

## Open Questions

1. Should we require authentication for notification approvals?
2. How do we handle expired approvals when user finally acts?
3. Should dangerous operations have a different flow?
4. Do we need notification sound customization?

---

## References

- Web Push Actions: https://developer.mozilla.org/en-US/docs/Web/API/ServiceWorkerRegistration/showNotification
- iOS Notification Actions: https://developer.apple.com/documentation/usernotifications/unnotificationaction
- Android Notification Actions: https://developer.android.com/training/notify-user/build-notification

# Epic: Live Activities / Dynamic Island

**Epic ID:** Q2-006
**Priority:** P1
**Quarter:** Q2 2026
**Estimated Effort:** 2-3 weeks
**Status:** Planning

---

## Problem Statement

iOS users expect real-time status on their lock screen and Dynamic Island for ongoing activities. Currently, users must open the app to check agent progress.

**Target Outcome:** Native iOS Live Activities showing session progress, pending approvals, and cost counters.

---

## User Stories

### US-001: Session progress Live Activity
**As an** iPhone user with an active agent session
**I want to** see progress on my lock screen
**So that** I know what's happening without unlocking

**Acceptance Criteria:**
- [ ] Live Activity shows: session name, current status, message count
- [ ] Updates in real-time via push
- [ ] Compact and expanded views
- [ ] Tap opens session in app
- [ ] Ends when session completes or user dismisses

### US-002: Dynamic Island integration
**As an** iPhone 14+ user
**I want to** see agent status in Dynamic Island
**So that** I have glanceable progress

**Acceptance Criteria:**
- [ ] Compact view: status icon + session name
- [ ] Expanded view: progress details, pending count
- [ ] Minimal view: just status icon
- [ ] Long-press for quick actions (if approved by Apple)
- [ ] Smooth animations between states

### US-003: Approval indicator
**As a** user with a pending approval
**I want to** the Live Activity to show urgent status
**So that** I know immediate action is needed

**Acceptance Criteria:**
- [ ] Live Activity changes color/icon when approval pending
- [ ] Shows what's waiting for approval
- [ ] Tap goes directly to approval screen
- [ ] Alert style for critical approvals

### US-004: Cost counter
**As a** cost-conscious user
**I want to** see running cost in Live Activity
**So that** I can monitor spending in real-time

**Acceptance Criteria:**
- [ ] Optional cost display in expanded view
- [ ] Updates with each API call
- [ ] Color changes near budget threshold
- [ ] Can be hidden in settings

---

## Technical Approach

### Architecture (iOS Native)

```swift
// ActivityAttributes define the static and dynamic data
struct SessionActivityAttributes: ActivityAttributes {
    public struct ContentState: Codable, Hashable {
        var status: SessionStatus
        var messageCount: Int
        var pendingApprovals: Int
        var currentCost: Double
        var lastUpdate: Date
    }

    var sessionId: String
    var sessionTitle: String
    var projectName: String
}

// Start Live Activity
func startSessionActivity(session: Session) async throws {
    let attributes = SessionActivityAttributes(
        sessionId: session.id,
        sessionTitle: session.title,
        projectName: session.projectName
    )

    let initialState = SessionActivityAttributes.ContentState(
        status: .running,
        messageCount: 0,
        pendingApprovals: 0,
        currentCost: 0,
        lastUpdate: Date()
    )

    let activity = try Activity.request(
        attributes: attributes,
        content: .init(state: initialState, staleDate: nil),
        pushType: .token
    )

    // Store push token for updates
    for await token in activity.pushTokenUpdates {
        await sendPushTokenToServer(token, sessionId: session.id)
    }
}
```

### Push Update Integration

```typescript
// Server sends updates via APNs
interface LiveActivityUpdate {
  sessionId: string;
  state: {
    status: 'running' | 'waiting' | 'idle' | 'error';
    messageCount: number;
    pendingApprovals: number;
    currentCost: number;
  };
}

async function sendLiveActivityUpdate(
  pushToken: string,
  update: LiveActivityUpdate
): Promise<void> {
  await apns.send({
    pushToken,
    payload: {
      'aps': {
        'timestamp': Date.now() / 1000,
        'event': 'update',
        'content-state': update.state,
      },
    },
  });
}
```

### SwiftUI Views

```swift
struct SessionLiveActivityView: View {
    let context: ActivityViewContext<SessionActivityAttributes>

    var body: some View {
        HStack {
            // Status icon
            StatusIcon(status: context.state.status)

            VStack(alignment: .leading) {
                Text(context.attributes.sessionTitle)
                    .font(.headline)
                Text(statusText)
                    .font(.caption)
                    .foregroundColor(.secondary)
            }

            Spacer()

            if context.state.pendingApprovals > 0 {
                ApprovalBadge(count: context.state.pendingApprovals)
            }
        }
        .padding()
    }
}

struct SessionDynamicIslandView: View {
    let context: ActivityViewContext<SessionActivityAttributes>

    var body: some View {
        DynamicIslandExpandedContent(context: context)
    }
}
```

---

## Dependencies

| Dependency | Type | Status | Notes |
|------------|------|--------|-------|
| Capacitor/Native app | Internal | Q1 Widgets | Requires native shell |
| APNs integration | External | Exists | For push updates |
| iOS 16.1+ | Platform | Required | Live Activities minimum |

---

## Subagent Assignments

### iOS Agent
**Expertise:** Swift, SwiftUI, ActivityKit
**Tasks:**
1. Implement ActivityAttributes and ContentState
2. Create Live Activity UI (compact, expanded, minimal)
3. Build Dynamic Island views
4. Handle push token registration
5. Implement activity lifecycle management

### Backend Agent
**Expertise:** Node.js, APNs, push notifications
**Tasks:**
1. Store Live Activity push tokens
2. Send updates via APNs when session state changes
3. Handle token refresh
4. End activities on session completion

---

## Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Live Activity adoption | 40% of iOS users | Analytics |
| Update latency | <2 seconds | Push timing |
| Activity engagement | 2+ interactions/session | Tap tracking |

---

## References

- ActivityKit: https://developer.apple.com/documentation/activitykit
- Dynamic Island: https://developer.apple.com/design/human-interface-guidelines/live-activities

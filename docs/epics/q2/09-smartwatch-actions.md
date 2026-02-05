# Epic: Smartwatch Quick Actions

**Epic ID:** Q2-009
**Priority:** P2
**Quarter:** Q2 2026
**Estimated Effort:** 3-4 weeks
**Status:** Planning

---

## Problem Statement

Sometimes users can't or don't want to pull out their phone to approve an agent operation. Smartwatch access allows approvals from the wrist in seconds.

**Target Outcome:** Apple Watch and Wear OS companion apps with approve/deny actions and session status.

---

## User Stories

### US-001: Approval notifications on watch
- [ ] Notification with approve/deny buttons
- [ ] Shows operation summary
- [ ] Haptic feedback on receive
- [ ] Works without phone nearby (LTE watch)

### US-002: Session status complications
- [ ] Apple Watch complication showing active count
- [ ] Wear OS tile with session status
- [ ] Tap opens watch app

### US-003: Watch app for quick actions
- [ ] List of sessions needing attention
- [ ] Approve/deny from list
- [ ] Basic session status view
- [ ] Voice reply for simple responses

---

## Technical Approach

### Apple Watch (WatchKit + SwiftUI)

```swift
struct ContentView: View {
    @StateObject var viewModel = WatchViewModel()

    var body: some View {
        NavigationView {
            List(viewModel.sessions) { session in
                SessionRow(session: session)
            }
            .navigationTitle("Yep Anywhere")
        }
    }
}

// Complication
struct SessionComplication: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(
            kind: "SessionStatus",
            provider: SessionComplicationProvider()
        ) { entry in
            ComplicationView(pendingCount: entry.pendingCount)
        }
        .supportedFamilies([.circularSmall, .modularSmall])
    }
}
```

### Wear OS (Compose)

```kotlin
@Composable
fun WearApp() {
    val sessions by viewModel.sessions.collectAsState()

    ScalingLazyColumn {
        items(sessions) { session ->
            SessionChip(
                session = session,
                onApprove = { viewModel.approve(session.id) },
                onDeny = { viewModel.deny(session.id) }
            )
        }
    }
}
```

---

## Dependencies

| Dependency | Type | Notes |
|------------|------|-------|
| Native iOS app | Q1 | Required for Watch extension |
| Native Android app | Q1 | Required for Wear companion |
| Watch Connectivity | Platform | For data sync |

---

## Subagent Assignments

### iOS Watch Agent
- WatchKit extension setup
- SwiftUI watch app UI
- Complication implementation
- Watch Connectivity integration

### Android Wear Agent
- Wear OS app module
- Compose UI for watch
- Tile and complication
- Data Layer API integration

---

## Success Metrics

| Metric | Target |
|--------|--------|
| Watch app installs | 15% of native app users |
| Watch approvals | 10% of total approvals |

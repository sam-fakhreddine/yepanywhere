# Epic: Home Screen Widgets

**Epic ID:** Q1-006
**Priority:** P1
**Quarter:** Q1 2026
**Estimated Effort:** 2-3 weeks
**Status:** Planning

---

## Problem Statement

Users must open the Yep Anywhere app to check session status, pending approvals, or daily costs. This adds friction for frequent checkers who just want a quick glance.

Home screen widgets would provide:
- Glanceable session status without app launch
- Quick approval count visibility
- Cost tracking at a glance
- One-tap access to pending items

**Target Outcome:** Native-quality home screen widgets for iOS and Android that surface key information.

---

## User Stories

### US-001: Session status widget
**As a** user who wants quick status updates
**I want to** a widget showing active sessions
**So that** I can see what my agents are doing at a glance

**Acceptance Criteria:**
- [ ] Small widget (2x2) shows count of active sessions
- [ ] Medium widget (4x2) shows list of active sessions with status
- [ ] Status indicators: running, waiting for approval, idle, error
- [ ] Tap on session opens app to that session
- [ ] Widget updates at least every 5 minutes
- [ ] Background refresh when app is running

### US-002: Quick actions widget
**As a** user with pending approvals
**I want to** a widget showing pending count with quick approve
**So that** I can handle simple approvals without opening app

**Acceptance Criteria:**
- [ ] Badge showing pending approval count
- [ ] List of pending approvals (up to 3)
- [ ] "Approve All" button for safe operations
- [ ] Tap item opens approval detail in app
- [ ] Count updates in real-time when possible
- [ ] Visual indicator for urgent approvals

### US-003: Cost summary widget
**As a** cost-conscious user
**I want to** a widget showing today's/week's spending
**So that** I can monitor costs without opening app

**Acceptance Criteria:**
- [ ] Shows today's total cost
- [ ] Shows weekly cost trend (mini sparkline)
- [ ] Progress bar toward monthly budget
- [ ] Color changes near budget limit (yellow/red)
- [ ] Tap opens cost dashboard

### US-004: Widget configuration
**As a** user customizing my home screen
**I want to** configure what widgets show
**So that** I see the most relevant information

**Acceptance Criteria:**
- [ ] Select which projects to show in session widget
- [ ] Choose cost timeframe (today, week, month)
- [ ] Toggle between session count and cost in small widget
- [ ] Configuration accessible from widget and app settings
- [ ] Configurations sync across devices via app

---

## Technical Approach

### Platform Strategy

**PWA Limitations:**
- PWAs cannot create true native widgets
- No iOS widget support for PWAs
- Limited Android widget support via experimental APIs

**Recommended Approach:**
1. **Native Wrapper App** (Capacitor/Expo)
   - Build thin native shell around PWA
   - Implement widgets natively
   - Share core logic with PWA

2. **Alternative: iOS Shortcuts + Android Quick Settings**
   - iOS: Create Siri Shortcuts for status queries
   - Android: Quick Settings tiles for pending count
   - Lower effort but less functionality

### Architecture (Capacitor Approach)

```
┌─────────────────────────────────────────────────────────┐
│                     Native Layer                         │
├─────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐ │
│  │ iOS Widget  │  │ Android     │  │ Shared Bridge   │ │
│  │ Extension   │  │ Widget      │  │                 │ │
│  │             │  │ Provider    │  │ - fetch data    │ │
│  │ - SwiftUI   │  │ - Compose   │  │ - auth token    │ │
│  │ - WidgetKit │  │ - Glance    │  │ - server URL    │ │
│  └─────────────┘  └─────────────┘  └─────────────────┘ │
└─────────────────────────────────────────────────────────┘
              │                  │
              ▼                  ▼
┌─────────────────────────────────────────────────────────┐
│                    Yep Anywhere Server                   │
│                                                          │
│  GET /api/widget/status    → { sessions, pending }      │
│  GET /api/widget/cost      → { today, week, budget }    │
│  POST /api/widget/approve  → { success, remaining }     │
└─────────────────────────────────────────────────────────┘
```

### Widget API Endpoints

```typescript
// Lightweight endpoints optimized for widgets
// Minimal data, fast response, low bandwidth

interface WidgetStatusResponse {
  sessions: Array<{
    id: string;
    title: string;
    status: 'running' | 'waiting' | 'idle' | 'error';
    pendingCount: number;
  }>;
  totalPending: number;
  lastUpdated: string;
}

interface WidgetCostResponse {
  todayCostUsd: number;
  weekCostUsd: number;
  monthCostUsd: number;
  budgetUsd: number | null;
  budgetPercent: number | null;
  trend: number[]; // Last 7 days
}

interface WidgetApproveRequest {
  sessionId: string;
  approvalId: string;
}
```

### iOS WidgetKit Implementation (Swift)

```swift
struct SessionStatusWidget: Widget {
    let kind: String = "SessionStatus"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: SessionStatusProvider()) { entry in
            SessionStatusView(entry: entry)
        }
        .configurationDisplayName("Sessions")
        .description("Active agent sessions")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}

struct SessionStatusEntry: TimelineEntry {
    let date: Date
    let sessions: [WidgetSession]
    let pendingCount: Int
}

struct SessionStatusProvider: TimelineProvider {
    func getTimeline(in context: Context, completion: @escaping (Timeline<SessionStatusEntry>) -> ()) {
        Task {
            let data = await WidgetDataService.fetchStatus()
            let entry = SessionStatusEntry(date: Date(), sessions: data.sessions, pendingCount: data.totalPending)
            let nextUpdate = Calendar.current.date(byAdding: .minute, value: 5, to: Date())!
            let timeline = Timeline(entries: [entry], policy: .after(nextUpdate))
            completion(timeline)
        }
    }
}
```

### Android Glance Implementation (Kotlin)

```kotlin
class SessionStatusWidget : GlanceAppWidget() {
    override suspend fun provideGlance(context: Context, id: GlanceId) {
        val data = WidgetDataService.fetchStatus()

        provideContent {
            Column(
                modifier = GlanceModifier.fillMaxSize().padding(16.dp)
            ) {
                Text(
                    text = "${data.sessions.size} Active Sessions",
                    style = TextStyle(fontWeight = FontWeight.Bold)
                )
                data.sessions.take(3).forEach { session ->
                    SessionRow(session)
                }
                if (data.totalPending > 0) {
                    Text(
                        text = "${data.totalPending} pending approvals",
                        style = TextStyle(color = ColorProvider(Color.Orange))
                    )
                }
            }
        }
    }
}
```

### Capacitor Plugin Structure

```typescript
// capacitor-plugin-yep-widgets

export interface YepWidgetsPlugin {
  // Called from native to fetch widget data
  getWidgetStatus(): Promise<WidgetStatusResponse>;
  getWidgetCost(): Promise<WidgetCostResponse>;

  // Configure widget refresh
  setRefreshInterval(options: { minutes: number }): Promise<void>;

  // Trigger widget update from app
  updateWidgets(): Promise<void>;
}
```

---

## Dependencies

| Dependency | Type | Status | Notes |
|------------|------|--------|-------|
| Capacitor/Expo | External | New | Native wrapper |
| WidgetKit (iOS) | Platform | Available | iOS 14+ |
| Glance (Android) | Platform | Available | Requires setup |
| Widget API endpoints | Internal | New | Server implementation |
| Auth token sharing | Internal | New | For native → server auth |

---

## Subagent Assignments

### Backend Agent
**Expertise:** Node.js, TypeScript, API optimization
**Tasks:**
1. Create lightweight widget API endpoints
2. Optimize responses for minimal payload
3. Implement widget-specific caching
4. Add widget authentication (token-based)
5. Rate limiting for widget refresh

**Deliverables:**
- `packages/server/src/routes/widget.ts`
- Widget API documentation
- Performance benchmarks

### iOS Agent
**Expertise:** Swift, SwiftUI, WidgetKit, iOS development
**Tasks:**
1. Create Widget Extension target
2. Implement SessionStatusWidget
3. Implement CostSummaryWidget
4. Implement QuickActionsWidget
5. Handle widget configuration
6. Implement background refresh

**Deliverables:**
- `ios/YepAnywhere Widget/` extension
- Widget screenshots for all sizes
- App Store widget preview

### Android Agent
**Expertise:** Kotlin, Jetpack Compose, Glance, Android development
**Tasks:**
1. Create widget provider classes
2. Implement SessionStatusWidget
3. Implement CostSummaryWidget
4. Implement QuickActionsWidget
5. Handle widget configuration
6. Implement background refresh with WorkManager

**Deliverables:**
- `android/app/src/main/java/.../widgets/`
- Widget preview images
- Play Store widget metadata

### Mobile Bridge Agent
**Expertise:** Capacitor, native-web communication
**Tasks:**
1. Create Capacitor plugin for widget communication
2. Implement secure token storage
3. Handle app ↔ widget data sync
4. Create configuration UI in app

**Deliverables:**
- `capacitor-plugin-yep-widgets/`
- Integration with main app
- Configuration settings page

---

## Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Widget installs | 30% of mobile users | App analytics |
| Widget interactions/day | 2+ per active user | Widget analytics |
| App open from widget | 40% of widget users | Deep link tracking |
| Widget data freshness | <5 min stale | Server logs |

---

## Risks & Mitigations

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| PWA can't do widgets | High | Certain | Build native wrapper with Capacitor |
| Complex native development | High | High | Start with single widget, iterate |
| Battery drain from refresh | Medium | Medium | Respect system background limits |
| Auth token security | High | Low | Use secure storage, short-lived tokens |

---

## Scope Reduction Options

If full native widgets prove too complex:

1. **Phase 1:** iOS Shortcuts + Android Quick Settings only
2. **Phase 2:** Simple count widgets (pending approvals, active sessions)
3. **Phase 3:** Full interactive widgets

---

## Open Questions

1. Do we ship as separate native app or enhance existing PWA?
2. How do we handle users without native app (PWA only)?
3. Should widget actions require Face ID/Touch ID?
4. What's the minimum iOS/Android version support?

---

## References

- WidgetKit: https://developer.apple.com/documentation/widgetkit
- Jetpack Glance: https://developer.android.com/jetpack/compose/glance
- Capacitor: https://capacitorjs.com/

# Yep Anywhere Feature Epics

This directory contains detailed epic descriptions for all features in the 2026 product roadmap. Each epic is designed to serve as an agentic prompt for an orchestrator agent acting as PO/Tech Lead.

## Orchestrator Usage Guide

Each epic contains:
- **Problem Statement** - Why this feature matters
- **User Stories** - Acceptance criteria for each capability
- **Technical Approach** - Architecture, data models, implementation details
- **Dependencies** - What must exist before this feature
- **Subagent Assignments** - Expert agents to assign work to
- **Success Metrics** - How to measure completion
- **Risks & Mitigations** - What could go wrong

### How to Use These Epics

1. **Read the epic thoroughly** to understand scope and requirements
2. **Check dependencies** to ensure prerequisite features exist
3. **Assign subagents** based on the expertise needed
4. **Break down into tasks** using the user stories as guide
5. **Monitor progress** against success metrics
6. **Handle risks** proactively with mitigations

---

## Epic Index

### Q1 2026: Core Experience
*Theme: Reduce supervision burden and polish mobile interactions*

| ID | Epic | Priority | Effort | File |
|----|------|----------|--------|------|
| Q1-001 | [Approval Rule Engine](q1/01-approval-rule-engine.md) | P0 | 2-3 weeks | Auto-approve safe operations, tool-specific rules |
| Q1-002 | [Accessibility Suite](q1/02-accessibility-suite.md) | P0 | 2-3 weeks | Screen reader support, high contrast, keyboard nav |
| Q1-003 | [Swipe Actions](q1/03-swipe-actions.md) | P0 | 1 week | Swipe to star/archive/delete sessions |
| Q1-004 | [Cost Tracking](q1/04-cost-tracking.md) | P0 | 2 weeks | Per-session costs, budgets, alerts |
| Q1-005 | [Pull-to-Refresh](q1/05-pull-to-refresh.md) | P1 | 3 days | Native-feeling refresh with haptics |
| Q1-006 | [Home Screen Widgets](q1/06-home-screen-widgets.md) | P1 | 2-3 weeks | iOS/Android widgets for status, approvals, costs |

### Q2 2026: Mobile Power
*Theme: Make mobile the primary interface for agent supervision*

| ID | Epic | Priority | Effort | File |
|----|------|----------|--------|------|
| Q2-001 | [Notification Approval Actions](q2/01-notification-approval-actions.md) | P0 | 2 weeks | Approve/deny from notifications |
| Q2-002 | [Agent Retry & Escalation](q2/02-agent-retry-escalation.md) | P0 | 2-3 weeks | Auto-retry, escalate to better models |
| Q2-003 | [Session Checkpoints](q2/03-session-checkpoints.md) | P0 | 4-5 weeks | Auto-checkpoint, one-click rollback |
| Q2-004 | [Offline Session Cache](q2/04-offline-session-cache.md) | P1 | 2 weeks | IndexedDB cache, background sync |
| Q2-005 | [Session Templates](q2/05-session-templates.md) | P1 | 3 weeks | Reusable configurations, built-in presets |
| Q2-006 | [Live Activities](q2/06-live-activities.md) | P1 | 2-3 weeks | iOS Dynamic Island, lock screen status |
| Q2-007 | [Prompt Snippets](q2/07-prompt-snippets.md) | P1 | 1-2 weeks | Reusable prompts with variables |
| Q2-008 | [Floating Mini-Player](q2/08-floating-mini-player.md) | P2 | 2 weeks | Collapsible session status overlay |
| Q2-009 | [Smartwatch Actions](q2/09-smartwatch-actions.md) | P2 | 3-4 weeks | Apple Watch, Wear OS companion apps |

### Q3 2026: Automation & Workflows
*Theme: Unlock sophisticated agent patterns for power users*

| ID | Epic | Priority | Effort | File |
|----|------|----------|--------|------|
| Q3-001 | [Multi-Agent Workflows](q3/01-multi-agent-workflows.md) | P0 | 6-8 weeks | Visual DAG builder, artifact passing |
| Q3-002 | [Session Annotations](q3/02-session-annotations.md) | P0 | 2-3 weeks | Inline notes, AI handoff summaries |
| Q3-003 | [Scheduled Tasks](q3/03-scheduled-tasks.md) | P1 | 3 weeks | Cron scheduling, event triggers |
| Q3-004 | [Simple Sharing](q3/04-simple-session-sharing.md) | P1 | 3 weeks | Shareable links without accounts |
| Q3-005 | [Session Export](q3/05-session-export.md) | P1 | 1-2 weeks | Export to Markdown, PDF, HTML |
| Q3-006 | [Context Injection](q3/06-context-injection-rules.md) | P1 | 2-3 weeks | Auto-inject README, git info, logs |
| Q3-007 | [Project Cost Attribution](q3/07-project-cost-attribution.md) | P1 | 2 weeks | Per-project budgets, invoice export |
| Q3-008 | [Usage Analytics](q3/08-usage-analytics.md) | P2 | 2 weeks | Session trends, tool patterns |
| Q3-009 | [Local Model Gateway](q3/09-local-model-gateway.md) | P2 | 3-4 weeks | Ollama, LM Studio integration |
| Q3-010 | [Session Watch](q3/10-session-watch.md) | P2 | 2-3 weeks | Real-time observation, suggestions |

### Q4 2026: Polish & Expansion
*Theme: Refine the experience and prepare for growth*

| ID | Epic | Priority | Effort | File |
|----|------|----------|--------|------|
| Q4-001 | [Voice Input](q4/01-voice-input.md) | P1 | 3 weeks | Voice-to-text prompts |
| Q4-002 | [Context-Aware Gestures](q4/02-context-aware-gestures.md) | P1 | 2-3 weeks | Adaptive gestures, customization |
| Q4-003 | [Session Branching](q4/03-session-branching.md) | P2 | 4 weeks | Branch from checkpoint, compare outcomes |
| Q4-004 | [Project Insights](q4/04-project-insights.md) | P2 | 3 weeks | AI-powered workflow recommendations |
| Q4-005 | [Session Analytics](q4/05-session-analytics.md) | P2 | 2-3 weeks | Deep dive into agent effectiveness |

---

## Subagent Expertise Guide

### Backend Agents
- **Node.js/TypeScript** - API development, data modeling
- **Data Engineering** - Analytics, aggregation, storage optimization
- **Security** - Authentication, encryption, audit logging
- **Infrastructure** - Push notifications, WebSocket, caching

### Frontend Agents
- **React/TypeScript** - UI components, state management
- **Mobile UX** - Touch gestures, PWA optimization
- **Accessibility** - WCAG compliance, screen reader support
- **Data Visualization** - Charts, dashboards, analytics

### Native Agents
- **iOS (Swift)** - Widgets, Live Activities, Watch app
- **Android (Kotlin)** - Widgets, Wear OS, Quick Settings
- **Cross-platform** - Capacitor integration, native bridges

### QA Agents
- **Test Automation** - E2E tests, integration tests
- **Mobile Testing** - Cross-browser, device testing
- **Security Testing** - Penetration testing, vulnerability assessment
- **Performance Testing** - Load testing, profiling

---

## Dependency Graph

```
Q1 Features (Foundation)
├── Approval Rule Engine ─────────────────────────────────────┐
├── Cost Tracking ──────────────────────────────────────────┐ │
├── Accessibility Suite                                      │ │
├── Swipe Actions                                           │ │
├── Pull-to-Refresh                                         │ │
└── Home Screen Widgets (requires native app)               │ │
                                                            │ │
Q2 Features (Mobile Power)                                  │ │
├── Notification Actions ◄──────────────────────────────────┘ │
├── Agent Retry & Escalation                                  │
├── Session Checkpoints ──────────────────────────────────────┤
├── Offline Cache                                             │
├── Session Templates ◄───────────────────────────────────────┘
├── Live Activities (requires native app)
├── Prompt Snippets
├── Floating Mini-Player
└── Smartwatch (requires native app)

Q3 Features (Automation)
├── Multi-Agent Workflows ◄── Session Templates, Checkpoints
├── Session Annotations
├── Scheduled Tasks ◄──────── Session Templates
├── Simple Sharing
├── Session Export
├── Context Injection
├── Project Cost Attribution ◄── Cost Tracking
├── Usage Analytics ◄───────── Cost Tracking
├── Local Model Gateway
└── Session Watch

Q4 Features (Polish)
├── Voice Input
├── Context-Aware Gestures
├── Session Branching ◄──────── Checkpoints
├── Project Insights ◄────────── Analytics, Approval Rules
└── Session Analytics ◄───────── Cost Tracking
```

---

## Implementation Order Recommendations

### Phase 1: Foundation (Q1)
1. Approval Rule Engine (unblocks Notification Actions)
2. Cost Tracking (unblocks Budget features)
3. Accessibility Suite (parallel)
4. Swipe Actions (parallel)

### Phase 2: Mobile Core (Q2)
1. Session Checkpoints (high value, complex)
2. Notification Actions (unblocks mobile-first)
3. Agent Retry (improves reliability)
4. Session Templates (unblocks Workflows)

### Phase 3: Collaboration (Q3)
1. Multi-Agent Workflows (flagship feature)
2. Session Annotations (enables team use)
3. Scheduled Tasks (automation unlock)

### Phase 4: Refinement (Q4)
1. Voice Input (accessibility, convenience)
2. Session Analytics (optimization unlock)
3. Project Insights (based on analytics)

---

## Related Documents

- [Product Roadmap](../PRODUCT_ROADMAP.md) - High-level feature planning
- [User Research](../docs/research/user-personas-and-research.md) - Target personas and market analysis
- [Technical Architecture](../docs/project/) - System design documentation

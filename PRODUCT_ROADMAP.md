# Yep Anywhere Product Roadmap 2026
**Focus: Solo Developers & Small Teams**

---

## Executive Summary

This roadmap prioritizes **individual productivity** and **small team workflows**. Enterprise features (RBAC, SSO, compliance) are deferred to a future phase. The goal is to make Yep Anywhere the best mobile-first AI agent supervisor for developers who work solo or in teams of 2-5.

**Key Strategic Themes:**
1. **Intelligent Supervision** - Reduce cognitive load through smart automation
2. **Mobile-First Experience** - Optimize for on-the-go supervision
3. **Power User Productivity** - Templates, workflows, and automation
4. **Lightweight Collaboration** - Simple sharing for small teams

---

## Q1 2026: Core Experience
**Theme:** *Reduce supervision burden and polish mobile interactions*

### Approval Rule Engine (P0)
**Why First:** Highest-leverage feature. Users are overwhelmed by approval requests. Auto-approving safe patterns dramatically reduces interruptions.

**Effort:** Medium (2-3 weeks)
**Impact:** High - reduces approval fatigue by 60-80%

**Key Capabilities:**
- Pre-approve read-only operations (Read, Grep, Glob)
- Tool-specific rules (e.g., "auto-approve Edit for .md files")
- Project-level rule templates
- Quick "always allow this" from approval prompt

---

### Swipe Actions on Session List (P0)
**Why First:** Quick win for daily workflows. Archive, star, delete without tapping into menus.

**Effort:** Small (1 week)
**Impact:** Medium - quality-of-life for power users

**Gesture Patterns:**
- Swipe right: Star/Unstar
- Swipe left: Archive
- Long swipe left: Delete (with confirmation)

---

### Cost Tracking and Budget Alerts (P0)
**Why First:** Critical for trust. Solo devs and small teams need visibility into API costs.

**Effort:** Medium (2 weeks)
**Impact:** High - prevents bill shock

**Features:**
- Per-session cost tracking (token usage × pricing)
- Monthly spending dashboard
- Budget alerts (configurable thresholds)
- Export to CSV

---

### Pull-to-Refresh with Haptic Feedback (P1)
**Why Q1:** Natural mobile pattern, small effort, good polish.

**Effort:** Small (3 days)
**Impact:** Small - mobile convention adherence

---

## Q2 2026: Mobile Power
**Theme:** *Make mobile the primary interface for agent supervision*

### Quick Approval Actions from Notification (P0)
**Why Q2:** Approve/deny without unlocking phone. Core mobile value proposition.

**Effort:** Medium (2 weeks)
**Impact:** High - reduces supervision latency to seconds

**Notification Actions:**
- "Approve" (with "always allow" option)
- "Deny"
- "View Details" (opens app)
- Works with iOS/Android action buttons

---

### Offline Session History Cache (P1)
**Why Q2:** Mobile resilience for commuters, travelers, spotty connectivity.

**Effort:** Medium (2 weeks)
**Impact:** Medium - true mobile-first experience

**Implementation:**
- IndexedDB cache of session metadata
- Last 100 messages per session
- Read-only mode when offline
- Background sync when reconnected

---

### Session Templates and Presets (P1)
**Why Q2:** Power users repeat similar configurations. Templates save setup time.

**Effort:** Medium (3 weeks)
**Impact:** High - reduces session setup time by 80%

**Template Types:**
- Tool configurations (enabled tools, model selection)
- Approval rule bundles
- Initial prompt templates
- Project-specific defaults

**Examples:**
- "Security Audit" - Enable grep/read/bash, require approval for edits
- "Code Review" - Read-only mode with comment generation
- "Documentation Writer" - Auto-approve markdown edits

---

### Floating Mini-Player (P2)
**Why Q2:** See agent progress while navigating elsewhere in app.

**Effort:** Medium (2 weeks)
**Impact:** Medium - quality-of-life for active supervision

**Design:**
- Collapsible floating card with latest message
- Tap to expand, swipe to dismiss
- Shows typing indicator and tool use

---

## Q3 2026: Automation & Workflows
**Theme:** *Unlock sophisticated agent patterns for power users*

### Multi-Agent Workflow Orchestration (P0)
**Why Q3:** Chain agents together for complex tasks (research → code → test).

**Effort:** Large (6-8 weeks)
**Impact:** High - unlocks advanced automation

**Capabilities:**
- Visual workflow builder (DAG of agent tasks)
- Pass artifacts between agents (files, summaries)
- Conditional branching based on outcomes
- Human approval gates between stages

**Example Workflow:**
1. Research Agent: Gather requirements
2. Coding Agent: Implement feature
3. Testing Agent: Write and run tests
4. Documentation Agent: Update README

---

### Scheduled Agent Tasks (P1)
**Why Q3:** "CI/CD for agents" - run agents on schedule or triggers.

**Effort:** Medium (3 weeks)
**Impact:** Medium - proactive maintenance

**Scheduling:**
- Cron-style expressions
- Event triggers (git push, file changes)
- Cost budgets per scheduled run
- Email/push notifications on completion

**Use Cases:**
- Daily security scans
- Weekly dependency updates
- Nightly test analysis
- Periodic documentation refresh

---

### Simple Session Sharing (P1)
**Why Q3:** Small teams need to share sessions without full RBAC.

**Effort:** Medium (3 weeks)
**Impact:** Medium - enables lightweight collaboration

**Features:**
- Generate shareable link (expires in 24h by default)
- View-only access for link recipients
- Optional: allow link recipient to send messages
- No accounts required for viewers

---

### Usage Analytics Dashboard (P2)
**Why Q3:** Understand patterns, optimize workflows.

**Effort:** Medium (2 weeks)
**Impact:** Small - power user insight

**Metrics:**
- Sessions per project over time
- Token usage trends
- Most-used tools and approval patterns
- Peak usage hours

---

## Q4 2026: Polish & Expansion
**Theme:** *Refine the experience and prepare for growth*

### Voice Input for Prompts (P1)
**Why Q4:** True hands-free mobile supervision.

**Effort:** Medium (3 weeks)
**Impact:** Medium - accessibility and convenience

**Features:**
- Web Speech API integration
- Press-and-hold to dictate
- Real-time transcription preview
- Works in notification quick-reply

---

### Session Branching / Checkpoints (P2)
**Why Q4:** Explore "what-if" scenarios, rollback mistakes.

**Effort:** Large (4 weeks)
**Impact:** Medium - advanced power user feature

**Features:**
- Create checkpoint at any message
- Branch from checkpoint with different prompt
- Compare branch outcomes side-by-side
- Merge successful branch back

---

### Project Insights & Recommendations (P2)
**Why Q4:** AI-powered suggestions based on usage patterns.

**Effort:** Medium (3 weeks)
**Impact:** Small - delight feature

**Features:**
- "You often approve X, consider adding an auto-approve rule"
- "This project averages $X/session, above your budget"
- "Sessions in this project frequently fail at Y tool"

---

## Future: Enterprise Features (Deferred)

These features are valuable for larger organizations but deferred to focus on solo/small team experience:

| Feature | Description | Why Deferred |
|---------|-------------|--------------|
| Multi-User RBAC | Admin/Operator/Viewer roles | Adds complexity; small teams share one account |
| Audit Logging | SOC2-compliant action trails | Compliance need, not individual need |
| SSO/SAML | Okta, Azure AD integration | Enterprise IT requirement |
| Workspace Permissions | Data separation between teams | Multi-tenant need |
| Collaborative Approvals | Multiple users approve same session | Full RBAC dependency |

**When to revisit:** Once monthly active users exceed 1,000 or enterprise demand becomes clear through support requests.

---

## Success Metrics by Quarter

### Q1 Metrics
- **Approval Fatigue:** 70% reduction in approval requests per session
- **Mobile Engagement:** 40% increase in mobile daily active users
- **Cost Awareness:** 80% of users view cost dashboard weekly

### Q2 Metrics
- **Mobile Approvals:** 60% of approvals happen via notification actions
- **Template Adoption:** 50% of sessions use templates within 4 weeks
- **Offline Usage:** 20% of users access cached sessions

### Q3 Metrics
- **Workflow Creation:** 25% of power users create multi-agent workflows
- **Scheduled Runs:** 500 scheduled agent runs per week
- **Sharing:** 30% of users share at least one session

### Q4 Metrics
- **Voice Input:** 15% of mobile prompts use voice
- **Branching:** 10% of sessions use checkpoints
- **Retention:** 60% monthly retention rate

---

## Quarterly Summary

| Quarter | Theme | Key Deliverables |
|---------|-------|------------------|
| **Q1** | Core Experience | Approval rules, swipe gestures, cost tracking |
| **Q2** | Mobile Power | Notification actions, offline cache, templates |
| **Q3** | Automation | Multi-agent workflows, scheduling, sharing |
| **Q4** | Polish | Voice input, branching, insights |

---

## Design Principles

1. **Solo-first, team-friendly** - Every feature works great for one person, scales to small teams
2. **Mobile-primary** - If it doesn't work well on a phone, reconsider the design
3. **Automation over administration** - Prefer smart defaults over configuration screens
4. **Cost-conscious** - Help users understand and control spending
5. **Zero external dependencies** - No Firebase, no accounts, just Tailscale for network access

---

## Conclusion

This roadmap delivers maximum value for solo developers and small teams:
- **Q1** eliminates approval fatigue and provides cost visibility
- **Q2** makes mobile the best way to supervise agents
- **Q3** unlocks powerful automation for power users
- **Q4** polishes the experience with voice and branching

Enterprise features remain in the backlog, ready to prioritize when market demand justifies the investment. By focusing on individuals and small teams first, we build a product people love before adding organizational complexity.

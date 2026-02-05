# Yep Anywhere: User Research Report

## Executive Summary

This report defines the target user personas for Yep Anywhere, a mobile-first supervisor for Claude Code agents. The product targets solo developers and small teams (2-5 people) who want to monitor and approve AI agent actions from their phones while maintaining server-owned processes that survive client disconnections.

**Key Finding:** The strongest product-market fit exists among experienced developers (5+ years) who already use AI coding assistants and have experienced the pain of interrupted sessions or missed approval requests. The mobile supervision angle is strongest for developers with active personal lives who code during fragmented time periods.

---

## 1. Primary Personas

### Persona 1: The Side-Project Maximizer

**Profile Card**
| Attribute | Detail |
|-----------|--------|
| **Name** | Marcus Chen |
| **Age** | 32 |
| **Role** | Senior Software Engineer at a mid-size SaaS company |
| **Experience** | 8 years professional, 12+ years total |
| **Location** | San Francisco Bay Area |
| **Income** | $180,000/year |
| **Family** | Partner, one child (toddler) |

**Daily Workflow**
- 9am-5pm: Day job (not using AI agents at work due to corporate policy)
- 7pm-9pm: Side projects after kid is in bed
- Weekends: 2-3 hour blocks of focused coding

**Pain Points**
1. **Limited time windows** - Can only code in 2-hour blocks; needs to maximize productive output
2. **Interrupted context** - Baby monitor goes off; loses Claude session state when stepping away
3. **Context switching penalty** - Returning to a stale session means re-explaining the task
4. **Multiple projects** - Has 3-4 side projects; constantly switching between them

**Mobile Supervision Use Cases**
- Checks agent progress while putting child to bed
- Approves file edits from the couch while watching TV with partner
- Reviews what Claude accomplished during a long-running task while at the park
- Gets push notifications when agent needs approval, responds from lock screen

**What Would Make Marcus Pay?**
- **Reliability:** Server-owned processes that continue working when his laptop sleeps
- **Time savings:** Multi-session dashboard lets him see all projects at once
- **Peace of mind:** Push notifications mean he never misses an approval request
- **Value prop:** "Get 30% more done in your limited coding time"

**Price Sensitivity:** Medium - already pays for multiple developer tools; expects $10-20/month for something that saves significant time

---

### Persona 2: The Remote Solo Freelancer

**Profile Card**
| Attribute | Detail |
|-----------|--------|
| **Name** | Priya Sharma |
| **Age** | 28 |
| **Role** | Freelance Full-Stack Developer |
| **Experience** | 5 years professional |
| **Location** | Digital nomad (currently in Lisbon, Portugal) |
| **Income** | $120,000/year (variable) |
| **Family** | Single, travels frequently |

**Daily Workflow**
- Works from cafes, co-working spaces, and Airbnbs
- Has a Mac Mini back home running as a development server
- Uses Claude Code heavily to maintain velocity across client projects
- Works across 3-4 time zones with clients

**Pain Points**
1. **Unreliable connections** - Cafe WiFi drops; session state lost
2. **Multiple client projects** - Needs isolation between codebases
3. **Timezone coordination** - Clients expect async progress updates
4. **Mobile-first by necessity** - Sometimes only has phone access

**Mobile Supervision Use Cases**
- Monitors agent from phone while waiting for coffee
- Approves tool requests during transit (metro, Uber)
- Reviews agent work product during downtime between meetings
- Checks project status across time zones before responding to client

**What Would Make Priya Pay?**
- **Remote access:** Secure relay to home server without VPN complexity
- **Multi-project management:** Tiered inbox showing what needs attention
- **Session persistence:** Disconnect and reconnect without losing state
- **Cost tracking:** Visibility into API costs per client project

**Price Sensitivity:** High - self-funded, but willing to pay for tools that directly increase billable hours or reduce client friction

---

### Persona 3: The Small Team Lead

**Profile Card**
| Attribute | Detail |
|-----------|--------|
| **Name** | David Okonkwo |
| **Age** | 38 |
| **Role** | Engineering Manager / Tech Lead (4-person team) |
| **Experience** | 14 years professional |
| **Location** | Austin, Texas |
| **Income** | $200,000/year |
| **Family** | Married, two kids (elementary school age) |

**Daily Workflow**
- 8am-9am: Pre-standup review of overnight work
- 9am-5pm: Meetings, code reviews, architecture discussions
- 6pm-7pm: Kids' activities, dinner
- 8pm-10pm: Deep work (personal coding, investigating tech debt)

**Pain Points**
1. **Context switching overload** - Jumps between management and IC work constantly
2. **Team coordination** - Wants to see what agents are doing across team projects
3. **Approval bottlenecks** - Team waits for his approval on sensitive operations
4. **Night-time momentum** - Agents work while he's at kids' soccer practice

**Mobile Supervision Use Cases**
- Approves critical operations from sideline at soccer game
- Reviews overnight agent progress during morning coffee
- Quick status checks between meetings
- Monitors team's agent sessions from the Activity Stream

**What Would Make David Pay?**
- **Team features:** Simple session sharing without complex RBAC
- **Approval delegation:** Trust team members to approve non-critical operations
- **Activity stream:** See all team agent activity in one feed
- **Budget controls:** Set spending limits per project/team member

**Price Sensitivity:** Low - has budget authority; will pay for team productivity tools

---

### Persona 4: The Weekend Hacker

**Profile Card**
| Attribute | Detail |
|-----------|--------|
| **Name** | Sarah Kim |
| **Age** | 24 |
| **Role** | Junior Developer at startup |
| **Experience** | 2 years professional, CS degree |
| **Location** | Seattle, WA |
| **Income** | $95,000/year |
| **Family** | Single, lives with roommates |

**Daily Workflow**
- Day job: Works on assigned tasks, limited AI agent usage
- Evenings: Gaming, social activities
- Weekends: Long coding sessions on personal projects and open source

**Pain Points**
1. **Learning curve anxiety** - Still building confidence with AI agents
2. **Cost consciousness** - Worried about unexpected API bills
3. **Long-running tasks** - Wants to set agents running while doing other things
4. **Fear of messing up** - Nervous about approving operations she doesn't fully understand

**Mobile Supervision Use Cases**
- Sets up a long task Saturday morning, monitors from phone while at brunch
- Gets notifications when agent finishes, reviews before next session
- Checks cost tracking before committing to expensive operations
- Quick approval of familiar operations (read-only tools)

**What Would Make Sarah Pay?**
- **Free tier:** Needs to try before committing money
- **Cost visibility:** Clear display of current and projected spending
- **Educational value:** Seeing agent reasoning helps her learn
- **Safety features:** Approval rules that prevent accidental damage

**Price Sensitivity:** Very High - limited budget, needs free tier or very low starting price

---

## 2. Use Case Scenarios

### Scenario 1: Commuter Developer

**Context:** Marcus is on the train home from visiting family. He kicked off a refactoring task before leaving but didn't finish supervising it.

**User Story:**
1. Opens Yep Anywhere PWA on phone
2. Sees notification badge: "2 sessions need attention"
3. Taps into his personal blog project
4. Views the pending approval: "Edit 15 files in /src/components"
5. Scans the diff in the mobile view
6. Approves from the train
7. Agent continues working while he finishes commute
8. Gets home, opens laptop, session is complete with all changes applied

**Key Requirements:**
- PWA with offline-capable session list
- Push notifications for approval requests
- Mobile-optimized diff viewer
- Server-owned processes continue without client

---

### Scenario 2: Remote Worker with Unreliable Connection

**Context:** Priya is at a beach cafe in Lisbon. WiFi is spotty. She needs to check on a client project.

**User Story:**
1. Opens Yep Anywhere on phone (cellular connection)
2. Authenticates via relay (E2E encrypted to her Mac Mini in SF)
3. Views session list - sees 3 active sessions across 2 clients
4. Checks "Client A - API Refactor" - agent is stuck on an approval
5. Approves bash command to run tests
6. Connection drops (wave of tourists)
7. Reconnects 5 minutes later
8. Agent has completed tests, showing passing results
9. No work lost despite disconnection

**Key Requirements:**
- Secure remote relay (no VPN needed)
- Server-owned processes survive disconnects
- Quick reconnection with session resume
- Low-bandwidth mobile optimization

---

### Scenario 3: Team Lead Monitoring Multiple Projects

**Context:** David is at his daughter's dance recital. His team is working on a release.

**User Story:**
1. Phone vibrates with push notification: "Production hotfix needs approval"
2. Views notification - sees it's a database migration
3. Opens full approval view - reviews the migration SQL
4. Approves, adds comment: "Verified - matches ticket requirements"
5. Checks Activity Stream - sees other team member's agent is completing docs update
6. Returns to watching recital
7. Later, reviews all activity from the evening in one view

**Key Requirements:**
- Detailed push notifications with context
- Activity stream across team sessions
- Fast approval workflow (< 30 seconds)
- Clear audit trail of who approved what

---

### Scenario 4: Weekend Long-Running Task

**Context:** Sarah wants to run a comprehensive test suite refactor while she goes to brunch with friends.

**User Story:**
1. Saturday 10am: Sets up session with detailed prompt
2. Configures approval rules: auto-approve Reads, prompt for Edits
3. Sets agent to work, heads to brunch
4. 11:15am: Gets push notification - agent wants to install a new dependency
5. Reviews from phone - seems reasonable, approves
6. 12:30pm: Gets another notification - agent is done
7. Reviews summary on phone - 47 test files updated
8. Gets home, opens laptop, runs `npm test` - all green
9. Checks cost dashboard - $2.30 for the session (within budget)

**Key Requirements:**
- Configurable approval rules
- Push notifications with clear context
- Cost tracking per session
- Session summary on completion

---

## 3. Jobs to Be Done Framework

### Core Jobs

| Job | When/Where | Current Alternatives | Switching Cost |
|-----|-----------|---------------------|----------------|
| **Supervise AI agents without being at computer** | Mobile, commute, travel | VS Code Remote (fragile), SSH to tmux (complex) | Low - just install and connect |
| **Manage multiple coding projects in one view** | Desktop or mobile | Multiple terminal tabs, VS Code windows | Low - reads existing sessions |
| **Not lose work when connection drops** | Spotty WiFi, mobile | None (current tools halt on disconnect) | Low - core value proposition |
| **Approve agent operations quickly** | Lock screen, notification | Must open full app/terminal | Low - just enable notifications |
| **Track AI coding costs** | End of session, budget review | Manual token counting, API dashboard | Low - automatic tracking |

### Functional Jobs

1. **"Help me see what my agent is doing right now"**
   - Real-time streaming of agent output
   - Tool use visibility (what files is it reading/editing?)
   - Progress indicators for long operations

2. **"Help me decide whether to approve this operation"**
   - Clear display of what the agent wants to do
   - Diff view for file edits
   - Context about why the agent needs this

3. **"Help me recover when something goes wrong"**
   - Fork conversation from before the mistake
   - Clear abort/cancel operations
   - Session history with replay

4. **"Help me run agents across multiple projects without confusion"**
   - Project/session organization
   - Search and filter
   - Archive/star for prioritization

### Emotional Jobs

1. **"Make me feel in control of the AI"**
   - Clear approval workflows
   - Audit trail of operations
   - Easy way to stop/pause

2. **"Make me confident I won't break anything"**
   - Approval rules for dangerous operations
   - Cost limits and alerts
   - Undo/rollback capabilities

3. **"Make me feel productive even with limited time"**
   - Quick mobile interactions
   - Intelligent defaults
   - Session templates for common tasks

### Social Jobs

1. **"Help me show colleagues what I accomplished"**
   - Session sharing (view-only)
   - Export conversation history
   - Activity summaries

---

## 4. Willingness to Pay Research

### Competitive Pricing Analysis

| Tool | Pricing Model | Price Point | Notes |
|------|---------------|-------------|-------|
| **Claude Code CLI** | Anthropic subscription | $20-100/mo (Pro/Max) | API costs on top |
| **Codex App** | ChatGPT subscription | $20-200/mo | Included in ChatGPT plans |
| **Claude Desktop** | Anthropic subscription | $20-100/mo | Remote execution included |
| **emdash** | Open source | Free | Desktop only |
| **Conductor** | Unknown | TBD | macOS only |
| **HAPI** | Open source | Free | Self-hosted |
| **Happy** | Open source | Free | Relay is free |
| **Cursor** | Subscription | $20-40/mo | IDE, not standalone supervisor |
| **GitHub Copilot** | Subscription | $10-39/mo | Comparison point |

### Key Insight: Supervisor Tools are Largely Free

Most competing supervisor tools (emdash, HAPI, Happy, Conductor) are either free or open source. This creates pricing pressure - users may expect supervision to be free since the underlying AI (Claude, Codex) is where they're already paying.

### Recommended Pricing Strategy

**Freemium Model (Recommended)**

| Tier | Price | Features |
|------|-------|----------|
| **Free** | $0 | 3 active sessions, local access only, basic push notifications |
| **Solo** | $8/mo | Unlimited sessions, relay access, approval rules, cost tracking |
| **Team** | $20/mo | Everything in Solo + 5 users, activity stream, session sharing |

**Rationale:**
- Free tier captures price-sensitive Weekend Hackers (Sarah persona)
- Solo tier targets Freelancers and Side-Project developers who need remote access
- Team tier targets Small Team Leads who need coordination features

### Price Sensitivity by Persona

| Persona | WTP (Monthly) | Key Value Drivers |
|---------|---------------|-------------------|
| Marcus (Side Project) | $10-15 | Time savings, reliability |
| Priya (Freelancer) | $8-12 | Remote access, multi-project |
| David (Team Lead) | $20-30 | Team features, activity stream |
| Sarah (Weekend Hacker) | $0-5 | Must have free tier to start |

### Alternative: Pure Open Source

Given competitive landscape is largely free/OSS, consider:
- Core product remains free/open source
- Revenue from hosted relay service ($5-10/mo)
- Revenue from priority support/consulting
- Revenue from enterprise features (when market demands)

---

## 5. Adoption Barriers

### Technical Barriers

| Barrier | Severity | Mitigation |
|---------|----------|------------|
| **Node.js requirement** | Medium | Plan Tauri desktop app with signed installer |
| **CLI familiarity needed** | Medium | Add setup wizard, one-line install command |
| **Self-hosting complexity** | Medium | Provide Docker image, systemd service file |
| **Push notification setup** | Low | VAPID auto-generated, no Firebase required |

### Trust/Security Barriers

| Barrier | Severity | Mitigation |
|---------|----------|------------|
| **"AI agent has access to my code"** | High | Already using Claude Code - not new risk |
| **"Remote access is scary"** | Medium | E2E encryption, relay can't read content |
| **"Third-party relay sees my traffic"** | Medium | Self-hosted relay option, Tailscale alternative |
| **"What if agent approves something bad?"** | Medium | Approval rules, audit trail, undo features |
| **"API costs could spiral"** | Medium | Cost tracking, budget alerts, spending limits |

### Behavioral Barriers

| Barrier | Severity | Mitigation |
|---------|----------|------------|
| **"I need to learn new tool"** | High | Show value in < 5 minutes demo |
| **"Current workflow works fine"** | High | Target moments of pain (disconnects, missed approvals) |
| **"My team won't adopt"** | Medium | Solo-first design, team features are additive |
| **"VS Code extension is good enough"** | Medium | Emphasize mobile + multi-session advantages |

### Competitive Barriers

| Barrier | Severity | Mitigation |
|---------|----------|------------|
| **"I'll use emdash instead"** | Medium | Emphasize mobile-first, push notifications |
| **"I'll wait for Anthropic official app"** | High | Move fast, build community, differentiate |
| **"Codex App has cloud execution"** | Medium | Target Claude users specifically |

### Addressing the Biggest Barriers

**1. "I need to learn a new tool"**
- **Demo video:** Show 2-minute "phone approves file edit" demo
- **Free tier:** No commitment needed to try
- **Import existing sessions:** Reads existing Claude Code sessions

**2. "What if Anthropic releases something better?"**
- **Multi-provider:** Claude, Codex, Gemini support
- **Open source:** Community ownership, not dependent on one provider
- **Unique features:** Tiered inbox, fork/clone, activity stream

**3. "Remote access is scary"**
- **E2E encryption:** Technical proof (TweetNaCl, SRP-6a)
- **Self-host option:** Run your own relay
- **Tailscale alternative:** Use trusted VPN instead

---

## 6. Recommendations for Product Positioning

### Primary Positioning Statement

> **For solo developers and small teams who use AI coding agents**, Yep Anywhere is **the mobile-first supervisor** that lets you **monitor and approve agent actions from your phone**. Unlike desktop-only tools like emdash or Conductor, **Yep Anywhere's server-owned processes continue working even when you disconnect**, with push notifications that let you approve from your lock screen.

### Key Messages by Persona

| Persona | Primary Message |
|---------|-----------------|
| Marcus (Side Project) | "Keep your side projects moving even when you can't be at your desk" |
| Priya (Freelancer) | "Supervise agents from anywhere with secure remote access" |
| David (Team Lead) | "See all your team's agent activity in one mobile-friendly dashboard" |
| Sarah (Weekend Hacker) | "Free to start, with cost tracking so you never get bill shock" |

### Feature Hierarchy for Marketing

**Tier 1 (Core Value Prop):**
1. Mobile-first PWA with push notifications
2. Server-owned processes survive disconnects
3. Multi-session dashboard

**Tier 2 (Differentiation):**
1. Tiered inbox (Needs Attention, Active, Recent)
2. Conversation fork/clone
3. Global activity stream
4. E2E encrypted remote relay

**Tier 3 (Power User):**
1. Multi-provider (Claude, Codex, Gemini)
2. Approval rules engine
3. Cost tracking and budget alerts
4. Session templates

### Competitive Positioning Matrix

| vs Competitor | Our Advantage | Their Advantage |
|---------------|---------------|-----------------|
| **emdash** | Mobile-first, push notifications, server-owned | More agents (20+), git worktrees |
| **Conductor** | Cross-platform, more providers | macOS native UX |
| **HAPI** | Tiered inbox, fork/clone, activity stream | Terminal page, file browser |
| **Happy** | Multi-provider, server-owned processes | Voice commands, native mobile apps |
| **VS Code Extension** | Multi-session, survives disconnect, mobile | Deeper IDE integration |

---

## 7. User Research Next Steps

### Validate Personas (Recommended)

1. **User Interviews (10-15 conversations)**
   - Recruit via Claude Code community (Discord, Reddit)
   - Target mix of solo developers and small team leads
   - Focus on mobile usage patterns and approval frustrations

2. **Usage Analytics (post-launch)**
   - Track mobile vs desktop session ratio
   - Measure time-to-approval from notification
   - Monitor session abandonment due to disconnection

3. **Competitive User Testing**
   - Have users try emdash and Yep Anywhere
   - Identify moments of delight and frustration
   - Validate differentiation claims

### Pricing Validation

1. **Van Westendorp survey** with target users
2. **A/B test** free tier limits (3 vs 5 active sessions)
3. **Monitor** conversion from free to paid

### Feature Prioritization Research

1. **Max-Diff survey** on roadmap features
2. **Fake door tests** for premium features
3. **Customer advisory board** (5-10 engaged users)

---

## Appendix: Research Sources

- Yep Anywhere codebase and documentation
- Competitive analysis documents (`/docs/competitive/`)
- Product roadmap (`/PRODUCT_ROADMAP.md`)
- Feature comparison matrix (`/docs/competitive/feature-matrix.md`)
- Remote access documentation (`/docs/project/remote-access.md`)

---

*Report prepared: 2026-02-05*
*Target audience: Product team, marketing, investor materials*

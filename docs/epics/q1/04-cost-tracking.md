# Epic: Cost Tracking and Budget Alerts

**Epic ID:** Q1-004
**Priority:** P0
**Quarter:** Q1 2026
**Estimated Effort:** 2 weeks
**Status:** Planning

---

## Problem Statement

Solo developers and small teams using AI agents have no visibility into API costs until they receive their monthly bill. This creates:
- "Bill shock" from unexpectedly high charges
- Inability to budget for AI usage
- No way to compare cost efficiency between approaches
- Freelancers can't accurately bill clients for AI costs

**Target Outcome:** Provide real-time cost visibility at session, project, and account levels with configurable budget alerts.

---

## User Stories

### US-001: Per-session cost tracking
**As a** developer monitoring an active session
**I want to** see real-time cost for this session
**So that** I can decide whether to continue or stop expensive operations

**Acceptance Criteria:**
- [ ] Session header shows running cost in dollars
- [ ] Cost updates in real-time as tokens are used
- [ ] Breakdown shows input vs output tokens
- [ ] Model pricing is configurable (defaults to Anthropic rates)
- [ ] Historical sessions show final cost
- [ ] Cost calculation is accurate within 1%

### US-002: Monthly spending dashboard
**As a** user planning my budget
**I want to** see monthly spending trends
**So that** I can understand my usage patterns

**Acceptance Criteria:**
- [ ] Dashboard shows current month spending
- [ ] Comparison to previous month
- [ ] Daily spending chart
- [ ] Top 5 projects by cost
- [ ] Top 5 sessions by cost
- [ ] Projectedmonth-end total based on current pace

### US-003: Budget alerts
**As a** cost-conscious developer
**I want to** set spending limits with alerts
**So that** I don't exceed my budget accidentally

**Acceptance Criteria:**
- [ ] Set monthly budget amount
- [ ] Alert at configurable thresholds (50%, 75%, 90%, 100%)
- [ ] Push notification when threshold reached
- [ ] Optional: pause all sessions at 100% (requires confirmation)
- [ ] Per-project budgets (optional)
- [ ] Budget resets on first of month

### US-004: Export cost data
**As a** freelancer billing clients
**I want to** export cost data to CSV
**So that** I can include it in invoices

**Acceptance Criteria:**
- [ ] Export button on cost dashboard
- [ ] CSV includes: date, session, project, model, tokens, cost
- [ ] Date range filter for export
- [ ] Filter by project for client billing
- [ ] Export includes session titles for context
- [ ] Optionally include session summaries

### US-005: Cost visibility in session list
**As a** user browsing sessions
**I want to** see cost per session in the list
**So that** I can quickly identify expensive sessions

**Acceptance Criteria:**
- [ ] Cost shown on session card (optional, toggle in settings)
- [ ] Sort sessions by cost
- [ ] Filter to sessions over $X threshold
- [ ] Color coding for cost levels (green/yellow/red)
- [ ] Cumulative cost for filtered/selected sessions

---

## Technical Approach

### Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Cost Tracking System                  │
├─────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐ │
│  │ Token       │  │ Cost        │  │ Budget          │ │
│  │ Counter     │  │ Calculator  │  │ Monitor         │ │
│  │             │  │             │  │                 │ │
│  │ - input     │  │ - pricing   │  │ - thresholds    │ │
│  │ - output    │  │ - models    │  │ - alerts        │ │
│  │ - cache     │  │ - aggregate │  │ - notifications │ │
│  └─────────────┘  └─────────────┘  └─────────────────┘ │
│         │                │                │             │
│         └────────────────┼────────────────┘             │
│                          ▼                              │
│               ┌─────────────────┐                       │
│               │ Cost Event Bus  │                       │
│               │ (real-time)     │                       │
│               └─────────────────┘                       │
└─────────────────────────────────────────────────────────┘
```

### Data Model

```typescript
interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  cacheCreationInputTokens?: number;
  cacheReadInputTokens?: number;
}

interface SessionCost {
  sessionId: string;
  model: string;
  usage: TokenUsage;
  costUsd: number;
  timestamp: string;
}

interface CostSummary {
  totalCostUsd: number;
  byModel: Record<string, number>;
  byProject: Record<string, number>;
  byDay: Record<string, number>;
  topSessions: Array<{ sessionId: string; title: string; cost: number }>;
}

interface BudgetConfig {
  monthlyLimitUsd: number | null;
  alertThresholds: number[]; // percentages
  pauseAtLimit: boolean;
  projectBudgets: Record<string, number>;
}

interface BudgetAlert {
  id: string;
  type: 'threshold' | 'limit_reached';
  threshold: number;
  currentSpend: number;
  budgetAmount: number;
  triggeredAt: string;
  acknowledged: boolean;
}
```

### Pricing Configuration

```typescript
interface ModelPricing {
  modelId: string;
  inputPer1kTokens: number;
  outputPer1kTokens: number;
  cacheCreationPer1kTokens?: number;
  cacheReadPer1kTokens?: number;
  effectiveDate: string;
}

const DEFAULT_PRICING: ModelPricing[] = [
  {
    modelId: 'claude-sonnet-4-20250514',
    inputPer1kTokens: 0.003,
    outputPer1kTokens: 0.015,
    cacheCreationPer1kTokens: 0.00375,
    cacheReadPer1kTokens: 0.0003,
    effectiveDate: '2025-05-14',
  },
  {
    modelId: 'claude-haiku-3-5-20241022',
    inputPer1kTokens: 0.001,
    outputPer1kTokens: 0.005,
    effectiveDate: '2024-10-22',
  },
  // Add more models...
];
```

### Key Implementation Details

1. **Token Counting from SDK:**
   ```typescript
   // Extract from Claude SDK response
   const extractUsage = (response: ClaudeResponse): TokenUsage => ({
     inputTokens: response.usage.input_tokens,
     outputTokens: response.usage.output_tokens,
     cacheCreationInputTokens: response.usage.cache_creation_input_tokens,
     cacheReadInputTokens: response.usage.cache_read_input_tokens,
   });

   // Calculate cost
   const calculateCost = (usage: TokenUsage, pricing: ModelPricing): number => {
     let cost = 0;
     cost += (usage.inputTokens / 1000) * pricing.inputPer1kTokens;
     cost += (usage.outputTokens / 1000) * pricing.outputPer1kTokens;
     if (usage.cacheCreationInputTokens && pricing.cacheCreationPer1kTokens) {
       cost += (usage.cacheCreationInputTokens / 1000) * pricing.cacheCreationPer1kTokens;
     }
     if (usage.cacheReadInputTokens && pricing.cacheReadPer1kTokens) {
       cost += (usage.cacheReadInputTokens / 1000) * pricing.cacheReadPer1kTokens;
     }
     return cost;
   };
   ```

2. **Real-time Cost Updates:**
   ```typescript
   // Emit cost event on each API response
   eventBus.emit('session:cost', {
     sessionId,
     incrementalCost: calculateCost(usage, pricing),
     totalCost: session.totalCost + incrementalCost,
   });

   // Client subscribes for real-time updates
   // Already have SSE infrastructure, extend it
   ```

3. **Budget Monitoring:**
   ```typescript
   class BudgetMonitor {
     private checkBudget(newCost: number) {
       const monthlyTotal = this.getMonthlyTotal() + newCost;
       const budget = this.budgetConfig.monthlyLimitUsd;

       if (!budget) return;

       for (const threshold of this.budgetConfig.alertThresholds) {
         const thresholdAmount = budget * (threshold / 100);
         if (monthlyTotal >= thresholdAmount && !this.alertSent(threshold)) {
           this.sendAlert(threshold, monthlyTotal, budget);
         }
       }

       if (monthlyTotal >= budget && this.budgetConfig.pauseAtLimit) {
         this.pauseAllSessions();
       }
     }
   }
   ```

4. **Cost Aggregation:**
   ```typescript
   class CostAggregator {
     async getMonthlySummary(year: number, month: number): Promise<CostSummary> {
       const sessions = await this.getSessionsForMonth(year, month);

       return {
         totalCostUsd: sessions.reduce((sum, s) => sum + s.cost, 0),
         byModel: this.groupBy(sessions, 'model'),
         byProject: this.groupBy(sessions, 'projectId'),
         byDay: this.groupByDay(sessions),
         topSessions: this.getTopN(sessions, 5, 'cost'),
       };
     }
   }
   ```

### API Endpoints

```
GET    /api/cost/session/:sessionId        # Session cost details
GET    /api/cost/summary                   # Monthly summary
GET    /api/cost/summary/:year/:month      # Historical month
GET    /api/cost/export                    # Export CSV
GET    /api/budget                         # Get budget config
PUT    /api/budget                         # Update budget config
GET    /api/budget/alerts                  # Get alert history
POST   /api/budget/alerts/:id/acknowledge  # Acknowledge alert
```

### UI Components

1. **Session Cost Badge:**
   - Small pill showing "$0.23" in session header
   - Tooltip with token breakdown
   - Real-time counter animation

2. **Cost Dashboard Page:**
   - Monthly total with gauge/progress bar
   - Daily spending chart (bar chart)
   - Project/session breakdown tables
   - Export button

3. **Budget Settings:**
   - Monthly limit input
   - Threshold checkboxes
   - Pause toggle
   - Project-specific overrides

4. **Budget Alert Modal:**
   - Shows when threshold reached
   - Options: Acknowledge, View Details, Adjust Budget

---

## Dependencies

| Dependency | Type | Status | Notes |
|------------|------|--------|-------|
| Claude SDK usage data | External | Available | In API response |
| Push notification system | Internal | Exists | For budget alerts |
| Session metadata storage | Internal | Exists | Add cost field |
| Chart library (recharts) | External | Exists | For dashboard |
| CSV export | Internal | New | Simple implementation |

---

## Subagent Assignments

### Backend Agent
**Expertise:** Node.js, TypeScript, data aggregation, event systems
**Tasks:**
1. Implement token extraction from Claude SDK responses
2. Create cost calculation service with pricing config
3. Build cost aggregation queries for summaries
4. Implement budget monitoring with alerts
5. Create CSV export endpoint
6. Add cost events to SSE stream

**Deliverables:**
- `packages/server/src/cost/` directory with services
- API routes in `packages/server/src/routes/cost.ts`
- Budget monitoring integration with push notifications

### Frontend Agent
**Expertise:** React, TypeScript, data visualization, forms
**Tasks:**
1. Create session cost badge component
2. Build cost dashboard page with charts
3. Implement budget settings form
4. Create budget alert modal
5. Add cost column to session list
6. Implement export button and date picker

**Deliverables:**
- `packages/client/src/pages/CostDashboard.tsx`
- `packages/client/src/components/cost/` directory
- Settings page extension for budget config

### Data Agent
**Expertise:** Data modeling, storage optimization, queries
**Tasks:**
1. Design cost data storage schema
2. Optimize aggregation queries for large datasets
3. Implement monthly rollup for performance
4. Create data migration for existing sessions
5. Test with 1000+ sessions

**Deliverables:**
- Data model documentation
- Migration scripts
- Performance benchmarks

### QA Agent
**Expertise:** Testing, accuracy validation, edge cases
**Tasks:**
1. Verify cost calculations against manual calculation
2. Test budget alert timing and accuracy
3. Test export data accuracy
4. Test real-time updates
5. Test edge cases (month boundary, model changes)

**Deliverables:**
- Cost calculation test suite
- Budget alert test scenarios
- Accuracy validation report

---

## Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Cost calculation accuracy | >99% | Compare to Anthropic invoice |
| Dashboard views per user/month | 4+ | Analytics tracking |
| Budget alert delivery time | <1 minute | From threshold to notification |
| Export usage | 10% of users/month | Analytics tracking |
| Budget configuration rate | 40% of users | Settings analytics |

---

## Risks & Mitigations

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Pricing changes break calculations | High | Medium | Make pricing configurable, track effective dates |
| Cached tokens not counted | Medium | Low | Explicit cache token handling |
| High storage for cost history | Medium | Medium | Monthly rollups, prune old data |
| Cost data out of sync | Medium | Low | Event-driven updates, reconciliation job |

---

## Open Questions

1. Should we support non-USD currencies?
2. How do we handle API errors that still consume tokens?
3. Should we track costs for non-Claude models (future multi-provider)?
4. Do we need team-level cost allocation for future team features?

---

## References

- Anthropic Pricing: https://anthropic.com/pricing
- Claude SDK Usage: `response.usage` object
- Existing session storage: `packages/server/src/services/sessionIndex.ts`

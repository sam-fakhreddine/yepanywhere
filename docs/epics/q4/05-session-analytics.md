# Epic: Session Analytics Dashboard

**Epic ID:** Q4-005
**Priority:** P2
**Quarter:** Q4 2026
**Estimated Effort:** 2-3 weeks
**Status:** Planning

---

## Problem Statement

Power users want deep insights into agent behavior and effectiveness to optimize their prompts and workflows, beyond basic usage analytics.

**Target Outcome:** Detailed session-level analytics showing success rates, token efficiency, and time-to-completion trends.

---

## User Stories

### US-001: Success rate analysis
- [ ] Success rate by prompt type
- [ ] Success rate by model
- [ ] Success rate by project
- [ ] Trend over time

### US-002: Token efficiency
- [ ] Average tokens per task category
- [ ] Input/output ratio trends
- [ ] Compare efficiency across projects
- [ ] Identify verbose prompts

### US-003: Tool usage analytics
- [ ] Tool usage patterns per project
- [ ] Tool failure analysis
- [ ] Tool combination patterns
- [ ] Approval patterns by tool

### US-004: Time analysis
- [ ] Time-to-completion by task type
- [ ] Wait time for approvals
- [ ] Active vs idle time
- [ ] Time of day patterns

### US-005: Cost efficiency
- [ ] Cost per successful task
- [ ] Cost comparison across models
- [ ] ROI analysis (if tasks tagged with value)

---

## Technical Approach

```typescript
interface SessionAnalytics {
  sessionId: string;
  success: boolean;
  durationMinutes: number;
  tokenUsage: {
    input: number;
    output: number;
    total: number;
  };
  toolUsage: Record<string, {
    calls: number;
    approvals: number;
    failures: number;
    avgDurationMs: number;
  }>;
  approvalMetrics: {
    totalRequests: number;
    approved: number;
    denied: number;
    avgWaitTimeMs: number;
  };
  cost: number;
  model: string;
  taskType?: string;
}

interface AnalyticsSummary {
  period: DateRange;
  totalSessions: number;
  successRate: number;
  avgTokensPerSession: number;
  avgCostPerSession: number;
  avgDurationMinutes: number;
  byModel: Record<string, ModelAnalytics>;
  byProject: Record<string, ProjectAnalytics>;
  trends: {
    successRate: TrendPoint[];
    avgCost: TrendPoint[];
    avgTokens: TrendPoint[];
  };
}

class AnalyticsService {
  async getSessionAnalytics(sessionId: string): Promise<SessionAnalytics> {
    const session = await this.getSession(sessionId);
    const messages = await this.getMessages(sessionId);
    const toolCalls = await this.getToolCalls(sessionId);
    const approvals = await this.getApprovals(sessionId);

    return {
      sessionId,
      success: this.determineSuccess(session, messages),
      durationMinutes: this.calculateDuration(session),
      tokenUsage: this.calculateTokens(messages),
      toolUsage: this.aggregateToolUsage(toolCalls),
      approvalMetrics: this.aggregateApprovals(approvals),
      cost: session.totalCost,
      model: session.model,
    };
  }

  async getSummary(dateRange: DateRange): Promise<AnalyticsSummary> {
    const sessions = await this.getSessionsInRange(dateRange);
    const analytics = await Promise.all(
      sessions.map(s => this.getSessionAnalytics(s.id))
    );

    return {
      period: dateRange,
      totalSessions: analytics.length,
      successRate: this.calculateSuccessRate(analytics),
      avgTokensPerSession: this.calculateAverage(analytics, 'tokenUsage.total'),
      avgCostPerSession: this.calculateAverage(analytics, 'cost'),
      avgDurationMinutes: this.calculateAverage(analytics, 'durationMinutes'),
      byModel: this.groupByModel(analytics),
      byProject: this.groupByProject(analytics),
      trends: this.calculateTrends(analytics),
    };
  }
}
```

---

## Subagent Assignments

### Backend Agent
- Analytics aggregation service
- Performance-optimized queries
- Trend calculation algorithms
- Export endpoints

### Frontend Agent
- Analytics dashboard with charts
- Drill-down views
- Filter and date range controls
- Comparison tools

---

## Success Metrics

| Metric | Target |
|--------|--------|
| Dashboard engagement | 2+ views per week per power user |
| Optimization actions | 30% make changes based on analytics |
| Data accuracy | 99%+ match with raw data |

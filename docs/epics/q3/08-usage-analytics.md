# Epic: Usage Analytics Dashboard

**Epic ID:** Q3-008
**Priority:** P2
**Quarter:** Q3 2026
**Estimated Effort:** 2 weeks
**Status:** Planning

---

## Problem Statement

Power users want to understand their AI usage patterns to optimize workflows and costs, but there's no analytics visibility.

**Target Outcome:** Dashboard showing sessions over time, token trends, tool usage patterns, and peak hours.

---

## User Stories

### US-001: Session analytics
- [ ] Sessions per day/week/month chart
- [ ] Completion rate (success vs error)
- [ ] Average session duration
- [ ] Sessions by project

### US-002: Token usage analytics
- [ ] Input/output token trends
- [ ] Cost per session distribution
- [ ] Model usage breakdown
- [ ] Cache hit rate

### US-003: Tool usage patterns
- [ ] Most used tools
- [ ] Approval rate by tool
- [ ] Tool usage over time
- [ ] Failed tool calls

### US-004: Time-based patterns
- [ ] Peak usage hours
- [ ] Usage by day of week
- [ ] Session distribution heatmap

---

## Technical Approach

```typescript
interface UsageAnalytics {
  dateRange: DateRange;
  sessions: {
    total: number;
    completed: number;
    failed: number;
    avgDurationMinutes: number;
    byDay: Record<string, number>;
  };
  tokens: {
    total: { input: number; output: number };
    avgPerSession: { input: number; output: number };
    byModel: Record<string, { input: number; output: number }>;
    cacheHitRate: number;
  };
  tools: {
    usage: Record<string, number>;
    approvalRate: Record<string, number>;
    failures: Record<string, number>;
  };
  peakHours: Record<number, number>; // hour -> session count
}

class AnalyticsService {
  async getAnalytics(dateRange: DateRange): Promise<UsageAnalytics> {
    const sessions = await this.getSessionsInRange(dateRange);
    // Aggregate all metrics
    return {
      sessions: this.aggregateSessions(sessions),
      tokens: this.aggregateTokens(sessions),
      tools: this.aggregateTools(sessions),
      peakHours: this.calculatePeakHours(sessions),
    };
  }
}
```

---

## Subagent Assignments

### Backend Agent
- Analytics aggregation queries
- Caching for expensive queries
- Date range filtering

### Frontend Agent
- Analytics dashboard page
- Charts (recharts)
- Date range picker
- Export analytics data

---

## Success Metrics

| Metric | Target |
|--------|--------|
| Dashboard views | 2x per week per active user |
| Insights acted upon | 20% adjust behavior |

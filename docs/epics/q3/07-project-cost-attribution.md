# Epic: Per-Project Cost Attribution with Export

**Epic ID:** Q3-007
**Priority:** P1
**Quarter:** Q3 2026
**Estimated Effort:** 2 weeks
**Status:** Planning

---

## Problem Statement

Freelancers and agencies cannot accurately bill clients for AI costs because there's no per-project cost tracking with exportable reports.

**Target Outcome:** Assign sessions to projects/clients with cost dashboards and invoiceable exports.

---

## User Stories

### US-001: Assign sessions to projects
- [ ] Create client/project entities
- [ ] Assign session to project at creation
- [ ] Bulk reassign sessions
- [ ] Default project per directory

### US-002: Per-project dashboards
- [ ] Cost breakdown by project
- [ ] Time range filtering
- [ ] Session list per project
- [ ] Cost trend charts

### US-003: Project budgets
- [ ] Set budget per project
- [ ] Alert at threshold
- [ ] Block new sessions at limit (optional)
- [ ] Budget carryover option

### US-004: Export for invoicing
- [ ] Export project costs to CSV
- [ ] PDF invoice template
- [ ] Include session summaries
- [ ] Customizable line items
- [ ] Date range selection

---

## Technical Approach

```typescript
interface ClientProject {
  id: string;
  name: string;
  clientName?: string;
  budgetUsd?: number;
  budgetAlertThreshold: number;
  createdAt: string;
}

interface ProjectCostSummary {
  projectId: string;
  totalCostUsd: number;
  sessionCount: number;
  tokenUsage: { input: number; output: number };
  byModel: Record<string, number>;
  byDay: Record<string, number>;
}

// Invoice generation
interface InvoiceLineItem {
  date: string;
  description: string;
  sessions: number;
  tokens: number;
  cost: number;
}

function generateInvoice(project: ClientProject, dateRange: DateRange): Invoice {
  const sessions = getSessionsForProject(project.id, dateRange);
  const lineItems = groupByDay(sessions).map(day => ({
    date: day.date,
    description: `AI agent sessions (${day.sessions.length} sessions)`,
    sessions: day.sessions.length,
    tokens: day.totalTokens,
    cost: day.totalCost,
  }));

  return {
    projectName: project.name,
    clientName: project.clientName,
    dateRange,
    lineItems,
    total: lineItems.reduce((sum, item) => sum + item.cost, 0),
  };
}
```

---

## Subagent Assignments

### Backend Agent
- Project CRUD API
- Cost aggregation queries
- Budget tracking
- Invoice/export generation

### Frontend Agent
- Project management page
- Project cost dashboard
- Invoice preview and download
- Budget configuration

---

## Success Metrics

| Metric | Target |
|--------|--------|
| Sessions with project | 60% |
| Export usage | 25% of project users export |
| Budget utilization | 80% stay within budget |

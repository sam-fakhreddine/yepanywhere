# Epic: Project Insights & Recommendations

**Epic ID:** Q4-004
**Priority:** P2
**Quarter:** Q4 2026
**Estimated Effort:** 3 weeks
**Status:** Planning

---

## Problem Statement

Users don't know how to optimize their AI workflows. They repeat patterns without knowing about better approaches or available features.

**Target Outcome:** AI-powered suggestions based on usage patterns to improve productivity and reduce costs.

---

## User Stories

### US-001: Approval pattern insights
- [ ] "You often approve X, consider adding an auto-approve rule"
- [ ] Show approval statistics
- [ ] One-click to create suggested rule
- [ ] Track suggestion acceptance

### US-002: Cost insights
- [ ] "This project averages $X/session, above your budget"
- [ ] Compare to similar projects
- [ ] Model usage suggestions (use cheaper model for task type)
- [ ] Token efficiency tips

### US-003: Failure insights
- [ ] "Sessions in this project frequently fail at Y tool"
- [ ] Common error patterns
- [ ] Suggested prompt improvements
- [ ] Link to documentation

### US-004: Usage recommendations
- [ ] "Try templates for faster session setup"
- [ ] "Consider scheduling this recurring task"
- [ ] Feature discovery based on usage
- [ ] Weekly digest email (optional)

---

## Technical Approach

```typescript
interface ProjectInsight {
  id: string;
  projectId: string;
  type: InsightType;
  title: string;
  description: string;
  action?: InsightAction;
  priority: 'high' | 'medium' | 'low';
  generatedAt: string;
  dismissed: boolean;
  actedUpon: boolean;
}

type InsightType =
  | 'approval_pattern'
  | 'cost_anomaly'
  | 'failure_pattern'
  | 'feature_suggestion'
  | 'efficiency_tip';

interface InsightAction {
  label: string;
  type: 'create_rule' | 'change_setting' | 'view_docs' | 'navigate';
  payload: unknown;
}

class InsightGenerator {
  async generateInsights(projectId: string): Promise<ProjectInsight[]> {
    const insights: ProjectInsight[] = [];

    // Analyze approval patterns
    const approvalPatterns = await this.analyzeApprovals(projectId);
    for (const pattern of approvalPatterns) {
      if (pattern.frequency > 10 && pattern.approvalRate > 0.9) {
        insights.push({
          type: 'approval_pattern',
          title: `Auto-approve ${pattern.tool} for ${pattern.filePattern}?`,
          description: `You've approved this ${pattern.frequency} times with 100% approval rate.`,
          action: {
            label: 'Create Rule',
            type: 'create_rule',
            payload: { tool: pattern.tool, filePattern: pattern.filePattern },
          },
          priority: 'medium',
        });
      }
    }

    // Analyze costs
    const costAnalysis = await this.analyzeCosts(projectId);
    if (costAnalysis.avgCost > costAnalysis.budget * 0.8) {
      insights.push({
        type: 'cost_anomaly',
        title: 'Approaching budget limit',
        description: `Average session cost ($${costAnalysis.avgCost.toFixed(2)}) is approaching your budget.`,
        priority: 'high',
      });
    }

    // Analyze failures
    const failures = await this.analyzeFailures(projectId);
    // ... similar pattern

    return insights;
  }
}
```

---

## Subagent Assignments

### Backend Agent
- Insight generation algorithms
- Pattern detection queries
- Insight storage and tracking
- Weekly digest generation

### Frontend Agent
- Insights dashboard panel
- Insight cards with actions
- Dismiss/act-upon tracking
- Settings for insight preferences

---

## Success Metrics

| Metric | Target |
|--------|--------|
| Insight engagement | 40% view insights |
| Action taken | 30% of insights acted upon |
| Workflow improvement | 20% cost/time savings for adopters |

# Epic: Scheduled Agent Tasks

**Epic ID:** Q3-003
**Priority:** P1
**Quarter:** Q3 2026
**Estimated Effort:** 3 weeks
**Status:** Planning

---

## Problem Statement

Users want agents to run automatically on schedules (daily security scans, weekly dependency updates) but must manually start sessions. There's no "CI/CD for agents."

**Target Outcome:** Cron-style scheduling for agent tasks with cost budgets and completion notifications.

---

## User Stories

### US-001: Schedule recurring tasks
- [ ] Cron expression builder UI
- [ ] Set task prompt and configuration
- [ ] Choose model and approval rules
- [ ] Set cost budget per run
- [ ] Enable/disable schedules

### US-002: Event triggers
- [ ] Trigger on git push (webhook)
- [ ] Trigger on file change (watch patterns)
- [ ] Trigger on external webhook
- [ ] Debounce rapid triggers

### US-003: Run management
- [ ] View scheduled run history
- [ ] See next scheduled run time
- [ ] Manual "run now" option
- [ ] Cancel running scheduled task
- [ ] Skip next occurrence

### US-004: Notifications
- [ ] Notify on completion (success/failure)
- [ ] Notify if budget exceeded
- [ ] Daily/weekly digest of scheduled runs
- [ ] Escalation if task fails repeatedly

---

## Technical Approach

```typescript
interface ScheduledTask {
  id: string;
  name: string;
  cron?: string; // e.g., "0 9 * * 1" (Mondays 9am)
  trigger?: TaskTrigger;
  sessionConfig: SessionConfig;
  budgetUsd: number;
  enabled: boolean;
  lastRun?: ScheduledRun;
  nextRunAt?: string;
}

interface TaskTrigger {
  type: 'webhook' | 'git_push' | 'file_change';
  config: Record<string, unknown>;
}

interface ScheduledRun {
  id: string;
  taskId: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'budget_exceeded';
  sessionId?: string;
  startedAt: string;
  completedAt?: string;
  cost: number;
  error?: string;
}

// Scheduler using node-cron
class TaskScheduler {
  private jobs: Map<string, CronJob> = new Map();

  scheduleTask(task: ScheduledTask): void {
    if (task.cron) {
      const job = new CronJob(task.cron, () => this.executeTask(task));
      this.jobs.set(task.id, job);
      job.start();
    }
  }

  async executeTask(task: ScheduledTask): Promise<void> {
    const run = await this.createRun(task);

    try {
      const session = await this.supervisor.createSession({
        ...task.sessionConfig,
        budgetLimit: task.budgetUsd,
      });

      await this.supervisor.runToCompletion(session.id);
      await this.completeRun(run.id, 'completed', session.cost);
    } catch (error) {
      await this.completeRun(run.id, 'failed', 0, error.message);
    }

    await this.notifyCompletion(task, run);
  }
}
```

---

## Subagent Assignments

### Backend Agent
- Task scheduler with node-cron
- Webhook trigger handlers
- Run history storage
- Budget enforcement
- Notification integration

### Frontend Agent
- Cron expression builder
- Schedule management page
- Run history view
- Task configuration form

---

## Success Metrics

| Metric | Target |
|--------|--------|
| Scheduled tasks created | 25% of active users |
| Successful scheduled runs | 90% completion rate |
| Scheduled runs per week | 500+ |

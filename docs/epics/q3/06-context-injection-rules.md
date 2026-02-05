# Epic: Context Injection Rules

**Epic ID:** Q3-006
**Priority:** P1
**Quarter:** Q3 2026
**Estimated Effort:** 2-3 weeks
**Status:** Planning

---

## Problem Statement

Users repeatedly include the same context in prompts (README content, coding standards, error logs) creating verbose prompts and inconsistent context.

**Target Outcome:** Automatic context injection based on configurable rules, reducing prompt boilerplate.

---

## User Stories

### US-001: Auto-inject project files
- [ ] Configure files to inject on first message (README.md, CONTRIBUTING.md)
- [ ] Inject on specific triggers (mention of "architecture", "style guide")
- [ ] Token budget management (max tokens for injected context)
- [ ] Show injected context in UI

### US-002: Inject git context
- [ ] Recent commits (configurable count)
- [ ] Current branch info
- [ ] Uncommitted changes summary
- [ ] Relevant blame info

### US-003: Inject error context
- [ ] When debugging, inject recent error logs
- [ ] Stack traces from terminal
- [ ] Test failure output
- [ ] Configure log file paths

### US-004: Project-specific rules
- [ ] Rules tied to project paths
- [ ] Rule templates for common patterns
- [ ] Priority ordering for overlapping rules
- [ ] Test rule before enabling

---

## Technical Approach

```typescript
interface ContextInjectionRule {
  id: string;
  name: string;
  enabled: boolean;
  projectPath?: string; // If set, only applies to this project
  trigger: InjectionTrigger;
  source: ContextSource;
  tokenBudget: number;
  priority: number;
}

type InjectionTrigger =
  | { type: 'always' }
  | { type: 'first_message' }
  | { type: 'keyword'; keywords: string[] }
  | { type: 'tool_use'; tools: string[] };

type ContextSource =
  | { type: 'file'; paths: string[] }
  | { type: 'git_commits'; count: number }
  | { type: 'git_diff' }
  | { type: 'log_file'; path: string; lines: number }
  | { type: 'command'; command: string };

class ContextInjector {
  async getInjectedContext(
    message: string,
    session: Session,
    rules: ContextInjectionRule[]
  ): Promise<InjectedContext[]> {
    const triggered = rules.filter(rule =>
      rule.enabled && this.matchesTrigger(rule.trigger, message, session)
    );

    // Sort by priority, respect token budget
    triggered.sort((a, b) => a.priority - b.priority);

    let remainingTokens = this.maxTotalTokens;
    const contexts: InjectedContext[] = [];

    for (const rule of triggered) {
      if (remainingTokens <= 0) break;

      const content = await this.fetchSource(rule.source);
      const truncated = this.truncateToTokens(content, Math.min(rule.tokenBudget, remainingTokens));

      contexts.push({ rule, content: truncated });
      remainingTokens -= this.countTokens(truncated);
    }

    return contexts;
  }
}
```

---

## Subagent Assignments

### Backend Agent
- Context injection service
- Source fetchers (file, git, logs)
- Token counting and truncation
- Rule evaluation engine

### Frontend Agent
- Rule configuration UI
- Injected context indicator
- Rule testing interface
- Token budget visualization

---

## Success Metrics

| Metric | Target |
|--------|--------|
| Projects with rules | 40% |
| Prompts with injection | 30% |
| Token savings | 20% reduction in user-typed context |

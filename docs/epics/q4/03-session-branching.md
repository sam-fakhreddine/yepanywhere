# Epic: Session Branching

**Epic ID:** Q4-003
**Priority:** P2
**Quarter:** Q4 2026
**Estimated Effort:** 4 weeks
**Status:** Planning

---

## Problem Statement

Users can't explore "what-if" scenarios by trying different approaches from the same starting point. Each experiment requires starting over or losing previous work.

**Target Outcome:** Create branches from any checkpoint to explore alternatives, with side-by-side comparison.

---

## User Stories

### US-001: Branch from checkpoint
- [ ] "Branch here" button on any checkpoint
- [ ] Creates new session from that point
- [ ] Parent-child relationship tracked
- [ ] Original session unchanged

### US-002: Branch visualization
- [ ] Tree view showing branches
- [ ] Navigate between branches
- [ ] Branch metadata (name, reason)
- [ ] Branch timestamps

### US-003: Side-by-side comparison
- [ ] Compare two branches visually
- [ ] Diff of final file states
- [ ] Cost comparison
- [ ] Outcome comparison (success/failure)

### US-004: Merge successful branch
- [ ] Apply changes from branch to main
- [ ] Resolve conflicts
- [ ] Merge annotations

---

## Technical Approach

```typescript
interface SessionBranch {
  id: string;
  sessionId: string;
  parentSessionId: string;
  branchPoint: {
    checkpointId: string;
    messageIndex: number;
  };
  name: string;
  description?: string;
  createdAt: string;
}

interface BranchTree {
  root: SessionNode;
}

interface SessionNode {
  sessionId: string;
  name: string;
  children: SessionNode[];
  branchPoint?: string;
}

class BranchManager {
  async createBranch(
    sourceSessionId: string,
    checkpointId: string,
    name: string
  ): Promise<SessionBranch> {
    const checkpoint = await this.getCheckpoint(sourceSessionId, checkpointId);
    const sourceSession = await this.getSession(sourceSessionId);

    // Create new session with state from checkpoint
    const newSession = await this.createSession({
      title: `${sourceSession.title} - ${name}`,
      projectPath: sourceSession.projectPath,
      model: sourceSession.model,
    });

    // Copy messages up to checkpoint
    const messages = await this.getMessagesUpTo(sourceSessionId, checkpoint.messageIndex);
    await this.copyMessages(newSession.id, messages);

    // Restore file state from checkpoint
    await this.restoreCheckpoint(checkpoint);

    // Record branch relationship
    const branch: SessionBranch = {
      id: generateId(),
      sessionId: newSession.id,
      parentSessionId: sourceSessionId,
      branchPoint: { checkpointId, messageIndex: checkpoint.messageIndex },
      name,
      createdAt: new Date().toISOString(),
    };

    await this.saveBranch(branch);
    return branch;
  }

  async getBranchTree(rootSessionId: string): Promise<BranchTree> {
    const branches = await this.getBranchesFrom(rootSessionId);
    return this.buildTree(rootSessionId, branches);
  }
}
```

---

## Subagent Assignments

### Backend Agent
- Branch creation from checkpoint
- Branch relationship storage
- Tree traversal queries
- File state management for branches

### Frontend Agent
- Branch tree visualization
- "Branch here" UI
- Side-by-side comparison view
- Branch navigation

---

## Success Metrics

| Metric | Target |
|--------|--------|
| Branch creation | 10% of sessions create branches |
| Comparison usage | 50% of branches compared |
| Branch success rate | 60% branches lead to better outcome |

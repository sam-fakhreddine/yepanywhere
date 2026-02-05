# Epic: Session Checkpoints and Rollback

**Epic ID:** Q2-003
**Priority:** P0
**Quarter:** Q2 2026
**Estimated Effort:** 4-5 weeks
**Status:** Planning

---

## Problem Statement

When an AI agent makes a mistake (wrong file edit, bad refactor, incorrect deletion), users have no easy way to recover:
- Must manually undo changes
- May not remember the exact state before the mistake
- Git operations may have already committed changes
- Multiple files might be affected

**Target Outcome:** Automatic and manual checkpointing that allows instant rollback to any previous state, giving users confidence to let agents work autonomously.

---

## User Stories

### US-001: Auto-checkpoint before destructive operations
**As a** developer supervising an agent
**I want to** automatic checkpoints before file writes and bash commands
**So that** I can always recover if something goes wrong

**Acceptance Criteria:**
- [ ] Checkpoint created before: Edit, Write, Bash, NotebookEdit
- [ ] Checkpoint includes: affected files, full content, git state
- [ ] Checkpoint creation is fast (<100ms for typical operations)
- [ ] Checkpoints stored locally with session
- [ ] Checkpoint indicator shown in session timeline
- [ ] Auto-checkpoints can be disabled in settings

### US-002: Manual checkpoint creation
**As a** developer at a good stopping point
**I want to** create a named checkpoint
**So that** I can return to this exact state later

**Acceptance Criteria:**
- [ ] "Create Checkpoint" button in session toolbar
- [ ] Name/annotation field for checkpoint
- [ ] Checkpoint captures: all tracked files, git state, session position
- [ ] Confirmation with checkpoint details
- [ ] Checkpoint visible in timeline
- [ ] Maximum 50 manual checkpoints per session

### US-003: One-click rollback
**As a** developer who sees a mistake
**I want to** rollback to a previous checkpoint
**So that** I can undo the agent's changes instantly

**Acceptance Criteria:**
- [ ] "Rollback" button next to each checkpoint
- [ ] Preview of what will change before rollback
- [ ] Rollback restores: file contents, creates inverse git changes
- [ ] Conversation continues from rollback point
- [ ] Rolled-back messages marked but preserved for reference
- [ ] Confirmation dialog for rollbacks affecting multiple files

### US-004: Diff view between checkpoints
**As a** developer reviewing changes
**I want to** see the diff between two checkpoints
**So that** I can understand what changed

**Acceptance Criteria:**
- [ ] Select two checkpoints to compare
- [ ] Unified or side-by-side diff view
- [ ] File list showing changed files
- [ ] Navigate between file diffs
- [ ] Syntax highlighting in diff view
- [ ] Copy individual changes

### US-005: Checkpoint annotations
**As a** developer creating strategic checkpoints
**I want to** add notes to checkpoints
**So that** I remember why I created them

**Acceptance Criteria:**
- [ ] Add/edit annotation on any checkpoint
- [ ] Annotations searchable
- [ ] Auto-generated description for auto-checkpoints
- [ ] Show annotation in timeline and rollback dialog
- [ ] Export annotations with session

---

## Technical Approach

### Architecture

```
┌─────────────────────────────────────────────────────────┐
│                 Checkpoint System                        │
├─────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐ │
│  │ Checkpoint  │  │ Storage     │  │ Rollback        │ │
│  │ Manager     │  │ Engine      │  │ Engine          │ │
│  │             │  │             │  │                 │ │
│  │ - create    │  │ - files     │  │ - restore       │ │
│  │ - list      │  │ - git       │  │ - inverse ops   │ │
│  │ - prune     │  │ - compress  │  │ - verify        │ │
│  └─────────────┘  └─────────────┘  └─────────────────┘ │
│         │                │                │             │
│         └────────────────┼────────────────┘             │
│                          ▼                              │
│               ┌─────────────────┐                       │
│               │ File Watcher    │                       │
│               │ (tracks changes)│                       │
│               └─────────────────┘                       │
└─────────────────────────────────────────────────────────┘
```

### Data Model

```typescript
interface Checkpoint {
  id: string;
  sessionId: string;
  type: 'auto' | 'manual';
  name?: string;
  annotation?: string;

  // Position in conversation
  messageIndex: number;
  toolUseId?: string; // Which tool triggered auto-checkpoint

  // File state
  files: CheckpointFile[];

  // Git state (if applicable)
  git?: {
    branch: string;
    commitHash: string;
    hasUncommittedChanges: boolean;
    stagedFiles: string[];
  };

  // Metadata
  createdAt: string;
  sizeBytes: number;
}

interface CheckpointFile {
  path: string;
  content: string | null; // null if file didn't exist (was created)
  encoding: 'utf-8' | 'base64'; // base64 for binary
  mode: number; // file permissions
  hash: string; // content hash for deduplication
}

interface RollbackPlan {
  checkpointId: string;
  targetCheckpointId?: string; // If comparing two
  operations: RollbackOperation[];
  affectedFiles: string[];
  warnings: string[];
}

interface RollbackOperation {
  type: 'restore' | 'delete' | 'create';
  path: string;
  content?: string;
  fromContent?: string; // For diff display
}
```

### Storage Strategy

```typescript
class CheckpointStorage {
  private baseDir: string;

  constructor(sessionId: string) {
    // Store checkpoints alongside session data
    this.baseDir = path.join(dataDir, 'checkpoints', sessionId);
  }

  async storeCheckpoint(checkpoint: Checkpoint): Promise<void> {
    // Store metadata
    const metaPath = path.join(this.baseDir, `${checkpoint.id}.meta.json`);
    await fs.writeFile(metaPath, JSON.stringify({
      ...checkpoint,
      files: checkpoint.files.map(f => ({ ...f, content: undefined, hash: f.hash })),
    }));

    // Store file contents (deduplicated by hash)
    for (const file of checkpoint.files) {
      if (file.content === null) continue;

      const contentPath = path.join(this.baseDir, 'blobs', file.hash);
      if (!await exists(contentPath)) {
        await fs.writeFile(contentPath, file.content);
      }
    }
  }

  async loadCheckpoint(id: string): Promise<Checkpoint> {
    const metaPath = path.join(this.baseDir, `${id}.meta.json`);
    const meta = JSON.parse(await fs.readFile(metaPath, 'utf-8'));

    // Load file contents
    const files = await Promise.all(meta.files.map(async (f: CheckpointFile) => {
      if (f.hash === 'deleted') return { ...f, content: null };
      const contentPath = path.join(this.baseDir, 'blobs', f.hash);
      const content = await fs.readFile(contentPath, 'utf-8');
      return { ...f, content };
    }));

    return { ...meta, files };
  }

  async pruneOldCheckpoints(maxAge: number, maxCount: number): Promise<void> {
    // Keep important checkpoints (manual, recent)
    // Prune old auto-checkpoints
    // Garbage collect orphaned blobs
  }
}
```

### Auto-Checkpoint Integration

```typescript
// Intercept tool execution in Supervisor
class CheckpointInterceptor {
  private checkpointManager: CheckpointManager;

  async beforeToolExecution(
    session: Session,
    tool: string,
    input: unknown
  ): Promise<void> {
    const destructiveTools = ['Edit', 'Write', 'Bash', 'NotebookEdit'];

    if (destructiveTools.includes(tool)) {
      const affectedPaths = this.getAffectedPaths(tool, input);
      await this.checkpointManager.createAutoCheckpoint(session, {
        toolName: tool,
        affectedPaths,
        description: this.generateDescription(tool, input),
      });
    }
  }

  private getAffectedPaths(tool: string, input: unknown): string[] {
    switch (tool) {
      case 'Edit':
      case 'Write':
        return [(input as { file_path: string }).file_path];
      case 'Bash':
        // Parse bash command to find affected files
        return this.parseBashAffectedFiles((input as { command: string }).command);
      case 'NotebookEdit':
        return [(input as { notebook_path: string }).notebook_path];
      default:
        return [];
    }
  }
}
```

### Rollback Engine

```typescript
class RollbackEngine {
  async createRollbackPlan(
    session: Session,
    targetCheckpoint: Checkpoint
  ): Promise<RollbackPlan> {
    const currentFiles = await this.getCurrentFileStates(targetCheckpoint.files.map(f => f.path));

    const operations: RollbackOperation[] = [];
    const warnings: string[] = [];

    for (const targetFile of targetCheckpoint.files) {
      const currentFile = currentFiles.find(f => f.path === targetFile.path);

      if (targetFile.content === null) {
        // File should not exist after rollback (was created after checkpoint)
        if (currentFile) {
          operations.push({
            type: 'delete',
            path: targetFile.path,
            fromContent: currentFile.content,
          });
        }
      } else if (!currentFile || currentFile.content === null) {
        // File should exist but currently doesn't (was deleted after checkpoint)
        operations.push({
          type: 'create',
          path: targetFile.path,
          content: targetFile.content,
        });
      } else if (currentFile.content !== targetFile.content) {
        // File exists but content differs
        operations.push({
          type: 'restore',
          path: targetFile.path,
          content: targetFile.content,
          fromContent: currentFile.content,
        });
      }
    }

    // Check for uncommitted git changes
    if (targetCheckpoint.git && await this.hasUncommittedChanges()) {
      warnings.push('You have uncommitted git changes that may conflict with rollback');
    }

    return {
      checkpointId: targetCheckpoint.id,
      operations,
      affectedFiles: operations.map(o => o.path),
      warnings,
    };
  }

  async executeRollback(plan: RollbackPlan): Promise<void> {
    // Execute in transaction-like manner
    const executed: RollbackOperation[] = [];

    try {
      for (const op of plan.operations) {
        await this.executeOperation(op);
        executed.push(op);
      }
    } catch (error) {
      // Attempt to undo partial rollback
      await this.undoOperations(executed);
      throw error;
    }
  }
}
```

### API Endpoints

```
GET    /api/sessions/:id/checkpoints           # List checkpoints
POST   /api/sessions/:id/checkpoints           # Create manual checkpoint
GET    /api/sessions/:id/checkpoints/:cid      # Get checkpoint details
PUT    /api/sessions/:id/checkpoints/:cid      # Update annotation
DELETE /api/sessions/:id/checkpoints/:cid      # Delete checkpoint
GET    /api/sessions/:id/checkpoints/:cid/diff # Diff with current state
GET    /api/sessions/:id/checkpoints/:a/diff/:b # Diff between checkpoints
POST   /api/sessions/:id/checkpoints/:cid/rollback # Execute rollback
GET    /api/sessions/:id/checkpoints/:cid/rollback/preview # Preview rollback
```

---

## Dependencies

| Dependency | Type | Status | Notes |
|------------|------|--------|-------|
| Supervisor tool interception | Internal | Exists | Add checkpoint hook |
| File system access | Internal | Exists | For file capture |
| Git integration | External | Optional | For git state capture |
| Diff library (diff) | External | New | For diff generation |
| Session storage | Internal | Exists | Extend for checkpoints |

---

## Subagent Assignments

### Backend Agent
**Expertise:** Node.js, TypeScript, file systems, git
**Tasks:**
1. Implement CheckpointManager with create/list/prune
2. Build CheckpointStorage with content deduplication
3. Create RollbackEngine with transaction safety
4. Add checkpoint interception to Supervisor
5. Implement checkpoint diff generation
6. Create checkpoint API endpoints

**Deliverables:**
- `packages/server/src/checkpoint/` directory
- Supervisor integration
- API routes

### Frontend Agent
**Expertise:** React, TypeScript, timeline UI, diff visualization
**Tasks:**
1. Build checkpoint timeline component
2. Create checkpoint creation dialog
3. Implement rollback preview and confirmation
4. Build diff viewer with syntax highlighting
5. Add checkpoint indicators to message timeline
6. Create checkpoint management panel

**Deliverables:**
- `packages/client/src/components/checkpoint/`
- Checkpoint timeline in session view
- Diff viewer component

### Storage Agent
**Expertise:** Data storage optimization, compression, cleanup
**Tasks:**
1. Design efficient checkpoint storage schema
2. Implement content-addressed blob storage
3. Create garbage collection for orphaned blobs
4. Implement checkpoint pruning strategies
5. Optimize for fast checkpoint creation

**Deliverables:**
- Storage schema documentation
- Pruning algorithm
- Performance benchmarks

### QA Agent
**Expertise:** Data integrity testing, rollback testing
**Tasks:**
1. Test rollback across file types (text, binary, notebooks)
2. Test partial rollback scenarios
3. Test checkpoint storage limits
4. Verify data integrity after rollback
5. Test git state handling

**Deliverables:**
- Data integrity test suite
- Rollback edge case tests
- Stress test results

---

## Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Checkpoint creation time | <100ms for 10 files | Performance profiling |
| Rollback success rate | >99% | Error tracking |
| Rollback usage | 10% of sessions use rollback | Analytics |
| Manual checkpoint creation | 20% of sessions | Analytics |
| Recovery time (rollback) | <2 seconds | Timestamp measurement |

---

## Risks & Mitigations

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Storage explosion | High | Medium | Pruning, deduplication, limits |
| Slow checkpoint creation | High | Medium | Async capture, incremental |
| Incomplete rollback | High | Low | Transaction pattern, verification |
| Binary file handling | Medium | Medium | Base64 encoding, size limits |
| Git conflicts | Medium | Medium | Warn user, don't auto-commit |

---

## Open Questions

1. Should we integrate with git for checkpoint storage (stash-like)?
2. How do we handle checkpoints for files outside the project?
3. Should rollback affect the conversation or just files?
4. Do we need "checkpoint branches" for exploration?

---

## References

- Git internals: https://git-scm.com/book/en/v2/Git-Internals-Git-Objects
- Content-addressable storage: https://en.wikipedia.org/wiki/Content-addressable_storage
- Operational transformation: https://en.wikipedia.org/wiki/Operational_transformation

# Epic: Approval Rule Engine

**Epic ID:** Q1-001
**Priority:** P0
**Quarter:** Q1 2026
**Estimated Effort:** 2-3 weeks
**Status:** Planning

---

## Problem Statement

Users are overwhelmed by approval requests from Claude Code agents. Every tool invocation (Read, Edit, Bash, Grep, etc.) requires manual approval, creating "approval fatigue" that:
- Interrupts workflow with constant notifications
- Slows down agent execution significantly
- Causes users to approve without reviewing (dangerous)
- Makes mobile supervision impractical due to volume

**Target Outcome:** Reduce approval requests by 60-80% through intelligent auto-approval rules while maintaining security for dangerous operations.

---

## User Stories

### US-001: Auto-approve read-only operations
**As a** developer supervising an agent from my phone
**I want to** auto-approve all read-only operations (Read, Grep, Glob)
**So that** I only get notified for operations that can modify my codebase

**Acceptance Criteria:**
- [ ] User can enable "auto-approve read-only" toggle in settings
- [ ] Read, Grep, Glob, and LS operations are auto-approved when enabled
- [ ] Auto-approved operations still appear in session history (grayed out)
- [ ] User can see count of auto-approved operations in session header

### US-002: Tool-specific approval rules
**As a** power user with specific workflow needs
**I want to** create rules like "auto-approve Edit for *.md files"
**So that** I can customize approvals based on my project structure

**Acceptance Criteria:**
- [ ] User can create rules with tool + file pattern conditions
- [ ] Supported conditions: tool name, file extension, file path glob, directory
- [ ] Rules can be ordered by priority (first match wins)
- [ ] Rules can be enabled/disabled without deletion
- [ ] Rule editor validates patterns before saving

### US-003: Project-level rule templates
**As a** developer working on multiple projects
**I want to** apply different rule sets to different projects
**So that** my security requirements match each project's sensitivity

**Acceptance Criteria:**
- [ ] User can create named rule templates (e.g., "Security Audit", "Documentation")
- [ ] Templates can be assigned to projects
- [ ] Projects without templates use global default rules
- [ ] Templates can be exported/imported as JSON
- [ ] Built-in starter templates provided

### US-004: Quick "always allow this" from approval prompt
**As a** user who just approved a common operation
**I want to** quickly create a rule from the approval screen
**So that** I don't have to manually navigate to settings

**Acceptance Criteria:**
- [ ] Approval prompt shows "Always allow" option alongside Approve/Deny
- [ ] "Always allow" creates a rule matching the exact operation
- [ ] User can choose scope: this session, this project, or global
- [ ] Toast confirms rule creation with undo option
- [ ] New rule appears in rules list immediately

### US-005: Dangerous operation safeguards
**As a** user concerned about security
**I want to** ensure certain operations always require approval
**So that** auto-approval can't accidentally approve destructive commands

**Acceptance Criteria:**
- [ ] System maintains a "protected operations" list (rm -rf, git push --force, etc.)
- [ ] Protected operations always require approval regardless of rules
- [ ] User can view but not disable protected operations
- [ ] User can add custom patterns to protected list
- [ ] Bash commands with pipes or redirects require extra scrutiny

---

## Technical Approach

### Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Approval Service                      │
├─────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐ │
│  │ Rule Engine │  │ Rule Store  │  │ Protected Ops   │ │
│  │             │  │             │  │ Registry        │ │
│  │ - evaluate  │  │ - CRUD      │  │                 │ │
│  │ - match     │  │ - templates │  │ - rm -rf        │ │
│  │ - priority  │  │ - import    │  │ - git push -f   │ │
│  └─────────────┘  └─────────────┘  └─────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

### Data Model

```typescript
interface ApprovalRule {
  id: string;
  name: string;
  enabled: boolean;
  priority: number;
  conditions: RuleCondition[];
  action: 'auto_approve' | 'always_deny' | 'require_approval';
  scope: 'global' | 'project';
  projectId?: string;
  createdAt: string;
  updatedAt: string;
}

interface RuleCondition {
  type: 'tool' | 'file_extension' | 'file_path' | 'directory' | 'bash_pattern';
  operator: 'equals' | 'matches' | 'contains' | 'starts_with';
  value: string;
  negate?: boolean;
}

interface ApprovalRuleTemplate {
  id: string;
  name: string;
  description: string;
  rules: Omit<ApprovalRule, 'id' | 'createdAt' | 'updatedAt'>[];
  builtIn: boolean;
}
```

### Key Implementation Details

1. **Rule Evaluation Order:**
   - Check protected operations first (always require approval)
   - Evaluate user rules by priority (highest first)
   - First matching rule determines action
   - Default to require approval if no rules match

2. **File Pattern Matching:**
   - Use micromatch for glob patterns
   - Support negation patterns (e.g., `!*.test.ts`)
   - Case-insensitive matching on Windows

3. **Bash Command Analysis:**
   - Parse bash commands to extract base command and flags
   - Identify dangerous patterns (rm, chmod, chown, dd, etc.)
   - Flag commands with pipes, redirects, or command substitution

4. **Performance Considerations:**
   - Cache compiled regex patterns
   - Evaluate rules in memory (no async I/O per approval)
   - Limit to 100 rules per project for performance

### API Endpoints

```
GET    /api/approval-rules              # List all rules
POST   /api/approval-rules              # Create rule
PUT    /api/approval-rules/:id          # Update rule
DELETE /api/approval-rules/:id          # Delete rule
POST   /api/approval-rules/reorder      # Reorder rules
GET    /api/approval-rules/templates    # List templates
POST   /api/approval-rules/templates/:id/apply  # Apply template
POST   /api/approval-rules/evaluate     # Test rule against operation
```

### UI Components

1. **Rules Management Page** (`/settings/approval-rules`)
   - Draggable list for reordering
   - Inline enable/disable toggle
   - Quick edit mode
   - Template selector

2. **Rule Editor Modal**
   - Condition builder with dropdowns
   - Pattern tester with live preview
   - Scope selector (global/project)

3. **Enhanced Approval Prompt**
   - "Always allow" button with scope picker
   - Shows which rule would have matched
   - "Why was this shown?" explainer

---

## Dependencies

| Dependency | Type | Status | Notes |
|------------|------|--------|-------|
| Session metadata storage | Internal | Exists | Need to add rules field |
| Tool use interception | Internal | Exists | Modify approval flow |
| micromatch library | External | New | Add to package.json |
| Settings UI framework | Internal | Exists | Extend for rules page |

---

## Subagent Assignments

### Backend Agent
**Expertise:** Node.js, TypeScript, Hono, data modeling
**Tasks:**
1. Design and implement ApprovalRule data model
2. Create RuleEngine class with evaluation logic
3. Implement CRUD API endpoints for rules
4. Add protected operations registry
5. Write unit tests for rule evaluation (edge cases critical)
6. Implement bash command parser for dangerous pattern detection

**Deliverables:**
- `packages/server/src/approval/` directory with all rule engine code
- API routes in `packages/server/src/routes/approval-rules.ts`
- Unit tests with >90% coverage on rule evaluation

### Frontend Agent
**Expertise:** React, TypeScript, TailwindCSS, mobile-first UI
**Tasks:**
1. Create Rules Management page with drag-and-drop reordering
2. Build Rule Editor modal with condition builder
3. Enhance approval prompt with "Always allow" option
4. Add rule indicator to session history
5. Implement template selector and preview
6. Mobile-optimized responsive design

**Deliverables:**
- `packages/client/src/pages/ApprovalRules.tsx`
- `packages/client/src/components/approval/` directory
- Integration with existing approval flow

### QA Agent
**Expertise:** Test planning, edge cases, security testing
**Tasks:**
1. Create test matrix for rule combinations
2. Test protected operations bypass attempts
3. Verify rule priority ordering
4. Test pattern matching edge cases (unicode, special chars)
5. Mobile usability testing
6. Performance testing with 100+ rules

**Deliverables:**
- Test plan document
- E2E tests for critical flows
- Bug reports with reproduction steps

---

## Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Approval requests per session | -70% | Compare before/after with rules enabled |
| Time to approve (when needed) | <5 seconds | P95 from notification to approval |
| Rule creation adoption | 60% of users create 1+ rule | Analytics event tracking |
| Auto-approved operation visibility | 100% | All auto-approvals logged |
| Zero security bypasses | 0 | Protected ops always require approval |

---

## Risks & Mitigations

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Rules too complex for users | High | Medium | Start with simple presets, progressive disclosure |
| Performance degradation with many rules | Medium | Low | Limit rules, cache patterns |
| Security bypass via pattern | High | Low | Conservative protected ops list, security review |
| Rules don't sync across devices | Medium | Medium | Store in session metadata, sync via server |

---

## Open Questions

1. Should rules apply to specific agent models differently?
2. How do we handle rule conflicts between project and global scope?
3. Should we provide a "learning mode" that suggests rules based on approval history?
4. Do we need audit logging for rule changes?

---

## References

- Product Roadmap: PRODUCT_ROADMAP.md
- Existing approval flow: `packages/server/src/supervisor/approval.ts`
- User research on approval fatigue: `docs/research/user-personas-and-research.md`

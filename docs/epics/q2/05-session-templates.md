# Epic: Session Templates and Presets

**Epic ID:** Q2-005
**Priority:** P1
**Quarter:** Q2 2026
**Estimated Effort:** 3 weeks
**Status:** Planning

---

## Problem Statement

Power users create sessions with similar configurations repeatedly:
- Same model selection for specific task types
- Same approval rules for certain projects
- Same initial prompts for recurring workflows
- Same tool configurations

Setting up each session manually wastes time and risks inconsistency.

**Target Outcome:** Save and reuse session configurations as templates, reducing session setup time by 80%.

---

## User Stories

### US-001: Create template from session
**As a** developer who configured a session perfectly
**I want to** save this configuration as a template
**So that** I can reuse it for similar tasks

**Acceptance Criteria:**
- [ ] "Save as Template" option in session menu
- [ ] Template captures: model, approval rules, initial prompt, tools
- [ ] Name and describe the template
- [ ] Template saved to user's template library
- [ ] Confirmation with template preview

### US-002: Start session from template
**As a** developer starting a new task
**I want to** select a template when creating a session
**So that** I get my preferred configuration instantly

**Acceptance Criteria:**
- [ ] Template picker in new session dialog
- [ ] Templates organized by category
- [ ] Preview of template configuration
- [ ] Apply template with one click
- [ ] Option to modify template settings before starting
- [ ] Recently used templates highlighted

### US-003: Built-in starter templates
**As a** new user learning best practices
**I want to** access pre-built templates
**So that** I can start with recommended configurations

**Acceptance Criteria:**
- [ ] "Security Audit" - read-heavy, approval-strict
- [ ] "Code Review" - read-only mode, comment generation
- [ ] "Documentation Writer" - auto-approve markdown
- [ ] "Bug Fix" - balanced approvals, testing focus
- [ ] "Refactoring" - checkpoint-heavy, cautious approvals
- [ ] Templates marked as "Built-in"

### US-004: Template management
**As a** user with many templates
**I want to** organize and manage my templates
**So that** I can find the right one quickly

**Acceptance Criteria:**
- [ ] List view of all templates
- [ ] Edit template name, description, configuration
- [ ] Duplicate template
- [ ] Delete template (with confirmation)
- [ ] Search and filter templates
- [ ] Categories/tags for organization

### US-005: Share templates
**As a** team member with a good template
**I want to** share it with colleagues
**So that** we use consistent configurations

**Acceptance Criteria:**
- [ ] Export template as JSON file
- [ ] Import template from JSON
- [ ] Shareable template link (future)
- [ ] Template version tracking
- [ ] Import validates template format

---

## Technical Approach

### Data Model

```typescript
interface SessionTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  builtIn: boolean;

  // Session configuration
  config: {
    model: string;
    systemPrompt?: string;
    initialPrompt?: string;
    approvalRules: ApprovalRule[];
    toolConfig: {
      enabledTools: string[];
      toolOptions: Record<string, unknown>;
    };
    checkpointPolicy: {
      autoCheckpoint: boolean;
      checkpointOnEdit: boolean;
    };
  };

  // Metadata
  createdAt: string;
  updatedAt: string;
  usageCount: number;
  lastUsedAt?: string;
}

interface TemplateCategory {
  id: string;
  name: string;
  description: string;
  icon: string;
  order: number;
}
```

### Built-in Templates

```typescript
const BUILT_IN_TEMPLATES: SessionTemplate[] = [
  {
    id: 'security-audit',
    name: 'Security Audit',
    description: 'Read-heavy configuration for security reviews. Requires approval for any modifications.',
    category: 'security',
    builtIn: true,
    config: {
      model: 'claude-sonnet-4-20250514',
      systemPrompt: 'You are a security auditor. Focus on identifying vulnerabilities, insecure patterns, and potential attack vectors.',
      approvalRules: [
        { tool: 'Read', action: 'auto_approve' },
        { tool: 'Grep', action: 'auto_approve' },
        { tool: 'Glob', action: 'auto_approve' },
        { tool: 'Edit', action: 'require_approval' },
        { tool: 'Bash', action: 'require_approval' },
      ],
      toolConfig: {
        enabledTools: ['Read', 'Grep', 'Glob', 'Edit', 'Bash'],
        toolOptions: {},
      },
      checkpointPolicy: {
        autoCheckpoint: true,
        checkpointOnEdit: true,
      },
    },
  },
  {
    id: 'documentation-writer',
    name: 'Documentation Writer',
    description: 'Auto-approves markdown edits. Ideal for README updates and docs.',
    category: 'documentation',
    builtIn: true,
    config: {
      model: 'claude-haiku-3-5-20241022',
      systemPrompt: 'You are a technical writer. Create clear, concise documentation.',
      approvalRules: [
        { tool: 'Read', action: 'auto_approve' },
        { tool: 'Edit', filePattern: '*.md', action: 'auto_approve' },
        { tool: 'Edit', filePattern: '*.mdx', action: 'auto_approve' },
        { tool: 'Write', filePattern: '*.md', action: 'auto_approve' },
      ],
      toolConfig: {
        enabledTools: ['Read', 'Grep', 'Edit', 'Write'],
        toolOptions: {},
      },
      checkpointPolicy: {
        autoCheckpoint: false,
        checkpointOnEdit: false,
      },
    },
  },
  // ... more built-in templates
];
```

### Template Service

```typescript
class TemplateService {
  async getTemplates(): Promise<SessionTemplate[]> {
    const userTemplates = await this.storage.getTemplates();
    return [...BUILT_IN_TEMPLATES, ...userTemplates];
  }

  async createFromSession(session: Session, meta: { name: string; description: string }): Promise<SessionTemplate> {
    const template: SessionTemplate = {
      id: generateId(),
      name: meta.name,
      description: meta.description,
      category: 'custom',
      builtIn: false,
      config: {
        model: session.model,
        systemPrompt: session.systemPrompt,
        approvalRules: session.approvalRules,
        toolConfig: session.toolConfig,
        checkpointPolicy: session.checkpointPolicy,
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      usageCount: 0,
    };

    await this.storage.saveTemplate(template);
    return template;
  }

  async applyTemplate(template: SessionTemplate): Promise<SessionConfig> {
    // Increment usage
    await this.storage.incrementUsage(template.id);

    return {
      model: template.config.model,
      systemPrompt: template.config.systemPrompt,
      initialPrompt: template.config.initialPrompt,
      approvalRules: template.config.approvalRules,
      toolConfig: template.config.toolConfig,
      checkpointPolicy: template.config.checkpointPolicy,
    };
  }

  async exportTemplate(templateId: string): Promise<string> {
    const template = await this.getTemplate(templateId);
    return JSON.stringify(template, null, 2);
  }

  async importTemplate(json: string): Promise<SessionTemplate> {
    const parsed = JSON.parse(json);
    this.validateTemplate(parsed);

    const imported: SessionTemplate = {
      ...parsed,
      id: generateId(), // New ID to avoid conflicts
      builtIn: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      usageCount: 0,
    };

    await this.storage.saveTemplate(imported);
    return imported;
  }
}
```

### API Endpoints

```
GET    /api/templates                    # List all templates
POST   /api/templates                    # Create template
GET    /api/templates/:id                # Get template
PUT    /api/templates/:id                # Update template
DELETE /api/templates/:id                # Delete template
POST   /api/templates/:id/duplicate      # Duplicate template
POST   /api/sessions/from-template/:id   # Create session from template
```

---

## Dependencies

| Dependency | Type | Status | Notes |
|------------|------|--------|-------|
| Session configuration | Internal | Exists | Extract current config |
| Approval rules (Q1) | Internal | Q1 | Templates include rules |
| Local storage | Internal | Exists | For template storage |
| JSON schema validation | External | New | For import validation |

---

## Subagent Assignments

### Backend Agent
**Expertise:** Node.js, TypeScript, data modeling
**Tasks:**
1. Design template data model
2. Create template CRUD service
3. Implement built-in template library
4. Add import/export functionality
5. Create session-from-template endpoint

**Deliverables:**
- `packages/server/src/templates/`
- Built-in template definitions
- API routes

### Frontend Agent
**Expertise:** React, TypeScript, forms, UX
**Tasks:**
1. Build template picker component
2. Create "Save as Template" dialog
3. Implement template management page
4. Build template preview component
5. Add template selector to new session flow

**Deliverables:**
- `packages/client/src/components/templates/`
- Template management page
- New session flow integration

### QA Agent
**Expertise:** Testing, data validation
**Tasks:**
1. Test template application accuracy
2. Test import/export round-trip
3. Test built-in templates for correctness
4. Test template with all configuration options

**Deliverables:**
- Template test suite
- Import validation tests
- Configuration verification

---

## Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Template adoption | 50% of sessions use templates | Analytics |
| Setup time reduction | 80% faster with template | Time comparison |
| Built-in template usage | 30% use built-ins | Template analytics |
| Custom template creation | 40% of users create 1+ | User analytics |

---

## References

- Similar: VS Code workspace templates
- Similar: Docker Compose profiles

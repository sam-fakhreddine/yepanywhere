# Epic: Agent Retry with Escalation

**Epic ID:** Q2-002
**Priority:** P0
**Quarter:** Q2 2026
**Estimated Effort:** 2-3 weeks
**Status:** Planning

---

## Problem Statement

When AI agents fail (API errors, context limits, bad outputs), users must manually:
1. Diagnose what went wrong
2. Decide whether to retry
3. Potentially adjust the prompt
4. Switch to a more capable model
5. Restart the conversation

This manual recovery process is frustrating and time-consuming.

**Target Outcome:** Intelligent automatic retry with optional escalation to more capable models, reducing manual intervention for recoverable errors.

---

## User Stories

### US-001: Automatic retry for transient errors
**As a** developer whose agent hit an API error
**I want to** the system to automatically retry
**So that** temporary failures don't interrupt my work

**Acceptance Criteria:**
- [ ] Auto-retry on 429 (rate limit), 500, 502, 503, 504 errors
- [ ] Exponential backoff (1s, 2s, 4s, 8s, max 30s)
- [ ] Maximum 3 retry attempts
- [ ] User notified of retry in progress
- [ ] Retry count shown in session
- [ ] Can disable auto-retry in settings

### US-002: Retry with enhanced context
**As a** developer whose agent produced bad output
**I want to** retry with the error included as context
**So that** the agent can learn from its mistake

**Acceptance Criteria:**
- [ ] "Retry with error context" button on failed operations
- [ ] Includes error message, stack trace, and failed output
- [ ] Agent receives clear instruction to avoid the same mistake
- [ ] Works for both API errors and logical failures
- [ ] Previous attempt preserved in history

### US-003: Escalate to more capable model
**As a** developer whose agent is struggling with a complex task
**I want to** escalate to a more capable model
**So that** difficult problems get appropriate resources

**Acceptance Criteria:**
- [ ] "Escalate to Sonnet/Opus" option after failures
- [ ] One-click escalation preserves conversation context
- [ ] Clear indication of model change in session
- [ ] Cost estimate shown before escalation
- [ ] Escalation path configurable (Haiku → Sonnet → Opus)

### US-004: Configurable retry policies
**As a** power user with specific retry needs
**I want to** configure retry behavior per project
**So that** critical projects get more aggressive retries

**Acceptance Criteria:**
- [ ] Per-project retry settings
- [ ] Configure: max retries, backoff multiplier, timeout
- [ ] Configure: which errors trigger retry
- [ ] Configure: auto-escalation threshold
- [ ] Template retry policies

### US-005: Failure analytics
**As a** developer optimizing my AI workflows
**I want to** see patterns in agent failures
**So that** I can improve prompts and prevent future failures

**Acceptance Criteria:**
- [ ] Dashboard showing failure rates by type
- [ ] Most common error messages
- [ ] Failure rate by model
- [ ] Failure rate by prompt pattern
- [ ] Export failure data for analysis

---

## Technical Approach

### Architecture

```
┌─────────────────────────────────────────────────────────┐
│                  Retry & Escalation Engine               │
├─────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐ │
│  │ Error       │  │ Retry       │  │ Escalation      │ │
│  │ Classifier  │  │ Strategy    │  │ Manager         │ │
│  │             │  │             │  │                 │ │
│  │ - transient │  │ - backoff   │  │ - model ladder  │ │
│  │ - permanent │  │ - max tries │  │ - cost check    │ │
│  │ - unknown   │  │ - context   │  │ - context xfer  │ │
│  └─────────────┘  └─────────────┘  └─────────────────┘ │
│         │                │                │             │
│         └────────────────┼────────────────┘             │
│                          ▼                              │
│               ┌─────────────────┐                       │
│               │ Supervisor      │                       │
│               │ (intercepts)    │                       │
│               └─────────────────┘                       │
└─────────────────────────────────────────────────────────┘
```

### Data Model

```typescript
interface RetryPolicy {
  id: string;
  name: string;
  maxRetries: number;
  backoffBase: number; // seconds
  backoffMultiplier: number;
  maxBackoff: number; // seconds
  retryableErrors: ErrorType[];
  autoEscalate: boolean;
  escalateAfterRetries: number;
}

type ErrorType =
  | 'rate_limit'      // 429
  | 'server_error'    // 500, 502, 503, 504
  | 'timeout'         // Request timeout
  | 'context_limit'   // Token limit exceeded
  | 'content_filter'  // Content blocked
  | 'invalid_request' // 400 (usually not retryable)
  | 'auth_error'      // 401, 403 (not retryable)
  | 'unknown';

interface RetryAttempt {
  attemptNumber: number;
  error: ErrorType;
  errorMessage: string;
  timestamp: string;
  delayMs: number;
  succeeded: boolean;
}

interface EscalationRecord {
  fromModel: string;
  toModel: string;
  reason: 'manual' | 'auto_after_retries' | 'context_limit';
  timestamp: string;
  costEstimate: number;
}

interface FailureAnalytics {
  totalFailures: number;
  byErrorType: Record<ErrorType, number>;
  byModel: Record<string, number>;
  topErrorMessages: Array<{ message: string; count: number }>;
  failureRateByDay: Record<string, number>;
}
```

### Error Classification

```typescript
class ErrorClassifier {
  classify(error: unknown): { type: ErrorType; retryable: boolean; message: string } {
    if (error instanceof APIError) {
      switch (error.status) {
        case 429:
          return { type: 'rate_limit', retryable: true, message: error.message };
        case 500:
        case 502:
        case 503:
        case 504:
          return { type: 'server_error', retryable: true, message: error.message };
        case 400:
          if (error.message.includes('context_length')) {
            return { type: 'context_limit', retryable: false, message: error.message };
          }
          return { type: 'invalid_request', retryable: false, message: error.message };
        case 401:
        case 403:
          return { type: 'auth_error', retryable: false, message: error.message };
        default:
          return { type: 'unknown', retryable: false, message: error.message };
      }
    }

    if (error instanceof TimeoutError) {
      return { type: 'timeout', retryable: true, message: 'Request timed out' };
    }

    return { type: 'unknown', retryable: false, message: String(error) };
  }
}
```

### Retry Strategy Implementation

```typescript
class RetryStrategy {
  constructor(private policy: RetryPolicy) {}

  async execute<T>(
    operation: () => Promise<T>,
    onRetry?: (attempt: RetryAttempt) => void
  ): Promise<T> {
    let lastError: Error | undefined;
    const attempts: RetryAttempt[] = [];

    for (let attempt = 1; attempt <= this.policy.maxRetries + 1; attempt++) {
      try {
        return await operation();
      } catch (error) {
        const classified = errorClassifier.classify(error);

        const retryAttempt: RetryAttempt = {
          attemptNumber: attempt,
          error: classified.type,
          errorMessage: classified.message,
          timestamp: new Date().toISOString(),
          delayMs: 0,
          succeeded: false,
        };

        if (!classified.retryable || attempt > this.policy.maxRetries) {
          attempts.push(retryAttempt);
          throw error;
        }

        // Calculate backoff delay
        const delay = Math.min(
          this.policy.backoffBase * Math.pow(this.policy.backoffMultiplier, attempt - 1) * 1000,
          this.policy.maxBackoff * 1000
        );

        retryAttempt.delayMs = delay;
        attempts.push(retryAttempt);
        onRetry?.(retryAttempt);

        await sleep(delay);
        lastError = error as Error;
      }
    }

    throw lastError;
  }
}
```

### Model Escalation

```typescript
const MODEL_LADDER = [
  'claude-haiku-3-5-20241022',
  'claude-sonnet-4-20250514',
  'claude-opus-4-20250514',
];

class EscalationManager {
  getNextModel(currentModel: string): string | null {
    const currentIndex = MODEL_LADDER.indexOf(currentModel);
    if (currentIndex === -1 || currentIndex >= MODEL_LADDER.length - 1) {
      return null;
    }
    return MODEL_LADDER[currentIndex + 1];
  }

  async escalate(session: Session, reason: EscalationRecord['reason']): Promise<void> {
    const nextModel = this.getNextModel(session.model);
    if (!nextModel) {
      throw new Error('Already at most capable model');
    }

    // Estimate cost increase
    const costEstimate = this.estimateCostIncrease(session, nextModel);

    // Log escalation
    const record: EscalationRecord = {
      fromModel: session.model,
      toModel: nextModel,
      reason,
      timestamp: new Date().toISOString(),
      costEstimate,
    };

    // Update session model
    await session.updateModel(nextModel);
    await this.logEscalation(session.id, record);
  }

  private estimateCostIncrease(session: Session, newModel: string): number {
    // Based on session's average token usage and pricing difference
    const avgTokens = session.getAverageTokenUsage();
    const currentPricing = getPricing(session.model);
    const newPricing = getPricing(newModel);

    return (newPricing.outputPer1kTokens - currentPricing.outputPer1kTokens)
      * (avgTokens.output / 1000);
  }
}
```

### Enhanced Context Retry

```typescript
interface EnhancedRetryContext {
  originalPrompt: string;
  failedResponse?: string;
  errorMessage: string;
  errorType: ErrorType;
  suggestion: string;
}

function buildEnhancedRetryPrompt(context: EnhancedRetryContext): string {
  return `
Previous attempt failed with the following error:
---
Error: ${context.errorMessage}
${context.failedResponse ? `\nFailed output:\n${context.failedResponse}` : ''}
---

Please try again, avoiding the issue that caused the failure.
${context.suggestion}

Original request:
${context.originalPrompt}
`.trim();
}
```

### API Endpoints

```
GET  /api/retry-policy                    # Get default policy
PUT  /api/retry-policy                    # Update default policy
GET  /api/projects/:id/retry-policy       # Get project policy
PUT  /api/projects/:id/retry-policy       # Update project policy
POST /api/sessions/:id/retry              # Manual retry with options
POST /api/sessions/:id/escalate           # Manual escalation
GET  /api/analytics/failures              # Failure analytics
```

---

## Dependencies

| Dependency | Type | Status | Notes |
|------------|------|--------|-------|
| Supervisor/SDK integration | Internal | Exists | Add retry interceptor |
| Session model management | Internal | Exists | Support model switching |
| Cost tracking | Internal | Q1 | For escalation cost estimates |
| Settings persistence | Internal | Exists | For policy storage |
| Analytics infrastructure | Internal | Partial | Extend for failures |

---

## Subagent Assignments

### Backend Agent
**Expertise:** Node.js, TypeScript, error handling, SDK integration
**Tasks:**
1. Implement ErrorClassifier with comprehensive error mapping
2. Create RetryStrategy with configurable policies
3. Build EscalationManager with model ladder
4. Add retry/escalation events to session stream
5. Implement failure analytics aggregation
6. Create retry policy CRUD endpoints

**Deliverables:**
- `packages/server/src/retry/` directory
- Integration with Supervisor
- Failure analytics queries

### Frontend Agent
**Expertise:** React, TypeScript, UX for error states
**Tasks:**
1. Create retry progress indicator in session
2. Build "Retry with context" button/modal
3. Implement escalation confirmation dialog
4. Create retry policy settings page
5. Build failure analytics dashboard
6. Add model indicator to session header

**Deliverables:**
- Retry UI components
- Escalation dialog
- Failure analytics page

### QA Agent
**Expertise:** Error simulation, edge cases, reliability testing
**Tasks:**
1. Create test harness for simulating API errors
2. Test retry backoff timing accuracy
3. Test escalation flow end-to-end
4. Verify analytics accuracy
5. Load test retry under high failure rates

**Deliverables:**
- Error simulation test suite
- Retry timing validation
- Load test results

---

## Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Auto-retry success rate | 70% of transient errors recovered | Analytics |
| Manual intervention reduction | 50% fewer manual restarts | Session analytics |
| Escalation adoption | 30% of stuck sessions use escalation | Action tracking |
| Mean time to recovery | <30 seconds for retryable errors | Timestamp analysis |

---

## Risks & Mitigations

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Infinite retry loops | High | Low | Max retry cap, circuit breaker |
| Cost explosion from escalation | High | Medium | Cost confirmation, budget limits |
| Retry on non-retryable errors | Medium | Medium | Conservative error classification |
| Context too long after retries | Medium | Low | Truncate retry context |

---

## Open Questions

1. Should auto-escalation require user confirmation?
2. How do we handle partial success (some operations succeeded)?
3. Should we support rollback on escalation failure?
4. Do we need per-tool retry policies?

---

## References

- Exponential Backoff: https://aws.amazon.com/blogs/architecture/exponential-backoff-and-jitter/
- Circuit Breaker Pattern: https://martinfowler.com/bliki/CircuitBreaker.html
- Claude SDK Error Handling: SDK documentation

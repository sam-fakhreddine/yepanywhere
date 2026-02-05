# Epic: Local Model Gateway

**Epic ID:** Q3-009
**Priority:** P2
**Quarter:** Q3 2026
**Estimated Effort:** 3-4 weeks
**Status:** Planning

---

## Problem Statement

Privacy-conscious users and those wanting to reduce API costs have no way to use local LLMs with Yep Anywhere. All requests go to Anthropic's API.

**Target Outcome:** Connect to local LLMs (Ollama, LM Studio) with automatic routing and fallback to cloud.

---

## User Stories

### US-001: Connect local endpoints
- [ ] Configure Ollama endpoint URL
- [ ] Configure LM Studio endpoint
- [ ] Custom OpenAI-compatible endpoints
- [ ] Test connection button

### US-002: Model routing rules
- [ ] Route simple tasks to local
- [ ] Route complex tasks to cloud
- [ ] Route by token estimate
- [ ] Route by tool requirements

### US-003: Fallback behavior
- [ ] Fallback to cloud on local timeout
- [ ] Fallback on local error
- [ ] Configurable timeout
- [ ] Log fallback events

### US-004: Cost comparison
- [ ] Track local vs cloud usage
- [ ] Estimate savings
- [ ] Compare response quality (optional)

---

## Technical Approach

```typescript
interface LocalModelConfig {
  id: string;
  name: string;
  endpoint: string;
  type: 'ollama' | 'lm-studio' | 'openai-compatible';
  model: string;
  enabled: boolean;
  timeout: number;
}

interface RoutingRule {
  condition: RoutingCondition;
  target: 'local' | 'cloud';
}

type RoutingCondition =
  | { type: 'token_estimate'; maxTokens: number }
  | { type: 'tool_use'; tools: string[] }
  | { type: 'keyword'; keywords: string[] }
  | { type: 'always' };

class ModelGateway {
  async complete(request: CompletionRequest): Promise<CompletionResponse> {
    const target = this.routeRequest(request);

    if (target === 'local') {
      try {
        return await this.localComplete(request);
      } catch (error) {
        if (this.shouldFallback(error)) {
          console.log('[Gateway] Falling back to cloud');
          return this.cloudComplete(request);
        }
        throw error;
      }
    }

    return this.cloudComplete(request);
  }

  private async localComplete(request: CompletionRequest): Promise<CompletionResponse> {
    const config = this.getLocalConfig();
    const response = await fetch(`${config.endpoint}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: config.model,
        prompt: this.formatPrompt(request),
        stream: false,
      }),
      signal: AbortSignal.timeout(config.timeout),
    });

    return this.parseResponse(response);
  }
}
```

---

## Subagent Assignments

### Backend Agent
- Gateway service with routing
- Local model adapters (Ollama, LM Studio)
- Fallback logic
- Usage tracking

### Frontend Agent
- Local model configuration page
- Connection testing UI
- Routing rules editor
- Cost comparison dashboard

---

## Success Metrics

| Metric | Target |
|--------|--------|
| Local model adoption | 10% of users |
| Cloud cost savings | 30% for adopters |
| Fallback rate | <10% of local requests |

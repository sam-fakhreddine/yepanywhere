# Provider Capabilities Research

Research notes on what each AI provider offers for mobile supervision use cases.

## Summary Table

| Provider | Analysis | Edits | Edit Transparency | Real-time Supervision | Tool Approval |
|----------|----------|-------|-------------------|----------------------|---------------|
| Claude | Full | Full | Full granular events | Yes | Yes (per-tool) |
| Codex | Full | Full | Black box (edits invisible) | Partial (searches only) | No (in-chat only) |
| Codex-OSS | Full | Full (via shell) | Full (all bash commands visible) | Yes | No |
| Gemini | Full | None (read-only tools) | N/A | Yes | N/A |

## Claude

**Status: Primary provider, fully supported**

Claude Code SDK provides:
- Full tool transparency (Read, Write, Edit, Bash, Glob, Grep, LSP, etc.)
- Real-time streaming with tool_use/tool_result events
- Permission modes as first-class concept (plan, auto-edit, full-auto)
- Runtime mode switching without restarting
- DAG-based conversation history (branching support)
- Out-of-band tool approval mechanism

This is what the app was designed around. Full mobile supervision works.

## Codex (Cloud)

**Status: Supported but limited supervision**

Codex SDK provides:
- Full editing capabilities (file changes, command execution)
- Transparent shell commands (grep, etc. show up as events)
- **Opaque internal edits** - file changes happen but details not exposed via SDK
- No out-of-band approval mechanism (everything in-chat)
- No runtime permission mode switching (must kill/restart with different flags)

### Sandbox Modes

From `@openai/codex-sdk` ThreadOptions:
- `sandboxMode: "read-only"` - Analysis only, no writes
- `sandboxMode: "workspace-write"` - Can write to workspace
- `sandboxMode: "danger-full-access"` - Full system access

### Approval Policies
- `approvalPolicy: "never"` - Never ask
- `approvalPolicy: "on-failure"` - Ask when something fails

### Enterprise Theater

Codex presents itself as heavily restricted:
- Claims no network access (but npm install works fine)
- Only curls to localhost (unclear how enforced)
- Very conservative defaults

The model is capable but wrapped in enterprise liability concerns.

### Current Mapping

```typescript
if (permissionMode === "bypassPermissions") {
  sandboxMode = "danger-full-access";
  approvalPolicy = "never";
} else {
  sandboxMode = "workspace-write";
  approvalPolicy = "on-failure";
}
```

### Potential Improvement

Map `plan` mode to `sandboxMode: "read-only"` for consistent behavior across providers - all can do supervised analysis.

### Use Case Fit

- **Good for**: Fire-and-forget tasks where you'll review git diff later
- **Bad for**: Real-time supervision (can't see what edits are happening)
- **Workaround**: Use read-only mode for analysis, accept black-box edits otherwise

## Codex-OSS (Local Models)

**Status: Experimental, but surprisingly transparent**

Codex-OSS allows running local models (e.g., Mistral) through the Codex infrastructure.

### What We Know
- Can run Mistral and other local models
- **Shell-only tools** - Only has bash access, no native Edit/Write/Read tools
- All edits done via `bash -lc` with sed, cat, echo, etc.
- **Fully transparent** - Since everything goes through shell, all operations are visible

### Transparency Advantage

Ironically, Codex-OSS is MORE transparent than cloud Codex because:
- Cloud Codex: Has internal edit tools that don't emit events
- Codex-OSS: Must shell out for everything, so you see every command

This makes it actually viable for supervision - you can watch the sed/cat commands as they happen.

### Trade-offs
- Less efficient than native edit tools
- Model quality for tool use varies (Mistral may not be as good at structured tool calls)
- More verbose output (lots of bash commands)
- Potentially more error-prone (shell escaping, etc.)

### Unknown
- Performance characteristics
- How well different local models handle the shell-only constraint
- Sandbox/permission behavior differences

## Gemini

**Status: Supported for read-only analysis**

Gemini CLI (`gemini -o stream-json`) provides:
- Read-only tools only (file reading, search, grep)
- **No write tools** - cannot edit files, run destructive commands
- Full transparency (all tool use visible in stream)
- Streaming JSON output with proper events

### Event Types
- `init` - Session start
- `message` - User/assistant messages
- `tool_use` - Tool invocation
- `tool_result` - Tool execution result
- `result` - Final result with stats
- `error` - Error messages

### Session Storage
- Sessions stored as JSON files (not JSONL)
- Location: `~/.gemini/tmp/<project-hash>/chats/`
- Linear message history (no DAG)

### Use Case Fit

- **Good for**: Code exploration, bug analysis, architecture questions, planning
- **Bad for**: Any task requiring edits
- **Honest**: Unlike Codex, Gemini is upfront about being read-only

## Architectural Implications

### What Works for Mobile Supervision

1. **Claude** - Full supervision model works perfectly
2. **Gemini** - Read-only means no approvals needed, just watch
3. **Codex read-only** - Same as Gemini if we map plan mode

### What Doesn't Work

1. **Codex edits** - Can't supervise what you can't see
2. **Codex approval flow** - No out-of-band mechanism

### Recommendation

For Yep Anywhere's value proposition (mobile supervision):

1. **Claude** = Full featured, primary experience
2. **Gemini** = Research/analysis assistant
3. **Codex** = Research mode (read-only) or "fire and forget" with clear warnings
4. **Codex-OSS** = Experimental, needs more investigation

The edit transparency problem with Codex is fundamental to their architecture (internal apply-model approach). Unlikely to change unless they expose more granular events via SDK.

## References

- [Codex Security](https://developers.openai.com/codex/security/)
- [Codex SDK](https://developers.openai.com/codex/sdk/)
- [Codex CLI Reference](https://developers.openai.com/codex/cli/reference/)
- [Sandbox mode issues](https://github.com/openai/codex/issues/5202)

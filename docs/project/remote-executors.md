# Remote Executors

Run Claude sessions on remote machines over SSH, with session files synced back locally.

## Overview

**Problem**: Running Claude agents on remote machines (more compute, different environments, access to remote filesystems) currently requires installing yep-anywhere on each machine.

**Solution**: Use the SDK's `spawnClaudeCodeProcess` hook to SSH to a remote machine and run Claude there. Session files are synced back via rsync so the local yep-anywhere UI stays current.

## Assumptions

1. User has SSH config aliases set up (`~/.ssh/config`)
2. Claude CLI is installed on remote machines
3. Project paths are symmetric (`$HOME/code/project` exists on both machines)
4. Remote has valid Claude credentials (`~/.claude/.credentials.json` or `ANTHROPIC_API_KEY`)

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Local Machine                             │
│  ┌─────────────┐     ┌──────────────┐     ┌──────────────────┐  │
│  │ yep-anywhere│────▶│ ClaudeProvider│────▶│ RemoteSpawn      │  │
│  │   client    │     │              │     │ (SSH + stdio)    │  │
│  └─────────────┘     └──────────────┘     └────────┬─────────┘  │
│         ▲                                          │ SSH        │
│         │                                          ▼            │
│  ┌──────┴───────┐                         ┌──────────────────┐  │
│  │ ~/.claude/   │◀───── rsync ◀───────────│ Remote Machine   │  │
│  │  projects/   │        (after turn)     │ ~/.claude/       │  │
│  └──────────────┘                         │  projects/       │  │
│                                           │                  │  │
│                                           │ Claude CLI runs  │  │
│                                           │ here             │  │
│                                           └──────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

## Data Flow

### New Session
1. User selects project (local path) and executor (local or remote host)
2. If remote: `spawnClaudeCodeProcess` SSHs to remote, runs `claude` with same cwd
3. SDK communicates via stdin/stdout over SSH tunnel
4. After each turn (`SDKResultMessage`), rsync session files from remote to local
5. Local UI updates from synced files

### Resume Session
1. Session metadata includes `executor` field
2. Before spawning, rsync session files TO remote (in case local has newer data)
3. SSH spawn with `resume: sessionId`
4. Continue as normal

## Implementation Steps

### Phase 1: Core Infrastructure

#### 1.1 Settings Schema
Add remote executors to settings.

```typescript
// packages/shared/src/types.ts
interface Settings {
  // ... existing
  remoteExecutors?: string[];  // SSH host aliases
}
```

- Add to settings schema
- Add API endpoints: `GET/PUT /api/settings/remote-executors`

#### 1.2 Remote Spawn Implementation
Create the SSH spawn function.

```typescript
// packages/server/src/sdk/remote-spawn.ts

interface RemoteSpawnOptions {
  host: string;  // SSH alias
}

function createRemoteSpawn(options: RemoteSpawnOptions) {
  return (spawnOptions: SpawnOptions): SpawnedProcess => {
    // Build SSH command that runs claude on remote
    // Pass through env vars (especially ANTHROPIC_API_KEY if set)
    // Return ChildProcess (satisfies SpawnedProcess interface)
  };
}
```

Key considerations:
- Pass `cwd` to remote via `cd $cwd &&` prefix or SSH `-t` with shell
- Forward necessary env vars
- Handle abort signal → SSH process kill

#### 1.3 Session Sync
Implement rsync wrapper for session sync.

```typescript
// packages/server/src/sdk/session-sync.ts

interface SyncOptions {
  host: string;
  projectDir: string;  // e.g., "-home-user-project"
  direction: 'from-remote' | 'to-remote';
}

async function syncSessions(options: SyncOptions): Promise<void> {
  // rsync -az between local and remote ~/.claude/projects/{projectDir}/
}

function getProjectDirFromCwd(cwd: string): string {
  // Convert /home/user/project → -home-user-project
  // Handle hostname prefix if needed
}
```

#### 1.4 Provider Integration
Wire remote spawn into ClaudeProvider.

```typescript
// packages/server/src/sdk/providers/claude.ts

interface StartSessionOptions {
  // ... existing
  executor?: string;  // undefined = local, otherwise SSH host
}

// In startSession():
if (options.executor) {
  sdkOptions.spawnClaudeCodeProcess = createRemoteSpawn({
    host: options.executor
  });
}

// After turn completion:
if (options.executor && message.type === 'result') {
  await syncSessions({
    host: options.executor,
    projectDir: getProjectDirFromCwd(options.cwd),
    direction: 'from-remote',
  });
}
```

### Phase 2: Session Metadata & Resume

#### 2.1 Track Executor in Session Metadata
Store which executor ran a session.

```typescript
// packages/server/src/sessions/metadata.ts
interface SessionMetadata {
  // ... existing
  executor?: string;  // SSH host, undefined = local
}
```

- Save executor when session starts
- Load executor when resuming

#### 2.2 Resume Flow
Handle resume for remote sessions.

```typescript
// In startSession() with resume:
if (savedMetadata.executor) {
  // Sync session files TO remote first
  await syncSessions({
    host: savedMetadata.executor,
    projectDir,
    direction: 'to-remote',
  });

  // Then spawn remotely with resume
  options.executor = savedMetadata.executor;
}
```

### Phase 3: UI

#### 3.1 Settings UI
Add remote executors management to settings page.

- List configured executors
- Add/remove executor (text input for SSH alias)
- Optional: "Test connection" button

#### 3.2 New Session Form
Add executor selection to new session form.

- Dropdown: "Run on" with options: Local, [configured remotes...]
- Default to "Local"
- Remember last selection per project?

#### 3.3 Session List
Indicate remote sessions in session list.

- Show executor badge/icon for remote sessions
- Tooltip with host name

## Error Handling

### SSH Connection Failures
- Detect SSH errors (connection refused, auth failed, timeout)
- Surface clear error message to user
- Don't leave session in broken state

### Remote Claude Not Found
- Detect "command not found" errors
- Suggest: "Claude CLI not installed on {host}"

### Path Not Found on Remote
- Detect "directory not found" errors
- Suggest: "Path {cwd} doesn't exist on {host}"

### Rsync Failures
- Log but don't fail the session
- Surface warning in UI: "Session sync failed, local view may be stale"
- Retry on next turn

### SSH Disconnects Mid-Session
- SSH process exits unexpectedly
- Treat like local process crash
- Session can be resumed (files still on remote)

## Future Enhancements

1. **Periodic sync during long turns** - Poll rsync every N seconds while turn is in progress
2. **Remote project browser** - Browse/autocomplete paths on remote via SSH
3. **Auto-install Claude CLI** - Detect missing CLI and offer to install
4. **Connection pooling** - Reuse SSH connections for multiple operations
5. **Remote credentials** - Pass API key from local to remote if not configured there
6. **Different paths** - Support mapping local path to different remote path

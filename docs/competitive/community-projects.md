# Community Projects

Smaller projects shared on r/ClaudeAI and similar forums. These range from polished tools to weekend hacks, showing the breadth of approaches in this space.

## Notable Projects

### AgentOS
**GitHub:** https://github.com/saadnvd1/agent-os
**Status:** Active (208 commits, v0.1.0 Jan 2026)

Mobile-first web interface with strong feature set:
- Multi-agent: Claude, Codex, OpenCode, Gemini, Aider, Cursor
- Git worktree support for isolated branches
- Multi-pane terminal (up to 4 sessions)
- Code search with syntax highlighting
- Git integration (status, diffs, commits, PRs)
- MCP orchestration
- Desktop apps via Tauri

Tech: TypeScript, Next.js, Tauri

**Note:** More polished than typical community project. Has commercial cloud version.

---

### Termly CLI
**GitHub:** https://github.com/termly-dev/termly-cli
**Status:** Active (v1.7)

Universal PTY wrapper for any terminal AI tool:
- Works with 20+ AI assistants (not just Claude)
- E2E encryption (AES-256-GCM, Diffie-Hellman)
- Session management with auto-reconnect
- Prebuilt binaries for all platforms
- 100KB circular buffer for session resumption

Tech: Node.js, WebSocket, node-pty

---

### Obsidian Claude Anywhere
**GitHub:** https://github.com/derek-larson14/obsidian-claude-anywhere
**Status:** Active (v1.0.9, 36 commits)

Obsidian plugin with embedded relay:
- Full terminal access via xterm.js
- Skill commands (/morning, /mail, /voice)
- Session resumption via /resume
- File editing across Mac filesystem
- Tailscale networking

Tech: JavaScript, Python relay (embedded), xterm.js

**Note:** Has the terminal page feature HAPI has.

---

### Geoff
**GitHub:** https://github.com/belgradGoat/Geoff
**Status:** Early (18 commits, Jan 2026)

"Side projects while you're at work" framing:
- Multi-agent: Claude Code, OpenAI Codex
- Supabase for task sync
- Tailscale networking
- File browsing from phone

Tech: Python backend, TypeScript/React frontend, Supabase

---

### VSClaude WebApp
**GitHub:** https://github.com/khyun1109/vscode_claude_webapp
**Status:** Early (2 commits)

Scrapes VS Code via Chrome DevTools Protocol:
- Real-time monitoring via HTML snapshots
- Multi-tab session support
- Push notifications
- Auto-edit mode toggle

Tech: Node.js, Express, WebSocket, Chrome DevTools Protocol

**Note:** Fragile approach but shows demand for the use case.

---

### Moshi
**Website:** https://getmoshi.app/
**Status:** Beta (free during beta, iOS App Store)

Mobile terminal specifically for AI coding agents:
- Uses Mosh protocol for network resilience (survives connection switches, device sleep)
- Voice-to-terminal via on-device dictation
- Face ID security for SSH keys in Keychain
- Native tmux integration
- Task completion notifications
- Custom terminal keyboard (Ctrl, Esc, arrows)
- Session recovery if interrupted by iOS
- Multiple themes (Nord, Dracula, Solarized)

Platform: iOS (Android in development per GitHub)

Tech: Native iOS, Mosh protocol

**Note:** Different approach than web-based solutions. Native app with Mosh gives better connection resilience than WebSocket-based approaches. Marketing specifically targets "Check on Claude Code from the couch" use case.

---

## Patterns Observed

1. **Tailscale is popular** — Many use it for secure remote access
2. **PTY/terminal streaming** — Common approach vs SDK integration
3. **E2E encryption** — Becoming expected for remote access
4. **Multi-agent support** — Growing expectation beyond Claude-only

## Last Updated

2026-02-03

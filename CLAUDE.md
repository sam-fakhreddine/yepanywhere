# Yep Anywhere

A mobile-first supervisor for Claude Code agents. Like the VS Code Claude extension, but designed for phones and multi-session workflows.

**Key ideas:**
- **Server-owned processes** — Claude runs on your dev machine; client disconnects don't interrupt work
- **Multi-session dashboard** — See all projects at a glance, no window cycling
- **Mobile supervision** — Push notifications for approvals, respond from your lock screen
- **Zero external dependencies** — No Firebase, no accounts, just Tailscale for network access

**Architecture:** Hono server manages Claude SDK processes. React client connects via SSE for real-time streaming. Sessions persist to jsonl files (handled by SDK).

For detailed overview, see `docs/project/`. Historical vision docs in `docs/archive/`.

## Port Configuration

All ports are derived from a single `PORT` environment variable (default: 3400):

| Port | Purpose |
|------|---------|
| PORT + 0 | Main server (default: 3400) |
| PORT + 1 | Maintenance server (default: 3401) |
| PORT + 2 | Vite dev server (default: 3402) |

To run on different ports:
```bash
PORT=4000 pnpm dev  # Uses 4000, 4001, 4002
```

Individual overrides (rarely needed):
- `MAINTENANCE_PORT` - Override maintenance port (set to 0 to disable)
- `VITE_PORT` - Override vite dev port

## Data Directory & Profiles

Server state is stored in a data directory (default: `~/.yep-anywhere/`). This includes:
- `logs/` - Server logs
- `indexes/` - Session index cache
- `uploads/` - Uploaded files
- `session-metadata.json` - Custom titles, archive/starred status
- `notifications.json` - Last-seen timestamps
- `push-subscriptions.json` - Web push subscriptions
- `vapid.json` - VAPID keys for push
- `auth.json` - Authentication state (password hash, sessions)
- `remote-access.json` - SRP salt and verifier (file permissions: 0600)
- `remote-sessions.json` - Active remote session keys (file permissions: 0600)

### Running Multiple Instances

Use profiles to run dev and production instances simultaneously (like Chrome profiles):

```bash
# Production (default profile, port 3400)
PORT=3400 pnpm start

# Development (dev profile, port 4000)
PORT=4000 YEP_ANYWHERE_PROFILE=dev pnpm dev
```

This creates separate data directories:
- Production: `~/.yep-anywhere/`
- Development: `~/.yep-anywhere-dev/`

Environment variables:
- `YEP_ANYWHERE_PROFILE` - Profile name suffix (creates `~/.yep-anywhere-{profile}/`)
- `YEP_ANYWHERE_DATA_DIR` - Full path override for data directory

Note: Both instances share `~/.claude/projects/` (SDK-managed sessions).

## After Editing Code

After editing TypeScript or other source files, verify your changes compile and pass checks:

```bash
pnpm lint       # Biome linter
pnpm typecheck  # TypeScript type checking (fast, no emit)
pnpm test       # Unit tests
pnpm test:e2e   # E2E tests (if UI changes)
```

Fix any errors before considering the task complete.

## UI/UX Guidelines

This project follows strict UI/UX standards. Apply these guidelines when designing, building, or reviewing UI code.

### Design Rules by Priority

| Priority | Category | Key Rules |
|----------|----------|-----------|
| CRITICAL | Accessibility | 4.5:1 contrast, focus states, ARIA labels, keyboard nav |
| CRITICAL | Touch & Interaction | 44x44px touch targets, cursor-pointer on clickables, loading states |
| HIGH | Performance | Image optimization, `prefers-reduced-motion`, no layout shifts |
| HIGH | Layout & Responsive | Mobile-first, 16px min font, no horizontal scroll |
| MEDIUM | Typography | 1.5-1.75 line-height, 65-75 char line length |
| MEDIUM | Animation | 150-300ms micro-interactions, use transform/opacity only |

### Common Mistakes to Avoid

| Rule | Do | Don't |
|------|----|----- |
| **Icons** | Use SVG icons (Lucide, Heroicons) | Use emojis as UI icons |
| **Clickables** | Add `cursor-pointer` to all interactive elements | Leave default cursor |
| **Hover states** | Use color/opacity transitions | Use scale transforms that shift layout |
| **Light mode** | Use `bg-white/80` or higher for glass effects | Use `bg-white/10` (invisible) |
| **Text contrast** | Use slate-900 for body text | Use slate-400 or lighter |
| **Borders** | Use `border-gray-200` in light mode | Use `border-white/10` (invisible) |
| **Navbar** | Add `top-4 left-4 right-4` spacing for floating | Stick to `top-0 left-0 right-0` |

### Pre-Delivery Checklist

Before delivering UI code, verify:

**Visual Quality**
- [ ] No emojis used as icons (use SVG)
- [ ] Icons from consistent set (Lucide preferred)
- [ ] Hover states don't cause layout shift
- [ ] Works in both light and dark mode

**Interaction**
- [ ] All clickable elements have `cursor-pointer`
- [ ] Transitions are 150-300ms
- [ ] Focus states visible for keyboard nav
- [ ] Loading states for async operations

**Accessibility**
- [ ] Color contrast 4.5:1 minimum
- [ ] All images have alt text
- [ ] Form inputs have labels
- [ ] `prefers-reduced-motion` respected

**Responsive**
- [ ] Test at 375px, 768px, 1024px, 1440px
- [ ] No horizontal scroll on mobile
- [ ] Touch targets minimum 44x44px
- [ ] Content not hidden behind fixed elements

### Testing Requirements

**Always write Playwright E2E tests for UI/UX features.** This includes:

- New interactive components (buttons, dialogs, gestures)
- User flows and navigation changes
- Mobile-specific interactions (swipe, touch, viewport changes)
- Accessibility features

Tests go in `packages/client/e2e/`:

```typescript
import { expect, test } from "./fixtures.js";

test.describe("Feature Name", () => {
  test("describes expected behavior", async ({ page, baseURL }) => {
    await page.goto(`${baseURL}/`);
    // Test implementation
  });
});
```

Testing patterns:
- Use `data-testid` attributes for reliable element selection
- Test both mobile (375px) and desktop (1200px) viewports
- Verify API calls complete successfully for state changes
- Test error states and edge cases

## Git Commits

Never mention Claude, AI, or any AI assistant in commit messages. Write commit messages as if a human developer wrote them.

## Releasing to npm

The package is published to npm as `yepanywhere` using GitHub Actions with OIDC trusted publishing (no npm tokens stored in secrets).

**Before releasing:**

1. Update `CHANGELOG.md` with a new version section:
   ```markdown
   ## [0.1.11] - 2025-01-24

   ### Added
   - New feature description

   ### Fixed
   - Bug fix description
   ```

2. Commit the changelog update

3. Tag and push:
   ```bash
   git tag v0.1.11
   git push origin v0.1.11
   ```

The CI workflow verifies the changelog contains an entry for the version being released. If missing, the release will fail with instructions to update the changelog.

The workflow runs lint, typecheck, and tests, then builds with `pnpm build:bundle` and publishes with `--provenance` for supply chain attestation. It also creates a GitHub Release with auto-generated notes.

## Releasing the Website

The website (landing pages + remote relay client at `/remote`) is deployed separately from npm. See `site/RELEASING.md` for the full process.

Quick reference:
```bash
# Update site/CHANGELOG.md first, then:
git tag site-v1.1.0
git push origin site-v1.1.0
```

## Server Logs

Server logs are written to `{dataDir}/logs/` (default: `~/.yep-anywhere/logs/`):

- `server.log` - Main server log (dev mode with `pnpm dev`)
- `e2e-server.log` - Server log during E2E tests

To view logs in real-time: `tail -f ~/.yep-anywhere/logs/server.log`

All `console.log/error/warn` output is captured. Logs are JSON format in the file but pretty-printed to console.

Environment variables:
- `LOG_DIR` - Custom log directory
- `LOG_FILE` - Custom log filename (default: server.log)
- `LOG_LEVEL` - Minimum level: fatal, error, warn, info, debug, trace (default: info)
- `LOG_FILE_LEVEL` - Separate level for file logging (default: same as LOG_LEVEL)
- `LOG_TO_FILE` - Set to "false" to disable file logging
- `LOG_TO_CONSOLE` - Set to "false" to disable console logging

## Maintenance Server

A separate lightweight HTTP server runs on PORT + 1 (default 3401) for out-of-band diagnostics. Useful when the main server is unresponsive.

```bash
# Check server status
curl http://localhost:3401/status

# Enable proxy debug logging at runtime
curl -X PUT http://localhost:3401/proxy/debug -d '{"enabled": true}'

# Change log levels at runtime
curl -X PUT http://localhost:3401/log/level -d '{"console": "debug"}'

# Enable Chrome DevTools inspector
curl -X POST http://localhost:3401/inspector/open
# Then open chrome://inspect in Chrome

# Trigger server restart
curl -X POST http://localhost:3401/reload
```

Available endpoints:
- `GET /health` - Health check
- `GET /status` - Memory, uptime, connections
- `GET|PUT /log/level` - Get/set log levels
- `GET|PUT /proxy/debug` - Get/set proxy debug logging
- `GET /inspector` - Inspector status
- `POST /inspector/open` - Enable Chrome DevTools (host restricted to localhost only)
- `POST /inspector/close` - Disable Chrome DevTools
- `POST /reload` - Restart server

Security notes:
- Request bodies are limited to 1MB
- Inspector host is restricted to `127.0.0.1`, `::1`, or `localhost`
- Rejects cross-origin browser requests (Origin header check)

Environment variables:
- `MAINTENANCE_PORT` - Port for maintenance server (default: PORT + 1, set to 0 to disable)
- `PROXY_DEBUG` - Enable proxy debug logging at startup (default: false)

## Validating Session Data

Validate JSONL session files against Zod schemas:

```bash
# Validate all sessions in ~/.claude/projects
npx tsx scripts/validate-jsonl.ts

# Validate a specific file or directory
npx tsx scripts/validate-jsonl.ts /path/to/session.jsonl
```

Run this after schema changes to verify compatibility with existing session data.

## Validating Tool Results

Validate `tool_use_result` fields from SDK raw logs against ToolResultSchemas:

```bash
# Validate sdk-raw.jsonl (default location)
npx tsx scripts/validate-tool-results.ts

# Summary only (no error details)
npx tsx scripts/validate-tool-results.ts --summary

# Filter by tool name
npx tsx scripts/validate-tool-results.ts --tool=Edit
```

The SDK provides structured `tool_use_result` objects alongside tool results. These are logged to `~/.yep-anywhere/logs/sdk-raw.jsonl` when `LOG_SDK_MESSAGES=true` (default). Run this script after adding new tool schemas or when debugging tool result parsing.

## Type System

Types are defined in `packages/shared/src/claude-sdk-schema/` (Zod schemas as source of truth).

Key patterns:
- **Message identification**: Use `getMessageId(m)` helper which returns `uuid ?? id`
- **Content access**: Prefer `message.content` over top-level `content`
- **Type discrimination**: Use `type` field (user/assistant/system/summary)


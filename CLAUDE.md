# Claude Anywhere

## Required Reading

This is a new project. Before starting any task, read all files in `docs/project/` to understand the project vision and architecture:

- `docs/project/claude-anywhere-vision.md` - Core vision and goals
- `docs/project/project-vision.md` - Project overview
- `docs/project/security-setup.md` - Security configuration

This ensures all agents have a shared understanding of what we're building.

## After Editing Code

After editing TypeScript or other source files, verify your changes compile and pass checks:

```bash
pnpm lint       # Biome linter
pnpm typecheck  # TypeScript type checking (fast, no emit)
pnpm test       # Unit tests
pnpm test:e2e   # E2E tests (if UI changes)
```

Fix any errors before considering the task complete.

## Git Commits

Never mention Claude, AI, or any AI assistant in commit messages. Write commit messages as if a human developer wrote them.

## Server Logs

Server logs are written to `.claude-anywhere/logs/` in the project root:

- `server.log` - Main server log (dev mode with `pnpm dev`)
- `e2e-server.log` - Server log during E2E tests

To view logs in real-time: `tail -f .claude-anywhere/logs/server.log`

All `console.log/error/warn` output is captured. Logs are JSON format in the file but pretty-printed to console.

Environment variables:
- `LOG_DIR` - Custom log directory
- `LOG_FILE` - Custom log filename (default: server.log)
- `LOG_LEVEL` - Minimum level: fatal, error, warn, info, debug, trace (default: info)
- `LOG_TO_FILE` - Set to "false" to disable file logging
- `LOG_TO_CONSOLE` - Set to "false" to disable console logging

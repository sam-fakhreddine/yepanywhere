/**
 * Centralized client IP extraction for rate limiting.
 *
 * Extracts the remote IP from various sources (Hono context, raw socket)
 * with consistent handling of missing values. When behind a trusted reverse
 * proxy, reads X-Forwarded-For; otherwise uses the socket's remoteAddress.
 *
 * Returns undefined when no IP can be determined, so callers can decide
 * whether to skip rate limiting or use a per-connection fallback.
 */

import type { Context } from "hono";

/**
 * Extract the client IP from a Hono request context.
 * Checks X-Forwarded-For (first entry) then falls back to socket remoteAddress.
 */
export function getClientIp(c: Context): string | undefined {
  // Check X-Forwarded-For for proxied deployments (take first/leftmost = original client)
  const forwarded = c.req.header("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }

  // Fall back to socket remoteAddress
  const env = c.env as Record<
    string,
    { socket?: { remoteAddress?: string } } | undefined
  >;
  return env?.incoming?.socket?.remoteAddress ?? undefined;
}

/**
 * Extract the client IP from a raw WebSocket's underlying socket.
 * Used for relay-accepted connections where we have a raw ws.WebSocket.
 */
export function getClientIpFromSocket(
  // biome-ignore lint/suspicious/noExplicitAny: ws library internal - no public API for socket access
  rawWs: any,
): string | undefined {
  const addr: unknown = rawWs?._socket?.remoteAddress;
  return typeof addr === "string" ? addr : undefined;
}

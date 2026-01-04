import type { MiddlewareHandler } from "hono";
import { cors } from "hono/cors";

// Allow localhost (dev) and any *.ts.net (Tailscale)
const isAllowedOrigin = (origin: string): boolean => {
  if (!origin) return false;
  if (origin.startsWith("http://localhost:")) return true;
  if (origin.endsWith(".ts.net")) return true;
  return false;
};

export const corsMiddleware = cors({
  origin: (origin) => (isAllowedOrigin(origin) ? origin : null),
  credentials: true,
  allowMethods: ["GET", "POST", "PUT", "DELETE"],
  allowHeaders: ["Content-Type", "Authorization", "X-Yep-Anywhere"],
});

// Only require header on mutating requests (SSE uses native EventSource which can't send headers)
export const requireCustomHeader: MiddlewareHandler = async (c, next) => {
  const method = c.req.method;
  if (method !== "GET" && method !== "HEAD" && method !== "OPTIONS") {
    if (c.req.header("X-Yep-Anywhere") !== "true") {
      return c.json({ error: "Missing required header" }, 403);
    }
  }
  await next();
};

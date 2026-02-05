/**
 * In-memory rate limiter for authentication endpoints.
 *
 * Tracks failed attempts per key (typically IP address) and blocks
 * further attempts after exceeding thresholds with exponential backoff:
 *   - 5 failures within window: block for 1 minute
 *   - 10 failures: block for 5 minutes
 *   - 20 failures: block for 15 minutes
 *
 * Auto-cleans expired entries every 15 minutes to prevent memory leaks.
 */

interface AttemptRecord {
  /** Number of failed attempts */
  failures: number;
  /** Timestamp of first failure in current window (ms) */
  windowStart: number;
  /** Timestamp when block expires, 0 if not blocked (ms) */
  blockedUntil: number;
}

export interface RateLimiterOptions {
  /** Duration of the tracking window in ms (default: 15 minutes) */
  windowMs?: number;
  /** How often to clean up expired entries in ms (default: 15 minutes) */
  cleanupIntervalMs?: number;
}

export class RateLimiter {
  private attempts = new Map<string, AttemptRecord>();
  private cleanupTimer: ReturnType<typeof setInterval> | null = null;

  /** Window duration in ms */
  private readonly windowMs: number;
  /** Cleanup interval in ms */
  private readonly cleanupIntervalMs: number;

  constructor(options?: RateLimiterOptions) {
    this.windowMs = options?.windowMs ?? 15 * 60 * 1000;
    this.cleanupIntervalMs = options?.cleanupIntervalMs ?? 15 * 60 * 1000;
    this.startCleanup();
  }

  /**
   * Check if a key is currently blocked from making attempts.
   *
   * @param key - The key to check (typically IP address). If undefined, rate limiting is skipped.
   * @returns `{ blocked: false }` if allowed, or `{ blocked: true, retryAfterMs }` if blocked.
   */
  isBlocked(key: string | undefined): {
    blocked: boolean;
    retryAfterMs?: number;
  } {
    // Skip rate limiting when key is unavailable (e.g., IP couldn't be determined)
    if (!key) {
      return { blocked: false };
    }

    const record = this.attempts.get(key);
    if (!record) {
      return { blocked: false };
    }

    const now = Date.now();

    // If the tracking window has expired, reset
    if (now - record.windowStart > this.windowMs) {
      this.attempts.delete(key);
      return { blocked: false };
    }

    // Check if currently in a block period
    if (record.blockedUntil > now) {
      return {
        blocked: true,
        retryAfterMs: record.blockedUntil - now,
      };
    }

    return { blocked: false };
  }

  /**
   * Record a failed authentication attempt for the given key.
   * Applies exponential backoff blocking after threshold failures.
   *
   * @param key - The key to record failure for. If undefined, the call is ignored.
   */
  recordFailure(key: string | undefined): void {
    // Skip tracking when key is unavailable
    if (!key) return;

    const now = Date.now();
    let record = this.attempts.get(key);

    // Start a new window if none exists or the current window expired
    if (!record || now - record.windowStart > this.windowMs) {
      record = {
        failures: 0,
        windowStart: now,
        blockedUntil: 0,
      };
      this.attempts.set(key, record);
    }

    record.failures++;

    // Exponential backoff thresholds
    if (record.failures >= 20) {
      record.blockedUntil = now + 15 * 60 * 1000; // 15 minutes
    } else if (record.failures >= 10) {
      record.blockedUntil = now + 5 * 60 * 1000; // 5 minutes
    } else if (record.failures >= 5) {
      record.blockedUntil = now + 1 * 60 * 1000; // 1 minute
    }
  }

  /**
   * Record a successful authentication, resetting the failure counter for the key.
   *
   * @param key - The key to clear. If undefined, the call is ignored.
   */
  recordSuccess(key: string | undefined): void {
    if (!key) return;
    this.attempts.delete(key);
  }

  /**
   * Start periodic cleanup of expired entries.
   */
  private startCleanup(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, this.cleanupIntervalMs);

    // Don't prevent the Node.js process from exiting
    if (
      this.cleanupTimer &&
      typeof this.cleanupTimer === "object" &&
      "unref" in this.cleanupTimer
    ) {
      (this.cleanupTimer as NodeJS.Timeout).unref();
    }
  }

  /**
   * Remove entries whose tracking window has expired and are no longer blocked.
   */
  private cleanup(): void {
    const now = Date.now();
    for (const [key, record] of this.attempts) {
      if (
        now - record.windowStart > this.windowMs &&
        record.blockedUntil <= now
      ) {
        this.attempts.delete(key);
      }
    }
  }

  /**
   * Stop the cleanup timer. Call when the rate limiter is no longer needed.
   */
  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }

  /**
   * Number of tracked keys (useful for testing and monitoring).
   */
  get size(): number {
    return this.attempts.size;
  }
}

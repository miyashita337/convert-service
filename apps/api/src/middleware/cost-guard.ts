import type { MiddlewareHandler } from "hono";
import type { Env, AppVariables } from "../types/env";

type HonoEnv = { Bindings: Env; Variables: AppVariables };

/** Threshold at which video conversions are blocked (req/h) */
const VIDEO_THROTTLE_THRESHOLD = 6_000;
/** Threshold at which all conversions are blocked (req/h) */
const FULL_BLOCK_THRESHOLD = 8_000;

/**
 * Build the hourly key for the current UTC hour.
 * Format: "YYYY-MM-DDTHH" (e.g. "2026-03-16T14")
 */
function getHourlyKey(now: Date = new Date()): string {
  const iso = now.toISOString();
  return iso.slice(0, 13); // "2026-03-16T14"
}

/**
 * Increment the hourly counter and return the current count.
 * Uses INSERT ... ON CONFLICT to upsert atomically.
 */
async function incrementHourlyCount(db: D1Database, key: string): Promise<number> {
  const result = await db
    .prepare(
      `INSERT INTO hourly_request_counts (key, count, updated_at)
       VALUES (?1, 1, datetime('now'))
       ON CONFLICT(key) DO UPDATE SET
         count = count + 1,
         updated_at = datetime('now')
       RETURNING count`,
    )
    .bind(key)
    .first<{ count: number }>();

  return result?.count ?? 1;
}

/**
 * Determine the conversion category from the request path.
 * Returns "video" for paths containing video-related indicators,
 * otherwise "general".
 */
function getCategory(path: string): "video" | "general" {
  // Video-specific routes are not yet implemented, but reserved for future use.
  // For now, the path itself is used; /api/convert with video MIME would need
  // body inspection which is too expensive. We use a simple path check.
  if (path.includes("/video") || path.includes("category=video")) {
    return "video";
  }
  return "general";
}

/**
 * Cost guard middleware — protects against unexpected cost spikes.
 *
 * Tracks hourly request counts in D1 and blocks conversions when thresholds
 * are exceeded:
 * - 6,000 req/h: block video conversions only (429)
 * - 8,000 req/h: block all conversions (429)
 *
 * Apply ONLY to conversion endpoints (/api/convert, /api/preview, /api/resize).
 */
export const costGuardMiddleware = (): MiddlewareHandler<HonoEnv> => {
  return async (c, next) => {
    const key = getHourlyKey();

    let count: number;
    try {
      count = await incrementHourlyCount(c.env.DB, key);
    } catch {
      // If the table doesn't exist or D1 is unavailable, fail open
      // to avoid blocking legitimate traffic.
      console.warn("[cost-guard] Failed to increment hourly count, failing open");
      await next();
      return;
    }

    // Full block: all conversions
    if (count >= FULL_BLOCK_THRESHOLD) {
      console.warn(
        `[cost-guard] Full block triggered: ${count} req/h (threshold: ${FULL_BLOCK_THRESHOLD})`,
      );
      return c.json(
        {
          error: "service_overloaded",
          message: "Too many requests. Please try again later.",
          retryAfterSeconds: 3600,
        },
        429,
      );
    }

    // Video throttle
    const category = getCategory(c.req.url);
    if (category === "video" && count >= VIDEO_THROTTLE_THRESHOLD) {
      console.warn(
        `[cost-guard] Video throttle triggered: ${count} req/h (threshold: ${VIDEO_THROTTLE_THRESHOLD})`,
      );
      return c.json(
        {
          error: "service_overloaded",
          message: "Video conversions are temporarily limited. Please try again later.",
          retryAfterSeconds: 3600,
        },
        429,
      );
    }

    await next();
  };
};

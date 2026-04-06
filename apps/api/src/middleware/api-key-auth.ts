import { createMiddleware } from "hono/factory";
import type { Env, AppVariables } from "../types/env";
import { findApiKeyByRawKey, consumeApiKeyUsage } from "../repositories/api-key-repository";

/**
 * API Key authentication middleware for /v1/* routes.
 * Requires `Authorization: Bearer qc_xxx` header.
 * Sets apiKey context and enforces monthly rate limits.
 */
export function apiKeyAuthMiddleware() {
  return createMiddleware<{ Bindings: Env; Variables: AppVariables }>(
    async (c, next) => {
      const authHeader = c.req.header("Authorization");
      if (!authHeader?.startsWith("Bearer qc_")) {
        return c.json(
          { error: { code: "unauthorized", message: "Missing or invalid API key. Use: Authorization: Bearer qc_xxx" } },
          401
        );
      }

      const rawKey = authHeader.slice(7); // "Bearer " = 7 chars
      const keyInfo = await findApiKeyByRawKey(c.env.DB, rawKey);
      if (!keyInfo) {
        return c.json(
          { error: { code: "unauthorized", message: "Invalid API key" } },
          401
        );
      }

      // Atomic rate limit check + increment
      const usage = await consumeApiKeyUsage(c.env.DB, keyInfo.id, keyInfo.plan);

      if (!usage.allowed) {
        return c.json(
          {
            error: {
              code: "rate_limit_exceeded",
              message: `Monthly limit exceeded (${usage.limit}/month). Upgrade your plan.`,
            },
          },
          429
        );
      }

      // Set rate limit headers
      c.header("X-RateLimit-Limit", String(usage.limit));
      c.header("X-RateLimit-Remaining", String(Math.max(0, usage.limit - usage.count)));
      c.header("X-RateLimit-Reset", getMonthEndTimestamp());

      c.set("apiKey", {
        keyId: keyInfo.id,
        userEmail: keyInfo.userEmail,
        plan: keyInfo.plan,
      });

      return next();
    }
  );
}

function getMonthEndTimestamp(): string {
  const now = new Date();
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return String(Math.floor(nextMonth.getTime() / 1000));
}

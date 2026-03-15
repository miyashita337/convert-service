import { createMiddleware } from "hono/factory";
import { Toucan } from "toucan-js";
import type { Env, AppVariables } from "../types/env";

export function sentryMiddleware() {
  return createMiddleware<{ Bindings: Env; Variables: AppVariables }>(
    async (c, next) => {
      const dsn = c.env.SENTRY_DSN;
      if (!dsn) {
        await next();
        return;
      }

      const sentry = new Toucan({
        dsn,
        context: c.executionCtx,
        request: c.req.raw,
        requestDataOptions: {
          allowedHeaders: ["content-type", "user-agent"],
          allowedSearchParams: /(.*)/,
        },
      });

      sentry.setTag("service", "quickconv-api");
      sentry.setTag("endpoint", c.req.path);

      await next();

      const status = c.res.status;
      sentry.setTag("rate_limited", String(status === 429));

      if (status >= 500) {
        sentry.setExtras({
          url: c.req.url,
          method: c.req.method,
          status,
        });
        sentry.captureMessage(`HTTP ${status}: ${c.req.method} ${c.req.path}`, "error");
      }
    },
  );
}

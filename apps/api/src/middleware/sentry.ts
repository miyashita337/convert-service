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

      await next();

      const status = c.res.status;
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

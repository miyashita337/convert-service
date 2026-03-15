import { createMiddleware } from "hono/factory";
import type { Env, AppVariables } from "../types/env";
import { verifyJwt } from "../services/auth";
import { getUserByEmail } from "../repositories/user-repository";

/**
 * Optional auth middleware — extracts user from JWT cookie if present.
 * Does not block unauthenticated requests (sets user to null).
 */
export function optionalAuthMiddleware() {
  return createMiddleware<{ Bindings: Env; Variables: AppVariables }>(
    async (c, next) => {
      c.set("user", null);

      const cookie = c.req.header("Cookie");
      if (!cookie) return next();

      const match = cookie.match(/qc_auth=([^;]+)/);
      if (!match) return next();

      const token = match[1];
      const payload = await verifyJwt(token, c.env.JWT_SECRET);
      if (!payload || typeof payload.email !== "string") return next();

      const user = await getUserByEmail(c.env.DB, payload.email);
      if (user) {
        c.set("user", user);
      }

      return next();
    }
  );
}

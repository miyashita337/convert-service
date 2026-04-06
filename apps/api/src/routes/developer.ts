import { Hono } from "hono";
import type { Env, AppVariables } from "../types/env";
import {
  createApiKey,
  listApiKeysByUser,
  revokeApiKey,
} from "../repositories/api-key-repository";

const developer = new Hono<{ Bindings: Env; Variables: AppVariables }>();

/** Require authenticated user */
function requireAuth(c: { get: (key: "user") => AppVariables["user"]; json: (body: unknown, status: number) => Response }) {
  const user = c.get("user");
  if (!user) {
    return c.json({ error: { code: "unauthorized", message: "Login required" } }, 401);
  }
  return user;
}

// POST /api/developer/keys — Create a new API key
developer.post("/keys", async (c) => {
  const user = requireAuth(c);
  if (user instanceof Response) return user;

  const body = await c.req.json<{ name?: string }>().catch(() => ({}));
  const name = body.name?.trim() || "Default";

  if (name.length > 64) {
    return c.json({ error: { code: "validation", message: "Name must be 64 characters or less" } }, 400);
  }

  // Limit to 5 active keys per user
  const existing = await listApiKeysByUser(c.env.DB, user.email);
  if (existing.length >= 5) {
    return c.json({ error: { code: "limit", message: "Maximum 5 active API keys per account" } }, 400);
  }

  const result = await createApiKey(c.env.DB, user.email, name);

  return c.json({
    key: result.key,
    id: result.info.id,
    name: result.info.name,
    prefix: result.info.keyPrefix,
    plan: result.info.plan,
    createdAt: result.info.createdAt,
    message: "Store this key securely. It will not be shown again.",
  }, 201);
});

// GET /api/developer/keys — List user's API keys
developer.get("/keys", async (c) => {
  const user = requireAuth(c);
  if (user instanceof Response) return user;

  const keys = await listApiKeysByUser(c.env.DB, user.email);

  return c.json({
    keys: keys.map((k) => ({
      id: k.id,
      prefix: k.keyPrefix,
      name: k.name,
      plan: k.plan,
      monthlyCount: k.monthlyCount,
      createdAt: k.createdAt,
    })),
  });
});

// DELETE /api/developer/keys/:id — Revoke an API key
developer.delete("/keys/:id", async (c) => {
  const user = requireAuth(c);
  if (user instanceof Response) return user;

  const id = c.req.param("id");
  const revoked = await revokeApiKey(c.env.DB, id, user.email);

  if (!revoked) {
    return c.json({ error: { code: "not_found", message: "API key not found" } }, 404);
  }

  return c.json({ message: "API key revoked" });
});

export default developer;

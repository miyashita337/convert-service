import { Hono } from "hono";
import type { Env, AppVariables } from "../types/env";
import {
  createApiKeyWithLimit,
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

  // Distinguish empty body (allowed) from malformed JSON (400)
  const text = await c.req.text();
  let name = "Default";
  if (text.length > 0) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      return c.json({ error: { code: "validation", message: "Invalid JSON body" } }, 400);
    }
    const rawName = parsed && typeof parsed === "object" && "name" in parsed
      ? (parsed as Record<string, unknown>).name
      : undefined;
    name = typeof rawName === "string" ? rawName.trim().slice(0, 64) || "Default" : "Default";
  }

  const result = await createApiKeyWithLimit(c.env.DB, user.email, name, 5);
  if (!result) {
    return c.json({ error: { code: "limit", message: "Maximum 5 active API keys per account" } }, 400);
  }

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

  const currentMonth = new Date().toISOString().slice(0, 7);
  return c.json({
    keys: keys.map((k) => ({
      id: k.id,
      prefix: k.keyPrefix,
      name: k.name,
      plan: k.plan,
      monthlyCount: k.countMonth === currentMonth ? k.monthlyCount : 0,
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

import { Hono } from "hono";
import type { Env, AppVariables } from "../types/env";
import { createJwt } from "../services/auth";

/**
 * E2E テスト専用の JWT 発行エンドポイント。
 * E2E_TEST_SECRET が設定されている環境（ステージング）でのみ有効。
 * 本番では E2E_TEST_SECRET を設定しないことで無効化される。
 */
const testAuth = new Hono<{ Bindings: Env; Variables: AppVariables }>();

testAuth.post("/token", async (c) => {
  if (!c.env.E2E_TEST_SECRET) {
    return c.json({ error: "not_available" }, 404);
  }

  const secret = c.req.header("X-E2E-Secret");
  if (secret !== c.env.E2E_TEST_SECRET) {
    return c.json({ error: "unauthorized" }, 401);
  }

  const body = await c.req.json<{ email: string; plan?: string }>().catch(() => null);
  if (!body?.email) {
    return c.json({ error: "email_required" }, 400);
  }

  const jwt = await createJwt(
    { email: body.email, plan: body.plan || "free", name: "E2E Test User", picture: "" },
    c.env.JWT_SECRET
  );

  return c.json({ token: jwt });
});

export default testAuth;

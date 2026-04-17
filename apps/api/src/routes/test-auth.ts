import { Hono } from "hono";
import type { Env, AppVariables } from "../types/env";
import { createJwt } from "../services/auth";
import { upsertE2ETestUser } from "../repositories/user-repository";

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

  // email を正規化して下流の比較と一致させる（DB / JWT 両方で同一値を使用）
  const email = body.email.trim().toLowerCase();
  const plan = body.plan || "free";

  // optionalAuthMiddleware は DB 照合で user を解決するため、JWT 発行前に upsert する。
  // plan を DB 側にも反映させるため upsertE2ETestUser を使う
  // （/api/auth/me は DB の plan を返す）。
  await upsertE2ETestUser(c.env.DB, email, plan);

  const jwt = await createJwt(
    { email, plan, name: "E2E Test User", picture: "" },
    c.env.JWT_SECRET
  );

  return c.json({ token: jwt });
});

export default testAuth;

import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../services/auth", () => ({
  createJwt: vi.fn().mockResolvedValue("mock.jwt.token"),
}));

vi.mock("../repositories/user-repository", () => ({
  upsertE2ETestUser: vi.fn().mockResolvedValue(undefined),
}));

import testAuth from "../routes/test-auth";
import { upsertE2ETestUser } from "../repositories/user-repository";
import { createJwt } from "../services/auth";
import { Hono } from "hono";
import type { Env, AppVariables } from "../types/env";

type HonoEnv = { Bindings: Env; Variables: AppVariables };

function createApp() {
  const app = new Hono<HonoEnv>();
  app.route("/api/test", testAuth);
  return app;
}

const baseEnv = {
  E2E_TEST_SECRET: "e2e-secret",
  JWT_SECRET: "jwt-secret",
  DB: {} as unknown as D1Database,
} as unknown as Env;

describe("POST /api/test/token", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("E2E_TEST_SECRET 未設定 → 404", async () => {
    const app = createApp();
    const res = await app.request(
      "/api/test/token",
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-E2E-Secret": "x" },
        body: JSON.stringify({ email: "e2e@example.com" }),
      },
      { ...baseEnv, E2E_TEST_SECRET: undefined } as unknown as Env
    );
    expect(res.status).toBe(404);
    expect(upsertE2ETestUser).not.toHaveBeenCalled();
  });

  it("X-E2E-Secret 不一致 → 401", async () => {
    const app = createApp();
    const res = await app.request(
      "/api/test/token",
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-E2E-Secret": "wrong" },
        body: JSON.stringify({ email: "e2e@example.com" }),
      },
      baseEnv
    );
    expect(res.status).toBe(401);
    expect(upsertE2ETestUser).not.toHaveBeenCalled();
  });

  it("email 未指定 → 400", async () => {
    const app = createApp();
    const res = await app.request(
      "/api/test/token",
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-E2E-Secret": "e2e-secret" },
        body: JSON.stringify({}),
      },
      baseEnv
    );
    expect(res.status).toBe(400);
    expect(upsertE2ETestUser).not.toHaveBeenCalled();
  });

  it("正常系（free）→ email を正規化し、upsertE2ETestUser → JWT の順で処理する", async () => {
    const app = createApp();
    const res = await app.request(
      "/api/test/token",
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-E2E-Secret": "e2e-secret" },
        body: JSON.stringify({ email: "  E2E@Example.COM  ", plan: "free" }),
      },
      baseEnv
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as { token: string };
    expect(body.token).toBe("mock.jwt.token");

    expect(upsertE2ETestUser).toHaveBeenCalledTimes(1);
    expect(upsertE2ETestUser).toHaveBeenCalledWith(baseEnv.DB, "e2e@example.com", "free");
    expect(createJwt).toHaveBeenCalledTimes(1);
    expect(createJwt).toHaveBeenCalledWith(
      { email: "e2e@example.com", plan: "free", name: "E2E Test User", picture: "" },
      "jwt-secret"
    );

    // 呼び出し順: upsertE2ETestUser → createJwt
    const upsertCall = vi.mocked(upsertE2ETestUser).mock.invocationCallOrder[0];
    const createJwtCall = vi.mocked(createJwt).mock.invocationCallOrder[0];
    expect(upsertCall).toBeLessThan(createJwtCall);
  });

  it("plan 指定あり → upsertE2ETestUser と JWT 両方に反映される", async () => {
    const app = createApp();
    const res = await app.request(
      "/api/test/token",
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-E2E-Secret": "e2e-secret" },
        body: JSON.stringify({ email: "plus@example.com", plan: "plus_monthly" }),
      },
      baseEnv
    );
    expect(res.status).toBe(200);
    expect(upsertE2ETestUser).toHaveBeenCalledWith(baseEnv.DB, "plus@example.com", "plus_monthly");
    expect(vi.mocked(createJwt).mock.calls[0][0]).toMatchObject({
      email: "plus@example.com",
      plan: "plus_monthly",
    });
  });

  it("plan 未指定 → デフォルト 'free' で upsertE2ETestUser される", async () => {
    const app = createApp();
    const res = await app.request(
      "/api/test/token",
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-E2E-Secret": "e2e-secret" },
        body: JSON.stringify({ email: "default@example.com" }),
      },
      baseEnv
    );
    expect(res.status).toBe(200);
    expect(upsertE2ETestUser).toHaveBeenCalledWith(baseEnv.DB, "default@example.com", "free");
  });
});

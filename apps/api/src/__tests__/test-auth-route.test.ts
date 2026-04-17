import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../services/auth", () => ({
  createJwt: vi.fn().mockResolvedValue("mock.jwt.token"),
}));

vi.mock("../repositories/user-repository", () => ({
  upsertUser: vi.fn().mockResolvedValue({
    email: "e2e@example.com",
    stripeCustomerId: "id",
    plan: "free",
    googleId: "e2e-test-e2e@example.com",
  }),
}));

import testAuth from "../routes/test-auth";
import { upsertUser } from "../repositories/user-repository";
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
    expect(upsertUser).not.toHaveBeenCalled();
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
    expect(upsertUser).not.toHaveBeenCalled();
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
    expect(upsertUser).not.toHaveBeenCalled();
  });

  it("正常系 → upsertUser を呼んでから JWT を発行する", async () => {
    const app = createApp();
    const res = await app.request(
      "/api/test/token",
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-E2E-Secret": "e2e-secret" },
        body: JSON.stringify({ email: "e2e@example.com", plan: "free" }),
      },
      baseEnv
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as { token: string };
    expect(body.token).toBe("mock.jwt.token");

    // upsertUser が JWT 発行前に呼ばれ、googleId が決定論的であること
    expect(upsertUser).toHaveBeenCalledTimes(1);
    expect(upsertUser).toHaveBeenCalledWith(
      baseEnv.DB,
      "e2e@example.com",
      "e2e-test-e2e@example.com",
      "E2E Test User"
    );
    expect(createJwt).toHaveBeenCalledTimes(1);

    // 呼び出し順: upsertUser → createJwt
    const upsertCall = (upsertUser as unknown as { mock: { invocationCallOrder: number[] } }).mock
      .invocationCallOrder[0];
    const createJwtCall = (createJwt as unknown as { mock: { invocationCallOrder: number[] } }).mock
      .invocationCallOrder[0];
    expect(upsertCall).toBeLessThan(createJwtCall);
  });
});

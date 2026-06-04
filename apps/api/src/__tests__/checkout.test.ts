import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../services/stripe", () => ({
  createStripeClient: vi.fn(),
  PLAN_CONFIGS: {
    pass_7d: { name: "QuickConv 7-Day Pass", mode: "payment", durationDays: 7 },
    pass_30d: { name: "QuickConv 30-Day Pass", mode: "payment", durationDays: 30 },
    plus_monthly: { name: "QuickConv Plus", mode: "subscription", interval: "month" },
    pro_monthly: { name: "QuickConv Pro", mode: "subscription", interval: "month" },
  },
  isValidPlanId: (id: string) => ["pass_7d", "pass_30d", "plus_monthly", "pro_monthly"].includes(id),
  resolveStripePriceId: vi.fn().mockReturnValue("price_test_123"),
  isTestModeEnv: (env: { STRIPE_SECRET_KEY?: string }) =>
    env.STRIPE_SECRET_KEY?.startsWith("sk_test") ?? false,
}));

import checkout from "../routes/checkout";
import { createStripeClient } from "../services/stripe";
import { Hono } from "hono";
import type { Env, AppVariables } from "../types/env";

type HonoEnv = { Bindings: Env; Variables: AppVariables };

const mockSessionCreate = vi.fn().mockResolvedValue({ url: "https://checkout.stripe.com/session_123" });

function createMockDb() {
  const first = vi.fn().mockResolvedValue(null); // no rate limit row
  const run = vi.fn().mockResolvedValue({ success: true });
  const bind = vi.fn(() => ({ first, run }));
  const prepare = vi.fn(() => ({ bind }));
  return { prepare, bind, first, run };
}

function createApp(user: { email: string; stripeCustomerId: string | null; plan: string } | null = null) {
  (createStripeClient as ReturnType<typeof vi.fn>).mockReturnValue({
    checkout: { sessions: { create: mockSessionCreate } },
  });

  const app = new Hono<HonoEnv>();
  app.use("*", async (ctx, next) => {
    ctx.set("user", user ? { ...user, googleId: null } : null);
    await next();
  });
  app.route("/checkout", checkout);
  return app;
}

function createEnv(db: ReturnType<typeof createMockDb>) {
  return {
    STRIPE_SECRET_KEY: "sk_test_xxx",
    APP_URL: "https://api.quickconv.cc",
    DB: db as unknown as D1Database,
  } as unknown as Env;
}

async function postCheckout(
  app: ReturnType<typeof createApp>,
  body: Record<string, unknown>,
  env: Env
) {
  const req = new Request("http://localhost/checkout", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
  return app.fetch(req, env);
}

describe("checkout /", () => {
  let db: ReturnType<typeof createMockDb>;
  let env: Env;

  beforeEach(() => {
    vi.clearAllMocks();
    db = createMockDb();
    env = createEnv(db);
  });

  it("returns 401 for unauthenticated user", async () => {
    const app = createApp(null);
    const res = await postCheckout(app, { planId: "plus_monthly" }, env);
    expect(res.status).toBe(401);
    const json = await res.json() as Record<string, unknown>;
    expect(json.error).toBe("authentication_required");
  });

  it("returns 400 for invalid planId", async () => {
    const app = createApp({ email: "user@example.com", stripeCustomerId: null, plan: "free" });
    const res = await postCheckout(app, { planId: "invalid_plan" }, env);
    expect(res.status).toBe(400);
    const json = await res.json() as Record<string, unknown>;
    expect(json.error).toBe("invalid_plan");
  });

  it("returns 400 for missing planId", async () => {
    const app = createApp({ email: "user@example.com", stripeCustomerId: null, plan: "free" });
    const res = await postCheckout(app, {}, env);
    expect(res.status).toBe(400);
  });

  it("creates subscription checkout session for plus_monthly", async () => {
    const app = createApp({ email: "user@example.com", stripeCustomerId: null, plan: "free" });
    const res = await postCheckout(app, { planId: "plus_monthly" }, env);
    expect(res.status).toBe(200);
    const json = await res.json() as Record<string, unknown>;
    expect(json.url).toContain("checkout.stripe.com");

    expect(mockSessionCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: "subscription",
        customer_email: "user@example.com",
      })
    );
  });

  it("creates payment checkout session for pass_7d", async () => {
    const app = createApp({ email: "user@example.com", stripeCustomerId: null, plan: "free" });
    const res = await postCheckout(app, { planId: "pass_7d" }, env);
    expect(res.status).toBe(200);

    expect(mockSessionCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: "payment",
        metadata: expect.objectContaining({ durationDays: "7" }),
      })
    );
  });

  it("creates payment checkout session for pass_30d", async () => {
    const app = createApp({ email: "user@example.com", stripeCustomerId: null, plan: "free" });
    const res = await postCheckout(app, { planId: "pass_30d" }, env);
    expect(res.status).toBe(200);

    expect(mockSessionCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: "payment",
        metadata: expect.objectContaining({ durationDays: "30" }),
      })
    );
  });

  it("uses customer_email when stripeCustomerId is null", async () => {
    const app = createApp({ email: "user@example.com", stripeCustomerId: null, plan: "free" });
    await postCheckout(app, { planId: "plus_monthly" }, env);

    expect(mockSessionCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        customer_email: "user@example.com",
      })
    );
    const callArgs = mockSessionCreate.mock.calls[0][0];
    expect(callArgs.customer).toBeUndefined();
  });

  it("uses customer param when stripeCustomerId exists", async () => {
    const app = createApp({ email: "user@example.com", stripeCustomerId: "cus_existing_123", plan: "plus" });
    await postCheckout(app, { planId: "pro_monthly" }, env);

    const callArgs = mockSessionCreate.mock.calls[0][0];
    expect(callArgs.customer).toBe("cus_existing_123");
    expect(callArgs.customer_email).toBeUndefined();
  });

  it("defaults currency to jpy", async () => {
    const app = createApp({ email: "user@example.com", stripeCustomerId: null, plan: "free" });
    await postCheckout(app, { planId: "plus_monthly" }, env);
    const { resolveStripePriceId } = await import("../services/stripe");
    expect(resolveStripePriceId).toHaveBeenCalledWith("plus_monthly", "jpy", true);
  });

  it("respects usd currency", async () => {
    const app = createApp({ email: "user@example.com", stripeCustomerId: null, plan: "free" });
    await postCheckout(app, { planId: "plus_monthly", currency: "usd" }, env);
    const { resolveStripePriceId } = await import("../services/stripe");
    expect(resolveStripePriceId).toHaveBeenCalledWith("plus_monthly", "usd", true);
  });

  it("returns 429 when rate limit exceeded", async () => {
    // Mock DB to return count >= 10
    db.first.mockResolvedValue({ count: 10 });
    const app = createApp({ email: "user@example.com", stripeCustomerId: null, plan: "free" });
    const res = await postCheckout(app, { planId: "plus_monthly" }, env);
    expect(res.status).toBe(429);
    const json = await res.json() as Record<string, unknown>;
    expect(json.error).toBe("rate_limit_exceeded");
  });

  it("allows request when under rate limit", async () => {
    db.first.mockResolvedValue({ count: 5 });
    const app = createApp({ email: "user@example.com", stripeCustomerId: null, plan: "free" });
    const res = await postCheckout(app, { planId: "plus_monthly" }, env);
    expect(res.status).toBe(200);
  });
});

import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock only the stripe service; keep @quickconv/shared real so getApiStripePriceId
// exercises the actual LIVE-empty / TEST-populated maps (#357 approval gate).
vi.mock("../services/stripe", () => ({
  createStripeClient: vi.fn(),
  isTestModeEnv: (env: { STRIPE_SECRET_KEY?: string }) =>
    env.STRIPE_SECRET_KEY?.startsWith("sk_test") ?? false,
}));

import developer from "../routes/developer";
import { createStripeClient } from "../services/stripe";
import { Hono } from "hono";
import type { Env, AppVariables } from "../types/env";

type HonoEnv = { Bindings: Env; Variables: AppVariables };

const mockSessionCreate = vi.fn().mockResolvedValue({ url: "https://checkout.stripe.com/c/pay/api_session_123" });

function createApp(user: { email: string; stripeCustomerId: string | null; plan: string } | null = null) {
  (createStripeClient as ReturnType<typeof vi.fn>).mockReturnValue({
    checkout: { sessions: { create: mockSessionCreate } },
  });
  const app = new Hono<HonoEnv>();
  app.use("*", async (ctx, next) => {
    ctx.set("user", user ? { ...user, googleId: null } : null);
    await next();
  });
  app.route("/developer", developer);
  return app;
}

function createEnv(secretKey: string): Env {
  return {
    STRIPE_SECRET_KEY: secretKey,
    APP_URL: "https://api.quickconv.cc",
    DB: {} as unknown as D1Database,
  } as unknown as Env;
}

async function postCheckout(app: ReturnType<typeof createApp>, body: Record<string, unknown>, env: Env) {
  const req = new Request("http://localhost/developer/checkout", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
  return app.fetch(req, env);
}

describe("POST /api/developer/checkout (#357)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    const app = createApp(null);
    const res = await postCheckout(app, { planId: "api_starter_monthly" }, createEnv("sk_test_xxx"));
    expect(res.status).toBe(401);
  });

  it("returns 400 for a non-API / invalid plan id", async () => {
    const app = createApp({ email: "dev@example.com", stripeCustomerId: null, plan: "free" });
    const res = await postCheckout(app, { planId: "pro_monthly" }, createEnv("sk_test_xxx"));
    expect(res.status).toBe(400);
    const body = await res.json() as { error: { code: string } };
    expect(body.error.code).toBe("invalid_plan");
  });

  it("returns 503 in LIVE mode because LIVE prices are not yet approved (empty string)", async () => {
    const app = createApp({ email: "dev@example.com", stripeCustomerId: null, plan: "free" });
    // sk_live → isTest=false → getApiStripePriceId returns null (LIVE empty) → fail-fast 503
    const res = await postCheckout(app, { planId: "api_starter_monthly" }, createEnv("sk_live_xxx"));
    expect(res.status).toBe(503);
    const body = await res.json() as { error: { code: string } };
    expect(body.error.code).toBe("not_available");
    expect(mockSessionCreate).not.toHaveBeenCalled();
  });

  it("creates a Stripe Checkout session and returns the url in TEST mode", async () => {
    const app = createApp({ email: "dev@example.com", stripeCustomerId: null, plan: "free" });
    const res = await postCheckout(app, { planId: "api_starter_monthly", locale: "en" }, createEnv("sk_test_xxx"));
    expect(res.status).toBe(200);
    const body = await res.json() as { url: string };
    expect(body.url).toContain("checkout.stripe.com");
    expect(mockSessionCreate).toHaveBeenCalledTimes(1);
    const arg = mockSessionCreate.mock.calls[0][0];
    expect(arg.mode).toBe("subscription");
    expect(arg.metadata.planId).toBe("api_starter_monthly");
    expect(arg.metadata.userEmail).toBe("dev@example.com");
    // planId must also ride on the subscription metadata so subscription.* events resolve it
    expect(arg.subscription_data.metadata.planId).toBe("api_starter_monthly");
  });

  it("reuses an existing Stripe customer id when present", async () => {
    const app = createApp({ email: "dev@example.com", stripeCustomerId: "cus_real123", plan: "free" });
    const res = await postCheckout(app, { planId: "api_pro_monthly" }, createEnv("sk_test_xxx"));
    expect(res.status).toBe(200);
    const arg = mockSessionCreate.mock.calls[0][0];
    expect(arg.customer).toBe("cus_real123");
    expect(arg.customer_email).toBeUndefined();
  });
});

import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock stripe before importing webhook
vi.mock("../services/stripe", () => ({
  createStripeClient: () => ({
    webhooks: {
      constructEventAsync: vi.fn().mockRejectedValue(new Error("Invalid signature")),
    },
  }),
}));

vi.mock("../repositories/subscription-repository", () => ({
  upsertSubscription: vi.fn(),
  updateSubscriptionStatus: vi.fn(),
}));

vi.mock("@quickconv/shared", async () => {
  const actual = await vi.importActual("@quickconv/shared");
  return actual;
});

import webhook from "../routes/webhook";
import { Hono } from "hono";
import type { Env, AppVariables } from "../types/env";
import { upsertSubscription, updateSubscriptionStatus } from "../repositories/subscription-repository";

type HonoEnv = { Bindings: Env; Variables: AppVariables };

function createMockDb() {
  const first = vi.fn().mockResolvedValue(null);
  const run = vi.fn().mockResolvedValue({ success: true });
  const bind = vi.fn(() => ({ first, run }));
  const prepare = vi.fn(() => ({ bind }));
  return { prepare, bind, first, run };
}

function createApp(db: ReturnType<typeof createMockDb>) {
  const app = new Hono<HonoEnv>();
  app.route("/webhook", webhook);
  return { app, db };
}

async function postWebhook(
  app: ReturnType<typeof createApp>["app"],
  db: ReturnType<typeof createMockDb>,
  eventType: string,
  dataObject: Record<string, unknown>,
  metadata?: Record<string, string>
) {
  const event = {
    type: eventType,
    data: {
      object: {
        ...dataObject,
        ...(metadata ? { metadata } : {}),
      },
    },
  };

  const req = new Request("http://localhost/webhook/stripe", {
    method: "POST",
    body: JSON.stringify(event),
    headers: { "Content-Type": "application/json" },
  });

  return app.fetch(req, {
    DB: db as unknown as D1Database,
    STRIPE_SECRET_KEY: "sk_test_xxx",
  } as unknown as Env);
}

describe("webhook /stripe", () => {
  let db: ReturnType<typeof createMockDb>;
  let app: ReturnType<typeof createApp>["app"];

  beforeEach(() => {
    vi.clearAllMocks();
    db = createMockDb();
    ({ app } = createApp(db));
  });

  describe("checkout.session.completed", () => {
    it("creates purchase record and updates user plan", async () => {
      db.first.mockResolvedValueOnce(null); // idempotent check
      db.first.mockResolvedValueOnce({ plan: "free" }); // current user

      const res = await postWebhook(app, db, "checkout.session.completed", {
        payment_intent: "pi_123",
        subscription: "sub_abc",
      }, {
        planId: "plus_monthly",
        stripeCustomerId: "cus_456",
        durationDays: "0",
      });

      expect(res.status).toBe(200);
      expect(db.prepare).toHaveBeenCalledWith(expect.stringContaining("INSERT INTO purchases"));
      expect(upsertSubscription).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          stripeSubscriptionId: "sub_abc",
          planType: "plus_monthly",
          status: "active",
        })
      );
    });

    it("is idempotent — skips if purchase already exists", async () => {
      db.first.mockResolvedValueOnce({ id: "existing" }); // idempotent check

      const res = await postWebhook(app, db, "checkout.session.completed", {
        payment_intent: "pi_123",
      }, {
        planId: "plus_monthly",
        stripeCustomerId: "cus_456",
      });

      expect(res.status).toBe(200);
      // Only 1 prepare call for the idempotent check SELECT
      expect(db.prepare).toHaveBeenCalledTimes(1);
    });

    it("applies higher-tier precedence (pro > plus)", async () => {
      db.first.mockResolvedValueOnce(null); // idempotent check
      db.first.mockResolvedValueOnce({ plan: "pro" }); // current user is pro

      const res = await postWebhook(app, db, "checkout.session.completed", {
        payment_intent: "pi_123",
        subscription: null,
      }, {
        planId: "plus_monthly",
        stripeCustomerId: "cus_456",
        durationDays: "0",
      });

      expect(res.status).toBe(200);
      // Should keep "pro" since it's higher
      expect(db.bind).toHaveBeenCalledWith("pro", null, "cus_456");
    });
  });

  describe("customer.subscription.created", () => {
    it("AC-1: creates subscription record", async () => {
      db.first.mockResolvedValueOnce({ plan: "free" }); // current user

      const res = await postWebhook(app, db, "customer.subscription.created", {
        id: "sub_new",
        customer: "cus_456",
        status: "active",
        current_period_end: 1713225600, // 2024-04-16T00:00:00Z
        cancel_at_period_end: false,
        metadata: { planId: "plus_monthly" },
      });

      expect(res.status).toBe(200);
      expect(upsertSubscription).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          stripeSubscriptionId: "sub_new",
          stripeCustomerId: "cus_456",
          planType: "plus_monthly",
          status: "active",
        })
      );
    });
  });

  describe("customer.subscription.updated", () => {
    it("AC-2: updates subscription and user plan", async () => {
      const res = await postWebhook(app, db, "customer.subscription.updated", {
        id: "sub_123",
        customer: "cus_456",
        status: "active",
        current_period_end: 1713225600,
        cancel_at_period_end: false,
        metadata: { planId: "pro_monthly" },
      });

      expect(res.status).toBe(200);
      expect(upsertSubscription).toHaveBeenCalled();
      expect(db.prepare).toHaveBeenCalledWith(expect.stringContaining("UPDATE users SET plan"));
    });

    it("AC-5: downgrades to free on past_due", async () => {
      const res = await postWebhook(app, db, "customer.subscription.updated", {
        id: "sub_123",
        customer: "cus_456",
        status: "past_due",
        current_period_end: 1713225600,
        cancel_at_period_end: false,
        metadata: { planId: "plus_monthly" },
      });

      expect(res.status).toBe(200);
      // UPDATE users SET plan = 'free' ... WHERE stripe_subscription_id = ?
      expect(db.prepare).toHaveBeenCalledWith(
        expect.stringContaining("plan = 'free'")
      );
    });
  });

  describe("customer.subscription.deleted", () => {
    it("AC-3: marks subscription as canceled", async () => {
      const res = await postWebhook(app, db, "customer.subscription.deleted", {
        id: "sub_123",
        customer: "cus_456",
      });

      expect(res.status).toBe(200);
      expect(updateSubscriptionStatus).toHaveBeenCalledWith(
        expect.anything(),
        "sub_123",
        "canceled"
      );
    });

    it("falls back to free when no other active subscription or pass", async () => {
      db.first.mockResolvedValueOnce(null); // no other active subscription
      db.first.mockResolvedValueOnce(null); // no valid pass

      const res = await postWebhook(app, db, "customer.subscription.deleted", {
        id: "sub_123",
        customer: "cus_456",
      });

      expect(res.status).toBe(200);
      expect(db.bind).toHaveBeenCalledWith("free", "cus_456");
    });

    it("falls back to pass when valid pass exists", async () => {
      db.first.mockResolvedValueOnce(null); // no other active subscription
      db.first.mockResolvedValueOnce({ plan: "pass_7d" }); // valid pass

      const res = await postWebhook(app, db, "customer.subscription.deleted", {
        id: "sub_123",
        customer: "cus_456",
      });

      expect(res.status).toBe(200);
      expect(db.bind).toHaveBeenCalledWith("pass", "cus_456");
    });
  });

  describe("invoice.payment_failed", () => {
    it("AC-4: updates subscription to past_due and downgrades user", async () => {
      const res = await postWebhook(app, db, "invoice.payment_failed", {
        id: "in_123",
        subscription: "sub_456",
      });

      expect(res.status).toBe(200);
      expect(updateSubscriptionStatus).toHaveBeenCalledWith(
        expect.anything(),
        "sub_456",
        "past_due"
      );
    });
  });

  describe("invoice.payment_succeeded", () => {
    it("restores plan after recovery from past_due", async () => {
      db.first.mockResolvedValueOnce({
        plan_type: "pro_monthly",
        stripe_customer_id: "cus_456",
      });

      const res = await postWebhook(app, db, "invoice.payment_succeeded", {
        id: "in_123",
        subscription: "sub_456",
      });

      expect(res.status).toBe(200);
      expect(updateSubscriptionStatus).toHaveBeenCalledWith(
        expect.anything(),
        "sub_456",
        "active"
      );
    });
  });

  it("returns 400 on invalid signature when secret is configured", async () => {
    const event = { type: "test" };
    const req = new Request("http://localhost/webhook/stripe", {
      method: "POST",
      body: JSON.stringify(event),
      headers: {
        "Content-Type": "application/json",
        "stripe-signature": "invalid",
      },
    });

    const res = await app.fetch(req, {
      DB: db as unknown as D1Database,
      STRIPE_SECRET_KEY: "sk_test_xxx",
      STRIPE_WEBHOOK_SECRET: "whsec_test",
    } as unknown as Env);

    expect(res.status).toBe(400);
  });
});

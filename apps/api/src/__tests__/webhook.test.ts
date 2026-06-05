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
    APP_URL: "http://localhost:8787",
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

    it("keeps user plan on past_due (grace period)", async () => {
      const res = await postWebhook(app, db, "customer.subscription.updated", {
        id: "sub_123",
        customer: "cus_456",
        status: "past_due",
        current_period_end: 1713225600,
        cancel_at_period_end: false,
        metadata: { planId: "plus_monthly" },
      });

      expect(res.status).toBe(200);
      // Should NOT downgrade to free during grace period
      expect(db.prepare).not.toHaveBeenCalledWith(
        expect.stringContaining("plan = 'free'")
      );
    });

    it("downgrades to free on unpaid (all retries exhausted)", async () => {
      const res = await postWebhook(app, db, "customer.subscription.updated", {
        id: "sub_123",
        customer: "cus_456",
        status: "unpaid",
        current_period_end: 1713225600,
        cancel_at_period_end: false,
        metadata: { planId: "plus_monthly" },
      });

      expect(res.status).toBe(200);
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
    it("updates subscription to past_due but keeps user plan (grace period)", async () => {
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
      // Should NOT downgrade user plan during grace period
      expect(db.prepare).not.toHaveBeenCalledWith(
        expect.stringContaining("plan = 'free'")
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

  it("returns 500 when STRIPE_WEBHOOK_SECRET is not configured in production", async () => {
    const event = { type: "test" };
    const req = new Request("http://localhost/webhook/stripe", {
      method: "POST",
      body: JSON.stringify(event),
      headers: { "Content-Type": "application/json" },
    });

    const res = await app.fetch(req, {
      DB: db as unknown as D1Database,
      STRIPE_SECRET_KEY: "sk_test_xxx",
      APP_URL: "https://api.quickconv.cc",
      // No STRIPE_WEBHOOK_SECRET
    } as unknown as Env);

    expect(res.status).toBe(500);
    const json = await res.json() as Record<string, unknown>;
    expect(json.error).toBe("webhook_secret_not_configured");
  });

  it("returns 400 when signature is missing in production", async () => {
    const event = { type: "test" };
    const req = new Request("http://localhost/webhook/stripe", {
      method: "POST",
      body: JSON.stringify(event),
      headers: { "Content-Type": "application/json" },
    });

    const res = await app.fetch(req, {
      DB: db as unknown as D1Database,
      STRIPE_SECRET_KEY: "sk_test_xxx",
      STRIPE_WEBHOOK_SECRET: "whsec_test",
      APP_URL: "https://api.quickconv.cc",
    } as unknown as Env);

    expect(res.status).toBe(400);
    const json = await res.json() as Record<string, unknown>;
    expect(json.error).toBe("missing_signature");
  });

  it("allows unsigned events in development (localhost)", async () => {
    const res = await postWebhook(app, db, "checkout.session.completed", {
      payment_intent: "pi_dev_test",
    }, {
      planId: "plus_monthly",
      stripeCustomerId: "cus_dev",
      durationDays: "0",
    });

    // postWebhook uses no STRIPE_WEBHOOK_SECRET and localhost → should pass
    expect(res.status).toBe(200);
  });

  // -------------------------------------------------------------------------
  // #357: API plan billing axis → api_keys.plan (separate from users.plan)
  // -------------------------------------------------------------------------
  describe("API plan billing (#357)", () => {
    function preparedSql(): string[] {
      return (db.prepare.mock.calls as unknown[][]).map((c) => String(c[0]));
    }

    it("checkout.session.completed for an API plan updates api_keys.plan to starter", async () => {
      const res = await postWebhook(app, db, "checkout.session.completed", {
        payment_intent: "pi_api_1",
        subscription: "sub_api_1",
      }, {
        planId: "api_starter_monthly",
        userEmail: "dev@example.com",
        stripeCustomerId: "cus_api_1",
      });

      expect(res.status).toBe(200);
      expect(preparedSql().some((s) => /UPDATE api_keys SET plan/.test(s))).toBe(true);
      expect(db.bind.mock.calls).toContainEqual(["starter", "dev@example.com"]);
      // must NOT write the consumer purchases/users tables for an API plan
      expect(preparedSql().some((s) => /INSERT INTO purchases/.test(s))).toBe(false);
      expect(preparedSql().some((s) => /UPDATE users SET plan/.test(s))).toBe(false);
    });

    it("api_pro_monthly maps to the pro tier", async () => {
      await postWebhook(app, db, "checkout.session.completed", {
        payment_intent: "pi_api_2",
        subscription: "sub_api_2",
      }, {
        planId: "api_pro_monthly",
        userEmail: "dev@example.com",
        stripeCustomerId: "cus_api_2",
      });
      expect(db.bind.mock.calls).toContainEqual(["pro", "dev@example.com"]);
    });

    it("customer.subscription.deleted for an API plan downgrades api_keys.plan to free", async () => {
      const res = await postWebhook(app, db, "customer.subscription.deleted", {
        id: "sub_api_1",
        customer: "cus_api_1",
      }, {
        planId: "api_starter_monthly",
        userEmail: "dev@example.com",
      });

      expect(res.status).toBe(200);
      expect(db.bind.mock.calls).toContainEqual(["free", "dev@example.com"]);
      // API-plan deletion must not fall through to the consumer downgrade logic
      expect(preparedSql().some((s) => /UPDATE users SET plan/.test(s))).toBe(false);
    });

    it("customer.subscription.updated unpaid for an API plan downgrades to free", async () => {
      await postWebhook(app, db, "customer.subscription.updated", {
        id: "sub_api_1",
        customer: "cus_api_1",
        status: "unpaid",
      }, {
        planId: "api_starter_monthly",
        userEmail: "dev@example.com",
      });
      expect(db.bind.mock.calls).toContainEqual(["free", "dev@example.com"]);
    });

    it("customer.subscription.updated active for an API plan sets the new tier", async () => {
      await postWebhook(app, db, "customer.subscription.updated", {
        id: "sub_api_1",
        customer: "cus_api_1",
        status: "active",
      }, {
        planId: "api_pro_monthly",
        userEmail: "dev@example.com",
      });
      expect(db.bind.mock.calls).toContainEqual(["pro", "dev@example.com"]);
      expect(preparedSql().some((s) => /UPDATE users SET plan/.test(s))).toBe(false);
    });

    it("subscription.deleted keeps the tier of another active API subscription (C-1)", async () => {
      // otherApi lookup returns a remaining active pro subscription
      db.first.mockResolvedValueOnce({ plan_type: "api_pro_monthly" });
      await postWebhook(app, db, "customer.subscription.deleted", {
        id: "sub_api_starter",
        customer: "cus_api_1",
      }, {
        planId: "api_starter_monthly",
        userEmail: "dev@example.com",
      });
      // must NOT downgrade to free while a pro subscription remains
      expect(db.bind.mock.calls).toContainEqual(["pro", "dev@example.com"]);
      expect(db.bind.mock.calls).not.toContainEqual(["free", "dev@example.com"]);
    });

    it("invoice.payment_succeeded for an API subscription does not touch users.plan (S-2)", async () => {
      // subscription lookup returns an API plan row
      db.first.mockResolvedValueOnce({ plan_type: "api_starter_monthly", stripe_customer_id: "cus_api_1" });
      const res = await postWebhook(app, db, "invoice.payment_succeeded", {
        subscription: "sub_api_1",
      });
      expect(res.status).toBe(200);
      expect(preparedSql().some((s) => /UPDATE users SET plan/.test(s))).toBe(false);
    });
  });
});

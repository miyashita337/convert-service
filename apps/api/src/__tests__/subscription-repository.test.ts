import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  upsertSubscription,
  getActiveSubscription,
  getSubscriptionById,
  updateSubscriptionStatus,
} from "../repositories/subscription-repository";

function createMockDb() {
  const first = vi.fn();
  const run = vi.fn();
  const bind = vi.fn(() => ({ first, run }));
  const prepare = vi.fn(() => ({ bind }));
  return { prepare, bind, first, run } as unknown as D1Database & {
    first: ReturnType<typeof vi.fn>;
    run: ReturnType<typeof vi.fn>;
    bind: ReturnType<typeof vi.fn>;
    prepare: ReturnType<typeof vi.fn>;
  };
}

const baseSub = {
  stripeSubscriptionId: "sub_123",
  stripeCustomerId: "cus_456",
  planType: "plus_monthly",
  status: "active" as const,
  currentPeriodEnd: "2026-04-16T00:00:00.000Z",
  cancelAtPeriodEnd: false,
};

describe("subscription-repository", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    db = createMockDb();
    db.run.mockResolvedValue({ success: true });
    db.first.mockResolvedValue(null);
  });

  describe("upsertSubscription", () => {
    it("calls INSERT with ON CONFLICT for idempotency", async () => {
      await upsertSubscription(db, baseSub);

      expect(db.prepare).toHaveBeenCalledWith(
        expect.stringContaining("INSERT INTO subscriptions")
      );
      expect(db.prepare).toHaveBeenCalledWith(
        expect.stringContaining("ON CONFLICT")
      );
      expect(db.bind).toHaveBeenCalledWith(
        "sub_123",
        "cus_456",
        "plus_monthly",
        "active",
        "2026-04-16T00:00:00.000Z",
        0 // cancelAtPeriodEnd = false → 0
      );
    });

    it("passes 1 for cancelAtPeriodEnd when true", async () => {
      await upsertSubscription(db, { ...baseSub, cancelAtPeriodEnd: true });

      expect(db.bind).toHaveBeenCalledWith(
        "sub_123",
        "cus_456",
        "plus_monthly",
        "active",
        "2026-04-16T00:00:00.000Z",
        1
      );
    });
  });

  describe("getActiveSubscription", () => {
    it("returns null when no active subscription found", async () => {
      db.first.mockResolvedValue(null);

      const result = await getActiveSubscription(db, "cus_456");
      expect(result).toBeNull();
    });

    it("returns mapped subscription when found", async () => {
      db.first.mockResolvedValue({
        stripe_subscription_id: "sub_123",
        stripe_customer_id: "cus_456",
        plan_type: "pro_monthly",
        status: "active",
        current_period_end: "2026-04-16T00:00:00.000Z",
        cancel_at_period_end: 0,
      });

      const result = await getActiveSubscription(db, "cus_456");
      expect(result).toEqual({
        stripeSubscriptionId: "sub_123",
        stripeCustomerId: "cus_456",
        planType: "pro_monthly",
        status: "active",
        currentPeriodEnd: "2026-04-16T00:00:00.000Z",
        cancelAtPeriodEnd: false,
      });
    });

    it("queries for active and trialing statuses only", async () => {
      await getActiveSubscription(db, "cus_456");

      expect(db.prepare).toHaveBeenCalledWith(
        expect.stringContaining("status IN ('active', 'trialing')")
      );
    });
  });

  describe("getSubscriptionById", () => {
    it("returns null when not found", async () => {
      db.first.mockResolvedValue(null);

      const result = await getSubscriptionById(db, "sub_999");
      expect(result).toBeNull();
    });

    it("returns mapped subscription when found", async () => {
      db.first.mockResolvedValue({
        stripe_subscription_id: "sub_123",
        stripe_customer_id: "cus_456",
        plan_type: "plus_yearly",
        status: "trialing",
        current_period_end: null,
        cancel_at_period_end: 1,
      });

      const result = await getSubscriptionById(db, "sub_123");
      expect(result).toEqual({
        stripeSubscriptionId: "sub_123",
        stripeCustomerId: "cus_456",
        planType: "plus_yearly",
        status: "trialing",
        currentPeriodEnd: null,
        cancelAtPeriodEnd: true,
      });
    });
  });

  describe("updateSubscriptionStatus", () => {
    it("updates status and cancelAtPeriodEnd", async () => {
      await updateSubscriptionStatus(db, "sub_123", "canceled", true);

      expect(db.prepare).toHaveBeenCalledWith(
        expect.stringContaining("UPDATE subscriptions SET status")
      );
      expect(db.bind).toHaveBeenCalledWith("canceled", 1, "sub_123");
    });

    it("defaults cancelAtPeriodEnd to false", async () => {
      await updateSubscriptionStatus(db, "sub_123", "active");

      expect(db.bind).toHaveBeenCalledWith("active", 0, "sub_123");
    });
  });
});

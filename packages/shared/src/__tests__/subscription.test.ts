import { describe, it, expect } from "vitest";
import { higherPlan, isActiveSubscription, type UserPlan } from "../types/subscription";

describe("subscription", () => {
  describe("higherPlan", () => {
    it("returns pro when comparing pro vs plus", () => {
      expect(higherPlan("pro", "plus")).toBe("pro");
      expect(higherPlan("plus", "pro")).toBe("pro");
    });

    it("returns plus when comparing plus vs pass", () => {
      expect(higherPlan("plus", "pass")).toBe("plus");
      expect(higherPlan("pass", "plus")).toBe("plus");
    });

    it("returns pass when comparing pass vs free", () => {
      expect(higherPlan("pass", "free")).toBe("pass");
      expect(higherPlan("free", "pass")).toBe("pass");
    });

    it("returns same plan when both are equal", () => {
      const plans: UserPlan[] = ["free", "pass", "plus", "pro"];
      for (const plan of plans) {
        expect(higherPlan(plan, plan)).toBe(plan);
      }
    });

    it("returns pro over free (skip levels)", () => {
      expect(higherPlan("pro", "free")).toBe("pro");
      expect(higherPlan("free", "pro")).toBe("pro");
    });
  });

  describe("isActiveSubscription", () => {
    it("returns true for active", () => {
      expect(isActiveSubscription("active")).toBe(true);
    });

    it("returns true for trialing", () => {
      expect(isActiveSubscription("trialing")).toBe(true);
    });

    it("returns false for canceled", () => {
      expect(isActiveSubscription("canceled")).toBe(false);
    });

    it("returns false for past_due", () => {
      expect(isActiveSubscription("past_due")).toBe(false);
    });

    it("returns false for unpaid", () => {
      expect(isActiveSubscription("unpaid")).toBe(false);
    });
  });
});

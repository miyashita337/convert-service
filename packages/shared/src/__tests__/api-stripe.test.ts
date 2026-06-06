import { describe, it, expect } from "vitest";
import {
  API_PLAN_IDS,
  isApiPlanId,
  apiPlanTierFromId,
  getApiStripePriceId,
} from "../constants/stripe";

describe("API plan stripe helpers (#357)", () => {
  describe("isApiPlanId", () => {
    it("returns true for api_* plan ids", () => {
      expect(isApiPlanId("api_starter_monthly")).toBe(true);
      expect(isApiPlanId("api_pro_monthly")).toBe(true);
    });
    it("returns false for consumer plan ids and junk", () => {
      expect(isApiPlanId("pro_monthly")).toBe(false);
      expect(isApiPlanId("plus_monthly")).toBe(false);
      expect(isApiPlanId(undefined)).toBe(false);
      expect(isApiPlanId(null)).toBe(false);
      expect(isApiPlanId("")).toBe(false);
    });
  });

  describe("apiPlanTierFromId", () => {
    it("maps api plan ids to api_keys.plan tier", () => {
      expect(apiPlanTierFromId("api_starter_monthly")).toBe("starter");
      expect(apiPlanTierFromId("api_pro_monthly")).toBe("pro");
    });
    it("falls back to free for unknown ids", () => {
      expect(apiPlanTierFromId("api_unknown")).toBe("free");
      expect(apiPlanTierFromId("pro_monthly")).toBe("free");
    });
  });

  describe("getApiStripePriceId", () => {
    it("resolves a non-empty TEST price id for both currencies", () => {
      expect(getApiStripePriceId("api_starter_monthly", "jpy", true)).toMatch(/^price_/);
      expect(getApiStripePriceId("api_starter_monthly", "usd", true)).toMatch(/^price_/);
      expect(getApiStripePriceId("api_pro_monthly", "jpy", true)).toMatch(/^price_/);
    });

    it("returns null for LIVE because the products are not yet approved (empty string)", () => {
      // LIVE 未承認ゲート: 空文字 → null → checkout 側で 503
      expect(getApiStripePriceId("api_starter_monthly", "jpy", false)).toBeNull();
      expect(getApiStripePriceId("api_pro_monthly", "usd", false)).toBeNull();
    });

    it("returns null for unknown plan ids", () => {
      expect(getApiStripePriceId("api_does_not_exist", "jpy", true)).toBeNull();
    });
  });

  it("API_PLAN_IDS lists exactly the billable plans", () => {
    expect([...API_PLAN_IDS]).toEqual(["api_starter_monthly", "api_pro_monthly"]);
  });
});

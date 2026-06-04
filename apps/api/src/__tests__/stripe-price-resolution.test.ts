import { describe, it, expect } from "vitest";
import {
  STRIPE_PRICE_IDS,
  STRIPE_PRICE_IDS_TEST,
  getStripePriceIdMap,
  isStripeTestMode,
} from "@quickconv/shared";
import { resolveStripePriceId, isTestModeEnv, PLAN_CONFIGS, type PlanId } from "../services/stripe";
import type { Env } from "../types/env";

/**
 * #343: staging（test-mode キー）では test Price ID を、production（live キー）では live Price ID を
 * 解決しなければならない。test-mode に live Price ID を渡すと Stripe が 500 を返し E2E が落ちる。
 */
describe("Stripe price resolution (test/live mode switch) - #343", () => {
  it("isStripeTestMode は sk_test を true、sk_live を false と判定する", () => {
    expect(isStripeTestMode("sk_test_abc")).toBe(true);
    expect(isStripeTestMode("sk_live_abc")).toBe(false);
    expect(isStripeTestMode(undefined)).toBe(false);
    expect(isStripeTestMode("")).toBe(false);
  });

  it("isTestModeEnv は env.STRIPE_SECRET_KEY の接頭辞で判定する", () => {
    expect(isTestModeEnv({ STRIPE_SECRET_KEY: "sk_test_x" } as Env)).toBe(true);
    expect(isTestModeEnv({ STRIPE_SECRET_KEY: "sk_live_x" } as Env)).toBe(false);
  });

  it("isTest=true は TEST マップ、false は LIVE マップを解決する", () => {
    expect(resolveStripePriceId("plus_monthly", "jpy", true)).toBe(STRIPE_PRICE_IDS_TEST.plus_monthly.jpy);
    expect(resolveStripePriceId("plus_monthly", "jpy", false)).toBe(STRIPE_PRICE_IDS.plus_monthly.jpy);
  });

  it("test と live の Price ID は別物である（取り違え防止の回帰）", () => {
    for (const planId of Object.keys(STRIPE_PRICE_IDS) as PlanId[]) {
      for (const currency of ["jpy", "usd"] as const) {
        const live = resolveStripePriceId(planId, currency, false);
        const test = resolveStripePriceId(planId, currency, true);
        expect(test).not.toBe(live);
        expect(test).toMatch(/^price_/);
        expect(live).toMatch(/^price_/);
      }
    }
  });

  it("全プラン×全通貨で TEST マップに Price ID が存在する（staging で undefined にならない）", () => {
    for (const planId of Object.keys(PLAN_CONFIGS) as PlanId[]) {
      for (const currency of ["jpy", "usd"] as const) {
        expect(getStripePriceIdMap(true)[planId]?.[currency]).toMatch(/^price_/);
      }
    }
  });

  it("通貨が無い場合は jpy にフォールバックする", () => {
    // @ts-expect-error - 無効通貨でのフォールバック挙動を検証
    expect(resolveStripePriceId("pro_monthly", "eur", true)).toBe(STRIPE_PRICE_IDS_TEST.pro_monthly.jpy);
  });
});

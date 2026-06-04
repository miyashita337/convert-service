import Stripe from "stripe";
import type { Env } from "../types/env";
import { getStripePriceIdMap, isStripeTestMode, type SupportedCurrency } from "@quickconv/shared";

export function createStripeClient(env: Env): Stripe {
  return new Stripe(env.STRIPE_SECRET_KEY, {
    apiVersion: "2026-02-25.clover",
    httpClient: Stripe.createFetchHttpClient(),
  });
}

export type PlanId = "pass_7d" | "pass_30d" | "plus_monthly" | "plus_yearly" | "pro_monthly" | "pro_yearly";

interface PlanConfig {
  name: string;
  mode: "payment" | "subscription";
  interval?: "month" | "year";
  durationDays?: number;
}

export const PLAN_CONFIGS: Record<PlanId, PlanConfig> = {
  pass_7d: { name: "QuickConv 7-Day Pass", mode: "payment", durationDays: 7 },
  pass_30d: { name: "QuickConv 30-Day Pass", mode: "payment", durationDays: 30 },
  plus_monthly: { name: "QuickConv Plus", mode: "subscription", interval: "month" },
  plus_yearly: { name: "QuickConv Plus (Annual)", mode: "subscription", interval: "year" },
  pro_monthly: { name: "QuickConv Pro", mode: "subscription", interval: "month" },
  pro_yearly: { name: "QuickConv Pro (Annual)", mode: "subscription", interval: "year" },
};

export function isValidPlanId(id: string): id is PlanId {
  return id in PLAN_CONFIGS;
}

/**
 * Resolve the Stripe Price ID for a given plan and currency.
 * isTest=true のとき test-mode マップ（staging 用）を解決する。
 * Falls back to JPY if the currency is not found.
 */
export function resolveStripePriceId(
  planId: PlanId,
  currency: SupportedCurrency = "jpy",
  isTest = false,
): string {
  const config = getStripePriceIdMap(isTest)[planId];
  if (!config) throw new Error(`Unknown planId: ${planId}`);
  return config[currency] ?? config.jpy;
}

/** env.STRIPE_SECRET_KEY の接頭辞から test-mode かを判定する */
export function isTestModeEnv(env: Env): boolean {
  return isStripeTestMode(env.STRIPE_SECRET_KEY);
}

export { type SupportedCurrency };

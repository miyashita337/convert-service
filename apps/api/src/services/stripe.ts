import Stripe from "stripe";
import type { Env } from "../types/env";

export function createStripeClient(env: Env): Stripe {
  return new Stripe(env.STRIPE_SECRET_KEY, {
    apiVersion: "2026-02-25.clover",
    httpClient: Stripe.createFetchHttpClient(),
  });
}

export type PlanId = "pass_7d" | "pass_30d" | "plus_monthly" | "plus_yearly" | "pro_monthly" | "pro_yearly";

interface PlanConfig {
  name: string;
  amount: number;
  currency: string;
  mode: "payment" | "subscription";
  interval?: "month" | "year";
  durationDays?: number;
}

export const PLAN_CONFIGS: Record<PlanId, PlanConfig> = {
  pass_7d: { name: "QuickConv 7-Day Pass", amount: 450, currency: "jpy", mode: "payment", durationDays: 7 },
  pass_30d: { name: "QuickConv 30-Day Pass", amount: 980, currency: "jpy", mode: "payment", durationDays: 30 },
  plus_monthly: { name: "QuickConv Plus", amount: 380, currency: "jpy", mode: "subscription", interval: "month" },
  plus_yearly: { name: "QuickConv Plus (Annual)", amount: 3800, currency: "jpy", mode: "subscription", interval: "year" },
  pro_monthly: { name: "QuickConv Pro", amount: 1280, currency: "jpy", mode: "subscription", interval: "month" },
  pro_yearly: { name: "QuickConv Pro (Annual)", amount: 12800, currency: "jpy", mode: "subscription", interval: "year" },
};

export function isValidPlanId(id: string): id is PlanId {
  return id in PLAN_CONFIGS;
}

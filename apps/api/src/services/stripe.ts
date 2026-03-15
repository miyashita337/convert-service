import Stripe from "stripe";
import type { Env } from "../types/env";

export function createStripeClient(env: Env): Stripe {
  return new Stripe(env.STRIPE_SECRET_KEY, {
    apiVersion: "2026-02-25.clover",
    httpClient: Stripe.createFetchHttpClient(),
  });
}

export type PlanId = "pass_7d" | "pass_30d";

interface PlanConfig {
  name: string;
  amount: number;
  currency: string;
  durationDays: number;
}

export const PLAN_CONFIGS: Record<PlanId, PlanConfig> = {
  pass_7d: {
    name: "QuickConv 7-Day Pass",
    amount: 450,
    currency: "jpy",
    durationDays: 7,
  },
  pass_30d: {
    name: "QuickConv 30-Day Pass",
    amount: 980,
    currency: "jpy",
    durationDays: 30,
  },
};

export function isValidPlanId(id: string): id is PlanId {
  return id in PLAN_CONFIGS;
}

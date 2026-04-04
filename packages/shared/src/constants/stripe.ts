/**
 * Stripe Price IDs (test mode / sandbox)
 * These IDs map to pre-created products in the Stripe dashboard.
 * Switch to live mode IDs via environment variable overrides in production.
 */

export interface StripePriceConfig {
  jpy: string;
  usd: string;
}

/** Stripe Price IDs per plan and currency (LIVE mode) */
export const STRIPE_PRICE_IDS: Record<string, StripePriceConfig> = {
  pass_7d: {
    jpy: "price_1TIYNDBsqjfyEDMQED9FRqCI",
    usd: "price_1TIYNCBsqjfyEDMQdCYC4Nmn",
  },
  pass_30d: {
    jpy: "price_1TIYNEBsqjfyEDMQ40EDKzhq",
    usd: "price_1TIYNEBsqjfyEDMQlIxO0OH6",
  },
  plus_monthly: {
    jpy: "price_1TIYNEBsqjfyEDMQYVke8YiN",
    usd: "price_1TIYNDBsqjfyEDMQo9M4xprG",
  },
  plus_yearly: {
    jpy: "price_1TIYNDBsqjfyEDMQxwNORl50",
    usd: "price_1TIYNCBsqjfyEDMQt2piUoW1",
  },
  pro_monthly: {
    jpy: "price_1TIYNEBsqjfyEDMQrBl1kw1n",
    usd: "price_1TIYNDBsqjfyEDMQUy2OqXec",
  },
  pro_yearly: {
    jpy: "price_1TIYNEBsqjfyEDMQJNfIpWsj",
    usd: "price_1TIYNCBsqjfyEDMQHegHIIDR",
  },
};

/** Supported currencies */
export type SupportedCurrency = "jpy" | "usd";

/** Resolve the correct Stripe Price ID for a plan and currency */
export function getStripePriceId(planId: string, currency: SupportedCurrency): string | null {
  const config = STRIPE_PRICE_IDS[planId];
  if (!config) return null;
  return config[currency];
}

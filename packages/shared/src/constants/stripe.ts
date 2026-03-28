/**
 * Stripe Price IDs (test mode / sandbox)
 * These IDs map to pre-created products in the Stripe dashboard.
 * Switch to live mode IDs via environment variable overrides in production.
 */

export interface StripePriceConfig {
  jpy: string;
  usd: string;
}

/** Stripe Price IDs per plan and currency */
export const STRIPE_PRICE_IDS: Record<string, StripePriceConfig> = {
  pass_7d: {
    jpy: "price_1TCzCoAxIqELGvqZIae0Z6nS",
    usd: "price_1TCzCpAxIqELGvqZ3QUfhWhh",
  },
  pass_30d: {
    jpy: "price_1TFzVVAxIqELGvqZOgrMTTYS",
    usd: "price_1TFzVWAxIqELGvqZgFBHGvDx",
  },
  plus_monthly: {
    jpy: "price_1TCzD6AxIqELGvqZOUspjkhE",
    usd: "price_1TCzD8AxIqELGvqZCnSwJYZh",
  },
  plus_yearly: {
    jpy: "price_1TCzD7AxIqELGvqZMChBD1zR",
    usd: "price_1TCzD8AxIqELGvqZnEOHgR6U",
  },
  pro_monthly: {
    jpy: "price_1TCzDMAxIqELGvqZQkv7W2fr",
    usd: "price_1TCzDOAxIqELGvqZk6xxDyXh",
  },
  pro_yearly: {
    jpy: "price_1TCzDNAxIqELGvqZjp2Um7KL",
    usd: "price_1TCzDPAxIqELGvqZ1tuOLtUD",
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

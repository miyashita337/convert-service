/**
 * Stripe Price IDs.
 * LIVE / TEST の2マップを保持し、STRIPE_SECRET_KEY の接頭辞 (sk_test / sk_live) で
 * 自動切替する。staging は test-mode キーなので TEST マップ、production は LIVE マップを解決する (#343)。
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

/**
 * Stripe Price IDs per plan and currency (TEST mode).
 * 本番(LIVE)価格を test-mode にミラーした ID。staging（test-mode キー）で使用する (#343)。
 */
export const STRIPE_PRICE_IDS_TEST: Record<string, StripePriceConfig> = {
  pass_7d: {
    jpy: "price_1TealsBsqjfyEDMQDmN2YaZn",
    usd: "price_1TealsBsqjfyEDMQjDGL3jat",
  },
  pass_30d: {
    jpy: "price_1TealtBsqjfyEDMQi1lUMTbC",
    usd: "price_1TealuBsqjfyEDMQeRUbjjKy",
  },
  plus_monthly: {
    jpy: "price_1TealvBsqjfyEDMQIXfTx6k7",
    usd: "price_1TealwBsqjfyEDMQ3CWajRR2",
  },
  plus_yearly: {
    jpy: "price_1TealwBsqjfyEDMQPEoRrHSE",
    usd: "price_1TealyBsqjfyEDMQzFZoCCzT",
  },
  pro_monthly: {
    jpy: "price_1TealyBsqjfyEDMQXuhKQMQh",
    usd: "price_1TealzBsqjfyEDMQ5ZsFrS4Z",
  },
  pro_yearly: {
    jpy: "price_1Team0BsqjfyEDMQobV9JblV",
    usd: "price_1Team1BsqjfyEDMQgL9IkTre",
  },
};

/** Stripe シークレットキーの接頭辞から test-mode かを判定する */
export function isStripeTestMode(secretKey: string | undefined | null): boolean {
  return typeof secretKey === "string" && secretKey.startsWith("sk_test");
}

/** モードに応じた Price ID マップを返す（test→TESTマップ / live→LIVEマップ） */
export function getStripePriceIdMap(isTest: boolean): Record<string, StripePriceConfig> {
  return isTest ? STRIPE_PRICE_IDS_TEST : STRIPE_PRICE_IDS;
}

/** Supported currencies */
export type SupportedCurrency = "jpy" | "usd";

/** Resolve the correct Stripe Price ID for a plan and currency（モード切替対応） */
export function getStripePriceId(
  planId: string,
  currency: SupportedCurrency,
  isTest = false,
): string | null {
  const config = getStripePriceIdMap(isTest)[planId];
  if (!config) return null;
  return config[currency];
}

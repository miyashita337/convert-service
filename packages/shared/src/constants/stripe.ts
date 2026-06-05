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

// ---------------------------------------------------------------------------
// 開発者向け API プラン（消費者プランとは別軸の課金。api_keys.plan を更新する）
// #357 / Epic #280。tier は api_keys.plan の CHECK 制約（free/starter/pro）に対応。
// ---------------------------------------------------------------------------

/** 課金可能な API プランID一覧 */
export const API_PLAN_IDS = ["api_starter_monthly", "api_pro_monthly"] as const;
export type ApiPlanId = (typeof API_PLAN_IDS)[number];

/**
 * API プランの Stripe Price ID (LIVE mode)。
 * LIVE Product/Price は本番課金操作のため未承認 = 空文字。
 * checkout は空文字を検出したら 503 を返す（fail-fast、本番課金導線の承認ゲート）。
 */
export const API_STRIPE_PRICE_IDS: Record<string, StripePriceConfig> = {
  api_starter_monthly: { jpy: "", usd: "" },
  api_pro_monthly: { jpy: "", usd: "" },
};

/**
 * API プランの Stripe Price ID (TEST mode)。staging で使用 (#357)。
 * test product: Starter=prod_UdwLvbf34dbr4Y(¥980/mo) / Pro=prod_UdwPu6GANV2C5A(¥4,980/mo)。
 */
export const API_STRIPE_PRICE_IDS_TEST: Record<string, StripePriceConfig> = {
  api_starter_monthly: {
    jpy: "price_1TeeURBsqjfyEDMQMIRXFVvl",
    usd: "price_1TeeWsBsqjfyEDMQI6Dsom5S",
  },
  api_pro_monthly: {
    jpy: "price_1TeeWvBsqjfyEDMQW4ykKV7b",
    usd: "price_1TeeWwBsqjfyEDMQJ1pqcD1s",
  },
};

/** planId が API プラン軸かを判定する（消費者プランと区別する） */
export function isApiPlanId(planId: string | undefined | null): boolean {
  return typeof planId === "string" && planId.startsWith("api_");
}

/** API プランID → api_keys.plan tier（free/starter/pro）。不明は free。 */
export function apiPlanTierFromId(planId: string): "free" | "starter" | "pro" {
  if (planId.startsWith("api_pro")) return "pro";
  if (planId.startsWith("api_starter")) return "starter";
  return "free";
}

/** モードに応じた API プランの Price ID マップを返す */
export function getApiStripePriceIdMap(isTest: boolean): Record<string, StripePriceConfig> {
  return isTest ? API_STRIPE_PRICE_IDS_TEST : API_STRIPE_PRICE_IDS;
}

/**
 * API プランの Price ID を解決する。
 * LIVE 未承認（空文字）または未知プランは null（呼び出し側で 503 fail-fast）。
 */
export function getApiStripePriceId(
  planId: string,
  currency: SupportedCurrency,
  isTest = false,
): string | null {
  const config = getApiStripePriceIdMap(isTest)[planId];
  if (!config) return null;
  const id = config[currency] ?? config.jpy;
  return id && id.length > 0 ? id : null;
}

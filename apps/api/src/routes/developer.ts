import { Hono } from "hono";
import type { Env, AppVariables } from "../types/env";
import {
  createApiKeyWithLimit,
  listApiKeysByUser,
  revokeApiKey,
} from "../repositories/api-key-repository";
import { createStripeClient, isTestModeEnv } from "../services/stripe";
import { API_PLAN_IDS, getApiStripePriceId, type SupportedCurrency } from "@quickconv/shared";

const developer = new Hono<{ Bindings: Env; Variables: AppVariables }>();

/** Require authenticated user */
function requireAuth(c: { get: (key: "user") => AppVariables["user"]; json: (body: unknown, status: number) => Response }) {
  const user = c.get("user");
  if (!user) {
    return c.json({ error: { code: "unauthorized", message: "Login required" } }, 401);
  }
  return user;
}

/** Resolve the frontend origin from FRONTEND_URL, or by stripping the api. host prefix. */
function resolveFrontendBase(env: Env): string {
  if (env.FRONTEND_URL) return env.FRONTEND_URL;
  const appUrl = new URL(env.APP_URL);
  if (appUrl.hostname.startsWith("api.")) {
    appUrl.hostname = appUrl.hostname.slice(4);
  }
  return appUrl.origin;
}

// POST /api/developer/keys — Create a new API key
developer.post("/keys", async (c) => {
  const user = requireAuth(c);
  if (user instanceof Response) return user;

  // Distinguish empty body (allowed) from malformed JSON (400)
  const text = await c.req.text();
  let name = "Default";
  if (text.length > 0) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      return c.json({ error: { code: "validation", message: "Invalid JSON body" } }, 400);
    }
    const rawName = parsed && typeof parsed === "object" && "name" in parsed
      ? (parsed as Record<string, unknown>).name
      : undefined;
    name = typeof rawName === "string" ? rawName.trim().slice(0, 64) || "Default" : "Default";
  }

  const result = await createApiKeyWithLimit(c.env.DB, user.email, name, 5);
  if (!result) {
    return c.json({ error: { code: "limit", message: "Maximum 5 active API keys per account" } }, 400);
  }

  return c.json({
    key: result.key,
    id: result.info.id,
    name: result.info.name,
    prefix: result.info.keyPrefix,
    plan: result.info.plan,
    createdAt: result.info.createdAt,
    message: "Store this key securely. It will not be shown again.",
  }, 201);
});

// GET /api/developer/keys — List user's API keys
developer.get("/keys", async (c) => {
  const user = requireAuth(c);
  if (user instanceof Response) return user;

  const keys = await listApiKeysByUser(c.env.DB, user.email);

  const currentMonth = new Date().toISOString().slice(0, 7);
  return c.json({
    keys: keys.map((k) => ({
      id: k.id,
      prefix: k.keyPrefix,
      name: k.name,
      plan: k.plan,
      monthlyCount: k.countMonth === currentMonth ? k.monthlyCount : 0,
      createdAt: k.createdAt,
    })),
  });
});

// DELETE /api/developer/keys/:id — Revoke an API key
developer.delete("/keys/:id", async (c) => {
  const user = requireAuth(c);
  if (user instanceof Response) return user;

  const id = c.req.param("id");
  const revoked = await revokeApiKey(c.env.DB, id, user.email);

  if (!revoked) {
    return c.json({ error: { code: "not_found", message: "API key not found" } }, 404);
  }

  return c.json({ message: "API key revoked" });
});

// POST /api/developer/checkout — Start a Stripe Checkout for an API plan upgrade.
// 消費者プラン checkout (/api/checkout) とは別軸。webhook が api_keys.plan を更新する。
developer.post("/checkout", async (c) => {
  const user = requireAuth(c);
  if (user instanceof Response) return user;

  const body = await c.req.json<{ planId?: string; currency?: string; locale?: string }>().catch(() => null);
  const planId = body?.planId;
  if (!planId || !(API_PLAN_IDS as readonly string[]).includes(planId)) {
    return c.json({ error: { code: "invalid_plan", message: "Invalid API plan ID." } }, 400);
  }

  const currency: SupportedCurrency = body?.currency === "usd" ? "usd" : "jpy";
  const isTest = isTestModeEnv(c.env);
  const priceId = getApiStripePriceId(planId, currency, isTest);
  if (!priceId) {
    // LIVE Price 未承認（空文字）= 本番課金導線が未開通。fail-fast で 503。
    console.warn(`API plan checkout unavailable: planId=${planId} currency=${currency} isTest=${isTest} (LIVE price not approved)`);
    return c.json(
      { error: { code: "not_available", message: "API plan billing is not available yet." } },
      503,
    );
  }

  const stripe = createStripeClient(c.env);
  const frontendBase = resolveFrontendBase(c.env);
  const locale = body?.locale === "ja" ? "ja" : "en";
  const frontendUrl = `${frontendBase.replace(/\/+$/, "")}/${locale}`;

  // Reuse a real Stripe Customer when available (must start with "cus_").
  const hasRealStripeId = user.stripeCustomerId?.startsWith("cus_");
  const customerParams = hasRealStripeId
    ? { customer: user.stripeCustomerId! }
    : { customer_email: user.email };

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      // planId/userEmail を session と subscription 双方の metadata に載せ、
      // checkout.session.completed と customer.subscription.* の両経路で webhook が解決できるようにする。
      metadata: { planId, userEmail: user.email, stripeCustomerId: user.stripeCustomerId || "" },
      subscription_data: { metadata: { planId, userEmail: user.email } },
      ...customerParams,
      success_url: `${frontendUrl}/developers?upgraded=1`,
      cancel_url: `${frontendUrl}/developers?canceled=1`,
    });
    return c.json({ url: session.url });
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error("API plan checkout error:", errMsg);
    return c.json({ error: { code: "checkout_failed", message: "Failed to create checkout session." } }, 500);
  }
});

export default developer;

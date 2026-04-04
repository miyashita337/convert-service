import { Hono } from "hono";
import type { Env, AppVariables } from "../types/env";
import { createStripeClient, PLAN_CONFIGS, isValidPlanId, resolveStripePriceId, type SupportedCurrency } from "../services/stripe";

const checkout = new Hono<{ Bindings: Env; Variables: AppVariables }>();

/** Rate limit: max 10 checkout sessions per user per hour */
const CHECKOUT_RATE_LIMIT = 10;

async function checkCheckoutRateLimit(db: D1Database, email: string): Promise<boolean> {
  const hourKey = new Date().toISOString().slice(0, 13); // YYYY-MM-DDTHH
  const row = await db
    .prepare(
      `SELECT count FROM hourly_request_counts WHERE client_hash = ? AND hour_key = ? AND endpoint = 'checkout'`
    )
    .bind(email, hourKey)
    .first<{ count: number }>();

  const currentCount = row?.count ?? 0;
  if (currentCount >= CHECKOUT_RATE_LIMIT) return false;

  await db
    .prepare(
      `INSERT INTO hourly_request_counts (client_hash, hour_key, endpoint, count)
       VALUES (?, ?, 'checkout', 1)
       ON CONFLICT(client_hash, hour_key, endpoint) DO UPDATE SET count = count + 1`
    )
    .bind(email, hourKey)
    .run();

  return true;
}

checkout.post("/", async (c) => {
  const user = c.get("user");
  if (!user) {
    return c.json({ error: "authentication_required", message: "Please log in to purchase." }, 401);
  }

  const body = await c.req.json<{ planId: string; currency?: string; locale?: string }>().catch(() => null);
  if (!body?.planId || !isValidPlanId(body.planId)) {
    return c.json({ error: "invalid_plan", message: "Invalid plan ID." }, 400);
  }

  // Rate limit check
  const allowed = await checkCheckoutRateLimit(c.env.DB, user.email);
  if (!allowed) {
    return c.json({ error: "rate_limit_exceeded", message: "Too many checkout requests. Please try again later." }, 429);
  }

  const currency: SupportedCurrency = body.currency === "usd" ? "usd" : "jpy";
  const plan = PLAN_CONFIGS[body.planId];
  const stripe = createStripeClient(c.env);
  const frontendBase = c.env.FRONTEND_URL || c.env.APP_URL.replace("api.", "");
  const locale = body.locale === "ja" ? "ja" : "en";
  const frontendUrl = `${frontendBase}/${locale}`;

  let stripePriceId: string;
  try {
    stripePriceId = resolveStripePriceId(body.planId, currency);
  } catch {
    return c.json({ error: "invalid_plan", message: "Invalid plan ID." }, 400);
  }

  // Reuse existing Stripe Customer ID if available
  const customerParams = user.stripeCustomerId
    ? { customer: user.stripeCustomerId }
    : { customer_email: user.email };

  try {
    if (plan.mode === "subscription") {
      const session = await stripe.checkout.sessions.create({
        mode: "subscription",
        payment_method_types: ["card"],
        line_items: [{ price: stripePriceId, quantity: 1 }],
        metadata: { planId: body.planId, userEmail: user.email, stripeCustomerId: user.stripeCustomerId || "" },
        ...customerParams,
        success_url: `${frontendUrl}/purchase/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${frontendUrl}/purchase/cancel`,
      });
      return c.json({ url: session.url });
    }

    // One-time payment (pass)
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [{ price: stripePriceId, quantity: 1 }],
      metadata: {
        planId: body.planId,
        userEmail: user.email,
        stripeCustomerId: user.stripeCustomerId || "",
        durationDays: String(plan.durationDays),
      },
      ...customerParams,
      success_url: `${frontendUrl}/purchase/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${frontendUrl}/purchase/cancel`,
    });
    return c.json({ url: session.url });
  } catch (err) {
    console.error("Stripe checkout error:", err);
    return c.json({ error: "checkout_failed", message: "Failed to create checkout session." }, 500);
  }
});

export default checkout;

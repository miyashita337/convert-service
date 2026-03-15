import { Hono } from "hono";
import type { Env, AppVariables } from "../types/env";
import { createStripeClient } from "../services/stripe";

const account = new Hono<{ Bindings: Env; Variables: AppVariables }>();

// GET /api/account — get current user account info with active purchase
account.get("/", async (c) => {
  const user = c.get("user");
  if (!user) {
    return c.json({ error: "authentication_required" }, 401);
  }

  // Get active purchase
  const purchase = await c.env.DB.prepare(
    `SELECT plan, type, expires_at, created_at FROM purchases
     WHERE stripe_customer_id = ?
     AND (expires_at IS NULL OR expires_at > datetime('now'))
     ORDER BY created_at DESC LIMIT 1`
  ).bind(user.stripeCustomerId || "").first();

  return c.json({
    email: user.email,
    plan: user.plan,
    activePurchase: purchase ? {
      plan: purchase.plan as string,
      type: purchase.type as string,
      expiresAt: purchase.expires_at as string | null,
    } : null,
  });
});

// POST /api/account/portal — create Stripe Customer Portal session
account.post("/portal", async (c) => {
  const user = c.get("user");
  if (!user || !user.stripeCustomerId) {
    return c.json({ error: "no_subscription" }, 400);
  }

  const stripe = createStripeClient(c.env);
  const frontendUrl = c.env.APP_URL.replace("api.", "");

  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: user.stripeCustomerId,
      return_url: `${frontendUrl}/account`,
    });
    return c.json({ url: session.url });
  } catch (err) {
    console.error("Portal session error:", err);
    return c.json({ error: "portal_failed" }, 500);
  }
});

export default account;

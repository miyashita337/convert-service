import { Hono } from "hono";
import type { Env, AppVariables } from "../types/env";
import { createStripeClient } from "../services/stripe";

const webhook = new Hono<{ Bindings: Env; Variables: AppVariables }>();

// POST /api/webhook/stripe — handle Stripe webhook events
webhook.post("/stripe", async (c) => {
  const stripe = createStripeClient(c.env);
  const body = await c.req.text();
  const signature = c.req.header("stripe-signature");

  let event;

  // Verify webhook signature if secret is configured
  if (c.env.STRIPE_WEBHOOK_SECRET && signature) {
    try {
      event = await stripe.webhooks.constructEventAsync(
        body,
        signature,
        c.env.STRIPE_WEBHOOK_SECRET
      );
    } catch (err) {
      console.error("Webhook signature verification failed:", err);
      return c.json({ error: "invalid_signature" }, 400);
    }
  } else {
    // In development/testing without webhook secret
    event = JSON.parse(body);
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const metadata = session.metadata || {};
    const planId = metadata.planId;
    const userEmail = metadata.customerEmail || metadata.userEmail;
    const stripeCustomerId = metadata.stripeCustomerId;
    const durationDays = parseInt(metadata.durationDays || "7", 10);
    const paymentIntentId =
      typeof session.payment_intent === "string"
        ? session.payment_intent
        : session.payment_intent?.id || session.id;

    if (!planId || !userEmail) {
      console.error("Missing metadata in checkout session:", session.id);
      return c.json({ received: true, warning: "missing_metadata" });
    }

    // Calculate expiry
    const now = new Date();
    const expiresAt = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000);

    // Idempotent upsert — check if payment_intent already processed
    const existing = await c.env.DB.prepare(
      "SELECT id FROM purchases WHERE stripe_payment_intent_id = ?"
    )
      .bind(paymentIntentId)
      .first();

    if (existing) {
      return c.json({ received: true, status: "already_processed" });
    }

    // Insert purchase record
    const purchaseId = crypto.randomUUID();
    await c.env.DB.prepare(
      `INSERT INTO purchases (id, stripe_customer_id, plan, type, stripe_payment_intent_id, expires_at)
       VALUES (?, ?, ?, 'pass', ?, ?)`
    )
      .bind(
        purchaseId,
        stripeCustomerId || "",
        planId,
        paymentIntentId,
        expiresAt.toISOString()
      )
      .run();

    // Update user plan
    if (stripeCustomerId) {
      await c.env.DB.prepare(
        "UPDATE users SET plan = ?, updated_at = datetime('now') WHERE stripe_customer_id = ?"
      )
        .bind(planId === "pass_7d" || planId === "pass_30d" ? "pass" : planId, stripeCustomerId)
        .run();
    }

    console.log(`Purchase created: ${purchaseId} for ${userEmail}, plan: ${planId}, expires: ${expiresAt.toISOString()}`);
  }

  return c.json({ received: true });
});

export default webhook;

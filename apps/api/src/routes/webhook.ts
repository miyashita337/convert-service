import { Hono } from "hono";
import type { Env, AppVariables } from "../types/env";
import { createStripeClient } from "../services/stripe";

const webhook = new Hono<{ Bindings: Env; Variables: AppVariables }>();

webhook.post("/stripe", async (c) => {
  const stripe = createStripeClient(c.env);
  const body = await c.req.text();
  const signature = c.req.header("stripe-signature");

  let event;
  if (c.env.STRIPE_WEBHOOK_SECRET && signature) {
    try {
      event = await stripe.webhooks.constructEventAsync(body, signature, c.env.STRIPE_WEBHOOK_SECRET);
    } catch {
      return c.json({ error: "invalid_signature" }, 400);
    }
  } else {
    event = JSON.parse(body);
  }

  const db = c.env.DB;

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object;
      const meta = session.metadata || {};
      const planId = meta.planId;
      const stripeCustomerId = meta.stripeCustomerId;
      const durationDays = parseInt(meta.durationDays || "0", 10);
      const paymentIntentId = typeof session.payment_intent === "string" ? session.payment_intent : session.id;
      const subscriptionId = typeof session.subscription === "string" ? session.subscription : null;

      if (!planId) break;

      // Idempotent check
      const existing = await db.prepare("SELECT id FROM purchases WHERE stripe_payment_intent_id = ?").bind(paymentIntentId).first();
      if (existing) break;

      const expiresAt = durationDays > 0
        ? new Date(Date.now() + durationDays * 86400000).toISOString()
        : null;

      const purchaseType = subscriptionId ? "subscription" : "pass";
      await db.prepare(
        `INSERT INTO purchases (id, stripe_customer_id, plan, type, stripe_payment_intent_id, stripe_subscription_id, expires_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      ).bind(crypto.randomUUID(), stripeCustomerId || "", planId, purchaseType, paymentIntentId, subscriptionId, expiresAt).run();

      // Update user plan
      if (stripeCustomerId) {
        const planName = planId.startsWith("pro") ? "pro" : planId.startsWith("plus") ? "plus" : "pass";
        await db.prepare("UPDATE users SET plan = ?, stripe_subscription_id = ?, updated_at = datetime('now') WHERE stripe_customer_id = ?")
          .bind(planName, subscriptionId, stripeCustomerId).run();
      }
      break;
    }

    case "customer.subscription.updated": {
      const sub = event.data.object;
      const status = sub.status;
      const subId = sub.id;
      if (status === "active" || status === "trialing") {
        await db.prepare("UPDATE users SET plan = 'plus', updated_at = datetime('now') WHERE stripe_subscription_id = ?").bind(subId).run();
      } else if (status === "past_due" || status === "unpaid") {
        // Keep plan but flag — could add a column later
      }
      break;
    }

    case "customer.subscription.deleted": {
      const sub = event.data.object;
      await db.prepare("UPDATE users SET plan = 'free', stripe_subscription_id = NULL, updated_at = datetime('now') WHERE stripe_subscription_id = ?")
        .bind(sub.id).run();
      break;
    }

    case "invoice.payment_failed": {
      // Log for monitoring — plan downgrade handled by subscription.deleted
      console.warn("Payment failed for invoice:", event.data.object.id);
      break;
    }
  }

  return c.json({ received: true });
});

export default webhook;

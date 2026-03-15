import { Hono } from "hono";
import type { Env, AppVariables } from "../types/env";
import { createStripeClient } from "../services/stripe";
import { upsertSubscription, updateSubscriptionStatus } from "../repositories/subscription-repository";
import { higherPlan, type UserPlan } from "@quickconv/shared";

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

      // Determine plan tier from planId
      const planName: UserPlan = planId.startsWith("pro") ? "pro" : planId.startsWith("plus") ? "plus" : "pass";

      if (stripeCustomerId) {
        // For subscriptions, create subscription record
        if (subscriptionId) {
          await upsertSubscription(db, {
            stripeSubscriptionId: subscriptionId,
            stripeCustomerId,
            planType: planId,
            status: "active",
            currentPeriodEnd: null, // Will be updated by subscription.updated event
            cancelAtPeriodEnd: false,
          });
        }

        // Apply higher-tier precedence: keep whichever plan is higher
        const currentUser = await db.prepare("SELECT plan FROM users WHERE stripe_customer_id = ?").bind(stripeCustomerId).first();
        const currentPlan = (currentUser?.plan as UserPlan) || "free";
        const effectivePlan = higherPlan(planName, currentPlan);

        await db.prepare("UPDATE users SET plan = ?, stripe_subscription_id = ?, updated_at = datetime('now') WHERE stripe_customer_id = ?")
          .bind(effectivePlan, subscriptionId, stripeCustomerId).run();
      }
      break;
    }

    case "customer.subscription.updated": {
      const sub = event.data.object;
      const status = sub.status;
      const subId = sub.id;
      const cancelAtPeriodEnd = sub.cancel_at_period_end === true;
      const currentPeriodEnd = sub.current_period_end
        ? new Date(sub.current_period_end * 1000).toISOString()
        : null;

      // Update subscriptions table
      await upsertSubscription(db, {
        stripeSubscriptionId: subId,
        stripeCustomerId: sub.customer as string,
        planType: sub.metadata?.planId || "",
        status,
        currentPeriodEnd,
        cancelAtPeriodEnd,
      });

      if (status === "active" || status === "trialing") {
        // Determine plan from metadata or subscription items
        const planId = sub.metadata?.planId || "";
        const planName: UserPlan = planId.startsWith("pro") ? "pro" : "plus";
        await db.prepare("UPDATE users SET plan = ?, updated_at = datetime('now') WHERE stripe_subscription_id = ?")
          .bind(planName, subId).run();
      } else if (status === "past_due" || status === "unpaid") {
        // Keep plan but log — downgrade handled by subscription.deleted
        console.warn(`Subscription ${subId} status changed to ${status}`);
      }
      break;
    }

    case "customer.subscription.deleted": {
      const sub = event.data.object;

      // Mark subscription as canceled
      await updateSubscriptionStatus(db, sub.id, "canceled");

      // Downgrade user to free (unless they have another active subscription or valid pass)
      const customerId = sub.customer as string;
      if (customerId) {
        // Check for other active subscriptions
        const otherActive = await db.prepare(
          `SELECT plan_type FROM subscriptions
           WHERE stripe_customer_id = ? AND status IN ('active', 'trialing') AND stripe_subscription_id != ?
           LIMIT 1`
        ).bind(customerId, sub.id).first();

        if (otherActive) {
          // Has another active subscription — set plan to that
          const otherPlanId = otherActive.plan_type as string;
          const otherPlan: UserPlan = otherPlanId.startsWith("pro") ? "pro" : "plus";
          await db.prepare("UPDATE users SET plan = ?, stripe_subscription_id = NULL, updated_at = datetime('now') WHERE stripe_customer_id = ?")
            .bind(otherPlan, customerId).run();
        } else {
          // Check for valid pass
          const validPass = await db.prepare(
            `SELECT plan FROM purchases
             WHERE stripe_customer_id = ? AND type = 'pass' AND expires_at > datetime('now')
             ORDER BY created_at DESC LIMIT 1`
          ).bind(customerId).first();

          const fallbackPlan: UserPlan = validPass ? "pass" : "free";
          await db.prepare("UPDATE users SET plan = ?, stripe_subscription_id = NULL, updated_at = datetime('now') WHERE stripe_customer_id = ?")
            .bind(fallbackPlan, customerId).run();
        }
      }
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

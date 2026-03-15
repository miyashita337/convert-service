import { Hono } from "hono";
import type { Env, AppVariables } from "../types/env";
import { createStripeClient } from "../services/stripe";
import { upsertSubscription, updateSubscriptionStatus } from "../repositories/subscription-repository";
import { higherPlan, type UserPlan } from "@quickconv/shared";

const webhook = new Hono<{ Bindings: Env; Variables: AppVariables }>();

/** planId (e.g. "pro_monthly") → UserPlan tier */
function planTierFromId(planId: string): UserPlan {
  if (planId.startsWith("pro")) return "pro";
  if (planId.startsWith("plus")) return "plus";
  return "pass";
}

/** Stripe unix timestamp → ISO 8601 string */
function toISOFromUnix(ts: number | undefined | null): string | null {
  return ts ? new Date(ts * 1000).toISOString() : null;
}

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

      const planName = planTierFromId(planId);

      if (stripeCustomerId) {
        // For subscriptions, create subscription record
        if (subscriptionId) {
          await upsertSubscription(db, {
            stripeSubscriptionId: subscriptionId,
            stripeCustomerId,
            planType: planId,
            status: "active",
            currentPeriodEnd: null,
            cancelAtPeriodEnd: false,
          });
        }

        // Apply higher-tier precedence
        const currentUser = await db.prepare("SELECT plan FROM users WHERE stripe_customer_id = ?").bind(stripeCustomerId).first();
        const currentPlan = (currentUser?.plan as UserPlan) || "free";
        const effectivePlan = higherPlan(planName, currentPlan);

        await db.prepare("UPDATE users SET plan = ?, stripe_subscription_id = ?, updated_at = datetime('now') WHERE stripe_customer_id = ?")
          .bind(effectivePlan, subscriptionId, stripeCustomerId).run();
      }
      break;
    }

    case "customer.subscription.created": {
      // AC-1: Create subscription record on initial creation
      const sub = event.data.object;
      const planId = sub.metadata?.planId || "";
      const customerId = sub.customer as string;

      await upsertSubscription(db, {
        stripeSubscriptionId: sub.id,
        stripeCustomerId: customerId,
        planType: planId,
        status: sub.status,
        currentPeriodEnd: toISOFromUnix(sub.current_period_end),
        cancelAtPeriodEnd: sub.cancel_at_period_end === true,
      });

      // AC-6: Upgrade takes effect immediately
      if (sub.status === "active" || sub.status === "trialing") {
        const planName = planTierFromId(planId);
        const currentUser = await db.prepare("SELECT plan FROM users WHERE stripe_customer_id = ?").bind(customerId).first();
        const currentPlan = (currentUser?.plan as UserPlan) || "free";
        const effectivePlan = higherPlan(planName, currentPlan);

        await db.prepare("UPDATE users SET plan = ?, stripe_subscription_id = ?, updated_at = datetime('now') WHERE stripe_customer_id = ?")
          .bind(effectivePlan, sub.id, customerId).run();
      }
      break;
    }

    case "customer.subscription.updated": {
      // AC-2: Plan change & status change reflected
      const sub = event.data.object;
      const status = sub.status;
      const subId = sub.id;
      const cancelAtPeriodEnd = sub.cancel_at_period_end === true;
      const planId = sub.metadata?.planId || "";
      const customerId = sub.customer as string;

      // Update subscriptions table (idempotent UPSERT)
      await upsertSubscription(db, {
        stripeSubscriptionId: subId,
        stripeCustomerId: customerId,
        planType: planId,
        status,
        currentPeriodEnd: toISOFromUnix(sub.current_period_end),
        cancelAtPeriodEnd,
      });

      if (status === "active" || status === "trialing") {
        // AC-6: Upgrade is immediate
        const planName = planTierFromId(planId);
        await db.prepare("UPDATE users SET plan = ?, updated_at = datetime('now') WHERE stripe_subscription_id = ?")
          .bind(planName, subId).run();
      } else if (status === "past_due" || status === "unpaid") {
        // AC-4/AC-5: Downgrade to free on payment issues
        await db.prepare("UPDATE users SET plan = 'free', updated_at = datetime('now') WHERE stripe_subscription_id = ?")
          .bind(subId).run();
        console.warn(`Subscription ${subId} status changed to ${status} — user downgraded to free`);
      }

      // AC-7: Downgrade at period end — when cancel_at_period_end is true,
      // we keep the current plan. Actual downgrade happens via subscription.deleted.
      break;
    }

    case "customer.subscription.deleted": {
      // AC-3: Mark subscription as canceled
      const sub = event.data.object;
      await updateSubscriptionStatus(db, sub.id, "canceled");

      const customerId = sub.customer as string;
      if (customerId) {
        // Check for other active subscriptions
        const otherActive = await db.prepare(
          `SELECT plan_type FROM subscriptions
           WHERE stripe_customer_id = ? AND status IN ('active', 'trialing') AND stripe_subscription_id != ?
           LIMIT 1`
        ).bind(customerId, sub.id).first();

        if (otherActive) {
          const otherPlan = planTierFromId(otherActive.plan_type as string);
          await db.prepare("UPDATE users SET plan = ?, stripe_subscription_id = NULL, updated_at = datetime('now') WHERE stripe_customer_id = ?")
            .bind(otherPlan, customerId).run();
        } else {
          // Fallback to valid pass or free
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
      // AC-4: Update subscription to past_due
      const invoice = event.data.object;
      const subId = typeof invoice.subscription === "string" ? invoice.subscription : null;
      if (subId) {
        await updateSubscriptionStatus(db, subId, "past_due");
        // AC-5: Downgrade user to free
        await db.prepare("UPDATE users SET plan = 'free', updated_at = datetime('now') WHERE stripe_subscription_id = ?")
          .bind(subId).run();
        console.warn(`Payment failed for subscription ${subId} — user downgraded to free`);
      }
      break;
    }

    case "invoice.payment_succeeded": {
      // Restore plan after successful payment (recovery from past_due)
      const invoice = event.data.object;
      const subId = typeof invoice.subscription === "string" ? invoice.subscription : null;
      if (subId) {
        const sub = await db.prepare("SELECT plan_type, stripe_customer_id FROM subscriptions WHERE stripe_subscription_id = ?")
          .bind(subId).first();
        if (sub) {
          const planName = planTierFromId(sub.plan_type as string);
          await updateSubscriptionStatus(db, subId, "active");
          await db.prepare("UPDATE users SET plan = ?, updated_at = datetime('now') WHERE stripe_subscription_id = ?")
            .bind(planName, subId).run();
        }
      }
      break;
    }
  }

  return c.json({ received: true });
});

export default webhook;

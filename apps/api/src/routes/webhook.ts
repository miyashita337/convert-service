import { Hono } from "hono";
import type { Env, AppVariables } from "../types/env";
import { createStripeClient } from "../services/stripe";
import { upsertSubscription, updateSubscriptionStatus } from "../repositories/subscription-repository";
import { higherPlan, isApiPlanId, apiPlanTierFromId, type UserPlan } from "@quickconv/shared";

const webhook = new Hono<{ Bindings: Env; Variables: AppVariables }>();

/** planId (e.g. "pro_monthly") → UserPlan tier */
function planTierFromId(planId: string): UserPlan {
  if (planId.startsWith("pro")) return "pro";
  if (planId.startsWith("plus")) return "plus";
  return "pass";
}

/**
 * Set api_keys.plan for every active key owned by a developer.
 * API プラン課金は user 単位だが quota は key 単位のため、非失効キー全てを更新する。
 */
async function setApiKeysPlan(db: D1Database, userEmail: string, tier: "free" | "starter" | "pro"): Promise<void> {
  await db
    .prepare("UPDATE api_keys SET plan = ? WHERE user_email = ? AND revoked_at IS NULL")
    .bind(tier, userEmail)
    .run();
}

/** Stripe unix timestamp → ISO 8601 string */
function toISOFromUnix(ts: number | undefined | null): string | null {
  return ts ? new Date(ts * 1000).toISOString() : null;
}

webhook.post("/stripe", async (c) => {
  const stripe = createStripeClient(c.env);
  const body = await c.req.text();
  const signature = c.req.header("stripe-signature");

  const isDev = c.env.APP_URL?.includes("localhost");

  // In production, STRIPE_WEBHOOK_SECRET must be configured
  if (!isDev && !c.env.STRIPE_WEBHOOK_SECRET) {
    console.error("STRIPE_WEBHOOK_SECRET is not configured in production");
    return c.json({ error: "webhook_secret_not_configured" }, 500);
  }

  let event;
  if (c.env.STRIPE_WEBHOOK_SECRET && signature) {
    try {
      event = await stripe.webhooks.constructEventAsync(body, signature, c.env.STRIPE_WEBHOOK_SECRET);
    } catch {
      return c.json({ error: "invalid_signature" }, 400);
    }
  } else if (isDev) {
    // Development only: allow unsigned events
    event = JSON.parse(body);
  } else {
    return c.json({ error: "missing_signature" }, 400);
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

      // API プラン軸: api_keys.plan を更新する（消費者プランの purchases/users とは別経路）。
      if (isApiPlanId(planId)) {
        const userEmail = meta.userEmail;
        if (userEmail) {
          await setApiKeysPlan(db, userEmail, apiPlanTierFromId(planId));
        }
        // ライフサイクル管理用に subscription を記録（deleted/unpaid で free に戻す）。
        if (subscriptionId && stripeCustomerId) {
          await upsertSubscription(db, {
            stripeSubscriptionId: subscriptionId,
            stripeCustomerId,
            planType: planId,
            status: "active",
            currentPeriodEnd: null,
            cancelAtPeriodEnd: false,
          });
        }
        break;
      }

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

      // API プラン軸: active/trialing で api_keys.plan を即時更新（users は触らない）。
      if (isApiPlanId(planId)) {
        const userEmail = sub.metadata?.userEmail;
        if (userEmail && (sub.status === "active" || sub.status === "trialing")) {
          await setApiKeysPlan(db, userEmail, apiPlanTierFromId(planId));
        }
        break;
      }

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

      // API プラン軸: status に応じて api_keys.plan を更新（users は触らない）。
      if (isApiPlanId(planId)) {
        const userEmail = sub.metadata?.userEmail;
        if (userEmail) {
          if (status === "active" || status === "trialing") {
            await setApiKeysPlan(db, userEmail, apiPlanTierFromId(planId));
          } else if (status === "unpaid") {
            // 全リトライ枯渇: free に降格
            await setApiKeysPlan(db, userEmail, "free");
            console.warn(`API subscription ${subId} unpaid — api_keys downgraded to free`);
          }
          // past_due: grace period — プランを維持
        }
        break;
      }

      if (status === "active" || status === "trialing") {
        // AC-6: Upgrade is immediate
        const planName = planTierFromId(planId);
        await db.prepare("UPDATE users SET plan = ?, updated_at = datetime('now') WHERE stripe_subscription_id = ?")
          .bind(planName, subId).run();
      } else if (status === "past_due") {
        // Grace period: keep user plan during Stripe Smart Retries
        console.warn(`Subscription ${subId} status changed to past_due — grace period active, plan maintained`);
      } else if (status === "unpaid") {
        // All retries exhausted: downgrade to free
        await db.prepare("UPDATE users SET plan = 'free', updated_at = datetime('now') WHERE stripe_subscription_id = ?")
          .bind(subId).run();
        console.warn(`Subscription ${subId} status changed to unpaid — user downgraded to free`);
      }

      // AC-7: Downgrade at period end — when cancel_at_period_end is true,
      // we keep the current plan. Actual downgrade happens via subscription.deleted.
      break;
    }

    case "customer.subscription.deleted": {
      // AC-3: Mark subscription as canceled
      const sub = event.data.object;
      await updateSubscriptionStatus(db, sub.id, "canceled");

      // API プラン軸: 解約で api_keys.plan を free に戻す。
      if (isApiPlanId(sub.metadata?.planId)) {
        const userEmail = sub.metadata?.userEmail;
        if (userEmail) {
          await setApiKeysPlan(db, userEmail, "free");
        }
        break;
      }

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
      // Grace period: update subscription to past_due but keep user plan
      const invoice = event.data.object;
      const subId = typeof invoice.subscription === "string" ? invoice.subscription : null;
      if (subId) {
        await updateSubscriptionStatus(db, subId, "past_due");
        // Do NOT downgrade user plan — Stripe Smart Retries will handle recovery
        // Actual downgrade happens via customer.subscription.updated(status=unpaid)
        console.warn(`Payment failed for subscription ${subId} — grace period active, plan maintained`);
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

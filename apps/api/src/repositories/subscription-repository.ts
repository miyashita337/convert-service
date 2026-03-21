import type { Subscription, SubscriptionStatus } from "@quickconv/shared";

export async function upsertSubscription(
  db: D1Database,
  sub: Subscription
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO subscriptions (stripe_subscription_id, stripe_customer_id, plan_type, status, current_period_end, cancel_at_period_end, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
       ON CONFLICT(stripe_subscription_id) DO UPDATE SET
         plan_type = excluded.plan_type,
         status = excluded.status,
         current_period_end = excluded.current_period_end,
         cancel_at_period_end = excluded.cancel_at_period_end,
         updated_at = datetime('now')`
    )
    .bind(
      sub.stripeSubscriptionId,
      sub.stripeCustomerId,
      sub.planType,
      sub.status,
      sub.currentPeriodEnd,
      sub.cancelAtPeriodEnd ? 1 : 0
    )
    .run();
}

export async function getActiveSubscription(
  db: D1Database,
  stripeCustomerId: string
): Promise<Subscription | null> {
  const row = await db
    .prepare(
      `SELECT * FROM subscriptions
       WHERE stripe_customer_id = ? AND status IN ('active', 'trialing')
       ORDER BY created_at DESC LIMIT 1`
    )
    .bind(stripeCustomerId)
    .first();

  if (!row) return null;

  return mapRowToSubscription(row);
}

export async function getSubscriptionById(
  db: D1Database,
  stripeSubscriptionId: string
): Promise<Subscription | null> {
  const row = await db
    .prepare("SELECT * FROM subscriptions WHERE stripe_subscription_id = ?")
    .bind(stripeSubscriptionId)
    .first();

  if (!row) return null;

  return mapRowToSubscription(row);
}

export async function updateSubscriptionStatus(
  db: D1Database,
  stripeSubscriptionId: string,
  status: SubscriptionStatus,
  cancelAtPeriodEnd: boolean = false
): Promise<void> {
  await db
    .prepare(
      `UPDATE subscriptions SET status = ?, cancel_at_period_end = ?, updated_at = datetime('now')
       WHERE stripe_subscription_id = ?`
    )
    .bind(status, cancelAtPeriodEnd ? 1 : 0, stripeSubscriptionId)
    .run();
}

function mapRowToSubscription(row: Record<string, unknown>): Subscription {
  return {
    stripeSubscriptionId: row.stripe_subscription_id as string,
    stripeCustomerId: row.stripe_customer_id as string,
    planType: row.plan_type as string,
    status: row.status as SubscriptionStatus,
    currentPeriodEnd: (row.current_period_end as string) || null,
    cancelAtPeriodEnd: row.cancel_at_period_end === 1,
  };
}

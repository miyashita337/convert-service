import type { AuthUser } from "../types/env";

export async function upsertUser(
  db: D1Database,
  email: string,
  googleId: string,
  name?: string
): Promise<AuthUser> {
  const existing = await db
    .prepare("SELECT * FROM users WHERE google_id = ?")
    .bind(googleId)
    .first();

  if (existing) {
    await db
      .prepare("UPDATE users SET updated_at = datetime('now') WHERE google_id = ?")
      .bind(googleId)
      .run();

    return {
      email: existing.email as string,
      stripeCustomerId: existing.stripe_customer_id as string | null,
      plan: existing.plan as string,
      googleId: existing.google_id as string | null,
    };
  }

  // New user — stripe_customer_id is used as PK (UUID), NOT a real Stripe customer ID
  const id = crypto.randomUUID();
  await db
    .prepare(
      `INSERT INTO users (stripe_customer_id, email, auth_provider, google_id, plan)
       VALUES (?, ?, 'google', ?, 'free')`
    )
    .bind(id, email, googleId)
    .run();

  return {
    email,
    stripeCustomerId: id,
    plan: "free",
    googleId,
  };
}

/**
 * E2E テスト用の user upsert。
 * 既存行があれば plan / updated_at のみ更新（google_id は保持 = real user 行を壊さない）。
 * 新規の場合は決定論的 googleId で INSERT する。
 * email UNIQUE 制約での flake を防ぐため、SELECT は email で行う。
 */
export async function upsertE2ETestUser(
  db: D1Database,
  email: string,
  plan: string
): Promise<void> {
  const existing = await db
    .prepare("SELECT stripe_customer_id FROM users WHERE email = ?")
    .bind(email)
    .first();

  if (existing) {
    await db
      .prepare("UPDATE users SET plan = ?, updated_at = datetime('now') WHERE email = ?")
      .bind(plan, email)
      .run();
    return;
  }

  const id = crypto.randomUUID();
  const googleId = `e2e-test:${email}`;
  await db
    .prepare(
      `INSERT INTO users (stripe_customer_id, email, auth_provider, google_id, plan)
       VALUES (?, ?, 'google', ?, ?)`
    )
    .bind(id, email, googleId, plan)
    .run();
}

export async function getUserByEmail(
  db: D1Database,
  email: string
): Promise<AuthUser | null> {
  const row = await db
    .prepare("SELECT * FROM users WHERE email = ?")
    .bind(email)
    .first();

  if (!row) return null;

  return {
    email: row.email as string,
    stripeCustomerId: row.stripe_customer_id as string | null,
    plan: row.plan as string,
    googleId: row.google_id as string | null,
  };
}

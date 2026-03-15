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

  // New user — stripe_customer_id will be set later when they first purchase
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

export interface ApiKeyRow {
  id: string;
  user_email: string;
  key_hash: string;
  key_prefix: string;
  name: string;
  plan: string;
  monthly_count: number;
  count_month: string | null;
  created_at: string;
  revoked_at: string | null;
}

export interface ApiKeyInfo {
  id: string;
  userEmail: string;
  keyPrefix: string;
  name: string;
  plan: string;
  monthlyCount: number;
  countMonth: string | null;
  createdAt: string;
  revokedAt: string | null;
}

const API_PLAN_LIMITS: Record<string, number> = {
  free: 100,
  starter: 5000,
  pro: 50000,
};

export function getApiPlanLimit(plan: string): number {
  return API_PLAN_LIMITS[plan] ?? API_PLAN_LIMITS.free;
}

async function hashKey(key: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(key);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Atomically check key count + insert using D1 batch.
 * Returns null if limit would be exceeded.
 */
export async function createApiKeyWithLimit(
  db: D1Database,
  userEmail: string,
  name: string,
  maxKeys: number
): Promise<{ key: string; info: ApiKeyInfo } | null> {
  const id = crypto.randomUUID();
  const rawKey = `qc_${crypto.randomUUID().replace(/-/g, "")}`;
  const keyHash = await hashKey(rawKey);
  const keyPrefix = rawKey.slice(0, 10);
  const month = getCurrentMonth();

  // Conditional INSERT: only inserts if active key count < maxKeys
  const insertResult = await db
    .prepare(
      `INSERT INTO api_keys (id, user_email, key_hash, key_prefix, name, plan, monthly_count, count_month)
       SELECT ?, ?, ?, ?, ?, 'free', 0, ?
       WHERE (SELECT COUNT(*) FROM api_keys WHERE user_email = ? AND revoked_at IS NULL) < ?`
    )
    .bind(id, userEmail, keyHash, keyPrefix, name, month, userEmail, maxKeys)
    .run();

  if ((insertResult.meta.changes ?? 0) === 0) return null;

  return {
    key: rawKey,
    info: {
      id,
      userEmail,
      keyPrefix,
      name,
      plan: "free",
      monthlyCount: 0,
      countMonth: month,
      createdAt: new Date().toISOString(),
      revokedAt: null,
    },
  };
}

export async function findApiKeyByRawKey(
  db: D1Database,
  rawKey: string
): Promise<ApiKeyInfo | null> {
  const keyHash = await hashKey(rawKey);
  const row = await db
    .prepare("SELECT * FROM api_keys WHERE key_hash = ? AND revoked_at IS NULL")
    .bind(keyHash)
    .first<ApiKeyRow>();

  if (!row) return null;
  return mapRow(row);
}

export async function listApiKeysByUser(
  db: D1Database,
  userEmail: string
): Promise<ApiKeyInfo[]> {
  const { results } = await db
    .prepare("SELECT * FROM api_keys WHERE user_email = ? AND revoked_at IS NULL ORDER BY created_at DESC")
    .bind(userEmail)
    .all<ApiKeyRow>();

  return results.map(mapRow);
}

export async function revokeApiKey(
  db: D1Database,
  id: string,
  userEmail: string
): Promise<boolean> {
  const result = await db
    .prepare("UPDATE api_keys SET revoked_at = datetime('now') WHERE id = ? AND user_email = ? AND revoked_at IS NULL")
    .bind(id, userEmail)
    .run();

  return (result.meta.changes ?? 0) > 0;
}

/**
 * Atomically check rate limit + increment in a single UPDATE.
 * Returns null if limit exceeded (no rows updated).
 */
export async function consumeApiKeyUsage(
  db: D1Database,
  keyId: string,
  plan: string
): Promise<{ allowed: boolean; count: number; limit: number }> {
  const month = getCurrentMonth();
  const limit = getApiPlanLimit(plan);

  // Reset month if needed, then conditionally increment only if under limit
  // Step 1: Reset if new month
  await db
    .prepare(
      "UPDATE api_keys SET monthly_count = 0, count_month = ? WHERE id = ? AND (count_month IS NULL OR count_month != ?)"
    )
    .bind(month, keyId, month)
    .run();

  // Step 2: Atomic increment with limit guard
  const result = await db
    .prepare(
      "UPDATE api_keys SET monthly_count = monthly_count + 1 WHERE id = ? AND monthly_count < ?"
    )
    .bind(keyId, limit)
    .run();

  const allowed = (result.meta.changes ?? 0) > 0;

  // Read final count
  const row = await db
    .prepare("SELECT monthly_count FROM api_keys WHERE id = ?")
    .bind(keyId)
    .first<{ monthly_count: number }>();

  return {
    allowed,
    count: row?.monthly_count ?? 0,
    limit,
  };
}

function getCurrentMonth(): string {
  return new Date().toISOString().slice(0, 7); // "2026-04"
}

function mapRow(row: ApiKeyRow): ApiKeyInfo {
  return {
    id: row.id,
    userEmail: row.user_email,
    keyPrefix: row.key_prefix,
    name: row.name,
    plan: row.plan,
    monthlyCount: row.monthly_count,
    countMonth: row.count_month,
    createdAt: row.created_at,
    revokedAt: row.revoked_at,
  };
}

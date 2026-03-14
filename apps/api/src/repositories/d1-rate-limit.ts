/**
 * D1 レート制限リポジトリ (Infrastructure)
 *
 * anonymous_users テーブルに対する CRUD を提供する。
 * clientHash (SHA-256) をキーとし、生 IP は保存しない。
 */

/** anonymous_users テーブルの行型 */
export interface AnonymousUserRow {
  id: string;
  daily_count: number;
  count_date: string;
  last_used_at: string;
  created_at: string;
}

/**
 * 今日の日付文字列を返す (UTC, YYYY-MM-DD)
 * テスト時にオーバーライドしやすいよう関数化
 */
export function getToday(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * clientHash に対応する日次カウントを取得する。
 * - レコードが存在しない or count_date が今日でない場合は 0 を返す。
 */
export async function getDailyCount(
  db: D1Database,
  clientHash: string,
): Promise<{ dailyCount: number; countDate: string }> {
  const today = getToday();

  const row = await db
    .prepare("SELECT daily_count, count_date FROM anonymous_users WHERE id = ?")
    .bind(clientHash)
    .first<Pick<AnonymousUserRow, "daily_count" | "count_date">>();

  if (!row || row.count_date !== today) {
    return { dailyCount: 0, countDate: today };
  }

  return { dailyCount: row.daily_count, countDate: today };
}

/**
 * 日次カウントをインクリメントする。
 * - レコードが存在しない場合は INSERT (daily_count = 1)。
 * - 日付が変わっている場合はカウントを 1 にリセット。
 * - 同一日であれば +1 する。
 *
 * UPSERT (INSERT ... ON CONFLICT DO UPDATE) を使用し、1クエリで完結させる。
 */
export async function incrementDailyCount(
  db: D1Database,
  clientHash: string,
): Promise<{ dailyCount: number; countDate: string }> {
  const today = getToday();
  const now = new Date().toISOString();

  await db
    .prepare(
      `INSERT INTO anonymous_users (id, daily_count, count_date, last_used_at)
       VALUES (?, 1, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         daily_count = CASE
           WHEN anonymous_users.count_date = ? THEN anonymous_users.daily_count + 1
           ELSE 1
         END,
         count_date = ?,
         last_used_at = ?`,
    )
    .bind(clientHash, today, now, today, today, now)
    .run();

  // UPSERT 後の確定値を取得
  const row = await db
    .prepare("SELECT daily_count FROM anonymous_users WHERE id = ?")
    .bind(clientHash)
    .first<Pick<AnonymousUserRow, "daily_count">>();

  return { dailyCount: row?.daily_count ?? 1, countDate: today };
}

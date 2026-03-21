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
  video_monthly_count: number;
  video_count_month: string;
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

/**
 * 現在の月文字列を返す (UTC, YYYY-MM)
 */
export function getCurrentMonth(): string {
  return new Date().toISOString().slice(0, 7);
}

/**
 * 動画月次カウントを取得する。
 * - レコードが存在しない or video_count_month が今月でない場合は 0 を返す。
 */
export async function getVideoMonthlyCount(
  db: D1Database,
  clientHash: string,
): Promise<{ videoMonthlyCount: number; countMonth: string }> {
  const currentMonth = getCurrentMonth();

  const row = await db
    .prepare("SELECT video_monthly_count, video_count_month FROM anonymous_users WHERE id = ?")
    .bind(clientHash)
    .first<Pick<AnonymousUserRow, "video_monthly_count" | "video_count_month">>();

  if (!row || row.video_count_month !== currentMonth) {
    return { videoMonthlyCount: 0, countMonth: currentMonth };
  }

  return { videoMonthlyCount: row.video_monthly_count, countMonth: currentMonth };
}

/**
 * 動画月次カウントをインクリメントする。
 */
export async function incrementVideoMonthlyCount(
  db: D1Database,
  clientHash: string,
): Promise<{ videoMonthlyCount: number; countMonth: string }> {
  const currentMonth = getCurrentMonth();
  const now = new Date().toISOString();

  await db
    .prepare(
      `INSERT INTO anonymous_users (id, daily_count, count_date, video_monthly_count, video_count_month, last_used_at)
       VALUES (?, 0, ?, 1, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         video_monthly_count = CASE
           WHEN anonymous_users.video_count_month = ? THEN anonymous_users.video_monthly_count + 1
           ELSE 1
         END,
         video_count_month = ?,
         last_used_at = ?`,
    )
    .bind(clientHash, new Date().toISOString().slice(0, 10), currentMonth, now, currentMonth, currentMonth, now)
    .run();

  const row = await db
    .prepare("SELECT video_monthly_count FROM anonymous_users WHERE id = ?")
    .bind(clientHash)
    .first<Pick<AnonymousUserRow, "video_monthly_count">>();

  return { videoMonthlyCount: row?.video_monthly_count ?? 1, countMonth: currentMonth };
}

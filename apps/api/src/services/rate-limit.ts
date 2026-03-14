/**
 * レート制限アプリケーションサービス (Application)
 *
 * Domain のポリシーと Infrastructure のリポジトリを組み合わせ、
 * レート制限のチェック・インクリメントのユースケースを提供する。
 */
import type { RateLimitResult } from "@quickconv/shared";
import { ANONYMOUS_DAILY_LIMIT, isDailyLimitExceeded } from "../domain/rate-limit-policy";
import { getDailyCount, incrementDailyCount } from "../repositories/d1-rate-limit";

/**
 * 現在のレート制限状態をチェックする。
 * カウンターは変更しない（読み取り専用）。
 */
export async function checkRateLimit(
  db: D1Database,
  clientHash: string,
): Promise<RateLimitResult> {
  const { dailyCount, countDate } = await getDailyCount(db, clientHash);

  return {
    allowed: !isDailyLimitExceeded(dailyCount),
    remaining: Math.max(0, ANONYMOUS_DAILY_LIMIT - dailyCount),
    limit: ANONYMOUS_DAILY_LIMIT,
    resetDate: countDate,
  };
}

/**
 * レート制限チェック + カウンターインクリメントを行う。
 * 変換実行直前に呼び出す。
 *
 * @returns allowed=true ならインクリメント済み。allowed=false なら変更なし。
 */
export async function consumeRateLimit(
  db: D1Database,
  clientHash: string,
): Promise<RateLimitResult> {
  // 先にチェック（超過ならインクリメントしない）
  const { dailyCount, countDate } = await getDailyCount(db, clientHash);

  if (isDailyLimitExceeded(dailyCount)) {
    return {
      allowed: false,
      remaining: 0,
      limit: ANONYMOUS_DAILY_LIMIT,
      resetDate: countDate,
    };
  }

  // インクリメント
  const after = await incrementDailyCount(db, clientHash);

  return {
    allowed: true,
    remaining: Math.max(0, ANONYMOUS_DAILY_LIMIT - after.dailyCount),
    limit: ANONYMOUS_DAILY_LIMIT,
    resetDate: after.countDate,
  };
}

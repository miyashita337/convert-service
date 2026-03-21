/**
 * レート制限アプリケーションサービス (Application)
 *
 * Domain のポリシーと Infrastructure のリポジトリを組み合わせ、
 * レート制限のチェック・インクリメントのユースケースを提供する。
 */
import type { RateLimitResult, VideoRateLimitResult } from "@quickconv/shared";
import { ANONYMOUS_DAILY_LIMIT, isDailyLimitExceeded, ANONYMOUS_VIDEO_MONTHLY_LIMIT, isVideoMonthlyLimitExceeded } from "../domain/rate-limit-policy";
import { getDailyCount, incrementDailyCount, getVideoMonthlyCount, incrementVideoMonthlyCount } from "../repositories/d1-rate-limit";

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

/**
 * 動画変換の月次レート制限チェック。
 * カウンターは変更しない（読み取り専用）。
 */
export async function checkVideoRateLimit(
  db: D1Database,
  clientHash: string,
): Promise<VideoRateLimitResult> {
  const { videoMonthlyCount, countMonth } = await getVideoMonthlyCount(db, clientHash);

  return {
    allowed: !isVideoMonthlyLimitExceeded(videoMonthlyCount),
    remaining: Math.max(0, ANONYMOUS_VIDEO_MONTHLY_LIMIT - videoMonthlyCount),
    limit: ANONYMOUS_VIDEO_MONTHLY_LIMIT,
    resetDate: countMonth,
  };
}

/**
 * 動画変換の月次レート制限チェック + カウンターインクリメント。
 * 動画変換実行直前に呼び出す。
 */
export async function consumeVideoRateLimit(
  db: D1Database,
  clientHash: string,
): Promise<VideoRateLimitResult> {
  const { videoMonthlyCount, countMonth } = await getVideoMonthlyCount(db, clientHash);

  if (isVideoMonthlyLimitExceeded(videoMonthlyCount)) {
    return {
      allowed: false,
      remaining: 0,
      limit: ANONYMOUS_VIDEO_MONTHLY_LIMIT,
      resetDate: countMonth,
    };
  }

  const after = await incrementVideoMonthlyCount(db, clientHash);

  return {
    allowed: true,
    remaining: Math.max(0, ANONYMOUS_VIDEO_MONTHLY_LIMIT - after.videoMonthlyCount),
    limit: ANONYMOUS_VIDEO_MONTHLY_LIMIT,
    resetDate: after.countMonth,
  };
}

/**
 * レート制限ポリシー (Domain)
 *
 * ビジネスルールをドメイン層に集約する。
 * 外部依存なし。定数と純粋関数のみ。
 */
import {
  ANONYMOUS_DAILY_LIMIT,
  ANONYMOUS_MAX_FILE_SIZE_BYTES,
  ANONYMOUS_MAX_BATCH_FILES,
  VIDEO_PLAN_LIMITS,
} from "@quickconv/shared";

export { ANONYMOUS_DAILY_LIMIT, ANONYMOUS_MAX_FILE_SIZE_BYTES, ANONYMOUS_MAX_BATCH_FILES };

/** 匿名（Free）ユーザーの動画月次変換上限 */
export const ANONYMOUS_VIDEO_MONTHLY_LIMIT = VIDEO_PLAN_LIMITS.free.monthlyLimit;

/** 日次カウントが上限に達しているか判定する */
export function isDailyLimitExceeded(dailyCount: number): boolean {
  return dailyCount >= ANONYMOUS_DAILY_LIMIT;
}

/** ファイルサイズが匿名ユーザーの上限を超えているか判定する */
export function isFileSizeExceeded(sizeBytes: number): boolean {
  return sizeBytes > ANONYMOUS_MAX_FILE_SIZE_BYTES;
}

/** バッチファイル数が匿名ユーザーの上限を超えているか判定する */
export function isBatchLimitExceeded(fileCount: number): boolean {
  return fileCount > ANONYMOUS_MAX_BATCH_FILES;
}

/** 動画月次カウントが上限に達しているか判定する */
export function isVideoMonthlyLimitExceeded(monthlyCount: number): boolean {
  return monthlyCount >= ANONYMOUS_VIDEO_MONTHLY_LIMIT;
}

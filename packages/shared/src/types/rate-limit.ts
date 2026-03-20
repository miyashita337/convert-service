/** 匿名ユーザーのレート制限に関する共有定数・型定義 */

/** 匿名ユーザーの日次変換上限 */
export const ANONYMOUS_DAILY_LIMIT = 10;

/** 匿名ユーザーの1ファイルあたり最大サイズ (10MB) */
export const ANONYMOUS_MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

/** 匿名ユーザーの1バッチあたり最大ファイル数 */
export const ANONYMOUS_MAX_BATCH_FILES = 3;

/** プランごとの制限値 */
export const PLAN_LIMITS = {
  free: {
    dailyLimit: 10,
    maxFileSizeBytes: 10 * 1024 * 1024, // 10MB
    maxBatchFiles: 3,
    adsEnabled: true,
    ssimAnalysis: false,
  },
  pass: {
    dailyLimit: Infinity,
    maxFileSizeBytes: 20 * 1024 * 1024, // 20MB
    maxBatchFiles: 10,
    adsEnabled: false,
    ssimAnalysis: false,
  },
  plus: {
    dailyLimit: 50,
    maxFileSizeBytes: 20 * 1024 * 1024, // 20MB
    maxBatchFiles: 10,
    adsEnabled: false,
    ssimAnalysis: false,
  },
  pro: {
    dailyLimit: Infinity,
    maxFileSizeBytes: 50 * 1024 * 1024, // 50MB
    maxBatchFiles: 20,
    adsEnabled: false,
    ssimAnalysis: true,
  },
} as const;

/** レート制限チェック結果 */
export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  limit: number;
  resetDate: string;
}

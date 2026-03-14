/** 匿名ユーザーのレート制限に関する共有定数・型定義 */

/** 匿名ユーザーの日次変換上限 */
export const ANONYMOUS_DAILY_LIMIT = 10;

/** 匿名ユーザーの1ファイルあたり最大サイズ (10MB) */
export const ANONYMOUS_MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

/** 匿名ユーザーの1バッチあたり最大ファイル数 */
export const ANONYMOUS_MAX_BATCH_FILES = 3;

/** レート制限チェック結果 */
export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  limit: number;
  resetDate: string;
}

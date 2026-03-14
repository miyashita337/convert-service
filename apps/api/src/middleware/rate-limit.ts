import type { MiddlewareHandler } from "hono";
import type { Env, AppVariables } from "../types/env";
import type { RateLimitResult } from "@quickconv/shared";
import { ANONYMOUS_MAX_FILE_SIZE_BYTES } from "../domain/rate-limit-policy";
import {
  checkRateLimit as defaultCheckRateLimit,
  consumeRateLimit as defaultConsumeRateLimit,
} from "../services/rate-limit";

type HonoEnv = { Bindings: Env; Variables: AppVariables };

/** レート制限ユースケース関数の型 */
export type RateLimitCheckFn = (db: D1Database, clientHash: string) => Promise<RateLimitResult>;

/** 429 レスポンス共通ヘルパー */
function buildResetAt(resetDate: string): string {
  const tomorrow = new Date(resetDate);
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  return tomorrow.toISOString();
}

/**
 * ファイルサイズ制限ミドルウェア（/api/upload 用）
 *
 * 匿名ユーザーの1ファイル上限（10MB）を超える場合は 413 を返す。
 * Content-Length ヘッダーで事前チェックし、無駄なボディ読み込みを回避する。
 */
export const fileSizeLimitMiddleware = (): MiddlewareHandler<HonoEnv> => {
  return async (c, next) => {
    const contentLength = c.req.header("content-length");
    if (contentLength) {
      const size = Number.parseInt(contentLength, 10);
      if (!Number.isNaN(size) && size > ANONYMOUS_MAX_FILE_SIZE_BYTES) {
        return c.json(
          {
            error: "file_too_large",
            message: `File size exceeds ${ANONYMOUS_MAX_FILE_SIZE_BYTES / (1024 * 1024)}MB limit`,
            maxSizeBytes: ANONYMOUS_MAX_FILE_SIZE_BYTES,
          },
          413,
        );
      }
    }
    await next();
  };
};

/**
 * レート制限ミドルウェア（/api/convert 用）
 *
 * - identificationMiddleware でセット済みの clientHash を取得
 * - 日次カウントが上限（10回）を超えていれば 429 を返す
 * - 超えていなければカウントをインクリメントして通過
 * - レスポンスヘッダーに X-RateLimit-Remaining, X-RateLimit-Limit を付与
 */
export const rateLimitMiddleware = (
  consumeFn: RateLimitCheckFn = defaultConsumeRateLimit,
): MiddlewareHandler<HonoEnv> => {
  return async (c, next) => {
    const clientHash = c.get("clientHash");
    if (!clientHash) {
      return c.json({ error: "identification_required" }, 401);
    }

    const result = await consumeFn(c.env.DB, clientHash);

    if (!result.allowed) {
      const resetAt = buildResetAt(result.resetDate);

      c.header("X-RateLimit-Remaining", "0");
      c.header("X-RateLimit-Limit", String(result.limit));
      c.header("Retry-After", resetAt);

      return c.json(
        {
          error: "rate_limit",
          remaining: 0,
          resetAt,
        },
        429,
      );
    }

    // レート制限情報をコンテキストに保存（ルートハンドラで利用可能に）
    c.set("rateLimitRemaining", result.remaining);
    c.set("rateLimitLimit", result.limit);

    await next();

    // レスポンスヘッダーに付与
    c.header("X-RateLimit-Remaining", String(result.remaining));
    c.header("X-RateLimit-Limit", String(result.limit));
  };
};

/**
 * アップロード用レート制限チェックミドルウェア（/api/upload 用）
 *
 * カウンターはインクリメントしない（読み取り専用）。
 * アップロード時点で上限到達済みならブロックし、無駄なR2書き込みを回避する。
 */
export const uploadRateLimitMiddleware = (
  checkFn: RateLimitCheckFn = defaultCheckRateLimit,
): MiddlewareHandler<HonoEnv> => {
  return async (c, next) => {
    const clientHash = c.get("clientHash");
    if (!clientHash) {
      return c.json({ error: "identification_required" }, 401);
    }

    const result = await checkFn(c.env.DB, clientHash);

    if (!result.allowed) {
      const resetAt = buildResetAt(result.resetDate);

      c.header("X-RateLimit-Remaining", "0");
      c.header("X-RateLimit-Limit", String(result.limit));

      return c.json(
        {
          error: "rate_limit",
          remaining: 0,
          resetAt,
        },
        429,
      );
    }

    await next();

    c.header("X-RateLimit-Remaining", String(result.remaining));
    c.header("X-RateLimit-Limit", String(result.limit));
  };
};

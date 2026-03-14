import type { MiddlewareHandler } from "hono";
import { getCookie, setCookie } from "hono/cookie";
import { ClientIdentifier } from "../domain/client-identifier";

const COOKIE_NAME = "qc_sid";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

/**
 * 識別トークン発行ミドルウェア
 *
 * - CF-Connecting-IP, qc_sid Cookie, User-Agent から SHA-256 ハッシュを生成
 * - 初回アクセス時に qc_sid Cookie（UUID v4）を発行
 * - Cookie 同意拒否時（qc_sid なし）は IP + UA のみで識別
 * - 生 IP はどこにも保存・ログ出力しない
 */
export const identificationMiddleware = (): MiddlewareHandler => {
  return async (c, next) => {
    const ip = c.req.header("cf-connecting-ip") || "unknown";
    const userAgent = c.req.header("user-agent") || "unknown";

    // 既存の Cookie を取得、なければ新規発行
    let cookieId = getCookie(c, COOKIE_NAME);
    if (!cookieId) {
      cookieId = crypto.randomUUID();
      setCookie(c, COOKIE_NAME, cookieId, {
        path: "/",
        httpOnly: true,
        secure: true,
        sameSite: "Lax",
        maxAge: COOKIE_MAX_AGE,
      });
    }

    const identifier = await ClientIdentifier.create(ip, userAgent, cookieId);
    c.set("clientHash", identifier.hash);

    await next();
  };
};

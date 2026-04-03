import { cors } from "hono/cors";
import type { Env } from "../types/env";

export const corsMiddleware = (env: Env) => {
  const origins = env.CORS_ORIGIN
    ? env.CORS_ORIGIN.split(",").map((o) => o.trim())
    : ["*"];

  return cors({
    origin: (origin) => {
      // Exact match
      if (origins.includes(origin)) return origin;
      // Cloudflare Pages preview URLs: *.quickconv-web.pages.dev
      if (/^https:\/\/[a-z0-9-]+\.quickconv-web\.pages\.dev$/.test(origin)) return origin;
      return undefined;
    },
    allowMethods: ["GET", "POST", "OPTIONS"],
    allowHeaders: ["Content-Type"],
    credentials: true,
    maxAge: 86400,
  });
};

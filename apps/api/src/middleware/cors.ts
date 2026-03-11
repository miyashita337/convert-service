import { cors } from "hono/cors";
import type { Env } from "../types/env";

export const corsMiddleware = (env: Env) => {
  const origins = env.CORS_ORIGIN
    ? env.CORS_ORIGIN.split(",").map((o) => o.trim())
    : ["*"];

  return cors({
    origin: origins.length === 1 ? origins[0] : origins,
    allowMethods: ["GET", "POST", "OPTIONS"],
    allowHeaders: ["Content-Type"],
    maxAge: 86400,
  });
};

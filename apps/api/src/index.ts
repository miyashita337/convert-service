import { Hono } from "hono";
import { cors } from "hono/cors";
import type { Env, AppVariables } from "./types/env";
import { sentryMiddleware } from "./middleware/sentry";
import { identificationMiddleware } from "./middleware/identification";
import {
  rateLimitMiddleware,
  fileSizeLimitMiddleware,
  uploadRateLimitMiddleware,
} from "./middleware/rate-limit";
import { optionalAuthMiddleware } from "./middleware/auth";
import upload from "./routes/upload";
import convert from "./routes/convert";
import preview from "./routes/preview";
import status from "./routes/status";
import download from "./routes/download";
import callback from "./routes/callback";
import auth from "./routes/auth";
import checkout from "./routes/checkout";
import webhook from "./routes/webhook";
import account from "./routes/account";
import resize from "./routes/resize";
import stream from "./routes/stream";
import presign from "./routes/presign";

const app = new Hono<{ Bindings: Env; Variables: AppVariables }>();

// Sentry — must be first to capture all errors
app.use("/api/*", sentryMiddleware());

// CORS
app.use(
  "/api/*",
  async (c, next) => {
    const allowedOrigins = (c.env.CORS_ORIGIN || "*")
      .split(",")
      .map((o) => o.trim());
    const middleware = cors({
      origin: (origin) => {
        if (allowedOrigins.includes("*")) return origin;
        return allowedOrigins.includes(origin) ? origin : "";
      },
      allowMethods: ["GET", "POST", "OPTIONS"],
      allowHeaders: ["Content-Type", "Authorization"],
      credentials: true,
      maxAge: 86400,
    });
    return middleware(c, next);
  }
);

// Identification — CORS の後、ルートの前に適用
app.use("/api/*", identificationMiddleware());

// Optional auth — JWT cookie からユーザー情報を抽出（未認証でもブロックしない）
app.use("/api/*", optionalAuthMiddleware());

// Rate limiting — upload にはサイズ制限 + 読み取り専用チェック、convert にはカウント消費
app.use("/api/upload", fileSizeLimitMiddleware());
app.use("/api/upload", uploadRateLimitMiddleware());
app.use("/api/convert", rateLimitMiddleware());

// Health check
app.get("/health", (c) => c.json({ status: "ok" }));

// Routes
app.route("/api/upload", upload);
app.route("/api/convert", convert);
app.route("/api/preview", preview);
app.route("/api/status", status);
app.route("/api/download", download);
app.route("/api/callback", callback);
app.route("/api/auth", auth);
app.route("/api/checkout", checkout);
app.route("/api/webhook", webhook);
app.route("/api/account", account);
app.route("/api/resize", resize);
app.route("/api/stream", stream);
app.route("/api/upload", presign);

export default app;

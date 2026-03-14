import { Hono } from "hono";
import { cors } from "hono/cors";
import type { Env, AppVariables } from "./types/env";
import { identificationMiddleware } from "./middleware/identification";
import upload from "./routes/upload";
import convert from "./routes/convert";
import status from "./routes/status";
import download from "./routes/download";
import callback from "./routes/callback";

const app = new Hono<{ Bindings: Env; Variables: AppVariables }>();

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
      allowHeaders: ["Content-Type"],
      maxAge: 86400,
    });
    return middleware(c, next);
  }
);

// Identification — CORS の後、ルートの前に適用
app.use("/api/*", identificationMiddleware());

// Health check
app.get("/health", (c) => c.json({ status: "ok" }));

// Routes
app.route("/api/upload", upload);
app.route("/api/convert", convert);
app.route("/api/status", status);
app.route("/api/download", download);
app.route("/api/callback", callback);

export default app;

import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import { Hono } from "hono";
import type { Env, AppVariables } from "../types/env";
import type { RateLimitCheckFn } from "../middleware/rate-limit";
import {
  rateLimitMiddleware,
  fileSizeLimitMiddleware,
  uploadRateLimitMiddleware,
} from "../middleware/rate-limit";

/** vi.fn() を RateLimitCheckFn として型安全に使うためのヘルパー */
function createMockFn() {
  return vi.fn() as unknown as RateLimitCheckFn & Mock;
}

const FAKE_DB = {} as D1Database;
const FAKE_ENV = {
  DB: FAKE_DB,
  R2_BUCKET: {},
  CORS_ORIGIN: "*",
  CONVERTER_URL: "",
  CONVERTER_API_KEY: "",
} as unknown as Env;

function createApp() {
  return new Hono<{ Bindings: Env; Variables: AppVariables }>();
}

/** Hono app.request のヘルパー: request(input, requestInit?, Env?, execCtx?) */
async function appRequest(
  app: Hono<{ Bindings: Env; Variables: AppVariables }>,
  path: string,
  options?: RequestInit,
) {
  return app.request(path, options, FAKE_ENV);
}

describe("rateLimitMiddleware", () => {
  let mockConsume: RateLimitCheckFn & Mock;

  beforeEach(() => {
    mockConsume = createMockFn();
  });

  it("returns 401 when clientHash is missing", async () => {
    const app = createApp();
    app.use("/convert/*", rateLimitMiddleware(mockConsume));
    app.post("/convert", (c) => c.json({ ok: true }));

    const res = await appRequest(app, "/convert", { method: "POST" });
    expect(res.status).toBe(401);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.error).toBe("identification_required");
    expect(mockConsume).not.toHaveBeenCalled();
  });

  it("allows request when under limit (count=3)", async () => {
    mockConsume.mockResolvedValue({
      allowed: true,
      remaining: 6,
      limit: 10,
      resetDate: "2026-03-15",
    });

    const app = createApp();
    app.use("*", async (c, next) => {
      c.set("clientHash", "test-hash");
      await next();
    });
    app.use("/convert/*", rateLimitMiddleware(mockConsume));
    app.post("/convert", (c) =>
      c.json({ ok: true, remaining: c.get("rateLimitRemaining") }),
    );

    const res = await appRequest(app, "/convert", { method: "POST" });
    expect(res.status).toBe(200);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.ok).toBe(true);
    expect(body.remaining).toBe(6);
    expect(res.headers.get("X-RateLimit-Remaining")).toBe("6");
    expect(res.headers.get("X-RateLimit-Limit")).toBe("10");
  });

  it("allows 10th conversion (count=9 -> remaining=0)", async () => {
    mockConsume.mockResolvedValue({
      allowed: true,
      remaining: 0,
      limit: 10,
      resetDate: "2026-03-15",
    });

    const app = createApp();
    app.use("*", async (c, next) => {
      c.set("clientHash", "test-hash");
      await next();
    });
    app.use("/convert/*", rateLimitMiddleware(mockConsume));
    app.post("/convert", (c) => c.json({ ok: true }));

    const res = await appRequest(app, "/convert", { method: "POST" });
    expect(res.status).toBe(200);
    expect(res.headers.get("X-RateLimit-Remaining")).toBe("0");
  });

  it("blocks 11th conversion with 429 (count=10)", async () => {
    mockConsume.mockResolvedValue({
      allowed: false,
      remaining: 0,
      limit: 10,
      resetDate: "2026-03-15",
    });

    const app = createApp();
    app.use("*", async (c, next) => {
      c.set("clientHash", "test-hash");
      await next();
    });
    app.use("/convert/*", rateLimitMiddleware(mockConsume));
    app.post("/convert", (c) => c.json({ ok: true }));

    const res = await appRequest(app, "/convert", { method: "POST" });
    expect(res.status).toBe(429);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.error).toBe("rate_limit");
    expect(body.remaining).toBe(0);
    expect(body.resetAt).toBe("2026-03-16T00:00:00.000Z");
    expect(res.headers.get("X-RateLimit-Remaining")).toBe("0");
    expect(res.headers.get("X-RateLimit-Limit")).toBe("10");
    expect(res.headers.get("Retry-After")).toBe("2026-03-16T00:00:00.000Z");
  });

  it("includes resetAt as next UTC midnight (year boundary)", async () => {
    mockConsume.mockResolvedValue({
      allowed: false,
      remaining: 0,
      limit: 10,
      resetDate: "2026-12-31",
    });

    const app = createApp();
    app.use("*", async (c, next) => {
      c.set("clientHash", "test-hash");
      await next();
    });
    app.use("/convert/*", rateLimitMiddleware(mockConsume));
    app.post("/convert", (c) => c.json({ ok: true }));

    const res = await appRequest(app, "/convert", { method: "POST" });
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.resetAt).toBe("2027-01-01T00:00:00.000Z");
  });

  it("passes DB and clientHash to consumeRateLimit", async () => {
    mockConsume.mockResolvedValue({
      allowed: true,
      remaining: 9,
      limit: 10,
      resetDate: "2026-03-15",
    });

    const app = createApp();
    app.use("*", async (c, next) => {
      c.set("clientHash", "abc-123");
      await next();
    });
    app.use("/convert/*", rateLimitMiddleware(mockConsume));
    app.post("/convert", (c) => c.json({ ok: true }));

    await appRequest(app, "/convert", { method: "POST" });
    expect(mockConsume).toHaveBeenCalledWith(FAKE_DB, "abc-123");
  });
});

describe("fileSizeLimitMiddleware", () => {
  it("blocks request when Content-Length exceeds 10MB with 413", async () => {
    const app = createApp();
    app.use("/upload/*", fileSizeLimitMiddleware());
    app.post("/upload", (c) => c.json({ ok: true }));

    const oversizeLength = String(11 * 1024 * 1024);
    const res = await app.request("/upload", {
      method: "POST",
      headers: { "Content-Length": oversizeLength },
    }, FAKE_ENV);
    expect(res.status).toBe(413);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.error).toBe("file_too_large");
    expect(body.maxSizeBytes).toBe(10 * 1024 * 1024);
  });

  it("allows request when Content-Length is under 10MB", async () => {
    const app = createApp();
    app.use("/upload/*", fileSizeLimitMiddleware());
    app.post("/upload", (c) => c.json({ ok: true }));

    const normalLength = String(5 * 1024 * 1024);
    const res = await app.request("/upload", {
      method: "POST",
      headers: { "Content-Length": normalLength },
    }, FAKE_ENV);
    expect(res.status).toBe(200);
  });

  it("allows request when Content-Length is exactly 10MB", async () => {
    const app = createApp();
    app.use("/upload/*", fileSizeLimitMiddleware());
    app.post("/upload", (c) => c.json({ ok: true }));

    const exactLength = String(10 * 1024 * 1024);
    const res = await app.request("/upload", {
      method: "POST",
      headers: { "Content-Length": exactLength },
    }, FAKE_ENV);
    expect(res.status).toBe(200);
  });

  it("passes through when Content-Length header is absent", async () => {
    const app = createApp();
    app.use("/upload/*", fileSizeLimitMiddleware());
    app.post("/upload", (c) => c.json({ ok: true }));

    const res = await appRequest(app, "/upload", { method: "POST" });
    expect(res.status).toBe(200);
  });
});

describe("uploadRateLimitMiddleware", () => {
  let mockCheck: RateLimitCheckFn & Mock;

  beforeEach(() => {
    mockCheck = createMockFn();
  });

  it("returns 401 when clientHash is missing", async () => {
    const app = createApp();
    app.use("/upload/*", uploadRateLimitMiddleware(mockCheck));
    app.post("/upload", (c) => c.json({ ok: true }));

    const res = await appRequest(app, "/upload", { method: "POST" });
    expect(res.status).toBe(401);
    expect(mockCheck).not.toHaveBeenCalled();
  });

  it("allows upload when under rate limit", async () => {
    mockCheck.mockResolvedValue({
      allowed: true,
      remaining: 5,
      limit: 10,
      resetDate: "2026-03-15",
    });

    const app = createApp();
    app.use("*", async (c, next) => {
      c.set("clientHash", "test-hash");
      await next();
    });
    app.use("/upload/*", uploadRateLimitMiddleware(mockCheck));
    app.post("/upload", (c) => c.json({ ok: true }));

    const res = await appRequest(app, "/upload", { method: "POST" });
    expect(res.status).toBe(200);
    expect(res.headers.get("X-RateLimit-Remaining")).toBe("5");
    expect(res.headers.get("X-RateLimit-Limit")).toBe("10");
  });

  it("blocks upload with 429 when rate limit exceeded", async () => {
    mockCheck.mockResolvedValue({
      allowed: false,
      remaining: 0,
      limit: 10,
      resetDate: "2026-03-15",
    });

    const app = createApp();
    app.use("*", async (c, next) => {
      c.set("clientHash", "test-hash");
      await next();
    });
    app.use("/upload/*", uploadRateLimitMiddleware(mockCheck));
    app.post("/upload", (c) => c.json({ ok: true }));

    const res = await appRequest(app, "/upload", { method: "POST" });
    expect(res.status).toBe(429);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.error).toBe("rate_limit");
    expect(body.remaining).toBe(0);
  });

  it("uses checkRateLimit (read-only, no increment)", async () => {
    mockCheck.mockResolvedValue({
      allowed: true,
      remaining: 8,
      limit: 10,
      resetDate: "2026-03-15",
    });

    const mockConsume = createMockFn();

    const app = createApp();
    app.use("*", async (c, next) => {
      c.set("clientHash", "test-hash");
      await next();
    });
    app.use("/upload/*", uploadRateLimitMiddleware(mockCheck));
    app.post("/upload", (c) => c.json({ ok: true }));

    await appRequest(app, "/upload", { method: "POST" });
    expect(mockCheck).toHaveBeenCalledOnce();
    expect(mockConsume).not.toHaveBeenCalled();
  });
});

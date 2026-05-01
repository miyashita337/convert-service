import { describe, it, expect, vi, beforeEach } from "vitest";
import { Hono } from "hono";
import type { Env, AppVariables } from "../types/env";

vi.mock("../services/d1", () => ({
  createJob: vi.fn().mockResolvedValue(undefined),
  updateJobStatus: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../services/converter", () => ({
  requestDirectConversion: vi.fn(),
}));

vi.mock("../services/r2", () => ({
  uploadToR2: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../services/rate-limit", () => ({
  consumeVideoRateLimit: vi.fn(),
}));

import { requestDirectConversion } from "../services/converter";
import convert from "../routes/convert";

const mockRequestDirect = requestDirectConversion as ReturnType<typeof vi.fn>;

function createApp() {
  const app = new Hono<{ Bindings: Env; Variables: AppVariables }>();
  app.route("/api/convert", convert);
  return app;
}

function buildEnv(overrides: Partial<Env> = {}): Env {
  return {
    DB: {} as D1Database,
    R2_BUCKET: {
      list: vi.fn().mockResolvedValue({
        objects: [{ key: "uploads/file123.jpg" }],
      }),
      get: vi.fn().mockResolvedValue({
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(10)),
      }),
    } as unknown as R2Bucket,
    CORS_ORIGIN: "*",
    CONVERTER_URL: "http://converter:8080",
    CONVERTER_API_KEY: "test-key",
    ...overrides,
  } as unknown as Env;
}

describe("POST /api/convert — CONVERTER_API_KEY validation (#287)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequestDirect.mockResolvedValue({
      success: true,
      outputBuffer: new ArrayBuffer(10),
      fileSize: 10,
    });
  });

  it("returns 500 when CONVERTER_API_KEY is empty string", async () => {
    const env = buildEnv({ CONVERTER_API_KEY: "" });
    const res = await createApp().request(
      "/api/convert",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileId: "file123", outputFormat: "webp" }),
      },
      env,
    );

    expect(res.status).toBe(500);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.error).toBe("internal_error");
    expect(body.message).toBe("Service configuration error");
    expect(mockRequestDirect).not.toHaveBeenCalled();
  });

  it("returns 500 when CONVERTER_API_KEY is undefined", async () => {
    const env = buildEnv({ CONVERTER_API_KEY: undefined as unknown as string });
    const res = await createApp().request(
      "/api/convert",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileId: "file123", outputFormat: "webp" }),
      },
      env,
    );

    expect(res.status).toBe(500);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.error).toBe("internal_error");
    expect(mockRequestDirect).not.toHaveBeenCalled();
  });

  it("passes the configured CONVERTER_API_KEY to the converter (no test-key fallback)", async () => {
    const env = buildEnv({ CONVERTER_API_KEY: "real-prod-key" });
    const res = await createApp().request(
      "/api/convert",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileId: "file123", outputFormat: "webp" }),
      },
      env,
    );

    expect(res.status).toBe(200);
    expect(mockRequestDirect).toHaveBeenCalledTimes(1);
    expect(mockRequestDirect).toHaveBeenCalledWith(
      "http://converter:8080",
      "real-prod-key",
      expect.objectContaining({ outputFormat: "webp" }),
    );
  });
});

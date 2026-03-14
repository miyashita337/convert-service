import { describe, it, expect, vi, beforeEach } from "vitest";
import { Hono } from "hono";
import type { Env, AppVariables } from "../types/env";

// Mock converter service
vi.mock("../services/converter", () => ({
  requestPreviewConversion: vi.fn(),
}));

import { requestPreviewConversion } from "../services/converter";
import preview from "../routes/preview";

const FAKE_ENV = {
  DB: {} as D1Database,
  R2_BUCKET: {} as R2Bucket,
  CORS_ORIGIN: "*",
  CONVERTER_URL: "http://converter:8080",
  CONVERTER_API_KEY: "test-key",
} as unknown as Env;

function createApp() {
  const app = new Hono<{ Bindings: Env; Variables: AppVariables }>();
  app.route("/api/preview", preview);
  return app;
}

function buildFormData(overrides: Record<string, string | Blob> = {}) {
  const formData = new FormData();
  const defaults: Record<string, string | Blob> = {
    file: new File([new Uint8Array(100)], "test.jpg", { type: "image/jpeg" }),
    outputFormat: "webp",
    qualities: JSON.stringify([30, 70, 95]),
  };
  const merged = { ...defaults, ...overrides };
  for (const [key, value] of Object.entries(merged)) {
    formData.append(key, value);
  }
  return formData;
}

async function postPreview(
  app: ReturnType<typeof createApp>,
  body: FormData,
) {
  return app.request("/api/preview", { method: "POST", body }, FAKE_ENV);
}

const mockRequestPreview = requestPreviewConversion as ReturnType<typeof vi.fn>;

describe("POST /api/preview", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // --- Validation ---

  it("returns 400 when no file is provided", async () => {
    const form = new FormData();
    form.append("outputFormat", "webp");
    form.append("qualities", JSON.stringify([70]));

    const res = await postPreview(createApp(), form);
    expect(res.status).toBe(400);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.error).toBe("validation");
  });

  it("returns 400 when outputFormat is missing", async () => {
    const form = new FormData();
    form.append("file", new File([new Uint8Array(10)], "test.jpg"));
    form.append("qualities", JSON.stringify([70]));

    const res = await postPreview(createApp(), form);
    expect(res.status).toBe(400);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.message).toBe("outputFormat is required");
  });

  it("returns 400 when qualities is missing", async () => {
    const form = new FormData();
    form.append("file", new File([new Uint8Array(10)], "test.jpg"));
    form.append("outputFormat", "webp");

    const res = await postPreview(createApp(), form);
    expect(res.status).toBe(400);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.message).toBe("qualities is required");
  });

  it("returns 400 for invalid conversion pair", async () => {
    const form = buildFormData({ outputFormat: "heic" });

    const res = await postPreview(createApp(), form);
    expect(res.status).toBe(400);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.message).toContain("Cannot convert");
  });

  it("returns 400 when qualities is not valid JSON", async () => {
    const form = buildFormData({ qualities: "not-json" });

    const res = await postPreview(createApp(), form);
    expect(res.status).toBe(400);
  });

  it("returns 400 when qualities is an empty array", async () => {
    const form = buildFormData({ qualities: JSON.stringify([]) });

    const res = await postPreview(createApp(), form);
    expect(res.status).toBe(400);
  });

  it("returns 400 when quality value is out of range", async () => {
    const form = buildFormData({ qualities: JSON.stringify([0, 101]) });

    const res = await postPreview(createApp(), form);
    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid plan", async () => {
    const form = buildFormData({ plan: "enterprise" });

    const res = await postPreview(createApp(), form);
    expect(res.status).toBe(400);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.message).toContain("Invalid plan");
  });

  // --- Plan clamping ---

  it("clamps qualities to 2 for free plan", async () => {
    mockRequestPreview.mockResolvedValue({
      success: true,
      previews: [
        { quality: 30, size: 100, compressionRatio: 0.5, data: "aaa" },
        { quality: 70, size: 200, compressionRatio: 0.3, data: "bbb" },
      ],
    });

    const form = buildFormData(); // 3 qualities, default plan = free

    const res = await postPreview(createApp(), form);
    expect(res.status).toBe(200);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body).toHaveProperty("requestedCount", 3);
    expect(body).toHaveProperty("returnedCount", 2);
    expect(body).toHaveProperty("plan", "free");

    // Verify converter was called with only 2 qualities
    expect(mockRequestPreview).toHaveBeenCalledOnce();
    const call = mockRequestPreview.mock.calls[0];
    expect(call[2].qualities).toEqual([30, 70]);
  });

  it("clamps qualities to 5 for plus plan", async () => {
    const qualities = [10, 30, 50, 70, 80, 90, 95];
    mockRequestPreview.mockResolvedValue({
      success: true,
      previews: qualities.slice(0, 5).map((q) => ({
        quality: q,
        size: q * 10,
        compressionRatio: 0.5,
        data: "x",
      })),
    });

    const form = buildFormData({
      qualities: JSON.stringify(qualities),
      plan: "plus",
    });

    const res = await postPreview(createApp(), form);
    expect(res.status).toBe(200);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body).toHaveProperty("requestedCount", 7);
    expect(body).toHaveProperty("returnedCount", 5);

    const call = mockRequestPreview.mock.calls[0];
    expect(call[2].qualities).toEqual([10, 30, 50, 70, 80]);
  });

  it("does not clamp qualities for pro plan", async () => {
    const qualities = [10, 20, 30, 40, 50, 60, 70, 80, 90, 95];
    mockRequestPreview.mockResolvedValue({
      success: true,
      previews: qualities.map((q) => ({
        quality: q,
        size: q * 10,
        compressionRatio: 0.5,
        data: "x",
      })),
    });

    const form = buildFormData({
      qualities: JSON.stringify(qualities),
      plan: "pro",
    });

    const res = await postPreview(createApp(), form);
    expect(res.status).toBe(200);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body).toHaveProperty("requestedCount", 10);
    expect(body).toHaveProperty("returnedCount", 10);
  });

  // --- Converter integration ---

  it("returns 500 when converter fails", async () => {
    mockRequestPreview.mockResolvedValue({
      success: false,
      error: "Internal Server Error",
    });

    const form = buildFormData();

    const res = await postPreview(createApp(), form);
    expect(res.status).toBe(500);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.error).toBe("converter");
  });

  it("forwards file and outputFormat to converter", async () => {
    mockRequestPreview.mockResolvedValue({
      success: true,
      previews: [{ quality: 70, size: 200, compressionRatio: 0.3, data: "bbb" }],
    });

    const form = new FormData();
    form.append("file", new File([new Uint8Array(50)], "photo.png", { type: "image/png" }));
    form.append("outputFormat", "webp");
    form.append("qualities", JSON.stringify([70]));
    form.append("plan", "free");

    const res = await postPreview(createApp(), form);
    expect(res.status).toBe(200);

    expect(mockRequestPreview).toHaveBeenCalledOnce();
    const [url, key, payload] = mockRequestPreview.mock.calls[0];
    expect(url).toBe("http://converter:8080");
    expect(key).toBe("test-key");
    expect(payload.outputFormat).toBe("webp");
    expect(payload.fileName).toBe("photo.png");
    expect(payload.qualities).toEqual([70]);
  });

  it("returns previews from converter on success", async () => {
    const previews = [
      { quality: 30, size: 100, compressionRatio: 0.8, data: "base64data1" },
      { quality: 70, size: 300, compressionRatio: 0.4, data: "base64data2" },
    ];
    mockRequestPreview.mockResolvedValue({ success: true, previews });

    const form = buildFormData();

    const res = await postPreview(createApp(), form);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { previews: typeof previews };
    expect(body.previews).toEqual(previews);
  });
});

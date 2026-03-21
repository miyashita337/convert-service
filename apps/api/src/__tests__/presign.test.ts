import { describe, it, expect, vi, beforeEach } from "vitest";
import { Hono } from "hono";
import type { Env, AppVariables } from "../types/env";

// Mock R2 service
vi.mock("../services/r2", () => ({
  uploadToR2: vi.fn().mockResolvedValue(undefined),
}));

import presign from "../routes/presign";

const mockR2Bucket = {
  put: vi.fn().mockResolvedValue(undefined),
  get: vi.fn(),
  delete: vi.fn(),
  list: vi.fn(),
} as unknown as R2Bucket;

const FAKE_ENV = {
  DB: {} as D1Database,
  R2_BUCKET: mockR2Bucket,
  CORS_ORIGIN: "*",
  CONVERTER_URL: "http://converter:8080",
  CONVERTER_API_KEY: "test-key",
} as unknown as Env;

type HonoEnv = { Bindings: Env; Variables: AppVariables };

function createApp(userPlan?: string) {
  const app = new Hono<HonoEnv>();

  // Simulate optional auth middleware setting user
  if (userPlan) {
    app.use("*", async (c, next) => {
      c.set("user", {
        email: "test@example.com",
        stripeCustomerId: null,
        plan: userPlan,
        googleId: null,
      });
      await next();
    });
  }

  app.route("/api/upload/presign", presign);
  return app;
}

async function postPresign(
  app: ReturnType<typeof createApp>,
  body: Record<string, unknown>,
) {
  return app.request(
    "/api/upload/presign",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
    FAKE_ENV,
  );
}

describe("POST /api/upload/presign", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // --- Validation ---

  it("returns 400 when filename is missing", async () => {
    const res = await postPresign(createApp(), {
      size: 1024,
      contentType: "image/jpeg",
    });
    expect(res.status).toBe(400);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.error).toBe("validation");
    expect(body.message).toContain("filename");
  });

  it("returns 400 when size is missing", async () => {
    const res = await postPresign(createApp(), {
      filename: "test.jpg",
      contentType: "image/jpeg",
    });
    expect(res.status).toBe(400);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.message).toContain("size");
  });

  it("returns 400 when size is negative", async () => {
    const res = await postPresign(createApp(), {
      filename: "test.jpg",
      size: -1,
      contentType: "image/jpeg",
    });
    expect(res.status).toBe(400);
  });

  it("returns 400 when contentType is missing", async () => {
    const res = await postPresign(createApp(), {
      filename: "test.jpg",
      size: 1024,
    });
    expect(res.status).toBe(400);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.message).toContain("contentType");
  });

  it("returns 400 for unsupported content type", async () => {
    const res = await postPresign(createApp(), {
      filename: "test.exe",
      size: 1024,
      contentType: "application/x-msdownload",
    });
    expect(res.status).toBe(400);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.message).toContain("Unsupported");
  });

  // --- Size limits by plan ---

  it("returns 413 when free plan file exceeds 10MB", async () => {
    const elevenMB = 11 * 1024 * 1024;
    const res = await postPresign(createApp(), {
      filename: "large.jpg",
      size: elevenMB,
      contentType: "image/jpeg",
    });
    expect(res.status).toBe(413);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.error).toBe("file_too_large");
    expect(body.plan).toBe("free");
  });

  it("allows 10MB file for free plan", async () => {
    const tenMB = 10 * 1024 * 1024;
    const res = await postPresign(createApp(), {
      filename: "ok.jpg",
      size: tenMB,
      contentType: "image/jpeg",
    });
    expect(res.status).toBe(200);
  });

  it("returns 413 when plus plan file exceeds 20MB", async () => {
    const twentyOneMB = 21 * 1024 * 1024;
    const res = await postPresign(createApp("plus"), {
      filename: "large.mp4",
      size: twentyOneMB,
      contentType: "video/mp4",
    });
    expect(res.status).toBe(413);
  });

  it("allows 20MB file for plus plan", async () => {
    const twentyMB = 20 * 1024 * 1024;
    const res = await postPresign(createApp("plus"), {
      filename: "ok.mp4",
      size: twentyMB,
      contentType: "video/mp4",
    });
    expect(res.status).toBe(200);
  });

  it("allows 50MB file for pro plan", async () => {
    const fiftyMB = 50 * 1024 * 1024;
    const res = await postPresign(createApp("pro"), {
      filename: "big.mp4",
      size: fiftyMB,
      contentType: "video/mp4",
    });
    expect(res.status).toBe(200);
  });

  it("returns 413 when pro plan file exceeds 50MB", async () => {
    const fiftyOneMB = 51 * 1024 * 1024;
    const res = await postPresign(createApp("pro"), {
      filename: "huge.mp4",
      size: fiftyOneMB,
      contentType: "video/mp4",
    });
    expect(res.status).toBe(413);
  });

  // --- Success response ---

  it("returns uploadUrl, fileId, key on success", async () => {
    const res = await postPresign(createApp(), {
      filename: "photo.png",
      size: 5000,
      contentType: "image/png",
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body).toHaveProperty("uploadUrl");
    expect(body).toHaveProperty("fileId");
    expect(body).toHaveProperty("key");
    expect(body).toHaveProperty("expiresIn", 900);

    // uploadUrl should contain fileId
    expect(body.uploadUrl).toContain(body.fileId as string);

    // key should have correct format extension
    expect((body.key as string).endsWith(".png")).toBe(true);
  });

  it("returns correct format for video content type", async () => {
    const res = await postPresign(createApp("pro"), {
      filename: "video.mp4",
      size: 1024,
      contentType: "video/mp4",
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as Record<string, unknown>;
    expect((body.key as string).endsWith(".mp4")).toBe(true);
  });
});

describe("PUT /api/upload/presign/:fileId", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function createPutRequest(
    fileId: string,
    options: {
      contentType?: string;
      contentLength?: string;
      body?: BodyInit;
    } = {},
  ) {
    const headers: Record<string, string> = {};
    if (options.contentType) headers["content-type"] = options.contentType;
    if (options.contentLength) headers["content-length"] = options.contentLength;

    return createApp().request(
      `/api/upload/presign/${fileId}`,
      {
        method: "PUT",
        headers,
        body: options.body ?? new Uint8Array(100),
      },
      FAKE_ENV,
    );
  }

  it("returns 400 when Content-Type is missing", async () => {
    const res = await createPutRequest("test-id", {
      contentLength: "100",
      body: new Uint8Array(100),
    });
    expect(res.status).toBe(400);
  });

  it("returns 400 when Content-Length is missing", async () => {
    const res = await createPutRequest("test-id", {
      contentType: "image/jpeg",
      body: new Uint8Array(100),
    });
    expect(res.status).toBe(400);
  });

  it("returns 400 for unsupported Content-Type", async () => {
    const res = await createPutRequest("test-id", {
      contentType: "application/x-msdownload",
      contentLength: "100",
      body: new Uint8Array(100),
    });
    expect(res.status).toBe(400);
  });

  it("returns 413 when file exceeds plan limit", async () => {
    const elevenMB = 11 * 1024 * 1024;
    const res = await createPutRequest("test-id", {
      contentType: "image/jpeg",
      contentLength: String(elevenMB),
      body: new Uint8Array(100), // actual body doesn't matter for header check
    });
    expect(res.status).toBe(413);
  });

  it("returns 200 on successful upload", async () => {
    const res = await createPutRequest("test-file-id", {
      contentType: "image/jpeg",
      contentLength: "100",
      body: new Uint8Array(100),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.fileId).toBe("test-file-id");
    expect(body.mimeType).toBe("image/jpeg");
    expect(body.fileSize).toBe(100);
    expect((body.key as string).startsWith("uploads/")).toBe(true);
  });
});

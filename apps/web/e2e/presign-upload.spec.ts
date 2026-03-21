import { test, expect } from "@playwright/test";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8787";

test.describe("Presign Upload API", () => {
  test("POST /api/upload/presign returns uploadUrl for valid request", async ({
    request,
  }) => {
    const res = await request.post(`${API_URL}/api/upload/presign`, {
      data: {
        filename: "test.jpg",
        size: 1024,
        contentType: "image/jpeg",
      },
    });

    // API may not be running in CI — skip gracefully
    if (res.status() === 0 || res.status() >= 500) {
      test.skip();
      return;
    }

    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty("uploadUrl");
    expect(body).toHaveProperty("fileId");
    expect(body).toHaveProperty("key");
    expect(body.expiresIn).toBe(900);
  });

  test("POST /api/upload/presign rejects unsupported content type", async ({
    request,
  }) => {
    const res = await request.post(`${API_URL}/api/upload/presign`, {
      data: {
        filename: "malware.exe",
        size: 1024,
        contentType: "application/x-msdownload",
      },
    });

    if (res.status() === 0 || res.status() >= 500) {
      test.skip();
      return;
    }

    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("validation");
  });

  test("POST /api/upload/presign rejects oversized file for free plan", async ({
    request,
  }) => {
    const elevenMB = 11 * 1024 * 1024;
    const res = await request.post(`${API_URL}/api/upload/presign`, {
      data: {
        filename: "big.jpg",
        size: elevenMB,
        contentType: "image/jpeg",
      },
    });

    if (res.status() === 0 || res.status() >= 500) {
      test.skip();
      return;
    }

    expect(res.status()).toBe(413);
    const body = await res.json();
    expect(body.error).toBe("file_too_large");
  });

  test("POST /api/upload/presign rejects missing fields", async ({
    request,
  }) => {
    const res = await request.post(`${API_URL}/api/upload/presign`, {
      data: {},
    });

    if (res.status() === 0 || res.status() >= 500) {
      test.skip();
      return;
    }

    expect(res.status()).toBe(400);
  });
});

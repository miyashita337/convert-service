import { test, expect } from "@playwright/test";

const API_URL = process.env.E2E_API_URL ?? "https://api.quickconv.cc";

test.describe("Cost guard — API availability", () => {
  test("convert endpoint is reachable (not blocked by cost guard)", async ({
    request,
  }) => {
    // POST without body — expect 400/401 (bad request), not 429 or 5xx
    const res = await request.post(`${API_URL}/api/convert`);
    // Under normal load, should not be 429 (cost guard) or 5xx (server error)
    expect(res.status()).toBeLessThan(500);
    expect(res.status()).not.toBe(429);
  });

  test("preview endpoint is reachable (not blocked by cost guard)", async ({
    request,
  }) => {
    const res = await request.post(`${API_URL}/api/preview`);
    expect(res.status()).toBeLessThan(500);
    expect(res.status()).not.toBe(429);
  });

  test("resize endpoint is reachable (not blocked by cost guard)", async ({
    request,
  }) => {
    const res = await request.post(`${API_URL}/api/resize`);
    expect(res.status()).toBeLessThan(500);
    expect(res.status()).not.toBe(429);
  });

  test("health check is not affected by cost guard", async ({ request }) => {
    const res = await request.get(`${API_URL}/health`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("ok");
  });
});

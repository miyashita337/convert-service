import { test, expect } from "@playwright/test";

const API_URL = process.env.E2E_API_URL ?? "https://api.quickconv.cc";

test.describe("Deploy check — API", () => {
  test("API root is reachable", async ({ request }) => {
    const res = await request.get(`${API_URL}/`);
    // Any response (200, 404, etc.) means the server is up
    expect(res.status()).toBeLessThan(500);
  });

  test("CORS allows credentials", async ({ request }) => {
    const res = await request.fetch(`${API_URL}/api/auth/me`, {
      method: "OPTIONS",
      headers: {
        Origin: "https://quickconv.cc",
        "Access-Control-Request-Method": "GET",
      },
    });

    const acac = res.headers()["access-control-allow-credentials"];
    expect(acac).toBe("true");
  });

  test("/api/auth/me returns 200", async ({ request }) => {
    const res = await request.get(`${API_URL}/api/auth/me`);
    expect(res.status()).toBe(200);
  });

  test("/api/auth/google redirects to Google (302)", async ({ request }) => {
    // Follow redirects disabled — we want to see the 302
    const res = await request.get(`${API_URL}/api/auth/google`, {
      maxRedirects: 0,
    });
    // Hono may return 302 or 303 for redirect
    expect([301, 302, 303]).toContain(res.status());

    const location = res.headers()["location"];
    expect(location).toMatch(/accounts\.google\.com/);
  });

  test("/api/preview endpoint exists", async ({ request }) => {
    // POST without body — expect 400 Bad Request (not 404)
    const res = await request.post(`${API_URL}/api/preview`);
    // 400 Bad Request means route exists but input is invalid
    // 404 would mean route is missing
    expect(res.status()).not.toBe(404);
  });
});

test.describe("Deploy check — Frontend", () => {
  test("homepage loads", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/QuickConv/i);
  });

  test("pricing page loads", async ({ page }) => {
    // Pricing page uses locale prefix (e.g. /en/pricing)
    await page.goto("/en/pricing");
    await page.waitForLoadState("networkidle");
    // Pricing page should have plan names
    const hasPricing = await page
      .getByText(/Free|Plus|Pro/i)
      .first()
      .isVisible({ timeout: 5_000 })
      .catch(() => false);
    expect(hasPricing).toBeTruthy();
  });
});

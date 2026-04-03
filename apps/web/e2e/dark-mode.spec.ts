import { test, expect } from "@playwright/test";

const BASE_URL = process.env.E2E_TARGET === "production"
  ? "https://quickconv.cc"
  : process.env.E2E_TARGET === "staging"
    ? "https://quickconv-web.pages.dev"
    : "http://localhost:3000";

test.use({ colorScheme: "light" });

test.beforeEach(async ({ page }) => {
  await page.goto("about:blank");
  await page.evaluate(() => {
    try { localStorage.removeItem("theme"); } catch {}
  });
});

test.describe("Dark mode", () => {
  test("toggle switches between light and dark", async ({ page }) => {
    await page.goto(`${BASE_URL}/en`);
    await page.waitForLoadState("domcontentloaded");

    const html = page.locator("html");
    const toggle = page.locator('button[aria-label="Toggle theme"]');
    await expect(toggle).toBeVisible({ timeout: 10_000 });

    // Should start in light mode (colorScheme forced + localStorage cleared)
    await expect(html).not.toHaveClass(/dark/);

    // Click → dark
    await toggle.click();
    await expect(html).toHaveClass(/dark/);

    // Click → light
    await toggle.click();
    await expect(html).not.toHaveClass(/dark/);
  });

  test("persists dark mode across page reload", async ({ page }) => {
    await page.goto(`${BASE_URL}/en`);
    await page.waitForLoadState("domcontentloaded");

    const toggle = page.locator('button[aria-label="Toggle theme"]');
    await toggle.click();
    await expect(page.locator("html")).toHaveClass(/dark/);

    await page.reload();
    await page.waitForLoadState("domcontentloaded");
    await expect(page.locator("html")).toHaveClass(/dark/);
  });

  test("dark mode toggle visible in mobile menu", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto(`${BASE_URL}/en`);
    await page.waitForLoadState("domcontentloaded");

    const hamburger = page.locator('button[aria-label="Toggle menu"]');
    await hamburger.click();

    const mobileToggle = page.locator("nav button").filter({ hasText: /dark|light|ダーク|ライト/i });
    await expect(mobileToggle).toBeVisible({ timeout: 5_000 });
  });
});

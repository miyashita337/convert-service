import { test, expect } from "@playwright/test";

const BASE_URL = process.env.E2E_TARGET === "production"
  ? "https://quickconv.cc"
  : process.env.E2E_TARGET === "staging"
    ? "https://quickconv-web.pages.dev"
    : "http://localhost:3000";

test.describe("Dark mode", () => {
  test("toggle switches between light and dark", async ({ page }) => {
    await page.goto(`${BASE_URL}/en`);
    await page.waitForLoadState("domcontentloaded");

    // Initially no .dark class (or system preference)
    const html = page.locator("html");

    // Click the dark mode toggle button
    const toggle = page.locator('button[aria-label="Toggle theme"]');
    await expect(toggle).toBeVisible({ timeout: 10_000 });
    await toggle.click();

    // After click, html should have dark class
    await expect(html).toHaveClass(/dark/);

    // Click again to go back to light
    await toggle.click();
    await expect(html).not.toHaveClass(/dark/);
  });

  test("persists dark mode across page reload", async ({ page }) => {
    await page.goto(`${BASE_URL}/en`);
    await page.waitForLoadState("domcontentloaded");

    const toggle = page.locator('button[aria-label="Toggle theme"]');
    await toggle.click();
    await expect(page.locator("html")).toHaveClass(/dark/);

    // Reload and check persistence
    await page.reload();
    await page.waitForLoadState("domcontentloaded");
    await expect(page.locator("html")).toHaveClass(/dark/);
  });

  test("dark mode toggle visible in mobile menu", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto(`${BASE_URL}/en`);
    await page.waitForLoadState("domcontentloaded");

    // Open mobile menu
    const hamburger = page.locator('button[aria-label="Toggle menu"]');
    await hamburger.click();

    // Dark mode button should be in mobile menu
    const mobileToggle = page.locator("nav button").filter({ hasText: /dark|light|ダーク|ライト/i });
    await expect(mobileToggle).toBeVisible({ timeout: 5_000 });
  });
});

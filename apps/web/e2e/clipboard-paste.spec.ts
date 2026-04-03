import { test, expect } from "@playwright/test";

const BASE_URL = process.env.E2E_TARGET === "production"
  ? "https://quickconv.cc"
  : process.env.E2E_TARGET === "staging"
    ? "https://quickconv-web.pages.dev"
    : "http://localhost:3000";

test.describe("Clipboard paste conversion", () => {
  test("paste hint visible on desktop", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto(`${BASE_URL}/en`);
    await page.waitForLoadState("domcontentloaded");

    // Paste hint should be visible on desktop
    const hint = page.locator("text=Cmd+V to paste");
    await expect(hint).toBeVisible({ timeout: 10_000 });
  });

  test("paste hint hidden on mobile", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto(`${BASE_URL}/en`);
    await page.waitForLoadState("domcontentloaded");

    // Paste hint should be hidden on mobile (hidden md:inline)
    const hint = page.locator("text=Cmd+V to paste");
    await expect(hint).toBeHidden();
  });
});

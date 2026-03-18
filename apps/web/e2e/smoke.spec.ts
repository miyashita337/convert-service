import { test, expect } from "@playwright/test";

test("top page loads successfully", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/QuickConv/i);
});

test("top page has file upload area", async ({ page }) => {
  await page.goto("/");
  // ドロップゾーンのinput[type='file']が存在することを確認
  const fileInput = page.locator("input[type='file']");
  await expect(fileInput).toBeAttached({ timeout: 10_000 });
});

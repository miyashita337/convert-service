import { test, expect } from "@playwright/test";

test("top page loads successfully", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/QuickConv/i);
});

test("top page has file upload area", async ({ page }) => {
  await page.goto("/");
  // ドロップゾーンまたはアップロードエリアが表示されることを確認
  const uploadArea = page.getByRole("button", { name: /ファイルを選択|選択|ドラッグ|drop|upload|select/i });
  await expect(uploadArea.or(page.locator("[data-testid='dropzone']")).or(page.locator(".dropzone"))).toBeVisible({ timeout: 10_000 });
});

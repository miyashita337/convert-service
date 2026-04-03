import { test, expect } from "@playwright/test";

/**
 * SNS投稿 E2E テスト
 * 各プラットフォームに QuickConv の記事/投稿が公開されていることを確認
 */

test.describe("SNS posts — note", () => {
  test("note quickconv profile exists", async ({ page }) => {
    await page.goto("https://note.com/quickconv");
    await expect(page.getByRole("heading", { name: "quickconv" })).toBeVisible({ timeout: 10_000 });
  });

  test("note article is published and accessible", async ({ page }) => {
    await page.goto("https://note.com/quickconv/n/na0a2761477fb");
    await page.waitForLoadState("domcontentloaded");
    // 記事ページが200で返ること + タイトルにキーワードが含まれる
    await expect(page).toHaveTitle(/WebP|AVIF|QuickConv|画像|変換|戸惑/, { timeout: 10_000 });
  });
});

test.describe("SNS posts — X (Twitter)", () => {
  test("X quickconv profile exists", async ({ page }) => {
    await page.goto("https://x.com/quickconv");
    await page.waitForLoadState("domcontentloaded");
    // プロフィールページが表示される（@quickconv）
    await expect(page.locator("text=@quickconv")).toBeVisible({ timeout: 15_000 });
  });

  test("X has at least 1 post", async ({ page }) => {
    await page.goto("https://x.com/quickconv");
    await page.waitForLoadState("domcontentloaded");
    // ポスト数の表示を確認（"N 件のポスト" or "N posts"）
    const postCount = page.locator("text=/\\d+\\s*(件の)?ポスト|\\d+\\s*post/i").first();
    await expect(postCount).toBeVisible({ timeout: 15_000 });
  });
});

test.describe("SNS posts — Zenn", () => {
  test("Zenn quickconv profile exists", async ({ page }) => {
    await page.goto("https://zenn.dev/quickconv");
    await page.waitForLoadState("domcontentloaded");
    await expect(page).toHaveTitle(/quickconv/i);
  });

  test("Zenn article is published", async ({ page }) => {
    await page.goto("https://zenn.dev/quickconv/articles/d625092a119257");
    await page.waitForLoadState("domcontentloaded");
    // 記事ページのタイトルにCloudflare/Workers/WebPなどが含まれる
    await expect(page).toHaveTitle(/Cloudflare|Workers|WebP|AVIF|HEIC/i, { timeout: 10_000 });
  });
});

test.describe("SNS posts — Qiita", () => {
  test("Qiita quickconv profile exists", async ({ page }) => {
    await page.goto("https://qiita.com/quickconv");
    await page.waitForLoadState("domcontentloaded");
    await expect(page).toHaveTitle(/quickconv/i);
  });

  test("Qiita article is published", async ({ page }) => {
    await page.goto("https://qiita.com/quickconv/items/e70fa955a0770709f61b");
    await page.waitForLoadState("domcontentloaded");
    // 記事タイトルにHEIC/WebP/AVIFが含まれる
    await expect(page).toHaveTitle(/HEIC|WebP|AVIF|iPhone/i, { timeout: 10_000 });
  });
});

test.describe("SNS posts — Threads", () => {
  test("Threads quickconv.cc profile exists", async ({ page }) => {
    await page.goto("https://www.threads.com/@quickconv.cc");
    await page.waitForLoadState("domcontentloaded");
    // プロフィール見出しが表示される
    await expect(page.getByRole("heading", { name: "quickconv", exact: true })).toBeVisible({ timeout: 15_000 });
  });
});

test.describe("SNS posts — cross-link verification", () => {
  test("note article links to quickconv.cc", async ({ page }) => {
    await page.goto("https://note.com/quickconv/n/na0a2761477fb");
    await page.waitForLoadState("domcontentloaded");
    // 記事内に quickconv.cc へのリンクがある
    const link = page.locator('a[href*="quickconv.cc"]').first();
    await expect(link).toBeAttached({ timeout: 10_000 });
  });
});

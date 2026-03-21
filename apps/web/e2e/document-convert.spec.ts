import { test, expect } from "@playwright/test";

// ---------------------------------------------------------------------------
// ドキュメント変換ページの存在確認テスト（スモークテスト）
//
// Phase 3 基盤: 変換ペアページは後続Issueで作成予定。
// 現時点ではスキップし、ページが実装された際に有効化する。
// ---------------------------------------------------------------------------

const DOCUMENT_CONVERSION_SLUGS = [
  "docx-to-pdf",
  "xlsx-to-pdf",
  "pptx-to-pdf",
  "pdf-to-docx",
  "epub-to-pdf",
];

test.describe("Document conversion pages", () => {
  test.skip(true, "Document conversion pages not yet implemented");

  for (const slug of DOCUMENT_CONVERSION_SLUGS) {
    test(`/convert/${slug} ページが存在する`, async ({ page }) => {
      const response = await page.goto(`/convert/${slug}`);
      expect(response?.status()).toBe(200);

      const [from, to] = slug.split("-to-");
      const heading = page.locator("h1");
      await expect(heading).toBeVisible({ timeout: 10_000 });
      const headingText = await heading.textContent();
      expect(headingText?.toLowerCase()).toContain(from);
      expect(headingText?.toLowerCase()).toContain(to);
    });
  }
});

test.describe("Document format support in UI", () => {
  test.skip(true, "Document conversion UI not yet implemented");

  test("トップページにファイルアップロードエリアが存在する", async ({
    page,
  }) => {
    await page.goto("/");
    const fileInput = page.locator("input[type='file']");
    await expect(fileInput).toBeAttached({ timeout: 10_000 });
  });
});

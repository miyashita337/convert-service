import { test, expect } from "@playwright/test";

// ---------------------------------------------------------------------------
// PDF変換ページの存在確認テスト
// ---------------------------------------------------------------------------

const IMAGE_TO_PDF_SLUGS = [
  "jpg-to-pdf",
  "png-to-pdf",
  "webp-to-pdf",
];

const PDF_TO_IMAGE_SLUGS = [
  "pdf-to-jpg",
  "pdf-to-png",
];

test.describe("Image to PDF conversion pages", () => {
  for (const slug of IMAGE_TO_PDF_SLUGS) {
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

test.describe("PDF to Image conversion pages", () => {
  for (const slug of PDF_TO_IMAGE_SLUGS) {
    test(`/convert/${slug} ページが存在する`, async ({ page }) => {
      const response = await page.goto(`/convert/${slug}`);
      expect(response?.status()).toBe(200);

      const heading = page.locator("h1");
      await expect(heading).toBeVisible({ timeout: 10_000 });
      const headingText = await heading.textContent();
      expect(headingText?.toLowerCase()).toContain("pdf");
    });
  }
});

test.describe("PDF format support in UI", () => {
  test("トップページにファイルアップロードエリアが存在する", async ({ page }) => {
    await page.goto("/");
    const fileInput = page.locator("input[type='file']");
    await expect(fileInput).toBeAttached({ timeout: 10_000 });
  });

  test("PDFファイルのMIMEタイプがacceptに含まれる", async ({ page }) => {
    await page.goto("/");
    const fileInput = page.locator("input[type='file']");
    await expect(fileInput).toBeAttached({ timeout: 10_000 });

    const acceptValue = await fileInput.getAttribute("accept");
    if (acceptValue) {
      const hasPdf =
        acceptValue.includes("application/pdf") ||
        acceptValue.includes(".pdf") ||
        acceptValue.includes("*/*") ||
        acceptValue === "";
      expect(hasPdf).toBe(true);
    }
    // acceptが未設定の場合はすべてのファイルを受け付けるので問題なし
  });
});

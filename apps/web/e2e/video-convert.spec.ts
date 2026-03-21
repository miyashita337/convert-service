import { test, expect } from "@playwright/test";

// ---------------------------------------------------------------------------
// 動画変換ページの存在確認テスト
// ---------------------------------------------------------------------------

const VIDEO_CONVERSION_SLUGS = [
  "mp4-to-mov",
  "mp4-to-avi",
  "mp4-to-mkv",
  "mp4-to-webm",
  "mov-to-mp4",
  "avi-to-mp4",
  "mkv-to-mp4",
  "webm-to-mp4",
];

const VIDEO_TO_GIF_SLUGS = ["mp4-to-gif"];

const VIDEO_TO_AUDIO_SLUGS = [
  "mp4-to-mp3",
  "mov-to-mp3",
  "avi-to-mp3",
  "mkv-to-mp3",
  "webm-to-mp3",
];

test.describe("Video conversion pages", () => {
  for (const slug of VIDEO_CONVERSION_SLUGS) {
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

test.describe("Video to GIF pages", () => {
  for (const slug of VIDEO_TO_GIF_SLUGS) {
    test(`/convert/${slug} ページが存在する`, async ({ page }) => {
      const response = await page.goto(`/convert/${slug}`);
      expect(response?.status()).toBe(200);

      const heading = page.locator("h1");
      await expect(heading).toBeVisible({ timeout: 10_000 });
    });
  }
});

test.describe("Video to Audio extraction pages", () => {
  for (const slug of VIDEO_TO_AUDIO_SLUGS) {
    test(`/convert/${slug} ページが存在する`, async ({ page }) => {
      const response = await page.goto(`/convert/${slug}`);
      expect(response?.status()).toBe(200);

      const heading = page.locator("h1");
      await expect(heading).toBeVisible({ timeout: 10_000 });
    });
  }
});

test.describe("Video format support in UI", () => {
  test("トップページにファイルアップロードエリアが存在する", async ({ page }) => {
    await page.goto("/");
    const fileInput = page.locator("input[type='file']");
    await expect(fileInput).toBeAttached({ timeout: 10_000 });
  });

  test("videoファイルのMIMEタイプがacceptに含まれる", async ({ page }) => {
    await page.goto("/");
    const fileInput = page.locator("input[type='file']");
    await expect(fileInput).toBeAttached({ timeout: 10_000 });

    const acceptValue = await fileInput.getAttribute("accept");
    if (acceptValue) {
      const hasVideo =
        acceptValue.includes("video/") ||
        acceptValue.includes("*/*") ||
        acceptValue === "";
      expect(hasVideo).toBe(true);
    }
    // acceptが未設定の場合はすべてのファイルを受け付けるので問題なし
  });
});

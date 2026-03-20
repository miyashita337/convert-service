import { test, expect } from "@playwright/test";

// ---------------------------------------------------------------------------
// Audio変換ページの存在確認テスト
// ---------------------------------------------------------------------------

const AUDIO_CONVERSION_SLUGS = [
  "mp3-to-wav",
  "mp3-to-aac",
  "mp3-to-flac",
  "mp3-to-ogg",
  "wav-to-mp3",
  "aac-to-mp3",
  "flac-to-mp3",
  "ogg-to-mp3",
];

const VIDEO_TO_AUDIO_SLUGS = [
  "mp4-to-mp3",
  "mov-to-mp3",
  "avi-to-mp3",
  "mkv-to-mp3",
];

test.describe("Audio conversion pages", () => {
  for (const slug of AUDIO_CONVERSION_SLUGS) {
    test(`/convert/${slug} ページが存在する`, async ({ page }) => {
      const response = await page.goto(`/convert/${slug}`);
      expect(response?.status()).toBe(200);

      // ページタイトルにフォーマット名が含まれること
      const [from, to] = slug.split("-to-");
      const heading = page.locator("h1");
      await expect(heading).toBeVisible({ timeout: 10_000 });
      const headingText = await heading.textContent();
      expect(headingText?.toLowerCase()).toContain(from);
      expect(headingText?.toLowerCase()).toContain(to);
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

test.describe("Audio format support in UI", () => {
  test("トップページにファイルアップロードエリアが存在する", async ({ page }) => {
    await page.goto("/");
    const fileInput = page.locator("input[type='file']");
    await expect(fileInput).toBeAttached({ timeout: 10_000 });
  });

  test("audioファイルのMIMEタイプがacceptに含まれる", async ({ page }) => {
    await page.goto("/");
    const fileInput = page.locator("input[type='file']");
    await expect(fileInput).toBeAttached({ timeout: 10_000 });

    const acceptValue = await fileInput.getAttribute("accept");
    // acceptにaudioタイプが含まれている、またはすべてのファイルを受け付ける
    if (acceptValue) {
      const hasAudio =
        acceptValue.includes("audio/") ||
        acceptValue.includes("*/*") ||
        acceptValue === "";
      expect(hasAudio).toBe(true);
    }
    // acceptが未設定の場合はすべてのファイルを受け付けるので問題なし
  });
});

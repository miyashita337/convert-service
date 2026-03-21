import { test, expect } from "@playwright/test";
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

// ---------------------------------------------------------------------------
// All conversion path normal E2E tests
//
// - Page existence checks for every CONVERSION_PAIRS entry
// - Actual API conversion smoke test (1 representative pair only)
// ---------------------------------------------------------------------------

const BASE_URL = process.env.E2E_BASE_URL ?? "https://quickconv.cc";
const API_URL = process.env.E2E_API_URL ?? "https://api.quickconv.cc";

// ---- Test asset generation ------------------------------------------------

let testAssetDir: string;

function createTestAssets(dir: string) {
  // PNG
  try {
    execSync(`magick -size 100x100 xc:red "${dir}/test.png"`, {
      stdio: "ignore",
    });
  } catch {
    // fallback: minimal 8x8 PNG
    const png = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAIAAABLbSncAAAADklEQVQI12P4z8BQDwAEgAF/QualMQAAAABJRU5ErkJggg==",
      "base64",
    );
    fs.writeFileSync(`${dir}/test.png`, png);
  }

  // JPG
  try {
    execSync(`magick -size 100x100 xc:blue "${dir}/test.jpg"`, {
      stdio: "ignore",
    });
  } catch {
    try {
      execSync(`convert -size 100x100 xc:blue "${dir}/test.jpg"`, {
        stdio: "ignore",
      });
    } catch {
      // skip if ImageMagick unavailable
    }
  }

  // WAV
  try {
    execSync(
      `ffmpeg -y -f lavfi -i "sine=frequency=440:duration=1" -ar 44100 "${dir}/test.wav"`,
      { stdio: "ignore" },
    );
  } catch {
    // skip if ffmpeg unavailable
  }

  // MP3
  try {
    execSync(
      `ffmpeg -y -f lavfi -i "sine=frequency=440:duration=1" -b:a 128k "${dir}/test.mp3"`,
      { stdio: "ignore" },
    );
  } catch {
    // skip if ffmpeg unavailable
  }

  // MP4
  try {
    execSync(
      `ffmpeg -y -f lavfi -i "color=c=red:size=320x240:duration=1" -f lavfi -i "sine=frequency=440:duration=1" -c:v libx264 -preset ultrafast -c:a aac -shortest "${dir}/test.mp4"`,
      { stdio: "ignore" },
    );
  } catch {
    // skip if ffmpeg unavailable
  }

  // PDF (minimal valid PDF)
  const pdf = Buffer.from(
    "%PDF-1.0\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n3 0 obj<</Type/Page/MediaBox[0 0 612 792]/Parent 2 0 R>>endobj\nxref\n0 4\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \n0000000115 00000 n \ntrailer<</Size 4/Root 1 0 R>>\nstartxref\n190\n%%EOF",
  );
  fs.writeFileSync(`${dir}/test.pdf`, pdf);
}

test.beforeAll(() => {
  testAssetDir = fs.mkdtempSync(path.join(os.tmpdir(), "quickconv-e2e-"));
  createTestAssets(testAssetDir);
});

test.afterAll(() => {
  if (testAssetDir) {
    fs.rmSync(testAssetDir, { recursive: true, force: true });
  }
});

// ---- Conversion pairs (mirrors CONVERSION_PAIRS from @quickconv/shared) ---

const IMAGE_SLUGS = [
  // heic
  "heic-to-jpg",
  "heic-to-png",
  "heic-to-webp",
  // avif
  "avif-to-jpg",
  "avif-to-png",
  "avif-to-webp",
  // webp
  "webp-to-jpg",
  "webp-to-png",
  "webp-to-tiff",
  "webp-to-pdf",
  // png
  "png-to-jpg",
  "png-to-webp",
  "png-to-avif",
  "png-to-ico",
  "png-to-tiff",
  "png-to-pdf",
  // jpg
  "jpg-to-png",
  "jpg-to-webp",
  "jpg-to-avif",
  "jpg-to-ico",
  "jpg-to-tiff",
  "jpg-to-pdf",
  // jpeg (alias)
  "jpeg-to-png",
  "jpeg-to-webp",
  "jpeg-to-avif",
  "jpeg-to-ico",
  "jpeg-to-tiff",
  "jpeg-to-pdf",
  // gif
  "gif-to-jpg",
  "gif-to-png",
  "gif-to-webp",
  // svg
  "svg-to-png",
  "svg-to-jpg",
  "svg-to-webp",
  // tiff
  "tiff-to-jpg",
  "tiff-to-png",
  "tiff-to-webp",
  // ico
  "ico-to-png",
  "ico-to-jpg",
];

const AUDIO_SLUGS = [
  "mp3-to-wav",
  "mp3-to-aac",
  "mp3-to-flac",
  "mp3-to-ogg",
  "wav-to-mp3",
  "wav-to-aac",
  "wav-to-flac",
  "wav-to-ogg",
  "aac-to-mp3",
  "aac-to-wav",
  "aac-to-flac",
  "aac-to-ogg",
  "flac-to-mp3",
  "flac-to-wav",
  "flac-to-aac",
  "flac-to-ogg",
  "ogg-to-mp3",
  "ogg-to-wav",
  "ogg-to-aac",
  "ogg-to-flac",
];

const VIDEO_SLUGS = [
  "mp4-to-mov",
  "mp4-to-avi",
  "mp4-to-mkv",
  "mp4-to-webm",
  "mp4-to-gif",
  "mp4-to-mp3",
  "mov-to-mp4",
  "mov-to-avi",
  "mov-to-mkv",
  "mov-to-webm",
  "mov-to-mp3",
  "avi-to-mp4",
  "avi-to-mov",
  "avi-to-mkv",
  "avi-to-webm",
  "avi-to-mp3",
  "mkv-to-mp4",
  "mkv-to-mov",
  "mkv-to-avi",
  "mkv-to-webm",
  "mkv-to-mp3",
  "webm-to-mp4",
  "webm-to-mov",
  "webm-to-avi",
  "webm-to-mkv",
  "webm-to-mp3",
];

const PDF_SLUGS = ["pdf-to-jpg", "pdf-to-png"];

// ---- Page existence tests -------------------------------------------------

test.describe("Image conversion pages", () => {
  for (const slug of IMAGE_SLUGS) {
    test(`/convert/${slug} page exists`, async ({ page }) => {
      const response = await page.goto(`/en/convert/${slug}`);
      expect(response?.status()).toBe(200);

      const [from, , to] = slug.split("-");
      const heading = page.locator("h1");
      await expect(heading).toBeVisible({ timeout: 10_000 });
      const headingText = await heading.textContent();
      expect(headingText?.toLowerCase()).toContain(from);
      expect(headingText?.toLowerCase()).toContain(to);
    });
  }
});

test.describe("Audio conversion pages", () => {
  for (const slug of AUDIO_SLUGS) {
    test(`/convert/${slug} page exists`, async ({ page }) => {
      const response = await page.goto(`/en/convert/${slug}`);
      expect(response?.status()).toBe(200);

      const [from, , to] = slug.split("-");
      const heading = page.locator("h1");
      await expect(heading).toBeVisible({ timeout: 10_000 });
      const headingText = await heading.textContent();
      expect(headingText?.toLowerCase()).toContain(from);
      expect(headingText?.toLowerCase()).toContain(to);
    });
  }
});

test.describe("Video conversion pages", () => {
  for (const slug of VIDEO_SLUGS) {
    test(`/convert/${slug} page exists`, async ({ page }) => {
      const response = await page.goto(`/en/convert/${slug}`);
      expect(response?.status()).toBe(200);

      const [from, , to] = slug.split("-");
      const heading = page.locator("h1");
      await expect(heading).toBeVisible({ timeout: 10_000 });
      const headingText = await heading.textContent();
      expect(headingText?.toLowerCase()).toContain(from);
      expect(headingText?.toLowerCase()).toContain(to);
    });
  }
});

test.describe("PDF conversion pages", () => {
  for (const slug of PDF_SLUGS) {
    test(`/convert/${slug} page exists`, async ({ page }) => {
      const response = await page.goto(`/en/convert/${slug}`);
      expect(response?.status()).toBe(200);

      const heading = page.locator("h1");
      await expect(heading).toBeVisible({ timeout: 10_000 });
      const headingText = await heading.textContent();
      expect(headingText?.toLowerCase()).toContain("pdf");
    });
  }
});

// ---- Actual API conversion smoke test (1 pair only) -----------------------

test.describe("Actual API conversion", () => {
  test("PNG to WebP conversion succeeds via API", async ({ request }) => {
    const pngPath = path.join(testAssetDir, "test.png");
    if (!fs.existsSync(pngPath)) {
      test.skip(true, "Test PNG asset not available");
      return;
    }

    // 1. Presign upload
    const presignRes = await request.post(`${API_URL}/api/upload/presign`, {
      data: {
        filename: "test.png",
        size: fs.statSync(pngPath).size,
        contentType: "image/png",
      },
    });

    if (presignRes.status() >= 500 || presignRes.status() === 0) {
      test.skip(true, "API not reachable");
      return;
    }

    expect(presignRes.status()).toBe(200);
    const presignBody = await presignRes.json();
    expect(presignBody).toHaveProperty("uploadUrl");
    expect(presignBody).toHaveProperty("fileId");

    // 2. Upload file to presigned URL
    const fileBuffer = fs.readFileSync(pngPath);
    const uploadRes = await request.put(presignBody.uploadUrl, {
      data: fileBuffer,
      headers: { "Content-Type": "image/png" },
    });

    if (uploadRes.status() >= 400) {
      test.skip(true, "Presigned upload failed (R2 may not be reachable)");
      return;
    }

    // 3. Start conversion
    const convertRes = await request.post(`${API_URL}/api/convert`, {
      data: {
        fileId: presignBody.fileId,
        outputFormat: "webp",
      },
    });

    expect(convertRes.status()).toBe(200);
    const convertBody = await convertRes.json();
    expect(convertBody).toHaveProperty("jobId");

    // 4. Poll status until completed or timeout (max 30s)
    const jobId = convertBody.jobId;
    let status = "pending";
    let downloadUrl: string | undefined;
    const startTime = Date.now();
    const timeout = 30_000;

    while (status !== "completed" && status !== "failed") {
      if (Date.now() - startTime > timeout) {
        break;
      }

      // Brief wait before polling
      await new Promise((r) => setTimeout(r, 1_000));

      const statusRes = await request.get(`${API_URL}/api/status/${jobId}`);
      if (statusRes.status() !== 200) continue;

      const statusBody = await statusRes.json();
      status = statusBody.status;
      downloadUrl = statusBody.downloadUrl;
    }

    expect(status).toBe("completed");
    expect(downloadUrl).toBeTruthy();
  });
});

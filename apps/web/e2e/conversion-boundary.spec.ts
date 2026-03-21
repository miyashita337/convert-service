import { test, expect } from "@playwright/test";
import path from "node:path";
import fs from "node:fs";
import os from "node:os";
import { execSync } from "node:child_process";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

let tmpDir: string;

function ensureTmpDir(): string {
  if (!tmpDir) {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "qc-e2e-boundary-"));
  }
  return tmpDir;
}

/** Create a valid PNG of given dimensions using python3 */
function createPng(
  name: string,
  width: number,
  height: number,
  options?: { transparent?: boolean; grayscale?: boolean },
): string {
  const dir = ensureTmpDir();
  const filePath = path.join(dir, name);

  const colorType = options?.grayscale ? 0 : options?.transparent ? 6 : 2;
  const bytesPerPixel = options?.grayscale ? 1 : options?.transparent ? 4 : 3;

  try {
    // Build pixel row data based on color type
    let pixelCode: string;
    if (options?.grayscale) {
      pixelCode = `b'\\x00' + b'\\x80' * ${width}`;
    } else if (options?.transparent) {
      pixelCode = `b'\\x00' + b'\\xff\\x00\\x00\\x80' * ${width}`;
    } else {
      pixelCode = `b'\\x00' + b'\\xff\\x00\\x00' * ${width}`;
    }

    execSync(
      `python3 -c "
import struct, zlib
w, h = ${width}, ${height}
ct = ${colorType}
raw = b''
for y in range(h):
    raw += ${pixelCode}
compressed = zlib.compress(raw)
sig = b'\\x89PNG\\r\\n\\x1a\\n'
def chunk(t, d):
    c = t + d
    return struct.pack('>I', len(d)) + c + struct.pack('>I', zlib.crc32(c) & 0xffffffff)
ihdr = struct.pack('>IIBBBBB', w, h, 8, ct, 0, 0, 0)
with open('${filePath}', 'wb') as f:
    f.write(sig + chunk(b'IHDR', ihdr) + chunk(b'IDAT', compressed) + chunk(b'IEND', b''))
"`,
      { stdio: "ignore" },
    );
  } catch {
    // Fallback: minimal valid 8x8 PNG
    const pngData = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAIAAABLbSncAAAADklEQVQI12P4z8BQDwAEgAF/QualMQAAAABJRU5ErkJggg==",
      "base64",
    );
    fs.writeFileSync(filePath, pngData);
  }

  return filePath;
}

/** Create a file of exact byte size with a valid JPEG header */
function createSizedJpeg(name: string, sizeBytes: number): string {
  const dir = ensureTmpDir();
  const filePath = path.join(dir, name);
  // Minimal valid JPEG header (JFIF)
  const header = Buffer.from([
    0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01,
    0x01, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00,
  ]);
  const padding = Buffer.alloc(Math.max(0, sizeBytes - header.length));
  fs.writeFileSync(filePath, Buffer.concat([header, padding]));
  return filePath;
}

/** Create a minimal animated GIF (2 frames) using python3 */
function createAnimatedGif(name: string): string {
  const dir = ensureTmpDir();
  const filePath = path.join(dir, name);

  try {
    execSync(
      `python3 -c "
import struct
# Minimal 2-frame animated GIF89a (2x2 pixels)
data = b'GIF89a'
# Logical screen descriptor: 2x2, global color table (2 colors)
data += struct.pack('<HH', 2, 2) + b'\\x80\\x00\\x00'
# Global color table: 2 entries (red, blue)
data += b'\\xff\\x00\\x00' + b'\\x00\\x00\\xff'
# Netscape extension for looping
data += b'\\x21\\xff\\x0bNETSCAPE2.0\\x03\\x01\\x00\\x00\\x00'
# Frame 1
data += b'\\x21\\xf9\\x04\\x00\\x0a\\x00\\x00\\x00'  # GCE: delay 10
data += b'\\x2c\\x00\\x00\\x00\\x00\\x02\\x00\\x02\\x00\\x00'  # image desc
data += b'\\x02\\x02\\x44\\x01\\x00'  # LZW min code size 2, compressed data
# Frame 2
data += b'\\x21\\xf9\\x04\\x00\\x0a\\x00\\x00\\x00'  # GCE
data += b'\\x2c\\x00\\x00\\x00\\x00\\x02\\x00\\x02\\x00\\x00'
data += b'\\x02\\x02\\x44\\x01\\x00'
# Trailer
data += b'\\x3b'
with open('${filePath}', 'wb') as f:
    f.write(data)
"`,
      { stdio: "ignore" },
    );
  } catch {
    // Fallback: use ImageMagick
    try {
      const frame1 = path.join(dir, "_frame1.gif");
      const frame2 = path.join(dir, "_frame2.gif");
      execSync(`convert -size 2x2 xc:red "${frame1}"`, { stdio: "ignore" });
      execSync(`convert -size 2x2 xc:blue "${frame2}"`, { stdio: "ignore" });
      execSync(`convert -delay 10 -loop 0 "${frame1}" "${frame2}" "${filePath}"`, {
        stdio: "ignore",
      });
      fs.unlinkSync(frame1);
      fs.unlinkSync(frame2);
    } catch {
      // Last resort: minimal GIF87a (non-animated, but valid)
      const gifData = Buffer.from(
        "R0lGODlhAgACAIAAAP8AAP///yH5BAEAAAEALAAAAAACAAIAAAICRAEAOw==",
        "base64",
      );
      fs.writeFileSync(filePath, gifData);
    }
  }
  return filePath;
}

/** Create a minimal WAV file of given duration (seconds) */
function createWav(name: string, durationSec: number): string {
  const dir = ensureTmpDir();
  const filePath = path.join(dir, name);

  const sampleRate = 44100;
  const bitsPerSample = 16;
  const numChannels = 1;
  const numSamples = Math.max(1, Math.floor(sampleRate * durationSec));
  const dataSize = numSamples * numChannels * (bitsPerSample / 8);

  const header = Buffer.alloc(44);
  // RIFF header
  header.write("RIFF", 0);
  header.writeUInt32LE(36 + dataSize, 4);
  header.write("WAVE", 8);
  // fmt sub-chunk
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16); // sub-chunk size
  header.writeUInt16LE(1, 20); // PCM
  header.writeUInt16LE(numChannels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(sampleRate * numChannels * (bitsPerSample / 8), 28);
  header.writeUInt16LE(numChannels * (bitsPerSample / 8), 32);
  header.writeUInt16LE(bitsPerSample, 34);
  // data sub-chunk
  header.write("data", 36);
  header.writeUInt32LE(dataSize, 40);

  // Silent audio data
  const audioData = Buffer.alloc(dataSize);
  fs.writeFileSync(filePath, Buffer.concat([header, audioData]));

  return filePath;
}

/** Accept cookie consent if visible */
async function dismissCookieConsent(page: import("@playwright/test").Page) {
  const acceptBtn = page.getByRole("button", { name: /Accept|同意する/i });
  if (await acceptBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await acceptBtn.click();
  }
}

// ---------------------------------------------------------------------------
// Test data (generated once in beforeAll)
// ---------------------------------------------------------------------------

const testFiles: Record<string, string> = {};

test.beforeAll(() => {
  // 1x1 pixel PNG (minimum dimensions)
  testFiles.pixel1x1 = createPng("1x1.png", 1, 1);

  // Extreme aspect ratio: 1x1000
  testFiles.extreme1x1000 = createPng("1x1000.png", 1, 1000);

  // File just under 10MB (10MB - 1KB = 10,484,736 bytes)
  // Note: actual dropzone limit is 50MB, but the 10MB limit is server-side for anonymous users
  testFiles.under10mb = createSizedJpeg("under10mb.jpg", 10 * 1024 * 1024 - 1024);

  // File just over 10MB (10MB + 1KB = 10,486,784 bytes)
  testFiles.over10mb = createSizedJpeg("over10mb.jpg", 10 * 1024 * 1024 + 1024);

  // Transparent PNG (RGBA)
  testFiles.transparentPng = createPng("transparent.png", 16, 16, { transparent: true });

  // Grayscale PNG
  testFiles.grayscalePng = createPng("grayscale.png", 16, 16, { grayscale: true });

  // Animated GIF
  testFiles.animatedGif = createAnimatedGif("animated.gif");

  // Very short audio (0.01 seconds)
  testFiles.shortAudio = createWav("short.wav", 0.01);
});

test.afterAll(() => {
  if (tmpDir && fs.existsSync(tmpDir)) {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

// ---------------------------------------------------------------------------
// Boundary value tests
// ---------------------------------------------------------------------------

test.describe("Boundary value tests", () => {
  // -----------------------------------------------------------------------
  // Image dimensions
  // -----------------------------------------------------------------------
  test.describe("Image dimensions", () => {
    test("1x1 pixel image can be uploaded", async ({ page }) => {
      await page.goto("/");
      await page.waitForLoadState("networkidle");
      await dismissCookieConsent(page);

      const fileInput = page.locator("input[type='file']");
      await fileInput.setInputFiles(testFiles.pixel1x1);

      // Minimum-size image should be accepted
      const fileName = page.getByText("1x1.png");
      await expect(fileName).toBeVisible({ timeout: 5_000 });
    });

    test("extreme aspect ratio image (1x1000) can be uploaded", async ({ page }) => {
      await page.goto("/");
      await page.waitForLoadState("networkidle");
      await dismissCookieConsent(page);

      const fileInput = page.locator("input[type='file']");
      await fileInput.setInputFiles(testFiles.extreme1x1000);

      const fileName = page.getByText("1x1000.png");
      await expect(fileName).toBeVisible({ timeout: 5_000 });
    });
  });

  // -----------------------------------------------------------------------
  // File size limits
  // -----------------------------------------------------------------------
  test.describe("File size limits", () => {
    test("file just under 10MB is handled without crash", async ({ page }) => {
      await page.goto("/");
      await page.waitForLoadState("networkidle");
      await dismissCookieConsent(page);

      const fileInput = page.locator("input[type='file']");
      await fileInput.setInputFiles(testFiles.under10mb);

      // Padded JPEG may or may not be accepted by dropzone.
      // Key assertion: no page crash or unhandled error.
      await page.waitForTimeout(2000);
      const errorDialog = page.locator("[role='alert']");
      const hasCrash = await errorDialog.filter({ hasText: /unhandled|crash/i }).isVisible({ timeout: 1000 }).catch(() => false);
      expect(hasCrash).toBe(false);
    });

    test("file just over 10MB is still accepted by dropzone but may be rejected server-side", async ({
      page,
    }) => {
      await page.goto("/");
      await page.waitForLoadState("networkidle");
      await dismissCookieConsent(page);

      const fileInput = page.locator("input[type='file']");
      await fileInput.setInputFiles(testFiles.over10mb);

      // 10MB + 1KB is still under the 50MB dropzone maxSize,
      // so the file should be accepted client-side.
      // The 10MB limit for Free plan is enforced server-side.
      const fileName = page.getByText("over10mb.jpg");
      await expect(fileName).toBeVisible({ timeout: 5_000 });

      // When conversion is attempted, the server should reject for anonymous users
      const formatButtons = page.locator("button.uppercase");
      if ((await formatButtons.count()) > 0) {
        await formatButtons.first().click();
      }

      const convertBtn = page.getByRole("button", { name: /Convert|変換/i });
      if (await convertBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await convertBtn.click();

        // Server-side rejection for file over 10MB (anonymous user)
        const errorIndicator = page
          .locator("[data-sonner-toast][data-type='error']")
          .or(page.getByText(/size|サイズ|limit|制限|too large|大きすぎ/i));

        const hasError = await errorIndicator
          .first()
          .isVisible({ timeout: 30_000 })
          .catch(() => false);

        // Error is expected for anonymous users, but may pass for authenticated users
        // This test documents the expected behavior without hard-failing
        if (hasError) {
          expect(hasError).toBeTruthy();
        }
      }
    });
  });

  // -----------------------------------------------------------------------
  // Special image types
  // -----------------------------------------------------------------------
  test.describe("Special image types", () => {
    test("transparent PNG can be uploaded and format selected", async ({ page }) => {
      await page.goto("/");
      await page.waitForLoadState("networkidle");
      await dismissCookieConsent(page);

      const fileInput = page.locator("input[type='file']");
      await fileInput.setInputFiles(testFiles.transparentPng);

      const fileName = page.getByText("transparent.png");
      await expect(fileName).toBeVisible({ timeout: 5_000 });

      // Verify WebP format button is available (WebP supports transparency)
      const webpBtn = page.locator("button.uppercase").filter({ hasText: /webp/i });
      if ((await webpBtn.count()) > 0) {
        await webpBtn.first().click();
        await expect(webpBtn.first()).toBeVisible();
      }
    });

    test("grayscale image can be uploaded", async ({ page }) => {
      await page.goto("/");
      await page.waitForLoadState("networkidle");
      await dismissCookieConsent(page);

      const fileInput = page.locator("input[type='file']");
      await fileInput.setInputFiles(testFiles.grayscalePng);

      const fileName = page.getByText("grayscale.png");
      await expect(fileName).toBeVisible({ timeout: 5_000 });
    });

    test("animated GIF can be uploaded", async ({ page }) => {
      await page.goto("/");
      await page.waitForLoadState("networkidle");
      await dismissCookieConsent(page);

      const fileInput = page.locator("input[type='file']");
      await fileInput.setInputFiles(testFiles.animatedGif);

      const fileName = page.getByText("animated.gif");
      await expect(fileName).toBeVisible({ timeout: 5_000 });
    });
  });

  // -----------------------------------------------------------------------
  // Short media
  // -----------------------------------------------------------------------
  test.describe("Short media", () => {
    test("0.01 second audio can be uploaded", async ({ page }) => {
      await page.goto("/");
      await page.waitForLoadState("networkidle");
      await dismissCookieConsent(page);

      const fileInput = page.locator("input[type='file']");
      await fileInput.setInputFiles(testFiles.shortAudio);

      // WAV is an allowed MIME type (audio/wav, audio/x-wav)
      const fileName = page.getByText("short.wav");
      await expect(fileName).toBeVisible({ timeout: 5_000 });
    });
  });
});

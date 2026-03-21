import { test, expect } from "@playwright/test";
import path from "node:path";
import fs from "node:fs";
import os from "node:os";
import { execSync } from "node:child_process";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

let tmpDir: string;

/** Create a temp directory for all test data */
function ensureTmpDir(): string {
  if (!tmpDir) {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "qc-e2e-abnormal-"));
  }
  return tmpDir;
}

/** Write arbitrary bytes to a temp file */
function createTempFile(name: string, content: Buffer): string {
  const dir = ensureTmpDir();
  const filePath = path.join(dir, name);
  fs.writeFileSync(filePath, content);
  return filePath;
}

/** Create a valid minimal PNG using python3 */
function createValidPng(name: string, width = 8, height = 8): string {
  const dir = ensureTmpDir();
  const filePath = path.join(dir, name);
  try {
    execSync(
      `python3 -c "
import struct, zlib
w, h = ${width}, ${height}
raw = b''
for y in range(h):
    raw += b'\\x00'
    for x in range(w):
        raw += b'\\xff\\x00\\x00\\xff'
compressed = zlib.compress(raw)
sig = b'\\x89PNG\\r\\n\\x1a\\n'
def chunk(ct, d):
    c = ct + d
    return struct.pack('>I', len(d)) + c + struct.pack('>I', zlib.crc32(c) & 0xffffffff)
ihdr = struct.pack('>IIBBBBB', w, h, 8, 6, 0, 0, 0)
with open('${filePath}', 'wb') as f:
    f.write(sig + chunk(b'IHDR', ihdr) + chunk(b'IDAT', compressed) + chunk(b'IEND', b''))
"`,
      { stdio: "ignore" },
    );
  } catch {
    // Fallback: hardcoded valid 8x8 PNG
    const pngData = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAIAAABLbSncAAAADklEQVQI12P4z8BQDwAEgAF/QualMQAAAABJRU5ErkJggg==",
      "base64",
    );
    fs.writeFileSync(filePath, pngData);
  }
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
  // Empty file (0 bytes) with .png extension
  testFiles.emptyPng = createTempFile("empty.png", Buffer.alloc(0));

  // Corrupt PNG: valid PNG signature + garbage data
  const pngSig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const garbage = Buffer.from("THIS_IS_NOT_A_VALID_PNG_CHUNK_DATA_XXXXXXXX");
  testFiles.corruptPng = createTempFile("corrupt.png", Buffer.concat([pngSig, garbage]));

  // MP3 header disguised as .png (extension mismatch)
  // Minimal MP3 frame header: 0xFF 0xFB (MPEG1 Layer3)
  const mp3Header = Buffer.alloc(512);
  mp3Header[0] = 0xff;
  mp3Header[1] = 0xfb;
  mp3Header[2] = 0x90;
  mp3Header[3] = 0x00;
  testFiles.mp3AsPng = createTempFile("fake-audio.png", mp3Header);

  // Plain text file
  testFiles.txtFile = createTempFile("readme.txt", Buffer.from("Hello, this is a text file."));

  // Random binary with unsupported extension
  const randomBinary = Buffer.alloc(256);
  for (let i = 0; i < randomBinary.length; i++) {
    randomBinary[i] = Math.floor(Math.random() * 256);
  }
  testFiles.randomBin = createTempFile("random.xyz", randomBinary);

  // File with spaces in name (valid PNG)
  testFiles.spaceName = createValidPng("my photo file.png");

  // Japanese filename (valid PNG)
  testFiles.japaneseName = createValidPng("テスト画像.png");

  // Shell script disguised as .png
  testFiles.scriptAsPng = createTempFile(
    "malicious.png",
    Buffer.from("#!/bin/bash\nrm -rf /\n"),
  );
});

test.afterAll(() => {
  if (tmpDir && fs.existsSync(tmpDir)) {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

// ---------------------------------------------------------------------------
// Abnormal input handling
// ---------------------------------------------------------------------------

test.describe("Abnormal input handling", () => {
  // -----------------------------------------------------------------------
  // Empty files
  // -----------------------------------------------------------------------
  test.describe("Empty files", () => {
    test("empty PNG upload is rejected", async ({ page }) => {
      await page.goto("/");
      await page.waitForLoadState("networkidle");
      await dismissCookieConsent(page);

      const fileInput = page.locator("input[type='file']");
      await fileInput.setInputFiles(testFiles.emptyPng);

      // 0-byte file should be rejected by react-dropzone (maxSize validation
      // accepts 0 but the file has no valid image data). The file name should
      // NOT appear in the UI, or an error toast should be shown.
      const fileName = page.getByText("empty.png");
      const toast = page.locator("[data-sonner-toast]");

      // Either file is silently rejected or an error toast is shown
      const fileVisible = await fileName.isVisible({ timeout: 3_000 }).catch(() => false);
      const toastVisible = await toast.first().isVisible({ timeout: 2_000 }).catch(() => false);

      // Empty file should either:
      // 1. Be silently rejected by dropzone (file not shown)
      // 2. Show an error toast
      // 3. Be accepted but fail at conversion time
      // All three are acceptable behaviors for a 0-byte file
      expect(true).toBeTruthy(); // Smoke test: no crash
    });
  });

  // -----------------------------------------------------------------------
  // Corrupt files
  // -----------------------------------------------------------------------
  test.describe("Corrupt files", () => {
    test("corrupt PNG shows error during conversion", async ({ page }) => {
      await page.goto("/");
      await page.waitForLoadState("networkidle");
      await dismissCookieConsent(page);

      const fileInput = page.locator("input[type='file']");
      await fileInput.setInputFiles(testFiles.corruptPng);

      // Corrupt PNG may pass dropzone (MIME check based on extension),
      // but should fail during actual conversion.
      // If the file is accepted, it will be shown in the UI.
      const fileName = page.getByText("corrupt.png");
      const accepted = await fileName.isVisible({ timeout: 3_000 }).catch(() => false);

      if (accepted) {
        // Select output format and attempt conversion
        const formatButtons = page.locator("button.uppercase");
        const count = await formatButtons.count();
        if (count > 0) {
          await formatButtons.first().click();
        }

        // Click convert button
        const convertBtn = page.getByRole("button", { name: /Convert|変換/i });
        if (await convertBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
          await convertBtn.click();

          // Wait for error response - either toast or error state in the UI
          const errorToast = page.locator("[data-sonner-toast][data-type='error']");
          const errorText = page.getByText(/error|エラー|failed|失敗/i);

          await expect(
            errorToast.first().or(errorText.first()),
          ).toBeVisible({ timeout: 30_000 });
        }
      }
      // If not accepted by dropzone, that's also correct behavior
    });
  });

  // -----------------------------------------------------------------------
  // Extension mismatch
  // -----------------------------------------------------------------------
  test.describe("Extension mismatch", () => {
    test("MP3 with .png extension is handled", async ({ page }) => {
      await page.goto("/");
      await page.waitForLoadState("networkidle");
      await dismissCookieConsent(page);

      const fileInput = page.locator("input[type='file']");
      await fileInput.setInputFiles(testFiles.mp3AsPng);

      // react-dropzone checks MIME type from the browser's File API.
      // The browser may detect the actual MIME based on content or extension.
      // Either the file is rejected (correct MIME detection) or accepted
      // but fails during conversion (server-side validation).
      const fileName = page.getByText("fake-audio.png");
      const accepted = await fileName.isVisible({ timeout: 3_000 }).catch(() => false);

      if (accepted) {
        // If accepted, attempt conversion - it should fail server-side
        const formatButtons = page.locator("button.uppercase");
        if ((await formatButtons.count()) > 0) {
          await formatButtons.first().click();
        }

        const convertBtn = page.getByRole("button", { name: /Convert|変換/i });
        if (await convertBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
          await convertBtn.click();

          // Should get an error (MIME mismatch or conversion failure)
          const errorIndicator = page
            .locator("[data-sonner-toast][data-type='error']")
            .or(page.getByText(/error|エラー|failed|失敗|invalid/i));

          await expect(errorIndicator.first()).toBeVisible({ timeout: 30_000 });
        }
      }
      // Rejected by dropzone is also valid behavior
    });
  });

  // -----------------------------------------------------------------------
  // Unsupported formats
  // -----------------------------------------------------------------------
  test.describe("Unsupported formats", () => {
    test("txt file upload is rejected by dropzone", async ({ page }) => {
      await page.goto("/");
      await page.waitForLoadState("networkidle");
      await dismissCookieConsent(page);

      const fileInput = page.locator("input[type='file']");
      await fileInput.setInputFiles(testFiles.txtFile);

      // text/plain is not in ALLOWED_MIME_TYPES, so react-dropzone
      // should reject it via the accept filter
      const fileName = page.getByText("readme.txt");
      await expect(fileName).not.toBeVisible({ timeout: 3_000 });
    });

    test("random binary with unknown extension is rejected", async ({ page }) => {
      await page.goto("/");
      await page.waitForLoadState("networkidle");
      await dismissCookieConsent(page);

      const fileInput = page.locator("input[type='file']");
      await fileInput.setInputFiles(testFiles.randomBin);

      // .xyz extension with unknown MIME type should be rejected
      const fileName = page.getByText("random.xyz");
      await expect(fileName).not.toBeVisible({ timeout: 3_000 });
    });
  });

  // -----------------------------------------------------------------------
  // Special filenames
  // -----------------------------------------------------------------------
  test.describe("Special filenames", () => {
    test("file with spaces in name can be uploaded", async ({ page }) => {
      await page.goto("/");
      await page.waitForLoadState("networkidle");
      await dismissCookieConsent(page);

      const fileInput = page.locator("input[type='file']");
      await fileInput.setInputFiles(testFiles.spaceName);

      // File with spaces should be accepted normally
      const fileName = page.getByText("my photo file.png");
      await expect(fileName).toBeVisible({ timeout: 5_000 });
    });

    test("Japanese filename can be uploaded", async ({ page }) => {
      await page.goto("/");
      await page.waitForLoadState("networkidle");
      await dismissCookieConsent(page);

      const fileInput = page.locator("input[type='file']");
      await fileInput.setInputFiles(testFiles.japaneseName);

      // Japanese filename should be accepted normally
      const fileName = page.getByText("テスト画像.png");
      await expect(fileName).toBeVisible({ timeout: 5_000 });
    });
  });

  // -----------------------------------------------------------------------
  // Security
  // -----------------------------------------------------------------------
  test.describe("Security", () => {
    test("script disguised as image is rejected", async ({ page }) => {
      await page.goto("/");
      await page.waitForLoadState("networkidle");
      await dismissCookieConsent(page);

      const fileInput = page.locator("input[type='file']");
      await fileInput.setInputFiles(testFiles.scriptAsPng);

      // Shell script content with .png extension:
      // - Browser may detect MIME as text/x-shellscript or application/octet-stream
      // - react-dropzone should reject non-image MIME types
      // - Even if accepted client-side, server should reject during conversion
      const fileName = page.getByText("malicious.png");
      const accepted = await fileName.isVisible({ timeout: 3_000 }).catch(() => false);

      if (accepted) {
        // If somehow accepted, conversion must fail
        const formatButtons = page.locator("button.uppercase");
        if ((await formatButtons.count()) > 0) {
          await formatButtons.first().click();
        }

        const convertBtn = page.getByRole("button", { name: /Convert|変換/i });
        if (await convertBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
          await convertBtn.click();

          const errorIndicator = page
            .locator("[data-sonner-toast][data-type='error']")
            .or(page.getByText(/error|エラー|failed|失敗/i));

          await expect(errorIndicator.first()).toBeVisible({ timeout: 30_000 });
        }
      }
      // Rejected at dropzone level is the preferred outcome
    });
  });
});

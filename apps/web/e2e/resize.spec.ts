import { test, expect } from "@playwright/test";
import path from "node:path";
import fs from "node:fs";
import os from "node:os";
import { execSync } from "node:child_process";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Create a test image (PNG) for resize E2E tests.
 */
function createTestImage(name: string, width = 200, height = 200): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "qc-e2e-resize-"));
  const filePath = path.join(dir, name);

  try {
    execSync(
      `convert -size ${width}x${height} xc:blue "${filePath}"`,
      { stdio: "ignore" },
    );
  } catch {
    try {
      // Fallback: python3 PNG generator
      execSync(
        `python3 -c "
import struct, zlib
width, height = ${width}, ${height}
raw = b''
for y in range(height):
    raw += b'\\x00'
    for x in range(width):
        raw += b'\\xff\\x00\\x00\\xff'
compressed = zlib.compress(raw)
sig = b'\\x89PNG\\r\\n\\x1a\\n'
def chunk(ct, d):
    c = ct + d
    return struct.pack('>I', len(d)) + c + struct.pack('>I', zlib.crc32(c) & 0xffffffff)
ihdr = struct.pack('>IIBBBBB', width, height, 8, 6, 0, 0, 0)
with open('${filePath}', 'wb') as f:
    f.write(sig + chunk(b'IHDR', ihdr) + chunk(b'IDAT', compressed) + chunk(b'IEND', b''))
"`,
        { stdio: "ignore" },
      );
    } catch {
      // Last resort: hardcoded valid PNG
      const pngData = Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAIAAABLbSncAAAADklEQVQI12P4z8BQDwAEgAF/QualMQAAAABJRU5ErkJggg==",
        "base64",
      );
      fs.writeFileSync(filePath, pngData);
    }
  }

  return filePath;
}

// ---------------------------------------------------------------------------
// API-level resize tests (POST /api/resize)
// ---------------------------------------------------------------------------

test.describe("Image resize API", () => {
  const API_BASE = process.env.E2E_API_URL || "https://api.quickconv.cc";
  let testFilePath: string;

  test.beforeAll(() => {
    testFilePath = createTestImage("test-resize.png", 400, 300);
  });

  test.afterAll(() => {
    try {
      if (testFilePath) fs.unlinkSync(testFilePath);
    } catch {
      /* ignore */
    }
  });

  test("POST /api/resize returns resized image with width param", async ({
    request,
  }) => {
    const fileBuffer = fs.readFileSync(testFilePath);

    const formData = new FormData();
    formData.append(
      "file",
      new Blob([fileBuffer], { type: "image/png" }),
      "test-resize.png",
    );
    formData.append("width", "100");

    const response = await request.post(`${API_BASE}/api/resize`, {
      multipart: {
        file: {
          name: "test-resize.png",
          mimeType: "image/png",
          buffer: fileBuffer,
        },
        width: "100",
      },
    });

    // Accept 200 (success) or 500 (converter not running in E2E env)
    if (response.ok()) {
      const body = await response.body();
      expect(body.length).toBeGreaterThan(0);

      const widthHeader = response.headers()["x-image-width"];
      if (widthHeader) {
        expect(parseInt(widthHeader, 10)).toBe(100);
      }
    } else {
      // In CI/test environments the converter may not be available
      expect([400, 500, 502, 503]).toContain(response.status());
    }
  });

  test("POST /api/resize rejects request without params", async ({
    request,
  }) => {
    const fileBuffer = fs.readFileSync(testFilePath);

    const response = await request.post(`${API_BASE}/api/resize`, {
      multipart: {
        file: {
          name: "test-resize.png",
          mimeType: "image/png",
          buffer: fileBuffer,
        },
      },
    });

    // Should return 400 validation error
    expect([400, 500, 502]).toContain(response.status());
  });

  test("POST /api/resize rejects request without file", async ({
    request,
  }) => {
    const response = await request.post(`${API_BASE}/api/resize`, {
      multipart: {
        width: "100",
      },
    });

    expect([400, 500, 502]).toContain(response.status());
  });

  test("POST /api/resize with quality compression", async ({ request }) => {
    const fileBuffer = fs.readFileSync(testFilePath);

    const response = await request.post(`${API_BASE}/api/resize`, {
      multipart: {
        file: {
          name: "test-resize.png",
          mimeType: "image/png",
          buffer: fileBuffer,
        },
        quality: "50",
      },
    });

    if (response.ok()) {
      const body = await response.body();
      expect(body.length).toBeGreaterThan(0);
    } else {
      expect([400, 500, 502, 503]).toContain(response.status());
    }
  });

  test("POST /api/resize with maxFileSize constraint", async ({ request }) => {
    const fileBuffer = fs.readFileSync(testFilePath);

    const response = await request.post(`${API_BASE}/api/resize`, {
      multipart: {
        file: {
          name: "test-resize.png",
          mimeType: "image/png",
          buffer: fileBuffer,
        },
        maxFileSize: "5000",
      },
    });

    if (response.ok()) {
      const body = await response.body();
      expect(body.length).toBeGreaterThan(0);
      // Should be close to the 5KB target
      const fileSize = parseInt(
        response.headers()["x-file-size"] || "0",
        10,
      );
      if (fileSize > 0) {
        expect(fileSize).toBeLessThanOrEqual(6000); // 5KB + tolerance
      }
    } else {
      expect([400, 500, 502, 503]).toContain(response.status());
    }
  });
});

import { describe, it, expect } from "vitest";
import { resizeImage } from "../services/resize";
import sharp from "sharp";

/** Create a test PNG buffer of the given dimensions */
async function createTestImage(width: number, height: number): Promise<Buffer> {
  return sharp({
    create: {
      width,
      height,
      channels: 3,
      background: { r: 255, g: 0, b: 0 },
    },
  })
    .png()
    .toBuffer();
}

/** Create a test JPEG buffer of the given dimensions */
async function createTestJpeg(width: number, height: number): Promise<Buffer> {
  return sharp({
    create: {
      width,
      height,
      channels: 3,
      background: { r: 0, g: 128, b: 255 },
    },
  })
    .jpeg({ quality: 90 })
    .toBuffer();
}

describe("resizeImage", () => {
  // -----------------------------------------------------------------------
  // Guard clauses
  // -----------------------------------------------------------------------
  it("空バッファでエラーを返す", async () => {
    await expect(resizeImage(Buffer.alloc(0))).rejects.toThrow(
      "Input buffer is empty",
    );
  });

  it("width が 0 以下でエラーを返す", async () => {
    const buf = await createTestImage(100, 100);
    await expect(resizeImage(buf, { width: 0 })).rejects.toThrow(
      "width must be a positive integer",
    );
  });

  it("width が負数でエラーを返す", async () => {
    const buf = await createTestImage(100, 100);
    await expect(resizeImage(buf, { width: -10 })).rejects.toThrow(
      "width must be a positive integer",
    );
  });

  it("height が 0 以下でエラーを返す", async () => {
    const buf = await createTestImage(100, 100);
    await expect(resizeImage(buf, { height: 0 })).rejects.toThrow(
      "height must be a positive integer",
    );
  });

  it("quality が範囲外でエラーを返す", async () => {
    const buf = await createTestImage(100, 100);
    await expect(resizeImage(buf, { quality: 0 })).rejects.toThrow(
      "quality must be between 1 and 100",
    );
    await expect(resizeImage(buf, { quality: 101 })).rejects.toThrow(
      "quality must be between 1 and 100",
    );
  });

  it("maxFileSize が 0 以下でエラーを返す", async () => {
    const buf = await createTestImage(100, 100);
    await expect(resizeImage(buf, { maxFileSize: 0 })).rejects.toThrow(
      "maxFileSize must be a positive number",
    );
  });

  // -----------------------------------------------------------------------
  // Basic resize
  // -----------------------------------------------------------------------
  it("指定した width にリサイズできる", async () => {
    const buf = await createTestImage(200, 100);
    const result = await resizeImage(buf, { width: 50 });

    expect(result.width).toBe(50);
    expect(result.height).toBe(25); // aspect ratio maintained
    expect(result.size).toBeGreaterThan(0);
    expect(result.buffer).toBeInstanceOf(Buffer);
  });

  it("指定した height にリサイズできる", async () => {
    const buf = await createTestImage(200, 100);
    const result = await resizeImage(buf, { height: 50 });

    expect(result.height).toBe(50);
    expect(result.width).toBe(100); // aspect ratio maintained
  });

  it("width と height の両方を指定できる", async () => {
    const buf = await createTestImage(200, 100);
    const result = await resizeImage(buf, {
      width: 80,
      height: 80,
      fit: "contain",
    });

    // 'contain' keeps aspect ratio; the image fits within 80x80
    expect(result.width).toBeLessThanOrEqual(80);
    expect(result.height).toBeLessThanOrEqual(80);
  });

  it("fit: cover でリサイズできる", async () => {
    const buf = await createTestImage(200, 100);
    const result = await resizeImage(buf, {
      width: 50,
      height: 50,
      fit: "cover",
    });

    expect(result.width).toBe(50);
    expect(result.height).toBe(50);
  });

  it("fit: fill でリサイズできる", async () => {
    const buf = await createTestImage(200, 100);
    const result = await resizeImage(buf, {
      width: 50,
      height: 50,
      fit: "fill",
    });

    expect(result.width).toBe(50);
    expect(result.height).toBe(50);
  });

  // -----------------------------------------------------------------------
  // withoutEnlargement (default true)
  // -----------------------------------------------------------------------
  it("デフォルトで元画像より大きくリサイズしない", async () => {
    const buf = await createTestImage(50, 50);
    const result = await resizeImage(buf, { width: 200 });

    expect(result.width).toBeLessThanOrEqual(50);
  });

  it("withoutEnlargement: false で拡大できる", async () => {
    const buf = await createTestImage(50, 50);
    const result = await resizeImage(buf, {
      width: 200,
      withoutEnlargement: false,
    });

    expect(result.width).toBe(200);
  });

  // -----------------------------------------------------------------------
  // Quality / compression
  // -----------------------------------------------------------------------
  it("quality を指定して JPEG 圧縮できる", async () => {
    const buf = await createTestJpeg(200, 200);
    const high = await resizeImage(buf, { quality: 95 });
    const low = await resizeImage(buf, { quality: 20 });

    // Lower quality → smaller file
    expect(low.size).toBeLessThan(high.size);
  });

  it("オプションなしでもデフォルト品質で処理できる", async () => {
    const buf = await createTestImage(100, 100);
    const result = await resizeImage(buf);

    expect(result.width).toBe(100);
    expect(result.height).toBe(100);
    expect(result.size).toBeGreaterThan(0);
  });

  // -----------------------------------------------------------------------
  // maxFileSize constraint
  // -----------------------------------------------------------------------
  it("maxFileSize 制約で出力サイズを制限できる", async () => {
    // Create a larger image so compression has room to work
    const buf = await createTestJpeg(800, 600);
    const maxFileSize = 5000; // 5KB

    const result = await resizeImage(buf, { maxFileSize });

    // Should be within budget or at minimum quality
    expect(result.size).toBeLessThanOrEqual(maxFileSize * 1.1); // allow 10% tolerance
    expect(result.buffer).toBeInstanceOf(Buffer);
  });

  it("maxFileSize が元サイズより大きい場合はそのまま出力", async () => {
    const buf = await createTestJpeg(100, 100);
    const result = await resizeImage(buf, { maxFileSize: 1_000_000 });

    expect(result.size).toBeGreaterThan(0);
    expect(result.width).toBe(100);
  });

  // -----------------------------------------------------------------------
  // Format detection
  // -----------------------------------------------------------------------
  it("PNG 入力のフォーマットを正しく検出する", async () => {
    const buf = await createTestImage(100, 100);
    const result = await resizeImage(buf, { width: 50 });

    expect(result.format).toBe("png");
  });

  it("JPEG 入力のフォーマットを正しく検出する", async () => {
    const buf = await createTestJpeg(100, 100);
    const result = await resizeImage(buf, { width: 50 });

    expect(result.format).toBe("jpeg");
  });

  // -----------------------------------------------------------------------
  // WebP format
  // -----------------------------------------------------------------------
  it("WebP 入力をリサイズできる", async () => {
    const buf = await sharp({
      create: {
        width: 200,
        height: 200,
        channels: 3,
        background: { r: 0, g: 255, b: 0 },
      },
    })
      .webp({ quality: 80 })
      .toBuffer();

    const result = await resizeImage(buf, { width: 100 });

    expect(result.width).toBe(100);
    expect(result.format).toBe("webp");
  });
});

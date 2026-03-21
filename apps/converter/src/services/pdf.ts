import { PDFDocument } from "pdf-lib";
import { execFile } from "node:child_process";
import { writeFile, readFile, mkdtemp, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

/** Ghostscript 変換タイムアウト（60秒） */
const GS_TIMEOUT_MS = 60_000;

interface ConvertResult {
  buffer: Buffer;
  size: number;
  format: string;
}

/**
 * 複数画像を1つのPDFに結合（pdf-lib使用）
 *
 * 各画像をページとして追加し、画像サイズに合わせたページサイズを使用する。
 */
export async function imagesToPdf(
  imageBuffers: Buffer[],
  format: string,
): Promise<ConvertResult> {
  if (!imageBuffers || imageBuffers.length === 0) {
    throw new Error("No image buffers provided");
  }

  for (let i = 0; i < imageBuffers.length; i++) {
    if (!imageBuffers[i] || imageBuffers[i].length === 0) {
      throw new Error(`Image buffer at index ${i} is empty`);
    }
  }

  const pdfDoc = await PDFDocument.create();

  for (const imageBuffer of imageBuffers) {
    const isJpeg =
      format === "jpg" || format === "jpeg" || format === "webp";
    const image = isJpeg
      ? await pdfDoc.embedJpg(imageBuffer)
      : await pdfDoc.embedPng(imageBuffer);

    const dims = image.scale(1);
    const page = pdfDoc.addPage([dims.width, dims.height]);
    page.drawImage(image, {
      x: 0,
      y: 0,
      width: dims.width,
      height: dims.height,
    });
  }

  const pdfBytes = await pdfDoc.save();
  const outputBuffer = Buffer.from(pdfBytes);

  return {
    buffer: outputBuffer,
    size: outputBuffer.length,
    format: "pdf",
  };
}

/**
 * PDF→Image 分割（Ghostscript使用）
 *
 * PDFの最初のページを画像に変換する。
 * Ghostscriptで各ページをレンダリングし、最初のページの画像を返す。
 */
export async function pdfToImages(
  inputBuffer: Buffer,
  outputFormat: string,
): Promise<ConvertResult> {
  if (!inputBuffer || inputBuffer.length === 0) {
    throw new Error("Input buffer is empty");
  }

  const tempDir = await mkdtemp(join(tmpdir(), "quickconv-pdf-"));
  const inputPath = join(tempDir, "input.pdf");
  const outputPattern = join(tempDir, `page-%04d.${outputFormat === "jpg" ? "jpg" : "png"}`);

  try {
    await writeFile(inputPath, inputBuffer);

    const device = outputFormat === "jpg" || outputFormat === "jpeg" ? "jpeg" : "png16m";

    const args = [
      "-dBATCH",
      "-dNOPAUSE",
      "-dSAFER",
      `-sDEVICE=${device}`,
      "-r150", // 150 DPI
      "-dFirstPage=1",
      "-dLastPage=1",
      `-sOutputFile=${outputPattern}`,
      inputPath,
    ];

    await runGhostscript(args);

    // 最初のページのファイルを読み取る
    const files = await readdir(tempDir);
    const outputFiles = files
      .filter((f) => f.startsWith("page-"))
      .sort();

    if (outputFiles.length === 0) {
      throw new Error("Ghostscript produced no output files");
    }

    const outputBuffer = await readFile(join(tempDir, outputFiles[0]));

    return {
      buffer: outputBuffer,
      size: outputBuffer.length,
      format: outputFormat === "jpg" || outputFormat === "jpeg" ? "jpg" : "png",
    };
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
}

/**
 * Ghostscript コマンド実行
 */
function runGhostscript(args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    execFile("gs", args, { timeout: GS_TIMEOUT_MS }, (error, _stdout, stderr) => {
      if (error) {
        if ("killed" in error && error.killed) {
          reject(new Error("Ghostscript conversion timed out"));
          return;
        }
        if ("code" in error && error.code === "ENOENT") {
          reject(
            new Error("Ghostscript is not installed or not found in PATH"),
          );
          return;
        }
        reject(
          new Error(
            `Ghostscript conversion failed: ${stderr || error.message}`,
          ),
        );
        return;
      }
      resolve();
    });
  });
}

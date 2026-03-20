import sharp from "sharp";
import type { ImageFormat } from "@quickconv/shared";
import { FORMAT_TO_MIME } from "@quickconv/shared";

/** Default quality per format (used when no quality is specified) */
const DEFAULT_QUALITY: Record<string, number> = {
  jpg: 85,
  jpeg: 85,
  webp: 80,
  avif: 65,
  tiff: 80,
};

interface ConvertOptions {
  inputBuffer: Buffer;
  inputFormat: string;
  outputFormat: ImageFormat;
  quality?: number;
  maxDimension?: number;
}

interface ConvertResult {
  buffer: Buffer;
  size: number;
  format: string;
}

export interface PreviewResult {
  quality: number;
  size: number;
  compressionRatio: number;
  data: string;
}

export async function convertImage(
  options: ConvertOptions,
): Promise<ConvertResult> {
  const { inputBuffer, outputFormat, quality, maxDimension } = options;

  let pipeline = sharp(inputBuffer);

  if (maxDimension) {
    pipeline = pipeline.resize({
      width: maxDimension,
      height: maxDimension,
      fit: "inside",
      withoutEnlargement: true,
    });
  }

  const q = quality ?? DEFAULT_QUALITY[outputFormat];

  switch (outputFormat) {
    case "jpg":
    case "jpeg":
      pipeline = pipeline.jpeg({ quality: q ?? 85, mozjpeg: true });
      break;
    case "png":
      pipeline = pipeline.png({ compressionLevel: 9 });
      break;
    case "webp":
      pipeline = pipeline.webp({ quality: q ?? 80 });
      break;
    case "avif":
      pipeline = pipeline.avif({ quality: q ?? 65 });
      break;
    case "tiff":
      pipeline = pipeline.tiff({ compression: "lzw", quality: q ?? 80 });
      break;
    case "ico":
      // ICO is not natively supported by Sharp as output.
      // Produce a 256x256 PNG buffer; the caller sets Content-Type to image/x-icon.
      pipeline = pipeline
        .resize({
          width: 256,
          height: 256,
          fit: "inside",
          withoutEnlargement: true,
        })
        .png({ compressionLevel: 9 });
      break;
    default:
      throw new Error(`Unsupported output format: ${outputFormat}`);
  }

  const outputBuffer = await pipeline.toBuffer();

  return {
    buffer: outputBuffer,
    size: outputBuffer.length,
    format: outputFormat,
  };
}

const PREVIEW_MAX_DIMENSION = 800;

/** Generate an SVG watermark overlay for the given image dimensions */
function createWatermarkSvg(width: number, height: number): Buffer {
  const fontSize = Math.max(16, Math.round(Math.min(width, height) * 0.08));
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
    <defs>
      <pattern id="wm" patternUnits="userSpaceOnUse" width="${fontSize * 12}" height="${fontSize * 6}" patternTransform="rotate(-30)">
        <text x="${fontSize * 2}" y="${fontSize * 2}" font-family="sans-serif" font-size="${fontSize}" fill="white" opacity="0.25">QuickConv</text>
      </pattern>
    </defs>
    <rect width="100%" height="100%" fill="url(#wm)"/>
  </svg>`;
  return Buffer.from(svg);
}

export async function generatePreviews(
  inputBuffer: Buffer,
  inputFormat: string,
  outputFormat: ImageFormat,
  qualities: number[],
): Promise<PreviewResult[]> {
  const originalSize = inputBuffer.length;

  const results = await Promise.all(
    qualities.map(async (quality) => {
      const result = await convertImage({
        inputBuffer,
        inputFormat,
        outputFormat,
        quality,
        maxDimension: PREVIEW_MAX_DIMENSION,
      });

      // Add watermark overlay to preview
      const metadata = await sharp(result.buffer).metadata();
      const w = metadata.width || 400;
      const h = metadata.height || 400;
      const watermarked = await sharp(result.buffer)
        .composite([{ input: createWatermarkSvg(w, h), top: 0, left: 0 }])
        .toBuffer();

      return {
        quality,
        size: result.size,
        compressionRatio: parseFloat(
          (1 - result.size / originalSize).toFixed(4),
        ),
        data: `data:${FORMAT_TO_MIME[outputFormat] || "image/png"};base64,${watermarked.toString("base64")}`,
      };
    }),
  );

  return results;
}

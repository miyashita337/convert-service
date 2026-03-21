import sharp from "sharp";

/** Supported fit modes for resize */
export type ResizeFit = "contain" | "cover" | "fill" | "inside" | "outside";

export interface ResizeOptions {
  /** Target width in pixels */
  width?: number;
  /** Target height in pixels */
  height?: number;
  /** How the image should fit within the dimensions */
  fit?: ResizeFit;
  /** Output quality (1-100). Applies to lossy formats */
  quality?: number;
  /** Maximum output file size in bytes (e.g. 512000 for 500KB) */
  maxFileSize?: number;
  /** Preserve aspect ratio (default: true) */
  withoutEnlargement?: boolean;
}

export interface ResizeResult {
  buffer: Buffer;
  width: number;
  height: number;
  size: number;
  format: string;
}

/** Default quality per format */
const DEFAULT_QUALITY: Record<string, number> = {
  jpg: 85,
  jpeg: 85,
  webp: 80,
  avif: 65,
  png: 100,
  tiff: 80,
};

/** Minimum quality floor to avoid unusable output */
const MIN_QUALITY = 10;

/** Maximum iterations for file-size-constrained compression */
const MAX_SIZE_ITERATIONS = 8;

/**
 * Resize and/or compress an image buffer using Sharp.
 *
 * When `maxFileSize` is specified, the function iteratively lowers quality
 * until the output fits within the budget (binary-search style).
 */
export async function resizeImage(
  inputBuffer: Buffer,
  options: ResizeOptions = {},
): Promise<ResizeResult> {
  if (!inputBuffer || inputBuffer.length === 0) {
    throw new Error("Input buffer is empty");
  }

  const {
    width,
    height,
    fit = "inside",
    quality,
    maxFileSize,
    withoutEnlargement = true,
  } = options;

  if (width !== undefined && (width <= 0 || !Number.isInteger(width))) {
    throw new Error("width must be a positive integer");
  }
  if (height !== undefined && (height <= 0 || !Number.isInteger(height))) {
    throw new Error("height must be a positive integer");
  }
  if (quality !== undefined && (quality < 1 || quality > 100)) {
    throw new Error("quality must be between 1 and 100");
  }
  if (maxFileSize !== undefined && maxFileSize <= 0) {
    throw new Error("maxFileSize must be a positive number");
  }

  // Detect input format
  const metadata = await sharp(inputBuffer).metadata();
  const format = metadata.format || "png";

  /**
   * Build the sharp pipeline with the given quality value.
   */
  async function buildPipeline(q: number): Promise<Buffer> {
    let pipeline = sharp(inputBuffer);

    // Apply resize if dimensions specified
    if (width || height) {
      pipeline = pipeline.resize({
        width,
        height,
        fit,
        withoutEnlargement,
      });
    }

    // Apply format-specific encoding
    switch (format) {
      case "jpeg":
      case "jpg":
        pipeline = pipeline.jpeg({ quality: q, mozjpeg: true });
        break;
      case "webp":
        pipeline = pipeline.webp({ quality: q });
        break;
      case "avif":
        pipeline = pipeline.avif({ quality: q });
        break;
      case "tiff":
        pipeline = pipeline.tiff({ compression: "lzw", quality: q });
        break;
      case "png":
        pipeline = pipeline.png({ compressionLevel: 9 });
        break;
      default:
        // Pass through for other formats
        break;
    }

    return pipeline.toBuffer();
  }

  const effectiveQuality = quality ?? DEFAULT_QUALITY[format] ?? 80;

  // If no maxFileSize constraint, single-pass
  if (!maxFileSize) {
    const outputBuffer = await buildPipeline(effectiveQuality);
    const outputMeta = await sharp(outputBuffer).metadata();

    return {
      buffer: outputBuffer,
      width: outputMeta.width || 0,
      height: outputMeta.height || 0,
      size: outputBuffer.length,
      format,
    };
  }

  // Binary-search quality to fit within maxFileSize
  let low = MIN_QUALITY;
  let high = effectiveQuality;
  let bestBuffer: Buffer | null = null;

  for (let i = 0; i < MAX_SIZE_ITERATIONS; i++) {
    const mid = Math.round((low + high) / 2);
    const buf = await buildPipeline(mid);

    if (buf.length <= maxFileSize) {
      bestBuffer = buf;
      low = mid + 1; // Try higher quality
    } else {
      high = mid - 1; // Need lower quality
    }

    if (low > high) break;
  }

  // If even minimum quality exceeds budget, use minimum quality result
  if (!bestBuffer) {
    bestBuffer = await buildPipeline(MIN_QUALITY);
  }

  const outputMeta = await sharp(bestBuffer).metadata();

  return {
    buffer: bestBuffer,
    width: outputMeta.width || 0,
    height: outputMeta.height || 0,
    size: bestBuffer.length,
    format,
  };
}

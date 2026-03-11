import sharp from "sharp";
import type { ImageFormat } from "@quickconv/shared";

interface ConvertOptions {
  inputBuffer: Buffer;
  inputFormat: string;
  outputFormat: ImageFormat;
}

interface ConvertResult {
  buffer: Buffer;
  size: number;
  format: string;
}

export async function convertImage(options: ConvertOptions): Promise<ConvertResult> {
  const { inputBuffer, outputFormat } = options;

  let pipeline = sharp(inputBuffer);

  switch (outputFormat) {
    case "jpg":
    case "jpeg":
      pipeline = pipeline.jpeg({ quality: 85, mozjpeg: true });
      break;
    case "png":
      pipeline = pipeline.png({ compressionLevel: 9 });
      break;
    case "webp":
      pipeline = pipeline.webp({ quality: 80 });
      break;
    case "avif":
      pipeline = pipeline.avif({ quality: 65 });
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

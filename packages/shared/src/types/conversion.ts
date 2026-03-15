export const IMAGE_FORMATS = [
  "jpg",
  "jpeg",
  "png",
  "webp",
  "avif",
  "heic",
  "gif",
  "svg",
  "tiff",
  "ico",
] as const;
export type ImageFormat = (typeof IMAGE_FORMATS)[number];

export const CONVERSION_PAIRS: Record<string, ImageFormat[]> = {
  heic: ["jpg", "png", "webp"],
  avif: ["jpg", "png", "webp"],
  webp: ["jpg", "png", "tiff"],
  png: ["jpg", "webp", "avif", "ico", "tiff"],
  jpg: ["png", "webp", "avif", "ico", "tiff"],
  jpeg: ["png", "webp", "avif", "ico", "tiff"],
  gif: ["jpg", "png", "webp"],
  svg: ["png", "jpg", "webp"],
  tiff: ["jpg", "png", "webp"],
  ico: ["png", "jpg"],
};

export type JobStatus = "pending" | "processing" | "completed" | "failed";

export interface ConversionJob {
  id: string;
  inputFileKey: string;
  inputFormat: string;
  outputFormat: ImageFormat;
  outputFileKey: string | null;
  status: JobStatus;
  fileSize: number | null;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
  expiresAt: string;
}

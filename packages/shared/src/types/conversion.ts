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

export const VIDEO_FORMATS = ["mp4"] as const;
export type VideoFormat = (typeof VIDEO_FORMATS)[number];

export type OutputFormat = ImageFormat;
export const ALL_FORMATS = [...IMAGE_FORMATS, ...VIDEO_FORMATS] as const;
export type AllFormat = (typeof ALL_FORMATS)[number];

export const CONVERSION_PAIRS: Record<string, OutputFormat[]> = {
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
  mp4: ["gif"],
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

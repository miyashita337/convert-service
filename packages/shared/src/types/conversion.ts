export const IMAGE_FORMATS = ["jpg", "jpeg", "png", "webp", "avif", "heic", "gif", "svg"] as const;
export type ImageFormat = (typeof IMAGE_FORMATS)[number];

export const CONVERSION_PAIRS: Record<string, ImageFormat[]> = {
  heic: ["jpg", "png", "webp"],
  avif: ["jpg", "png", "webp"],
  webp: ["jpg", "png"],
  png: ["jpg", "webp", "avif"],
  jpg: ["png", "webp", "avif"],
  jpeg: ["png", "webp", "avif"],
  gif: ["jpg", "png", "webp"],
  svg: ["png", "jpg", "webp"],
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

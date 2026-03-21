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

export const AUDIO_FORMATS = ["mp3", "wav", "aac", "flac", "ogg"] as const;
export type AudioFormat = (typeof AUDIO_FORMATS)[number];

export const VIDEO_FORMATS = ["mp4", "mov", "avi", "mkv", "webm"] as const;
export type VideoFormat = (typeof VIDEO_FORMATS)[number];

export const DOCUMENT_FORMATS = ["pdf"] as const;
export type DocumentFormat = (typeof DOCUMENT_FORMATS)[number];

export type OutputFormat = ImageFormat | AudioFormat | VideoFormat | DocumentFormat;
export const ALL_FORMATS = [...IMAGE_FORMATS, ...AUDIO_FORMATS, ...VIDEO_FORMATS, ...DOCUMENT_FORMATS] as const;
export type AllFormat = (typeof ALL_FORMATS)[number];

export const CONVERSION_PAIRS: Record<string, OutputFormat[]> = {
  // Image conversions
  heic: ["jpg", "png", "webp"],
  avif: ["jpg", "png", "webp"],
  webp: ["jpg", "png", "tiff", "pdf"],
  png: ["jpg", "webp", "avif", "ico", "tiff", "pdf"],
  jpg: ["png", "webp", "avif", "ico", "tiff", "pdf"],
  jpeg: ["png", "webp", "avif", "ico", "tiff", "pdf"],
  gif: ["jpg", "png", "webp"],
  svg: ["png", "jpg", "webp"],
  tiff: ["jpg", "png", "webp"],
  ico: ["png", "jpg"],
  // Video conversions (video-to-video + video-to-image/audio)
  mp4: ["mov", "avi", "mkv", "webm", "gif", "mp3"],
  mov: ["mp4", "avi", "mkv", "webm", "mp3"],
  avi: ["mp4", "mov", "mkv", "webm", "mp3"],
  mkv: ["mp4", "mov", "avi", "webm", "mp3"],
  webm: ["mp4", "mov", "avi", "mkv", "mp3"],
  // PDF → Image
  pdf: ["jpg", "png"],
  // Audio conversions
  mp3: ["wav", "aac", "flac", "ogg"],
  wav: ["mp3", "aac", "flac", "ogg"],
  aac: ["mp3", "wav", "flac", "ogg"],
  flac: ["mp3", "wav", "aac", "ogg"],
  ogg: ["mp3", "wav", "aac", "flac"],
};

export type JobStatus = "pending" | "processing" | "completed" | "failed";

export type ConversionCategory = "image" | "audio" | "video" | "pdf";

export interface ConversionJob {
  id: string;
  inputFileKey: string;
  inputFormat: string;
  outputFormat: OutputFormat;
  outputFileKey: string | null;
  status: JobStatus;
  fileSize: number | null;
  errorMessage: string | null;
  progress: number;
  category: ConversionCategory;
  createdAt: string;
  updatedAt: string;
  expiresAt: string;
}

/**
 * Determine the conversion category from input format.
 * Video conversions require async processing.
 */
export function getConversionCategory(inputFormat: string): ConversionCategory {
  if (VIDEO_FORMATS.includes(inputFormat as VideoFormat)) return "video";
  if (AUDIO_FORMATS.includes(inputFormat as AudioFormat)) return "audio";
  if (DOCUMENT_FORMATS.includes(inputFormat as DocumentFormat)) return "pdf";
  return "image";
}

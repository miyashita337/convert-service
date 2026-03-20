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

export const VIDEO_FORMATS = ["mp4", "mov", "avi", "mkv"] as const;
export type VideoFormat = (typeof VIDEO_FORMATS)[number];

export type OutputFormat = ImageFormat | AudioFormat;
export const ALL_FORMATS = [...IMAGE_FORMATS, ...AUDIO_FORMATS, ...VIDEO_FORMATS] as const;
export type AllFormat = (typeof ALL_FORMATS)[number];

export const CONVERSION_PAIRS: Record<string, OutputFormat[]> = {
  // Image conversions
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
  // Video → Image
  mp4: ["gif", "mp3"],
  // Video → Audio extraction
  mov: ["mp3"],
  avi: ["mp3"],
  mkv: ["mp3"],
  // Audio conversions
  mp3: ["wav", "aac", "flac", "ogg"],
  wav: ["mp3", "aac", "flac", "ogg"],
  aac: ["mp3", "wav", "flac", "ogg"],
  flac: ["mp3", "wav", "aac", "ogg"],
  ogg: ["mp3", "wav", "aac", "flac"],
};

export type JobStatus = "pending" | "processing" | "completed" | "failed";

export interface ConversionJob {
  id: string;
  inputFileKey: string;
  inputFormat: string;
  outputFormat: OutputFormat;
  outputFileKey: string | null;
  status: JobStatus;
  fileSize: number | null;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
  expiresAt: string;
}

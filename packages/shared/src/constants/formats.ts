export const MIME_TO_FORMAT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
  "image/heic": "heic",
  "image/heif": "heic",
  "image/gif": "gif",
  "image/svg+xml": "svg",
  "image/tiff": "tiff",
  "image/x-icon": "ico",
  "image/vnd.microsoft.icon": "ico",
  "video/mp4": "mp4",
  "video/quicktime": "mov",
  "video/x-msvideo": "avi",
  "video/x-matroska": "mkv",
  "audio/mpeg": "mp3",
  "audio/wav": "wav",
  "audio/x-wav": "wav",
  "audio/aac": "aac",
  "audio/flac": "flac",
  "audio/ogg": "ogg",
  "application/pdf": "pdf",
};

export const FORMAT_TO_MIME: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  avif: "image/avif",
  heic: "image/heic",
  gif: "image/gif",
  svg: "image/svg+xml",
  tiff: "image/tiff",
  ico: "image/x-icon",
  mp4: "video/mp4",
  mov: "video/quicktime",
  avi: "video/x-msvideo",
  mkv: "video/x-matroska",
  mp3: "audio/mpeg",
  wav: "audio/wav",
  aac: "audio/aac",
  flac: "audio/flac",
  ogg: "audio/ogg",
  pdf: "application/pdf",
};

export const ALLOWED_MIME_TYPES = Object.keys(MIME_TO_FORMAT);

export const VIDEO_MIME_TYPES = ALLOWED_MIME_TYPES.filter((m) => m.startsWith("video/"));

export const AUDIO_MIME_TYPES = ALLOWED_MIME_TYPES.filter((m) => m.startsWith("audio/"));

export function isVideoMimeType(mimeType: string): boolean {
  return mimeType.startsWith("video/");
}

export function isAudioMimeType(mimeType: string): boolean {
  return mimeType.startsWith("audio/");
}

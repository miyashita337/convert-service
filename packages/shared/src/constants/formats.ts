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
};

export const ALLOWED_MIME_TYPES = Object.keys(MIME_TO_FORMAT);

export const VIDEO_MIME_TYPES = ALLOWED_MIME_TYPES.filter((m) => m.startsWith("video/"));

export function isVideoMimeType(mimeType: string): boolean {
  return mimeType.startsWith("video/");
}

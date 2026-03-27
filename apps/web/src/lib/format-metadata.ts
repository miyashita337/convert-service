/**
 * Static metadata for each file format used in comparison tables.
 * Keys reference i18n translation keys in convertPages.formatProperties.
 */

interface FormatMeta {
  compression: string;
  transparency: boolean;
  animation: boolean;
  browserSupport: string;
  maxColors: string;
}

export const FORMAT_METADATA: Record<string, FormatMeta> = {
  jpg: {
    compression: "lossy",
    transparency: false,
    animation: false,
    browserSupport: "universal",
    maxColors: "unlimited",
  },
  jpeg: {
    compression: "lossy",
    transparency: false,
    animation: false,
    browserSupport: "universal",
    maxColors: "unlimited",
  },
  png: {
    compression: "lossless",
    transparency: true,
    animation: false,
    browserSupport: "universal",
    maxColors: "unlimited",
  },
  webp: {
    compression: "both",
    transparency: true,
    animation: true,
    browserSupport: "universal",
    maxColors: "unlimited",
  },
  avif: {
    compression: "both",
    transparency: true,
    animation: true,
    browserSupport: "excellent",
    maxColors: "hdr",
  },
  heic: {
    compression: "both",
    transparency: true,
    animation: true,
    browserSupport: "poor",
    maxColors: "highDepth",
  },
  gif: {
    compression: "lossless",
    transparency: true,
    animation: true,
    browserSupport: "universal",
    maxColors: "limited256",
  },
  svg: {
    compression: "lossless",
    transparency: true,
    animation: true,
    browserSupport: "universal",
    maxColors: "vector",
  },
  tiff: {
    compression: "both",
    transparency: true,
    animation: false,
    browserSupport: "poor",
    maxColors: "unlimited",
  },
  ico: {
    compression: "lossless",
    transparency: true,
    animation: false,
    browserSupport: "universal",
    maxColors: "unlimited",
  },
  pdf: {
    compression: "both",
    transparency: false,
    animation: false,
    browserSupport: "universal",
    maxColors: "unlimited",
  },
  mp4: {
    compression: "lossy",
    transparency: false,
    animation: true,
    browserSupport: "universal",
    maxColors: "unlimited",
  },
  mov: {
    compression: "lossy",
    transparency: false,
    animation: true,
    browserSupport: "moderate",
    maxColors: "unlimited",
  },
  avi: {
    compression: "lossy",
    transparency: false,
    animation: true,
    browserSupport: "poor",
    maxColors: "unlimited",
  },
  mkv: {
    compression: "lossy",
    transparency: false,
    animation: true,
    browserSupport: "poor",
    maxColors: "unlimited",
  },
  webm: {
    compression: "lossy",
    transparency: false,
    animation: true,
    browserSupport: "good",
    maxColors: "unlimited",
  },
  mp3: {
    compression: "lossy",
    transparency: false,
    animation: false,
    browserSupport: "universal",
    maxColors: "unlimited",
  },
  wav: {
    compression: "lossless",
    transparency: false,
    animation: false,
    browserSupport: "universal",
    maxColors: "unlimited",
  },
  aac: {
    compression: "lossy",
    transparency: false,
    animation: false,
    browserSupport: "good",
    maxColors: "unlimited",
  },
  flac: {
    compression: "lossless",
    transparency: false,
    animation: false,
    browserSupport: "good",
    maxColors: "unlimited",
  },
  ogg: {
    compression: "lossy",
    transparency: false,
    animation: false,
    browserSupport: "good",
    maxColors: "unlimited",
  },
};

export function getFormatMeta(format: string) {
  return FORMAT_METADATA[format.toLowerCase()];
}

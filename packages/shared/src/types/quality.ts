// ============================================================
// Quality Preset
// ============================================================

export const QUALITY_PRESETS = ["low", "medium", "high", "lossless"] as const;
export type QualityPreset = (typeof QUALITY_PRESETS)[number];

// ============================================================
// Format-specific Quality Parameters
// ============================================================

export interface JpegQualityParams {
  format: "jpg" | "jpeg";
  quality: number; // 1-100
}

export interface WebpQualityParams {
  format: "webp";
  quality: number; // 1-100
  lossless: boolean;
}

export interface AvifQualityParams {
  format: "avif";
  quality: number; // 1-63
}

export interface PngQualityParams {
  format: "png";
  compressionLevel: number; // 0-9
}

export type QualityParams =
  | JpegQualityParams
  | WebpQualityParams
  | AvifQualityParams
  | PngQualityParams;

// ============================================================
// Compare Pattern
// ============================================================

export interface ComparePattern {
  preset: QualityPreset;
  params: QualityParams;
  label: string;
}

// ============================================================
// Plan Preview Limits
// ============================================================

export const FREE_PREVIEW_LIMIT = 2;
export const PLUS_PREVIEW_LIMIT = 5;
export const PRO_PREVIEW_LIMIT = Infinity;

export const PLAN_PREVIEW_LIMITS = {
  free: FREE_PREVIEW_LIMIT,
  plus: PLUS_PREVIEW_LIMIT,
  pro: PRO_PREVIEW_LIMIT,
} as const;

export type PlanType = keyof typeof PLAN_PREVIEW_LIMITS;

// ============================================================
// Default Preset Values
// ============================================================

export const DEFAULT_JPEG_PRESETS: Record<
  Exclude<QualityPreset, "lossless">,
  JpegQualityParams
> = {
  low: { format: "jpg", quality: 30 },
  medium: { format: "jpg", quality: 70 },
  high: { format: "jpg", quality: 95 },
};

export const DEFAULT_WEBP_PRESETS: Record<QualityPreset, WebpQualityParams> = {
  low: { format: "webp", quality: 30, lossless: false },
  medium: { format: "webp", quality: 75, lossless: false },
  high: { format: "webp", quality: 95, lossless: false },
  lossless: { format: "webp", quality: 100, lossless: true },
};

export const DEFAULT_AVIF_PRESETS: Record<
  Exclude<QualityPreset, "lossless">,
  AvifQualityParams
> = {
  low: { format: "avif", quality: 50 },
  medium: { format: "avif", quality: 30 },
  high: { format: "avif", quality: 10 },
};

export const DEFAULT_PNG_PRESETS: Record<QualityPreset, PngQualityParams> = {
  low: { format: "png", compressionLevel: 9 },
  medium: { format: "png", compressionLevel: 6 },
  high: { format: "png", compressionLevel: 3 },
  lossless: { format: "png", compressionLevel: 0 },
};

// ============================================================
// Validation
// ============================================================

const QUALITY_RANGES = {
  jpg: { min: 1, max: 100 },
  jpeg: { min: 1, max: 100 },
  webp: { min: 1, max: 100 },
  avif: { min: 1, max: 63 },
  png: { min: 0, max: 9 },
} as const;

export type QualityFormat = keyof typeof QUALITY_RANGES;

export function validateQualityParams(params: QualityParams): boolean {
  if (params == null || typeof params !== "object") {
    return false;
  }

  switch (params.format) {
    case "jpg":
    case "jpeg": {
      const { quality } = params;
      return (
        Number.isInteger(quality) &&
        quality >= QUALITY_RANGES[params.format].min &&
        quality <= QUALITY_RANGES[params.format].max
      );
    }
    case "webp": {
      const { quality, lossless } = params;
      return (
        typeof lossless === "boolean" &&
        Number.isInteger(quality) &&
        quality >= QUALITY_RANGES.webp.min &&
        quality <= QUALITY_RANGES.webp.max
      );
    }
    case "avif": {
      const { quality } = params;
      return (
        Number.isInteger(quality) &&
        quality >= QUALITY_RANGES.avif.min &&
        quality <= QUALITY_RANGES.avif.max
      );
    }
    case "png": {
      const { compressionLevel } = params;
      return (
        Number.isInteger(compressionLevel) &&
        compressionLevel >= QUALITY_RANGES.png.min &&
        compressionLevel <= QUALITY_RANGES.png.max
      );
    }
    default:
      return false;
  }
}

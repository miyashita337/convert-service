/** Quality preset levels */
export type QualityPreset = "low" | "medium" | "high";

/** Format-specific quality parameter ranges */
export interface QualityRange {
  min: number;
  max: number;
  default: number;
  /** Lower value = better quality for some formats (AVIF, PNG) */
  inverted?: boolean;
}

/** Quality parameters for a specific conversion */
export interface QualityParams {
  preset: QualityPreset;
  /** Raw quality value (format-specific range) */
  value: number;
}

/** A comparison pattern: one quality setting with its result */
export interface ComparePattern {
  preset: QualityPreset;
  quality: number;
  fileSize: number;
  /** Base64 or URL of the preview thumbnail */
  thumbnailUrl: string;
}

/** Plan-based preview pattern limits */
export interface PlanPreviewLimits {
  free: number;
  plus: number;
  pro: number;
}

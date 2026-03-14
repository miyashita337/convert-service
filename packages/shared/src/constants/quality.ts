import type { QualityRange, QualityPreset, PlanPreviewLimits } from "../types/quality";

/** Format-specific quality parameter ranges */
export const QUALITY_RANGES: Record<string, QualityRange> = {
  jpg: { min: 1, max: 100, default: 80 },
  jpeg: { min: 1, max: 100, default: 80 },
  webp: { min: 1, max: 100, default: 80 },
  avif: { min: 1, max: 63, default: 30, inverted: true },
  png: { min: 0, max: 9, default: 6, inverted: true },
};

/** Preset quality values per format (mapped to format-specific ranges) */
export const QUALITY_PRESETS: Record<string, Record<QualityPreset, number>> = {
  jpg: { low: 40, medium: 70, high: 95 },
  jpeg: { low: 40, medium: 70, high: 95 },
  webp: { low: 40, medium: 75, high: 95 },
  avif: { low: 50, medium: 30, high: 15 },
  png: { low: 9, medium: 6, high: 1 },
};

/** Plan-based preview pattern limits */
export const PLAN_PREVIEW_LIMITS: PlanPreviewLimits = {
  free: 2,
  plus: 5,
  pro: Infinity,
};

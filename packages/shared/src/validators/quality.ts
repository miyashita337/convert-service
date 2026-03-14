import { QUALITY_RANGES } from "../constants/quality";

/**
 * Validate a quality value for a given format.
 * Returns the clamped value if out of range.
 */
export function validateQuality(format: string, value: number): { valid: boolean; value: number } {
  const range = QUALITY_RANGES[format.toLowerCase()];
  if (!range) {
    return { valid: false, value: 0 };
  }

  if (!Number.isInteger(value)) {
    return { valid: false, value: range.default };
  }

  if (value < range.min || value > range.max) {
    return { valid: false, value: Math.max(range.min, Math.min(range.max, value)) };
  }

  return { valid: true, value };
}

/**
 * Check if a format supports quality adjustment.
 */
export function supportsQuality(format: string): boolean {
  return format.toLowerCase() in QUALITY_RANGES;
}

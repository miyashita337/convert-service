"use client";

import { useTranslations } from "next-intl";
import { Lock, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PreviewItem } from "@/lib/api-client";
import type { QualityResult } from "@/hooks/use-quality-recommend";

interface QualityPatternGridProps {
  /** Preview items from the API */
  previews: PreviewItem[];
  /** Original file size in bytes */
  originalSize: number;
  /** Currently selected index */
  selectedIndex: number;
  /** Callback when a pattern is clicked */
  onSelect: (index: number) => void;
  /** Whether the user is on a paid plan */
  isPaid: boolean;
  /** User plan: "free" | "pass" | "plus" | "pro" */
  plan: string;
  /** Max patterns accessible to the user (from PLAN_PREVIEW_LIMITS) */
  accessibleCount: number;
  /** SSIM-based recommendations (Pro only) */
  recommendations?: QualityResult[];
  /** Whether recommendations are being computed */
  recommendationComputing?: boolean;
  className?: string;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

const PRESET_LABELS: Record<number, string> = {
  0: "low",
  1: "medium",
  2: "high",
  3: "lossless",
};

/** Map recommendation label to i18n key */
const RECOMMENDATION_KEYS: Record<string, string> = {
  smallest: "recommendSmallest",
  balanced: "recommendBalanced",
  highest: "recommendHighest",
};

export function QualityPatternGrid({
  previews,
  originalSize,
  selectedIndex,
  onSelect,
  isPaid,
  plan,
  accessibleCount,
  recommendations,
  recommendationComputing,
  className,
}: QualityPatternGridProps) {
  const t = useTranslations("preview");
  const isPro = plan === "pro";

  // Build recommendation map: quality → QualityResult
  const recommendationMap = new Map<number, QualityResult>();
  if (recommendations) {
    for (const rec of recommendations) {
      if (rec.label) {
        recommendationMap.set(rec.quality, rec);
      }
    }
  }

  // Find balanced recommendation index for auto-select
  const balancedRec = recommendations?.find((r) => r.label === "balanced");

  return (
    <div className={cn("grid grid-cols-2 sm:grid-cols-4 gap-3", className)}>
      {previews.map((item, index) => {
        const isLocked = !isPaid && index >= accessibleCount;
        const isSelected = index === selectedIndex;
        const presetKey = PRESET_LABELS[index] || `q${item.quality}`;
        const reduction =
          originalSize > 0
            ? Math.round(((originalSize - item.size) / originalSize) * 100)
            : 0;

        // Recommendation for this pattern
        const rec = recommendationMap.get(item.quality);
        const hasRecommendation = !!rec;
        const isBalanced = rec?.label === "balanced";

        return (
          <button
            key={item.quality}
            type="button"
            onClick={() => {
              if (!isLocked) {
                onSelect(index);
              }
            }}
            disabled={isLocked}
            className={cn(
              "relative flex flex-col items-center rounded-lg border p-2 transition-all",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              isSelected && !isLocked
                ? "border-primary ring-2 ring-primary/30 bg-primary/5"
                : "border-border hover:border-muted-foreground/50",
              isLocked && "cursor-not-allowed opacity-60",
            )}
            aria-label={
              isLocked
                ? t("lockedPattern", { preset: t(presetKey) })
                : t("selectPattern", { preset: t(presetKey) })
            }
          >
            {/* Recommendation badge (Pro computed) */}
            {isPro && hasRecommendation && (
              <span
                className={cn(
                  "absolute -top-2.5 left-1/2 -translate-x-1/2 inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[10px] font-semibold whitespace-nowrap",
                  isBalanced
                    ? "bg-gradient-to-r from-amber-100 to-blue-100 text-amber-800 dark:from-amber-900/40 dark:to-blue-900/40 dark:text-amber-200"
                    : "bg-muted text-muted-foreground"
                )}
              >
                {isBalanced && <Zap className="h-3 w-3" />}
                {t(RECOMMENDATION_KEYS[rec.label] || "recommended")}
              </span>
            )}

            {/* Recommendation label visible to all (AC-4: teaser for non-Pro) */}
            {!isPro && hasRecommendation && !isLocked && (
              <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 inline-flex items-center gap-0.5 rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground whitespace-nowrap">
                {t(RECOMMENDATION_KEYS[rec.label] || "recommended")}
              </span>
            )}

            {/* Fallback: static recommended badge when no recommendations computed */}
            {(!recommendations || recommendations.length === 0) && index === 1 && !isLocked && (
              <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 inline-flex items-center gap-0.5 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800 dark:bg-amber-900/40 dark:text-amber-200 whitespace-nowrap">
                {t("recommended")}
              </span>
            )}

            {/* Thumbnail */}
            <div className="relative w-full aspect-square rounded overflow-hidden bg-muted mt-1">
              {isLocked ? (
                <>
                  <img
                    src={item.data}
                    alt=""
                    className="w-full h-full object-cover blur-sm scale-105"
                    draggable={false}
                  />
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 backdrop-blur-[1px]">
                    <Lock className="h-5 w-5 text-white mb-1" />
                    <span className="text-[10px] text-white font-medium text-center px-1">
                      {t("upgradePlus")}
                    </span>
                  </div>
                </>
              ) : (
                <img
                  src={item.data}
                  alt={t("previewAlt", { preset: t(presetKey) })}
                  className="w-full h-full object-cover"
                  draggable={false}
                />
              )}
            </div>

            {/* Label */}
            <span className="mt-1.5 text-xs font-medium capitalize">
              {t(presetKey)}
            </span>

            {/* Size & compression ratio */}
            <span className="text-[11px] text-muted-foreground">
              {formatSize(item.size)}
            </span>
            <span
              className={cn(
                "text-[11px] font-semibold",
                reduction > 0
                  ? "text-green-600 dark:text-green-400"
                  : "text-muted-foreground",
              )}
            >
              {reduction > 0 ? `-${reduction}%` : `+${Math.abs(reduction)}%`}
            </span>

            {/* SSIM reasoning (Pro only — AC-3) */}
            {isPro && hasRecommendation && rec.ssim > 0 && (
              <span className="mt-0.5 text-[10px] text-muted-foreground">
                {t("ssimScore", { score: (rec.ssim * 100).toFixed(1) })}
              </span>
            )}

            {/* Pro teaser for non-Pro users on recommended patterns */}
            {!isPro && hasRecommendation && !isLocked && isBalanced && (
              <span className="mt-0.5 text-[9px] text-primary font-medium">
                {t("proOnlyReasoning")}
              </span>
            )}
          </button>
        );
      })}

      {/* Pro recommendation computing indicator */}
      {recommendationComputing && (
        <div className="col-span-full text-center py-1">
          <span className="text-[11px] text-muted-foreground animate-pulse">
            {t("computingRecommendation")}
          </span>
        </div>
      )}
    </div>
  );
}

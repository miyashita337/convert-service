"use client";

import { useTranslations } from "next-intl";
import { Lock, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PreviewItem } from "@/lib/api-client";

/** Index of the recommended pattern (medium quality is generally best balance) */
const RECOMMENDED_INDEX = 1;

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
  /** Max patterns accessible to the user (from PLAN_PREVIEW_LIMITS) */
  accessibleCount: number;
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

export function QualityPatternGrid({
  previews,
  originalSize,
  selectedIndex,
  onSelect,
  isPaid,
  accessibleCount,
  className,
}: QualityPatternGridProps) {
  const t = useTranslations("preview");

  return (
    <div className={cn("grid grid-cols-2 sm:grid-cols-4 gap-3", className)}>
      {previews.map((item, index) => {
        const isLocked = !isPaid && index >= accessibleCount;
        const isSelected = index === selectedIndex;
        const isRecommended = index === RECOMMENDED_INDEX;
        const reduction =
          originalSize > 0
            ? Math.round(((originalSize - item.size) / originalSize) * 100)
            : 0;
        const presetKey = PRESET_LABELS[index] || `q${item.quality}`;

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
            {/* Recommended badge */}
            {isRecommended && (
              <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 inline-flex items-center gap-0.5 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800 dark:bg-amber-900/40 dark:text-amber-200 whitespace-nowrap">
                <Star className="h-3 w-3" />
                {t("recommended")}
              </span>
            )}

            {/* Thumbnail */}
            <div className="relative w-full aspect-square rounded overflow-hidden bg-muted mt-1">
              {isLocked ? (
                <>
                  {/* Blurred thumbnail for locked patterns */}
                  <img
                    src={item.data}
                    alt=""
                    className="w-full h-full object-cover blur-sm scale-105"
                    draggable={false}
                  />
                  {/* Lock overlay */}
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
          </button>
        );
      })}
    </div>
  );
}

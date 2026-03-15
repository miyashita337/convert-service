"use client";

import { useState, useCallback } from "react";

interface QualityResult {
  preset: string;
  quality: number;
  fileSize: number;
  ssim: number;
  label: "smallest" | "balanced" | "highest" | "";
}

/**
 * Hook to compute quality recommendations using a Web Worker.
 * Compares multiple quality presets against the original image
 * and labels them as "smallest file", "balanced", or "highest quality".
 */
export function useQualityRecommend() {
  const [results, setResults] = useState<QualityResult[]>([]);
  const [computing, setComputing] = useState(false);

  const computeRecommendations = useCallback(
    (
      originalImageData: ImageData,
      previewResults: Array<{
        preset: string;
        quality: number;
        fileSize: number;
        imageData: ImageData;
      }>
    ) => {
      setComputing(true);
      setResults([]);

      const collected: QualityResult[] = [];
      let completed = 0;

      for (const preview of previewResults) {
        const worker = new Worker(
          new URL("../lib/quality-recommend.worker.ts", import.meta.url),
          { type: "module" }
        );

        worker.onmessage = (e) => {
          collected.push(e.data);
          completed++;
          worker.terminate();

          if (completed === previewResults.length) {
            // Label results
            const labeled = labelResults(collected);
            setResults(labeled);
            setComputing(false);
          }
        };

        worker.postMessage({
          type: "compare",
          original: originalImageData,
          converted: preview.imageData,
          preset: preview.preset,
          quality: preview.quality,
          fileSize: preview.fileSize,
        });
      }
    },
    []
  );

  return { results, computing, computeRecommendations };
}

function labelResults(results: QualityResult[]): QualityResult[] {
  if (results.length === 0) return results;

  const sorted = [...results].sort((a, b) => a.fileSize - b.fileSize);

  // Smallest file size
  sorted[0].label = "smallest";

  // Highest SSIM (best quality)
  const byQuality = [...results].sort((a, b) => b.ssim - a.ssim);
  const highest = byQuality[0];
  const highestInSorted = sorted.find((r) => r.preset === highest.preset);
  if (highestInSorted && highestInSorted.label !== "smallest") {
    highestInSorted.label = "highest";
  }

  // Balanced: best SSIM-per-byte ratio
  const withRatio = results.map((r) => ({
    ...r,
    ratio: r.ssim / (r.fileSize || 1),
  }));
  withRatio.sort((a, b) => b.ratio - a.ratio);
  const balanced = sorted.find((r) => r.preset === withRatio[0].preset);
  if (balanced && !balanced.label) {
    balanced.label = "balanced";
  }

  return sorted;
}

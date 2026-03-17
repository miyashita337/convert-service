"use client";

import { useState, useCallback, useRef, useEffect } from "react";

export interface QualityResult {
  preset: string;
  quality: number;
  fileSize: number;
  ssim: number;
  label: "smallest" | "balanced" | "highest" | "";
}

/** Format-specific SSIM thresholds for "acceptable quality" */
const FORMAT_THRESHOLDS: Record<string, number> = {
  avif: 0.92,
  webp: 0.93,
  jpg: 0.95,
  jpeg: 0.95,
  png: 0.99,
};

/** Per-preview timeout in ms */
const PREVIEW_TIMEOUT_MS = 1500;

/**
 * Hook to compute quality recommendations using a Web Worker.
 * Compares multiple quality presets against the original image
 * and labels them as "smallest", "balanced", or "highest".
 *
 * Falls back to compression ratio heuristic if Worker fails.
 */
export function useQualityRecommend() {
  const [results, setResults] = useState<QualityResult[]>([]);
  const [computing, setComputing] = useState(false);
  const workerRef = useRef<Worker | null>(null);

  // Cleanup worker on unmount
  useEffect(() => {
    return () => {
      workerRef.current?.terminate();
      workerRef.current = null;
    };
  }, []);

  const computeRecommendations = useCallback(
    (
      originalImageData: ImageData,
      previewResults: Array<{
        preset: string;
        quality: number;
        fileSize: number;
        imageData: ImageData;
      }>,
      outputFormat: string
    ) => {
      setComputing(true);
      setResults([]);

      // Try Web Worker first, fallback to heuristic
      try {
        if (typeof Worker === "undefined") {
          throw new Error("Web Workers not supported");
        }

        const worker = new Worker(
          new URL("../lib/quality-recommend.worker.ts", import.meta.url),
          { type: "module" }
        );
        workerRef.current = worker;

        const collected: QualityResult[] = [];
        let index = 0;

        const processNext = () => {
          if (index >= previewResults.length) {
            const labeled = labelResults(collected, outputFormat);
            setResults(labeled);
            setComputing(false);
            worker.terminate();
            workerRef.current = null;
            return;
          }

          const preview = previewResults[index++];

          // Timeout per preview
          const timeoutId = setTimeout(() => {
            collected.push({
              preset: preview.preset,
              quality: preview.quality,
              fileSize: preview.fileSize,
              ssim: 0.95, // fallback estimate
              label: "",
            });
            processNext();
          }, PREVIEW_TIMEOUT_MS);

          worker.onmessage = (e) => {
            clearTimeout(timeoutId);
            collected.push(e.data);
            processNext();
          };

          worker.onerror = () => {
            clearTimeout(timeoutId);
            collected.push({
              preset: preview.preset,
              quality: preview.quality,
              fileSize: preview.fileSize,
              ssim: 0.95,
              label: "",
            });
            processNext();
          };

          worker.postMessage({
            type: "compare",
            original: originalImageData,
            converted: preview.imageData,
            preset: preview.preset,
            quality: preview.quality,
            fileSize: preview.fileSize,
          });
        };

        processNext();
      } catch {
        // Tier 2: Fallback to heuristic (no SSIM)
        const heuristic = heuristicRecommend(previewResults, outputFormat);
        setResults(heuristic);
        setComputing(false);
      }
    },
    []
  );

  return { results, computing, computeRecommendations };
}

/** Label results using SSIM + file size with format-specific thresholds */
function labelResults(
  results: QualityResult[],
  outputFormat: string
): QualityResult[] {
  if (results.length === 0) return results;

  const labeled = results.map((r) => ({ ...r, label: "" as QualityResult["label"] }));

  // 1. Smallest file size
  const bySize = [...labeled].sort((a, b) => a.fileSize - b.fileSize);
  bySize[0].label = "smallest";

  // 2. Highest SSIM
  const byQuality = [...labeled].sort((a, b) => b.ssim - a.ssim);
  const threshold = FORMAT_THRESHOLDS[outputFormat] ?? 0.94;
  if (byQuality[0].ssim >= threshold && byQuality[0].label !== "smallest") {
    byQuality[0].label = "highest";
  }

  // 3. Balanced: best file size among "acceptable" SSIM (within 5% of max)
  const ssimMax = Math.max(...labeled.map((r) => r.ssim));
  const acceptable = labeled.filter(
    (r) => r.ssim >= ssimMax * 0.95 && !r.label
  );
  if (acceptable.length > 0) {
    const balanced = acceptable.sort((a, b) => a.fileSize - b.fileSize)[0];
    balanced.label = "balanced";
  }

  return labeled;
}

/** Fallback: recommend based on compression ratio only */
function heuristicRecommend(
  previewResults: Array<{
    preset: string;
    quality: number;
    fileSize: number;
  }>,
  outputFormat: string
): QualityResult[] {
  const sorted = [...previewResults].sort(
    (a, b) => a.fileSize - b.fileSize
  );

  return sorted.map((p, i) => ({
    preset: p.preset,
    quality: p.quality,
    fileSize: p.fileSize,
    ssim: 0.95 - i * 0.02, // estimated
    label:
      i === 0
        ? "smallest"
        : i === sorted.length - 1
          ? "highest"
          : i === 1
            ? "balanced"
            : "",
  }));
}

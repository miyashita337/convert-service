"use client";

import { useState, useCallback, useRef } from "react";
import {
  uploadFile,
  requestConversion,
  requestPreview,
  checkStatus,
  getDownloadUrl,
} from "@/lib/api-client";
import type { RateLimitInfo, PreviewItem } from "@/lib/api-client";
import { POLLING_INTERVAL_MS } from "@quickconv/shared";
import type { ImageFormat } from "@quickconv/shared";
import { useGAEvent } from "./use-ga-event";
import { useQualityRecommend, type QualityResult } from "./use-quality-recommend";
import { decodeBase64ToImageData, decodeFileToImageData } from "@/lib/decode-image";

type Step =
  | "idle"
  | "uploading"
  | "converting"
  | "completed"
  | "failed"
  | "previewing"
  | "preview-ready";

interface ConversionState {
  step: Step;
  uploadProgress: number;
  jobId: string | null;
  downloadUrl: string | null;
  error: string | null;
}

interface PreviewState {
  previews: PreviewItem[];
  selectedIndex: number;
  originalSize: number;
}

export function useConversion() {
  const { results: recommendations, computing: recommendationComputing, computeRecommendations } = useQualityRecommend();

  const [state, setState] = useState<ConversionState>({
    step: "idle",
    uploadProgress: 0,
    jobId: null,
    downloadUrl: null,
    error: null,
  });
  const [previewState, setPreviewState] = useState<PreviewState>({
    previews: [],
    selectedIndex: 0,
    originalSize: 0,
  });
  const [remainingConversions, setRemainingConversions] = useState<number | null>(null);
  const [dailyLimit, setDailyLimit] = useState<number | null>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);
  const formatsRef = useRef<{ from: string; to: string }>({ from: "", to: "" });
  const fileRef = useRef<File | null>(null);
  const outputFormatRef = useRef<ImageFormat | null>(null);
  const {
    trackFileUpload,
    trackConversionStart,
    trackConversionComplete,
    trackConversionError,
    trackPreviewStart,
    trackPreviewSelectQuality,
  } = useGAEvent();

  const handleRateLimitUpdate = useCallback((info: RateLimitInfo) => {
    setRemainingConversions(info.remaining);
    setDailyLimit(info.limit);
  }, []);

  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }, []);

  /** Start preview: fetch quality pattern previews from the API */
  const startPreview = useCallback(
    async (file: File, outputFormat: ImageFormat, plan: string) => {
      setState({
        step: "previewing",
        uploadProgress: 0,
        jobId: null,
        downloadUrl: null,
        error: null,
      });

      const inputFormat = file.name.split(".").pop()?.toLowerCase() || "unknown";
      formatsRef.current = { from: inputFormat, to: outputFormat };
      fileRef.current = file;
      outputFormatRef.current = outputFormat;

      trackPreviewStart(inputFormat, outputFormat);

      try {
        // Default quality values for low, medium, high, lossless
        const qualities = [30, 70, 95, 100];

        const result = await requestPreview(file, outputFormat, qualities, plan);

        setPreviewState({
          previews: result.previews,
          selectedIndex: 1, // default to medium
          originalSize: file.size,
        });

        setState((s) => ({ ...s, step: "preview-ready" }));

        // Compute SSIM-based recommendations for Pro users
        if (plan === "pro" && result.previews.length > 0) {
          try {
            const originalImageData = await decodeFileToImageData(file, 1024);
            const previewsWithImageData = await Promise.all(
              result.previews.map(async (p, i) => ({
                preset: ["low", "medium", "high", "lossless"][i] || `q${p.quality}`,
                quality: p.quality,
                fileSize: p.size,
                imageData: await decodeBase64ToImageData(p.data, 1024),
              }))
            );
            computeRecommendations(originalImageData, previewsWithImageData, outputFormat);
          } catch (err) {
            console.warn("SSIM computation failed:", err);
          }
        }
      } catch (error) {
        setState((s) => ({
          ...s,
          step: "failed",
          error: (error as Error).message,
        }));
      }
    },
    [trackPreviewStart, computeRecommendations],
  );

  /** Select a quality pattern from the preview grid */
  const selectPreviewPattern = useCallback(
    (index: number) => {
      const inputFormat = formatsRef.current.from;
      const outputFormat = formatsRef.current.to;
      const quality = previewState.previews[index]?.quality;

      if (quality !== undefined) {
        trackPreviewSelectQuality(inputFormat, outputFormat, quality);
      }

      setPreviewState((s) => ({ ...s, selectedIndex: index }));
    },
    [previewState.previews, trackPreviewSelectQuality],
  );

  /** Exit preview mode and go back to idle */
  const cancelPreview = useCallback(() => {
    setState({
      step: "idle",
      uploadProgress: 0,
      jobId: null,
      downloadUrl: null,
      error: null,
    });
    setPreviewState({ previews: [], selectedIndex: 0, originalSize: 0 });
  }, []);

  const startConversion = useCallback(
    async (file: File, outputFormat: ImageFormat) => {
      setState({ step: "uploading", uploadProgress: 0, jobId: null, downloadUrl: null, error: null });

      const inputFormat = file.name.split(".").pop()?.toLowerCase() || "unknown";
      formatsRef.current = { from: inputFormat, to: outputFormat };

      try {
        // Step 1: Upload
        const uploaded = await uploadFile(
          file,
          (progress) => {
            setState((s) => ({ ...s, uploadProgress: progress }));
          },
          handleRateLimitUpdate,
        );

        trackFileUpload(inputFormat, Math.round(file.size / 1024), 1);

        // Step 2: Request conversion
        setState((s) => ({ ...s, step: "converting", uploadProgress: 100 }));
        startTimeRef.current = Date.now();
        trackConversionStart(inputFormat, outputFormat);

        const { jobId } = await requestConversion(
          uploaded.fileId,
          outputFormat,
          handleRateLimitUpdate,
        );
        setState((s) => ({ ...s, jobId }));

        // Step 3: Poll for status
        pollingRef.current = setInterval(async () => {
          try {
            const status = await checkStatus(jobId);

            if (status.status === "completed") {
              stopPolling();
              const durationMs = Date.now() - startTimeRef.current;
              trackConversionComplete(inputFormat, outputFormat, durationMs);
              setState((s) => ({
                ...s,
                step: "completed",
                downloadUrl: getDownloadUrl(jobId),
              }));
            } else if (status.status === "failed") {
              stopPolling();
              const errorType = status.error || "unknown";
              trackConversionError(inputFormat, outputFormat, errorType);
              setState((s) => ({
                ...s,
                step: "failed",
                error: status.error || "Conversion failed",
              }));
            }
          } catch {
            stopPolling();
            trackConversionError(inputFormat, outputFormat, "connection_lost");
            setState((s) => ({ ...s, step: "failed", error: "Lost connection" }));
          }
        }, POLLING_INTERVAL_MS);
      } catch (error) {
        stopPolling();
        const errorType = (error as Error).message || "unknown";
        trackConversionError(inputFormat, outputFormat, errorType);
        setState((s) => ({
          ...s,
          step: "failed",
          error: (error as Error).message,
        }));
      }
    },
    [stopPolling, handleRateLimitUpdate, trackFileUpload, trackConversionStart, trackConversionComplete, trackConversionError]
  );

  /** Convert with the selected quality from preview */
  const convertWithSelectedQuality = useCallback(() => {
    const file = fileRef.current;
    const outputFormat = outputFormatRef.current;
    if (!file || !outputFormat) return;

    // Clear preview state and start normal conversion
    setPreviewState({ previews: [], selectedIndex: 0, originalSize: 0 });
    startConversion(file, outputFormat);
  }, [startConversion]);

  const reset = useCallback(() => {
    stopPolling();
    setState({ step: "idle", uploadProgress: 0, jobId: null, downloadUrl: null, error: null });
    setPreviewState({ previews: [], selectedIndex: 0, originalSize: 0 });
    fileRef.current = null;
    outputFormatRef.current = null;
  }, [stopPolling]);

  return {
    ...state,
    startConversion,
    startPreview,
    selectPreviewPattern,
    cancelPreview,
    convertWithSelectedQuality,
    reset,
    inputFormat: formatsRef.current.from,
    outputFormat: formatsRef.current.to,
    remainingConversions,
    dailyLimit,
    previews: previewState.previews,
    selectedPreviewIndex: previewState.selectedIndex,
    originalSize: previewState.originalSize,
    recommendations,
    recommendationComputing,
  };
}

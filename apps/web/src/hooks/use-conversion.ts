"use client";

import { useState, useCallback, useRef } from "react";
import { uploadFile, requestConversion, checkStatus, getDownloadUrl } from "@/lib/api-client";
import { POLLING_INTERVAL_MS } from "@quickconv/shared";
import type { ImageFormat } from "@quickconv/shared";
import { useGAEvent } from "./use-ga-event";

type Step = "idle" | "uploading" | "converting" | "completed" | "failed";

interface ConversionState {
  step: Step;
  uploadProgress: number;
  jobId: string | null;
  downloadUrl: string | null;
  error: string | null;
}

export function useConversion() {
  const [state, setState] = useState<ConversionState>({
    step: "idle",
    uploadProgress: 0,
    jobId: null,
    downloadUrl: null,
    error: null,
  });
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);
  const formatsRef = useRef<{ from: string; to: string }>({ from: "", to: "" });
  const { trackFileUpload, trackConversionStart, trackConversionComplete, trackConversionError } = useGAEvent();

  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }, []);

  const startConversion = useCallback(
    async (file: File, outputFormat: ImageFormat) => {
      setState({ step: "uploading", uploadProgress: 0, jobId: null, downloadUrl: null, error: null });

      const inputFormat = file.name.split(".").pop()?.toLowerCase() || "unknown";
      formatsRef.current = { from: inputFormat, to: outputFormat };

      try {
        // Step 1: Upload
        const uploaded = await uploadFile(file, (progress) => {
          setState((s) => ({ ...s, uploadProgress: progress }));
        });

        trackFileUpload(inputFormat, Math.round(file.size / 1024), 1);

        // Step 2: Request conversion
        setState((s) => ({ ...s, step: "converting", uploadProgress: 100 }));
        startTimeRef.current = Date.now();
        trackConversionStart(inputFormat, outputFormat);

        const { jobId } = await requestConversion(uploaded.fileId, outputFormat);
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
    [stopPolling, trackFileUpload, trackConversionStart, trackConversionComplete, trackConversionError]
  );

  const reset = useCallback(() => {
    stopPolling();
    setState({ step: "idle", uploadProgress: 0, jobId: null, downloadUrl: null, error: null });
  }, [stopPolling]);

  return { ...state, startConversion, reset, inputFormat: formatsRef.current.from, outputFormat: formatsRef.current.to };
}

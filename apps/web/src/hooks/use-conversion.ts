"use client";

import { useState, useCallback, useRef } from "react";
import { uploadFile, requestConversion, checkStatus, getDownloadUrl } from "@/lib/api-client";
import { POLLING_INTERVAL_MS } from "@quickconv/shared";
import type { ImageFormat } from "@quickconv/shared";

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

  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }, []);

  const startConversion = useCallback(
    async (file: File, outputFormat: ImageFormat) => {
      setState({ step: "uploading", uploadProgress: 0, jobId: null, downloadUrl: null, error: null });

      try {
        // Step 1: Upload
        const uploaded = await uploadFile(file, (progress) => {
          setState((s) => ({ ...s, uploadProgress: progress }));
        });

        // Step 2: Request conversion
        setState((s) => ({ ...s, step: "converting", uploadProgress: 100 }));
        const { jobId } = await requestConversion(uploaded.fileId, outputFormat);
        setState((s) => ({ ...s, jobId }));

        // Step 3: Poll for status
        pollingRef.current = setInterval(async () => {
          try {
            const status = await checkStatus(jobId);

            if (status.status === "completed") {
              stopPolling();
              setState((s) => ({
                ...s,
                step: "completed",
                downloadUrl: getDownloadUrl(jobId),
              }));
            } else if (status.status === "failed") {
              stopPolling();
              setState((s) => ({
                ...s,
                step: "failed",
                error: status.error || "Conversion failed",
              }));
            }
          } catch {
            stopPolling();
            setState((s) => ({ ...s, step: "failed", error: "Lost connection" }));
          }
        }, POLLING_INTERVAL_MS);
      } catch (error) {
        stopPolling();
        setState((s) => ({
          ...s,
          step: "failed",
          error: (error as Error).message,
        }));
      }
    },
    [stopPolling]
  );

  const reset = useCallback(() => {
    stopPolling();
    setState({ step: "idle", uploadProgress: 0, jobId: null, downloadUrl: null, error: null });
  }, [stopPolling]);

  return { ...state, startConversion, reset };
}

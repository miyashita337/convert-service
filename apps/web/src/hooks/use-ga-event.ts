"use client";

import { useCallback } from "react";

type GAEventParams = Record<string, string | number | boolean>;

function hasConsent(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem("qc_cookie_consent") === "accepted";
  } catch {
    return false;
  }
}

function sendEvent(eventName: string, params?: GAEventParams): void {
  if (typeof window === "undefined") return;
  if (typeof window.gtag !== "function") return;
  if (!hasConsent()) return;

  window.gtag("event", eventName, params);
}

export function useGAEvent() {
  const trackFileUpload = useCallback(
    (fileType: string, sizeKb: number, count: number) => {
      sendEvent("file_upload", {
        format: fileType,
        size_kb: sizeKb,
        count,
      });
    },
    []
  );

  const trackConversionStart = useCallback(
    (from: string, to: string) => {
      sendEvent("conversion_start", { from, to });
    },
    []
  );

  const trackConversionComplete = useCallback(
    (from: string, to: string, durationMs: number) => {
      sendEvent("conversion_complete", { from, to, duration_ms: durationMs });
    },
    []
  );

  const trackConversionError = useCallback(
    (from: string, to: string, errorType: string) => {
      sendEvent("conversion_error", { from, to, error_type: errorType });
    },
    []
  );

  const trackFileDownload = useCallback(
    (from: string, to: string) => {
      sendEvent("file_download", { from, to });
    },
    []
  );

  const trackShare = useCallback(
    (method: string, from: string, to: string) => {
      sendEvent("share", {
        method,
        content_type: "conversion_result",
        from,
        to,
      });
    },
    []
  );

  return {
    trackFileUpload,
    trackConversionStart,
    trackConversionComplete,
    trackConversionError,
    trackFileDownload,
    trackShare,
  };
}

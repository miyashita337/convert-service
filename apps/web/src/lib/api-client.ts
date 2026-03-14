import type { UploadResponse, ConvertResponse, StatusResponse } from "@quickconv/shared";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8787";

/** Rate limit info extracted from API response headers */
export interface RateLimitInfo {
  remaining: number;
  limit: number;
}

/** Extract X-RateLimit-* headers from fetch Response */
function extractRateLimitFromFetch(res: Response): RateLimitInfo | null {
  const remaining = res.headers.get("X-RateLimit-Remaining");
  const limit = res.headers.get("X-RateLimit-Limit");
  if (remaining !== null && limit !== null) {
    return { remaining: Number(remaining), limit: Number(limit) };
  }
  return null;
}

export async function uploadFile(
  file: File,
  onProgress?: (progress: number) => void,
  onRateLimit?: (info: RateLimitInfo) => void,
): Promise<UploadResponse> {
  const formData = new FormData();
  formData.append("file", file);

  // Use XMLHttpRequest for progress tracking
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${API_URL}/api/upload`);

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        // Extract rate limit info from response headers
        const remaining = xhr.getResponseHeader("X-RateLimit-Remaining");
        const limit = xhr.getResponseHeader("X-RateLimit-Limit");
        if (remaining !== null && limit !== null && onRateLimit) {
          onRateLimit({ remaining: Number(remaining), limit: Number(limit) });
        }
        resolve(JSON.parse(xhr.responseText));
      } else {
        reject(new Error(JSON.parse(xhr.responseText).message || "Upload failed"));
      }
    };

    xhr.onerror = () => reject(new Error("Network error"));
    xhr.send(formData);
  });
}

export async function requestConversion(
  fileId: string,
  outputFormat: string,
  onRateLimit?: (info: RateLimitInfo) => void,
): Promise<ConvertResponse> {
  const res = await fetch(`${API_URL}/api/convert`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fileId, outputFormat }),
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || "Conversion request failed");
  }

  const data = await res.json();

  // Extract rate limit from headers first, fall back to response body
  if (onRateLimit) {
    const headerRateLimit = extractRateLimitFromFetch(res);
    if (headerRateLimit) {
      onRateLimit(headerRateLimit);
    } else if (data.remainingConversions !== undefined && data.dailyLimit !== undefined) {
      onRateLimit({ remaining: data.remainingConversions, limit: data.dailyLimit });
    }
  }

  return data;
}

export async function checkStatus(jobId: string): Promise<StatusResponse> {
  const res = await fetch(`${API_URL}/api/status/${jobId}`);

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || "Status check failed");
  }

  return res.json();
}

export function getDownloadUrl(jobId: string): string {
  return `${API_URL}/api/download/${jobId}`;
}

/** Preview item returned from the preview endpoint */
export interface PreviewItem {
  quality: number;
  size: number;
  compressionRatio: number;
  data: string; // base64 data URL
}

export interface PreviewResponse {
  previews: PreviewItem[];
  requestedCount: number;
  returnedCount: number;
  plan: string;
}

export async function requestPreview(
  file: File,
  outputFormat: string,
  qualities: number[],
  plan: string,
): Promise<PreviewResponse> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("outputFormat", outputFormat);
  formData.append("qualities", JSON.stringify(qualities));
  formData.append("plan", plan);

  const res = await fetch(`${API_URL}/api/preview`, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || "Preview request failed");
  }

  return res.json();
}

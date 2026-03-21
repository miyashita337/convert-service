/**
 * Large file upload helper with progress tracking.
 *
 * Uses Workers-proxied streaming upload (Option A):
 * 1. POST /api/upload/presign — validate and get upload URL + fileId
 * 2. PUT  /api/upload/presign/:fileId — stream file body to R2 via Workers
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8787";

/** Upload timeout: 5 minutes */
const UPLOAD_TIMEOUT_MS = 5 * 60 * 1000;

export interface UploadProgressOptions {
  /** Called with upload progress percentage (0-100) */
  onProgress?: (percent: number) => void;
  /** AbortSignal to cancel the upload */
  signal?: AbortSignal;
}

export interface UploadResult {
  fileId: string;
  key: string;
  fileSize: number;
  mimeType: string;
  format: string;
}

export interface PresignResponse {
  uploadUrl: string;
  fileId: string;
  key: string;
  maxSizeBytes: number;
  expiresIn: number;
}

/**
 * Upload a file with progress tracking via XHR.
 *
 * For small files (< 10MB), falls back to direct /api/upload.
 * For large files, uses the presign + PUT streaming flow.
 */
export async function uploadWithProgress(
  file: File,
  options: UploadProgressOptions = {},
): Promise<UploadResult> {
  const { onProgress, signal } = options;

  // Step 1: Request presigned upload URL
  const presignRes = await fetch(`${API_URL}/api/upload/presign`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      filename: file.name,
      size: file.size,
      contentType: file.type,
    }),
    signal,
  });

  if (!presignRes.ok) {
    const error = await presignRes.json().catch(() => ({ message: "Presign request failed" }));
    throw new UploadError(
      (error as { message?: string }).message || "Presign request failed",
      presignRes.status,
    );
  }

  const presign: PresignResponse = await presignRes.json();

  // Step 2: Stream file body to the upload URL via XHR (for progress tracking)
  return new Promise<UploadResult>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const uploadUrl = `${API_URL}${presign.uploadUrl}`;

    xhr.open("PUT", uploadUrl);
    xhr.setRequestHeader("Content-Type", file.type);
    xhr.setRequestHeader("Content-Length", String(file.size));

    // Progress tracking
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    };

    // Timeout
    xhr.timeout = UPLOAD_TIMEOUT_MS;
    xhr.ontimeout = () => {
      reject(new UploadError("Upload timed out", 408));
    };

    // Success
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const result = JSON.parse(xhr.responseText);
          resolve({
            fileId: result.fileId,
            key: result.key,
            fileSize: result.fileSize,
            mimeType: result.mimeType,
            format: result.format,
          });
        } catch {
          reject(new UploadError("Invalid response from server", 500));
        }
      } else {
        let message = "Upload failed";
        try {
          const err = JSON.parse(xhr.responseText);
          message = err.message || message;
        } catch {
          // ignore parse error
        }
        reject(new UploadError(message, xhr.status));
      }
    };

    // Network error
    xhr.onerror = () => {
      reject(new UploadError("Network error during upload", 0));
    };

    // Abort support
    if (signal) {
      signal.addEventListener("abort", () => {
        xhr.abort();
        reject(new UploadError("Upload aborted", 0));
      });
    }

    xhr.send(file);
  });
}

/**
 * Custom error class for upload failures.
 */
export class UploadError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
  ) {
    super(message);
    this.name = "UploadError";
  }
}

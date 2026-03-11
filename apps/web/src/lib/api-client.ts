import type { UploadResponse, ConvertResponse, StatusResponse } from "@quickconv/shared";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8787";

export async function uploadFile(
  file: File,
  onProgress?: (progress: number) => void
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
  outputFormat: string
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

  return res.json();
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

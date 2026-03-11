import type { ImageFormat, JobStatus } from "./conversion";

export interface UploadResponse {
  fileId: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
}

export interface ConvertRequest {
  fileId: string;
  outputFormat: ImageFormat;
}

export interface ConvertResponse {
  jobId: string;
  status: JobStatus;
}

export interface StatusResponse {
  jobId: string;
  status: JobStatus;
  progress?: number;
  downloadUrl?: string;
  error?: string;
}

export interface ErrorResponse {
  error: string;
  message: string;
}

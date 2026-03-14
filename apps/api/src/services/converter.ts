interface ConvertPayload {
  jobId: string;
  inputKey: string;
  inputFormat: string;
  outputFormat: string;
}

interface ConvertDirectPayload {
  jobId: string;
  fileBody: ArrayBuffer;
  fileName: string;
  outputFormat: string;
}

interface PreviewPayload {
  fileBody: ArrayBuffer;
  fileName: string;
  outputFormat: string;
  qualities: number[];
}

export interface PreviewItem {
  quality: number;
  size: number;
  compressionRatio: number;
  data: string;
}

export interface PreviewConversionResult {
  success: boolean;
  previews?: PreviewItem[];
  error?: string;
}

export async function requestConversion(
  converterUrl: string,
  apiKey: string,
  payload: ConvertPayload
): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch(`${converterUrl}/convert`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      return { success: false, error: `Converter returned ${response.status}: ${errorBody}` };
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: `Failed to reach converter: ${(error as Error).message}` };
  }
}

export async function requestDirectConversion(
  converterUrl: string,
  apiKey: string,
  payload: ConvertDirectPayload
): Promise<{ success: boolean; outputBuffer?: ArrayBuffer; fileSize?: number; error?: string }> {
  try {
    const formData = new FormData();
    formData.append("file", new Blob([payload.fileBody]), payload.fileName);
    formData.append("outputFormat", payload.outputFormat);
    formData.append("jobId", payload.jobId);

    const response = await fetch(`${converterUrl}/convert/direct`, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      body: formData,
    });

    if (!response.ok) {
      const errorBody = await response.text();
      return { success: false, error: `Converter returned ${response.status}: ${errorBody}` };
    }

    const outputBuffer = await response.arrayBuffer();
    const fileSize = parseInt(response.headers.get("X-File-Size") || "0", 10);
    return { success: true, outputBuffer, fileSize };
  } catch (error) {
    return { success: false, error: `Failed to reach converter: ${(error as Error).message}` };
  }
}

export async function requestPreviewConversion(
  converterUrl: string,
  apiKey: string,
  payload: PreviewPayload,
): Promise<PreviewConversionResult> {
  try {
    const formData = new FormData();
    formData.append("file", new Blob([payload.fileBody]), payload.fileName);
    formData.append("outputFormat", payload.outputFormat);
    formData.append("qualities", JSON.stringify(payload.qualities));

    const response = await fetch(`${converterUrl}/convert/preview`, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      body: formData,
    });

    if (!response.ok) {
      const errorBody = await response.text();
      return { success: false, error: `Converter returned ${response.status}: ${errorBody}` };
    }

    const data = await response.json<{ previews: PreviewItem[] }>();
    return { success: true, previews: data.previews };
  } catch (error) {
    return { success: false, error: `Failed to reach converter: ${(error as Error).message}` };
  }
}

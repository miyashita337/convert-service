import { Hono } from "hono";
import type { Env, AppVariables } from "../types/env";

interface ResizeResult {
  success: boolean;
  outputBuffer?: ArrayBuffer;
  fileSize?: number;
  width?: number;
  height?: number;
  error?: string;
}

async function requestResize(
  converterUrl: string,
  apiKey: string,
  payload: {
    fileBody: ArrayBuffer;
    fileName: string;
    width?: number;
    height?: number;
    fit?: string;
    quality?: number;
    maxFileSize?: number;
  },
): Promise<ResizeResult> {
  try {
    const formData = new FormData();
    formData.append("file", new Blob([payload.fileBody]), payload.fileName);
    if (payload.width) formData.append("width", String(payload.width));
    if (payload.height) formData.append("height", String(payload.height));
    if (payload.fit) formData.append("fit", payload.fit);
    if (payload.quality) formData.append("quality", String(payload.quality));
    if (payload.maxFileSize) formData.append("maxFileSize", String(payload.maxFileSize));

    const response = await fetch(`${converterUrl}/resize`, {
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
    const width = parseInt(response.headers.get("X-Image-Width") || "0", 10);
    const height = parseInt(response.headers.get("X-Image-Height") || "0", 10);
    return { success: true, outputBuffer, fileSize, width, height };
  } catch (error) {
    return { success: false, error: `Failed to reach converter: ${(error as Error).message}` };
  }
}

const resize = new Hono<{ Bindings: Env; Variables: AppVariables }>();

resize.post("/", async (c) => {
  const body = await c.req.parseBody();
  const file = body["file"];
  const widthRaw = body["width"] as string | undefined;
  const heightRaw = body["height"] as string | undefined;
  const fit = body["fit"] as string | undefined;
  const qualityRaw = body["quality"] as string | undefined;
  const maxFileSizeRaw = body["maxFileSize"] as string | undefined;

  // --- Validation ---
  if (!file || !(file instanceof File)) {
    return c.json({ error: "validation", message: "No file provided" }, 400);
  }

  const width = widthRaw ? parseInt(widthRaw, 10) : undefined;
  const height = heightRaw ? parseInt(heightRaw, 10) : undefined;
  const quality = qualityRaw ? parseInt(qualityRaw, 10) : undefined;
  const maxFileSize = maxFileSizeRaw ? parseInt(maxFileSizeRaw, 10) : undefined;

  if (width !== undefined && (isNaN(width) || width <= 0)) {
    return c.json({ error: "validation", message: "width must be a positive integer" }, 400);
  }
  if (height !== undefined && (isNaN(height) || height <= 0)) {
    return c.json({ error: "validation", message: "height must be a positive integer" }, 400);
  }
  if (!width && !height && !quality && !maxFileSize) {
    return c.json(
      { error: "validation", message: "At least one of width, height, quality, or maxFileSize is required" },
      400,
    );
  }

  // --- Forward to Converter ---
  const fileBody = await file.arrayBuffer();

  const result = await requestResize(
    c.env.CONVERTER_URL,
    c.env.CONVERTER_API_KEY || "test-key",
    {
      fileBody,
      fileName: file.name,
      width,
      height,
      fit,
      quality,
      maxFileSize,
    },
  );

  if (!result.success || !result.outputBuffer) {
    return c.json({ error: "converter", message: result.error }, 500);
  }

  return new Response(result.outputBuffer, {
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Disposition": `attachment; filename="resized-${file.name}"`,
      "X-File-Size": String(result.fileSize),
      "X-Image-Width": String(result.width),
      "X-Image-Height": String(result.height),
    },
  });
});

export default resize;

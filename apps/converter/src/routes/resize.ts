import { Hono } from "hono";
import { resizeImage } from "../services/resize";
import type { ResizeFit } from "../services/resize";
import { captureException, checkMemoryUsage } from "../lib/sentry";

const VALID_FITS: readonly string[] = [
  "contain",
  "cover",
  "fill",
  "inside",
  "outside",
];

const resizeRoute = new Hono();

resizeRoute.post("/", async (c) => {
  const apiKey = c.req.header("Authorization")?.replace("Bearer ", "");
  if (apiKey !== process.env.API_KEY) {
    return c.json({ error: "unauthorized" }, 401);
  }

  const body = await c.req.parseBody();
  const file = body["file"];
  const widthRaw = body["width"] as string | undefined;
  const heightRaw = body["height"] as string | undefined;
  const fitRaw = body["fit"] as string | undefined;
  const qualityRaw = body["quality"] as string | undefined;
  const maxFileSizeRaw = body["maxFileSize"] as string | undefined;

  if (!file || !(file instanceof File)) {
    return c.json({ error: "No file provided" }, 400);
  }

  // Parse optional numeric params
  const width = widthRaw ? parseInt(widthRaw, 10) : undefined;
  const height = heightRaw ? parseInt(heightRaw, 10) : undefined;
  const quality = qualityRaw ? parseInt(qualityRaw, 10) : undefined;
  const maxFileSize = maxFileSizeRaw ? parseInt(maxFileSizeRaw, 10) : undefined;

  // Validate width/height
  if (width !== undefined && (isNaN(width) || width <= 0)) {
    return c.json({ error: "width must be a positive integer" }, 400);
  }
  if (height !== undefined && (isNaN(height) || height <= 0)) {
    return c.json({ error: "height must be a positive integer" }, 400);
  }
  if (!width && !height && !quality && !maxFileSize) {
    return c.json(
      { error: "At least one of width, height, quality, or maxFileSize is required" },
      400,
    );
  }

  // Validate fit
  const fit: ResizeFit = (fitRaw && VALID_FITS.includes(fitRaw))
    ? (fitRaw as ResizeFit)
    : "inside";

  // Validate quality
  if (quality !== undefined && (isNaN(quality) || quality < 1 || quality > 100)) {
    return c.json({ error: "quality must be between 1 and 100" }, 400);
  }

  // Validate maxFileSize
  if (maxFileSize !== undefined && (isNaN(maxFileSize) || maxFileSize <= 0)) {
    return c.json({ error: "maxFileSize must be a positive number" }, 400);
  }

  try {
    const startTime = Date.now();
    const inputBuffer = Buffer.from(await file.arrayBuffer());

    const result = await resizeImage(inputBuffer, {
      width,
      height,
      fit,
      quality,
      maxFileSize,
    });

    checkMemoryUsage();

    return new Response(new Uint8Array(result.buffer), {
      headers: {
        "Content-Type": "application/octet-stream",
        "X-File-Size": String(result.size),
        "X-Image-Width": String(result.width),
        "X-Image-Height": String(result.height),
        "X-Processing-Time": String(Date.now() - startTime),
      },
    });
  } catch (error) {
    captureException(error, { width, height, fit, quality, maxFileSize });
    return c.json({ error: (error as Error).message }, 500);
  }
});

export default resizeRoute;

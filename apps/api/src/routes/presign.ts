import { Hono } from "hono";
import { nanoid } from "nanoid";
import { ALLOWED_MIME_TYPES, MIME_TO_FORMAT, PLAN_LIMITS } from "@quickconv/shared";
import type { Env, AppVariables } from "../types/env";
import { uploadToR2 } from "../services/r2";

/** Plan type for file size limit lookup */
type PlanKey = keyof typeof PLAN_LIMITS;

/** Streaming upload via Workers → R2 for large files */
const presign = new Hono<{ Bindings: Env; Variables: AppVariables }>();

/**
 * POST /api/upload/presign
 *
 * Workers-proxied streaming upload for large files.
 * Client sends { filename, size, contentType } to validate,
 * then streams the file body directly in a second PUT request.
 *
 * Step 1 (this endpoint): Validate and return { uploadUrl, fileId, key }
 * Step 2 (PUT /api/upload/presign/:fileId): Stream file body to R2
 */
presign.post("/", async (c) => {
  const body = await c.req.json<{
    filename?: string;
    size?: number;
    contentType?: string;
  }>();

  const { filename, size, contentType } = body;

  // --- Validation ---
  if (!filename || typeof filename !== "string") {
    return c.json(
      { error: "validation", message: "filename is required" },
      400,
    );
  }

  if (!size || typeof size !== "number" || size <= 0) {
    return c.json(
      { error: "validation", message: "size must be a positive number" },
      400,
    );
  }

  if (!contentType || typeof contentType !== "string") {
    return c.json(
      { error: "validation", message: "contentType is required" },
      400,
    );
  }

  if (!ALLOWED_MIME_TYPES.includes(contentType)) {
    return c.json(
      { error: "validation", message: `Unsupported content type: ${contentType}` },
      400,
    );
  }

  // Determine user plan
  const user = c.get("user");
  const plan: PlanKey = (user?.plan as PlanKey) || "free";
  const limits = PLAN_LIMITS[plan];

  if (!limits) {
    return c.json(
      { error: "validation", message: "Invalid plan" },
      400,
    );
  }

  // Size limit check per plan
  const maxSizeBytes = limits.maxFileSizeBytes;
  if (size > maxSizeBytes) {
    return c.json(
      {
        error: "file_too_large",
        message: `File size ${formatBytes(size)} exceeds ${formatBytes(maxSizeBytes)} limit for ${plan} plan`,
        maxSizeBytes,
        plan,
      },
      413,
    );
  }

  // Generate file ID and key
  const fileId = nanoid();
  const format = MIME_TO_FORMAT[contentType] || "bin";
  const key = `uploads/${fileId}.${format}`;

  // Build the upload URL (Workers-proxied PUT endpoint)
  const uploadUrl = `/api/upload/presign/${fileId}`;

  return c.json({
    uploadUrl,
    fileId,
    key,
    maxSizeBytes,
    expiresIn: 900, // 15 minutes
  });
});

/**
 * PUT /api/upload/presign/:fileId
 *
 * Receives streaming file body and writes directly to R2.
 * Content-Type and Content-Length headers are required.
 */
presign.put("/:fileId", async (c) => {
  const fileId = c.req.param("fileId");

  if (!fileId) {
    return c.json(
      { error: "validation", message: "fileId is required" },
      400,
    );
  }

  const contentType = c.req.header("content-type");
  if (!contentType || !ALLOWED_MIME_TYPES.includes(contentType)) {
    return c.json(
      { error: "validation", message: "Valid Content-Type header is required" },
      400,
    );
  }

  // Size guard via Content-Length
  const contentLength = c.req.header("content-length");
  if (!contentLength) {
    return c.json(
      { error: "validation", message: "Content-Length header is required" },
      400,
    );
  }

  const size = Number.parseInt(contentLength, 10);
  if (Number.isNaN(size) || size <= 0) {
    return c.json(
      { error: "validation", message: "Invalid Content-Length" },
      400,
    );
  }

  // Plan-based size check
  const user = c.get("user");
  const plan: PlanKey = (user?.plan as PlanKey) || "free";
  const limits = PLAN_LIMITS[plan];
  const maxSizeBytes = limits?.maxFileSizeBytes ?? PLAN_LIMITS.free.maxFileSizeBytes;

  if (size > maxSizeBytes) {
    return c.json(
      {
        error: "file_too_large",
        message: `File size exceeds ${formatBytes(maxSizeBytes)} limit`,
        maxSizeBytes,
      },
      413,
    );
  }

  const format = MIME_TO_FORMAT[contentType] || "bin";
  const key = `uploads/${fileId}.${format}`;

  // Stream request body directly to R2
  const body = c.req.raw.body;
  if (!body) {
    return c.json(
      { error: "validation", message: "Request body is empty" },
      400,
    );
  }

  await uploadToR2(c.env.R2_BUCKET, key, body, contentType);

  return c.json({
    fileId,
    fileName: fileId,
    fileSize: size,
    mimeType: contentType,
    format,
    key,
  });
});

/** Format bytes into human-readable string */
function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)}KB`;
  return `${Math.round(bytes / (1024 * 1024))}MB`;
}

export default presign;

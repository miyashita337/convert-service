import { Hono } from "hono";
import { nanoid } from "nanoid";
import { CONVERSION_PAIRS, FILE_EXPIRY_HOURS, FORMAT_TO_MIME, MIME_TO_FORMAT } from "@quickconv/shared";
import type { Env, AppVariables } from "../types/env";
import { createJob, updateJobStatus } from "../services/d1";
import { requestDirectConversion } from "../services/converter";
import { uploadToR2 } from "../services/r2";

const API_FILE_SIZE_LIMITS: Record<string, number> = {
  free: 10 * 1024 * 1024,       // 10MB
  starter: 50 * 1024 * 1024,    // 50MB
  pro: 100 * 1024 * 1024,       // 100MB
};

const v1Convert = new Hono<{ Bindings: Env; Variables: AppVariables }>();

v1Convert.post("/", async (c) => {
  const apiKey = c.get("apiKey");
  if (!apiKey) {
    return c.json({ error: { code: "unauthorized", message: "API key required" } }, 401);
  }

  const contentType = c.req.header("Content-Type") || "";
  if (!contentType.includes("multipart/form-data")) {
    return c.json(
      { error: { code: "validation", message: "Content-Type must be multipart/form-data" } },
      400
    );
  }

  const formData = await c.req.formData();
  const file = formData.get("file");
  const outputFormat = formData.get("output_format") as string | null;
  const quality = formData.get("quality") as string | null;

  if (!file || !(file instanceof File)) {
    return c.json({ error: { code: "validation", message: "Missing 'file' field" } }, 400);
  }

  if (!outputFormat) {
    return c.json({ error: { code: "validation", message: "Missing 'output_format' field" } }, 400);
  }

  // Detect input format
  const inputFormat = MIME_TO_FORMAT[file.type] || file.name.split(".").pop()?.toLowerCase() || "";
  if (!inputFormat) {
    return c.json({ error: { code: "validation", message: "Cannot detect input format" } }, 400);
  }

  // Validate conversion pair
  const allowedOutputs = CONVERSION_PAIRS[inputFormat];
  if (!allowedOutputs?.includes(outputFormat)) {
    return c.json(
      { error: { code: "validation", message: `Cannot convert ${inputFormat} to ${outputFormat}` } },
      400
    );
  }

  // File size check
  const maxSize = API_FILE_SIZE_LIMITS[apiKey.plan] ?? API_FILE_SIZE_LIMITS.free;
  if (file.size > maxSize) {
    return c.json(
      { error: { code: "file_too_large", message: `File exceeds ${maxSize / 1024 / 1024}MB limit for ${apiKey.plan} plan` } },
      413
    );
  }

  const jobId = nanoid();
  const fileId = nanoid();
  const inputKey = `uploads/${fileId}.${inputFormat}`;
  const expiresAt = new Date(Date.now() + FILE_EXPIRY_HOURS * 60 * 60 * 1000).toISOString();

  // Upload to R2
  const fileBuffer = await file.arrayBuffer();
  const inputMime = FORMAT_TO_MIME[inputFormat] || "application/octet-stream";
  await uploadToR2(c.env.R2_BUCKET, inputKey, fileBuffer, inputMime);

  // Create job record
  await createJob(c.env.DB, {
    id: jobId,
    inputFileKey: inputKey,
    inputFormat,
    outputFormat,
    expiresAt,
  });

  // Convert
  const result = await requestDirectConversion(
    c.env.CONVERTER_URL,
    c.env.CONVERTER_API_KEY || "test-key",
    {
      jobId,
      fileBody: fileBuffer,
      fileName: `input.${inputFormat}`,
      outputFormat,
    }
  );

  if (!result.success || !result.outputBuffer) {
    await updateJobStatus(c.env.DB, jobId, "failed", { errorMessage: result.error });
    return c.json(
      { error: { code: "conversion_failed", message: result.error || "Conversion failed" } },
      500
    );
  }

  // Store output
  const outputKey = `converted/${jobId}.${outputFormat}`;
  const outputMime = FORMAT_TO_MIME[outputFormat] || "application/octet-stream";
  await uploadToR2(c.env.R2_BUCKET, outputKey, result.outputBuffer, outputMime);

  await updateJobStatus(c.env.DB, jobId, "completed", {
    outputFileKey: outputKey,
    fileSize: result.fileSize,
    progress: 100,
  });

  const appUrl = c.env.APP_URL || "https://api.quickconv.cc";

  return c.json({
    url: `${appUrl}/api/download/${jobId}`,
    format: outputFormat,
    size: result.fileSize ?? result.outputBuffer.byteLength,
    expires_at: expiresAt,
  });
});

export default v1Convert;

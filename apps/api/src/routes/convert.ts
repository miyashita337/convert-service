import { Hono } from "hono";
import { nanoid } from "nanoid";
import { convertSchema, CONVERSION_PAIRS, FILE_EXPIRY_HOURS, FORMAT_TO_MIME } from "@quickconv/shared";
import type { Env, AppVariables } from "../types/env";
import { createJob, updateJobStatus } from "../services/d1";
import { requestDirectConversion } from "../services/converter";
import { uploadToR2 } from "../services/r2";

const convert = new Hono<{ Bindings: Env; Variables: AppVariables }>();

convert.post("/", async (c) => {
  const body = await c.req.json();
  const parsed = convertSchema.safeParse(body);

  if (!parsed.success) {
    return c.json({ error: "validation", message: parsed.error.message }, 400);
  }

  const { fileId, outputFormat } = parsed.data;

  // Find the uploaded file in R2
  const objects = await c.env.R2_BUCKET.list({ prefix: `uploads/${fileId}` });
  if (!objects.objects.length) {
    return c.json({ error: "not_found", message: "File not found" }, 404);
  }

  const inputKey = objects.objects[0].key;
  const inputFormat = inputKey.split(".").pop() || "";

  // Validate conversion pair
  const allowedOutputs = CONVERSION_PAIRS[inputFormat];
  if (!allowedOutputs?.includes(outputFormat)) {
    return c.json(
      { error: "validation", message: `Cannot convert ${inputFormat} to ${outputFormat}` },
      400
    );
  }

  const jobId = nanoid();
  const expiresAt = new Date(Date.now() + FILE_EXPIRY_HOURS * 60 * 60 * 1000).toISOString();

  await createJob(c.env.DB, {
    id: jobId,
    inputFileKey: inputKey,
    inputFormat,
    outputFormat,
    expiresAt,
  });

  // Use direct mode: get file from R2, send to converter, store result back
  const inputObj = await c.env.R2_BUCKET.get(inputKey);
  if (!inputObj) {
    await updateJobStatus(c.env.DB, jobId, "failed", { errorMessage: "Input file not found in R2" });
    return c.json({ jobId, status: "failed", error: "Input file not found" }, 500);
  }

  const inputBody = await inputObj.arrayBuffer();
  const result = await requestDirectConversion(c.env.CONVERTER_URL, c.env.CONVERTER_API_KEY || "test-key", {
    jobId,
    fileBody: inputBody,
    fileName: `input.${inputFormat}`,
    outputFormat,
  });

  if (!result.success || !result.outputBuffer) {
    await updateJobStatus(c.env.DB, jobId, "failed", { errorMessage: result.error });
    return c.json({ jobId, status: "failed", error: result.error }, 500);
  }

  // Store converted file in R2
  const outputKey = `converted/${jobId}.${outputFormat}`;
  const contentType = FORMAT_TO_MIME[outputFormat] || "application/octet-stream";
  await uploadToR2(c.env.R2_BUCKET, outputKey, result.outputBuffer, contentType);

  await updateJobStatus(c.env.DB, jobId, "completed", {
    outputFileKey: outputKey,
    fileSize: result.fileSize,
  });

  return c.json({
    jobId,
    status: "completed",
    remainingConversions: c.get("rateLimitRemaining"),
    dailyLimit: c.get("rateLimitLimit"),
  });
});

export default convert;

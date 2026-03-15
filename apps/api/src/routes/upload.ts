import { Hono } from "hono";
import { nanoid } from "nanoid";
import {
  MIME_TO_FORMAT,
  ALLOWED_MIME_TYPES,
  MAX_FILE_SIZE_BYTES,
  ANONYMOUS_MAX_FILE_SIZE_BYTES,
  ANONYMOUS_MAX_VIDEO_FILE_SIZE_BYTES,
  ANONYMOUS_MAX_BATCH_FILES,
  isVideoMimeType,
} from "@quickconv/shared";
import type { Env, AppVariables } from "../types/env";
import { uploadToR2 } from "../services/r2";

const upload = new Hono<{ Bindings: Env; Variables: AppVariables }>();

upload.post("/", async (c) => {
  const body = await c.req.parseBody({ all: true });
  const rawFile = body["file"];

  // Batch size validation: reject if more than ANONYMOUS_MAX_BATCH_FILES files
  if (Array.isArray(rawFile)) {
    if (rawFile.length > ANONYMOUS_MAX_BATCH_FILES) {
      return c.json(
        {
          error: "batch_limit_exceeded",
          message: `Too many files. Maximum ${ANONYMOUS_MAX_BATCH_FILES} files per request.`,
          maxFiles: ANONYMOUS_MAX_BATCH_FILES,
        },
        400,
      );
    }
  }

  // For now, only process the first file (single-file conversion)
  const file = Array.isArray(rawFile) ? rawFile[0] : rawFile;

  if (!file || !(file instanceof File)) {
    return c.json({ error: "validation", message: "No file provided" }, 400);
  }

  // 匿名ユーザーのサイズ制限（動画: 5MB, 画像: 10MB）
  const maxSizeForAnonymous = isVideoMimeType(file.type)
    ? ANONYMOUS_MAX_VIDEO_FILE_SIZE_BYTES
    : ANONYMOUS_MAX_FILE_SIZE_BYTES;

  if (file.size > maxSizeForAnonymous) {
    return c.json(
      {
        error: "file_too_large",
        message: `File size exceeds ${maxSizeForAnonymous / (1024 * 1024)}MB limit`,
        maxSizeBytes: maxSizeForAnonymous,
      },
      413,
    );
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    return c.json({ error: "validation", message: "File size exceeds 50MB limit" }, 400);
  }

  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    return c.json({ error: "validation", message: `Unsupported file type: ${file.type}` }, 400);
  }

  const fileId = nanoid();
  const format = MIME_TO_FORMAT[file.type] || "unknown";
  const key = `uploads/${fileId}.${format}`;

  const arrayBuffer = await file.arrayBuffer();
  await uploadToR2(c.env.R2_BUCKET, key, arrayBuffer, file.type);

  return c.json({
    fileId,
    fileName: file.name,
    fileSize: file.size,
    mimeType: file.type,
    format,
    key,
  });
});

export default upload;

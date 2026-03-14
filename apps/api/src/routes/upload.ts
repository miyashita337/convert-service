import { Hono } from "hono";
import { nanoid } from "nanoid";
import {
  MIME_TO_FORMAT,
  ALLOWED_MIME_TYPES,
  MAX_FILE_SIZE_BYTES,
  ANONYMOUS_MAX_FILE_SIZE_BYTES,
} from "@quickconv/shared";
import type { Env, AppVariables } from "../types/env";
import { uploadToR2 } from "../services/r2";

const upload = new Hono<{ Bindings: Env; Variables: AppVariables }>();

upload.post("/", async (c) => {
  const body = await c.req.parseBody();
  const file = body["file"];

  if (!file || !(file instanceof File)) {
    return c.json({ error: "validation", message: "No file provided" }, 400);
  }

  // 匿名ユーザーの10MB制限（ボディパース後の実サイズチェック）
  if (file.size > ANONYMOUS_MAX_FILE_SIZE_BYTES) {
    return c.json(
      {
        error: "file_too_large",
        message: `File size exceeds ${ANONYMOUS_MAX_FILE_SIZE_BYTES / (1024 * 1024)}MB limit`,
        maxSizeBytes: ANONYMOUS_MAX_FILE_SIZE_BYTES,
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

import { z } from "zod";
import { ALLOWED_MIME_TYPES } from "../constants/formats";
import { MAX_FILE_SIZE_BYTES } from "../constants/limits";
import { IMAGE_FORMATS } from "../types/conversion";

export const uploadSchema = z.object({
  fileName: z.string().min(1),
  fileSize: z.number().max(MAX_FILE_SIZE_BYTES, "File size exceeds 50MB limit"),
  mimeType: z.string().refine((v) => ALLOWED_MIME_TYPES.includes(v), "Unsupported file type"),
});

export const convertSchema = z.object({
  fileId: z.string().min(1),
  outputFormat: z.enum(IMAGE_FORMATS),
});

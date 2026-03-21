import { Hono } from "hono";
import type { Env } from "../types/env";
import { updateJobStatus, updateJobProgress } from "../services/d1";

const callback = new Hono<{ Bindings: Env }>();

callback.post("/", async (c) => {
  // Verify the request is from our converter
  const authHeader = c.req.header("Authorization");
  if (authHeader !== `Bearer ${c.env.CONVERTER_API_KEY}`) {
    return c.json({ error: "unauthorized" }, 401);
  }

  const body = await c.req.json<{
    jobId: string;
    status?: "completed" | "failed";
    progress?: number;
    outputKey?: string;
    fileSize?: number;
    error?: string;
  }>();

  // Progress-only update (no status change)
  if (body.progress !== undefined && !body.status) {
    await updateJobProgress(c.env.DB, body.jobId, body.progress);
    return c.json({ ok: true });
  }

  // Status update (completed/failed)
  if (body.status) {
    await updateJobStatus(c.env.DB, body.jobId, body.status, {
      outputFileKey: body.outputKey,
      fileSize: body.fileSize,
      errorMessage: body.error,
      progress: body.status === "completed" ? 100 : undefined,
    });
  }

  return c.json({ ok: true });
});

export default callback;

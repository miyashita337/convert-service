import { Hono } from "hono";
import type { Env } from "../types/env";
import { updateJobStatus } from "../services/d1";

const callback = new Hono<{ Bindings: Env }>();

callback.post("/", async (c) => {
  // Verify the request is from our converter
  const authHeader = c.req.header("Authorization");
  if (authHeader !== `Bearer ${c.env.CONVERTER_API_KEY}`) {
    return c.json({ error: "unauthorized" }, 401);
  }

  const body = await c.req.json<{
    jobId: string;
    status: "completed" | "failed";
    outputKey?: string;
    fileSize?: number;
    error?: string;
  }>();

  await updateJobStatus(c.env.DB, body.jobId, body.status, {
    outputFileKey: body.outputKey,
    fileSize: body.fileSize,
    errorMessage: body.error,
  });

  return c.json({ ok: true });
});

export default callback;

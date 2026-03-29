import { Hono } from "hono";
import type { Env } from "../types/env";
import { getJob } from "../services/d1";

const status = new Hono<{ Bindings: Env }>();

status.get("/:jobId", async (c) => {
  const jobId = c.req.param("jobId");
  const job = await getJob(c.env.DB, jobId);

  if (!job) {
    return c.json({ error: "not_found", message: "Job not found" }, 404);
  }

  return c.json({
    jobId: job.id,
    status: job.status,
    progress: job.progress,
    downloadUrl: job.status === "completed" ? `/api/download/${job.id}` : undefined,
    outputSize: job.status === "completed" ? (job.fileSize ?? undefined) : undefined,
    error: job.errorMessage || undefined,
  });
});

export default status;

import { Hono } from "hono";
import type { Env } from "../types/env";
import { getJob } from "../services/d1";
import { getFromR2 } from "../services/r2";
import { FORMAT_TO_MIME } from "@quickconv/shared";

const download = new Hono<{ Bindings: Env }>();

download.get("/:jobId", async (c) => {
  const jobId = c.req.param("jobId");
  const job = await getJob(c.env.DB, jobId);

  if (!job) {
    return c.json({ error: "not_found", message: "Job not found" }, 404);
  }

  if (job.status !== "completed" || !job.outputFileKey) {
    return c.json({ error: "not_ready", message: "File is not ready for download" }, 400);
  }

  // Check expiry
  if (new Date(job.expiresAt) < new Date()) {
    return c.json({ error: "expired", message: "File has expired" }, 410);
  }

  const object = await getFromR2(c.env.R2_BUCKET, job.outputFileKey);
  if (!object) {
    return c.json({ error: "not_found", message: "File not found in storage" }, 404);
  }

  const contentType = FORMAT_TO_MIME[job.outputFormat] || "application/octet-stream";
  const fileName = `converted.${job.outputFormat}`;

  return new Response(object.body, {
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": `attachment; filename="${fileName}"`,
      "Cache-Control": "private, max-age=3600",
    },
  });
});

export default download;

import { Hono } from "hono";
import type { Env } from "../types/env";

const stream = new Hono<{ Bindings: Env }>();

/**
 * SSE endpoint for real-time job progress.
 * Polls D1 every 2s and streams status/progress updates.
 * Auto-closes on completed/failed or after 5 min (150 polls).
 */
stream.get("/:jobId", async (c) => {
  const jobId = c.req.param("jobId");
  const db = c.env.DB;

  const { readable, writable } = new TransformStream();
  const writer = writable.getWriter();
  const encoder = new TextEncoder();

  const sendEvent = async (data: Record<string, unknown>) => {
    await writer.write(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
  };

  const poll = async () => {
    const MAX_POLLS = 150;
    const POLL_INTERVAL_MS = 2000;

    for (let i = 0; i < MAX_POLLS; i++) {
      try {
        const row = await db
          .prepare("SELECT status, progress, output_file_key, error_message FROM jobs WHERE id = ?")
          .bind(jobId)
          .first();

        if (!row) {
          await sendEvent({ status: "not_found", progress: 0 });
          break;
        }

        const status = row.status as string;
        const progress = (row.progress as number) ?? 0;

        const eventData: Record<string, unknown> = { status, progress };
        if (status === "completed") {
          eventData.downloadUrl = `/api/download/${jobId}`;
        }
        if (status === "failed" && row.error_message) {
          eventData.error = row.error_message as string;
        }
        await sendEvent(eventData);

        if (status === "completed" || status === "failed") {
          break;
        }

        // Wait before next poll
        await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
      } catch {
        await sendEvent({ status: "error", progress: 0, error: "Internal polling error" });
        break;
      }
    }

    await writer.close();
  };

  // Start polling in background (non-blocking for the response)
  c.executionCtx.waitUntil(poll());

  return new Response(readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
});

export default stream;

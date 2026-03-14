import { Hono } from "hono";
import { convertImage, generatePreviews } from "../services/image";
import { downloadFromR2, uploadToR2 } from "../services/r2-client";
import { captureException, checkMemoryUsage } from "../lib/sentry";
import type { ImageFormat } from "@quickconv/shared";

const convertRoute = new Hono();

// Production: R2-based conversion
convertRoute.post("/", async (c) => {
  const apiKey = c.req.header("Authorization")?.replace("Bearer ", "");
  if (apiKey !== process.env.API_KEY) {
    return c.json({ error: "unauthorized" }, 401);
  }

  const body = await c.req.json<{
    jobId: string;
    inputKey: string;
    inputFormat: string;
    outputFormat: string;
  }>();

  const { jobId, inputKey, inputFormat, outputFormat } = body;
  const outputKey = `converted/${jobId}.${outputFormat}`;
  const callbackUrl = process.env.CALLBACK_URL;

  try {
    const inputBuffer = await downloadFromR2(inputKey);
    const result = await convertImage({
      inputBuffer,
      inputFormat,
      outputFormat: outputFormat as any,
    });
    await uploadToR2(outputKey, result.buffer, result.format);

    if (callbackUrl) {
      await fetch(callbackUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.API_KEY}`,
        },
        body: JSON.stringify({ jobId, status: "completed", outputKey, fileSize: result.size }),
      });
    }

    checkMemoryUsage();
    return c.json({ outputKey, fileSize: result.size });
  } catch (error) {
    captureException(error, { jobId, inputKey, inputFormat, outputFormat });
    const errorMessage = (error as Error).message;
    if (callbackUrl) {
      await fetch(callbackUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.API_KEY}`,
        },
        body: JSON.stringify({ jobId, status: "failed", error: errorMessage }),
      });
    }
    return c.json({ error: errorMessage }, 500);
  }
});

// Local dev: Direct file conversion (no R2 dependency)
convertRoute.post("/direct", async (c) => {
  const apiKey = c.req.header("Authorization")?.replace("Bearer ", "");
  if (apiKey !== process.env.API_KEY) {
    return c.json({ error: "unauthorized" }, 401);
  }

  const body = await c.req.parseBody();
  const file = body["file"];
  const outputFormat = body["outputFormat"] as string;
  const jobId = body["jobId"] as string;

  if (!file || !(file instanceof File)) {
    return c.json({ error: "No file provided" }, 400);
  }

  try {
    const inputBuffer = Buffer.from(await file.arrayBuffer());
    const inputFormat = file.name.split(".").pop() || "";

    const result = await convertImage({
      inputBuffer,
      inputFormat,
      outputFormat: outputFormat as any,
    });

    checkMemoryUsage();
    return new Response(new Uint8Array(result.buffer), {
      headers: {
        "Content-Type": "application/octet-stream",
        "X-File-Size": String(result.size),
        "X-Job-Id": jobId || "",
      },
    });
  } catch (error) {
    captureException(error, { jobId, outputFormat });
    return c.json({ error: (error as Error).message }, 500);
  }
});

// Preview: generate multiple quality variants for comparison
convertRoute.post("/preview", async (c) => {
  const apiKey = c.req.header("Authorization")?.replace("Bearer ", "");
  if (apiKey !== process.env.API_KEY) {
    return c.json({ error: "unauthorized" }, 401);
  }

  const body = await c.req.parseBody();
  const file = body["file"];
  const outputFormat = body["outputFormat"] as string;
  const qualitiesRaw = body["qualities"] as string;

  if (!file || !(file instanceof File)) {
    return c.json({ error: "No file provided" }, 400);
  }

  if (!outputFormat) {
    return c.json({ error: "outputFormat is required" }, 400);
  }

  if (!qualitiesRaw) {
    return c.json({ error: "qualities is required" }, 400);
  }

  let qualities: number[];
  try {
    qualities = JSON.parse(qualitiesRaw);
    if (!Array.isArray(qualities) || qualities.length === 0) {
      throw new Error("qualities must be a non-empty array");
    }
    for (const q of qualities) {
      if (typeof q !== "number" || q < 1 || q > 100) {
        throw new Error("Each quality must be a number between 1 and 100");
      }
    }
  } catch (error) {
    return c.json({ error: (error as Error).message }, 400);
  }

  if (qualities.length > 10) {
    return c.json({ error: "Maximum 10 quality variants allowed" }, 400);
  }

  try {
    const inputBuffer = Buffer.from(await file.arrayBuffer());
    const inputFormat = file.name.split(".").pop() || "";

    const previews = await generatePreviews(
      inputBuffer,
      inputFormat,
      outputFormat as ImageFormat,
      qualities,
    );

    checkMemoryUsage();
    return c.json({ previews });
  } catch (error) {
    captureException(error, { outputFormat, qualities });
    return c.json({ error: (error as Error).message }, 500);
  }
});

export default convertRoute;

import { Hono } from "hono";
import { convertImage } from "../services/image";
import { downloadFromR2, uploadToR2 } from "../services/r2-client";

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

    return c.json({ outputKey, fileSize: result.size });
  } catch (error) {
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

    return new Response(new Uint8Array(result.buffer), {
      headers: {
        "Content-Type": "application/octet-stream",
        "X-File-Size": String(result.size),
        "X-Job-Id": jobId || "",
      },
    });
  } catch (error) {
    return c.json({ error: (error as Error).message }, 500);
  }
});

export default convertRoute;

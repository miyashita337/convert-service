import { Hono } from "hono";
import {
  CONVERSION_PAIRS,
  PLAN_PREVIEW_LIMITS,
  type PlanType,
  type ImageFormat,
} from "@quickconv/shared";
import type { Env, AppVariables } from "../types/env";
import { requestPreviewConversion } from "../services/converter";

const preview = new Hono<{ Bindings: Env; Variables: AppVariables }>();

preview.post("/", async (c) => {
  const body = await c.req.parseBody();
  const file = body["file"];
  const outputFormat = body["outputFormat"] as string;
  const qualitiesRaw = body["qualities"] as string;
  const plan = (body["plan"] as PlanType) || "free";

  // --- Validation ---------------------------------------------------------
  if (!file || !(file instanceof File)) {
    return c.json({ error: "validation", message: "No file provided" }, 400);
  }

  if (!outputFormat) {
    return c.json(
      { error: "validation", message: "outputFormat is required" },
      400,
    );
  }

  if (!qualitiesRaw) {
    return c.json(
      { error: "validation", message: "qualities is required" },
      400,
    );
  }

  // Detect input format from filename
  const inputFormat = file.name.split(".").pop() || "";

  // Validate conversion pair
  const allowedOutputs = CONVERSION_PAIRS[inputFormat];
  if (!allowedOutputs?.includes(outputFormat as ImageFormat)) {
    return c.json(
      {
        error: "validation",
        message: `Cannot convert ${inputFormat} to ${outputFormat}`,
      },
      400,
    );
  }

  // Parse and validate qualities array
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
    return c.json(
      { error: "validation", message: (error as Error).message },
      400,
    );
  }

  // Validate plan
  if (!(plan in PLAN_PREVIEW_LIMITS)) {
    return c.json(
      { error: "validation", message: `Invalid plan: ${plan}` },
      400,
    );
  }

  // --- Clamp qualities by plan limit --------------------------------------
  const maxPatterns = PLAN_PREVIEW_LIMITS[plan];
  const clampedQualities = qualities.slice(0, maxPatterns);

  // --- Forward to Converter -----------------------------------------------
  const fileBody = await file.arrayBuffer();

  const result = await requestPreviewConversion(
    c.env.CONVERTER_URL,
    c.env.CONVERTER_API_KEY || "test-key",
    {
      fileBody,
      fileName: file.name,
      outputFormat,
      qualities: clampedQualities,
    },
  );

  if (!result.success) {
    return c.json({ error: "converter", message: result.error }, 500);
  }

  return c.json({
    previews: result.previews,
    requestedCount: qualities.length,
    returnedCount: clampedQualities.length,
    plan,
  });
});

export default preview;

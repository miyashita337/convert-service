#!/usr/bin/env node
/**
 * Conversion benchmark — measures real Sharp / ffmpeg conversion times
 * for the articles referenced in Issue #330 (E12-Sub2-Phase2).
 *
 * Why local Sharp/ffmpeg and not production API:
 *  - Production API has anonymous rate limit (10/day per IP). 5 pairs x 5 trials = 25 calls.
 *  - The converter service itself uses Sharp (apps/converter) and ffmpeg, so local
 *    measurement reflects the same engine. Network/queue overhead is reported separately.
 *  - Deterministic, reproducible in CI, no API key needed.
 *
 * Usage:
 *   node tools/seo-pipeline/benchmark.mjs            # write JSON to docs/articles/benchmarks/<date>.json
 *   node tools/seo-pipeline/benchmark.mjs --dry-run  # stdout only
 *
 * Notes:
 *  - All times are median of 5 trials (warm-up trial discarded).
 *  - Input fixtures are synthesized at known sizes so results are reproducible across machines.
 *  - The script resolves `sharp` from `apps/converter`'s node_modules via createRequire
 *    so it can be run from anywhere in the repo (no chdir needed).
 */

import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { performance } from "node:perf_hooks";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, "..", "..");
const CONVERTER_DIR = join(REPO_ROOT, "apps", "converter");

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");

// Resolve sharp from apps/converter's node_modules (workspace install).
// We use createRequire anchored at the converter package so pnpm's nested
// node_modules layout is followed correctly.
const requireFromConverter = createRequire(join(CONVERTER_DIR, "package.json"));
let sharpEntryPath;
try {
  sharpEntryPath = requireFromConverter.resolve("sharp");
} catch (e) {
  console.error("[error] apps/converter does not have `sharp` installed. Run `pnpm install` from repo root.");
  console.error(e.message);
  process.exit(1);
}
const sharpMod = await import(pathToFileURL(sharpEntryPath).href);
const sharp = sharpMod.default;

const TRIALS = 5;
const WORK_DIR = mkdtempSync(join(tmpdir(), "quickconv-bench-"));

/** Pick the median (50th percentile) value from an array of numbers. */
function median(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

/** Generate a synthetic photo-like RGB image at the given dimensions, encoded as the named format. */
async function synthesizeImage({ width, height, format, quality, out }) {
  // Photo-like content: gradient + sparse noise so encoders see real entropy.
  const pixels = Buffer.alloc(width * height * 3);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 3;
      pixels[i] = (x * 255) / width;
      pixels[i + 1] = (y * 255) / height;
      pixels[i + 2] = ((x + y) * 127) / (width + height) + Math.floor(Math.random() * 32);
    }
  }
  const img = sharp(pixels, { raw: { width, height, channels: 3 } });
  if (format === "jpeg") await img.jpeg({ quality }).toFile(out);
  else if (format === "png") await img.png().toFile(out);
  else if (format === "webp") await img.webp({ quality }).toFile(out);
  else if (format === "avif") await img.avif({ quality }).toFile(out);
  else throw new Error(`unsupported synth format ${format}`);
}

/** Time a single Sharp conversion (input file -> output file). Returns ms. */
async function timeImageConversion(inputPath, output) {
  const start = performance.now();
  let pipe = sharp(inputPath);
  if (output.format === "jpeg") pipe = pipe.jpeg({ quality: output.quality });
  else if (output.format === "png") pipe = pipe.png();
  else if (output.format === "webp") pipe = pipe.webp({ quality: output.quality });
  else if (output.format === "avif") pipe = pipe.avif({ quality: output.quality });
  else throw new Error(`unsupported output ${output.format}`);
  await pipe.toBuffer();
  return performance.now() - start;
}

/** Synthesize an MP4 with ffmpeg (testsrc filter, audio: sine wave). */
function synthesizeMp4({ durationSec, out }) {
  // 320x240 testsrc + sine audio -> small but realistic mp4
  execFileSync(
    "ffmpeg",
    [
      "-y",
      "-f", "lavfi", "-i", `testsrc=duration=${durationSec}:size=320x240:rate=30`,
      "-f", "lavfi", "-i", `sine=frequency=440:duration=${durationSec}`,
      "-c:v", "libx264", "-preset", "veryfast", "-tune", "zerolatency",
      "-c:a", "aac", "-shortest",
      out,
    ],
    { stdio: "ignore" },
  );
}

/** Time MP4 -> MP3 audio extraction. */
function timeMp4ToMp3(inputPath) {
  const out = join(WORK_DIR, `out-${Date.now()}-${Math.random().toString(36).slice(2)}.mp3`);
  const start = performance.now();
  execFileSync(
    "ffmpeg",
    ["-y", "-i", inputPath, "-vn", "-c:a", "libmp3lame", "-q:a", "2", out],
    { stdio: "ignore" },
  );
  const elapsed = performance.now() - start;
  rmSync(out, { force: true });
  return elapsed;
}

/** Run trials, discard warm-up, return summary. */
async function runImagePair({ label, inputPath, output, inputBytes }) {
  const times = [];
  for (let i = 0; i < TRIALS + 1; i++) {
    const t = await timeImageConversion(inputPath, output);
    if (i > 0) times.push(t);
  }
  return {
    label,
    input_format: inputPath.split(".").pop(),
    output_format: output.format,
    quality: output.quality ?? null,
    input_bytes: inputBytes,
    trials: TRIALS,
    median_ms: Math.round(median(times)),
    min_ms: Math.round(Math.min(...times)),
    max_ms: Math.round(Math.max(...times)),
  };
}

function runMp4ToMp3Pair({ label, inputPath, inputBytes }) {
  const times = [];
  for (let i = 0; i < TRIALS + 1; i++) {
    const t = timeMp4ToMp3(inputPath);
    if (i > 0) times.push(t);
  }
  return {
    label,
    input_format: "mp4",
    output_format: "mp3",
    quality: "libmp3lame -q:a 2 (VBR ~190 kbps)",
    input_bytes: inputBytes,
    trials: TRIALS,
    median_ms: Math.round(median(times)),
    min_ms: Math.round(Math.min(...times)),
    max_ms: Math.round(Math.max(...times)),
  };
}

console.error(`[bench] working dir: ${WORK_DIR}`);
console.error(`[bench] trials per pair: ${TRIALS} (+1 warm-up)`);

// --- Fixture generation ---------------------------------------------------
const fixtures = {
  smallWebp: join(WORK_DIR, "small.webp"),
  smallPng: join(WORK_DIR, "small.png"),
  smallJpeg: join(WORK_DIR, "small.jpg"),
  medJpeg: join(WORK_DIR, "med.jpg"),
  mp4: join(WORK_DIR, "input.mp4"),
};

console.error("[bench] synthesizing fixtures...");
await synthesizeImage({ width: 800, height: 600, format: "webp", quality: 80, out: fixtures.smallWebp });
await synthesizeImage({ width: 800, height: 600, format: "png", out: fixtures.smallPng });
await synthesizeImage({ width: 800, height: 600, format: "jpeg", quality: 85, out: fixtures.smallJpeg });
await synthesizeImage({ width: 3000, height: 2000, format: "jpeg", quality: 85, out: fixtures.medJpeg });
synthesizeMp4({ durationSec: 30, out: fixtures.mp4 });

const sizes = Object.fromEntries(
  Object.entries(fixtures).map(([k, p]) => [k, readFileSync(p).byteLength]),
);

// --- Benchmark runs -------------------------------------------------------
const results = [];

console.error("[bench] WebP -> PNG (800x600)...");
// Note: synthesizeImage produces well-compressed output at q80, so the actual
// input size is ~5 KB rather than ~30 KB. The label uses the measured magnitude.
results.push(await runImagePair({
  label: "WebP -> PNG (800x600, ~5KB input)",
  inputPath: fixtures.smallWebp,
  output: { format: "png" },
  inputBytes: sizes.smallWebp,
}));

console.error("[bench] WebP -> PNG (medium, q80 source from 3MP raw)...");
const medWebp = join(WORK_DIR, "med.webp");
await synthesizeImage({ width: 3000, height: 2000, format: "webp", quality: 80, out: medWebp });
const medWebpBytes = readFileSync(medWebp).byteLength;
results.push(await runImagePair({
  label: "WebP -> PNG (3000x2000, medium photo)",
  inputPath: medWebp,
  output: { format: "png" },
  inputBytes: medWebpBytes,
}));

console.error("[bench] JPEG -> WebP (3000x2000, q80)...");
results.push(await runImagePair({
  label: "JPEG -> WebP q80 (3000x2000)",
  inputPath: fixtures.medJpeg,
  output: { format: "webp", quality: 80 },
  inputBytes: sizes.medJpeg,
}));

console.error("[bench] JPEG -> AVIF (3000x2000, q65)...");
results.push(await runImagePair({
  label: "JPEG -> AVIF q65 (3000x2000)",
  inputPath: fixtures.medJpeg,
  output: { format: "avif", quality: 65 },
  inputBytes: sizes.medJpeg,
}));

console.error("[bench] JPEG -> WebP small (800x600, q80)...");
results.push(await runImagePair({
  label: "JPEG -> WebP q80 (800x600 small)",
  inputPath: fixtures.smallJpeg,
  output: { format: "webp", quality: 80 },
  inputBytes: sizes.smallJpeg,
}));

console.error("[bench] JPEG -> AVIF small (800x600, q65)...");
results.push(await runImagePair({
  label: "JPEG -> AVIF q65 (800x600 small)",
  inputPath: fixtures.smallJpeg,
  output: { format: "avif", quality: 65 },
  inputBytes: sizes.smallJpeg,
}));

console.error("[bench] MP4 -> MP3 (30s, libmp3lame)...");
results.push(runMp4ToMp3Pair({
  label: "MP4 -> MP3 (30s, 320x240, libmp3lame q:a 2)",
  inputPath: fixtures.mp4,
  inputBytes: sizes.mp4,
}));

// --- Environment info -----------------------------------------------------
function sharpVersion() {
  // Prefer the resolved version from the installed package (deterministic for the
  // run that just happened). Fall back to the declared range in package.json only
  // if the installed package metadata can't be read.
  try {
    const installedPath = requireFromConverter.resolve("sharp/package.json");
    const installed = JSON.parse(readFileSync(installedPath, "utf8"));
    if (installed?.version) return installed.version;
  } catch {
    // fall through
  }
  try {
    const meta = JSON.parse(readFileSync(join(CONVERTER_DIR, "package.json"), "utf8"));
    return meta.dependencies?.sharp ?? "unknown";
  } catch {
    return "unknown";
  }
}

function ffmpegVersion() {
  const r = spawnSync("ffmpeg", ["-version"]);
  const line = (r.stdout?.toString() ?? "").split("\n")[0];
  return line.replace(/^ffmpeg version\s+/, "").split(" ")[0] || "unknown";
}

const summary = {
  version: "1",
  generated_at: new Date().toISOString(),
  env: {
    node: process.version,
    platform: process.platform,
    arch: process.arch,
    sharp: sharpVersion(),
    ffmpeg: ffmpegVersion(),
    cpu_model: (() => {
      try { return execFileSync("uname", ["-mp"]).toString().trim(); } catch { return "unknown"; }
    })(),
  },
  trials: TRIALS,
  note: "Median of 5 trials (warm-up discarded). Local Sharp / ffmpeg; reflects the same engine as the production converter. Network/queue overhead not included.",
  results,
};

if (dryRun) {
  console.log(JSON.stringify(summary, null, 2));
} else {
  const date = new Date().toISOString().slice(0, 10);
  const outDir = join(REPO_ROOT, "docs", "articles", "benchmarks");
  mkdirSync(outDir, { recursive: true });
  const outPath = join(outDir, `${date}.json`);
  writeFileSync(outPath, JSON.stringify(summary, null, 2));
  console.error(`[bench] wrote ${outPath}`);
  console.log(JSON.stringify(summary.results, null, 2));
}

rmSync(WORK_DIR, { recursive: true, force: true });

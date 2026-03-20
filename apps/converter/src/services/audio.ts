import { execFile } from "node:child_process";
import { writeFile, readFile, unlink, mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

/** FFmpeg 変換タイムアウト（60秒） */
const FFMPEG_TIMEOUT_MS = 60_000;

/** Audio変換デフォルトパラメータ */
const AUDIO_DEFAULTS = {
  bitrate: "192k",
  sampleRate: 44100,
  channels: 2,
} as const;

export interface AudioConvertOptions {
  inputBuffer: Buffer;
  inputFormat: string;
  outputFormat: string;
  bitrate?: string;
  sampleRate?: number;
  channels?: number;
}

interface ConvertResult {
  buffer: Buffer;
  size: number;
  format: string;
}

/**
 * Audio → Audio 変換（FFmpeg使用）
 *
 * 一時ディレクトリに入力ファイルを書き出し、FFmpegで変換後、
 * 結果を読み込んで一時ファイルを削除する。
 */
export async function convertAudio(
  options: AudioConvertOptions,
): Promise<ConvertResult> {
  const {
    inputBuffer,
    inputFormat,
    outputFormat,
    bitrate = AUDIO_DEFAULTS.bitrate,
    sampleRate = AUDIO_DEFAULTS.sampleRate,
    channels = AUDIO_DEFAULTS.channels,
  } = options;

  if (!inputBuffer || inputBuffer.length === 0) {
    throw new Error("Input buffer is empty");
  }

  const tempDir = await mkdtemp(join(tmpdir(), "quickconv-audio-"));
  const inputPath = join(tempDir, `input.${inputFormat}`);
  const outputPath = join(tempDir, `output.${outputFormat}`);

  try {
    await writeFile(inputPath, inputBuffer);

    const args = [
      "-i",
      inputPath,
      "-ab",
      bitrate,
      "-ar",
      String(sampleRate),
      "-ac",
      String(channels),
      "-y",
      outputPath,
    ];

    await runFFmpeg(args);

    const outputBuffer = await readFile(outputPath);

    return {
      buffer: outputBuffer,
      size: outputBuffer.length,
      format: outputFormat,
    };
  } finally {
    await cleanupTempFiles(inputPath, outputPath, tempDir);
  }
}

/**
 * Video → Audio 抽出（FFmpeg使用）
 *
 * 動画ファイルから音声トラックを抽出する。
 */
export async function extractAudio(
  options: AudioConvertOptions,
): Promise<ConvertResult> {
  const {
    inputBuffer,
    inputFormat,
    outputFormat,
    bitrate = AUDIO_DEFAULTS.bitrate,
    sampleRate = AUDIO_DEFAULTS.sampleRate,
    channels = AUDIO_DEFAULTS.channels,
  } = options;

  if (!inputBuffer || inputBuffer.length === 0) {
    throw new Error("Input buffer is empty");
  }

  const tempDir = await mkdtemp(join(tmpdir(), "quickconv-extract-"));
  const inputPath = join(tempDir, `input.${inputFormat}`);
  const outputPath = join(tempDir, `output.${outputFormat}`);

  try {
    await writeFile(inputPath, inputBuffer);

    const args = [
      "-i",
      inputPath,
      "-vn", // 映像トラックを除外
      "-ab",
      bitrate,
      "-ar",
      String(sampleRate),
      "-ac",
      String(channels),
      "-y",
      outputPath,
    ];

    await runFFmpeg(args);

    const outputBuffer = await readFile(outputPath);

    return {
      buffer: outputBuffer,
      size: outputBuffer.length,
      format: outputFormat,
    };
  } finally {
    await cleanupTempFiles(inputPath, outputPath, tempDir);
  }
}

/**
 * FFmpeg コマンド実行
 */
function runFFmpeg(args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    execFile("ffmpeg", args, { timeout: FFMPEG_TIMEOUT_MS }, (error, _stdout, stderr) => {
      if (error) {
        if (error.killed) {
          reject(new Error("FFmpeg conversion timed out"));
          return;
        }
        if ("code" in error && error.code === "ENOENT") {
          reject(new Error("FFmpeg is not installed or not found in PATH"));
          return;
        }
        reject(
          new Error(`FFmpeg conversion failed: ${stderr || error.message}`),
        );
        return;
      }
      resolve();
    });
  });
}

/**
 * 一時ファイル・ディレクトリのクリーンアップ
 */
async function cleanupTempFiles(...paths: string[]): Promise<void> {
  for (const p of paths) {
    try {
      await unlink(p);
    } catch {
      // ファイルが存在しない場合やディレクトリの場合は無視
    }
  }
}

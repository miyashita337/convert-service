import { execFile, spawn } from "node:child_process";
import { writeFile, readFile, unlink, mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

/** FFmpeg GIF変換タイムアウト（60秒） */
const FFMPEG_GIF_TIMEOUT_MS = 60_000;

/** FFmpeg 動画変換タイムアウト（500秒） */
const FFMPEG_VIDEO_TIMEOUT_MS = 500_000;

/** GIF 変換デフォルトパラメータ */
const GIF_DEFAULTS = {
  width: 480,
  fps: 10,
  maxDuration: 30,
} as const;

/** Video 変換デフォルトパラメータ */
const VIDEO_DEFAULTS = {
  maxDurationSec: 180,
  maxResolution: 720,
  crf: 23,
  preset: "medium",
} as const;

interface VideoToGifOptions {
  inputBuffer: Buffer;
  width?: number;
  fps?: number;
  maxDuration?: number;
}

export interface VideoConvertOptions {
  inputBuffer: Buffer;
  inputFormat: string;
  outputFormat: string;
  maxDurationSec?: number;
  maxResolution?: number;
  onProgress?: (percent: number) => void;
}

interface ConvertResult {
  buffer: Buffer;
  size: number;
  format: string;
}

/**
 * MP4 → GIF 変換（FFmpeg使用）
 *
 * 一時ディレクトリに入力ファイルを書き出し、FFmpegで変換後、
 * 結果を読み込んで一時ファイルを削除する。
 */
export async function convertVideoToGif(
  options: VideoToGifOptions,
): Promise<ConvertResult> {
  const {
    inputBuffer,
    width = GIF_DEFAULTS.width,
    fps = GIF_DEFAULTS.fps,
    maxDuration = GIF_DEFAULTS.maxDuration,
  } = options;

  if (!inputBuffer || inputBuffer.length === 0) {
    throw new Error("Input buffer is empty");
  }

  // 一時ディレクトリ作成（一意のパスで衝突回避）
  const tempDir = await mkdtemp(join(tmpdir(), "quickconv-"));
  const inputPath = join(tempDir, "input.mp4");
  const outputPath = join(tempDir, "output.gif");

  try {
    // 入力ファイル書き出し
    await writeFile(inputPath, inputBuffer);

    // FFmpeg 実行
    await runFFmpegGif(inputPath, outputPath, { width, fps, maxDuration });

    // 結果読み込み
    const outputBuffer = await readFile(outputPath);

    return {
      buffer: outputBuffer,
      size: outputBuffer.length,
      format: "gif",
    };
  } finally {
    // 一時ファイルは成功・失敗問わず削除
    await cleanupTempFiles(inputPath, outputPath, tempDir);
  }
}

/**
 * 汎用 Video → Video 変換（FFmpeg使用）
 *
 * 解像度制限・動画長制限を適用し、H.264エンコードで出力。
 * WebM出力時はVP9エンコードを使用。
 * 進捗コールバックで変換の進行状況を通知できる。
 */
export async function convertVideo(
  options: VideoConvertOptions,
): Promise<ConvertResult> {
  const {
    inputBuffer,
    inputFormat,
    outputFormat,
    maxDurationSec = VIDEO_DEFAULTS.maxDurationSec,
    maxResolution = VIDEO_DEFAULTS.maxResolution,
    onProgress,
  } = options;

  if (!inputBuffer || inputBuffer.length === 0) {
    throw new Error("Input buffer is empty");
  }

  const tempDir = await mkdtemp(join(tmpdir(), "quickconv-video-"));
  const inputPath = join(tempDir, `input.${inputFormat}`);
  const outputPath = join(tempDir, `output.${outputFormat}`);

  try {
    await writeFile(inputPath, inputBuffer);

    // まず動画の長さを取得（進捗計算用）
    const duration = await getVideoDuration(inputPath);

    const args = buildVideoArgs(inputPath, outputPath, {
      outputFormat,
      maxDurationSec,
      maxResolution,
    });

    await runFFmpegWithProgress(args, duration, onProgress);

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
 * FFmpegの引数を組み立てる
 */
function buildVideoArgs(
  inputPath: string,
  outputPath: string,
  params: {
    outputFormat: string;
    maxDurationSec: number;
    maxResolution: number;
  },
): string[] {
  const args: string[] = [
    "-i",
    inputPath,
    "-t",
    String(params.maxDurationSec),
    "-vf",
    `scale=-2:'min(${params.maxResolution},ih)'`,
  ];

  if (params.outputFormat === "webm") {
    // VP9 for WebM
    args.push("-c:v", "libvpx-vp9", "-crf", "30", "-b:v", "0");
    args.push("-c:a", "libopus");
  } else {
    // H.264 for MP4/MOV/AVI/MKV
    args.push(
      "-c:v",
      "libx264",
      "-preset",
      VIDEO_DEFAULTS.preset,
      "-crf",
      String(VIDEO_DEFAULTS.crf),
    );
    args.push("-c:a", "aac", "-b:a", "128k");
  }

  // MOV互換フラグ
  if (params.outputFormat === "mov") {
    args.push("-movflags", "+faststart");
  }
  if (params.outputFormat === "mp4") {
    args.push("-movflags", "+faststart");
  }

  args.push("-y", outputPath);
  return args;
}

/**
 * 動画の長さを取得する（秒）
 */
function getVideoDuration(inputPath: string): Promise<number> {
  return new Promise((resolve) => {
    execFile(
      "ffprobe",
      ["-v", "error", "-show_entries", "format=duration", "-of", "default=noprint_wrappers=1:nokey=1", inputPath],
      { timeout: 10_000 },
      (error, stdout) => {
        if (error) {
          resolve(0); // duration不明でもfallback
          return;
        }
        const d = parseFloat(stdout.trim());
        resolve(Number.isFinite(d) ? d : 0);
      },
    );
  });
}

/**
 * FFmpegを進捗付きで実行する（spawn使用）
 */
function runFFmpegWithProgress(
  args: string[],
  totalDuration: number,
  onProgress?: (percent: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    // -progress pipe:1 で進捗情報を stdout に出力
    const fullArgs = ["-progress", "pipe:1", ...args];
    const proc = spawn("ffmpeg", fullArgs, { stdio: ["pipe", "pipe", "pipe"] });

    let stderr = "";
    let lastReportedPercent = 0;
    const timeout = setTimeout(() => {
      proc.kill("SIGKILL");
      reject(new Error("FFmpeg conversion timed out"));
    }, FFMPEG_VIDEO_TIMEOUT_MS);

    proc.stdout?.on("data", (data: Buffer) => {
      if (!onProgress || totalDuration <= 0) return;

      const lines = data.toString().split("\n");
      for (const line of lines) {
        // out_time_ms=1234567 (microseconds)
        const match = line.match(/out_time_ms=(\d+)/);
        if (match) {
          const currentSec = parseInt(match[1], 10) / 1_000_000;
          const percent = Math.min(99, Math.round((currentSec / totalDuration) * 100));
          // 10%刻みで報告
          if (percent >= lastReportedPercent + 10) {
            lastReportedPercent = Math.floor(percent / 10) * 10;
            onProgress(lastReportedPercent);
          }
        }
      }
    });

    proc.stderr?.on("data", (data: Buffer) => {
      stderr += data.toString();
    });

    proc.on("error", (err) => {
      clearTimeout(timeout);
      if ("code" in err && err.code === "ENOENT") {
        reject(new Error("FFmpeg is not installed or not found in PATH"));
      } else {
        reject(new Error(`FFmpeg conversion failed: ${err.message}`));
      }
    });

    proc.on("close", (code) => {
      clearTimeout(timeout);
      if (code === 0) {
        onProgress?.(100);
        resolve();
      } else {
        reject(new Error(`FFmpeg conversion failed: ${stderr.slice(-500) || `exit code ${code}`}`));
      }
    });
  });
}

/**
 * FFmpeg コマンド実行（GIF変換用、既存互換）
 */
function runFFmpegGif(
  inputPath: string,
  outputPath: string,
  params: { width: number; fps: number; maxDuration: number },
): Promise<void> {
  return new Promise((resolve, reject) => {
    const args = [
      "-i",
      inputPath,
      "-vf",
      `fps=${params.fps},scale=${params.width}:-1:flags=lanczos`,
      "-t",
      String(params.maxDuration),
      "-y", // 出力ファイル上書き
      outputPath,
    ];

    execFile("ffmpeg", args, { timeout: FFMPEG_GIF_TIMEOUT_MS }, (error, _stdout, stderr) => {
      if (error) {
        // タイムアウト判定
        if (error.killed) {
          reject(new Error("FFmpeg conversion timed out"));
          return;
        }
        // FFmpeg が見つからない
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
 * 削除失敗はログ出力のみ（変換結果に影響させない）
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

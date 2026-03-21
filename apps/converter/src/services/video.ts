import { execFile } from "node:child_process";
import { writeFile, readFile, unlink, mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

/** FFmpeg 変換タイムアウト（60秒） */
const FFMPEG_TIMEOUT_MS = 60_000;

/** GIF 変換デフォルトパラメータ */
const GIF_DEFAULTS = {
  width: 480,
  fps: 10,
  maxDuration: 30,
} as const;

interface VideoToGifOptions {
  inputBuffer: Buffer;
  width?: number;
  fps?: number;
  maxDuration?: number;
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
    await runFFmpeg(inputPath, outputPath, { width, fps, maxDuration });

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
 * FFmpeg コマンド実行
 */
function runFFmpeg(
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

    execFile("ffmpeg", args, { timeout: FFMPEG_TIMEOUT_MS }, (error, _stdout, stderr) => {
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

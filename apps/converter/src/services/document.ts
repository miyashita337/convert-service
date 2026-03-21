import { execFile } from "node:child_process";
import { writeFile, readFile, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, basename, extname } from "node:path";

/** LibreOffice 変換タイムアウト（120秒） */
const LIBREOFFICE_TIMEOUT_MS = 120_000;

/** 対応する変換ペア（inputFormat → outputFormat[]） */
const SUPPORTED_CONVERSIONS: Record<string, string[]> = {
  docx: ["pdf"],
  xlsx: ["pdf"],
  pptx: ["pdf"],
  pdf: ["docx"],
  epub: ["pdf"],
  doc: ["pdf"],
  xls: ["pdf"],
  ppt: ["pdf"],
  odt: ["pdf"],
  ods: ["pdf"],
  odp: ["pdf"],
};

export interface DocumentConvertOptions {
  inputBuffer: Buffer;
  inputFormat: string;
  outputFormat: string;
}

interface ConvertResult {
  buffer: Buffer;
  size: number;
  format: string;
}

/**
 * 入力フォーマットと出力フォーマットの組み合わせがサポートされているか検証する
 */
export function isSupportedConversion(
  inputFormat: string,
  outputFormat: string,
): boolean {
  const supported = SUPPORTED_CONVERSIONS[inputFormat.toLowerCase()];
  return supported !== undefined && supported.includes(outputFormat.toLowerCase());
}

/**
 * サポートされている変換ペア一覧を返す
 */
export function getSupportedConversions(): Record<string, string[]> {
  return { ...SUPPORTED_CONVERSIONS };
}

/**
 * LibreOffice headless を使ったドキュメント変換
 *
 * 一時ディレクトリに入力ファイルを書き出し、LibreOffice headless で変換後、
 * 結果を読み込んで一時ディレクトリを削除する。
 */
export async function convertDocument(
  options: DocumentConvertOptions,
): Promise<ConvertResult> {
  const { inputBuffer, inputFormat, outputFormat } = options;

  if (!inputBuffer || inputBuffer.length === 0) {
    throw new Error("Input buffer is empty");
  }

  const normalizedInput = inputFormat.toLowerCase();
  const normalizedOutput = outputFormat.toLowerCase();

  if (!isSupportedConversion(normalizedInput, normalizedOutput)) {
    throw new Error(
      `Unsupported conversion: ${normalizedInput} to ${normalizedOutput}`,
    );
  }

  const tempDir = await mkdtemp(join(tmpdir(), "quickconv-doc-"));
  const inputPath = join(tempDir, `input.${normalizedInput}`);

  try {
    await writeFile(inputPath, inputBuffer);

    await runLibreOffice(inputPath, tempDir, normalizedOutput);

    // LibreOffice は入力ファイル名をベースに出力ファイル名を決定する
    const outputFileName = `input.${normalizedOutput}`;
    const outputPath = join(tempDir, outputFileName);

    const outputBuffer = await readFile(outputPath);

    return {
      buffer: outputBuffer,
      size: outputBuffer.length,
      format: normalizedOutput,
    };
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
}

/**
 * LibreOffice headless コマンドを構築する
 *
 * テスト用にエクスポート
 */
export function buildLibreOfficeArgs(
  inputPath: string,
  outDir: string,
  outputFormat: string,
): string[] {
  return [
    "--headless",
    "--convert-to",
    outputFormat,
    "--outdir",
    outDir,
    inputPath,
  ];
}

/**
 * LibreOffice headless コマンド実行
 */
function runLibreOffice(
  inputPath: string,
  outDir: string,
  outputFormat: string,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const args = buildLibreOfficeArgs(inputPath, outDir, outputFormat);

    execFile(
      "libreoffice",
      args,
      { timeout: LIBREOFFICE_TIMEOUT_MS },
      (error, _stdout, stderr) => {
        if (error) {
          if ("killed" in error && error.killed) {
            reject(new Error("LibreOffice conversion timed out"));
            return;
          }
          if ("code" in error && error.code === "ENOENT") {
            reject(
              new Error(
                "LibreOffice is not installed or not found in PATH. " +
                  "Install LibreOffice to enable document conversion.",
              ),
            );
            return;
          }
          reject(
            new Error(
              `LibreOffice conversion failed: ${stderr || error.message}`,
            ),
          );
          return;
        }
        resolve();
      },
    );
  });
}

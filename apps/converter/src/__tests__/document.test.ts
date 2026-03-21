import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  convertDocument,
  buildLibreOfficeArgs,
  isSupportedConversion,
  getSupportedConversions,
} from "../services/document";
import * as childProcess from "node:child_process";
import * as fs from "node:fs/promises";

// child_process.execFile をモック
vi.mock("node:child_process", () => ({
  execFile: vi.fn(),
}));

// fs/promises をモック
vi.mock("node:fs/promises", () => ({
  writeFile: vi.fn().mockResolvedValue(undefined),
  readFile: vi.fn().mockResolvedValue(Buffer.from("fake-document-output")),
  mkdtemp: vi.fn().mockResolvedValue("/tmp/quickconv-doc-test123"),
  rm: vi.fn().mockResolvedValue(undefined),
}));

describe("buildLibreOfficeArgs", () => {
  it("正しい LibreOffice headless コマンド引数を構築する", () => {
    const args = buildLibreOfficeArgs("/tmp/input.docx", "/tmp/outdir", "pdf");

    expect(args).toEqual([
      "--headless",
      "--convert-to",
      "pdf",
      "--outdir",
      "/tmp/outdir",
      "/tmp/input.docx",
    ]);
  });

  it("DOCX→PDF の引数を正しく構築する", () => {
    const args = buildLibreOfficeArgs(
      "/tmp/quickconv-doc-abc/input.docx",
      "/tmp/quickconv-doc-abc",
      "pdf",
    );

    expect(args).toContain("--headless");
    expect(args).toContain("--convert-to");
    expect(args).toContain("pdf");
    expect(args).toContain("--outdir");
    expect(args).toContain("/tmp/quickconv-doc-abc");
    expect(args).toContain("/tmp/quickconv-doc-abc/input.docx");
  });

  it("PDF→DOCX の引数を正しく構築する", () => {
    const args = buildLibreOfficeArgs(
      "/tmp/quickconv-doc-abc/input.pdf",
      "/tmp/quickconv-doc-abc",
      "docx",
    );

    expect(args).toContain("--convert-to");
    expect(args).toContain("docx");
  });
});

describe("isSupportedConversion", () => {
  it("DOCX→PDF はサポートされている", () => {
    expect(isSupportedConversion("docx", "pdf")).toBe(true);
  });

  it("XLSX→PDF はサポートされている", () => {
    expect(isSupportedConversion("xlsx", "pdf")).toBe(true);
  });

  it("PPTX→PDF はサポートされている", () => {
    expect(isSupportedConversion("pptx", "pdf")).toBe(true);
  });

  it("PDF→DOCX はサポートされている", () => {
    expect(isSupportedConversion("pdf", "docx")).toBe(true);
  });

  it("EPUB→PDF はサポートされている", () => {
    expect(isSupportedConversion("epub", "pdf")).toBe(true);
  });

  it("大文字入力でもサポート判定できる", () => {
    expect(isSupportedConversion("DOCX", "PDF")).toBe(true);
  });

  it("サポートされていない変換ペアを検出する", () => {
    expect(isSupportedConversion("docx", "xlsx")).toBe(false);
  });

  it("存在しないフォーマットを検出する", () => {
    expect(isSupportedConversion("unknown", "pdf")).toBe(false);
  });
});

describe("getSupportedConversions", () => {
  it("サポートされている変換ペア一覧を返す", () => {
    const conversions = getSupportedConversions();

    expect(conversions.docx).toContain("pdf");
    expect(conversions.xlsx).toContain("pdf");
    expect(conversions.pptx).toContain("pdf");
    expect(conversions.pdf).toContain("docx");
    expect(conversions.epub).toContain("pdf");
  });

  it("返却値を変更しても元のデータに影響しない", () => {
    const conversions1 = getSupportedConversions();
    conversions1.docx = ["xyz"];

    const conversions2 = getSupportedConversions();
    expect(conversions2.docx).toContain("pdf");
  });
});

describe("convertDocument", () => {
  const mockExecFile = vi.mocked(childProcess.execFile);
  const mockWriteFile = vi.mocked(fs.writeFile);
  const mockReadFile = vi.mocked(fs.readFile);
  const mockRm = vi.mocked(fs.rm);

  beforeEach(() => {
    vi.clearAllMocks();
    mockExecFile.mockImplementation(
      (_cmd: string, _args: unknown, _opts: unknown, callback: unknown) => {
        (
          callback as (
            err: Error | null,
            stdout: string,
            stderr: string,
          ) => void
        )(null, "", "");
        return {} as ReturnType<typeof childProcess.execFile>;
      },
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("正常に DOCX を PDF に変換できる", async () => {
    const inputBuffer = Buffer.from("fake-docx-data");

    const result = await convertDocument({
      inputBuffer,
      inputFormat: "docx",
      outputFormat: "pdf",
    });

    expect(result.format).toBe("pdf");
    expect(result.size).toBeGreaterThan(0);
    expect(result.buffer).toBeInstanceOf(Buffer);
  });

  it("正常に XLSX を PDF に変換できる", async () => {
    const inputBuffer = Buffer.from("fake-xlsx-data");

    const result = await convertDocument({
      inputBuffer,
      inputFormat: "xlsx",
      outputFormat: "pdf",
    });

    expect(result.format).toBe("pdf");
    expect(result.buffer).toBeInstanceOf(Buffer);
  });

  it("正常に PDF を DOCX に変換できる", async () => {
    const inputBuffer = Buffer.from("fake-pdf-data");

    const result = await convertDocument({
      inputBuffer,
      inputFormat: "pdf",
      outputFormat: "docx",
    });

    expect(result.format).toBe("docx");
    expect(result.buffer).toBeInstanceOf(Buffer);
  });

  it("入力ファイルを一時ディレクトリに書き出す", async () => {
    const inputBuffer = Buffer.from("fake-docx-data");

    await convertDocument({
      inputBuffer,
      inputFormat: "docx",
      outputFormat: "pdf",
    });

    expect(mockWriteFile).toHaveBeenCalledWith(
      "/tmp/quickconv-doc-test123/input.docx",
      inputBuffer,
    );
  });

  it("LibreOffice を正しい引数で呼び出す", async () => {
    const inputBuffer = Buffer.from("fake-docx-data");

    await convertDocument({
      inputBuffer,
      inputFormat: "docx",
      outputFormat: "pdf",
    });

    expect(mockExecFile).toHaveBeenCalledOnce();
    const cmd = mockExecFile.mock.calls[0][0];
    expect(cmd).toBe("libreoffice");

    const args = mockExecFile.mock.calls[0][1] as string[];
    expect(args).toContain("--headless");
    expect(args).toContain("--convert-to");
    expect(args).toContain("pdf");
    expect(args).toContain("--outdir");
    expect(args).toContain("/tmp/quickconv-doc-test123");
  });

  it("出力ファイルを正しいパスから読み込む", async () => {
    const inputBuffer = Buffer.from("fake-docx-data");

    await convertDocument({
      inputBuffer,
      inputFormat: "docx",
      outputFormat: "pdf",
    });

    expect(mockReadFile).toHaveBeenCalledWith(
      "/tmp/quickconv-doc-test123/input.pdf",
    );
  });

  it("変換後に一時ディレクトリを削除する", async () => {
    const inputBuffer = Buffer.from("fake-docx-data");

    await convertDocument({
      inputBuffer,
      inputFormat: "docx",
      outputFormat: "pdf",
    });

    expect(mockRm).toHaveBeenCalledWith("/tmp/quickconv-doc-test123", {
      recursive: true,
      force: true,
    });
  });

  it("空バッファでエラーを返す", async () => {
    await expect(
      convertDocument({
        inputBuffer: Buffer.alloc(0),
        inputFormat: "docx",
        outputFormat: "pdf",
      }),
    ).rejects.toThrow("Input buffer is empty");
  });

  it("サポートされていない変換ペアでエラーを返す", async () => {
    await expect(
      convertDocument({
        inputBuffer: Buffer.from("data"),
        inputFormat: "docx",
        outputFormat: "xlsx",
      }),
    ).rejects.toThrow("Unsupported conversion: docx to xlsx");
  });

  it("LibreOffice がインストールされていない場合にエラーを返す", async () => {
    mockExecFile.mockImplementation(
      (_cmd: string, _args: unknown, _opts: unknown, callback: unknown) => {
        const error = Object.assign(new Error("spawn libreoffice ENOENT"), {
          code: "ENOENT",
        });
        (
          callback as (
            err: Error | null,
            stdout: string,
            stderr: string,
          ) => void
        )(error, "", "");
        return {} as ReturnType<typeof childProcess.execFile>;
      },
    );

    await expect(
      convertDocument({
        inputBuffer: Buffer.from("data"),
        inputFormat: "docx",
        outputFormat: "pdf",
      }),
    ).rejects.toThrow("LibreOffice is not installed or not found in PATH");
  });

  it("LibreOffice タイムアウト時にエラーを返す", async () => {
    mockExecFile.mockImplementation(
      (_cmd: string, _args: unknown, _opts: unknown, callback: unknown) => {
        const error = Object.assign(new Error("killed"), { killed: true });
        (
          callback as (
            err: Error | null,
            stdout: string,
            stderr: string,
          ) => void
        )(error, "", "");
        return {} as ReturnType<typeof childProcess.execFile>;
      },
    );

    await expect(
      convertDocument({
        inputBuffer: Buffer.from("data"),
        inputFormat: "docx",
        outputFormat: "pdf",
      }),
    ).rejects.toThrow("LibreOffice conversion timed out");
  });

  it("LibreOffice 変換失敗時に stderr を含むエラーを返す", async () => {
    mockExecFile.mockImplementation(
      (_cmd: string, _args: unknown, _opts: unknown, callback: unknown) => {
        (
          callback as (
            err: Error | null,
            stdout: string,
            stderr: string,
          ) => void
        )(new Error("exit code 1"), "", "Error converting document");
        return {} as ReturnType<typeof childProcess.execFile>;
      },
    );

    await expect(
      convertDocument({
        inputBuffer: Buffer.from("data"),
        inputFormat: "docx",
        outputFormat: "pdf",
      }),
    ).rejects.toThrow(
      "LibreOffice conversion failed: Error converting document",
    );
  });

  it("変換エラー時でも一時ディレクトリを削除する", async () => {
    mockExecFile.mockImplementation(
      (_cmd: string, _args: unknown, _opts: unknown, callback: unknown) => {
        (
          callback as (
            err: Error | null,
            stdout: string,
            stderr: string,
          ) => void
        )(new Error("fail"), "", "error");
        return {} as ReturnType<typeof childProcess.execFile>;
      },
    );

    await expect(
      convertDocument({
        inputBuffer: Buffer.from("data"),
        inputFormat: "docx",
        outputFormat: "pdf",
      }),
    ).rejects.toThrow();

    expect(mockRm).toHaveBeenCalledWith("/tmp/quickconv-doc-test123", {
      recursive: true,
      force: true,
    });
  });

  it("各種ドキュメント形式の変換が動作する", async () => {
    const formats = [
      { input: "docx", output: "pdf" },
      { input: "xlsx", output: "pdf" },
      { input: "pptx", output: "pdf" },
      { input: "epub", output: "pdf" },
      { input: "pdf", output: "docx" },
    ];

    for (const { input, output } of formats) {
      vi.clearAllMocks();
      mockExecFile.mockImplementation(
        (_cmd: string, _args: unknown, _opts: unknown, callback: unknown) => {
          (
            callback as (
              err: Error | null,
              stdout: string,
              stderr: string,
            ) => void
          )(null, "", "");
          return {} as ReturnType<typeof childProcess.execFile>;
        },
      );

      const result = await convertDocument({
        inputBuffer: Buffer.from("fake-data"),
        inputFormat: input,
        outputFormat: output,
      });

      expect(result.format).toBe(output);
    }
  });
});

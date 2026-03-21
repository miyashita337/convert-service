import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { imagesToPdf, pdfToImages } from "../services/pdf";
import * as childProcess from "node:child_process";
import * as fs from "node:fs/promises";

// child_process.execFile をモック
vi.mock("node:child_process", () => ({
  execFile: vi.fn(),
}));

// fs/promises をモック
vi.mock("node:fs/promises", () => ({
  writeFile: vi.fn().mockResolvedValue(undefined),
  readFile: vi.fn().mockResolvedValue(Buffer.from("fake-image-output")),
  unlink: vi.fn().mockResolvedValue(undefined),
  mkdtemp: vi.fn().mockResolvedValue("/tmp/quickconv-pdf-test123"),
  readdir: vi.fn().mockResolvedValue(["page-0001.png"]),
  rm: vi.fn().mockResolvedValue(undefined),
}));

// pdf-lib をモック
vi.mock("pdf-lib", () => {
  const mockPage = {
    getSize: () => ({ width: 595, height: 842 }),
    drawImage: vi.fn(),
    setSize: vi.fn(),
  };

  const mockPdfDoc = {
    addPage: vi.fn().mockReturnValue(mockPage),
    embedPng: vi.fn().mockResolvedValue({ width: 100, height: 100, scale: vi.fn().mockReturnValue({ width: 100, height: 100 }) }),
    embedJpg: vi.fn().mockResolvedValue({ width: 100, height: 100, scale: vi.fn().mockReturnValue({ width: 100, height: 100 }) }),
    save: vi.fn().mockResolvedValue(new Uint8Array([0x25, 0x50, 0x44, 0x46])), // %PDF
  };

  return {
    PDFDocument: {
      create: vi.fn().mockResolvedValue(mockPdfDoc),
    },
  };
});

describe("imagesToPdf", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("PNG画像バッファからPDFを生成できる", async () => {
    const fakeImage = Buffer.from("fake-png-data");

    const result = await imagesToPdf([fakeImage], "png");

    expect(result.format).toBe("pdf");
    expect(result.size).toBeGreaterThan(0);
    expect(result.buffer).toBeInstanceOf(Buffer);
  });

  it("JPG画像バッファからPDFを生成できる", async () => {
    const fakeImage = Buffer.from("fake-jpg-data");

    const result = await imagesToPdf([fakeImage], "jpg");

    expect(result.format).toBe("pdf");
    expect(result.size).toBeGreaterThan(0);
  });

  it("複数画像を1つのPDFに結合できる", async () => {
    const images = [
      Buffer.from("fake-png-1"),
      Buffer.from("fake-png-2"),
      Buffer.from("fake-png-3"),
    ];

    const result = await imagesToPdf(images, "png");

    expect(result.format).toBe("pdf");
    expect(result.buffer).toBeInstanceOf(Buffer);
  });

  it("空の画像配列でエラーを返す", async () => {
    await expect(imagesToPdf([], "png")).rejects.toThrow(
      "No image buffers provided",
    );
  });

  it("空バッファを含む場合にエラーを返す", async () => {
    await expect(
      imagesToPdf([Buffer.alloc(0)], "png"),
    ).rejects.toThrow("Image buffer at index 0 is empty");
  });

  it("出力バッファがPDFヘッダー(%PDF)を持つ", async () => {
    const fakeImage = Buffer.from("fake-png-data");
    const result = await imagesToPdf([fakeImage], "png");

    // モックが %PDF バイトを返すことを確認
    expect(result.buffer[0]).toBe(0x25); // %
    expect(result.buffer[1]).toBe(0x50); // P
    expect(result.buffer[2]).toBe(0x44); // D
    expect(result.buffer[3]).toBe(0x46); // F
  });
});

describe("pdfToImages", () => {
  const mockExecFile = vi.mocked(childProcess.execFile);
  const mockWriteFile = vi.mocked(fs.writeFile);
  const mockReadFile = vi.mocked(fs.readFile);
  const mockRm = vi.mocked(fs.rm);

  beforeEach(() => {
    vi.clearAllMocks();
    mockExecFile.mockImplementation(
      (_cmd: string, _args: unknown, _opts: unknown, callback: unknown) => {
        (callback as (err: Error | null, stdout: string, stderr: string) => void)(null, "", "");
        return {} as ReturnType<typeof childProcess.execFile>;
      },
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("正常にPDFからPNG画像を生成できる", async () => {
    const inputBuffer = Buffer.from("fake-pdf-data");

    const result = await pdfToImages(inputBuffer, "png");

    expect(result.format).toBe("png");
    expect(result.size).toBeGreaterThan(0);
    expect(result.buffer).toBeInstanceOf(Buffer);
  });

  it("正常にPDFからJPG画像を生成できる", async () => {
    const inputBuffer = Buffer.from("fake-pdf-data");

    const result = await pdfToImages(inputBuffer, "jpg");

    expect(result.format).toBe("jpg");
    expect(result.size).toBeGreaterThan(0);
  });

  it("Ghostscript コマンドを正しいデバイスで呼び出す（PNG）", async () => {
    const inputBuffer = Buffer.from("fake-pdf-data");

    await pdfToImages(inputBuffer, "png");

    expect(mockExecFile).toHaveBeenCalledOnce();
    const args = mockExecFile.mock.calls[0][1] as string[];
    expect(args).toContain("-sDEVICE=png16m");
  });

  it("Ghostscript コマンドを正しいデバイスで呼び出す（JPG）", async () => {
    const inputBuffer = Buffer.from("fake-pdf-data");

    await pdfToImages(inputBuffer, "jpg");

    expect(mockExecFile).toHaveBeenCalledOnce();
    const args = mockExecFile.mock.calls[0][1] as string[];
    expect(args).toContain("-sDEVICE=jpeg");
  });

  it("入力ファイルを一時ディレクトリに書き出す", async () => {
    const inputBuffer = Buffer.from("fake-pdf-data");

    await pdfToImages(inputBuffer, "png");

    expect(mockWriteFile).toHaveBeenCalledWith(
      "/tmp/quickconv-pdf-test123/input.pdf",
      inputBuffer,
    );
  });

  it("変換後に一時ディレクトリを削除する", async () => {
    const inputBuffer = Buffer.from("fake-pdf-data");

    await pdfToImages(inputBuffer, "png");

    expect(mockRm).toHaveBeenCalledWith("/tmp/quickconv-pdf-test123", {
      recursive: true,
      force: true,
    });
  });

  it("空バッファでエラーを返す", async () => {
    await expect(pdfToImages(Buffer.alloc(0), "png")).rejects.toThrow(
      "Input buffer is empty",
    );
  });

  it("Ghostscriptがインストールされていない場合にエラーを返す", async () => {
    mockExecFile.mockImplementation(
      (_cmd: string, _args: unknown, _opts: unknown, callback: unknown) => {
        const error = Object.assign(new Error("spawn gs ENOENT"), {
          code: "ENOENT",
        });
        (callback as (err: Error | null, stdout: string, stderr: string) => void)(error, "", "");
        return {} as ReturnType<typeof childProcess.execFile>;
      },
    );

    await expect(pdfToImages(Buffer.from("data"), "png")).rejects.toThrow(
      "Ghostscript is not installed or not found in PATH",
    );
  });

  it("Ghostscript タイムアウト時にエラーを返す", async () => {
    mockExecFile.mockImplementation(
      (_cmd: string, _args: unknown, _opts: unknown, callback: unknown) => {
        const error = Object.assign(new Error("killed"), { killed: true });
        (callback as (err: Error | null, stdout: string, stderr: string) => void)(error, "", "");
        return {} as ReturnType<typeof childProcess.execFile>;
      },
    );

    await expect(pdfToImages(Buffer.from("data"), "png")).rejects.toThrow(
      "Ghostscript conversion timed out",
    );
  });

  it("Ghostscript 変換失敗時にstderrを含むエラーを返す", async () => {
    mockExecFile.mockImplementation(
      (_cmd: string, _args: unknown, _opts: unknown, callback: unknown) => {
        (callback as (err: Error | null, stdout: string, stderr: string) => void)(
          new Error("exit code 1"),
          "",
          "Error: /undefined in pdf_process",
        );
        return {} as ReturnType<typeof childProcess.execFile>;
      },
    );

    await expect(pdfToImages(Buffer.from("data"), "png")).rejects.toThrow(
      "Ghostscript conversion failed: Error: /undefined in pdf_process",
    );
  });

  it("変換エラー時でも一時ディレクトリを削除する", async () => {
    mockExecFile.mockImplementation(
      (_cmd: string, _args: unknown, _opts: unknown, callback: unknown) => {
        (callback as (err: Error | null, stdout: string, stderr: string) => void)(
          new Error("fail"),
          "",
          "error",
        );
        return {} as ReturnType<typeof childProcess.execFile>;
      },
    );

    await expect(pdfToImages(Buffer.from("data"), "png")).rejects.toThrow();

    expect(mockRm).toHaveBeenCalledWith("/tmp/quickconv-pdf-test123", {
      recursive: true,
      force: true,
    });
  });
});

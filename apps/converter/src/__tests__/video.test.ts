import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { convertVideoToGif } from "../services/video";
import * as childProcess from "node:child_process";
import * as fs from "node:fs/promises";

// child_process.execFile をモック
vi.mock("node:child_process", () => ({
  execFile: vi.fn(),
}));

// fs/promises をモック
vi.mock("node:fs/promises", () => ({
  writeFile: vi.fn().mockResolvedValue(undefined),
  readFile: vi.fn().mockResolvedValue(Buffer.from("GIF89a-fake-gif-data")),
  unlink: vi.fn().mockResolvedValue(undefined),
  mkdtemp: vi.fn().mockResolvedValue("/tmp/quickconv-test123"),
}));

describe("convertVideoToGif", () => {
  const mockExecFile = vi.mocked(childProcess.execFile);
  const mockWriteFile = vi.mocked(fs.writeFile);
  const mockReadFile = vi.mocked(fs.readFile);
  const mockUnlink = vi.mocked(fs.unlink);

  beforeEach(() => {
    vi.clearAllMocks();
    // デフォルトで成功するexecFileモック
    mockExecFile.mockImplementation(
      (_cmd: string, _args: any, _opts: any, callback: any) => {
        callback(null, "", "");
        return {} as any;
      },
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("正常にMP4をGIFに変換できる", async () => {
    const inputBuffer = Buffer.from("fake-mp4-data");

    const result = await convertVideoToGif({ inputBuffer });

    expect(result.format).toBe("gif");
    expect(result.size).toBeGreaterThan(0);
    expect(result.buffer).toBeInstanceOf(Buffer);
  });

  it("デフォルトパラメータで FFmpeg を呼び出す（width=480, fps=10, duration=30）", async () => {
    const inputBuffer = Buffer.from("fake-mp4-data");

    await convertVideoToGif({ inputBuffer });

    expect(mockExecFile).toHaveBeenCalledOnce();
    const args = mockExecFile.mock.calls[0][1] as string[];
    expect(args).toContain("-vf");
    const vfIndex = args.indexOf("-vf");
    expect(args[vfIndex + 1]).toBe(
      "fps=10,scale=480:-1:flags=lanczos",
    );
    expect(args).toContain("-t");
    const tIndex = args.indexOf("-t");
    expect(args[tIndex + 1]).toBe("30");
  });

  it("カスタムパラメータが反映される", async () => {
    const inputBuffer = Buffer.from("fake-mp4-data");

    await convertVideoToGif({
      inputBuffer,
      width: 320,
      fps: 15,
      maxDuration: 10,
    });

    const args = mockExecFile.mock.calls[0][1] as string[];
    const vfIndex = args.indexOf("-vf");
    expect(args[vfIndex + 1]).toBe(
      "fps=15,scale=320:-1:flags=lanczos",
    );
    const tIndex = args.indexOf("-t");
    expect(args[tIndex + 1]).toBe("10");
  });

  it("入力ファイルを一時ディレクトリに書き出す", async () => {
    const inputBuffer = Buffer.from("fake-mp4-data");

    await convertVideoToGif({ inputBuffer });

    expect(mockWriteFile).toHaveBeenCalledWith(
      "/tmp/quickconv-test123/input.mp4",
      inputBuffer,
    );
  });

  it("変換後に一時ファイルを削除する", async () => {
    const inputBuffer = Buffer.from("fake-mp4-data");

    await convertVideoToGif({ inputBuffer });

    // input, output, tempDir の3つを削除試行
    expect(mockUnlink).toHaveBeenCalledWith(
      "/tmp/quickconv-test123/input.mp4",
    );
    expect(mockUnlink).toHaveBeenCalledWith(
      "/tmp/quickconv-test123/output.gif",
    );
    expect(mockUnlink).toHaveBeenCalledWith("/tmp/quickconv-test123");
  });

  it("空バッファでエラーを返す", async () => {
    await expect(
      convertVideoToGif({ inputBuffer: Buffer.alloc(0) }),
    ).rejects.toThrow("Input buffer is empty");
  });

  it("FFmpeg がインストールされていない場合にエラーを返す", async () => {
    mockExecFile.mockImplementation(
      (_cmd: string, _args: any, _opts: any, callback: any) => {
        const error = Object.assign(new Error("spawn ffmpeg ENOENT"), {
          code: "ENOENT",
        });
        callback(error, "", "");
        return {} as any;
      },
    );

    await expect(
      convertVideoToGif({ inputBuffer: Buffer.from("data") }),
    ).rejects.toThrow("FFmpeg is not installed or not found in PATH");
  });

  it("FFmpeg タイムアウト時にエラーを返す", async () => {
    mockExecFile.mockImplementation(
      (_cmd: string, _args: any, _opts: any, callback: any) => {
        const error = Object.assign(new Error("killed"), { killed: true });
        callback(error, "", "");
        return {} as any;
      },
    );

    await expect(
      convertVideoToGif({ inputBuffer: Buffer.from("data") }),
    ).rejects.toThrow("FFmpeg conversion timed out");
  });

  it("FFmpeg 変換失敗時にstderrを含むエラーを返す", async () => {
    mockExecFile.mockImplementation(
      (_cmd: string, _args: any, _opts: any, callback: any) => {
        callback(new Error("exit code 1"), "", "Invalid data found");
        return {} as any;
      },
    );

    await expect(
      convertVideoToGif({ inputBuffer: Buffer.from("data") }),
    ).rejects.toThrow("FFmpeg conversion failed: Invalid data found");
  });

  it("変換エラー時でも一時ファイルを削除する", async () => {
    mockExecFile.mockImplementation(
      (_cmd: string, _args: any, _opts: any, callback: any) => {
        callback(new Error("fail"), "", "error");
        return {} as any;
      },
    );

    await expect(
      convertVideoToGif({ inputBuffer: Buffer.from("data") }),
    ).rejects.toThrow();

    // finally ブロックでクリーンアップが実行される
    expect(mockUnlink).toHaveBeenCalled();
  });
});

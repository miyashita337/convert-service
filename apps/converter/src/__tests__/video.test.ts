import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { convertVideoToGif, convertVideo } from "../services/video";
import * as childProcess from "node:child_process";
import * as fs from "node:fs/promises";
import { EventEmitter } from "node:events";

// child_process.execFile をモック
vi.mock("node:child_process", () => ({
  execFile: vi.fn(),
  spawn: vi.fn(),
}));

// fs/promises をモック
vi.mock("node:fs/promises", () => ({
  writeFile: vi.fn().mockResolvedValue(undefined),
  readFile: vi.fn().mockResolvedValue(Buffer.from("fake-output-data")),
  unlink: vi.fn().mockResolvedValue(undefined),
  mkdtemp: vi.fn().mockResolvedValue("/tmp/quickconv-test123"),
}));

/** spawn のモックプロセスを作成 */
function createMockProcess(exitCode = 0) {
  const proc = new EventEmitter() as ReturnType<typeof childProcess.spawn>;
  const stdout = new EventEmitter();
  const stderr = new EventEmitter();
  (proc as unknown as Record<string, unknown>).stdout = stdout;
  (proc as unknown as Record<string, unknown>).stderr = stderr;
  (proc as unknown as Record<string, unknown>).stdin = new EventEmitter();
  (proc as unknown as Record<string, unknown>).kill = vi.fn();

  // 非同期で完了を通知
  setTimeout(() => {
    proc.emit("close", exitCode);
  }, 10);

  return proc;
}

describe("convertVideoToGif", () => {
  const mockExecFile = vi.mocked(childProcess.execFile);
  const mockWriteFile = vi.mocked(fs.writeFile);
  const mockReadFile = vi.mocked(fs.readFile);
  const mockUnlink = vi.mocked(fs.unlink);

  beforeEach(() => {
    vi.clearAllMocks();
    // デフォルトで成功するexecFileモック
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
      (_cmd: string, _args: unknown, _opts: unknown, callback: unknown) => {
        const error = Object.assign(new Error("spawn ffmpeg ENOENT"), {
          code: "ENOENT",
        });
        (callback as (err: Error | null, stdout: string, stderr: string) => void)(error, "", "");
        return {} as ReturnType<typeof childProcess.execFile>;
      },
    );

    await expect(
      convertVideoToGif({ inputBuffer: Buffer.from("data") }),
    ).rejects.toThrow("FFmpeg is not installed or not found in PATH");
  });

  it("FFmpeg タイムアウト時にエラーを返す", async () => {
    mockExecFile.mockImplementation(
      (_cmd: string, _args: unknown, _opts: unknown, callback: unknown) => {
        const error = Object.assign(new Error("killed"), { killed: true });
        (callback as (err: Error | null, stdout: string, stderr: string) => void)(error, "", "");
        return {} as ReturnType<typeof childProcess.execFile>;
      },
    );

    await expect(
      convertVideoToGif({ inputBuffer: Buffer.from("data") }),
    ).rejects.toThrow("FFmpeg conversion timed out");
  });

  it("FFmpeg 変換失敗時にstderrを含むエラーを返す", async () => {
    mockExecFile.mockImplementation(
      (_cmd: string, _args: unknown, _opts: unknown, callback: unknown) => {
        (callback as (err: Error | null, stdout: string, stderr: string) => void)(new Error("exit code 1"), "", "Invalid data found");
        return {} as ReturnType<typeof childProcess.execFile>;
      },
    );

    await expect(
      convertVideoToGif({ inputBuffer: Buffer.from("data") }),
    ).rejects.toThrow("FFmpeg conversion failed: Invalid data found");
  });

  it("変換エラー時でも一時ファイルを削除する", async () => {
    mockExecFile.mockImplementation(
      (_cmd: string, _args: unknown, _opts: unknown, callback: unknown) => {
        (callback as (err: Error | null, stdout: string, stderr: string) => void)(new Error("fail"), "", "error");
        return {} as ReturnType<typeof childProcess.execFile>;
      },
    );

    await expect(
      convertVideoToGif({ inputBuffer: Buffer.from("data") }),
    ).rejects.toThrow();

    // finally ブロックでクリーンアップが実行される
    expect(mockUnlink).toHaveBeenCalled();
  });
});

describe("convertVideo", () => {
  const mockExecFile = vi.mocked(childProcess.execFile);
  const mockSpawn = vi.mocked(childProcess.spawn);
  const mockWriteFile = vi.mocked(fs.writeFile);
  const mockUnlink = vi.mocked(fs.unlink);

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({ shouldAdvanceTime: true });

    // ffprobe: duration 取得
    mockExecFile.mockImplementation(
      (_cmd: string, _args: unknown, _opts: unknown, callback: unknown) => {
        (callback as (err: Error | null, stdout: string, stderr: string) => void)(null, "60.0", "");
        return {} as ReturnType<typeof childProcess.execFile>;
      },
    );

    // spawn: 成功するプロセスを返す
    mockSpawn.mockReturnValue(createMockProcess(0));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("MP4をMOVに変換できる", async () => {
    const inputBuffer = Buffer.from("fake-mp4-data");

    const result = await convertVideo({
      inputBuffer,
      inputFormat: "mp4",
      outputFormat: "mov",
    });

    expect(result.format).toBe("mov");
    expect(result.buffer).toBeInstanceOf(Buffer);
    expect(result.size).toBeGreaterThan(0);
  });

  it("入力ファイルを正しいフォーマットで書き出す", async () => {
    const inputBuffer = Buffer.from("fake-avi-data");

    await convertVideo({
      inputBuffer,
      inputFormat: "avi",
      outputFormat: "mp4",
    });

    expect(mockWriteFile).toHaveBeenCalledWith(
      "/tmp/quickconv-test123/input.avi",
      inputBuffer,
    );
  });

  it("空バッファでエラーを返す", async () => {
    await expect(
      convertVideo({
        inputBuffer: Buffer.alloc(0),
        inputFormat: "mp4",
        outputFormat: "avi",
      }),
    ).rejects.toThrow("Input buffer is empty");
  });

  it("解像度制限パラメータが反映される", async () => {
    const inputBuffer = Buffer.from("fake-mp4-data");

    await convertVideo({
      inputBuffer,
      inputFormat: "mp4",
      outputFormat: "avi",
      maxResolution: 480,
    });

    // spawnの引数を確認
    const spawnArgs = mockSpawn.mock.calls[0][1] as string[];
    expect(spawnArgs).toContain("-vf");
    const vfIndex = spawnArgs.indexOf("-vf");
    expect(spawnArgs[vfIndex + 1]).toContain("480");
  });

  it("動画長制限パラメータが反映される", async () => {
    const inputBuffer = Buffer.from("fake-mp4-data");

    await convertVideo({
      inputBuffer,
      inputFormat: "mp4",
      outputFormat: "avi",
      maxDurationSec: 120,
    });

    const spawnArgs = mockSpawn.mock.calls[0][1] as string[];
    expect(spawnArgs).toContain("-t");
    const tIndex = spawnArgs.indexOf("-t");
    expect(spawnArgs[tIndex + 1]).toBe("120");
  });

  it("WebM出力時にVP9エンコードを使用する", async () => {
    const inputBuffer = Buffer.from("fake-mp4-data");

    await convertVideo({
      inputBuffer,
      inputFormat: "mp4",
      outputFormat: "webm",
    });

    const spawnArgs = mockSpawn.mock.calls[0][1] as string[];
    expect(spawnArgs).toContain("libvpx-vp9");
  });

  it("MP4出力時にH.264エンコードを使用する", async () => {
    const inputBuffer = Buffer.from("fake-avi-data");

    await convertVideo({
      inputBuffer,
      inputFormat: "avi",
      outputFormat: "mp4",
    });

    const spawnArgs = mockSpawn.mock.calls[0][1] as string[];
    expect(spawnArgs).toContain("libx264");
  });

  it("変換後に一時ファイルを削除する", async () => {
    const inputBuffer = Buffer.from("fake-mp4-data");

    await convertVideo({
      inputBuffer,
      inputFormat: "mp4",
      outputFormat: "avi",
    });

    expect(mockUnlink).toHaveBeenCalledWith("/tmp/quickconv-test123/input.mp4");
    expect(mockUnlink).toHaveBeenCalledWith("/tmp/quickconv-test123/output.avi");
    expect(mockUnlink).toHaveBeenCalledWith("/tmp/quickconv-test123");
  });

  it("FFmpeg失敗時にエラーを返す", async () => {
    mockSpawn.mockReturnValue(createMockProcess(1));

    await expect(
      convertVideo({
        inputBuffer: Buffer.from("data"),
        inputFormat: "mp4",
        outputFormat: "avi",
      }),
    ).rejects.toThrow("FFmpeg conversion failed");
  });

  it("進捗コールバックが呼ばれる", async () => {
    const onProgress = vi.fn();
    const proc = createMockProcess(0);

    // 進捗情報をstdoutに出力するモック
    mockSpawn.mockReturnValue(proc);

    const promise = convertVideo({
      inputBuffer: Buffer.from("data"),
      inputFormat: "mp4",
      outputFormat: "avi",
      onProgress,
    });

    // 進捗を送信
    const stdout = (proc as unknown as Record<string, EventEmitter>).stdout;
    stdout.emit("data", Buffer.from("out_time_ms=30000000\n"));

    await promise;

    // 100% (完了時) は確実に呼ばれる
    expect(onProgress).toHaveBeenCalledWith(100);
  });
});

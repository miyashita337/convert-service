import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { convertAudio, extractAudio } from "../services/audio";
import * as childProcess from "node:child_process";
import * as fs from "node:fs/promises";

// child_process.execFile をモック
vi.mock("node:child_process", () => ({
  execFile: vi.fn(),
}));

// fs/promises をモック
vi.mock("node:fs/promises", () => ({
  writeFile: vi.fn().mockResolvedValue(undefined),
  readFile: vi.fn().mockResolvedValue(Buffer.from("fake-audio-output-data")),
  unlink: vi.fn().mockResolvedValue(undefined),
  mkdtemp: vi.fn().mockResolvedValue("/tmp/quickconv-audio-test123"),
}));

describe("convertAudio", () => {
  const mockExecFile = vi.mocked(childProcess.execFile);
  const mockWriteFile = vi.mocked(fs.writeFile);
  const mockUnlink = vi.mocked(fs.unlink);

  beforeEach(() => {
    vi.clearAllMocks();
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

  it("正常にMP3をWAVに変換できる", async () => {
    const inputBuffer = Buffer.from("fake-mp3-data");

    const result = await convertAudio({
      inputBuffer,
      inputFormat: "mp3",
      outputFormat: "wav",
    });

    expect(result.format).toBe("wav");
    expect(result.size).toBeGreaterThan(0);
    expect(result.buffer).toBeInstanceOf(Buffer);
  });

  it("デフォルトパラメータで FFmpeg を呼び出す（bitrate=192k, sampleRate=44100, channels=2）", async () => {
    const inputBuffer = Buffer.from("fake-mp3-data");

    await convertAudio({
      inputBuffer,
      inputFormat: "mp3",
      outputFormat: "wav",
    });

    expect(mockExecFile).toHaveBeenCalledOnce();
    const args = mockExecFile.mock.calls[0][1] as string[];
    expect(args).toContain("-ab");
    expect(args[args.indexOf("-ab") + 1]).toBe("192k");
    expect(args).toContain("-ar");
    expect(args[args.indexOf("-ar") + 1]).toBe("44100");
    expect(args).toContain("-ac");
    expect(args[args.indexOf("-ac") + 1]).toBe("2");
  });

  it("カスタムパラメータが反映される", async () => {
    const inputBuffer = Buffer.from("fake-mp3-data");

    await convertAudio({
      inputBuffer,
      inputFormat: "mp3",
      outputFormat: "flac",
      bitrate: "320k",
      sampleRate: 48000,
      channels: 1,
    });

    const args = mockExecFile.mock.calls[0][1] as string[];
    expect(args[args.indexOf("-ab") + 1]).toBe("320k");
    expect(args[args.indexOf("-ar") + 1]).toBe("48000");
    expect(args[args.indexOf("-ac") + 1]).toBe("1");
  });

  it("入力ファイルを一時ディレクトリに書き出す", async () => {
    const inputBuffer = Buffer.from("fake-mp3-data");

    await convertAudio({
      inputBuffer,
      inputFormat: "mp3",
      outputFormat: "wav",
    });

    expect(mockWriteFile).toHaveBeenCalledWith(
      "/tmp/quickconv-audio-test123/input.mp3",
      inputBuffer,
    );
  });

  it("変換後に一時ファイルを削除する", async () => {
    const inputBuffer = Buffer.from("fake-mp3-data");

    await convertAudio({
      inputBuffer,
      inputFormat: "mp3",
      outputFormat: "wav",
    });

    expect(mockUnlink).toHaveBeenCalledWith(
      "/tmp/quickconv-audio-test123/input.mp3",
    );
    expect(mockUnlink).toHaveBeenCalledWith(
      "/tmp/quickconv-audio-test123/output.wav",
    );
    expect(mockUnlink).toHaveBeenCalledWith("/tmp/quickconv-audio-test123");
  });

  it("空バッファでエラーを返す", async () => {
    await expect(
      convertAudio({
        inputBuffer: Buffer.alloc(0),
        inputFormat: "mp3",
        outputFormat: "wav",
      }),
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
      convertAudio({
        inputBuffer: Buffer.from("data"),
        inputFormat: "mp3",
        outputFormat: "wav",
      }),
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
      convertAudio({
        inputBuffer: Buffer.from("data"),
        inputFormat: "mp3",
        outputFormat: "wav",
      }),
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
      convertAudio({
        inputBuffer: Buffer.from("data"),
        inputFormat: "mp3",
        outputFormat: "wav",
      }),
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
      convertAudio({
        inputBuffer: Buffer.from("data"),
        inputFormat: "mp3",
        outputFormat: "wav",
      }),
    ).rejects.toThrow();

    expect(mockUnlink).toHaveBeenCalled();
  });
});

describe("extractAudio", () => {
  const mockExecFile = vi.mocked(childProcess.execFile);
  const mockWriteFile = vi.mocked(fs.writeFile);

  beforeEach(() => {
    vi.clearAllMocks();
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

  it("正常にMP4からMP3を抽出できる", async () => {
    const inputBuffer = Buffer.from("fake-mp4-data");

    const result = await extractAudio({
      inputBuffer,
      inputFormat: "mp4",
      outputFormat: "mp3",
    });

    expect(result.format).toBe("mp3");
    expect(result.size).toBeGreaterThan(0);
    expect(result.buffer).toBeInstanceOf(Buffer);
  });

  it("-vn フラグで映像トラックを除外する", async () => {
    const inputBuffer = Buffer.from("fake-mp4-data");

    await extractAudio({
      inputBuffer,
      inputFormat: "mp4",
      outputFormat: "mp3",
    });

    expect(mockExecFile).toHaveBeenCalledOnce();
    const args = mockExecFile.mock.calls[0][1] as string[];
    expect(args).toContain("-vn");
  });

  it("入力ファイルを一時ディレクトリに書き出す", async () => {
    const inputBuffer = Buffer.from("fake-mov-data");

    await extractAudio({
      inputBuffer,
      inputFormat: "mov",
      outputFormat: "mp3",
    });

    expect(mockWriteFile).toHaveBeenCalledWith(
      "/tmp/quickconv-audio-test123/input.mov",
      inputBuffer,
    );
  });

  it("空バッファでエラーを返す", async () => {
    await expect(
      extractAudio({
        inputBuffer: Buffer.alloc(0),
        inputFormat: "mp4",
        outputFormat: "mp3",
      }),
    ).rejects.toThrow("Input buffer is empty");
  });

  it("各種Video形式（mov, avi, mkv）から抽出できる", async () => {
    for (const format of ["mov", "avi", "mkv"]) {
      vi.clearAllMocks();
      mockExecFile.mockImplementation(
        (_cmd: string, _args: any, _opts: any, callback: any) => {
          callback(null, "", "");
          return {} as any;
        },
      );

      const result = await extractAudio({
        inputBuffer: Buffer.from("fake-data"),
        inputFormat: format,
        outputFormat: "mp3",
      });

      expect(result.format).toBe("mp3");
    }
  });
});

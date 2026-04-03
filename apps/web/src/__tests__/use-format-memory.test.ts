import { describe, test, expect, beforeEach, afterEach, vi } from "vitest";

const STORAGE_KEY = "qc_format_memory";

// Mock localStorage since vitest's DOM environments have incomplete implementations
let store: Record<string, string> = {};
const mockLocalStorage = {
  getItem: vi.fn((key: string) => store[key] ?? null),
  setItem: vi.fn((key: string, value: string) => { store[key] = value; }),
  removeItem: vi.fn((key: string) => { delete store[key]; }),
  clear: vi.fn(() => { store = {}; }),
  get length() { return Object.keys(store).length; },
  key: vi.fn((i: number) => Object.keys(store)[i] ?? null),
};

// The functions under test (mirroring the hook's logic)
function readMemory(): Record<string, string> {
  try {
    const raw = mockLocalStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveFormat(inputMime: string, format: string): void {
  try {
    const memory = readMemory();
    memory[inputMime] = format;
    mockLocalStorage.setItem(STORAGE_KEY, JSON.stringify(memory));
  } catch {
    // silent
  }
}

function getLastFormat(inputMime: string): string | null {
  return readMemory()[inputMime] ?? null;
}

describe("format memory logic", () => {
  beforeEach(() => {
    store = {};
    vi.clearAllMocks();
  });

  test("returns null when no format stored", () => {
    expect(getLastFormat("image/png")).toBeNull();
  });

  test("saves and retrieves format keyed by MIME type", () => {
    saveFormat("image/png", "webp");
    expect(getLastFormat("image/png")).toBe("webp");
    expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
      STORAGE_KEY,
      JSON.stringify({ "image/png": "webp" })
    );
  });

  test("stores different formats for different MIME types", () => {
    saveFormat("image/png", "webp");
    saveFormat("image/heic", "jpg");
    expect(getLastFormat("image/png")).toBe("webp");
    expect(getLastFormat("image/heic")).toBe("jpg");
  });

  test("overwrites previous format for same MIME type", () => {
    saveFormat("image/png", "webp");
    saveFormat("image/png", "avif");
    expect(getLastFormat("image/png")).toBe("avif");
  });

  test("returns null for unknown MIME type", () => {
    saveFormat("image/png", "webp");
    expect(getLastFormat("image/gif")).toBeNull();
  });

  test("handles corrupted localStorage data", () => {
    store[STORAGE_KEY] = "not-json";
    expect(getLastFormat("image/png")).toBeNull();
  });

  test("handles localStorage getItem throwing", () => {
    mockLocalStorage.getItem.mockImplementationOnce(() => { throw new Error("disabled"); });
    expect(getLastFormat("image/png")).toBeNull();
  });

  test("handles localStorage setItem throwing", () => {
    mockLocalStorage.setItem.mockImplementationOnce(() => { throw new Error("disabled"); });
    // Should not throw
    expect(() => saveFormat("image/png", "webp")).not.toThrow();
  });
});

import { describe, test, expect } from "vitest";
import { formatFileSize } from "@/lib/format";

describe("formatFileSize", () => {
  test("formats bytes below 1KB", () => {
    expect(formatFileSize(0)).toBe("0 B");
    expect(formatFileSize(512)).toBe("512 B");
    expect(formatFileSize(1023)).toBe("1023 B");
  });

  test("formats kilobytes below 1MB", () => {
    expect(formatFileSize(1024)).toBe("1.0 KB");
    expect(formatFileSize(1536)).toBe("1.5 KB");
    expect(formatFileSize(1048575)).toBe("1024.0 KB");
  });

  test("formats megabytes", () => {
    expect(formatFileSize(1048576)).toBe("1.00 MB");
    expect(formatFileSize(5242880)).toBe("5.00 MB");
    expect(formatFileSize(10485760)).toBe("10.00 MB");
  });

  test("handles invalid inputs", () => {
    expect(formatFileSize(NaN)).toBe("0 B");
    expect(formatFileSize(Infinity)).toBe("0 B");
    expect(formatFileSize(-1)).toBe("0 B");
    expect(formatFileSize(-Infinity)).toBe("0 B");
  });
});

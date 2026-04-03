"use client";

import { useCallback } from "react";
import type { OutputFormat } from "@quickconv/shared";

const STORAGE_KEY = "qc_format_memory";

interface FormatMemory {
  [inputMime: string]: OutputFormat;
}

function readMemory(): FormatMemory {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function useFormatMemory() {
  const getLastFormat = useCallback((inputMime: string): OutputFormat | null => {
    const memory = readMemory();
    return memory[inputMime] ?? null;
  }, []);

  const saveFormat = useCallback((inputMime: string, format: OutputFormat) => {
    try {
      const memory = readMemory();
      memory[inputMime] = format;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(memory));
    } catch {
      // localStorage disabled (private browsing) — silent fail
    }
  }, []);

  return { getLastFormat, saveFormat };
}

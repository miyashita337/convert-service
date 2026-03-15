/**
 * Web Worker for quality recommendation.
 * Computes approximate SSIM between original and converted image data
 * to recommend the best quality preset.
 */

interface CompareRequest {
  type: "compare";
  original: ImageData;
  converted: ImageData;
  preset: string;
  quality: number;
  fileSize: number;
}

interface CompareResult {
  type: "result";
  preset: string;
  quality: number;
  fileSize: number;
  ssim: number;
  label: "smallest" | "balanced" | "highest" | "";
}

/**
 * Approximate SSIM (Structural Similarity Index) between two images.
 * Uses luminance channel only for speed.
 * Returns value between 0 (completely different) and 1 (identical).
 */
function approximateSSIM(a: Uint8ClampedArray, b: Uint8ClampedArray, width: number, height: number): number {
  const L = 255;
  const k1 = 0.01;
  const k2 = 0.03;
  const c1 = (k1 * L) ** 2;
  const c2 = (k2 * L) ** 2;

  let sumA = 0, sumB = 0, sumA2 = 0, sumB2 = 0, sumAB = 0;
  const n = width * height;

  for (let i = 0; i < n; i++) {
    const idx = i * 4;
    // Luminance: 0.299R + 0.587G + 0.114B
    const la = 0.299 * a[idx] + 0.587 * a[idx + 1] + 0.114 * a[idx + 2];
    const lb = 0.299 * b[idx] + 0.587 * b[idx + 1] + 0.114 * b[idx + 2];
    sumA += la;
    sumB += lb;
    sumA2 += la * la;
    sumB2 += lb * lb;
    sumAB += la * lb;
  }

  const meanA = sumA / n;
  const meanB = sumB / n;
  const varA = sumA2 / n - meanA * meanA;
  const varB = sumB2 / n - meanB * meanB;
  const covAB = sumAB / n - meanA * meanB;

  const numerator = (2 * meanA * meanB + c1) * (2 * covAB + c2);
  const denominator = (meanA * meanA + meanB * meanB + c1) * (varA + varB + c2);

  return numerator / denominator;
}

self.onmessage = (e: MessageEvent<CompareRequest>) => {
  const { original, converted, preset, quality, fileSize } = e.data;

  const ssim = approximateSSIM(
    original.data,
    converted.data,
    original.width,
    original.height
  );

  const result: CompareResult = {
    type: "result",
    preset,
    quality,
    fileSize,
    ssim,
    label: "",
  };

  self.postMessage(result);
};

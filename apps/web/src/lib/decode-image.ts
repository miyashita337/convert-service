/**
 * Decode a base64 data URL to ImageData for SSIM computation.
 * Downsamples to maxSize to keep memory bounded.
 */
export async function decodeBase64ToImageData(
  dataUrl: string,
  maxSize: number = 1024
): Promise<ImageData> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(
        1,
        maxSize / Math.max(img.naturalWidth, img.naturalHeight)
      );
      const w = Math.floor(img.naturalWidth * scale);
      const h = Math.floor(img.naturalHeight * scale);

      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject(new Error("Canvas context failed"));

      ctx.drawImage(img, 0, 0, w, h);
      resolve(ctx.getImageData(0, 0, w, h));
    };
    img.onerror = () => reject(new Error("Failed to decode image"));
    img.src = dataUrl;
  });
}

/**
 * Decode a File object to ImageData (for the original image).
 */
export async function decodeFileToImageData(
  file: File,
  maxSize: number = 1024
): Promise<ImageData> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
  return decodeBase64ToImageData(dataUrl, maxSize);
}

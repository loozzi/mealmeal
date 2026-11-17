const MAX_EDGE = 1024;
const JPEG_QUALITY = 0.8;

/** Scales a size down so its long edge is at most `max`, keeping the ratio. Never upscales. */
export function fitWithin(width: number, height: number, max: number): { width: number; height: number } {
  const scale = Math.min(1, max / Math.max(width, height));
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error ?? new Error("Cannot read blob"));
    reader.readAsDataURL(blob);
  });
}

type Decoded = { source: CanvasImageSource; width: number; height: number; release(): void };

async function decode(file: File): Promise<Decoded> {
  if (typeof createImageBitmap === "function") {
    try {
      // "from-image" applies the EXIF rotation, so phone photos come out upright.
      const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
      return { source: bitmap, width: bitmap.width, height: bitmap.height, release: () => bitmap.close() };
    } catch {
      // Some browsers cannot decode certain formats this way; fall back to <img>.
    }
  }

  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.decoding = "async";
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("Cannot decode image"));
      img.src = url;
    });
    return { source: img, width: img.naturalWidth, height: img.naturalHeight, release: () => {} };
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Shrinks a picked photo to a JPEG whose long edge is at most 1024px. Throws if it cannot be decoded. */
export async function prepareImage(file: File): Promise<{ blob: Blob; dataUrl: string }> {
  const decoded = await decode(file);
  try {
    if (decoded.width < 1 || decoded.height < 1) throw new Error("Cannot decode image");
    const { width, height } = fitWithin(decoded.width, decoded.height, MAX_EDGE);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas is not available");
    // JPEG has no alpha: paint white first so transparent PNG areas do not turn black.
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(decoded.source, 0, 0, width, height);

    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY));
    if (!blob) throw new Error("Cannot encode image");
    return { blob, dataUrl: await blobToDataUrl(blob) };
  } finally {
    decoded.release();
  }
}

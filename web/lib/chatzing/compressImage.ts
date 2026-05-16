/** Resize/compress images before upload to avoid 500s from huge base64 payloads. */

const MAX_DIMENSION = 1280;
const JPEG_QUALITY = 0.85;
const MAX_BYTES = 900_000;

export type PreparedImage = {
  file: File;
  blob: Blob;
  dataUrl: string;
};

function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to load image"));
    };
    img.src = url;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Failed to encode image"));
      },
      type,
      quality
    );
  });
}

export async function prepareImageForChatzing(file: File): Promise<PreparedImage> {
  if (typeof document === "undefined") {
    const dataUrl = await blobToDataUrl(file);
    return { file, blob: file, dataUrl };
  }

  try {
    const img = await loadImageFromFile(file);
    let { width, height } = img;
    const scale = Math.min(1, MAX_DIMENSION / Math.max(width, height));
    width = Math.round(width * scale);
    height = Math.round(height * scale);

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas not supported");
    ctx.drawImage(img, 0, 0, width, height);

    let blob = await canvasToBlob(canvas, "image/jpeg", JPEG_QUALITY);
    if (blob.size > MAX_BYTES) {
      blob = await canvasToBlob(canvas, "image/jpeg", 0.7);
    }

    const outFile = new File([blob], file.name.replace(/\.\w+$/, "") + ".jpg", {
      type: "image/jpeg",
      lastModified: Date.now(),
    });
    const dataUrl = await blobToDataUrl(blob);
    return { file: outFile, blob, dataUrl };
  } catch {
    const dataUrl = await blobToDataUrl(file);
    return { file, blob: file, dataUrl };
  }
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") resolve(reader.result);
      else reject(new Error("Failed to read image"));
    };
    reader.onerror = () => reject(reader.error ?? new Error("Failed to read image"));
    reader.readAsDataURL(blob);
  });
}

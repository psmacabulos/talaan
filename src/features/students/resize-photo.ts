import { PHOTO_HEIGHT, PHOTO_WIDTH } from "./photo";

/**
 * How much of the extra height of a tall photo is cut from the top. A face
 * in a portrait or half-body photo sits high, so cutting a quarter from the
 * top and the rest from the bottom keeps it in frame, where an even cut
 * kept the chest and lost the head (owner report, 2026-10-12).
 */
const TOP_SHARE = 0.25;

/**
 * The largest 4:5 portrait inside a width × height picture: what the
 * thumbnail crops to. A taller picture loses mostly its bottom; a wider one
 * (landscape, square) loses its sides equally.
 */
export function portraitCrop(width: number, height: number): { x: number; y: number; width: number; height: number } {
  const ratio = PHOTO_WIDTH / PHOTO_HEIGHT;
  if (width / height > ratio) {
    const cropWidth = Math.round(height * ratio);
    return { x: Math.floor((width - cropWidth) / 2), y: 0, width: cropWidth, height };
  }
  const cropHeight = Math.round(width / ratio);
  return { x: 0, y: Math.floor((height - cropHeight) * TOP_SHARE), width, height: cropHeight };
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

/**
 * Crops a chosen or camera photo to a 4:5 portrait and shrinks it to a
 * 256×320 WebP (JPEG where the browser can't make WebP), in the browser.
 * The original never leaves the device, and the server never has to run an
 * image library (Step 46.5).
 */
export async function resizeToThumbnail(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const crop = portraitCrop(bitmap.width, bitmap.height);

  const canvas = document.createElement("canvas");
  canvas.width = PHOTO_WIDTH;
  canvas.height = PHOTO_HEIGHT;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("This browser can't resize photos.");
  context.drawImage(bitmap, crop.x, crop.y, crop.width, crop.height, 0, 0, PHOTO_WIDTH, PHOTO_HEIGHT);
  bitmap.close();

  // A browser that can't make WebP quietly hands back a PNG instead, so the
  // type is checked rather than trusted.
  const webp = await canvasToBlob(canvas, "image/webp", 0.8);
  if (webp?.type === "image/webp") return webp;
  const jpeg = await canvasToBlob(canvas, "image/jpeg", 0.85);
  if (!jpeg) throw new Error("This browser can't resize photos.");
  return jpeg;
}

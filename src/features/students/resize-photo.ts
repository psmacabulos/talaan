/** The thumbnail's side, in pixels: big enough for the gate's large photo, small enough to stay around 15 KB. */
export const THUMBNAIL_SIZE = 256;

/** The largest centred square inside a width × height picture: what the thumbnail crops to. */
export function centreSquare(width: number, height: number): { x: number; y: number; side: number } {
  const side = Math.min(width, height);
  return { x: Math.floor((width - side) / 2), y: Math.floor((height - side) / 2), side };
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

/**
 * Crops a chosen or camera photo to its centre square and shrinks it to a
 * 256×256 WebP (JPEG where the browser can't make WebP), in the browser.
 * The original never leaves the device, and the server never has to run an
 * image library (Step 46.5).
 */
export async function resizeToThumbnail(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const { x, y, side } = centreSquare(bitmap.width, bitmap.height);

  const canvas = document.createElement("canvas");
  canvas.width = THUMBNAIL_SIZE;
  canvas.height = THUMBNAIL_SIZE;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("This browser can't resize photos.");
  context.drawImage(bitmap, x, y, side, side, 0, 0, THUMBNAIL_SIZE, THUMBNAIL_SIZE);
  bitmap.close();

  // A browser that can't make WebP quietly hands back a PNG instead, so the
  // type is checked rather than trusted.
  const webp = await canvasToBlob(canvas, "image/webp", 0.8);
  if (webp?.type === "image/webp") return webp;
  const jpeg = await canvasToBlob(canvas, "image/jpeg", 0.85);
  if (!jpeg) throw new Error("This browser can't resize photos.");
  return jpeg;
}

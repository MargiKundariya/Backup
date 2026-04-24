export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    if (!src) {
      reject(new Error('loadImage called with empty/undefined src'));
      return;
    }
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load image: ${src.slice(0, 80)}`));
    img.src = src;
  });
}

export function imageToCanvas(
  img: HTMLImageElement
): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(img, 0, 0);
  return { canvas, ctx };
}

export function createCanvas(
  width: number,
  height: number
): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
  // Guard against extreme dimensions
  const MAX = 16384;
  const w = Math.min(Math.max(1, Math.round(width)), MAX);
  const h = Math.min(Math.max(1, Math.round(height)), MAX);
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error(`Failed to get 2D context for canvas ${w}×${h}`);
  return { canvas, ctx };
}

export function getImageData(img: HTMLImageElement): ImageData {
  const { ctx } = imageToCanvas(img);
  return ctx.getImageData(0, 0, img.naturalWidth, img.naturalHeight);
}

export function dataUrlToImage(dataUrl: string): Promise<HTMLImageElement> {
  return loadImage(dataUrl);
}

export function canvasToDataUrl(
  canvas: HTMLCanvasElement,
  format: 'png' | 'jpeg' = 'png',
  quality: number = 1
): string {
  const mimeType = format === 'jpeg' ? 'image/jpeg' : 'image/png';
  return canvas.toDataURL(mimeType, quality);
}

export function resizeImageIfNeeded(
  img: HTMLImageElement,
  maxDimension: number = 4096
): HTMLCanvasElement {
  const { naturalWidth: w, naturalHeight: h } = img;
  if (w <= maxDimension && h <= maxDimension) {
    const { canvas } = imageToCanvas(img);
    return canvas;
  }

  const scale = maxDimension / Math.max(w, h);
  const newW = Math.round(w * scale);
  const newH = Math.round(h * scale);

  const { canvas, ctx } = createCanvas(newW, newH);
  ctx.drawImage(img, 0, 0, newW, newH);
  return canvas;
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}


export function canvasToBlob(
  canvas: HTMLCanvasElement,
  format: 'png' | 'jpeg' = 'png',
  quality: number = 1
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const mimeType = format === 'jpeg' ? 'image/jpeg' : 'image/png';
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Failed to create blob'));
      },
      mimeType,
      quality
    );
  });
}

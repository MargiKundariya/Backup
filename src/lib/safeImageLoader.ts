/**
 * Safe image loading utility with timeout, cleanup, and dimension validation.
 * Replaces raw `new Image()` patterns throughout the codebase.
 */

const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB
const MAX_DIMENSION = 8192; // max canvas dimension
const LOAD_TIMEOUT_MS = 15000; // 15 seconds

export interface ImageDimensions {
  width: number;
  height: number;
}

export class ImageLoadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ImageLoadError';
  }
}

/**
 * Load an image from a data URL or path, with timeout and cleanup.
 */
export async function loadImageSafe(src: string, timeoutMs = LOAD_TIMEOUT_MS): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const timer = setTimeout(() => {
      img.onload = null;
      img.onerror = null;
      img.src = '';
      reject(new ImageLoadError('Image load timed out'));
    }, timeoutMs);

    img.onload = () => {
      clearTimeout(timer);
      img.onload = null;
      img.onerror = null;
      if (img.naturalWidth === 0 || img.naturalHeight === 0) {
        reject(new ImageLoadError('Image has zero dimensions'));
        return;
      }
      if (img.naturalWidth > MAX_DIMENSION || img.naturalHeight > MAX_DIMENSION) {
        reject(new ImageLoadError(`Image too large: ${img.naturalWidth}×${img.naturalHeight} (max ${MAX_DIMENSION})`));
        return;
      }
      resolve(img);
    };

    img.onerror = () => {
      clearTimeout(timer);
      img.onload = null;
      img.onerror = null;
      reject(new ImageLoadError('Failed to load image'));
    };

    img.src = src;
  });
}

/**
 * Get image dimensions without keeping the Image object in memory.
 */
export async function getImageDimensions(src: string): Promise<ImageDimensions> {
  const img = await loadImageSafe(src);
  const dims = { width: img.naturalWidth, height: img.naturalHeight };
  img.src = ''; // help GC
  return dims;
}

/**
 * Validate a data URL's approximate size before processing.
 */
export function validateDataUrlSize(dataUrl: string): boolean {
  // data URLs are ~33% larger than raw bytes due to base64 encoding
  const approxBytes = (dataUrl.length * 3) / 4;
  return approxBytes <= MAX_IMAGE_SIZE_BYTES;
}

/**
 * Read a File as data URL with error handling and size validation.
 */
export function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      reject(new ImageLoadError(`File too large: ${(file.size / 1024 / 1024).toFixed(1)}MB (max 10MB)`));
      return;
    }
    if (!file.type.startsWith('image/')) {
      reject(new ImageLoadError(`Invalid file type: ${file.type}`));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== 'string') {
        reject(new ImageLoadError('FileReader returned unexpected type'));
        return;
      }
      resolve(reader.result);
    };
    reader.onerror = () => {
      reject(new ImageLoadError('Failed to read file'));
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Clamp a numeric value to a valid range.
 */
export function clamp(value: number, min: number, max: number): number {
  if (!isFinite(value) || isNaN(value)) return min;
  return Math.min(max, Math.max(min, value));
}

/**
 * Validate and clamp transform values to safe ranges.
 */
export function sanitizeTransform(partial: Record<string, unknown>): Record<string, number | boolean> {
  const result: Record<string, number | boolean> = {};
  if ('x' in partial && typeof partial.x === 'number') result.x = clamp(partial.x, -10000, 10000);
  if ('y' in partial && typeof partial.y === 'number') result.y = clamp(partial.y, -10000, 10000);
  if ('scaleX' in partial && typeof partial.scaleX === 'number') result.scaleX = clamp(partial.scaleX, 0.01, 20);
  if ('scaleY' in partial && typeof partial.scaleY === 'number') result.scaleY = clamp(partial.scaleY, 0.01, 20);
  if ('rotation' in partial && typeof partial.rotation === 'number') result.rotation = clamp(partial.rotation, -360, 360);
  if ('opacity' in partial && typeof partial.opacity === 'number') result.opacity = clamp(partial.opacity, 0, 1);
  if ('flipH' in partial && typeof partial.flipH === 'boolean') result.flipH = partial.flipH;
  if ('flipV' in partial && typeof partial.flipV === 'boolean') result.flipV = partial.flipV;
  return result;
}

/** Safe localStorage get with JSON parse */
export function safeLocalStorageGet<T>(key: string, fallback: T): T {
  try {
    if (typeof window === 'undefined') return fallback;
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

/** Safe localStorage set with quota handling */
export function safeLocalStorageSet(key: string, value: unknown): boolean {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    console.warn(`[localStorage] Failed to save ${key} — quota may be exceeded`);
    return false;
  }
}

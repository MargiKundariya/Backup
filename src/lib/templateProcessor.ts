import { DeviceTemplate, SkinZone } from '@/types';
import { loadImage, createCanvas, imageToCanvas } from './imageUtils';

export interface ProcessedZone {
  zoneId: string;
  mask: HTMLCanvasElement;
  overlay: HTMLCanvasElement;
  bounds: { x: number; y: number; width: number; height: number };
}

export interface ProcessedDevice {
  deviceId: string;
  zones: Record<string, ProcessedZone>;
  originalImage: HTMLImageElement;
  width: number;
  height: number;
}

// LRU cache for processed devices (max 5 entries)
const MAX_CACHE = 5;
const cache = new Map<string, ProcessedDevice>();
const cacheOrder: string[] = [];

export async function processTemplate(
  device: DeviceTemplate,
  forceRefresh = false
): Promise<ProcessedDevice> {
  if (!forceRefresh) {
    const cached = cache.get(device.id);
    if (cached) {
      // Move to end (most recently used)
      const idx = cacheOrder.indexOf(device.id);
      if (idx !== -1) cacheOrder.splice(idx, 1);
      cacheOrder.push(device.id);
      return cached;
    }
  }

  // Bypass browser cache if forceRefresh is true
  const path = forceRefresh 
    ? `${device.templatePath}${device.templatePath.includes('?') ? '&' : '?'}_t=${Date.now()}`
    : device.templatePath;

  const templateImg = await loadImage(path);
  const { canvas: templateCanvas, ctx: templateCtx } = imageToCanvas(templateImg);
  const templateData = templateCtx.getImageData(
    0,
    0,
    templateCanvas.width,
    templateCanvas.height
  );

  const zones: Record<string, ProcessedZone> = {};

  for (const zone of device.zones) {
    zones[zone.id] = processZone(zone, templateData, templateCanvas.width, templateCanvas.height);
  }

  const result: ProcessedDevice = {
    deviceId: device.id,
    zones,
    originalImage: templateImg,
    width: templateCanvas.width,
    height: templateCanvas.height,
  };

  cache.set(device.id, result);
  cacheOrder.push(device.id);
  if (cacheOrder.length > MAX_CACHE) {
    const evict = cacheOrder.shift()!;
    cache.delete(evict);
  }
  return result;
}

function processZone(
  zone: SkinZone,
  templateData: ImageData,
  fullWidth: number,
  fullHeight: number
): ProcessedZone {
  const { x, y, width, height } = zone.bounds;

  // Template pixel structure (verified via pixel analysis):
  //   - Transparent (alpha=0): center body = skinnable area (~66%)
  //   - Semi-transparent: frame edges with anti-aliasing (~16%)
  //   - White opaque: corners outside phone shape (~16%)
  //   - Dark opaque: camera, buttons (~1%)
  //
  // MASK: opaque where template is transparent (the skinnable center)
  // OVERLAY: not needed — original template drawn on top in compositeDevice()
  //   White corners hide design outside phone, semi-transparent frame shows edges,
  //   transparent center lets design show through.

  // Mask: opaque everywhere EXCEPT white opaque corners.
  // This clips the design to the phone's rounded shape — design fills body,
  // renders under semi-transparent frame edges, but stops at rounded corners.
  const { canvas: maskCanvas, ctx: maskCtx } = createCanvas(fullWidth, fullHeight);
  const maskData = maskCtx.createImageData(fullWidth, fullHeight);

  for (let py = 0; py < fullHeight; py++) {
    for (let px = 0; px < fullWidth; px++) {
      const i = (py * fullWidth + px) * 4;
      const r = templateData.data[i];
      const g = templateData.data[i + 1];
      const b = templateData.data[i + 2];
      const a = templateData.data[i + 3];

      const brightness = (r + g + b) / 3;
      const isWhiteCorner = brightness > 220 && a > 200;

      if (!isWhiteCorner) {
        // Everything except white corners is skinnable
        maskData.data[i] = 255;
        maskData.data[i + 1] = 255;
        maskData.data[i + 2] = 255;
        maskData.data[i + 3] = 255;
      } else {
        maskData.data[i + 3] = 0;
      }
    }
  }
  maskCtx.putImageData(maskData, 0, 0);

  // Overlay: template with white opaque corner pixels made transparent
  // so background shows through around rounded phone corners
  const { canvas: overlayCanvas, ctx: overlayCtx } = createCanvas(fullWidth, fullHeight);
  const overlayData = overlayCtx.createImageData(fullWidth, fullHeight);

  for (let py = 0; py < fullHeight; py++) {
    for (let px = 0; px < fullWidth; px++) {
      const i = (py * fullWidth + px) * 4;
      const r = templateData.data[i];
      const g = templateData.data[i + 1];
      const b = templateData.data[i + 2];
      const a = templateData.data[i + 3];

      const brightness = (r + g + b) / 3;

      if (brightness > 220 && a > 200) {
        // White opaque pixel (corner fill) — make transparent
        overlayData.data[i + 3] = 0;
      } else {
        // Keep original pixel (frame edges, camera, buttons, transparent center)
        overlayData.data[i] = r;
        overlayData.data[i + 1] = g;
        overlayData.data[i + 2] = b;
        overlayData.data[i + 3] = a;
      }
    }
  }
  overlayCtx.putImageData(overlayData, 0, 0);

  return {
    zoneId: zone.id,
    mask: maskCanvas,
    overlay: overlayCanvas,
    bounds: { x, y, width, height },
  };
}

export function clearCache(deviceId?: string) {
  if (deviceId) {
    cache.delete(deviceId);
    const idx = cacheOrder.indexOf(deviceId);
    if (idx !== -1) cacheOrder.splice(idx, 1);
  } else {
    cache.clear();
    cacheOrder.length = 0;
  }
}

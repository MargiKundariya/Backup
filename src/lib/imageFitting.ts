/**
 * Shared image fitting calculations used by store, bulkExport, and compositing.
 * Single source of truth for all cover/contain/stretch/fit-width/fit-height logic.
 */

export type FitMode = 'cover' | 'contain' | 'stretch' | 'fit-width' | 'fit-height';

export interface FitResult {
  scaleX: number;
  scaleY: number;
  /** Offset from zone origin to center the image within the zone */
  offsetX: number;
  offsetY: number;
}

export function calculateFit(
  zoneW: number,
  zoneH: number,
  imgW: number,
  imgH: number,
  mode: FitMode = 'cover'
): FitResult {
  let scaleX: number;
  let scaleY: number;

  switch (mode) {
    case 'contain': {
      const s = Math.min(zoneW / imgW, zoneH / imgH);
      scaleX = scaleY = s;
      break;
    }
    case 'stretch':
      scaleX = zoneW / imgW;
      scaleY = zoneH / imgH;
      break;
    case 'fit-width': {
      const s = zoneW / imgW;
      scaleX = scaleY = s;
      break;
    }
    case 'fit-height': {
      const s = zoneH / imgH;
      scaleX = scaleY = s;
      break;
    }
    case 'cover':
    default: {
      const s = Math.max(zoneW / imgW, zoneH / imgH);
      scaleX = scaleY = s;
    }
  }

  return {
    scaleX,
    scaleY,
    offsetX: (zoneW - imgW * scaleX) / 2,
    offsetY: (zoneH - imgH * scaleY) / 2,
  };
}

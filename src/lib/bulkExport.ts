import JSZip from 'jszip';
import { DeviceTemplate, ZoneDesign, ExportOptions, BackgroundScene, Transform } from '@/types';
import { processTemplate } from './templateProcessor';
import { compositeDevice, compositeWithBackground, compositeToOutputSize } from './compositing';
import { canvasToBlob, downloadBlob, loadImage } from './imageUtils';
import { calculateFit } from './imageFitting';
import { resolveExportParams } from './exportPresets';

import { drawWatermark } from './watermark';

export interface BulkExportJob {
  device: DeviceTemplate;
  designDataUrl: string;
  designName: string;
  /** If provided, scale this transform proportionally to each zone instead of auto-fitting */
  referenceTransform?: Transform;
  referenceZoneBounds?: { x: number; y: number; width: number; height: number };
}

export interface BulkExportProgress {
  total: number;
  completed: number;
  currentItem: string;
}

const EXPORT_BATCH_SIZE = 4;

async function processJob(
  job: BulkExportJob,
  exportOptions: ExportOptions,
  background: BackgroundScene | null | undefined,
  watermarkUrl?: string
): Promise<{ name: string; blob: Blob }> {
  const processed = await processTemplate(job.device);

  const designImg = await loadImage(job.designDataUrl);
  const iw = designImg.naturalWidth;
  const ih = designImg.naturalHeight;

  const zoneDesigns: Record<string, ZoneDesign> = {};
  for (const zone of job.device.zones) {
    const zw = zone.bounds.width;
    const zh = zone.bounds.height;

    let transform: Transform;

    if (job.referenceTransform && job.referenceZoneBounds) {
      const ref = job.referenceTransform;
      const refBounds = job.referenceZoneBounds;
      const scaleRatio = zw / refBounds.width;
      const xRelative = ref.x - refBounds.x;
      const yRelative = ref.y - refBounds.y;
      transform = {
        x: zone.bounds.x + xRelative * scaleRatio,
        y: zone.bounds.y + yRelative * scaleRatio,
        scaleX: ref.scaleX * scaleRatio,
        scaleY: ref.scaleY * scaleRatio,
        rotation: ref.rotation,
      };
    } else {
      const { scaleX, scaleY, offsetX, offsetY } = calculateFit(zw, zh, iw, ih, 'cover');
      transform = {
        x: zone.bounds.x + offsetX,
        y: zone.bounds.y + offsetY,
        scaleX,
        scaleY,
        rotation: 0,
      };
    }

    zoneDesigns[zone.id] = { designImage: job.designDataUrl, transform, textLayers: [] };
  }

  let canvas: HTMLCanvasElement;

  const { outputSize, bgOverride, ignoreScene } = resolveExportParams(exportOptions);

  const effectiveBg = bgOverride ?? (background?.value ?? null);
  const effectiveBgType = bgOverride
    ? ('solid' as const)
    : (background?.type ?? 'solid');

  if (outputSize !== null) {
    const bgColor = effectiveBg && effectiveBg !== 'transparent' ? effectiveBg : 'transparent';
    canvas = await compositeToOutputSize(processed, zoneDesigns, outputSize, bgColor, exportOptions, watermarkUrl);
  } else if (!ignoreScene && effectiveBg && effectiveBg !== 'transparent') {
    const canvasWidth = Math.round(processed.width * 1.3);
    const canvasHeight = Math.round(processed.height * 1.3);
    canvas = await compositeWithBackground(
      processed, zoneDesigns, effectiveBg, effectiveBgType,
      canvasWidth, canvasHeight, exportOptions.scale,
      exportOptions, watermarkUrl
    );
  } else {
    canvas = await compositeDevice(processed, zoneDesigns, {
      scale: exportOptions.scale,
      backgroundColor: bgOverride ?? undefined,
    }, exportOptions, watermarkUrl);
  }

  const blob = await canvasToBlob(canvas, exportOptions.format, exportOptions.quality);

  canvas.width = 0;
  canvas.height = 0;

  const ext = exportOptions.format === 'jpeg' ? 'jpg' : 'png';
  const resolvedName = (exportOptions.filenamePattern || '{device}_{design}')
    .replace('{device}', job.device.name)
    .replace('{design}', job.designName)
    .replace('{scale}', `${exportOptions.scale}`)
    .replace('{format}', exportOptions.format);
  const safeName = resolvedName.replace(/[^a-zA-Z0-9_-]/g, '_');

  return { name: `${safeName}.${ext}`, blob };
}

export async function bulkExport(
  jobs: BulkExportJob[],
  exportOptions: ExportOptions,
  onProgress?: (progress: BulkExportProgress) => void,
  background?: BackgroundScene | null,
  watermarkUrl?: string
): Promise<void> {
  const zip = new JSZip();
  const total = jobs.length;
  let completed = 0;
  let failedCount = 0;

  // Process in parallel batches of EXPORT_BATCH_SIZE
  for (let i = 0; i < jobs.length; i += EXPORT_BATCH_SIZE) {
    const batch = jobs.slice(i, i + EXPORT_BATCH_SIZE);

    const batchNames = batch.map((j) => `${j.device.name}_${j.designName}`).join(', ');
    onProgress?.({ total, completed, currentItem: batchNames });

    const results = await Promise.allSettled(
      batch.map((job) => processJob(job, exportOptions, background, watermarkUrl))
    );

    for (let b = 0; b < results.length; b++) {
      const result = results[b];
      if (result.status === 'fulfilled') {
        zip.file(result.value.name, result.value.blob);
      } else {
        const job = batch[b];
        console.error(`[BulkExport] Job failed (${job.device.name}_${job.designName}):`, result.reason);
        failedCount++;
      }
      completed++;
    }
  }

  if (failedCount > 0) {
    console.warn(`[BulkExport] ${failedCount}/${total} jobs failed`);
  }

  onProgress?.({ total, completed: total, currentItem: 'Creating ZIP...' });

  const zipBlob = await zip.generateAsync({ type: 'blob' });
  downloadBlob(zipBlob, 'skin-mockups-export.zip');
}

export async function exportSingle(
  device: DeviceTemplate,
  zoneDesigns: Record<string, ZoneDesign>,
  exportOptions: ExportOptions,
  filename?: string,
  background?: BackgroundScene | null,
  watermarkUrl?: string
): Promise<void> {
  const processed = await processTemplate(device);

  let canvas: HTMLCanvasElement;

  const { outputSize, bgOverride, ignoreScene } = resolveExportParams(exportOptions);
  const effectiveBg = bgOverride ?? (background?.value ?? null);
  const effectiveBgType = bgOverride ? ('solid' as const) : (background?.type ?? 'solid');

  if (outputSize !== null) {
    const bgColor = effectiveBg && effectiveBg !== 'transparent' ? effectiveBg : 'transparent';
    canvas = await compositeToOutputSize(processed, zoneDesigns, outputSize, bgColor, exportOptions, watermarkUrl);
  } else if (!ignoreScene && effectiveBg && effectiveBg !== 'transparent') {
    const canvasWidth = Math.round(processed.width * 1.3);
    const canvasHeight = Math.round(processed.height * 1.3);
    canvas = await compositeWithBackground(
      processed, zoneDesigns, effectiveBg, effectiveBgType,
      canvasWidth, canvasHeight, exportOptions.scale,
      exportOptions, watermarkUrl
    );
  } else {
    canvas = await compositeDevice(processed, zoneDesigns, {
      scale: exportOptions.scale,
      backgroundColor: bgOverride ?? undefined,
    }, exportOptions, watermarkUrl);
  }

  const blob = await canvasToBlob(
    canvas,
    exportOptions.format,
    exportOptions.quality
  );

  const ext = exportOptions.format === 'jpeg' ? 'jpg' : 'png';
  const safeName = (filename || device.name).replace(/[^a-zA-Z0-9_-]/g, '_');
  downloadBlob(blob, `${safeName}.${ext}`);
}

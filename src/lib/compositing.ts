import { ZoneDesign, Transform, ExportOptions } from '@/types';
import { ProcessedDevice } from './templateProcessor';
import { createCanvas, loadImage } from './imageUtils';
import { drawLinearGradient } from './gradientUtils';
import { drawWatermark } from './watermark';

export interface CompositeOptions {
  scale?: number;
  backgroundColor?: string;
  backgroundGradient?: string;
}

/**
 * Main compositing pipeline: for each zone, draw design -> clip with mask -> overlay frame.
 * Merge all zone composites into final output.
 */
export async function compositeDevice(
  processed: ProcessedDevice,
  zoneDesigns: Record<string, ZoneDesign>,
  options: CompositeOptions = {},
  exportOptions?: ExportOptions,
  watermarkUrl?: string
): Promise<HTMLCanvasElement> {
  const { scale = 1 } = options;
  const w = processed.width;
  const h = processed.height;
  const outW = Math.round(w * scale);
  const outH = Math.round(h * scale);

  // Final output canvas
  const { canvas: output, ctx: outCtx } = createCanvas(outW, outH);

  if (scale !== 1) {
    outCtx.scale(scale, scale);
  }

  // Draw background
  if (options.backgroundColor && options.backgroundColor !== 'transparent') {
    outCtx.fillStyle = options.backgroundColor;
    outCtx.fillRect(0, 0, w, h);
  }

  // Draw watermark behind device
  if (exportOptions) {
    await drawWatermark(outCtx, w, h, exportOptions, watermarkUrl);
  }

  // For each zone, composite the design (with error isolation per zone)
  for (const [zoneId, processedZone] of Object.entries(processed.zones)) {
    const design = zoneDesigns[zoneId];
    if (!design?.designImage) continue;

    try {
      const designImg = await loadImage(design.designImage);
      if (designImg.naturalWidth === 0 || designImg.naturalHeight === 0) continue;
     const zoneComposite = await compositeZone(
      processedZone.mask,
      processedZone.overlay,
      designImg,
      design.transform,
      design.textLayers
    );
      outCtx.drawImage(zoneComposite, 0, 0);
    } catch (err) {
      console.error(`[Compositing] Zone ${zoneId} failed:`, err);
    }
  }

  // Draw processed overlay on top of design:
  // - White corners removed (transparent) so background shows through
  // - Semi-transparent frame edges render the case border
  // - Transparent center lets design show through
  // - Dark camera/buttons render on top
  const zoneIds = Object.keys(processed.zones);
  if (zoneIds.length > 0) {
    outCtx.drawImage(processed.zones[zoneIds[0]].overlay, 0, 0);
  }

  return output;
}
async function compositeZone(
  mask: HTMLCanvasElement,
  overlay: HTMLCanvasElement,
  designImg: HTMLImageElement,
  transform: Transform,
  textLayers: ZoneDesign['textLayers'] = []
): Promise<HTMLCanvasElement> {
  const { canvas, ctx } = createCanvas(mask.width, mask.height);

  ctx.save();

  ctx.translate(transform.x, transform.y);

  // Rotate around center of the transformed box
  const sw = designImg.naturalWidth * transform.scaleX;
  const sh = designImg.naturalHeight * transform.scaleY;
  ctx.translate(sw / 2, sh / 2);
  ctx.rotate((transform.rotation * Math.PI) / 180);
  ctx.translate(-sw / 2, -sh / 2);

  const flipH = transform.flipH ? -1 : 1;
  const flipV = transform.flipV ? -1 : 1;
  ctx.scale(transform.scaleX * flipH, transform.scaleY * flipV);

  // Correct offset after scale flipping
  if (transform.flipH) ctx.translate(-designImg.naturalWidth, 0);
  if (transform.flipV) ctx.translate(0, -designImg.naturalHeight);

  ctx.globalAlpha = transform.opacity ?? 1;

  ctx.drawImage(designImg, 0, 0);

  ctx.restore();

  // ✅ APPLY MASK (PERFECT ALIGNMENT)
  ctx.globalCompositeOperation = 'destination-in';
  ctx.drawImage(mask, 0, 0);

  ctx.globalCompositeOperation = 'source-over';

  return canvas;
}
 
/**
 * Render to a fixed square output size (for store compliance presets).
 */
export async function compositeToOutputSize(
  processed: ProcessedDevice,
  zoneDesigns: Record<string, ZoneDesign>,
  outputSize: number,
  bgColor: string,   // hex '#ffffff', '#000000', or 'transparent'
  exportOptions?: ExportOptions,
  watermarkUrl?: string
): Promise<HTMLCanvasElement> {
  // Composite device at native resolution first
  const deviceCanvas = await compositeDevice(processed, zoneDesigns, { scale: 1 });

  const { canvas: final, ctx: finalCtx } = createCanvas(outputSize, outputSize);

  // Fill background
  if (bgColor && bgColor !== 'transparent') {
    finalCtx.fillStyle = bgColor;
    finalCtx.fillRect(0, 0, outputSize, outputSize);
  }

  // Draw watermark behind device
  if (exportOptions) {
    await drawWatermark(finalCtx, outputSize, outputSize, exportOptions, watermarkUrl);
  }

  // Centre device at 85% of the output square
  const deviceScale = Math.min(
    outputSize / processed.width,
    outputSize / processed.height,
  ) * 0.85;
  const dx = (outputSize - processed.width * deviceScale) / 2;
  const dy = (outputSize - processed.height * deviceScale) / 2;

  finalCtx.drawImage(
    deviceCanvas,
    0, 0, deviceCanvas.width, deviceCanvas.height,
    dx, dy, processed.width * deviceScale, processed.height * deviceScale,
  );

  return final;
}

/**
 * Render full preview with background scene
 */
export async function compositeWithBackground(
  processed: ProcessedDevice,
  zoneDesigns: Record<string, ZoneDesign>,
  backgroundValue: string | null,
  backgroundType: 'solid' | 'gradient' | 'image' = 'solid',
  canvasWidth: number,
  canvasHeight: number,
  scale: number = 1,
  exportOptions?: ExportOptions,
  watermarkUrl?: string
): Promise<HTMLCanvasElement> {
  // First composite the device
  const deviceCanvas = await compositeDevice(processed, zoneDesigns, { scale });

  // Create final canvas with background
  const { canvas: final, ctx: finalCtx } = createCanvas(
    Math.round(canvasWidth * scale),
    Math.round(canvasHeight * scale)
  );

  if (scale !== 1) {
    finalCtx.scale(scale, scale);
  }

  // Draw background
  if (backgroundValue && backgroundValue !== 'transparent') {
    if (backgroundType === 'solid') {
      finalCtx.fillStyle = backgroundValue;
      finalCtx.fillRect(0, 0, canvasWidth, canvasHeight);
    } else if (backgroundType === 'gradient') {
      if (!drawLinearGradient(finalCtx, backgroundValue, canvasWidth, canvasHeight)) {
        finalCtx.fillStyle = '#ffffff';
        finalCtx.fillRect(0, 0, canvasWidth, canvasHeight);
      }
    } else if (backgroundType === 'image') {
      try {
        const bgImg = await loadImage(backgroundValue);
        finalCtx.drawImage(bgImg, 0, 0, canvasWidth, canvasHeight);
      } catch {
        // Fallback to white if image fails
        finalCtx.fillStyle = '#ffffff';
        finalCtx.fillRect(0, 0, canvasWidth, canvasHeight);
      }
    }
  }

  // Draw watermark behind device
  if (exportOptions) {
    await drawWatermark(finalCtx, canvasWidth, canvasHeight, exportOptions, watermarkUrl);
  }

  // Center device on canvas
  const deviceScale = Math.min(
    canvasWidth / processed.width,
    canvasHeight / processed.height
  ) * 0.85;

  const dx = (canvasWidth - processed.width * deviceScale) / 2;
  const dy = (canvasHeight - processed.height * deviceScale) / 2;

  finalCtx.drawImage(
    deviceCanvas,
    0, 0, deviceCanvas.width, deviceCanvas.height,
    dx, dy,
    processed.width * deviceScale,
    processed.height * deviceScale
  );

  return final;
}


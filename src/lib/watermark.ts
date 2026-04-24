import { ExportOptions } from '@/types';
import { loadImage } from './imageUtils';

export async function drawWatermark(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  exportOptions: ExportOptions,
  watermarkUrl?: string
) {
  if (!exportOptions.addWatermark) return;

  const angle = -Math.PI / 6; // -30 degrees
  const baseSize = Math.max(width, height) * 0.05;
  
  let watermarkImg: HTMLImageElement | null = null;
  if (watermarkUrl) {
    try {
      watermarkImg = await loadImage(watermarkUrl);
    } catch (err) {
      console.warn('Failed to load watermark image', err);
    }
  }

  const hasText = !!exportOptions.watermarkText;
  const hasLogo = !!watermarkImg;

  if (!hasText && !hasLogo) return;

  // Calculate dimensions for each tile
  let tileW = 0;
  let tileH = 0;
  let logoW = 0;
  let logoH = 0;

  if (hasLogo && watermarkImg) {
    const maxLogoSize = baseSize * 1.2;
    const scale = Math.min(maxLogoSize / watermarkImg.naturalWidth, maxLogoSize / watermarkImg.naturalHeight);
    logoW = watermarkImg.naturalWidth * scale;
    logoH = watermarkImg.naturalHeight * scale;
  }

  // Text dimensions (approximate)
  const textH = hasText ? baseSize : 0;
  
  // Total tile size for spacing calculation
  tileW = Math.max(logoW, baseSize * 4); // assume text is about 4x baseSize wide
  tileH = logoH + (hasText && hasLogo ? baseSize * 0.5 : 0) + textH;

  ctx.save();
  ctx.globalAlpha = 0.5; // High enough for visibility on all backgrounds
  
  if (hasText) {
    ctx.font = `bold ${baseSize}px sans-serif`;
    ctx.fillStyle = 'white';
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.6)'; // Slightly darker stroke
    ctx.lineWidth = baseSize * 0.06;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
  }

  // Tighter spacing to ensure coverage
  const spacingX = tileW * 1.8;
  const spacingY = tileH * 1.8;

  for (let y = -height; y < height * 2; y += spacingY) {
    const offsetX = (Math.floor(y / spacingY) % 2) * (spacingX / 2);
    for (let x = -width; x < width * 2; x += spacingX) {
      ctx.save();
      ctx.translate(x + offsetX, y);
      ctx.rotate(angle);

      // Add a subtle white glow for the logo to make it pop on dark backgrounds
      if (hasLogo && watermarkImg) {
        ctx.save();
        ctx.shadowColor = 'rgba(255, 255, 255, 0.5)';
        ctx.shadowBlur = 10;
        const logoY = hasText ? -tileH / 2 + logoH / 2 : 0;
        ctx.drawImage(watermarkImg, -logoW / 2, logoY - logoH / 2, logoW, logoH);
        ctx.restore();
      }

      if (hasText) {
        const textY = hasLogo ? tileH / 2 - textH / 2 : 0;
        // Draw stroke first then fill for clean look
        ctx.strokeText(exportOptions.watermarkText!, 0, textY);
        ctx.fillText(exportOptions.watermarkText!, 0, textY);
      }

      ctx.restore();
    }
  }
  ctx.restore();
}

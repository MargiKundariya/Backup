/**
 * Shared gradient parsing and rendering.
 * Eliminates duplication between MockupCanvas (preview) and compositing (export).
 */

interface ParsedGradient {
  angle: number;
  color1: string;
  color2: string;
}

const GRADIENT_RE =
  /linear-gradient\(\s*(\d+)deg\s*,\s*(#[\w]+)\s+\d+%\s*,\s*(#[\w]+)\s+\d+%\s*\)/;

export function parseLinearGradient(css: string): ParsedGradient | null {
  const match = css.match(GRADIENT_RE);
  if (!match) return null;
  return { angle: parseInt(match[1]), color1: match[2], color2: match[3] };
}

/**
 * Draws a linear-gradient CSS string onto a canvas context.
 * Returns true if the gradient was parsed and drawn, false if the CSS is unsupported.
 */
export function drawLinearGradient(
  ctx: CanvasRenderingContext2D,
  css: string,
  width: number,
  height: number
): boolean {
  const parsed = parseLinearGradient(css);
  if (!parsed) return false;

  const angle = parsed.angle * (Math.PI / 180);
  const cx = width / 2;
  const cy = height / 2;
  const len = Math.sqrt(width * width + height * height) / 2;

  const grad = ctx.createLinearGradient(
    cx - Math.cos(angle) * len,
    cy - Math.sin(angle) * len,
    cx + Math.cos(angle) * len,
    cy + Math.sin(angle) * len
  );
  grad.addColorStop(0, parsed.color1);
  grad.addColorStop(1, parsed.color2);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);
  return true;
}

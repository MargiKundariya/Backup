/**
 * filenameTemplate — smart export filename engine
 *
 * Supported tokens:
 *   {brand}        Apple, Samsung, Google …
 *   {model}        iPhone 16 Pro Max
 *   {model-slug}   iphone-16-pro-max
 *   {design}       My Design (original upload name without extension)
 *   {design-slug}  my-design
 *   {scale}        1 | 2
 *   {ext}          png | jpeg | jpg
 *   {date}         YYYY-MM-DD (local date)
 *   {index}        1-based position in a batch (zero-padded to 3 digits if batch > 9)
 */

export interface FilenameContext {
  brand: string;
  model: string;
  design: string;
  scale: number;
  ext: string;
  /** 1-based position in batch */
  index?: number;
  /** Total items in batch — used for zero-padding index */
  total?: number;
}

export interface FilenamePreset {
  id: string;
  label: string;
  pattern: string;
}

export const FILENAME_PRESETS: FilenamePreset[] = [
  { id: 'store',   label: 'Store Listing', pattern: '{brand}-{model-slug}-{design-slug}' },
  { id: 'shopify', label: 'Shopify',       pattern: '{model-slug}_{design-slug}_{scale}x' },
  { id: 'etsy',    label: 'Etsy',          pattern: '{design-slug}-{model-slug}-mockup' },
  { id: 'amazon',  label: 'Amazon',        pattern: '{brand}_{model-slug}_{design-slug}_{index}' },
  { id: 'internal',label: 'Internal',      pattern: '{date}/{brand}/{design-slug}_{model-slug}' },
];

/** Convert a string to a URL/file-safe slug */
export function slugify(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // strip diacritics
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** Format today's date as YYYY-MM-DD */
function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Zero-pad index based on total count */
function padIndex(index: number, total: number): string {
  if (total <= 9) return String(index);
  if (total <= 99) return String(index).padStart(2, '0');
  return String(index).padStart(3, '0');
}

/**
 * Resolve a filename pattern against a context.
 * The file extension is appended automatically — do not include it in the pattern.
 */
export function resolveFilename(pattern: string, ctx: FilenameContext): string {
  const ext = ctx.ext === 'jpeg' ? 'jpg' : ctx.ext;
  const total = ctx.total ?? 1;
  const index = ctx.index ?? 1;

  let resolved = pattern
    .replace(/\{brand\}/g,       ctx.brand)
    .replace(/\{model\}/g,       ctx.model)
    .replace(/\{model-slug\}/g,  slugify(ctx.model))
    .replace(/\{design\}/g,      ctx.design)
    .replace(/\{design-slug\}/g, slugify(ctx.design))
    .replace(/\{scale\}/g,       String(ctx.scale))
    .replace(/\{ext\}/g,         ext)
    .replace(/\{date\}/g,        todayISO())
    .replace(/\{index\}/g,       padIndex(index, total));

  // If this is a batch export and the user didn't include {index} in their pattern,
  // we append it automatically to prevent file name collisions in the ZIP.
  if (total > 1 && !pattern.includes('{index}')) {
    resolved += `-${padIndex(index, total)}`;
  }

  // Sanitise the resolved name (no slashes in the filename portion — only in path components)
  const parts = resolved.split('/');
  const sanitisedParts = parts.map((p) =>
    p.replace(/[<>:"|?*\x00-\x1f]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '') || 'export'
  );

  return `${sanitisedParts.join('/')}.${ext}`;
}

/**
 * Generate a live preview string shown below the pattern input.
 * Uses placeholder values so the user can see the format without real data.
 */
export function previewFilename(pattern: string): string {
  return resolveFilename(pattern, {
    brand: 'Apple',
    model: 'iPhone 16 Pro',
    design: 'Summer Collection',
    scale: 2,
    ext: 'png',
    index: 1,
    total: 20,
  });
}

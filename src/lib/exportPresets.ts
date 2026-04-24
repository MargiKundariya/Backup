/**
 * exportPresets.ts
 * Resolves export resolution and compliance background from ExportOptions.
 *
 * Resolution presets output a square canvas with the device centred at 85% scale.
 * 'auto' keeps the original compositing behaviour (device dims × scale factor).
 */

import type { ExportOptions, ResolutionPreset, ComplianceBackground } from '@/types';

export interface ResolvedExportParams {
  /** Final output canvas size (square for presets, device-native for 'auto') */
  outputSize: number | null;  // null = use 'auto' (device dims × scale)
  /** Background colour override: hex string, 'transparent', or null = use scene */
  bgOverride: string | null;
  /** Whether to skip the scene/custom background */
  ignoreScene: boolean;
}

/** Pixel size for each named preset */
export const PRESET_SIZES: Record<Exclude<ResolutionPreset, 'auto' | 'custom'>, number> = {
  etsy:    2000,
  amazon:  2000,
  shopify: 1024,
};

/** Human-readable labels for the UI */
export const PRESET_LABELS: Record<ResolutionPreset, string> = {
  auto:    'Auto (device size)',
  etsy:    'Etsy — 2000×2000',
  amazon:  'Amazon — 2000×2000',
  shopify: 'Shopify — 1024×1024',
  custom:  'Custom size',
};

/** Max file sizes by preset (bytes). Used for warnings after export. */
export const PRESET_MAX_BYTES: Partial<Record<ResolutionPreset, number>> = {
  amazon: 10 * 1024 * 1024,  // 10 MB
  etsy:   20 * 1024 * 1024,  // 20 MB
};

/** Resolve the effective background colour override from complianceBackground */
export function resolveComplianceBg(complianceBackground: ComplianceBackground): {
  bgOverride: string | null;
  ignoreScene: boolean;
} {
  switch (complianceBackground) {
    case 'white':       return { bgOverride: '#ffffff', ignoreScene: true };
    case 'black':       return { bgOverride: '#000000', ignoreScene: true };
    case 'transparent': return { bgOverride: 'transparent', ignoreScene: true };
    case 'scene':
    default:            return { bgOverride: null, ignoreScene: false };
  }
}

/** Full resolution + background resolution from ExportOptions */
export function resolveExportParams(opts: ExportOptions): ResolvedExportParams {
  const { bgOverride, ignoreScene } = resolveComplianceBg(opts.complianceBackground);

  let outputSize: number | null = null;
  if (opts.resolutionPreset !== 'auto') {
    outputSize = opts.resolutionPreset === 'custom'
      ? Math.max(100, Math.min(8000, opts.customOutputSize))
      : PRESET_SIZES[opts.resolutionPreset];
  }

  return { outputSize, bgOverride, ignoreScene };
}

/** File size warning message for the resolved preset, or null if no limit */
export function fileSizeWarning(preset: ResolutionPreset, bytes: number): string | null {
  const limit = PRESET_MAX_BYTES[preset];
  if (!limit || bytes <= limit) return null;
  const mb = (bytes / 1024 / 1024).toFixed(1);
  const limitMb = (limit / 1024 / 1024).toFixed(0);
  return `File is ${mb} MB — ${preset === 'amazon' ? 'Amazon' : 'Etsy'} limit is ${limitMb} MB. Try reducing quality or scale.`;
}

import { Transform } from '@/types';
import { safeLocalStorageGet, safeLocalStorageSet } from './safeImageLoader';

export interface TransformPreset {
  id: string;
  name: string;
  transform: Partial<Transform>;
  builtIn?: boolean;
}

const STORAGE_KEY = 'skinmockup-presets';

export function getSavedPresets(): TransformPreset[] {
  return safeLocalStorageGet<TransformPreset[]>(STORAGE_KEY, []);
}

export function savePreset(preset: TransformPreset): void {
  const existing = getSavedPresets();
  existing.push(preset);
  safeLocalStorageSet(STORAGE_KEY, existing);
}

export function deletePreset(id: string): void {
  const existing = getSavedPresets().filter((p) => p.id !== id);
  safeLocalStorageSet(STORAGE_KEY, existing);
}

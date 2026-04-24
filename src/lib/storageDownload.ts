/**
 * storageDownload — retrieves design zone images from the local storage.
 *
 * Uses an in-memory LRU cache (max 50 images) keyed by storagePath to avoid
 * redundant fetches within the same browser session.
 */

const MAX_CACHE = 50;

// LRU cache: storagePath → data URL
const cache = new Map<string, string>();
const cacheOrder: string[] = [];

function lruGet(key: string): string | undefined {
  const val = cache.get(key);
  if (val !== undefined) {
    const idx = cacheOrder.indexOf(key);
    if (idx !== -1) cacheOrder.splice(idx, 1);
    cacheOrder.push(key); // promote to MRU
  }
  return val;
}

function lruSet(key: string, value: string): void {
  if (cache.has(key)) {
    const idx = cacheOrder.indexOf(key);
    if (idx !== -1) cacheOrder.splice(idx, 1);
  } else if (cache.size >= MAX_CACHE) {
    const oldest = cacheOrder.shift();
    if (oldest) cache.delete(oldest);
  }
  cache.set(key, value);
  cacheOrder.push(key);
}

/** Clear the in-memory cache (e.g. on sign-out). */
export function clearStorageCache(): void {
  cache.clear();
  cacheOrder.length = 0;
}

/**
 * Downloads zone images from local storage URLs and returns data URLs.
 *
 * @param zoneStoragePaths - map of zoneId → public URL (/uploads/...)
 * @returns map of zoneId → data URL (missing keys omitted on error)
 */
export async function downloadZoneImages(
  zoneStoragePaths: Record<string, string>,
): Promise<Record<string, string>> {
  const result: Record<string, string> = {};

  await Promise.all(
    Object.entries(zoneStoragePaths).map(async ([zoneId, storagePath]) => {
      // Check LRU cache first
      const cached = lruGet(storagePath);
      if (cached) {
        result[zoneId] = cached;
        return;
      }

      // Fetch and convert to data URL so the canvas can use it
      const response = await fetch(storagePath);
      if (!response.ok) {
        console.warn('[Storage] fetch failed for', storagePath, response.status);
        return;
      }
      const blob = await response.blob();
      const dataUrl = await blobToDataUrl(blob);

      lruSet(storagePath, dataUrl);
      result[zoneId] = dataUrl;
    }),
  );

  return result;
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

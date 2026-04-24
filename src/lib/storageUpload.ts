/**
 * storageUpload — uploads design zone images to the local storage API.
 * Layout: users/{userId}/designs/{designId}/{zoneId}.webp
 * Returns the public URL for later retrieval.
 */

/**
 * Uploads a single zone image (data URL) to the local backend.
 */
export async function uploadZoneImage(
  userId: string,
  designId: string,
  zoneId: string,
  dataUrl: string,
): Promise<string> {
  // Convert data URL → Blob via native fetch
  const response = await fetch(dataUrl);
  const blob = await response.blob();

  const storagePath = `users/${userId}/designs/${designId}/${zoneId}.webp`;

  const formData = new FormData();
  formData.append('file', blob);
  formData.append('path', storagePath);

  const res = await fetch('/api/storage/upload', {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    const { error } = await res.json();
    throw new Error(error || 'Upload failed');
  }

  const { path } = await res.json();
  return path;
}

/**
 * Deletes all zone images for a design.
 * (Not currently implemented in the local storage backend, but kept for signature compatibility)
 */
export async function deleteDesignImages(
  userId: string,
  designId: string,
): Promise<void> {
  // TODO: Implement DELETE /api/storage/delete-folder
  console.warn('deleteDesignImages not yet implemented for local storage');
}

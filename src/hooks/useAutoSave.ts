'use client';

/**
 * useAutoSave
 * Watches editor state and debounce-saves to the backend.
 *
 * Flow:
 *   1. On first change: create project (if needed) + design row → get IDs.
 *   2. Upload new / changed zone images to Supabase Storage.
 *   3. Save zone_designs metadata (transform, textLayers, storageKey) to DB.
 *   4. On subsequent changes: PATCH the existing design row.
 *
 * Suppressed while useDesignLoader is restoring a design (isLoadingDesign).
 * Only activates when the user is authenticated (session != null).
 */

import { useEffect, useRef } from 'react';
import { useEditorStore } from '@/lib/store';
import { getBrowserClient, isSupabaseConfigured } from '@/lib/supabase';
import { uploadZoneImage } from '@/lib/storageUpload';
import { captureException } from '@/lib/analytics';

const DEBOUNCE_MS = 2000;

// Per-zone tracking of what's already uploaded so we skip unchanged images
interface SavedImage {
  dataUrl: string;
  storageKey: string;
}

export function useAutoSave() {
  const selectedDevice = useEditorStore((s) => s.selectedDevice);
  const zoneDesigns = useEditorStore((s) => s.zoneDesigns);
  const exportOptions = useEditorStore((s) => s.exportOptions);
  const currentDesignId = useEditorStore((s) => s.currentDesignId);
  const currentProjectId = useEditorStore((s) => s.currentProjectId);
  const setCurrentDesignId = useEditorStore((s) => s.setCurrentDesignId);
  const setCurrentProjectId = useEditorStore((s) => s.setCurrentProjectId);
  const setSaveState = useEditorStore((s) => s.setSaveState);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const currentDesignIdRef = useRef(currentDesignId);
  const currentProjectIdRef = useRef(currentProjectId);
  // Tracks successfully uploaded images to avoid re-uploading unchanged data URLs
  const savedImagesRef = useRef<Record<string, SavedImage>>({});

  currentDesignIdRef.current = currentDesignId;
  currentProjectIdRef.current = currentProjectId;

  useEffect(() => {
    if (!selectedDevice) return;

    if (timerRef.current) clearTimeout(timerRef.current);

    timerRef.current = setTimeout(async () => {
      // Don't save while design loader is restoring state
      if (useEditorStore.getState().isLoadingDesign) return;

      // Skip silently when Supabase isn't configured (local-only mode)
      if (!isSupabaseConfigured()) return;

      const sb = getBrowserClient();
      const { data: { user } } = await sb.auth.getUser();
      if (!user) return;

      setSaveState('saving');

      try {
        let designId = currentDesignIdRef.current;
        let projectId = currentProjectIdRef.current;

        // ── 1. Ensure project + design rows exist ─────────────────────────────
        if (!projectId) {
          const { data: proj, error: projErr } = await sb
            .from('projects')
            .insert({ user_id: user.id, name: 'My Project' })
            .select('id')
            .single();
          if (projErr) throw projErr;
          projectId = proj.id;
          setCurrentProjectId(projectId);
        }

        if (!designId) {
          // Create row first (empty zone_designs) to get the ID for Storage paths
          const { data: design, error: designErr } = await sb
            .from('designs')
            .insert({
              user_id: user.id,
              project_id: projectId,
              name: selectedDevice.name,
              device_id: selectedDevice.id,
              zone_designs: {},
              export_options: exportOptions,
            })
            .select('id')
            .single();
          if (designErr) throw designErr;
          designId = design.id;
          setCurrentDesignId(designId);
        }

        // ── 2. Upload new / changed zone images ───────────────────────────────
        const storageKeys: Record<string, string> = {};
        const currentZoneDesigns = useEditorStore.getState().zoneDesigns;

        await Promise.allSettled(
          Object.entries(currentZoneDesigns).map(async ([zoneId, design]) => {
            if (!design.designImage) return;

            const saved = savedImagesRef.current[zoneId];
            if (saved && saved.dataUrl === design.designImage) {
              // Unchanged — reuse existing storage key
              storageKeys[zoneId] = saved.storageKey;
              return;
            }

            // New or changed image — upload to Storage
            const storageKey = await uploadZoneImage(
              user.id,
              designId!,
              zoneId,
              design.designImage,
            );
            storageKeys[zoneId] = storageKey;
            savedImagesRef.current[zoneId] = {
              dataUrl: design.designImage,
              storageKey,
            };
          }),
        );

        // ── 3. Build zone_designs metadata (no raw data URLs) ─────────────────
        const zoneDesignsMeta: Record<string, unknown> = {};
        for (const [id, design] of Object.entries(currentZoneDesigns)) {
          zoneDesignsMeta[id] = {
            transform: design.transform,
            textLayers: design.textLayers,
            storageKey: storageKeys[id] ?? null,
          };
        }

        // ── 4. Persist design row ─────────────────────────────────────────────
        const { error } = await sb
          .from('designs')
          .update({
            zone_designs: zoneDesignsMeta,
            export_options: exportOptions,
            device_id: selectedDevice.id,
            name: selectedDevice.name,
          })
          .eq('id', designId);
        if (error) throw error;

        setSaveState('saved');
        setTimeout(() => setSaveState('idle'), 2000);
      } catch (err) {
        console.error('[AutoSave]', err);
        captureException(err);
        setSaveState('error');
      }
    }, DEBOUNCE_MS);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [selectedDevice, zoneDesigns, exportOptions]); // eslint-disable-line react-hooks/exhaustive-deps
}

'use client';

import { useEffect, useRef, useState } from 'react';
import { useEditorStore } from '@/lib/store';
import { downloadZoneImages } from '@/lib/storageDownload';
import { useTemplateStore } from '@/lib/templateStore';
import { captureException } from '@/lib/analytics';
import type { Transform, TextLayer } from '@/types';

interface SavedZoneMeta {
  transform?: Transform;
  textLayers?: TextLayer[];
  storageKey?: string | null;
}

export function useDesignLoader() {
  const currentDesignId = useEditorStore((s) => s.currentDesignId);
  const setCurrentProjectId = useEditorStore((s) => s.setCurrentProjectId);
  const selectDevice = useEditorStore((s) => s.selectDevice);
  const restoreZoneDesign = useEditorStore((s) => s.restoreZoneDesign);
  const setExportOptions = useEditorStore((s) => s.setExportOptions);
  const setIsLoadingDesign = useEditorStore((s) => s.setIsLoadingDesign);

  const { customDevices: allDevices, loadCustomDevices } = useTemplateStore();

  const [loading, setLoading] = useState(false);
  const loadedIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!currentDesignId || loadedIdRef.current === currentDesignId) return;

    let cancelled = false;

    async function load() {
      setLoading(true);
      setIsLoadingDesign(true);

      try {
        // Ensure devices are loaded
        if (allDevices.length === 0) {
          await loadCustomDevices();
        }

        const res = await fetch(`/api/designs/${currentDesignId}`);
        if (!res.ok) throw new Error('Failed to load design');
        
        const { design } = await res.json();
        if (cancelled) return;

        // Restore project context
        setCurrentProjectId(design.project_id);

        // Restore device selection - re-get after load
        const latestDevices = useTemplateStore.getState().customDevices;
        const device = latestDevices.find((d) => d.id === design.device_id);
        if (device) selectDevice(device);

        // Parse saved zone metadata (storageKey is now a public URL path)
        const zoneMeta = (design.zone_designs ?? {}) as Record<string, SavedZoneMeta>;

        const storagePaths: Record<string, string> = {};
        for (const [zoneId, meta] of Object.entries(zoneMeta)) {
          if (meta.storageKey) storagePaths[zoneId] = meta.storageKey;
        }

        // Hydrate images
        const images = Object.keys(storagePaths).length > 0
          ? await downloadZoneImages(storagePaths)
          : {};

        if (cancelled) return;

        // Hydrate each zone
        for (const [zoneId, meta] of Object.entries(zoneMeta)) {
          restoreZoneDesign(zoneId, {
            designImage: images[zoneId] ?? null,
            transform: meta.transform ?? { x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0 },
            textLayers: meta.textLayers ?? [],
          });
        }

        if (design.export_options) {
          setExportOptions(design.export_options);
        }

        loadedIdRef.current = currentDesignId!;
      } catch (err) {
        console.error('[DesignLoader]', err);
        captureException(err);
      } finally {
        if (!cancelled) {
          setLoading(false);
          setIsLoadingDesign(false);
        }
      }
    }

    load();

    return () => { cancelled = true; };
  }, [currentDesignId]);

  return { loading };
}

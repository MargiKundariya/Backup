import { create } from 'zustand';
import {
  DeviceTemplate,
  TextLayer,
  Transform,
  ZoneDesign,
  ExportOptions,
  SkinZone,
} from '@/types';
import { sanitizeTransform } from './safeImageLoader';
import { calculateFit, FitMode } from './imageFitting';

interface HistoryEntry {
  zoneDesigns: Record<string, ZoneDesign>;
  label: string;
  timestamp: number;
}

interface EditorState {
  // Device
  selectedDevice: DeviceTemplate | null;
  selectedDevices: DeviceTemplate[];
  activeZoneId: string | null;

  // Per-device image assignment
  deviceImageMap: Record<string, number>;
  activePreviewDeviceId: string | null;

  // Per-zone designs
  zoneDesigns: Record<string, ZoneDesign>;

  // Background
  backgroundScene: string | null;
  customBackgroundImage: string | null;
  backgroundSize: 'autofit' | 'cover' | 'contain' | 'custom';
  backgroundScale: number;

  // Export
  exportOptions: ExportOptions;

  // Active fit mode for visual indicator
  activeFitMode: 'cover' | 'contain' | 'stretch' | 'fit-width' | 'fit-height';

  // History (undo/redo)
  history: HistoryEntry[];
  historyIndex: number;

  // Design queue
  designQueue: { name: string; dataUrl: string }[];

  // Bulk staging mode
  bulkStagingActive: boolean;
  bulkStagingDesignName: string | null;
  bulkStagingIndex: number | null;
  bulkStagingTotal: number | null;
  stagingNavCallback: ((direction: 'prev' | 'next' | 'capture' | 'exit') => void) | null;

  // Actions
  selectDevice: (device: DeviceTemplate) => void;
  setSelectedDevices: (devices: DeviceTemplate[]) => void;
  addSelectedDevice: (device: DeviceTemplate) => void;
  removeSelectedDevice: (deviceId: string) => void;
  setActiveZone: (zoneId: string | null) => void;
  setDesignImage: (zoneId: string, dataUrl: string, deviceOverride?: DeviceTemplate) => void;
  updateDesignTransform: (zoneId: string, transform: Partial<Transform>) => void;
  fitDesignToZone: (zoneId: string, mode?: 'cover' | 'contain' | 'stretch' | 'fit-width' | 'fit-height') => void;
  removeDesign: (zoneId: string) => void;
  applyDesignToAllZones: () => void;

  // Device-image assignment actions
  setDeviceImageAssignment: (deviceId: string, imageIdx: number) => void;
  clearDeviceImageAssignment: (deviceId: string) => void;
  assignImageToAllDevices: (imageIdx: number) => void;
  setActivePreviewDevice: (deviceId: string | null) => void;
  getImageForDevice: (deviceId: string) => string;

  // Text
  addTextLayer: (zoneId: string, text: TextLayer) => void;
  updateTextLayer: (zoneId: string, textId: string, updates: Partial<TextLayer>) => void;
  updateTextLayerTransform: (zoneId: string, textId: string, transform: Partial<Transform>) => void;
  removeTextLayer: (zoneId: string, textId: string) => void;

  // Background
  setBackground: (sceneId: string | null) => void;
  setCustomBackgroundImage: (dataUrl: string | null) => void;
  setBackgroundSize: (size: 'autofit' | 'cover' | 'contain' | 'custom') => void;
  setBackgroundScale: (scale: number) => void;

  // Export
  setExportOptions: (options: Partial<ExportOptions>) => void;

  // History
  undo: () => void;
  redo: () => void;
  pushHistory: (label?: string) => void;

  // Design queue
  addToDesignQueue: (designs: { name: string; dataUrl: string }[]) => void;
  removeFromDesignQueue: (index: number) => void;
  clearDesignQueue: () => void;
  setDesignQueue: (queue: { name: string; dataUrl: string }[]) => void;
  reorderDesignQueue: (fromIndex: number, toIndex: number) => void;

  // Bulk staging
  setBulkStaging: (active: boolean, opts?: { designName?: string; index?: number; total?: number }) => void;
  restoreZoneDesign: (zoneId: string, design: ZoneDesign) => void;
  setStagingCallback: (fn: (direction: 'prev' | 'next' | 'capture' | 'exit') => void) => void;
  clearStagingCallback: () => void;

  // Persistence
  currentDesignId: string | null;
  currentProjectId: string | null;
  setCurrentDesignId: (id: string | null) => void;
  setCurrentProjectId: (id: string | null) => void;

  // Save state indicator
  saveState: 'idle' | 'saving' | 'saved' | 'error';
  setSaveState: (state: 'idle' | 'saving' | 'saved' | 'error') => void;

  // Loading flag
  isLoadingDesign: boolean;
  setIsLoadingDesign: (loading: boolean) => void;

  // Sidebar navigation
  activeSidebarSection: string | null;
  setActiveSidebarSection: (sectionId: string | null) => void;

  // Reset
  reset: () => void;
}

const defaultTransform: Transform = {
  x: 0,
  y: 0,
  scaleX: 1,
  scaleY: 1,
  rotation: 0,
};

const defaultZoneDesign: ZoneDesign = {
  designImage: null,
  transform: { ...defaultTransform },
  textLayers: [],
};

const defaultExportOptions: ExportOptions = {
  format: 'png',
  quality: 1,
  scale: 1,
  includeBackground: true,
  filenamePattern: '{device}_{design}',
  resolutionPreset: 'auto',
  customOutputSize: 3000,
  complianceBackground: 'scene',
  addWatermark: false,
};

const loadImage = (src: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });

/**
 * Compute the fit transform for an image inside a zone, potentially relative to the whole device.
 * Returns a Promise that resolves once the image has loaded.
 * All transforms produced are DEVICE-RELATIVE.
 */
async function computeFitTransform(
  dataUrl: string,
  zone: SkinZone,
  device: DeviceTemplate,
  mode: FitMode = 'cover',
  useDeviceDimensions = true
): Promise<Transform> {
  const [img, templateImg] = await Promise.all([
    loadImage(dataUrl),
    useDeviceDimensions ? loadImage(device.templatePath).catch(() => null) : Promise.resolve(null)
  ]);

  // Use actual template dimensions if available, fallback to device metadata, then to zone bounds
  const targetW = templateImg?.naturalWidth || device.dimensions?.width || zone.bounds.width;
  const targetH = templateImg?.naturalHeight || device.dimensions?.height || zone.bounds.height;
  
  // If we used the whole template, origin is (0,0). If we fell back to zone, origin is (x,y).
  const originX = (templateImg || (useDeviceDimensions && device.dimensions?.width)) ? 0 : zone.bounds.x;
  const originY = (templateImg || (useDeviceDimensions && device.dimensions?.height)) ? 0 : zone.bounds.y;

  const fit = calculateFit(
    targetW,
    targetH,
    img.naturalWidth,
    img.naturalHeight,
    mode
  );

  return {
    x: originX + fit.offsetX,
    y: originY + fit.offsetY,
    scaleX: fit.scaleX,
    scaleY: fit.scaleY,
    rotation: 0,
  };
}

export const useEditorStore = create<EditorState>((set, get) => ({
  selectedDevice: null,
  selectedDevices: [],
  activeZoneId: null,

  deviceImageMap: {},
  activePreviewDeviceId: null,

  zoneDesigns: {},
  backgroundScene: 'white',
  customBackgroundImage: null,
  backgroundSize: 'autofit',
  backgroundScale: 100,
  exportOptions: { ...defaultExportOptions },
  activeFitMode: 'cover',
  history: [],
  historyIndex: -1,
  designQueue: [],
  bulkStagingActive: false,
  bulkStagingDesignName: null,
  bulkStagingIndex: null,
  bulkStagingTotal: null,
  stagingNavCallback: null,
  currentDesignId: null,
  currentProjectId: null,
  saveState: 'idle',
  isLoadingDesign: false,
  activeSidebarSection: 'device',

  // ── Device selection ────────────────────────────────────────────────────

  selectDevice: (device) => {
    const state = get();
    if (state.selectedDevice?.id === device.id) return;

    const zoneDesigns: Record<string, ZoneDesign> = {};
    device.zones.forEach((zone) => {
      zoneDesigns[zone.id] =
        state.zoneDesigns[zone.id] || {
          ...defaultZoneDesign,
          transform: { ...defaultTransform },
          textLayers: [],
        };
    });

    set({
      selectedDevice: device,
      activeZoneId: device.zones[0]?.id || null,
      zoneDesigns,
    });
  },

  setSelectedDevices: (devices) => {
    set({
      selectedDevices: devices,
      deviceImageMap: {},
      activePreviewDeviceId: devices[0]?.id ?? null,
    });
  },

  addSelectedDevice: (device) => {
    const current = get().selectedDevices;
    if (current.find((d) => d.id === device.id)) return;
    set({ selectedDevices: [...current, device] });
  },

  removeSelectedDevice: (deviceId) => {
    const next = get().selectedDevices.filter((d) => d.id !== deviceId);
    const map = { ...get().deviceImageMap };
    delete map[deviceId];
    const activePrev = get().activePreviewDeviceId;
    set({
      selectedDevices: next,
      deviceImageMap: map,
      activePreviewDeviceId:
        activePrev === deviceId ? (next[0]?.id ?? null) : activePrev,
    });
  },

  // ── Device-image assignment ─────────────────────────────────────────────

  setDeviceImageAssignment: (deviceId, imageIdx) => {
    if (imageIdx === -1) {
      get().clearDeviceImageAssignment(deviceId);
      return;
    }

    set((s) => ({
      deviceImageMap: { ...s.deviceImageMap, [deviceId]: imageIdx },
    }));

    const state = get();
    const image = state.designQueue[imageIdx];
    if (!image) return;

    // If this device is the currently-selected (primary) device, update the zone too
    if (state.selectedDevice?.id === deviceId) {
      const zoneId = state.activeZoneId;
      if (zoneId) state.setDesignImage(zoneId, image.dataUrl);
    }
  },

  clearDeviceImageAssignment: (deviceId) => {
    set((s) => {
      const next = { ...s.deviceImageMap };
      delete next[deviceId];
      return { deviceImageMap: next };
    });
  },

  assignImageToAllDevices: (imageIdx) => {
    const state = get();
    const devices =
      state.selectedDevices.length > 0
        ? state.selectedDevices
        : state.selectedDevice
        ? [state.selectedDevice]
        : [];

    if (devices.length === 0) return;

    const map: Record<string, number> = {};
    devices.forEach((d) => {
      if (d?.id) map[d.id] = imageIdx;
    });

    set({ deviceImageMap: map });

    // Apply to the canvas zone for the primary device
    const image = state.designQueue[imageIdx];
    if (image && state.activeZoneId) {
      state.setDesignImage(state.activeZoneId, image.dataUrl);
    }
  },

  /**
   * Switch the active preview device AND immediately apply whatever image is
   * assigned to it so the canvas reflects the correct design.
   */
  setActivePreviewDevice: (deviceId) => {
    const state = get();
    set({ activePreviewDeviceId: deviceId });

    if (!deviceId) return;

    // Find the device object
    const device =
      state.selectedDevices.find((d) => d.id === deviceId) ??
      (state.selectedDevice?.id === deviceId ? state.selectedDevice : null);

    if (!device) return;

    const zone = device.zones[0];
    if (!zone) return;

    // Switch selected device + active zone first
    set({
      selectedDevice: device,
      activeZoneId: zone.id,
    });

    // Now apply the assigned image (if any) using a fresh state read
    const freshState = get();
    const imageIdx = freshState.deviceImageMap[deviceId];
    if (imageIdx === undefined) return;

    const image = freshState.designQueue[imageIdx];
    if (!image) return;

    // Pass the device explicitly so setDesignImage uses the correct zone bounds
    freshState.setDesignImage(zone.id, image.dataUrl, device);
  },

  getImageForDevice: (deviceId) => {
    const state = get();
    const idx = state.deviceImageMap[deviceId];
    if (idx === undefined) return '';
    return state.designQueue[idx]?.dataUrl ?? '';
  },

  // ── Zone design ─────────────────────────────────────────────────────────

  setActiveZone: (zoneId) => set({ activeZoneId: zoneId }),

  /**
   * Load a design image into a zone.
   *
   * @param zoneId         - target zone id
   * @param dataUrl        - image data URL
   * @param deviceOverride - optional device to use for zone-bounds lookup
   *                         (useful when selectedDevice hasn't been committed
   *                          to state yet, e.g. during setActivePreviewDevice)
   */
  setDesignImage: (zoneId, dataUrl, deviceOverride) => {
    const state = get();
    const targetZoneId = zoneId;
    const targetDataUrl = dataUrl;

    const currentDesign = state.zoneDesigns[targetZoneId];
    if (currentDesign?.designImage === targetDataUrl) return;

    state.pushHistory('Load design');

    // Set initial state with identity transform and active fit mode
    set((s) => ({
      activeFitMode: 'cover',
      zoneDesigns: {
        ...s.zoneDesigns,
        [targetZoneId]: {
          ...(s.zoneDesigns[targetZoneId] ?? defaultZoneDesign),
          designImage: targetDataUrl,
          transform: { ...defaultTransform }, // Reset to identity first
          textLayers: s.zoneDesigns[targetZoneId]?.textLayers ?? [],
        },
      },
    }));

    // Resolve the device and zone
    const device = deviceOverride ?? get().selectedDevice;
    const zone = device?.zones.find((z) => z.id === targetZoneId);
    if (!zone || !device) return;

    // Load image to get dimensions and compute "Cover" transform (device-relative)
    computeFitTransform(targetDataUrl, zone, device, 'cover')
      .then((transform) => {
        set((s) => {
          const design = s.zoneDesigns[targetZoneId];
          if (design?.designImage !== targetDataUrl) return {};
          return {
            zoneDesigns: {
              ...s.zoneDesigns,
              [targetZoneId]: { ...design, transform },
            },
          };
        });
      })
      .catch((err) => console.error('[store] Initial fit failed:', err));
  },

  updateDesignTransform: (zoneId, transform) => {
    const state = get();
    const current = state.zoneDesigns[zoneId];
    if (!current) return;
    const safe = sanitizeTransform(transform as Record<string, unknown>);
    set({
      zoneDesigns: {
        ...state.zoneDesigns,
        [zoneId]: {
          ...current,
          transform: { ...current.transform, ...safe },
        },
      },
    });
  },

  fitDesignToZone: (zoneId, mode = 'cover') => {
    const state = get();
    const device = state.selectedDevice;
    if (!device) return;

    const zone = device.zones.find((z) => z.id === zoneId);
    if (!zone) return;

    const designUrl = state.zoneDesigns[zoneId]?.designImage;
    if (!designUrl) return;

    set({ activeFitMode: mode });
    state.pushHistory('Fit design');

    const targetZoneId = zoneId;
    const targetDataUrl = designUrl;

    // Use device dimensions for cover/contain to ensure full coverage
    const useDeviceDimensions = mode === 'cover' || mode === 'contain';

    computeFitTransform(
      targetDataUrl,
      zone,
      device,
      mode,
      useDeviceDimensions
    )
      .then((transform) => {
        set((s) => {
          const currentDesign = s.zoneDesigns[targetZoneId];
          if (currentDesign?.designImage !== targetDataUrl) return {};
          return {
            zoneDesigns: {
              ...s.zoneDesigns,
              [targetZoneId]: {
                ...currentDesign,
                transform,
              },
            },
          };
        });
      })
      .catch((err) => console.error('[store] Fit design failed:', err));
  },

  removeDesign: (zoneId) => {
    const state = get();
    state.pushHistory('Remove design');
    set({
      zoneDesigns: {
        ...state.zoneDesigns,
        [zoneId]: {
          ...defaultZoneDesign,
          transform: { ...defaultTransform },
          textLayers: [],
        },
      },
    });
  },

  applyDesignToAllZones: () => {
    const state = get();
    const { selectedDevice, activeZoneId, zoneDesigns } = state;

    if (!selectedDevice || !activeZoneId) return;

    const sourceDesign = zoneDesigns[activeZoneId];
    if (!sourceDesign?.designImage) return;

    state.pushHistory('Apply to all zones');

    const sourceDataUrl = sourceDesign.designImage;

    for (const zone of selectedDevice.zones) {
      if (zone.id === activeZoneId) continue;

      const targetZoneId = zone.id;

      // Immediately set the image
      set((s) => ({
        zoneDesigns: {
          ...s.zoneDesigns,
          [targetZoneId]: {
            ...(s.zoneDesigns[targetZoneId] ?? defaultZoneDesign),
            designImage: sourceDataUrl,
            transform: { ...defaultTransform },
            textLayers: [],
          },
        },
      }));

      // Then compute the correct cover transform (device-wide)
      computeFitTransform(sourceDataUrl, zone, selectedDevice, 'cover')
        .then((transform) => {
          set((s) => {
            const currentDesign = s.zoneDesigns[targetZoneId];
            if (currentDesign?.designImage !== sourceDataUrl) return {};
            return {
              zoneDesigns: {
                ...s.zoneDesigns,
                [targetZoneId]: {
                  ...currentDesign,
                  transform,
                },
              },
            };
          });
        })
        .catch((err) => console.error('[store] Apply all fit failed:', err));
    }
  },

  // ── Text layers ─────────────────────────────────────────────────────────

  addTextLayer: (zoneId, text) => {
    const state = get();
    const current = state.zoneDesigns[zoneId];
    if (!current) return;
    state.pushHistory('Add text');
    set({
      zoneDesigns: {
        ...state.zoneDesigns,
        [zoneId]: {
          ...current,
          textLayers: [...current.textLayers, text],
        },
      },
    });
  },

  updateTextLayer: (zoneId, textId, updates) => {
    const state = get();
    const current = state.zoneDesigns[zoneId];
    if (!current) return;
    set({
      zoneDesigns: {
        ...state.zoneDesigns,
        [zoneId]: {
          ...current,
          textLayers: current.textLayers.map((t) =>
            t.id === textId ? { ...t, ...updates } : t
          ),
        },
      },
    });
  },

  updateTextLayerTransform: (zoneId, textId, transform) => {
    const state = get();
    const current = state.zoneDesigns[zoneId];
    if (!current) return;
    set({
      zoneDesigns: {
        ...state.zoneDesigns,
        [zoneId]: {
          ...current,
          textLayers: current.textLayers.map((t) =>
            t.id === textId
              ? { ...t, transform: { ...t.transform, ...transform } }
              : t
          ),
        },
      },
    });
  },

  removeTextLayer: (zoneId, textId) => {
    const state = get();
    const current = state.zoneDesigns[zoneId];
    if (!current) return;
    state.pushHistory('Remove text');
    set({
      zoneDesigns: {
        ...state.zoneDesigns,
        [zoneId]: {
          ...current,
          textLayers: current.textLayers.filter((t) => t.id !== textId),
        },
      },
    });
  },

  // ── Background ──────────────────────────────────────────────────────────

  setBackground: (sceneId) =>
    set({ backgroundScene: sceneId, customBackgroundImage: null }),

  setCustomBackgroundImage: (dataUrl) =>
    set({
      customBackgroundImage: dataUrl,
      backgroundScene: dataUrl ? 'custom' : 'white',
      backgroundSize: 'autofit',
    }),

  setBackgroundSize: (size) => set({ backgroundSize: size }),
  setBackgroundScale: (scale) => set({ backgroundScale: scale }),

  // ── Export ──────────────────────────────────────────────────────────────

  setExportOptions: (options) =>
    set({ exportOptions: { ...get().exportOptions, ...options } }),

  // ── History ─────────────────────────────────────────────────────────────

  undo: () => {
    const { history, historyIndex } = get();
    if (historyIndex < 0) return;
    const entry = history[historyIndex];
    set({ zoneDesigns: entry.zoneDesigns, historyIndex: historyIndex - 1 });
  },

  redo: () => {
    const { history, historyIndex } = get();
    if (historyIndex >= history.length - 1) return;
    const entry = history[historyIndex + 1];
    set({ zoneDesigns: entry.zoneDesigns, historyIndex: historyIndex + 1 });
  },

  pushHistory: (label = 'Edit') => {
    const { zoneDesigns, history, historyIndex } = get();
    const newHistory = history.slice(0, historyIndex + 1);
    const snapshot: Record<string, ZoneDesign> = {};

    for (const [id, design] of Object.entries(zoneDesigns)) {
      snapshot[id] = {
        designImage: design.designImage,
        transform: { ...design.transform },
        textLayers: (design.textLayers || []).map((t) => ({
          ...t,
          transform: { ...t.transform },
        })),
      };
    }

    newHistory.push({ zoneDesigns: snapshot, label, timestamp: Date.now() });
    if (newHistory.length > 30) newHistory.shift();
    set({ history: newHistory, historyIndex: newHistory.length - 1 });
  },

  // ── Design queue ────────────────────────────────────────────────────────

  addToDesignQueue: (designs) => {
    const current = get().designQueue;
    const remaining = 50 - current.length;
    if (remaining <= 0) return;
    set({ designQueue: [...current, ...designs.slice(0, remaining)] });
  },

  removeFromDesignQueue: (index) => {
    const map = { ...get().deviceImageMap };
    for (const [deviceId, idx] of Object.entries(map)) {
      if (idx === index) {
        delete map[deviceId];
      } else if (idx > index) {
        map[deviceId] = idx - 1;
      }
    }
    set({
      designQueue: get().designQueue.filter((_, i) => i !== index),
      deviceImageMap: map,
    });
  },

  clearDesignQueue: () => set({ designQueue: [], deviceImageMap: {} }),

  setDesignQueue: (queue) => set({ designQueue: queue }),

  reorderDesignQueue: (fromIndex, toIndex) => {
    const queue = [...get().designQueue];
    const [item] = queue.splice(fromIndex, 1);
    queue.splice(toIndex, 0, item);

    const map = { ...get().deviceImageMap };
    for (const [deviceId, idx] of Object.entries(map)) {
      if (idx === fromIndex) {
        map[deviceId] = toIndex;
      } else if (fromIndex < toIndex && idx > fromIndex && idx <= toIndex) {
        map[deviceId] = idx - 1;
      } else if (fromIndex > toIndex && idx >= toIndex && idx < fromIndex) {
        map[deviceId] = idx + 1;
      }
    }

    set({ designQueue: queue, deviceImageMap: map });
  },

  // ── Bulk staging ────────────────────────────────────────────────────────

  setBulkStaging: (active, opts) =>
    set({
      bulkStagingActive: active,
      bulkStagingDesignName: opts?.designName ?? null,
      bulkStagingIndex: opts?.index ?? null,
      bulkStagingTotal: opts?.total ?? null,
    }),

  restoreZoneDesign: (zoneId, design) => {
    set({ zoneDesigns: { ...get().zoneDesigns, [zoneId]: design } });
  },

  setStagingCallback: (fn) => set({ stagingNavCallback: fn }),
  clearStagingCallback: () => set({ stagingNavCallback: null }),

  // ── Persistence ─────────────────────────────────────────────────────────

  setCurrentDesignId: (id) => set({ currentDesignId: id }),
  setCurrentProjectId: (id) => set({ currentProjectId: id }),
  setSaveState: (state) => set({ saveState: state }),
  setIsLoadingDesign: (loading) => set({ setIsLoadingDesign: loading }),

  // ── Sidebar navigation ──────────────────────────────────────────────────
  setActiveSidebarSection: (id) => set({ activeSidebarSection: id }),

  // ── Reset ────────────────────────────────────────────────────────────────

  reset: () =>
    set({
      selectedDevice: null,
      selectedDevices: [],
      activeZoneId: null,
      zoneDesigns: {},
      backgroundScene: 'white',
      customBackgroundImage: null,
      designQueue: [],
      deviceImageMap: {},
      activePreviewDeviceId: null,
      history: [],
      historyIndex: -1,
      bulkStagingActive: false,
      bulkStagingDesignName: null,
      bulkStagingIndex: null,
      bulkStagingTotal: null,
      stagingNavCallback: null,
      currentDesignId: null,
      currentProjectId: null,
      saveState: 'idle',
      isLoadingDesign: false,
    }),
}));
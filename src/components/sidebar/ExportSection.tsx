'use client';

import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { useEditorStore } from '@/lib/store';
import { useTemplateStore } from '@/lib/templateStore';
import { bulkExport, exportSingle, BulkExportJob, BulkExportProgress } from '@/lib/bulkExport';
import { Button } from '@/components/ui/Button';
import { backgroundScenes } from '@/data/backgrounds';
import { toast } from '@/components/ui/Toast';
import { ZoneDesign, PerDesignTransform } from '@/types';
import {
  Download, Package, Eye, Crosshair, CircleCheck, X,
  ChevronDown, CopyCheck, ScanEye, BookmarkPlus, BookmarkCheck,
  ChevronUp, Trash2,
} from 'lucide-react';
import { processTemplate } from '@/lib/templateProcessor';
import { compositeDevice } from '@/lib/compositing';
import { resolveFilename, previewFilename, FILENAME_PRESETS } from '@/lib/filenameTemplate';
import { useDeviceSets } from '@/hooks/useDeviceSets';
import { PRESET_LABELS, fileSizeWarning } from '@/lib/exportPresets';
import type { ResolutionPreset, ComplianceBackground } from '@/types';
import { useAuth } from '@/hooks/useAuth';

interface ExportSectionProps {
  onExportComplete?: () => void;
}

export function ExportSection({ onExportComplete }: ExportSectionProps) {
  const exportOptions = useEditorStore((s) => s.exportOptions);
  const setExportOptions = useEditorStore((s) => s.setExportOptions);
  const backgroundScene = useEditorStore((s) => s.backgroundScene);
  const customBackgroundImage = useEditorStore((s) => s.customBackgroundImage);
  const zoneDesigns = useEditorStore((s) => s.zoneDesigns);
  const selectedDevice = useEditorStore((s) => s.selectedDevice);
  const activeZoneId = useEditorStore((s) => s.activeZoneId);
  const setDesignImage = useEditorStore((s) => s.setDesignImage);
  const designQueue = useEditorStore((s) => s.designQueue);
  const setBulkStaging = useEditorStore((s) => s.setBulkStaging);
  const restoreZoneDesign = useEditorStore((s) => s.restoreZoneDesign);
  const setStagingCallback = useEditorStore((s) => s.setStagingCallback);
  const clearStagingCallback = useEditorStore((s) => s.clearStagingCallback);

  const [selectedDeviceIds, setSelectedDeviceIds] = useState<string[]>(() =>
    selectedDevice ? [selectedDevice.id] : []
  );
  const [showAllDevices, setShowAllDevices] = useState(false);
  const [showSaveSet, setShowSaveSet] = useState(false);
  const [newSetName, setNewSetName] = useState('');
  const [showPresets, setShowPresets] = useState(false);
  const { sets: deviceSets, saveSet, deleteSet } = useDeviceSets();
  const [progress, setProgress] = useState<BulkExportProgress | null>(null);
  const [exporting, setExporting] = useState(false);
  const [positionMode, setPositionMode] = useState<'auto-fit' | 'editor-position'>('auto-fit');
  const [fileSizeWarningMsg, setFileSizeWarningMsg] = useState<string | null>(null);
  const { user } = useAuth();
  const [previewingIndex, setPreviewingIndex] = useState<number | null>(null);
  const [perDesignTransforms, setPerDesignTransforms] = useState<Record<number, PerDesignTransform>>({});
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [generatingPreview, setGeneratingPreview] = useState(false);
  const previewingIndexRef = useRef<number | null>(null);
  const savedDesignRef = useRef<ZoneDesign | null>(null);
  const designsRef = useRef(designQueue);
  designsRef.current = designQueue;

  // Refs to avoid stale closures in navHandler
  const capturePositionRef = useRef<(index: number) => boolean>(() => false);
  const previewDesignRef = useRef<(index: number) => void>(() => {});
  const exitStagingRef = useRef<() => void>(() => {});

  const { customDevices: allDevices, loadCustomDevices } = useTemplateStore();

  // Load devices on mount
  useEffect(() => {
    loadCustomDevices();
  }, [loadCustomDevices]);

  // Ensure selected device is always in the list
  useEffect(() => {
    if (selectedDevice && !selectedDeviceIds.includes(selectedDevice.id)) {
      setSelectedDeviceIds((prev) => [selectedDevice.id, ...prev.filter((id) => id !== selectedDevice.id)]);
    }
  }, [selectedDevice?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const editorTransform = activeZoneId ? zoneDesigns[activeZoneId]?.transform : null;
  const editorZoneBounds = selectedDevice?.zones.find((z) => z.id === activeZoneId)?.bounds ?? null;
  const canUseEditorPosition = positionMode === 'editor-position' && !!editorTransform && !!editorZoneBounds;

  const currentDesignUrl = useMemo(
    () => Object.values(zoneDesigns).find((z) => z.designImage)?.designImage ?? null,
    [zoneDesigns]
  );

  // Effective designs: queue if populated, otherwise current editor design
  const effectiveDesigns = useMemo(
    () =>
      designQueue.length > 0
        ? designQueue
        : currentDesignUrl
          ? [{ name: selectedDevice?.name ? `${selectedDevice.name}_design` : 'current_design', dataUrl: currentDesignUrl }]
          : [],
    [designQueue, currentDesignUrl, selectedDevice?.name]
  );

  // All possible design × device combinations
  const allCombos = useMemo(
    () =>
      effectiveDesigns
        .flatMap((design, di) =>
          selectedDeviceIds.map((deviceId) => ({
            key: `${di}::${deviceId}`,
            design,
            designIndex: di,
            device: allDevices.find((d) => d.id === deviceId)!,
          }))
        )
        .filter((c) => c.device),
    [effectiveDesigns, selectedDeviceIds, allDevices]
  );

  // Combos that will actually be exported (respects selectedCombos filter)

const totalCombinations = allCombos.length;

  const isSingleExport = useMemo(
    () =>
      effectiveDesigns.length === 1 &&
      selectedDeviceIds.length === 1 &&
      selectedDeviceIds[0] === selectedDevice?.id,
    [effectiveDesigns.length, selectedDeviceIds, selectedDevice?.id]
  );

  const capturedCount = Object.keys(perDesignTransforms).length;
  const showPositionMode = effectiveDesigns.length > 1 || selectedDeviceIds.length > 1;

  // --- Staging logic ---

  const exitStaging = useCallback(() => {
    if (savedDesignRef.current && activeZoneId) {
      restoreZoneDesign(activeZoneId, savedDesignRef.current);
    }
    savedDesignRef.current = null;
    setBulkStaging(false);
    clearStagingCallback();
    setPreviewingIndex(null);
    previewingIndexRef.current = null;
  }, [activeZoneId, restoreZoneDesign, setBulkStaging, clearStagingCallback]);
  exitStagingRef.current = exitStaging;

  const capturePosition = useCallback(
    (index: number) => {
      if (!activeZoneId || !editorTransform || !editorZoneBounds) {
        toast('Position the design on canvas first', 'info');
        return false;
      }
      setPerDesignTransforms((prev) => ({
        ...prev,
        [index]: { transform: { ...editorTransform }, zoneBounds: { ...editorZoneBounds } },
      }));
      toast(`Position captured for "${designsRef.current[index]?.name}"`, 'success');
      return true;
    },
    [activeZoneId, editorTransform, editorZoneBounds]
  );
  capturePositionRef.current = capturePosition;

  const previewDesign = useCallback(
    (index: number) => {
      if (!activeZoneId || !selectedDevice) {
        toast('Select a device first', 'info');
        return;
      }
      if (savedDesignRef.current === null) {
        const current = zoneDesigns[activeZoneId];
        savedDesignRef.current = current
          ? JSON.parse(JSON.stringify(current))
          : { designImage: null, transform: { x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0 }, textLayers: [] };
      }
      const designs = designsRef.current;
      setBulkStaging(true, {
        designName: designs[index]?.name,
        index: index + 1,
        total: designs.length,
      });
      setPreviewingIndex(index);
      previewingIndexRef.current = index;
      setDesignImage(activeZoneId, designs[index].dataUrl);
    },
    [activeZoneId, selectedDevice, zoneDesigns, setBulkStaging, setDesignImage]
  );
  previewDesignRef.current = previewDesign;

  // navHandler reads from refs — stable, never re-created
  const navHandler = useCallback((direction: 'prev' | 'next' | 'capture' | 'exit') => {
    const idx = previewingIndexRef.current;
    const designs = designsRef.current;

    if (direction === 'exit') { exitStagingRef.current(); return; }
    if (direction === 'prev') { if (idx !== null && idx > 0) previewDesignRef.current(idx - 1); return; }
    if (direction === 'next') {
      if (idx !== null && idx < designs.length - 1) previewDesignRef.current(idx + 1);
      else toast('Already at the last design', 'info');
      return;
    }
    if (direction === 'capture') {
      if (idx === null) return;
      capturePositionRef.current(idx);
      if (idx < designs.length - 1) previewDesignRef.current(idx + 1);
      else { toast('All positions captured!', 'success'); exitStagingRef.current(); }
    }
  }, []);

  const startPreviewing = useCallback(
    (index: number) => {
      setStagingCallback(navHandler);
      previewDesign(index);
    },
    [setStagingCallback, navHandler, previewDesign]
  );

  const clearCaptured = (index: number) => {
    setPerDesignTransforms((prev) => {
      const next = { ...prev };
      delete next[index];
      return next;
    });
  };

  const toggleDevice = (id: string) => {
    setSelectedDeviceIds((prev) =>
      prev.includes(id) ? prev.filter((d) => d !== id) : [...prev, id]
    );
  };

  const buildFilename = (device: { brand: string; name: string }, designName: string, index = 1, total = 1) =>
    resolveFilename(exportOptions.filenamePattern, {
      brand: device.brand,
      model: device.name,
      design: designName,
      scale: exportOptions.scale,
      ext: exportOptions.format,
      index,
      total,
    });

  const runExport = async () => {
    if (totalCombinations === 0 || !selectedDevice) return;

    setExporting(true);

    const updateLocalStats = (count: number) => {
      const ts = Date.now();
      try {
        const records = JSON.parse(localStorage.getItem('skinmockup-export-stats') || '[]');
        records.push({ count, timestamp: ts });
        const oneYearAgo = ts - 365 * 24 * 60 * 60 * 1000;
        const filtered = records.filter((r: any) => r.timestamp > oneYearAgo);
        localStorage.setItem('skinmockup-export-stats', JSON.stringify(filtered));
      } catch {
        localStorage.setItem('skinmockup-export-stats', JSON.stringify([{ count, timestamp: ts }]));
      }
    };

    try {
      const bg = customBackgroundImage
        ? { id: 'custom', name: 'Custom', type: 'image' as const, value: customBackgroundImage }
        : backgroundScenes.find((s) => s.id === backgroundScene) ?? null;

      setFileSizeWarningMsg(null);

      if (isSingleExport) {
        // Single export: use the one active combo
        const combo = allCombos[0];
        const filename = buildFilename(combo.device, combo.design.name);
        await exportSingle(combo.device, zoneDesigns, exportOptions, filename, bg, user?.logo_url);
        updateLocalStats(1);
        toast('Mockup exported!', 'success');
        onExportComplete?.();
      } else {
        // Bulk export: build jobs only for selected (active) combos
        const jobs: BulkExportJob[] = [];

        for (const combo of allCombos) {
          const { design, designIndex: di, device } = combo;

          const captured = perDesignTransforms[di];
          const ref =
            positionMode === 'editor-position'
              ? captured
                ? { referenceTransform: captured.transform, referenceZoneBounds: captured.zoneBounds }
                : canUseEditorPosition && editorTransform && editorZoneBounds
                  ? { referenceTransform: editorTransform, referenceZoneBounds: editorZoneBounds }
                  : null
              : null;

          // Note: using any here since the typings in BulkExportJob actually want designDataUrl etc.
          jobs.push({
            device,
            designDataUrl: design.dataUrl,
            designName: design.name,
            ...(ref ?? {}),
          } as any);
        }

        await bulkExport(jobs, exportOptions, setProgress, bg, user?.logo_url);
        updateLocalStats(jobs.length);
        toast(`Exported ${jobs.length} mockup${jobs.length !== 1 ? 's' : ''}!`, 'success');
        onExportComplete?.();
      }
    } catch (err) {
      console.error('Export failed:', err);
      toast('Export failed', 'error');
    } finally {
      setExporting(false);
      setProgress(null);
    }
  };

  const handleExport = () => {
    runExport();
  };

  return (
    <>
      <div className="space-y-3">
        {/* Export options */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <p className="text-[10px] font-medium text-text-muted mb-1">Format</p>
              <div className="flex gap-1">
                {(['png', 'jpeg'] as const).map((fmt) => (
                  <button
                    key={fmt}
                    onClick={() => setExportOptions({ format: fmt })}
                    title={`Export as ${fmt.toUpperCase()}`}
                    className={`flex-1 px-2 py-1 text-[10px] font-medium rounded-lg uppercase transition-all duration-200 ${
                      exportOptions.format === fmt
                        ? 'bg-accent text-white shadow-sm'
                        : 'bg-surface-hover text-text-secondary hover:bg-border-subtle'
                    }`}
                  >
                    {fmt}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex-1">
              <p className="text-[10px] font-medium text-text-muted mb-1">Scale</p>
              <div className="flex gap-1">
                {[1, 2].map((s) => (
                  <button
                    key={s}
                    onClick={() => setExportOptions({ scale: s })}
                    title={`Export at ${s}x resolution`}
                    className={`flex-1 px-2 py-1 text-[10px] font-medium rounded-lg transition-all duration-200 ${
                      exportOptions.scale === s
                        ? 'bg-accent text-white shadow-sm'
                        : 'bg-surface-hover text-text-secondary hover:bg-border-subtle'
                    }`}
                  >
                    {s}x
                  </button>
                ))}
              </div>
            </div>
          </div>

          {exportOptions.format === 'jpeg' && (
            <div>
              <p className="text-[10px] font-medium text-text-muted">
                Quality: {Math.round(exportOptions.quality * 100)}%
              </p>
              <input
                type="range"
                min={0.1}
                max={1}
                step={0.1}
                value={exportOptions.quality}
                onChange={(e) => setExportOptions({ quality: parseFloat(e.target.value) })}
                className="w-full"
              />
            </div>
          )}

          {/* Resolution preset */}
          <div>
            <p className="text-[10px] font-medium text-text-muted mb-1">Resolution</p>
            <select
              value={exportOptions.resolutionPreset}
              onChange={(e) => setExportOptions({ resolutionPreset: e.target.value as ResolutionPreset })}
              className="w-full px-2 py-1 text-[10px] rounded-lg bg-surface border border-border focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent text-text-secondary transition-all"
              title="Output canvas size for store listings"
            >
              {(Object.keys(PRESET_LABELS) as ResolutionPreset[]).map((key) => (
                <option key={key} value={key}>{PRESET_LABELS[key]}</option>
              ))}
            </select>
            {exportOptions.resolutionPreset === 'custom' && (
              <div className="flex items-center gap-1 mt-1">
                <input
                  type="number"
                  min={100}
                  max={8000}
                  step={100}
                  value={exportOptions.customOutputSize}
                  onChange={(e) => setExportOptions({ customOutputSize: parseInt(e.target.value, 10) || 2000 })}
                  className="flex-1 px-2 py-1 text-[10px] rounded-lg bg-surface border border-border focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent text-text-secondary transition-all"
                />
                <span className="text-[10px] text-text-muted">px (square)</span>
              </div>
            )}
          </div>

          {/* Compliance background */}
          <div>
            <p className="text-[10px] font-medium text-text-muted mb-1">Background</p>
            <div className="flex gap-1">
              {([
                { id: 'scene',       label: 'Scene',  title: 'Use the current scene background' },
                { id: 'white',       label: 'White',  title: 'Pure white — required for Amazon main image' },
                { id: 'black',       label: 'Black',  title: 'Pure black background' },
                { id: 'transparent', label: 'None',   title: 'Transparent background (PNG only)' },
              ] as { id: ComplianceBackground; label: string; title: string }[]).map(({ id, label, title }) => (
                <button
                  key={id}
                  onClick={() => setExportOptions({ complianceBackground: id })}
                  title={title}
                  className={`flex-1 px-1.5 py-1 text-[9px] font-medium rounded-lg border transition-all duration-200 ${
                    exportOptions.complianceBackground === id
                      ? 'bg-accent text-white border-accent shadow-sm'
                      : 'bg-surface-hover text-text-secondary border-border hover:border-accent/50'
                  }`}
                >
                  {id === 'white' && <span className="inline-block w-2 h-2 rounded-sm border border-border bg-white mr-0.5 align-middle" />}
                  {id === 'black' && <span className="inline-block w-2 h-2 rounded-sm bg-black mr-0.5 align-middle" />}
                  {id === 'transparent' && <span className="inline-block w-2 h-2 rounded-sm border border-dashed border-current mr-0.5 align-middle" />}
                  {label}
                </button>
              ))}
            </div>
            {exportOptions.complianceBackground === 'transparent' && exportOptions.format === 'jpeg' && (
              <p className="text-[9px] text-orange-500 mt-0.5">Transparent requires PNG format.</p>
            )}
          </div>

          {/* File size warning */}
          {fileSizeWarningMsg && (
            <div className="px-2 py-1.5 rounded-lg bg-orange-500/10 border border-orange-500/20">
              <p className="text-[9px] text-orange-600 leading-relaxed">{fileSizeWarningMsg}</p>
            </div>
          )}

          {/* Watermark toggle */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 cursor-pointer group">
              <input
                type="checkbox"
                checked={!!exportOptions.addWatermark}
                onChange={(e) => setExportOptions({ addWatermark: e.target.checked })}
                className="w-3.5 h-3.5 rounded border-border text-accent focus:ring-accent"
              />
              <span className="text-[10px] font-medium text-text-secondary group-hover:text-text-primary transition-colors">
                Apply watermark
              </span>
            </label>
            
            {exportOptions.addWatermark && (
              <div className="pl-5 space-y-1.5 animate-in fade-in slide-in-from-top-1 duration-200">
                <div className="space-y-1">
                  <p className="text-[9px] font-medium text-text-muted">Watermark Text (Tiled)</p>
                  <input
                    type="text"
                    value={exportOptions.watermarkText || ''}
                    onChange={(e) => setExportOptions({ watermarkText: e.target.value })}
                    placeholder="e.g. PROOF"
                    className="w-full px-2 py-1 text-[10px] rounded-lg bg-surface border border-border focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent placeholder:text-text-muted transition-all"
                  />
                </div>
                
                <div className="pt-1">
                  <p className="text-[9px] text-text-muted leading-relaxed">
                    Watermarks are applied in a tiled pattern over the entire image. 
                    {user?.logo_url && !exportOptions.watermarkText && " Your logo will be used."}
                    {user?.logo_url && exportOptions.watermarkText && " Both your logo and text will be used."}
                    {!user?.logo_url && exportOptions.watermarkText && " Only your text will be used."}
                  </p>
                  {!user?.logo_url && !exportOptions.watermarkText && (
                    <p className="text-[9px] text-orange-500 mt-0.5">
                      No logo saved in profile. Upload one in User settings or enter text above.
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between mb-0.5">
              <p className="text-[10px] font-medium text-text-muted">Filename</p>
              <button
                onClick={() => setShowPresets((v) => !v)}
                title="Filename presets"
                className="flex items-center gap-0.5 text-[9px] text-accent hover:text-accent-hover transition-colors"
              >
                Presets
                {showPresets ? <ChevronUp size={9} /> : <ChevronDown size={9} />}
              </button>
            </div>
            {showPresets && (
              <div className="flex flex-wrap gap-1 mb-1">
                {FILENAME_PRESETS.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => { setExportOptions({ filenamePattern: p.pattern }); setShowPresets(false); }}
                    className="px-2 py-0.5 text-[9px] rounded-md bg-surface-hover border border-border hover:border-accent hover:text-accent transition-all"
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            )}
            <input
              type="text"
              value={exportOptions.filenamePattern}
              onChange={(e) => setExportOptions({ filenamePattern: e.target.value })}
              placeholder="{brand}-{model-slug}-{design-slug}"
              title="Tokens: {brand} {model} {model-slug} {design} {design-slug} {scale} {ext} {date} {index}"
              className="w-full px-2 py-1 text-[10px] rounded-lg bg-surface border border-border focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent placeholder:text-text-muted font-mono transition-all duration-200"
            />
            <p className="text-[9px] text-text-muted mt-0.5 font-mono truncate" title="Live filename preview">
              {previewFilename(exportOptions.filenamePattern)}
            </p>
          </div>
        </div>

        {/* Target devices */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Target Devices</p>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setShowSaveSet((v) => !v)}
                title="Save current selection as a lineup"
                className="text-text-muted hover:text-accent transition-colors"
              >
                {showSaveSet ? <BookmarkCheck size={11} className="text-accent" /> : <BookmarkPlus size={11} />}
              </button>
              <button
                onClick={() => setShowAllDevices((v) => !v)}
                title={showAllDevices ? 'Collapse device list' : 'Show all devices'}
                className="text-[10px] text-accent hover:text-accent-hover flex items-center gap-0.5"
              >
                {selectedDeviceIds.length} selected
                <ChevronDown size={10} className={`transition-transform duration-200 ${showAllDevices ? 'rotate-180' : ''}`} />
              </button>
            </div>
          </div>

          {deviceSets.length > 0 && (
            <div className="flex items-center gap-1">
              <select
                onChange={(e) => {
                  const set = deviceSets.find((s) => s.id === e.target.value);
                  if (set) setSelectedDeviceIds(set.device_ids);
                  e.target.value = '';
                }}
                defaultValue=""
                className="flex-1 px-2 py-1 text-[10px] rounded-lg bg-surface border border-border focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent text-text-secondary transition-all"
                title="Load a saved device lineup"
              >
                <option value="" disabled>Load lineup…</option>
                {deviceSets.map((s) => (
                  <option key={s.id} value={s.id}>{s.name} ({s.device_ids.length})</option>
                ))}
              </select>
            </div>
          )}

          {showSaveSet && (
            <div className="flex gap-1">
              <input
                type="text"
                value={newSetName}
                onChange={(e) => setNewSetName(e.target.value)}
                placeholder="Lineup name…"
                className="flex-1 px-2 py-1 text-[10px] rounded-lg bg-surface border border-border focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent placeholder:text-text-muted transition-all"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newSetName.trim()) {
                    saveSet(newSetName.trim(), selectedDeviceIds);
                    setNewSetName('');
                    setShowSaveSet(false);
                    toast('Lineup saved!', 'success');
                  }
                }}
              />
              <button
                onClick={() => {
                  if (!newSetName.trim()) return;
                  saveSet(newSetName.trim(), selectedDeviceIds);
                  setNewSetName('');
                  setShowSaveSet(false);
                  toast('Lineup saved!', 'success');
                }}
                disabled={!newSetName.trim()}
                className="px-2 py-1 text-[10px] rounded-lg bg-accent text-white hover:bg-accent-hover disabled:opacity-40 transition-all"
              >
                Save
              </button>
            </div>
          )}

          {deviceSets.length > 0 && showSaveSet && (
            <div className="space-y-0.5">
              {deviceSets.map((s) => (
                <div key={s.id} className="flex items-center gap-1 px-2 py-1 rounded-lg bg-surface-hover text-[10px]">
                  <span className="flex-1 truncate text-text-secondary">{s.name}</span>
                  <span className="text-text-muted">{s.device_ids.length} devices</span>
                  <button
                    onClick={() => deleteSet(s.id)}
                    title="Delete lineup"
                    className="text-text-muted hover:text-red-500 transition-colors"
                  >
                    <Trash2 size={10} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Chip display of selected devices */}
          <div className="flex flex-wrap gap-1">
            {selectedDeviceIds.map((id) => {
              const device = allDevices.find((d) => d.id === id);
              if (!device) return null;
              const isCurrent = device.id === selectedDevice?.id;
              return (
                <span
                  key={id}
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium transition-all ${
                    isCurrent
                      ? 'bg-accent text-white'
                      : 'bg-accent-light text-accent border border-accent/20'
                  }`}
                >
                  {device.name}
                  {!isCurrent && (
                    <button
                      onClick={() => toggleDevice(id)}
                      title="Remove device"
                      className="hover:text-red-500 transition-colors"
                    >
                      <X size={9} />
                    </button>
                  )}
                </span>
              );
            })}
          </div>

          {showAllDevices && (
            <div className="glass-inset rounded-xl p-2 space-y-1 max-h-32 overflow-y-auto">
              <div className="flex justify-between mb-1">
                <button
                  onClick={() => setSelectedDeviceIds(allDevices.map((d) => d.id))}
                  className="text-[9px] text-accent hover:text-accent-hover"
                >
                  Select all
                </button>
                <button
                  onClick={() => setSelectedDeviceIds(selectedDevice ? [selectedDevice.id] : [])}
                  className="text-[9px] text-text-muted hover:text-text-secondary"
                >
                  Reset
                </button>
              </div>
              {allDevices.map((device) => (
                <label
                  key={device.id}
                  className="flex items-center gap-2 text-[10px] p-1 hover:bg-white/40 rounded-lg cursor-pointer transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={selectedDeviceIds.includes(device.id)}
                    onChange={() => toggleDevice(device.id)}
                    className="rounded border-border"
                  />
                  <span className="truncate">{device.name}</span>
                </label>
              ))}
            </div>
          )}
        </div>

        {/* Position mode — only when multi-design or multi-device */}
        {showPositionMode && (
          <div className="space-y-1.5">
            <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Position</p>
            <div className="flex gap-1 p-0.5 bg-surface-hover rounded-lg">
              {(['auto-fit', 'editor-position'] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setPositionMode(mode)}
                  title={mode === 'auto-fit' ? 'Automatically fit design to each device' : 'Set custom position per design'}
                  className={`flex-1 px-2 py-1 text-[10px] font-medium rounded-md transition-all duration-200 ${
                    positionMode === mode
                      ? 'bg-surface text-accent shadow-sm'
                      : 'text-text-muted hover:text-text-primary'
                  }`}
                >
                  {mode === 'auto-fit' ? 'Auto-fit' : 'Per-design'}
                </button>
              ))}
            </div>

            {positionMode === 'editor-position' && designQueue.length > 0 && (
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] text-text-muted">
                    {capturedCount}/{designQueue.length} captured
                  </p>
                  {editorTransform && editorZoneBounds && designQueue.length > 1 && (
                    <button
                      onClick={() => {
                        const newTransforms: Record<number, PerDesignTransform> = {};
                        for (let i = 0; i < designQueue.length; i++) {
                          newTransforms[i] = { transform: { ...editorTransform }, zoneBounds: { ...editorZoneBounds } };
                        }
                        setPerDesignTransforms(newTransforms);
                        toast(`Position applied to all ${designQueue.length} designs`, 'success');
                      }}
                      title="Apply current canvas position to all designs"
                      className="flex items-center gap-1 text-[9px] text-accent hover:text-accent-hover transition-colors"
                    >
                      <CopyCheck size={10} />
                      Apply to all
                    </button>
                  )}
                </div>
                {designQueue.map((d, i) => {
                  const isCaptured = !!perDesignTransforms[i];
                  const isPreviewing = previewingIndex === i;
                  const t = perDesignTransforms[i]?.transform;
                  return (
                    <div
                      key={i}
                      className={`flex items-center gap-1.5 p-1.5 rounded-lg text-[10px] transition-all duration-200 ${
                        isPreviewing ? 'bg-accent-light border border-accent/30' : 'bg-surface-hover'
                      }`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={d.dataUrl} alt={d.name} className="w-7 h-9 object-cover rounded-md border border-border flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="truncate font-medium">{d.name}</p>
                        {isCaptured && t && (
                          <p className="text-[8px] font-mono text-text-muted">
                            s{t.scaleX.toFixed(1)} x{Math.round(t.x)} y{Math.round(t.y)}
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => startPreviewing(i)}
                        title={isPreviewing ? 'Previewing on canvas' : 'Preview on canvas'}
                        className={`p-1 rounded-md transition-all ${
                          isPreviewing ? 'bg-accent text-white' : 'text-text-muted hover:text-accent hover:bg-accent-light'
                        }`}
                      >
                        <Eye size={12} />
                      </button>
                      {isCaptured ? (
                        <button
                          onClick={() => clearCaptured(i)}
                          title="Position captured — click to clear"
                          className="p-1 rounded-md text-green-600 hover:text-red-500 transition-colors"
                        >
                          <CircleCheck size={12} />
                        </button>
                      ) : (
                        <button
                          onClick={() => capturePosition(i)}
                          disabled={!editorTransform}
                          title="Capture current canvas position"
                          className="p-1 rounded-md text-text-muted hover:text-accent hover:bg-accent-light disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                        >
                          <Crosshair size={12} />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Progress */}
        {progress && (
          <div className="space-y-1">
            <div className="w-full bg-border rounded-full h-1.5">
              <div
                className="bg-accent h-1.5 rounded-full transition-all"
                style={{ width: `${(progress.completed / progress.total) * 100}%` }}
              />
            </div>
            <p className="text-[10px] text-text-muted truncate">{progress.currentItem}</p>
          </div>
        )}

        {/* Export preview */}
        {previewUrl && (
          <div className="relative rounded-xl overflow-hidden border border-border">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={previewUrl} alt="Export preview" className="w-full object-contain max-h-48" />
            <button
              onClick={() => setPreviewUrl(null)}
              title="Close preview"
              className="absolute top-1 right-1 w-5 h-5 flex items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
            >
              <X size={10} />
            </button>
          </div>
        )}



        {/* Export buttons */}
        <div className="flex gap-1.5">
          <button
            onClick={async () => {
              if (!selectedDevice) return;
              setGeneratingPreview(true);
              try {
                const processed = await processTemplate(selectedDevice);
                const canvas = await compositeDevice(processed, zoneDesigns);
                setPreviewUrl(canvas.toDataURL('image/png'));
              } catch { toast('Preview failed', 'error'); }
              setGeneratingPreview(false);
            }}
            disabled={!selectedDevice || generatingPreview}
            title="Generate export preview"
            className="px-3 py-2 rounded-xl bg-surface-hover border border-border text-text-secondary hover:border-accent hover:text-accent disabled:opacity-30 transition-all duration-200"
          >
            <ScanEye size={16} />
          </button>
          <Button
            onClick={handleExport}
            disabled={
              totalCombinations === 0 ||
              exporting
            }
            className="flex-1 flex items-center justify-center gap-2"
            size="md"
          >
            {isSingleExport ? <Download size={14} /> : <Package size={14} />}
            {exporting
              ? 'Exporting...'
              : isSingleExport
                ? 'Export Mockup'
                : `Export ${totalCombinations} Mockup${totalCombinations > 1 ? 's' : ''}`}
          </Button>
        </div>
      </div>
    </>
  );
}
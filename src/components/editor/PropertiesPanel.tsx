'use client';

import { useState, useEffect } from 'react';
import { useEditorStore } from '@/lib/store';
import { getSavedPresets, savePreset, deletePreset, TransformPreset } from '@/lib/presets';
import {
  Lock, Unlock, Maximize, Minimize, MoveHorizontal, MoveVertical, RectangleHorizontal,
  FlipHorizontal2, FlipVertical2,
  AlignCenterHorizontal, AlignCenterVertical, AlignStartVertical, AlignEndVertical, AlignStartHorizontal, AlignEndHorizontal,
  RotateCcw, SlidersHorizontal, History, ChevronDown, Save, Trash2, Bookmark, PanelRightClose,
  Image as ImageIcon,
} from 'lucide-react';

const FIT_MODES = [
  { id: 'cover' as const, label: 'Fit', icon: Maximize, tip: 'Fit to zone — edges align with zone boundary' },
  { id: 'contain' as const, label: 'Inside', icon: Minimize, tip: 'Fit inside — entire image visible, may have gaps' },
  { id: 'fit-width' as const, label: 'Width', icon: MoveHorizontal, tip: 'Match zone width, height follows ratio' },
  { id: 'fit-height' as const, label: 'Height', icon: MoveVertical, tip: 'Match zone height, width follows ratio' },
  { id: 'stretch' as const, label: 'Stretch', icon: RectangleHorizontal, tip: 'Stretch to fill — independent X/Y, may distort' },
];

interface PropertiesPanelProps {
  onCollapse?: () => void;
}

export function PropertiesPanel({ onCollapse }: PropertiesPanelProps) {
  const activeZoneId = useEditorStore((s) => s.activeZoneId);
  const zoneDesigns = useEditorStore((s) => s.zoneDesigns);
  const selectedDevice = useEditorStore((s) => s.selectedDevice);
  const updateDesignTransform = useEditorStore((s) => s.updateDesignTransform);
  const fitDesignToZone = useEditorStore((s) => s.fitDesignToZone);
  const activeFitMode = useEditorStore((s) => s.activeFitMode);
  const pushHistory = useEditorStore((s) => s.pushHistory);
  const history = useEditorStore((s) => s.history);
  const historyIndex = useEditorStore((s) => s.historyIndex);
  const undo = useEditorStore((s) => s.undo);
  const redo = useEditorStore((s) => s.redo);

  const [scaleLocked, setScaleLocked] = useState(true);
  const [showHistory, setShowHistory] = useState(false);
  const [presets, setPresets] = useState<TransformPreset[]>([]);
  const [showPresets, setShowPresets] = useState(false);
  const [presetName, setPresetName] = useState('');

  useEffect(() => { setPresets(getSavedPresets()); }, []);

  const design = activeZoneId ? zoneDesigns[activeZoneId] : null;
  const zone = selectedDevice?.zones.find((z) => z.id === activeZoneId);
  const hasDesign = !!design?.designImage;
  const transform = design?.transform;

  const toggleFlipH = () => { if (!activeZoneId || !transform) return; pushHistory('Flip horizontal'); updateDesignTransform(activeZoneId, { flipH: !transform.flipH }); };
  const toggleFlipV = () => { if (!activeZoneId || !transform) return; pushHistory('Flip vertical'); updateDesignTransform(activeZoneId, { flipV: !transform.flipV }); };

  const resetTransform = () => {
    if (!activeZoneId) return;
    pushHistory('Reset transform');
    updateDesignTransform(activeZoneId, { x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0, flipH: false, flipV: false, opacity: 1 });
  };

  const alignToZone = (alignment: string) => {
    if (!zone || !design?.designImage || !activeZoneId || !selectedDevice) return;
    pushHistory('Align');
    const img = new Image();
    img.onload = () => {
      const t = design.transform;
      const sw = img.naturalWidth * t.scaleX;
      const sh = img.naturalHeight * t.scaleY;
      const updates: Record<string, number> = {};
      
      // Use device dimensions for alignment
      if (alignment === 'center-h') updates.x = (selectedDevice.dimensions.width - sw) / 2;
      if (alignment === 'center-v') updates.y = (selectedDevice.dimensions.height - sh) / 2;
      if (alignment === 'left') updates.x = 0;
      if (alignment === 'right') updates.x = selectedDevice.dimensions.width - sw;
      if (alignment === 'top') updates.y = 0;
      if (alignment === 'bottom') updates.y = selectedDevice.dimensions.height - sh;
      
      updateDesignTransform(activeZoneId, updates);
    };
    img.src = design.designImage;
  };

  const [showAdvanced, setShowAdvanced] = useState(false);

  // Local states for responsive inputs
  const [localX, setLocalX] = useState(0);
  const [localY, setLocalY] = useState(0);
  const [localScaleX, setLocalScaleX] = useState(1);
  const [localScaleY, setLocalScaleY] = useState(1);
  const [localRotation, setLocalRotation] = useState(0);
  const [localOpacity, setLocalOpacity] = useState(1);

  // Sync local state when transform or activeZoneId changes
  useEffect(() => {
    if (transform) {
      setLocalX(Math.round(transform.x));
      setLocalY(Math.round(transform.y));
      setLocalScaleX(transform.scaleX);
      setLocalScaleY(transform.scaleY);
      setLocalRotation(transform.rotation);
      setLocalOpacity(transform.opacity ?? 1);
    }
  }, [activeZoneId, transform?.x, transform?.y, transform?.scaleX, transform?.scaleY, transform?.rotation, transform?.opacity]);

  const updateX = (val: number) => { setLocalX(val); updateDesignTransform(activeZoneId!, { x: val }); };
  const updateY = (val: number) => { setLocalY(val); updateDesignTransform(activeZoneId!, { y: val }); };
  const updateRotation = (val: number) => { setLocalRotation(val); updateDesignTransform(activeZoneId!, { rotation: val }); };
  const updateOpacity = (val: number) => { setLocalOpacity(val); updateDesignTransform(activeZoneId!, { opacity: val }); };
  const updateScaleX = (val: number) => {
    setLocalScaleX(val);
    if (scaleLocked) {
      setLocalScaleY(val);
      updateDesignTransform(activeZoneId!, { scaleX: val, scaleY: val });
    } else {
      updateDesignTransform(activeZoneId!, { scaleX: val });
    }
  };
  const updateScaleY = (val: number) => {
    setLocalScaleY(val);
    if (scaleLocked) {
      setLocalScaleX(val);
      updateDesignTransform(activeZoneId!, { scaleX: val, scaleY: val });
    } else {
      updateDesignTransform(activeZoneId!, { scaleY: val });
    }
  };

  const iconBtn = 'w-7 h-7 flex items-center justify-center rounded-lg text-text-muted hover:text-accent hover:bg-accent/8 transition-all duration-200';
  const iconBtnActive = 'w-7 h-7 flex items-center justify-center rounded-lg bg-accent text-white shadow-sm transition-all duration-200';
  const inputClass = 'w-full px-2 py-1.5 text-[11px] font-mono tabular-nums border border-border/60 rounded-lg bg-white/60 focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent/40 transition-all duration-200';

  // Empty state
  if (!selectedDevice || !hasDesign || !transform || !activeZoneId) {
    return (
      <aside className="w-full flex-shrink-0 glass-sidebar-right h-full flex flex-col bg-white">
        <div className="px-4 py-3.5 flex items-center gap-2.5">
          <SlidersHorizontal size={14} className="text-accent" />
          <p className="text-[12px] font-semibold text-text-primary uppercase tracking-tight">Properties</p>
        </div>
        <div className="glass-separator" />
        <div className="flex-1 flex items-center justify-center px-6">
          <p className="text-[11px] text-text-muted text-center leading-relaxed font-medium">
            {!selectedDevice ? 'Select a device to begin' : 'Upload a design to adjust properties'}
          </p>
        </div>
      </aside>
    );
  }

  return (
    <aside className="w-full flex-shrink-0 glass-sidebar-right h-full flex flex-col">
      {/* Header */}
      <div className="px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <SlidersHorizontal size={14} className="text-accent" aria-hidden="true" />
          <p className="text-[12px] font-semibold text-text-primary">Properties</p>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className={`text-[9px] font-bold px-2 py-1 rounded-md transition-all ${
              showAdvanced ? 'bg-accent text-white' : 'bg-slate-100 text-text-muted'
            }`}
          >
            {showAdvanced ? 'ADVANCED' : 'SIMPLE'}
          </button>
          {onCollapse && (
            <button
              onClick={onCollapse}
              aria-label="Collapse properties panel"
              title="Collapse properties panel"
              className="p-1 text-text-muted hover:text-accent transition-colors rounded"
            >
              <PanelRightClose size={13} aria-hidden="true" />
            </button>
          )}
        </div>
      </div>

      <div className="glass-separator" />

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">


        {/* Zone info */}
        {zone && (
          <div className="glass-card rounded-xl px-3 py-2 flex items-center justify-between">
            <span className="text-[10px] font-semibold text-text-secondary">{zone.name}</span>
            <span className="text-[10px] font-mono text-text-muted">{zone.bounds.width} × {zone.bounds.height}</span>
          </div>
        )}

        {/* Position */}
        {showAdvanced && (
          <div>
            <p className="text-[10px] font-semibold text-text-muted uppercase tracking-wider mb-2">Position</p>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label htmlFor="prop-x" className="text-[9px] font-medium text-text-muted mb-0.5 block">X</label>
                <input id="prop-x" type="number" aria-label="X position" value={localX} onChange={(e) => updateX(Number(e.target.value))} className={inputClass} />
              </div>
              <div>
                <label htmlFor="prop-y" className="text-[9px] font-medium text-text-muted mb-0.5 block">Y</label>
                <input id="prop-y" type="number" aria-label="Y position" value={localY} onChange={(e) => updateY(Number(e.target.value))} className={inputClass} />
              </div>
            </div>
            <div className="glass-separator mt-4" />
          </div>
        )}

        {/* Scale */}
        <div>
          <p className="text-[10px] font-semibold text-text-muted uppercase tracking-wider mb-2">Scale / Size</p>
          {showAdvanced ? (
            <div className="flex items-end gap-1.5">
              <div className="flex-1">
                <label className="text-[9px] font-medium text-text-muted mb-0.5 block">X</label>
                <input
                  type="number" step={0.1} value={localScaleX}
                  onChange={(e) => updateScaleX(Number(e.target.value))}
                  className={inputClass}
                />
              </div>
              <button
                onClick={() => setScaleLocked((v) => !v)}
                aria-label={scaleLocked ? 'Unlock aspect ratio' : 'Lock aspect ratio'}
                aria-pressed={scaleLocked}
                title={scaleLocked ? 'Unlock aspect ratio' : 'Lock aspect ratio'}
                className={`mb-0.5 w-6 h-6 flex items-center justify-center rounded-lg border transition-all duration-200 flex-shrink-0 ${
                  scaleLocked ? 'bg-accent text-white border-accent shadow-sm' : 'bg-white/60 text-text-muted border-border/60 hover:border-accent hover:text-accent'
                }`}
              >
                {scaleLocked ? <Lock size={9} aria-hidden="true" /> : <Unlock size={9} aria-hidden="true" />}
              </button>
              <div className="flex-1">
                <label className="text-[9px] font-medium text-text-muted mb-0.5 block">Y</label>
                <input
                  type="number" step={0.1} value={localScaleY}
                  onChange={(e) => updateScaleY(Number(e.target.value))}
                  className={inputClass}
                />
              </div>
            </div>
          ) : (
            <input 
              type="range" min={0.1} max={5} step={0.01} 
              value={localScaleX} 
              onChange={(e) => updateScaleX(Number(e.target.value))} 
              className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-accent"
            />
          )}
        </div>

        <div className="glass-separator" />

        {/* Rotation & Opacity */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-[10px] font-semibold text-text-muted uppercase tracking-wider mb-2">Rotate</p>
            {showAdvanced && (
              <div className="flex items-center gap-1 mb-1.5">
                <input
                  type="number" value={Math.round(localRotation)} min={-180} max={180}
                  onChange={(e) => updateRotation(Number(e.target.value))}
                  className={inputClass}
                />
                <span className="text-[10px] text-text-muted">°</span>
              </div>
            )}
            <input type="range" min={-180} max={180} value={localRotation} onChange={(e) => updateRotation(Number(e.target.value))} className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-accent" />
          </div>
          <div>
            <p className="text-[10px] font-semibold text-text-muted uppercase tracking-wider mb-2">Opacity</p>
            {showAdvanced && (
              <div className="flex items-center gap-1 mb-1.5">
                <input
                  type="number" value={Math.round(localOpacity * 100)} min={0} max={100}
                  onChange={(e) => updateOpacity(Number(e.target.value) / 100)}
                  className={inputClass}
                />
                <span className="text-[10px] text-text-muted">%</span>
              </div>
            )}
            <input type="range" min={0} max={1} step={0.05} value={localOpacity} onChange={(e) => updateOpacity(parseFloat(e.target.value))} className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-accent" />
          </div>
        </div>


        <div className="glass-separator" />

        {/* Flip & Align */}
        <div>
          <p className="text-[10px] font-semibold text-text-muted uppercase tracking-wider mb-2">Flip & Align</p>
          <div role="group" aria-label="Flip and align" className="glass-card rounded-xl p-2 flex items-center gap-1.5">
            {/* Flip */}
            <button onClick={toggleFlipH} aria-label="Flip horizontal" aria-pressed={!!transform.flipH} title="Flip horizontal" className={transform.flipH ? iconBtnActive : iconBtn}><FlipHorizontal2 size={13} aria-hidden="true" /></button>
            <button onClick={toggleFlipV} aria-label="Flip vertical" aria-pressed={!!transform.flipV} title="Flip vertical" className={transform.flipV ? iconBtnActive : iconBtn}><FlipVertical2 size={13} aria-hidden="true" /></button>

            <div className="w-px h-5 bg-border/40 mx-0.5" role="separator" />

            {/* Align */}
            <button onClick={() => alignToZone('left')} aria-label="Align left" title="Align left" className={iconBtn}><AlignStartVertical size={13} aria-hidden="true" /></button>
            <button onClick={() => alignToZone('center-h')} aria-label="Center horizontally" title="Center H" className={iconBtn}><AlignCenterHorizontal size={13} aria-hidden="true" /></button>
            <button onClick={() => alignToZone('right')} aria-label="Align right" title="Align right" className={iconBtn}><AlignEndVertical size={13} aria-hidden="true" /></button>

            <div className="w-px h-5 bg-border/40 mx-0.5" role="separator" />

            <button onClick={() => alignToZone('top')} aria-label="Align top" title="Align top" className={iconBtn}><AlignStartHorizontal size={13} aria-hidden="true" /></button>
            <button onClick={() => alignToZone('center-v')} aria-label="Center vertically" title="Center V" className={iconBtn}><AlignCenterVertical size={13} aria-hidden="true" /></button>
            <button onClick={() => alignToZone('bottom')} aria-label="Align bottom" title="Align bottom" className={iconBtn}><AlignEndHorizontal size={13} aria-hidden="true" /></button>
          </div>
        </div>

        <div className="glass-separator" />

        {/* Quick Fit */}
        <div>
          <p className="text-[10px] font-semibold text-text-muted uppercase tracking-wider mb-2">Quick Fit</p>
          <div role="group" aria-label="Quick fit mode" className="glass-card rounded-xl p-1.5 grid grid-cols-5 gap-1">
            {FIT_MODES.map((m) => {
              const isActive = activeFitMode === m.id;
              return (
                <button
                  key={m.id}
                  onClick={() => fitDesignToZone(activeZoneId, m.id)}
                  aria-label={m.tip}
                  aria-pressed={isActive}
                  title={m.tip}
                  className={`flex flex-col items-center gap-0.5 py-1.5 text-[8px] font-semibold rounded-lg transition-all duration-200 ${
                    isActive
                      ? 'bg-accent text-white shadow-sm'
                      : 'text-text-muted hover:text-accent hover:bg-accent/8'
                  }`}
                >
                  <m.icon size={12} aria-hidden="true" />
                  {m.label}
                </button>
              );
            })}
          </div>
        </div>

        {showAdvanced && (
          <>
            <div className="glass-separator" />
            {/* Presets */}
            <div>
              <button
                onClick={() => setShowPresets((v) => !v)}
                aria-expanded={showPresets}
                aria-controls="presets-panel"
                className="w-full flex items-center gap-2 text-[10px] font-semibold text-text-muted uppercase tracking-wider mb-1"
              >
                <Bookmark size={11} aria-hidden="true" />
                <span className="flex-1 text-left">Presets</span>
                <ChevronDown size={11} aria-hidden="true" className={`transition-transform duration-200 ${showPresets ? 'rotate-180' : ''}`} />
              </button>
              {showPresets && (
                <div id="presets-panel" className="space-y-1.5">
                  {/* Save current */}
                  <div className="flex gap-1">
                    <input
                      type="text"
                      placeholder="Preset name..."
                      value={presetName}
                      onChange={(e) => setPresetName(e.target.value)}
                      className="flex-1 px-2 py-1 text-[10px] rounded-md border border-border/60 bg-white/60 focus:outline-none focus:ring-1 focus:ring-accent/30"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && presetName.trim() && transform) {
                          const p: TransformPreset = { id: Date.now().toString(), name: presetName.trim(), transform: { ...transform } };
                          savePreset(p);
                          setPresets(getSavedPresets());
                          setPresetName('');
                        }
                      }}
                    />
                    <button
                      onClick={() => {
                        if (!presetName.trim() || !transform) return;
                        const p: TransformPreset = { id: Date.now().toString(), name: presetName.trim(), transform: { ...transform } };
                        savePreset(p);
                        setPresets(getSavedPresets());
                        setPresetName('');
                      }}
                      disabled={!presetName.trim()}
                      aria-label="Save current position as preset"
                      title="Save current position as preset"
                      className="px-2 py-1 text-[10px] rounded-md bg-accent text-white disabled:opacity-30 hover:bg-accent-hover transition-all"
                    >
                      <Save size={10} aria-hidden="true" />
                    </button>
                  </div>
                  {/* Preset list */}
                  {presets.length > 0 && (
                    <div className="glass-card rounded-lg p-1 space-y-0.5">
                      {presets.map((p) => (
                        <div key={p.id} className="flex items-center gap-1 group">
                          <button
                            onClick={() => {
                              if (!activeZoneId || !p.transform) return;
                              pushHistory('Apply preset');
                              updateDesignTransform(activeZoneId, p.transform);
                            }}
                            title={`Apply: ${p.name}`}
                            className="flex-1 text-left px-2 py-1 text-[10px] rounded-md hover:bg-accent/8 hover:text-accent transition-all truncate"
                          >
                            {p.name}
                          </button>
                          <button
                            onClick={() => { deletePreset(p.id); setPresets(getSavedPresets()); }}
                            aria-label={`Delete preset ${p.name}`}
                            title="Delete preset"
                            className="p-0.5 text-text-muted/40 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                          >
                            <Trash2 size={9} aria-hidden="true" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  {presets.length === 0 && (
                    <p className="text-[9px] text-text-muted">Position your design, then save a preset</p>
                  )}
                </div>
              )}
            </div>

            <div className="glass-separator" />

            {/* History */}
            <div>
              <button
                onClick={() => setShowHistory((v) => !v)}
                aria-expanded={showHistory}
                aria-controls="history-panel"
                className="w-full flex items-center gap-2 text-[10px] font-semibold text-text-muted uppercase tracking-wider mb-1"
              >
                <History size={11} aria-hidden="true" />
                <span className="flex-1 text-left">History ({history.length})</span>
                <ChevronDown size={11} aria-hidden="true" className={`transition-transform duration-200 ${showHistory ? 'rotate-180' : ''}`} />
              </button>
              {showHistory && history.length > 0 && (
                <div id="history-panel" className="glass-card rounded-xl p-1 max-h-40 overflow-y-auto space-y-0.5">
                  {history.map((entry, i) => {
                    const isCurrent = i === historyIndex;
                    const isFuture = i > historyIndex;
                    return (
                      <button
                        key={i}
                        onClick={() => {
                          // Jump to this history state
                          if (i < historyIndex) {
                            for (let j = 0; j < historyIndex - i; j++) undo();
                          } else if (i > historyIndex) {
                            for (let j = 0; j < i - historyIndex; j++) redo();
                          }
                        }}
                        title={`Jump to: ${entry.label}`}
                        className={`w-full flex items-center gap-2 px-2 py-1 rounded-md text-[10px] transition-all duration-150 ${
                          isCurrent
                            ? 'bg-accent/10 text-accent font-semibold'
                            : isFuture
                              ? 'text-text-muted/40 hover:text-text-muted hover:bg-white/30'
                              : 'text-text-secondary hover:bg-white/40'
                        }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${isCurrent ? 'bg-accent' : isFuture ? 'bg-border' : 'bg-text-muted/30'}`} />
                        <span className="truncate">{entry.label}</span>
                        <span className="text-[8px] text-text-muted/50 ml-auto tabular-nums">
                          {new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
              {showHistory && history.length === 0 && (
                <p className="text-[10px] text-text-muted px-1">No history yet</p>
              )}
            </div>
          </>
        )}
      </div>
    </aside>
  );
}

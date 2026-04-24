'use client';

import { useState } from 'react';
import { useEditorStore } from '@/lib/store';
import {
  Lock, Unlock, Maximize, Minimize, MoveHorizontal, MoveVertical, RectangleHorizontal,
  FlipHorizontal2, FlipVertical2,
  AlignCenterHorizontal, AlignCenterVertical, AlignStartVertical, AlignEndVertical, AlignStartHorizontal, AlignEndHorizontal,
  RotateCcw,
} from 'lucide-react';

const FIT_MODES = [
  { id: 'cover' as const, label: 'Fit', icon: Maximize, tip: 'Fit to zone — edges align with zone boundary' },
  { id: 'contain' as const, label: 'Inside', icon: Minimize, tip: 'Fit inside — entire image visible, may have gaps' },
  { id: 'fit-width' as const, label: 'Width', icon: MoveHorizontal, tip: 'Match zone width, height follows ratio' },
  { id: 'fit-height' as const, label: 'Height', icon: MoveVertical, tip: 'Match zone height, width follows ratio' },
  { id: 'stretch' as const, label: 'Stretch', icon: RectangleHorizontal, tip: 'Stretch to fill — independent X/Y, may distort' },
];

export function TransformControls() {
  const activeZoneId = useEditorStore((s) => s.activeZoneId);
  const zoneDesigns = useEditorStore((s) => s.zoneDesigns);
  const selectedDevice = useEditorStore((s) => s.selectedDevice);
  const updateDesignTransform = useEditorStore((s) => s.updateDesignTransform);
  const fitDesignToZone = useEditorStore((s) => s.fitDesignToZone);
  const activeFitMode = useEditorStore((s) => s.activeFitMode);
  const pushHistory = useEditorStore((s) => s.pushHistory);

  const [scaleLocked, setScaleLocked] = useState(true);

  const design = activeZoneId ? zoneDesigns[activeZoneId] : null;
  if (!design?.designImage || !activeZoneId) return null;

  const { transform } = design;
  const zone = selectedDevice?.zones.find((z) => z.id === activeZoneId);

  // Flip handlers
  const toggleFlipH = () => {
    pushHistory();
    updateDesignTransform(activeZoneId, { flipH: !transform.flipH });
  };
  const toggleFlipV = () => {
    pushHistory();
    updateDesignTransform(activeZoneId, { flipV: !transform.flipV });
  };

  // Reset transform
  const resetTransform = () => {
    pushHistory();
    updateDesignTransform(activeZoneId, {
      x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0, flipH: false, flipV: false, opacity: 1,
    });
  };

  // Align handlers — need image dimensions to compute position
  const alignToZone = (alignment: string) => {
    if (!zone || !design.designImage) return;
    pushHistory();

    const img = new Image();
    img.onload = () => {
      const iw = img.naturalWidth;
      const ih = img.naturalHeight;
      const zb = zone.bounds;
      const t = design.transform;
      const sw = iw * t.scaleX;
      const sh = ih * t.scaleY;

      switch (alignment) {
        case 'center-h':
          updateDesignTransform(activeZoneId, { x: zb.x + (zb.width - sw) / 2 });
          break;
        case 'center-v':
          updateDesignTransform(activeZoneId, { y: zb.y + (zb.height - sh) / 2 });
          break;
        case 'left':
          updateDesignTransform(activeZoneId, { x: zb.x });
          break;
        case 'right':
          updateDesignTransform(activeZoneId, { x: zb.x + zb.width - sw });
          break;
        case 'top':
          updateDesignTransform(activeZoneId, { y: zb.y });
          break;
        case 'bottom':
          updateDesignTransform(activeZoneId, { y: zb.y + zb.height - sh });
          break;
      }
    };
    img.src = design.designImage;
  };

  const iconBtnClass = 'w-7 h-7 flex items-center justify-center rounded-lg border border-border bg-surface text-text-secondary hover:border-accent hover:text-accent hover:bg-accent-light transition-all duration-200';
  const iconBtnActiveClass = 'w-7 h-7 flex items-center justify-center rounded-lg border border-accent bg-accent text-white shadow-sm transition-all duration-200';

  return (
    <div className="space-y-2 p-3 bg-surface-hover rounded-xl">
      {/* Header + Reset */}
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Transform</p>
        <button
          onClick={resetTransform}
          title="Reset all transforms to default"
          className="flex items-center gap-1 text-[9px] text-text-muted hover:text-accent transition-colors"
        >
          <RotateCcw size={10} />
          Reset
        </button>
      </div>

      {/* X / Y */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-[10px] font-medium text-text-muted">X</label>
          <input
            type="number"
            value={Math.round(transform.x)}
            onChange={(e) => updateDesignTransform(activeZoneId, { x: Number(e.target.value) })}
            className="w-full px-2 py-1 text-xs font-mono tabular-nums border border-border rounded-lg bg-surface focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-all duration-200"
          />
        </div>
        <div>
          <label className="text-[10px] font-medium text-text-muted">Y</label>
          <input
            type="number"
            value={Math.round(transform.y)}
            onChange={(e) => updateDesignTransform(activeZoneId, { y: Number(e.target.value) })}
            className="w-full px-2 py-1 text-xs font-mono tabular-nums border border-border rounded-lg bg-surface focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-all duration-200"
          />
        </div>
      </div>

      {/* Scale X, lock, Scale Y */}
      <div className="flex items-end gap-1">
        <div className="flex-1">
          <label className="text-[10px] font-medium text-text-muted">Scale X</label>
          <input
            type="number"
            step={0.1}
            value={transform.scaleX.toFixed(2)}
            onChange={(e) => {
              const val = Number(e.target.value);
              updateDesignTransform(activeZoneId, scaleLocked ? { scaleX: val, scaleY: val } : { scaleX: val });
            }}
            className="w-full px-2 py-1 text-xs font-mono tabular-nums border border-border rounded-lg bg-surface focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-all duration-200"
          />
        </div>
        <button
          onClick={() => setScaleLocked((v) => !v)}
          title={scaleLocked ? 'Unlock aspect ratio' : 'Lock aspect ratio'}
          className={`mb-0.5 w-6 h-6 flex items-center justify-center rounded-lg border transition-all duration-200 flex-shrink-0 ${
            scaleLocked ? 'bg-accent text-white border-accent' : 'bg-surface text-text-muted border-border hover:border-accent hover:text-accent'
          }`}
        >
          {scaleLocked ? <Lock size={10} /> : <Unlock size={10} />}
        </button>
        <div className="flex-1">
          <label className="text-[10px] font-medium text-text-muted">Scale Y</label>
          <input
            type="number"
            step={0.1}
            value={transform.scaleY.toFixed(2)}
            onChange={(e) => {
              const val = Number(e.target.value);
              updateDesignTransform(activeZoneId, scaleLocked ? { scaleX: val, scaleY: val } : { scaleY: val });
            }}
            className="w-full px-2 py-1 text-xs font-mono tabular-nums border border-border rounded-lg bg-surface focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-all duration-200"
          />
        </div>
      </div>

      {/* Rotation */}
      <div>
        <label className="text-[10px] font-medium text-text-muted">
          Rotation: {Math.round(transform.rotation)}°
        </label>
        <input
          type="range"
          min={-180}
          max={180}
          value={transform.rotation}
          onChange={(e) => updateDesignTransform(activeZoneId, { rotation: Number(e.target.value) })}
          className="w-full"
        />
      </div>

      {/* Opacity */}
      <div>
        <label className="text-[10px] font-medium text-text-muted">
          Opacity: {Math.round((transform.opacity ?? 1) * 100)}%
        </label>
        <input
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={transform.opacity ?? 1}
          onChange={(e) => updateDesignTransform(activeZoneId, { opacity: parseFloat(e.target.value) })}
          className="w-full"
        />
      </div>

      {/* Flip + Align row */}
      <div className="flex items-center gap-3">
        {/* Flip */}
        <div className="flex gap-1">
          <button onClick={toggleFlipH} title="Flip horizontal" className={transform.flipH ? iconBtnActiveClass : iconBtnClass}>
            <FlipHorizontal2 size={12} />
          </button>
          <button onClick={toggleFlipV} title="Flip vertical" className={transform.flipV ? iconBtnActiveClass : iconBtnClass}>
            <FlipVertical2 size={12} />
          </button>
        </div>

        <div className="w-px h-5 bg-border" />

        {/* Align to zone */}
        <div className="flex gap-1">
          <button onClick={() => alignToZone('left')} title="Align left edge" className={iconBtnClass}>
            <AlignStartVertical size={12} />
          </button>
          <button onClick={() => alignToZone('center-h')} title="Center horizontally" className={iconBtnClass}>
            <AlignCenterHorizontal size={12} />
          </button>
          <button onClick={() => alignToZone('right')} title="Align right edge" className={iconBtnClass}>
            <AlignEndVertical size={12} />
          </button>
          <button onClick={() => alignToZone('top')} title="Align top edge" className={iconBtnClass}>
            <AlignStartHorizontal size={12} />
          </button>
          <button onClick={() => alignToZone('center-v')} title="Center vertically" className={iconBtnClass}>
            <AlignCenterVertical size={12} />
          </button>
          <button onClick={() => alignToZone('bottom')} title="Align bottom edge" className={iconBtnClass}>
            <AlignEndHorizontal size={12} />
          </button>
        </div>
      </div>

      {/* Quick fit modes */}
      <div>
        <p className="text-[10px] font-medium text-text-muted mb-1">Quick Fit</p>
        <div className="flex gap-1">
          {FIT_MODES.map((m) => {
            const isActive = activeFitMode === m.id;
            return (
              <button
                key={m.id}
                onClick={() => fitDesignToZone(activeZoneId, m.id)}
                title={m.tip}
                className={`flex-1 flex flex-col items-center gap-0.5 px-1 py-1.5 text-[9px] font-medium rounded-lg border transition-all duration-200 ${
                  isActive
                    ? 'bg-accent text-white border-accent shadow-sm'
                    : 'text-text-secondary bg-surface border-border hover:border-accent hover:text-accent hover:bg-accent-light'
                }`}
              >
                <m.icon size={12} />
                {m.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

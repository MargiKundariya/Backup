'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { DeviceTemplate, SkinZone } from '@/types';
import { useTemplateStore } from '@/lib/templateStore';
import { Button } from '@/components/ui/Button';
import { Trash2, Plus, Save, X, Info, Target, MousePointer2, CheckCircle, Loader2 } from 'lucide-react';

interface ZoneEditorProps {
  device: DeviceTemplate;
}

export function ZoneEditor({ device }: ZoneEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [zones, setZones] = useState<SkinZone[]>(device.zones);
  const [drawing, setDrawing] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [currentRect, setCurrentRect] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);
  const [newZoneName, setNewZoneName] = useState('');
  const [templateImage, setTemplateImage] = useState<HTMLImageElement | null>(null);
  const [displayScale, setDisplayScale] = useState(1);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const updateZones = useTemplateStore((s) => s.updateZones);

  // Load template image
  useEffect(() => {
    const loadImg = async () => {
      const src = device.templatePath;
      if (!src) return;

      const img = new Image();
      img.onload = () => {
        setTemplateImage(img);
        // Calculate scale to fit in container
        const scale = Math.min(800 / img.naturalWidth, 600 / img.naturalHeight);
        setDisplayScale(scale);
      };
      img.src = src;
    };
    loadImg();
  }, [device.templatePath]);

  // Render canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !templateImage) return;

    const ctx = canvas.getContext('2d')!;
    const w = templateImage.naturalWidth * displayScale;
    const h = templateImage.naturalHeight * displayScale;
    canvas.width = w;
    canvas.height = h;

    ctx.clearRect(0, 0, w, h);
    ctx.drawImage(templateImage, 0, 0, w, h);

    // Draw existing zones
    for (const zone of zones) {
      ctx.strokeStyle = '#5b5ff6';
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 4]);
      ctx.strokeRect(
        zone.bounds.x * displayScale,
        zone.bounds.y * displayScale,
        zone.bounds.width * displayScale,
        zone.bounds.height * displayScale
      );
      ctx.setLineDash([]);

      // Fill with subtle overlay
      ctx.fillStyle = 'rgba(91, 95, 246, 0.1)';
      ctx.fillRect(
        zone.bounds.x * displayScale,
        zone.bounds.y * displayScale,
        zone.bounds.width * displayScale,
        zone.bounds.height * displayScale
      );

      // Label background
      ctx.fillStyle = '#5b5ff6';
      const labelText = zone.name;
      ctx.font = 'bold 10px Inter, sans-serif';
      const textWidth = ctx.measureText(labelText).width;
      
      ctx.beginPath();
      ctx.roundRect(
        zone.bounds.x * displayScale,
        zone.bounds.y * displayScale - 20,
        textWidth + 12,
        18,
        [4, 4, 0, 0]
      );
      ctx.fill();

      // Label text
      ctx.fillStyle = '#ffffff';
      ctx.fillText(
        labelText,
        zone.bounds.x * displayScale + 6,
        zone.bounds.y * displayScale - 7
      );
    }

    // Draw current rect being drawn
    if (currentRect) {
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 2]);
      ctx.strokeRect(
        currentRect.x * displayScale,
        currentRect.y * displayScale,
        currentRect.width * displayScale,
        currentRect.height * displayScale
      );
      ctx.setLineDash([]);
      
      ctx.fillStyle = 'rgba(239, 68, 68, 0.1)';
      ctx.fillRect(
        currentRect.x * displayScale,
        currentRect.y * displayScale,
        currentRect.width * displayScale,
        currentRect.height * displayScale
      );
    }
  }, [templateImage, zones, currentRect, displayScale]);

  const getCanvasPos = useCallback(
    (e: React.MouseEvent) => {
      const canvas = canvasRef.current;
      if (!canvas) return { x: 0, y: 0 };
      const rect = canvas.getBoundingClientRect();
      return {
        x: Math.round((e.clientX - rect.left) / displayScale),
        y: Math.round((e.clientY - rect.top) / displayScale),
      };
    },
    [displayScale]
  );

  const handleMouseDown = (e: React.MouseEvent) => {
    const pos = getCanvasPos(e);
    setStartPos(pos);
    setDrawing(true);
    setSaved(false);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!drawing) return;
    const pos = getCanvasPos(e);
    setCurrentRect({
      x: Math.min(startPos.x, pos.x),
      y: Math.min(startPos.y, pos.y),
      width: Math.max(1, Math.abs(pos.x - startPos.x)),
      height: Math.max(1, Math.abs(pos.y - startPos.y)),
    });
  };

  const handleMouseUp = () => {
    setDrawing(false);
    if (currentRect && currentRect.width > 5 && currentRect.height > 5) {
      // Keep rect visible for naming
    } else {
      setCurrentRect(null);
    }
  };

  const addZone = () => {
    if (!currentRect || !newZoneName) return;

    const zone: SkinZone = {
      id: `${device.id}-${uuidv4().slice(0, 8)}`,
      name: newZoneName,
      bounds: currentRect,
    };

    setZones([...zones, zone]);
    setCurrentRect(null);
    setNewZoneName('');
  };

  const removeZone = (id: string) => {
    setZones((prev) => prev.filter((z) => z.id !== id));
    setSaved(false);
  };

  const saveZones = async () => {
    setSaving(true);
    try {
      await updateZones(device.id, zones);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-10">
      <div className="lg:col-span-3 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-accent/10 rounded-xl flex items-center justify-center text-accent">
              <Target size={22} />
            </div>
            <div>
              <h3 className="text-xl font-black text-text-primary tracking-tight">Zone Mapping Editor</h3>
              <p className="text-sm text-text-muted font-medium">Click and drag on the template to define active areas</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-xl border border-blue-100 text-[10px] font-black uppercase tracking-widest">
            <Info size={14} />
            Precision: {Math.round(1/displayScale)}x
          </div>
        </div>

        <div className="bg-slate-900 rounded-[40px] p-10 flex items-center justify-center border-8 border-slate-100 shadow-inner overflow-auto custom-scrollbar min-h-[500px]">
          <div className="relative group">
            <canvas
              ref={canvasRef}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              className="cursor-crosshair shadow-2xl rounded-2xl bg-white"
            />
            {!drawing && !currentRect && (
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                <div className="bg-black/60 backdrop-blur-sm text-white px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest flex items-center gap-2">
                  <MousePointer2 size={16} />
                  Start Drawing
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-8">
        <div className="bg-white border border-border rounded-[32px] p-8 shadow-sm space-y-6">
          <h4 className="text-xs font-black text-text-muted uppercase tracking-[0.2em]">Active Zones</h4>
          
          {currentRect ? (
            <div className="p-5 bg-red-50 border border-red-100 rounded-2xl space-y-4 animate-in slide-in-from-right-4">
              <p className="text-[10px] font-black text-red-600 uppercase tracking-widest">New Selection</p>
              <div className="space-y-2">
                <input
                  autoFocus
                  type="text"
                  value={newZoneName}
                  onChange={(e) => setNewZoneName(e.target.value)}
                  placeholder="Zone Name (e.g. Side Rail)"
                  className="w-full px-4 py-3 bg-white border border-red-200 rounded-xl focus:ring-4 focus:ring-red-100 outline-none transition-all font-bold text-sm"
                  onKeyDown={(e) => e.key === 'Enter' && addZone()}
                />
                <div className="flex gap-2">
                  <Button onClick={addZone} disabled={!newZoneName} className="flex-1 rounded-xl h-10 bg-red-500 hover:bg-red-600">
                    <Plus size={16} />
                  </Button>
                  <Button variant="ghost" onClick={() => setCurrentRect(null)} className="rounded-xl h-10 px-3 text-red-400">
                    <X size={16} />
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 px-4 border-2 border-dashed border-slate-100 rounded-2xl">
               <p className="text-[11px] text-text-muted font-bold italic">No area selected. Drag on canvas to begin.</p>
            </div>
          )}

          <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
            {zones.length === 0 ? (
               <div className="py-10 text-center">
                 <Target className="mx-auto mb-2 opacity-10" size={32} />
                 <p className="text-[10px] font-black text-text-muted uppercase tracking-widest">No zones mapped</p>
               </div>
            ) : (
              zones.map((zone) => (
                <div
                  key={zone.id}
                  className="flex items-center justify-between p-4 bg-slate-50 border border-border rounded-2xl group hover:border-accent/40 transition-all hover:shadow-sm"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-black text-text-primary truncate tracking-tight">{zone.name}</p>
                    <p className="text-[10px] text-text-muted font-bold font-mono">
                      {zone.bounds.width}x{zone.bounds.height} PX
                    </p>
                  </div>
                  <button
                    onClick={() => removeZone(zone.id)}
                    className="p-2 text-text-muted hover:text-red-500 hover:bg-red-50 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))
            )}
          </div>

          <div className="pt-4 border-t border-border">
            <Button 
              onClick={saveZones} 
              disabled={saving}
              className={`w-full rounded-[20px] py-4 font-black gap-3 transition-all ${
                saved ? 'bg-green-600 hover:bg-green-600' : ''
              }`}
            >
              {saving ? (
                <Loader2 size={20} className="animate-spin" />
              ) : saved ? (
                <CheckCircle size={20} />
              ) : (
                <Save size={20} />
              )}
              {saving ? 'Persisting...' : saved ? 'Successfully Saved' : 'Commit Changes'}
            </Button>
          </div>
        </div>
        
        <div className="bg-slate-50 p-6 rounded-[32px] border border-border space-y-3">
          <h5 className="text-[10px] font-black text-text-muted uppercase tracking-widest">Editor Shortcuts</h5>
          <div className="space-y-2">
            <div className="flex justify-between text-[11px] font-bold">
              <span className="text-text-muted">New Zone</span>
              <span className="text-text-primary bg-white px-1.5 py-0.5 rounded border border-border">Drag Mouse</span>
            </div>
            <div className="flex justify-between text-[11px] font-bold">
              <span className="text-text-muted">Confirm</span>
              <span className="text-text-primary bg-white px-1.5 py-0.5 rounded border border-border">Enter Key</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

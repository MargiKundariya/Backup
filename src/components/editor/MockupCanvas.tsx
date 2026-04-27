'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useEditorStore } from '@/lib/store';
import { processTemplate, ProcessedDevice } from '@/lib/templateProcessor';
import { compositeDevice } from '@/lib/compositing';
import { backgroundScenes } from '@/data/backgrounds';
import { loadImage } from '@/lib/imageUtils';
import { drawLinearGradient } from '@/lib/gradientUtils';
import { ZoneSelector } from './ZoneSelector';
import {
  Undo2, Redo2, ZoomIn, ZoomOut, Maximize, RotateCcw,
  Keyboard, ChevronLeft, ChevronRight, Crosshair, X, Crop, Grid3x3, SplitSquareHorizontal,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { drawWatermark } from '@/lib/watermark';

type InteractionMode = 'none' | 'pan' | 'drag-design' | 'resize-design' | 'drag-text';
type ResizeHandle = 'tl' | 'tr' | 'bl' | 'br' | null;

export function MockupCanvas() {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [processed, setProcessed] = useState<ProcessedDevice | null>(null);
  const [loading, setLoading] = useState(false);
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 600 });
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });

  const interactionMode = useRef<InteractionMode>('none');
  const activeHandle = useRef<ResizeHandle>(null);
  const lastMouse = useRef({ x: 0, y: 0 });
  const designImageSize = useRef({ width: 0, height: 0 });
  const dragTextId = useRef<string | null>(null);
  const deviceRect = useRef({ x: 0, y: 0, width: 0, height: 0, scale: 1 });

  // ── Store selectors ──────────────────────────────────────────────────────────
  const selectedDevice        = useEditorStore((s) => s.selectedDevice);
  const activeZoneId          = useEditorStore((s) => s.activeZoneId);
  const backgroundScene       = useEditorStore((s) => s.backgroundScene);
  const customBackgroundImage = useEditorStore((s) => s.customBackgroundImage);
  const updateDesignTransform = useEditorStore((s) => s.updateDesignTransform);
  const updateTextLayerTransform = useEditorStore((s) => s.updateTextLayerTransform);
  const pushHistory           = useEditorStore((s) => s.pushHistory);
  const undo                  = useEditorStore((s) => s.undo);
  const redo                  = useEditorStore((s) => s.redo);
  const historyIndex          = useEditorStore((s) => s.historyIndex);
  const history               = useEditorStore((s) => s.history);
  const bulkStagingActive     = useEditorStore((s) => s.bulkStagingActive);
  const bulkStagingDesignName = useEditorStore((s) => s.bulkStagingDesignName);
  const bulkStagingIndex      = useEditorStore((s) => s.bulkStagingIndex);
  const bulkStagingTotal      = useEditorStore((s) => s.bulkStagingTotal);
  const stagingNavCallback    = useEditorStore((s) => s.stagingNavCallback);
  const exportOptions         = useEditorStore((s) => s.exportOptions);
  const { user }              = useAuth();

  // Tracks transform changes to trigger re-renders
  const zoneDesignsVersion = useEditorStore((s) =>
    Object.entries(s.zoneDesigns)
      .map(([id, d]) => {
        const t = d.transform;
        const textVers = d.textLayers.map(tl => `${tl.id}:${tl.transform.x},${tl.transform.y}`).join(',');
        return `${id}:${t.x},${t.y},${t.scaleX},${t.scaleY}|text:${textVers}`;
      })
      .join('||')
  );

  // Only changes when the image URL itself changes (not on every transform update)
  const activeDesignImage = useEditorStore(
    (s) => (s.activeZoneId ? s.zoneDesigns[s.activeZoneId]?.designImage ?? null : null)
  );

  // ── Resolve which device the canvas should render ────────────────────────────
  // @ts-ignore
  const selectedDevicesRaw    = useEditorStore((s) => s.selectedDevices ?? null);
  const allSelectedDevices: typeof selectedDevice[] =
    selectedDevicesRaw ?? (selectedDevice ? [selectedDevice] : []);
  const activePreviewDeviceId = useEditorStore((s) => s.activePreviewDeviceId);

  const canvasDevice = (() => {
    if (!activePreviewDeviceId) return selectedDevice;
    const found = allSelectedDevices.find(
      (d, i) => (d?.id ?? String(i)) === activePreviewDeviceId
    );
    return found ?? selectedDevice;
  })();

  const [showShortcuts, setShowShortcuts] = useState(false);
  const [cropPreview, setCropPreview]     = useState(false);
  const [showGrid, setShowGrid]           = useState(false);
  const [compareMode, setCompareMode]     = useState(false);
  const shortcutsRef = useRef<HTMLDivElement>(null);

  // ── Keyboard shortcuts ───────────────────────────────────────────────────────
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
        e.preventDefault();
        if (e.shiftKey) { redo(); } else { undo(); }
        return;
      }
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        if (
          document.activeElement?.tagName === 'INPUT' ||
          document.activeElement?.tagName === 'TEXTAREA' ||
          document.activeElement?.tagName === 'SELECT'
        ) return;
        const zoneId = useEditorStore.getState().activeZoneId;
        const design = zoneId ? useEditorStore.getState().zoneDesigns[zoneId] : null;
        if (!zoneId || !design?.designImage) return;
        e.preventDefault();
        const step = e.shiftKey ? 10 : 1;
        const dx = e.key === 'ArrowLeft' ? -step : e.key === 'ArrowRight' ? step : 0;
        const dy = e.key === 'ArrowUp'   ? -step : e.key === 'ArrowDown'  ? step : 0;
        updateDesignTransform(zoneId, {
          x: design.transform.x + dx,
          y: design.transform.y + dy,
        });
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo, updateDesignTransform]);

  // Dismiss shortcuts tooltip on outside click
  useEffect(() => {
    if (!showShortcuts) return;
    const handler = (e: MouseEvent) => {
      if (shortcutsRef.current && !shortcutsRef.current.contains(e.target as Node)) {
        setShowShortcuts(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showShortcuts]);

  // ── Resize observer ──────────────────────────────────────────────────────────
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        setCanvasSize({
          width: entry.contentRect.width,
          height: entry.contentRect.height,
        });
      }
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  // ── Process template ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!canvasDevice) {
      setProcessed(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    processTemplate(canvasDevice).then((result) => {
      if (!cancelled) {
        setProcessed(result);
        setLoading(false);
        setZoom(1);
        setPan({ x: 0, y: 0 });
      }
    });
    return () => { cancelled = true; };
  }, [canvasDevice]);

  // ── Load design image dimensions ─────────────────────────────────────────────
  // Keyed only on the image URL so it never resets mid-drag on transform updates.
  useEffect(() => {
    if (!activeDesignImage) {
      designImageSize.current = { width: 0, height: 0 };
      return;
    }
    let cancelled = false;
    const img = new Image();
    img.onload = () => {
      if (!cancelled) {
        designImageSize.current = { width: img.naturalWidth, height: img.naturalHeight };
      }
    };
    img.src = activeDesignImage;
    return () => { cancelled = true; };
  }, [activeDesignImage]);

  const zoomToFit = useCallback(() => {
    if (!processed) return;
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, [processed]);

  const isRendering = useRef(false);
  const renderRequested = useRef(false);

  // ── Main render ──────────────────────────────────────────────────────────────
  const render = useCallback(async () => {
    if (isRendering.current) {
      renderRequested.current = true;
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas || !processed) return;

    isRendering.current = true;
    renderRequested.current = false;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      isRendering.current = false;
      return;
    }


    const { zoneDesigns, activeZoneId } = useEditorStore.getState();

    const { width, height } = canvasSize;
    const dpr = window.devicePixelRatio;
    canvas.width  = width  * dpr;
    canvas.height = height * dpr;
    canvas.style.width  = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, width, height);

    // Background
    const bg = backgroundScenes.find((s) => s.id === backgroundScene);
    if (backgroundScene === 'custom' && customBackgroundImage) {
      try {
        const bgImg = await loadImage(customBackgroundImage);
        ctx.drawImage(bgImg, 0, 0, width, height);
      } catch {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);
      }
    } else if (bg && bg.value !== 'transparent') {
      if (bg.type === 'solid') {
        ctx.fillStyle = bg.value;
        ctx.fillRect(0, 0, width, height);
      } else if (bg.type === 'gradient') {
        drawLinearGradient(ctx, bg.value, width, height);
      }
    } else {
      const tileSize = 10;
      for (let y = 0; y < height; y += tileSize) {
        for (let x = 0; x < width; x += tileSize) {
          ctx.fillStyle =
            (Math.floor(x / tileSize) + Math.floor(y / tileSize)) % 2 === 0
              ? '#e5e5e5' : '#ffffff';
          ctx.fillRect(x, y, tileSize, tileSize);
        }
      }
    }

    // Live watermark preview (Behind device)
    if (exportOptions.addWatermark) {
      ctx.save();
      await drawWatermark(ctx, width, height, exportOptions, user?.logo_url);
      ctx.restore();
    }

    try {
      const renderDesigns = compareMode ? {} : zoneDesigns;
      const dScale =
        Math.min(width / processed.width, height / processed.height) * 0.85 * zoom;

      const composited = await compositeDevice(processed, renderDesigns, { scale: dScale });

      const dx = (width  - processed.width  * dScale) / 2 + pan.x;
      const dy = (height - processed.height * dScale) / 2 + pan.y;

      deviceRect.current = {
        x: dx, y: dy,
        width:  processed.width  * dScale,
        height: processed.height * dScale,
        scale: dScale,
      };

      ctx.drawImage(
        composited,
        0, 0, composited.width, composited.height,
        dx, dy,
        composited.width,
        composited.height
      );

      
      // Grid overlay
      if (showGrid) {
        ctx.save();
        ctx.strokeStyle = 'rgba(91, 95, 246, 0.12)';
        ctx.lineWidth = 0.5;
        const gridStep = 50 * dScale;
        for (let gx = dx; gx <= dx + processed.width * dScale; gx += gridStep) {
          ctx.beginPath(); ctx.moveTo(gx, dy); ctx.lineTo(gx, dy + processed.height * dScale); ctx.stroke();
        }
        for (let gy = dy; gy <= dy + processed.height * dScale; gy += gridStep) {
          ctx.beginPath(); ctx.moveTo(dx, gy); ctx.lineTo(dx + processed.width * dScale, gy); ctx.stroke();
        }
        const cx = dx + processed.width  * dScale / 2;
        const cy = dy + processed.height * dScale / 2;
        ctx.strokeStyle = 'rgba(91, 95, 246, 0.25)';
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        ctx.beginPath(); ctx.moveTo(cx, dy); ctx.lineTo(cx, dy + processed.height * dScale); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(dx, cy); ctx.lineTo(dx + processed.width * dScale, cy);  ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();
      }

      // Crop / zone boundary preview
      if (cropPreview && activeZoneId && canvasDevice) {
        const activeZone = canvasDevice.zones.find((z) => z.id === activeZoneId);
        if (activeZone) {
          const zb = activeZone.bounds;
          const zx = dx + zb.x      * dScale;
          const zy = dy + zb.y      * dScale;
          const zw =      zb.width  * dScale;
          const zh =      zb.height * dScale;
          ctx.save();
          ctx.strokeStyle = 'rgba(91, 95, 246, 0.3)';
          ctx.lineWidth = 1;
          ctx.setLineDash([4, 4]);
          ctx.strokeRect(zx, zy, zw, zh);
          ctx.setLineDash([]);
          ctx.restore();
        }
      }

      // Resize handles + selection box
      if (activeZoneId && zoneDesigns[activeZoneId]?.designImage) {
        const design = zoneDesigns[activeZoneId];
        const t  = design.transform;
        const iw = designImageSize.current.width;
        const ih = designImageSize.current.height;

        const zone = canvasDevice?.zones.find((z) => z.id === activeZoneId);
        const zoneOriginX = zone?.bounds.x ?? 0;
        const zoneOriginY = zone?.bounds.y ?? 0;

        if (iw > 0 && ih > 0) {
          const sx = dx + t.x * dScale;
          const sy = dy + t.y * dScale;
          const sw =       iw * t.scaleX       * dScale;
          const sh =       ih * t.scaleY       * dScale;

          ctx.save();
          ctx.strokeStyle = '#5b5ff6';
          ctx.lineWidth   = 1.5;
          ctx.setLineDash([6, 3]);
          ctx.strokeRect(sx, sy, sw, sh);
          ctx.setLineDash([]);

          const handleSize = 8;
          for (const h of [
            { x: sx,      y: sy      },
            { x: sx + sw, y: sy      },
            { x: sx,      y: sy + sh },
            { x: sx + sw, y: sy + sh },
          ]) {
            ctx.fillStyle   = '#ffffff';
            ctx.strokeStyle = '#5b5ff6';
            ctx.lineWidth   = 2;
            ctx.fillRect  (h.x - handleSize / 2, h.y - handleSize / 2, handleSize, handleSize);
            ctx.strokeRect(h.x - handleSize / 2, h.y - handleSize / 2, handleSize, handleSize);
          }
          ctx.restore();
        }

        // Text layer bounding boxes
        const textLayers = design.textLayers;
        if (textLayers.length > 0) {
          ctx.save();
          for (const text of textLayers) {
            const tt = text.transform;
            ctx.font = `${text.fontSize}px ${text.fontFamily}`;
            const metrics = ctx.measureText(text.content);
            const tsx = dx + tt.x * dScale;
            const tsy = dy +  tt.y       * dScale;
            const tsw =       metrics.width * tt.scaleX * dScale;
            const tsh =       text.fontSize * tt.scaleY * dScale;
            ctx.strokeStyle = '#5b5ff6';
            ctx.lineWidth   = 1;
            ctx.setLineDash([3, 3]);
            ctx.strokeRect(tsx, tsy, tsw, tsh);
            ctx.setLineDash([]);
          }
          ctx.restore();
        }
      }
    } catch (err) {
      console.error('Render error:', err);
    } finally {
      isRendering.current = false;
      if (renderRequested.current) {
        requestAnimationFrame(render);
      }
    }

  }, [processed, backgroundScene, customBackgroundImage, canvasSize, zoom, pan, cropPreview, showGrid, compareMode, canvasDevice]);

  // Re-render whenever transforms change
  useEffect(() => {
    let rafId: number;
    let cancelled = false;
    rafId = requestAnimationFrame(() => { if (!cancelled) render(); });
    return () => { cancelled = true; cancelAnimationFrame(rafId); };
  }, [render, zoneDesignsVersion]);

  // Wheel zoom (passive: false so preventDefault works)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      setZoom((prev) => Math.max(0.1, Math.min(5, prev - e.deltaY * 0.001)));
    };
    canvas.addEventListener('wheel', handleWheel, { passive: false });
    return () => canvas.removeEventListener('wheel', handleWheel);
  }, []);


  const screenToDevice = useCallback((clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const dr   = deviceRect.current;
    return {
      x: (clientX - rect.left - dr.x) / dr.scale,
      y: (clientY - rect.top  - dr.y) / dr.scale,
    };
  }, []);

  
  const hitTestTextLayer = useCallback((clientX: number, clientY: number): string | null => {
    const { activeZoneId, zoneDesigns } = useEditorStore.getState();
    if (!activeZoneId || !zoneDesigns[activeZoneId]) return null;
    const design = zoneDesigns[activeZoneId];
    if (!design.textLayers.length) return null;
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const canvasRect = canvas.getBoundingClientRect();
    const mx  = clientX - canvasRect.left;
    const my  = clientY - canvasRect.top;
    const dr  = deviceRect.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    for (let i = design.textLayers.length - 1; i >= 0; i--) {
      const text = design.textLayers[i];
      const tt   = text.transform;
      ctx.font   = `${text.fontSize}px ${text.fontFamily}`;
      const tsw  = ctx.measureText(text.content).width * tt.scaleX * dr.scale;
      const tsh  = text.fontSize * tt.scaleY * dr.scale;
      const tsx  = dr.x + tt.x * dr.scale;
      const tsy  = dr.y +  tt.y       * dr.scale;
      if (mx >= tsx && mx <= tsx + tsw && my >= tsy && my <= tsy + tsh) return text.id;
    }
    return null;
  }, []);

  const hitTestHandle = useCallback((clientX: number, clientY: number): ResizeHandle => {
    const { activeZoneId, zoneDesigns } = useEditorStore.getState();
    if (!activeZoneId || !zoneDesigns[activeZoneId]?.designImage) return null;
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect   = canvas.getBoundingClientRect();
    const mx     = clientX - rect.left;
    const my     = clientY - rect.top;
    const design = zoneDesigns[activeZoneId];
    const t      = design.transform;
    const iw     = designImageSize.current.width;
    const ih     = designImageSize.current.height;
    if (iw === 0 || ih === 0) return null;
    const zone = canvasDevice?.zones.find((z) => z.id === activeZoneId);
    const zoneOriginX = zone?.bounds.x ?? 0;
    const zoneOriginY = zone?.bounds.y ?? 0;
    const dr  = deviceRect.current;
    const sx  = dr.x + t.x * dr.scale;
    const sy  = dr.y + t.y * dr.scale;
    const sw  =         iw * t.scaleX       * dr.scale;
    const sh  =         ih * t.scaleY       * dr.scale;
    const hit = 12;
    for (const c of [
      { key: 'tl' as ResizeHandle, x: sx,      y: sy      },
      { key: 'tr' as ResizeHandle, x: sx + sw, y: sy      },
      { key: 'bl' as ResizeHandle, x: sx,      y: sy + sh },
      { key: 'br' as ResizeHandle, x: sx + sw, y: sy + sh },
    ]) {
      if (Math.abs(mx - c.x) < hit && Math.abs(my - c.y) < hit) return c.key;
    }
    return null;
  }, [canvasDevice]);

const hitTestDesign = useCallback((clientX: number, clientY: number): boolean => {
  const { activeZoneId, zoneDesigns } = useEditorStore.getState();
  if (!activeZoneId || !zoneDesigns[activeZoneId]?.designImage) return false;

  const canvas = canvasRef.current;
  if (!canvas) return false;

  const zone = canvasDevice?.zones.find((z) => z.id === activeZoneId);
  if (!zone) return false;

  const design = zoneDesigns[activeZoneId];
  const t = design.transform;
  const iw = designImageSize.current.width;
  const ih = designImageSize.current.height;
  if (iw === 0 || ih === 0) return false;

  const rect = canvas.getBoundingClientRect();
  const mx = clientX - rect.left;
  const my = clientY - rect.top;

  const dr = deviceRect.current;

  const sx = dr.x + t.x * dr.scale;
  const sy = dr.y + t.y * dr.scale;
  const sw = iw * t.scaleX * dr.scale;
  const sh = ih * t.scaleY * dr.scale;

  const left = Math.min(sx, sx + sw);
  const right = Math.max(sx, sx + sw);
  const top = Math.min(sy, sy + sh);
  const bottom = Math.max(sy, sy + sh);

  return mx >= left && mx <= right && my >= top && my <= bottom;
}, [canvasDevice]);

 
const handleMouseDown = useCallback((e: React.MouseEvent) => {
  if (e.button !== 0) return;

 
  const handle = hitTestHandle(e.clientX, e.clientY);
  if (handle) {
    interactionMode.current = 'resize-design';
    activeHandle.current = handle;
    lastMouse.current = { x: e.clientX, y: e.clientY };
    pushHistory('Resize');
    return;
  }

  
  const textId = hitTestTextLayer(e.clientX, e.clientY);
  if (textId) {
    interactionMode.current = 'drag-text';
    dragTextId.current = textId;
    lastMouse.current = { x: e.clientX, y: e.clientY };
    pushHistory('Move text');
    return;
  }

  
  const { activeZoneId, zoneDesigns } = useEditorStore.getState();
  if (activeZoneId && zoneDesigns[activeZoneId]?.designImage && hitTestDesign(e.clientX, e.clientY)) {
    interactionMode.current = 'drag-design';
    lastMouse.current = { x: e.clientX, y: e.clientY };
    pushHistory('Move design');
    return;
  }

 
  interactionMode.current = 'pan';
  lastMouse.current = { x: e.clientX, y: e.clientY };

}, [hitTestHandle, hitTestTextLayer, pushHistory, hitTestDesign]);


  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const mode = interactionMode.current;

   
    if (mode === 'none') {
      const handle = hitTestHandle(e.clientX, e.clientY);
      const canvas = canvasRef.current;
      if (canvas) {
        if      (handle === 'tl' || handle === 'br')     canvas.style.cursor = 'nwse-resize';
        else if (handle === 'tr' || handle === 'bl')     canvas.style.cursor = 'nesw-resize';
        else if (hitTestTextLayer(e.clientX, e.clientY)) canvas.style.cursor = 'move';
        else if (hitTestDesign(e.clientX, e.clientY))    canvas.style.cursor = 'move';
        else                                              canvas.style.cursor = 'default';
      }
      return;
    }

    const deltaX = e.clientX - lastMouse.current.x;
    const deltaY = e.clientY - lastMouse.current.y;
    lastMouse.current = { x: e.clientX, y: e.clientY };

   
    if (mode === 'pan') {
      setPan((prev) => ({ x: prev.x + deltaX, y: prev.y + deltaY }));
      return;
    }

    const activeZoneId = useEditorStore.getState().activeZoneId;
    if (!activeZoneId) return;
    const dr = deviceRect.current;

    
    if (mode === 'drag-text') {
      const textId = dragTextId.current;
      if (!textId) return;
      const freshTextLayer = useEditorStore
        .getState()
        .zoneDesigns[activeZoneId]?.textLayers.find((t) => t.id === textId);
      if (!freshTextLayer) return;
      updateTextLayerTransform(activeZoneId, textId, {
        x: freshTextLayer.transform.x + deltaX / dr.scale,
        y: freshTextLayer.transform.y + deltaY / dr.scale,
      });
      return;
    }

   
    if (mode === 'drag-design') {
      const freshDesign = useEditorStore.getState().zoneDesigns[activeZoneId];
      if (!freshDesign) return;
      updateDesignTransform(activeZoneId, {
       x: freshDesign.transform.x + deltaX / dr.scale,
       y: freshDesign.transform.y + deltaY / dr.scale,
      });
      return;
    }

  
    if (mode === 'resize-design') {
      const design = useEditorStore.getState().zoneDesigns[activeZoneId];
      if (!design) return;
      const t  = design.transform;
      const iw = designImageSize.current.width;
      const ih = designImageSize.current.height;
      if (iw === 0 || ih === 0) return;

      const ddx    = deltaX / dr.scale;
      const ddy    = deltaY / dr.scale;
      const handle = activeHandle.current;

      let scaleDelta: number;
      if      (handle === 'br') scaleDelta = ( ddx / iw +  ddy / ih) / 2;
      else if (handle === 'bl') scaleDelta = (-ddx / iw +  ddy / ih) / 2;
      else if (handle === 'tr') scaleDelta = ( ddx / iw + -ddy / ih) / 2;
      else                      scaleDelta = (-ddx / iw + -ddy / ih) / 2; // tl

      const newScale = Math.max(0.05, t.scaleX + scaleDelta);
      const dScaleX  = newScale - t.scaleX;
      let newX       = t.x;
      let newY       = t.y;

      // Anchor the opposite corner
      if      (handle === 'tl') { newX -= iw * dScaleX; newY -= ih * dScaleX; }
      else if (handle === 'tr') {                         newY -= ih * dScaleX; }
      else if (handle === 'bl') { newX -= iw * dScaleX; }
      
      updateDesignTransform(activeZoneId, { scaleX: newScale, scaleY: newScale, x: newX, y: newY });
    }
  }, [updateDesignTransform, updateTextLayerTransform, hitTestHandle, hitTestTextLayer, hitTestDesign]);

  const handleMouseUp = useCallback(() => {
    interactionMode.current = 'none';
    activeHandle.current    = null;
    dragTextId.current      = null;
  }, []);

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="flex-1 flex flex-col h-full">
      {/* Toolbar */}
      <div
        role="toolbar"
        aria-label="Canvas toolbar"
        className="flex items-center gap-3 px-4 py-2.5 border-b border-border bg-surface/80 backdrop-blur-md"
      >
        <ZoneSelector />
        <div role="group" aria-label="History" className="flex items-center gap-1">
          <button
            onClick={undo}
            disabled={historyIndex < 0}
            aria-label="Undo (Cmd+Z)"
            title="Undo (Cmd+Z)"
            className="p-1.5 text-text-secondary bg-surface-hover rounded-lg hover:bg-border-subtle disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-200"
          >
            <Undo2 size={14} aria-hidden="true" />
          </button>
          <button
            onClick={redo}
            disabled={historyIndex >= history.length - 1}
            aria-label="Redo (Shift+Cmd+Z)"
            title="Redo (Shift+Cmd+Z)"
            className="p-1.5 text-text-secondary bg-surface-hover rounded-lg hover:bg-border-subtle disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-200"
          >
            <Redo2 size={14} aria-hidden="true" />
          </button>
        </div>
        <div className="flex-1" />
        <div role="group" aria-label="Zoom" className="flex items-center gap-1">
          <button onClick={() => setZoom((z) => Math.max(0.1, z - 0.25))} aria-label="Zoom out" title="Zoom out" className="w-7 h-7 flex items-center justify-center text-text-secondary bg-surface-hover rounded-lg hover:bg-border-subtle transition-all duration-200">
            <ZoomOut size={14} aria-hidden="true" />
          </button>
          <span aria-live="polite" aria-label={`Zoom ${Math.round(zoom * 100)}%`} className="text-xs font-mono font-medium text-text-muted min-w-[3.5rem] text-center tabular-nums">
            {Math.round(zoom * 100)}%
          </span>
          <button onClick={() => setZoom((z) => Math.min(5, z + 0.25))} aria-label="Zoom in" title="Zoom in" className="w-7 h-7 flex items-center justify-center text-text-secondary bg-surface-hover rounded-lg hover:bg-border-subtle transition-all duration-200">
            <ZoomIn size={14} aria-hidden="true" />
          </button>
          <button onClick={zoomToFit} aria-label="Fit to view" title="Fit to view" className="w-7 h-7 flex items-center justify-center text-text-secondary bg-surface-hover rounded-lg hover:bg-border-subtle transition-all duration-200">
            <Maximize size={14} aria-hidden="true" />
          </button>
          <button onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }} aria-label="Reset zoom and pan" title="Reset zoom and pan" className="w-7 h-7 flex items-center justify-center text-text-secondary bg-surface-hover rounded-lg hover:bg-border-subtle transition-all duration-200">
            <RotateCcw size={14} aria-hidden="true" />
          </button>

          <div className="w-px h-5 bg-border mx-0.5" role="separator" />

          <button
            onClick={() => setCropPreview((v) => !v)}
            aria-label={cropPreview ? 'Hide zone boundary' : 'Show zone boundary'}
            aria-pressed={cropPreview}
            title={cropPreview ? 'Hide zone boundary' : 'Show zone boundary'}
            className={`w-7 h-7 flex items-center justify-center rounded-lg transition-all duration-200 ${cropPreview ? 'bg-accent text-white' : 'bg-surface-hover text-text-secondary hover:bg-border-subtle'}`}
          >
            <Crop size={14} aria-hidden="true" />
          </button>
          <button
            onClick={() => setShowGrid((v) => !v)}
            aria-label={showGrid ? 'Hide alignment grid' : 'Show alignment grid'}
            aria-pressed={showGrid}
            title={showGrid ? 'Hide grid' : 'Show alignment grid'}
            className={`w-7 h-7 flex items-center justify-center rounded-lg transition-all duration-200 ${showGrid ? 'bg-accent text-white' : 'bg-surface-hover text-text-secondary hover:bg-border-subtle'}`}
          >
            <Grid3x3 size={14} aria-hidden="true" />
          </button>
          <button
            onClick={() => setCompareMode((v) => !v)}
            aria-label={compareMode ? 'Exit compare mode' : 'Compare — show raw template'}
            aria-pressed={compareMode}
            title={compareMode ? 'Show design (exit compare)' : 'Compare — show raw template'}
            className={`w-7 h-7 flex items-center justify-center rounded-lg transition-all duration-200 ${compareMode ? 'bg-accent text-white' : 'bg-surface-hover text-text-secondary hover:bg-border-subtle'}`}
          >
            <SplitSquareHorizontal size={14} aria-hidden="true" />
          </button>

          <div className="relative" ref={shortcutsRef}>
            <button
              onClick={() => setShowShortcuts((v) => !v)}
              aria-label="Keyboard shortcuts"
              aria-expanded={showShortcuts}
              title="Keyboard shortcuts"
              className={`w-7 h-7 flex items-center justify-center rounded-lg transition-all duration-200 ${showShortcuts ? 'bg-accent text-white' : 'bg-surface-hover text-text-secondary hover:bg-border-subtle'}`}
            >
              <Keyboard size={14} aria-hidden="true" />
            </button>
            {showShortcuts && (
              <div className="absolute right-0 top-full mt-2 w-56 bg-surface border border-border rounded-xl shadow-lg z-20 p-3 space-y-1.5">
                <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider mb-2">Shortcuts</p>
                {[
                  ['Cmd+Z',        'Undo'],
                  ['Shift+Cmd+Z',  'Redo'],
                  ['Arrow keys',   'Nudge 1px'],
                  ['Shift+Arrow',  'Nudge 10px'],
                  ['Scroll',       'Zoom in/out'],
                  ['Alt+Drag',     'Pan canvas'],
                  ['Drag design',  'Move'],
                  ['Corner handle','Resize'],
                  ['Delete / ⌫',  'Remove design'],
                ].map(([key, desc]) => (
                  <div key={key} className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-mono bg-surface-hover text-text-secondary px-1.5 py-0.5 rounded-md border border-border whitespace-nowrap">{key}</span>
                    <span className="text-[10px] text-text-muted text-right">{desc}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bulk staging banner */}
      {bulkStagingActive && (
        <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 border-b border-amber-200 text-amber-800">
          <span className="text-xs font-medium flex-1 truncate">
            Staging: &ldquo;{bulkStagingDesignName}&rdquo;
            {bulkStagingIndex != null && (
              <span className="text-amber-600"> ({bulkStagingIndex}/{bulkStagingTotal})</span>
            )}
          </span>
          <button onClick={() => stagingNavCallback?.('prev')} disabled={bulkStagingIndex === 1} aria-label="Previous design" title="Previous design" className="w-7 h-7 flex items-center justify-center rounded-lg bg-amber-100 hover:bg-amber-200 disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-200">
            <ChevronLeft size={16} aria-hidden="true" />
          </button>
          <button onClick={() => stagingNavCallback?.('next')} disabled={bulkStagingIndex === bulkStagingTotal} aria-label="Next design" title="Next design" className="w-7 h-7 flex items-center justify-center rounded-lg bg-amber-100 hover:bg-amber-200 disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-200">
            <ChevronRight size={16} aria-hidden="true" />
          </button>
          <button onClick={() => stagingNavCallback?.('capture')} aria-label="Capture current position" title="Capture current position" className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-green-600 text-white hover:bg-green-700 transition-all duration-200">
            <Crosshair size={13} aria-hidden="true" />
            Capture
          </button>
          <button onClick={() => stagingNavCallback?.('exit')} aria-label="Exit staging" title="Exit staging — restores your original design" className="w-7 h-7 flex items-center justify-center rounded-lg bg-amber-100 text-amber-800 hover:bg-amber-200 transition-all duration-200">
            <X size={14} aria-hidden="true" />
          </button>
        </div>
      )}

      {/* Canvas area */}
      <div ref={containerRef} className="flex-1 relative overflow-hidden bg-canvas-bg">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-canvas-bg z-10">
            <div className="flex flex-col items-center gap-4">
              <div className="w-40 h-72 skeleton rounded-3xl" />
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                <span className="text-xs text-text-muted">Loading template...</span>
              </div>
            </div>
          </div>
        )}

        {!canvasDevice && !loading && (
          <div className="absolute inset-0 flex items-center justify-center animate-[fadeInUp_0.3s_ease-out]">
            <div className="text-center">
              <svg className="w-16 h-16 mx-auto text-text-muted/40 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
              <p className="text-text-muted text-sm">Select a device from the sidebar to get started</p>
            </div>
          </div>
        )}

        <canvas
          ref={canvasRef}
          className="block"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        />
      </div>
    </div>
  );
}
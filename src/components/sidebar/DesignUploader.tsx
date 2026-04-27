'use client';
import { useCallback, useRef, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { useEditorStore } from '@/lib/store';
import {
  ImagePlus,
  Maximize,
  Trash2,
  Copy,
  Eye,
  Layers,
  CopyPlus,
  FolderOpen,
  Monitor,
  X,
} from 'lucide-react';

/**
 * DeviceMockupShell
 */
function DeviceMockupShell({
  templatePath,
  designImgUrl,
  deviceName = '',
  active = false,
}: {
  templatePath?: string;
  designImgUrl?: string;
  deviceName?: string;
  active?: boolean;
}) {
  const lower     = deviceName.toLowerCase();
  const isTablet  = lower.includes('tablet') || lower.includes('ipad');
  const isDesktop =
    lower.includes('desktop') ||
    lower.includes('monitor') ||
    lower.includes('laptop') ||
    lower.includes('mac');

  if (templatePath) {
    return (
      <div
        className={`relative w-full flex items-center justify-center rounded-lg overflow-hidden transition-all ${
          active ? 'ring-2 ring-accent' : ''
        }`}
      >
        <img
          src={templatePath}
          alt={deviceName}
          className="w-full h-full object-contain"
          draggable={false}
        />
        {designImgUrl && (
          <img
            src={designImgUrl}
            alt="design preview"
            className="absolute object-cover rounded-sm opacity-90 pointer-events-none"
            style={{ inset: '14% 16%', width: '68%', height: '70%' }}
            draggable={false}
          />
        )}
      </div>
    );
  }

  const borderCls = active
    ? 'border-accent shadow-[0_0_0_1px_var(--accent)]'
    : 'border-[#3a3a3a]';

  const screen = designImgUrl ? (
    <img src={designImgUrl} alt="preview" className="w-full h-full object-cover" />
  ) : (
    <div className="w-full h-full bg-[#2a2a2a] flex items-center justify-center">
      <span className="text-[6px] text-[#555]">–</span>
    </div>
  );

  if (isDesktop) {
    return (
      <div className="flex flex-col items-center gap-[2px] w-full">
        <div
          className={`w-full border-2 ${borderCls} rounded-[3px] bg-[#1e1e1e] overflow-hidden`}
          style={{ aspectRatio: '16/10' }}
        >
          <div className="w-full h-[5px] bg-[#2d2d2d] flex items-center px-[3px] gap-[2px] flex-shrink-0">
            <span className="w-[3px] h-[3px] rounded-full bg-red-400/80" />
            <span className="w-[3px] h-[3px] rounded-full bg-yellow-400/80" />
            <span className="w-[3px] h-[3px] rounded-full bg-green-400/80" />
          </div>
          <div className="w-full bg-white" style={{ height: 'calc(100% - 5px)' }}>{screen}</div>
        </div>
        <div className="w-3 h-[2px] bg-[#3a3a3a] rounded-sm" />
        <div className="w-5 h-[2px] bg-[#3a3a3a] rounded-sm" />
      </div>
    );
  }

  if (isTablet) {
    return (
      <div
        className={`w-full border-2 ${borderCls} rounded-[5px] bg-[#1e1e1e] overflow-hidden flex flex-col`}
        style={{ aspectRatio: '3/4' }}
      >
        <div className="w-full flex justify-center py-[2px] bg-[#2d2d2d] flex-shrink-0">
          <span className="w-[3px] h-[3px] rounded-full bg-[#555]" />
        </div>
        <div className="flex-1 overflow-hidden bg-white">{screen}</div>
        <div className="w-full flex justify-center py-[2px] bg-[#2d2d2d] flex-shrink-0">
          <span className="w-3 h-[2px] rounded-full bg-[#555]" />
        </div>
      </div>
    );
  }

  return (
    <div
      className={`w-full border-2 ${borderCls} rounded-[7px] bg-[#1e1e1e] overflow-hidden flex flex-col`}
      style={{ aspectRatio: '9/19' }}
    >
      <div className="w-full flex justify-center py-[3px] bg-[#2d2d2d] flex-shrink-0">
        <span className="w-5 h-[3px] rounded-full bg-[#444]" />
      </div>
      <div className="flex-1 overflow-hidden bg-white">{screen}</div>
      <div className="w-full flex justify-center py-[3px] bg-[#2d2d2d] flex-shrink-0">
        <span className="w-4 h-[2px] rounded-full bg-[#555]" />
      </div>
    </div>
  );
}

export function DesignUploader() {
  const selectedDevice        = useEditorStore((s) => s.selectedDevice);
  const activeZoneId          = useEditorStore((s) => s.activeZoneId);
  const zoneDesigns           = useEditorStore((s) => s.zoneDesigns);
  const setDesignImage        = useEditorStore((s) => s.setDesignImage);
  const removeDesign          = useEditorStore((s) => s.removeDesign);
  const fitDesignToZone       = useEditorStore((s) => s.fitDesignToZone);
  const applyDesignToAllZones = useEditorStore((s) => s.applyDesignToAllZones);
  const setActiveZone         = useEditorStore((s) => s.setActiveZone);
  const designQueue           = useEditorStore((s) => s.designQueue);
  const addToDesignQueue      = useEditorStore((s) => s.addToDesignQueue);
  const removeFromDesignQueue = useEditorStore((s) => s.removeFromDesignQueue);
  const reorderDesignQueue    = useEditorStore((s) => s.reorderDesignQueue);
  const setActiveSidebarSection = useEditorStore((s) => s.setActiveSidebarSection);

  const deviceImageMap             = useEditorStore((s) => s.deviceImageMap);
  const setDeviceImageAssignment   = useEditorStore((s) => s.setDeviceImageAssignment);
  const clearDeviceImageAssignment = useEditorStore((s) => s.clearDeviceImageAssignment);
  const activePreviewDeviceId      = useEditorStore((s) => s.activePreviewDeviceId);
  const setActivePreviewDevice     = useEditorStore((s) => s.setActivePreviewDevice);

  // Deduplicate selectedDevices by id
  const rawSelectedDevices = useEditorStore((s) => s.selectedDevices);
  const selectedDevices = (() => {
    const seen = new Set<string>();
    const deduped: typeof rawSelectedDevices = [];
    for (const d of rawSelectedDevices) {
      if (!d) continue;
      const key = d.id ?? d.name ?? JSON.stringify(d);
      if (!seen.has(key)) {
        seen.add(key);
        deduped.push(d);
      }
    }
    if (deduped.length === 0 && selectedDevice) return [selectedDevice];
    return deduped;
  })();

  const [dragIdx, setDragIdx]         = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);
  const folderInputRef                = useRef<HTMLInputElement>(null);

  const isMultiDevice = selectedDevices.length > 1;

  // Active device resolution
  const activeDevice = (() => {
    if (activePreviewDeviceId) {
      const found = selectedDevices.find((d) => d?.id === activePreviewDeviceId);
      if (found) return found;
    }
    return selectedDevices[0] ?? null;
  })();

  const activeDeviceId = activeDevice?.id ?? '';

  if (!activePreviewDeviceId && activeDevice?.id) {
    setTimeout(() => setActivePreviewDevice(activeDevice.id), 0);
  }

  const activeDeviceImageIdx: number =
    activeDeviceId ? (deviceImageMap[activeDeviceId] ?? -1) : -1;

  const currentDesign = activeZoneId ? zoneDesigns[activeZoneId] : null;
  const hasDesign     = !!currentDesign?.designImage;

  // Helpers
  const getImageForDevice = (deviceId: string): string => {
    const idx = deviceImageMap[deviceId];
    return idx !== undefined ? (designQueue[idx]?.dataUrl ?? '') : '';
  };

  const getPreviewZoneIdForDevice = (deviceId: string): string | null => {
    const device = selectedDevices.find((d) => d?.id === deviceId);
    if (!device?.zones?.length) return activeZoneId ?? null;
    if (activeZoneId && device.zones.some((z) => z.id === activeZoneId)) {
      return activeZoneId;
    }
    return device.zones[0]?.id ?? null;
  };

  const showImageOnCanvas = (deviceId: string, imageIdx: number) => {
    const image = designQueue[imageIdx];
    if (!image) return;
    const zoneId = getPreviewZoneIdForDevice(deviceId);
    if (!zoneId) return;
    if (zoneId !== activeZoneId) setActiveZone(zoneId);
    setDesignImage(zoneId, image.dataUrl);
    setTimeout(() => fitDesignToZone(zoneId, 'cover'), 50);
  };

  const assignImageToDevice = (deviceId: string, imageIdx: number) => {
    if (imageIdx < 0) clearDeviceImageAssignment(deviceId);
    else setDeviceImageAssignment(deviceId, imageIdx);
  };

  const handleImageClick = (imageIdx: number) => {
    if (!activeDeviceId) return;
    assignImageToDevice(activeDeviceId, imageIdx);
    showImageOnCanvas(activeDeviceId, imageIdx);
  };

  const handleDeviceClick = (deviceId: string) => {
    if (deviceId === activePreviewDeviceId) return;
    setActivePreviewDevice(deviceId);
    const zoneId = getPreviewZoneIdForDevice(deviceId);
    if (zoneId && zoneId !== activeZoneId) setActiveZone(zoneId);
    const imgIdx = deviceImageMap[deviceId];
    if (imgIdx !== undefined && designQueue[imgIdx]) {
      showImageOnCanvas(deviceId, imgIdx);
    }
  };

  const effectiveZoneId = activeZoneId || selectedDevice?.zones[0]?.id;

  // Dropzone
  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      const targetZoneId = effectiveZoneId;
      if (!targetZoneId || acceptedFiles.length === 0) return;
      const newDesigns: { name: string; dataUrl: string }[] = [];
      let loaded = 0;
      for (const file of acceptedFiles) {
        const reader = new FileReader();
        reader.onload = () => {
          newDesigns.push({
            name: file.name.replace(/\.[^.]+$/, ''),
            dataUrl: reader.result as string,
          });
          loaded++;
          if (loaded === acceptedFiles.length) {
            addToDesignQueue(newDesigns);
            if (newDesigns[0]) {
              setDesignImage(targetZoneId, newDesigns[0].dataUrl);
              setTimeout(() => {
                fitDesignToZone(targetZoneId, 'cover');
                if (!isMultiDevice) {
                  setActiveSidebarSection('export');
                }
              }, 50);
            }
          }
        };
        reader.readAsDataURL(file);
      }
    },
    [effectiveZoneId, setDesignImage, addToDesignQueue, fitDesignToZone, isMultiDevice, setActiveSidebarSection]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.png', '.jpg', '.jpeg', '.webp', '.svg'] },
    multiple: true,
    disabled: !effectiveZoneId,
  });

  // Folder upload
  const handleFolderUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !activeZoneId) return;
    const imageFiles = Array.from(files).filter((f) => f.type.startsWith('image/'));
    if (imageFiles.length === 0) return;
    const newDesigns: { name: string; dataUrl: string }[] = [];
    let loaded = 0;
    for (const file of imageFiles) {
      const reader = new FileReader();
      reader.onload = () => {
        newDesigns.push({
          name: file.name.replace(/\.[^.]+$/, ''),
          dataUrl: reader.result as string,
        });
        loaded++;
        if (loaded === imageFiles.length) {
          addToDesignQueue(newDesigns);
          if (newDesigns[0]) {
            setDesignImage(activeZoneId, newDesigns[0].dataUrl);
            setTimeout(() => {
              fitDesignToZone(activeZoneId, 'cover');
              if (!isMultiDevice) {
                setActiveSidebarSection('export');
              }
            }, 50);
          }
        }
      };
      reader.readAsDataURL(file);
    }
    e.target.value = '';
  };

  if (!selectedDevice) {
    return <p className="text-xs text-text-muted px-1">Select a device first</p>;
  }

  // Image list — used in both single and multi-device views
  const renderImageList = () => (
    <div className="flex flex-col gap-1 p-1.5">
      {designQueue.map((d, i) => {
        const isAssignedToActive = activeDeviceImageIdx === i;
        const assignedCount = Object.values(deviceImageMap).filter((v) => v === i).length;
        const isDragging    = dragIdx === i;
        const isDragOver    = dragOverIdx === i;

        return (
          <div
            key={`${d.name}-${i}`}
            draggable
            onDragStart={() => setDragIdx(i)}
            onDragOver={(e) => { e.preventDefault(); setDragOverIdx(i); }}
            onDragEnd={() => {
              if (dragIdx !== null && dragOverIdx !== null && dragIdx !== dragOverIdx) {
                reorderDesignQueue(dragIdx, dragOverIdx);
              }
              setDragIdx(null);
              setDragOverIdx(null);
            }}
            onClick={() => handleImageClick(i)}
            className={`flex items-center gap-2 p-1.5 rounded-lg border transition-all duration-200 group/row cursor-pointer select-none ${
              isDragging ? 'opacity-40 scale-95' : ''
            } ${isDragOver && !isDragging ? 'ring-2 ring-accent' : ''} ${
              isAssignedToActive
                ? 'border-accent bg-accent/5 ring-1 ring-accent/30'
                : 'border-border hover:border-accent/40'
            }`}
            title={
              isAssignedToActive
                ? 'Assigned — click to preview again'
                : 'Click to assign to active device'
            }
          >
            {/* Thumbnail */}
            <div className="relative flex-shrink-0 w-8 h-10 rounded-md overflow-hidden border border-border">
              <img src={d.dataUrl} alt={d.name} className="w-full h-full object-cover" />
              {assignedCount > 0 && (
                <span className="absolute top-0.5 left-0.5 text-[6px] bg-green-500 text-white px-1 rounded-full leading-tight font-bold">
                  ×{assignedCount}
                </span>
              )}
            </div>

            {/* Name */}
            <div className="flex-1 min-w-0">
              <span className="text-[9px] text-text-muted truncate block leading-tight">{d.name}</span>
              {isMultiDevice && assignedCount > 0 && (
                <span className="text-[8px] text-accent/70">
                  {assignedCount} device{assignedCount !== 1 ? 's' : ''}
                </span>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-0.5 opacity-0 group-hover/row:opacity-100 transition-opacity flex-shrink-0">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (activeZoneId) setDesignImage(activeZoneId, d.dataUrl);
                }}
                title="Preview on canvas"
                className="p-1 rounded-md hover:bg-accent/10 text-text-muted hover:text-accent transition-colors"
              >
                <Eye size={9} />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  addToDesignQueue([{ name: `${d.name}_copy`, dataUrl: d.dataUrl }]);
                }}
                title="Duplicate"
                className="p-1 rounded-md hover:bg-accent/10 text-text-muted hover:text-accent transition-colors"
              >
                <CopyPlus size={9} />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  removeFromDesignQueue(i);
                }}
                title="Remove"
                className="p-1 rounded-md hover:bg-red-50 text-text-muted hover:text-red-500 transition-colors"
              >
                <Trash2 size={9} />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );

  // Render
  return (
    <div className="space-y-3">

      {/* Multi-device banner */}
      {isMultiDevice && (
        <div className="flex flex-col gap-1.5 bg-accent-light/40 border border-accent/20 rounded-xl px-3 py-2.5">
          <div className="flex items-center gap-2">
            <Monitor size={11} className="text-accent" />
            <span className="text-[10px] font-bold text-accent uppercase tracking-wider">
              {selectedDevices.length} Selected Devices
            </span>
          </div>
          <p className="text-[9px] text-accent/80 font-medium leading-relaxed italic">
            {selectedDevices.map(d => d.name).join(', ')}
          </p>
          <div className="pt-1 border-t border-accent/10 mt-1 flex items-center justify-between">
            <span className="text-[8px] text-accent/60 uppercase font-bold tracking-widest">
              Quick Assignment
            </span>
            <span className="text-[8px] text-accent/70 italic">
              Select device → Select image
            </span>
          </div>
        </div>
      )}

      {/* Single-device: zone overview */}
      {!isMultiDevice && selectedDevice.zones.length > 1 && (
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5">
            <Layers size={11} className="text-text-muted" />
            <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider">
              Zones ({selectedDevice.zones.length})
            </p>
          </div>
          <div className="flex gap-1.5">
            {selectedDevice.zones.map((z) => {
              const zDesign  = zoneDesigns[z.id];
              const isActive = activeZoneId === z.id;
              const hasImg   = !!zDesign?.designImage;
              return (
                <button
                  key={z.id}
                  onClick={() => setActiveZone(z.id)}
                  title={`${z.name}${hasImg ? ' — has design' : ' — empty'}`}
                  className={`flex-1 flex flex-col items-center gap-1 p-1.5 rounded-lg border-2 transition-all duration-200 ${
                    isActive
                      ? 'border-accent bg-accent/5 shadow-sm'
                      : 'border-border hover:border-accent/40'
                  }`}
                >
                  <div className="w-full h-10 rounded-md overflow-hidden bg-surface-hover flex items-center justify-center">
                    {hasImg ? (
                      <img
                        src={zDesign!.designImage!}
                        alt={z.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-[8px] text-text-muted">Empty</span>
                    )}
                  </div>
                  <span className="text-[8px] font-medium text-text-muted truncate w-full text-center">
                    {z.name}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Drop zone */}
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all duration-200 group ${
          isDragActive
            ? 'border-accent bg-accent-light scale-[1.01]'
            : 'border-border hover:border-accent/50 hover:bg-accent-light/30'
        } ${!activeZoneId ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <input {...getInputProps()} />
        {hasDesign ? (
          <div className="space-y-1.5">
            <img
              src={currentDesign!.designImage!}
              alt="Current design"
              className="max-h-16 mx-auto object-contain rounded-lg"
            />
            <p className="text-[10px] text-text-muted">Drop to replace</p>
          </div>
        ) : (
          <div>
            <ImagePlus
              size={24}
              className="mx-auto text-text-muted/40 mb-1.5 group-hover:text-accent/50 transition-colors"
            />
            <p className="text-xs text-text-muted">
              {isDragActive ? 'Drop here...' : 'Drop design image(s)'}
            </p>
            <p className="text-[10px] text-text-muted/60 mt-0.5">PNG, JPG, WebP, SVG</p>
          </div>
        )}
      </div>

      {/* Folder upload */}
      <input
        ref={folderInputRef}
        type="file"
        className="hidden"
        onChange={handleFolderUpload}
        accept="image/*"
        multiple
        /* @ts-expect-error */
        webkitdirectory=""
      />
      <button
        onClick={() => folderInputRef.current?.click()}
        disabled={!activeZoneId}
        className="w-full flex items-center justify-center gap-1.5 py-1.5 text-[10px] font-medium text-text-muted hover:text-accent border border-dashed border-border hover:border-accent/40 rounded-lg transition-all duration-200 disabled:opacity-40"
      >
        <FolderOpen size={12} />
        Import folder
      </button>

      {/* Multi-device: two-column layout — BOTH columns independently scrollable */}
      {designQueue.length > 0 && isMultiDevice && (
        <div className="rounded-xl border border-border overflow-hidden flex flex-col">
          {/* Column headers — always visible, never scroll */}
          <div className="grid grid-cols-2 border-b border-border text-[9px] font-bold text-text-muted uppercase tracking-wider flex-shrink-0">
            <div className="px-2.5 py-1.5 border-r border-border">
              Images ({designQueue.length})
            </div>
            <div className="px-2.5 py-1.5 flex items-center gap-1">
              <Monitor size={9} />
              Devices ({selectedDevices.length})
            </div>
          </div>

          {/* Body — fixed height, both columns scroll independently */}
          <div className="grid grid-cols-2" style={{ height: '260px' }}>

            {/* LEFT: image list — scrollable */}
            <div
              className="border-r border-border overflow-y-auto custom-scrollbar"
            >
              {renderImageList()}
            </div>

            {/* RIGHT: device list — scrollable */}
            <div
              className="overflow-y-auto flex flex-col divide-y divide-border custom-scrollbar"
            >
              {selectedDevices.map((device, di) => {
                if (!device) return null;

                const deviceId     = device.id;
                const isActiveDev  = deviceId === activeDeviceId;
                const deviceImgUrl = getImageForDevice(deviceId);
                const imgIdx       = deviceImageMap[deviceId];

                return (
                  <div
                    key={deviceId}
                    onClick={() => handleDeviceClick(deviceId)}
                    className={`flex items-center gap-2 px-2 py-2 cursor-pointer transition-colors group/dev flex-shrink-0 ${
                      isActiveDev ? 'bg-accent/5' : 'hover:bg-surface-hover'
                    }`}
                    title={
                      isActiveDev
                        ? 'Active — shown on canvas'
                        : `Click to preview ${device.name} on canvas`
                    }
                  >
                    {/* Device shell thumbnail */}
                    <div className="flex-shrink-0 w-12">
                      <DeviceMockupShell
                        templatePath={device.templatePath}
                        designImgUrl={deviceImgUrl}
                        deviceName={device.name}
                        active={isActiveDev}
                      />
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-[9px] font-medium text-text-primary truncate leading-tight">
                        {device.name ?? `Device ${di + 1}`}
                      </p>
                      <p className="text-[8px] text-text-muted mt-0.5 truncate leading-tight">
                        {deviceImgUrl
                          ? (imgIdx !== undefined
                              ? (designQueue[imgIdx]?.name ?? 'assigned')
                              : 'assigned')
                          : 'No image'}
                      </p>
                      {isActiveDev && (
                        <span className="inline-block mt-0.5 text-[7px] font-semibold text-accent bg-accent/10 px-1 rounded-full">
                          on canvas
                        </span>
                      )}
                    </div>

                    {/* Unassign button */}
                    {deviceImgUrl && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          assignImageToDevice(deviceId, -1);
                        }}
                        title="Unassign"
                        className="opacity-0 group-hover/dev:opacity-100 flex-shrink-0 p-1 rounded-md hover:bg-red-50 text-text-muted hover:text-red-500 transition-all"
                      >
                        <X size={9} />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Single-device: image list — scrollable */}
      {designQueue.length > 0 && !isMultiDevice && (
        <div className="rounded-xl border border-border overflow-hidden flex flex-col">
          <div className="px-2.5 py-1.5 border-b border-border flex-shrink-0">
            <span className="text-[9px] font-bold text-text-muted uppercase tracking-wider">
              Images ({designQueue.length})
            </span>
          </div>
          <div
            className="overflow-y-auto custom-scrollbar"
            style={{ maxHeight: '220px' }}
          >
            {renderImageList()}
          </div>
        </div>
      )}

      {isMultiDevice && designQueue.length === 0 && (
        <p className="text-[9px] text-text-muted/60 text-center">
          Upload at least one image to assign to devices
        </p>
      )}

      {/* Action buttons */}
      {hasDesign && activeZoneId && (
        <div className="flex gap-1.5">
          <button
            onClick={() => fitDesignToZone(activeZoneId)}
            className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-[10px] font-medium bg-accent-light text-accent rounded-lg hover:bg-accent-muted/30 transition-all duration-200"
          >
            <Maximize size={11} />
            Fit
          </button>
          <button
            onClick={() => {
              if (window.confirm('Remove design from this zone?')) removeDesign(activeZoneId);
            }}
            className="flex items-center justify-center gap-1 px-2 py-1.5 text-[10px] font-medium bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-all duration-200"
          >
            <Trash2 size={11} />
          </button>
          {selectedDevice.zones.length > 1 && (
            <button
              onClick={applyDesignToAllZones}
              className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-[10px] font-medium bg-surface-hover text-text-secondary rounded-lg hover:bg-border-subtle border border-border transition-all duration-200"
            >
              <Copy size={11} />
              All Zones
            </button>
          )}
        </div>
      )}
    </div>
  );
}
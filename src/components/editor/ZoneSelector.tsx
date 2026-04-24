'use client';

import { useEditorStore } from '@/lib/store';

export function ZoneSelector() {
  const selectedDevice = useEditorStore((s) => s.selectedDevice);
  const activeZoneId = useEditorStore((s) => s.activeZoneId);
  const setActiveZone = useEditorStore((s) => s.setActiveZone);
  const zoneDesigns = useEditorStore((s) => s.zoneDesigns);

  if (!selectedDevice || selectedDevice.zones.length <= 1) return null;

  return (
    <div className="flex gap-1 p-1.5 bg-surface-hover rounded-xl">
      {selectedDevice.zones.map((zone) => {
        const hasDesign = !!zoneDesigns[zone.id]?.designImage;
        return (
          <button
            key={zone.id}
            onClick={() => setActiveZone(zone.id)}
            className={`px-3 py-1.5 text-xs rounded-lg transition-all duration-200 ${
              activeZoneId === zone.id
                ? 'bg-accent text-white shadow-sm'
                : 'bg-transparent text-text-secondary hover:bg-surface border border-transparent hover:border-border'
            }`}
          >
            {zone.name}
            {hasDesign && (
              <span className="ml-1 inline-block w-1.5 h-1.5 bg-green-400 rounded-full ring-2 ring-success/20" />
            )}
          </button>
        );
      })}
    </div>
  );
}

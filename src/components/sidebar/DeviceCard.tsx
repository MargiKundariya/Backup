'use client';

import { useRef } from 'react';
import { CheckCircle2, Circle, Edit2, Smartphone } from 'lucide-react';
import { DeviceTemplate } from '@/types';

interface DeviceCardProps {
  device: DeviceTemplate;
  isSelected: boolean;
  onSelect: (device: DeviceTemplate) => void;
  onLongPress?: (device: DeviceTemplate) => void;
  onEdit?: (device: DeviceTemplate) => void;
  showCheckbox?: boolean;
}

export function DeviceCard({ device, isSelected, onSelect, onLongPress, onEdit, showCheckbox }: DeviceCardProps) {
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const handleMouseDown = () => {
    if (!onLongPress) return;
    timerRef.current = setTimeout(() => {
      onLongPress(device);
      timerRef.current = null;
    }, 600); // 600ms hold to trigger bulk select
  };

  const handleMouseUp = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const handleMouseLeave = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };
  return (
    <div className="relative group">
      <button
        onClick={() => onSelect(device)}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onTouchStart={handleMouseDown}
        onTouchEnd={handleMouseUp}
        title={`${device.name} · ${device.brand} · ${device.category}${device.zones.length > 1 ? ` · ${device.zones.length} zones` : ''}`}
        className={`w-full flex items-center gap-3 p-2.5 rounded-xl transition-all duration-200 text-left relative ${
          isSelected
            ? 'glass-elevated ring-2 ring-accent/40 bg-accent/5'
            : 'hover:glass-inset hover:shadow-sm'
        }`}
      >
        {showCheckbox && (
          <div className="shrink-0 transition-all duration-200">
            {isSelected ? (
              <CheckCircle2 size={16} className="text-accent fill-accent/10" />
            ) : (
              <Circle size={16} className="text-text-muted" />
            )}
          </div>
        )}
        <div className="w-10 h-14 flex-shrink-0 bg-surface-hover rounded-lg flex items-center justify-center overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {device.templatePath && device.templatePath !== "" ? (
            <img
              src={device.templatePath}
              alt={device.name}
              className="max-w-full max-h-full object-contain"
            />
          ) : (
            <Smartphone size={20} className="text-text-muted opacity-20" />
          )}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium text-text-primary truncate">{device.name}</p>
          <p className="text-xs text-text-muted">{device.brand} &middot; {device.category}</p>
          {device.zones.length > 1 && (
            <p className="text-xs text-accent font-medium">{device.zones.length} zones</p>
          )}
        </div>
      </button>

      {onEdit && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onEdit(device);
          }}
          className="absolute right-3 top-1/2 -translate-y-1/2 p-2 bg-white rounded-lg border border-border shadow-sm text-text-muted hover:text-accent hover:border-accent opacity-0 group-hover:opacity-100 transition-all"
          title="Edit Template"
        >
          <Edit2 size={14} />
        </button>
      )}
    </div>
  );
}

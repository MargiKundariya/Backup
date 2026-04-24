'use client';

import { useEditorStore } from '@/lib/store';
import { ChevronDown, type LucideIcon } from 'lucide-react';

interface SidebarSectionProps {
  id: string;
  title: string;
  icon: LucideIcon;
  badge?: string | number;
  defaultOpen?: boolean;
  disabled?: boolean;
  disabledTooltip?: string;
  children: React.ReactNode;
}

export function SidebarSection({
  id,
  title,
  icon: Icon,
  badge,
  disabled = false,
  disabledTooltip,
  children,
}: SidebarSectionProps) {
  const activeSection = useEditorStore((s) => s.activeSidebarSection);
  const setActiveSection = useEditorStore((s) => s.setActiveSidebarSection);
  
  const open = activeSection === id;

  const toggle = () => {
    if (disabled) return;
    setActiveSection(open ? null : id);
  };

  return (
    <div className="w-full">
      {/* Glass separator between sections */}
      <div className="glass-separator my-1.5 opacity-50" />

      {/* Header */}
      <button
        onClick={toggle}
        type="button"
        title={disabled ? disabledTooltip : undefined}
        className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl transition-all duration-200 ${
          disabled
            ? 'opacity-35 cursor-not-allowed'
            : 'hover:bg-white/50 active:bg-white/60'
        }`}
      >
        <div className={`w-6 h-6 flex items-center justify-center rounded-lg transition-all duration-200 ${
          open && !disabled
            ? 'bg-accent text-white shadow-lg shadow-accent/20'
            : 'text-text-muted bg-slate-50/50'
        }`}>
          {Icon ? <Icon size={14} /> : null}
        </div>
        <span className={`text-[11px] font-bold uppercase tracking-[0.06em] flex-1 text-left transition-colors ${
          open ? 'text-text-primary' : 'text-text-secondary'
        }`}>
          {title}
        </span>
        {badge && (
          <span className="text-[9px] font-bold text-accent bg-accent/8 px-2 py-0.5 rounded-full truncate max-w-[110px]">
            {badge}
          </span>
        )}
        <ChevronDown
          size={13}
          className={`flex-shrink-0 text-text-muted/60 transition-transform duration-300 ${
            open ? 'rotate-180' : ''
          }`}
        />
      </button>

      {/* Content — CSS grid transition for smooth open/close */}
      <div
        className={`grid transition-[grid-template-rows,opacity] duration-300 ease-in-out ${
          open ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
        }`}
      >
        <div className="overflow-hidden">
          <div className="px-2 pt-2 pb-3">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

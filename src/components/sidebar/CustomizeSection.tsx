'use client';

import { useState } from 'react';
import { Type, Palette, ChevronDown } from 'lucide-react';
import { TextPanel } from './TextPanel';
import { BackgroundPanel } from './BackgroundPanel';
import { type LucideIcon } from 'lucide-react';

function SubSection({ icon: Icon, title, defaultOpen = false, children }: {
  icon: LucideIcon;
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-2 px-2 py-2 rounded-xl hover:bg-white/40 transition-all duration-200"
      >
        <Icon size={13} className={`flex-shrink-0 ${open ? 'text-accent' : 'text-text-muted'}`} />
        <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-text-secondary flex-1 text-left">
          {title}
        </span>
        <ChevronDown
          size={12}
          className={`flex-shrink-0 text-text-muted transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>
      <div className={`grid transition-[grid-template-rows] duration-200 ease-out ${open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
        <div className="overflow-hidden">
          <div className="px-1 pt-1 pb-2">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

export function CustomizeSection() {
  return (
    <div className="space-y-1">
      <SubSection icon={Type} title="Text Layers">
        <TextPanel />
      </SubSection>
      <SubSection icon={Palette} title="Background">
        <BackgroundPanel />
      </SubSection>
    </div>
  );
}

'use client';

import { useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import {
  Smartphone, Monitor, Tablet, Watch, Image as ImageIcon, Sliders, Download,
  Settings, PanelLeftClose, Package, LogOut, LogIn, Cloud,
  CloudOff, Loader2, Coins, PieChart, Layout, ChevronRight, User, Menu
} from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { useCredits } from '@/hooks/useCredits';
import { useEditorStore } from '@/lib/store';
import { SidebarSection } from './SidebarSection';
import { DeviceCatalog } from './DeviceCatalog';
import { DesignUploader } from './DesignUploader';
import { CustomizeSection } from './CustomizeSection';
import { ExportSection } from './ExportSection';
import { SettingsPanel } from './SettingsPanel';
import { useAuth, signOut } from '@/hooks/useAuth';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';

interface SidebarProps {
  onCollapse?: () => void;
  onExportComplete?: () => void;
}

const SAVE_STATE_ICON = {
  idle: null,
  saving: <Loader2 size={11} className="animate-spin text-text-muted" />,
  saved: <Cloud size={11} className="text-green-500" />,
  error: <CloudOff size={11} className="text-red-500" />,
};

const SAVE_STATE_LABEL = {
  idle: '',
  saving: 'Saving…',
  saved: 'Saved',
  error: 'Save failed',
};

export function Sidebar({ onCollapse, onExportComplete }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuth();
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const selectedDevice = useEditorStore((s) => s.selectedDevice);
  const zoneDesigns = useEditorStore((s) => s.zoneDesigns);

  const hasDesign = Object.values(zoneDesigns).some((z) => z.designImage);
  const CATEGORY_ICON = { laptop: Monitor, tablet: Tablet, watch: Watch, phone: Smartphone };
  const DeviceIcon = selectedDevice ? (CATEGORY_ICON[selectedDevice.category as keyof typeof CATEGORY_ICON] ?? Smartphone) : Smartphone;

  const handleLogout = async () => {
    try {
      await signOut();
      router.push('/login');
    } catch (err) {
      console.error('Logout failed', err);
    }
  };

  return (
    <aside className="w-full flex-shrink-0 glass-sidebar flex flex-col h-full border-r border-border/50 bg-white">
      {/* Premium Header */}
      <div className="p-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-accent rounded-xl flex items-center justify-center shadow-lg shadow-accent/30">
            <Layout size={20} className="text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-sm font-bold text-text-primary uppercase tracking-tight truncate">SkinMockup</h1>
            <p className="text-[10px] text-accent font-bold uppercase tracking-widest leading-none">Studio v2.4</p>
          </div>
          {onCollapse && (
            <button 
              onClick={onCollapse} 
              className="p-2 text-text-muted hover:text-accent transition-all rounded-xl hover:bg-slate-50 border border-transparent hover:border-border/50"
              title="Collapse Tools"
            >
              <Menu size={18} />
            </button>
          )}
        </div>
      </div>

      <div className="glass-separator px-4" />

      {/* Navigation & Tool Scroll Area */}
      <div className="flex-1 overflow-y-auto px-3 py-6 space-y-6 custom-scrollbar">
        {/* Main Navigation */}
        <div className="space-y-1.5">
          <p className="px-4 text-[10px] font-bold text-text-muted uppercase tracking-[0.25em] mb-4">Main Menu</p>
          <button
            onClick={() => router.push('/dashboard')}
            className={`w-full group flex items-center gap-3.5 px-4 py-3 rounded-2xl transition-all duration-300 ${
              pathname === '/dashboard' ? 'bg-accent text-white shadow-xl shadow-accent/20' : 'text-text-secondary hover:bg-slate-50'
            }`}
          >
            <PieChart size={18} className={pathname === '/dashboard' ? 'text-white' : 'text-text-muted group-hover:text-accent'} />
            <span className="text-[13px] font-bold tracking-tight">Dashboard</span>
          </button>
        </div>

        {/* Editor Tools */}
        <div className="space-y-1">
          <p className="px-4 text-[10px] font-bold text-text-muted uppercase tracking-[0.25em] mb-4">Design Tools</p>

          <SidebarSection id="device" icon={DeviceIcon} title="Device" step={1}>
            <DeviceCatalog />
          </SidebarSection>

          <SidebarSection id="design" icon={ImageIcon} title="Design" step={2} disabled={!selectedDevice} disabledTooltip="Select a device first">
            <DesignUploader />
          </SidebarSection>

          <SidebarSection id="customize" icon={Sliders} title="Customize" step={3} disabled={!hasDesign} disabledTooltip="Upload a design first">
            <CustomizeSection />
          </SidebarSection>

          <SidebarSection id="export" icon={Download} title="Export" step={4} disabled={!hasDesign} disabledTooltip="Upload a design first">
            <ExportSection onExportComplete={onExportComplete} />
          </SidebarSection>

        </div>
      </div>

      {/* Sidebar Footer */}
      <div className="p-4 bg-slate-50 border-t border-border/50">
        <div className="flex items-center gap-3 bg-white border border-border/50 rounded-2xl p-3 shadow-sm">
          <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center text-accent shrink-0">
            <User size={16} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold text-text-primary truncate uppercase tracking-tighter">{user?.email || 'Guest User'}</p>
            <button 
              onClick={() => setIsPasswordModalOpen(true)}
              className="text-[8px] text-accent hover:underline font-bold uppercase tracking-[0.2em] mt-0.5 block"
            >
              Change Password
            </button>
          </div>
          <button onClick={handleLogout} className="p-1.5 text-text-muted hover:text-red-500 transition-all rounded-lg hover:bg-red-50" title="Sign Out">
            <LogOut size={14} />
          </button>
        </div>
      </div>

      <Modal 
        isOpen={isPasswordModalOpen} 
        onClose={() => setIsPasswordModalOpen(false)} 
        title="Account Security"
        maxWidth="max-w-md"
      >
        <div className="p-2">
          <SettingsPanel />
        </div>
      </Modal>
    </aside>
  );
}

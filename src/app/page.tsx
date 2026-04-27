'use client';

import { useEffect, useState } from 'react';
import { Sidebar } from '@/components/sidebar/Sidebar';
import { MockupCanvas } from '@/components/editor/MockupCanvas';
import { PropertiesPanel } from '@/components/editor/PropertiesPanel';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { useEditorStore } from '@/lib/store';
import { useAutoSave } from '@/hooks/useAutoSave';
import { useDesignLoader } from '@/hooks/useDesignLoader';
import { useOnboarding } from '@/hooks/useOnboarding';
import { OnboardingTip } from '@/components/ui/OnboardingTip';
import { PanelLeft, PanelRight, Layout, Menu, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { saveWork } from '@/lib/saveDesign';

export default function Home() {
  const router = useRouter();
  const activeZoneId = useEditorStore((s) => s.activeZoneId);
  const removeDesign = useEditorStore((s) => s.removeDesign);
  const [leftOpen, setLeftOpen] = useState(true);
  const [rightOpen, setRightOpen] = useState(true);
  const selectedDevices = useEditorStore((s) => s.selectedDevices);
  const activePreviewDeviceId = useEditorStore((s) => s.activePreviewDeviceId);
  const setActivePreviewDevice = useEditorStore((s) => s.setActivePreviewDevice);

  // Ensure the preview device is set and properties panel stays open when returning from dashboard
  useEffect(() => {
    if (selectedDevices.length > 0) {
      // Set preview device if not already set
      if (!activePreviewDeviceId) {
        setActivePreviewDevice(selectedDevices[0].id);
      }
      // Keep properties panel open for multi-device selection
      setRightOpen(true);
    }
  }, [selectedDevices, activePreviewDeviceId, setActivePreviewDevice]);

  // Sync selectedDevice and activeZoneId with activePreviewDeviceId after navigation
  useEffect(() => {
    if (!activePreviewDeviceId) return;
    const state = useEditorStore.getState();
    const dev = state.selectedDevices.find((d) => d.id === activePreviewDeviceId) || state.selectedDevice;
    if (dev) {
      useEditorStore.setState({ selectedDevice: dev, activeZoneId: dev.zones?.[0]?.id ?? null });
    }
  }, [activePreviewDeviceId]);
  // Auto-save to backend when user is signed in
  useAutoSave();

  // Restore design from library when currentDesignId is set
  const { loading: designLoading } = useDesignLoader();

  // First-use onboarding
  const { step: onboardingStep, next: onboardingNext, dismiss: dismissOnboarding } = useOnboarding();

  // Global unhandled error logging
  useEffect(() => {
    const onError = (e: ErrorEvent) => {
      console.error('[Global Error]', e.message, e.filename, e.lineno);
    };
    const onUnhandledRejection = (e: PromiseRejectionEvent) => {
      console.error('[Unhandled Promise]', e.reason);
    };
    window.addEventListener('error', onError);
    window.addEventListener('unhandledrejection', onUnhandledRejection);
    return () => {
      window.removeEventListener('error', onError);
      window.removeEventListener('unhandledrejection', onUnhandledRejection);
    };
  }, []);

  // Delete/Backspace: remove design from active zone
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (
          activeZoneId &&
          document.activeElement?.tagName !== 'INPUT' &&
          document.activeElement?.tagName !== 'TEXTAREA'
        ) {
          if (window.confirm('Remove design from this zone?')) {
            removeDesign(activeZoneId);
          }
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [activeZoneId, removeDesign]);

  return (
    <div className="h-screen flex bg-canvas-bg overflow-hidden relative font-sans">
      {/* Mobile Menu Toggle */}
      <button
        onClick={() => setLeftOpen(!leftOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 w-12 h-12 flex items-center justify-center bg-white rounded-2xl shadow-xl border border-border text-text-primary active:scale-95 transition-all"
      >
        {leftOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Mobile Sidebar Backdrop */}
      {leftOpen && (
        <div 
          className="lg:hidden fixed inset-0 z-30 bg-text-primary/20 backdrop-blur-sm animate-in fade-in duration-300"
          onClick={() => setLeftOpen(false)}
        />
      )}

      {/* Editor Content Area */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Loading overlay while restoring a saved design */}
        {designLoading && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-canvas-bg/80 backdrop-blur-sm">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
              <p className="text-xs text-text-secondary font-bold uppercase tracking-widest">Restoring design…</p>
            </div>
          </div>
        )}
        
        {/* Left tool sidebar toggle — shown when sidebar is collapsed (Desktop Only) */}
        {!leftOpen && (
          <button
            onClick={() => setLeftOpen(true)}
            aria-label="Open sidebar"
            title="Open tools"
            className="hidden lg:flex absolute left-6 top-6 z-30 items-center justify-center w-12 h-12 bg-white text-text-primary rounded-2xl shadow-xl border border-border hover:scale-110 active:scale-95 transition-all duration-300 group"
          >
            <Menu size={20} className="group-hover:text-accent transition-colors" />
          </button>
        )}

        <aside className={`
          fixed lg:relative inset-y-0 left-0 z-40
          transition-all duration-500 ease-in-out overflow-hidden border-r border-border/50 bg-white lg:bg-slate-50/30
          ${leftOpen 
            ? 'translate-x-0 w-[300px] min-w-[300px] lg:w-[320px] lg:min-w-[320px]' 
            : '-translate-x-full lg:translate-x-0 lg:w-0 lg:min-w-0'}
        `}>
          <ErrorBoundary fallbackLabel="Sidebar">
            <Sidebar 
              onCollapse={() => {
                setLeftOpen(false);
                saveWork();
              }} 
              onExportComplete={dismissOnboarding} 
            />
          </ErrorBoundary>
        </aside>

        <ErrorBoundary fallbackLabel="Canvas">
          <MockupCanvas />
        </ErrorBoundary>

        {/* Right properties sidebar */}
        <div className={`transition-all duration-500 ease-in-out overflow-hidden border-l border-border/50 bg-white ${rightOpen ? 'w-[280px] min-w-[280px]' : 'w-0 min-w-0'}`}>
          <ErrorBoundary fallbackLabel="Properties">
            <PropertiesPanel onCollapse={() => setRightOpen(false)} />
          </ErrorBoundary>
        </div>

        {/* Right properties toggle — shown when panel is collapsed */}
        {!rightOpen && (
          <button
            onClick={() => setRightOpen(true)}
            aria-label="Open properties"
            title="Open properties"
            className="absolute right-0 top-1/2 -translate-y-1/2 z-20 flex items-center justify-center w-8 h-14 bg-accent text-white rounded-l-2xl shadow-2xl hover:scale-110 active:scale-95 transition-all duration-300 animate-pulse"
          >
            <PanelRight size={16} />
          </button>
        )}
      </div>

      {/* Onboarding guided tour */}
      <OnboardingTip step={onboardingStep} onNext={onboardingNext} onDismiss={dismissOnboarding} />
    </div>
  );
}

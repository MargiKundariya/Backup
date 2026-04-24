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
import { PanelLeft, PanelRight, Layout } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();
  const activeZoneId = useEditorStore((s) => s.activeZoneId);
  const selectedDevice = useEditorStore((s) => s.selectedDevice);
  const removeDesign = useEditorStore((s) => s.removeDesign);
  const [leftOpen, setLeftOpen] = useState(true);
  const [rightOpen, setRightOpen] = useState(true);

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
        
        {/* Left tool sidebar toggle — shown when sidebar is collapsed */}
        {!leftOpen && (
          <button
            onClick={() => setLeftOpen(true)}
            aria-label="Open sidebar"
            title="Open tools"
            className="absolute left-0 top-1/2 -translate-y-1/2 z-20 flex items-center justify-center w-8 h-14 bg-accent text-white rounded-r-2xl shadow-2xl hover:scale-110 active:scale-95 transition-all duration-300 animate-pulse"
          >
            <PanelLeft size={16} />
          </button>
        )}

        {/* Unified Sidebar (Navigation + Design Tools) */}
        <div className={`transition-all duration-500 ease-in-out overflow-hidden border-r border-border/50 bg-slate-50/30 ${leftOpen ? 'w-[320px] min-w-[320px]' : 'w-0 min-w-0'}`}>
          <ErrorBoundary fallbackLabel="Sidebar">
            <Sidebar onCollapse={() => setLeftOpen(false)} onExportComplete={dismissOnboarding} />
          </ErrorBoundary>
        </div>

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

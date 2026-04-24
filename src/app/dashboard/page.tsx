'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Sidebar } from '@/components/sidebar/Sidebar';
import { PieChart, Smartphone, Plus, ArrowRight, Calendar, BarChart3, TrendingUp, History, Package, Edit3, ShieldCheck, Sparkles, Trash2, Edit2, X, Search } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useEditorStore } from '@/lib/store';
import { DeviceCard } from '@/components/sidebar/DeviceCard';
import { DeviceTemplate } from '@/types';
import { useTemplateStore } from '@/lib/templateStore';
import { Modal } from '@/components/ui/Modal';
import { TemplateUploader } from '@/components/editor/devices/TemplateUploader';
import { TemplateManager } from '@/components/admin/TemplateManager';
import { TemplateEditor } from '@/components/admin/TemplateEditor';
import { Button } from '@/components/ui/Button';

const RECENT_KEY = 'skinmockup-recent-devices';

function getRecentDeviceIds(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]');
  } catch {
    return [];
  }
}

export default function DashboardPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const selectDevice = useEditorStore((s) => s.selectDevice);
  const { customDevices: allDevices, loadCustomDevices, deleteCustomDevice } = useTemplateStore();

  const [analytics, setAnalytics] = useState({ day: 0, week: 0, month: 0, year: 0 });
  const [recentDevices, setRecentDevices] = useState<DeviceTemplate[]>([]);
  const [recentDesigns, setRecentDesigns] = useState<any[]>([]);
  const [totalDesigns, setTotalDesigns] = useState(0);
  const [totalProjects, setTotalProjects] = useState(0);
  const [navigating, setNavigating] = useState(false);

  // Uploader / Editor Modal state
  const [isUploaderOpen, setIsUploaderOpen] = useState(false);
  const [isLibraryOpen, setIsLibraryOpen] = useState(false);
  const [editingDevice, setEditingDevice] = useState<DeviceTemplate | null>(null);
  const [librarySearch, setLibrarySearch] = useState('');

  useEffect(() => {
    if (!authLoading && !user) router.push('/login');
  }, [user, authLoading, router]);

  useEffect(() => {
    loadCustomDevices();
  }, []);

  useEffect(() => {
    if (allDevices.length === 0) return;
    const ids = getRecentDeviceIds();
    const resolved = ids
      .map(id => allDevices.find(d => d.id === id))
      .filter(Boolean) as DeviceTemplate[];
    setRecentDevices(resolved);
  }, [allDevices]);

  useEffect(() => {
    if (!user) return;
    async function fetchData() {
      try {
        const ts = Date.now();
        const [projRes, designRes, statsRes] = await Promise.all([
          fetch(`/api/projects?_t=${ts}`, { cache: 'no-store' }),
          fetch(`/api/designs?_t=${ts}`, { cache: 'no-store' }),
          fetch(`/api/stats?_t=${ts}`, { cache: 'no-store' }),
        ]);

        if (projRes.ok) {
          const d = await projRes.json();
          setTotalProjects(d.projects?.length || 0);
        }
        if (designRes.ok) {
          const d = await designRes.json();
          setTotalDesigns(d.designs?.length || 0);
          setRecentDesigns(d.designs || []);
        }

        // Use cache memory (localStorage) for export stats tracking
        try {
          const records = JSON.parse(localStorage.getItem('skinmockup-export-stats') || '[]');
          const now = Date.now();
          const dayAgo = now - 24 * 60 * 60 * 1000;
          const weekAgo = now - 7 * 24 * 60 * 60 * 1000;
          const monthAgo = now - 30 * 24 * 60 * 60 * 1000;
          const yearAgo = now - 365 * 24 * 60 * 60 * 1000;

          const localStats = { day: 0, week: 0, month: 0, year: 0 };
          for (const r of records) {
            if (r.timestamp > dayAgo) localStats.day += r.count;
            if (r.timestamp > weekAgo) localStats.week += r.count;
            if (r.timestamp > monthAgo) localStats.month += r.count;
            if (r.timestamp > yearAgo) localStats.year += r.count;
          }
          setAnalytics(prev => ({ ...prev, ...localStats }));
        } catch (e) {
          console.error('Error reading local stats:', e);
        }
      } catch (err) {
        console.error('Dashboard data fetch error:', err);
      }
    }
    fetchData();
  }, [user]);

  const handleDeviceSelect = useCallback((device: DeviceTemplate) => {
    if (navigating) return;
    setNavigating(true);
    selectDevice(device);
    useEditorStore.getState().setActivePreviewDevice(device.id);
    useEditorStore.getState().setActiveSidebarSection('design');
    router.push('/');
  }, [selectDevice, router, navigating]);

  const handleDeviceEdit = useCallback((device: DeviceTemplate) => {
    setEditingDevice(device);
    // setIsUploaderOpen(true); // We will use a separate modal for editing details
  }, []);

  const handleDeleteDevice = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this custom device?')) return;
    try {
      await deleteCustomDevice(id);
      loadCustomDevices();
    } catch (err) {
      console.error('Delete failed', err);
    }
  };

  const myPrivateDevices = useMemo(() => {
    return allDevices.filter(d => d.owner_user_id === user?.id);
  }, [allDevices, user]);

  const filteredLibrary = useMemo(() => {
    return myPrivateDevices.filter(d =>
      d.name.toLowerCase().includes(librarySearch.toLowerCase()) ||
      d.brand.toLowerCase().includes(librarySearch.toLowerCase())
    );
  }, [myPrivateDevices, librarySearch]);

  if (authLoading || !user) return null;

  return (
    <div className="h-screen flex bg-canvas-bg overflow-hidden relative font-sans">
      <div className="w-[320px] h-full flex-shrink-0">
        <Sidebar />
      </div>

      <main className="flex-1 overflow-y-auto bg-canvas-bg h-full">
        <div className="max-w-5xl mx-auto p-6 md:p-10 pb-24">
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">

            {/* Header */}
            <div className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-4">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2.5 bg-accent/10 text-accent rounded-xl">
                    <PieChart size={20} />
                  </div>
                  <h1 className="text-2xl font-bold text-text-primary tracking-tight">Dashboard</h1>
                </div>
                <p className="text-xs text-text-muted font-medium max-w-xl leading-relaxed">
                  Welcome back, <span className="font-bold text-text-secondary">{user.email.split('@')[0]}</span>.
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => router.push('/')}
                  className="flex items-center gap-2.5 px-5 py-2.5 bg-accent text-white rounded-xl text-[11px] font-bold uppercase tracking-widest shadow-lg shadow-accent/20 hover:bg-accent-hover transition-all active:scale-95 shrink-0"
                >
                  <Plus size={14} />
                  New Design
                </button>
              </div>
            </div>


            {/* Volume Analytics */}
            <div className="mb-10">
              <div className="flex items-center gap-2 mb-5">
                <BarChart3 size={15} className="text-text-muted" />
                <h2 className="text-[11px] font-bold text-text-muted uppercase tracking-[0.2em]">Mockups Created</h2>
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { label: 'Today', value: analytics.day, icon: TrendingUp },
                  { label: 'This Week', value: analytics.week, icon: Calendar },
                  { label: 'This Month', value: analytics.month, icon: BarChart3 },
                  { label: 'This Year', value: analytics.year, icon: PieChart },
                ].map((item, i) => (
                  <div key={i} className="glass-card rounded-2xl p-5 border border-white/30 shadow-sm hover:-translate-y-0.5 hover:shadow-md transition-all duration-200">
                    <div className="flex justify-between items-start mb-3">
                      <div className="p-2 bg-accent/8 text-accent rounded-lg">
                        <item.icon size={15} />
                      </div>
                      <span className="text-[8px] font-bold text-green-500 uppercase tracking-wider bg-green-50 px-1.5 py-0.5 rounded-full">Live</span>
                    </div>
                    <p className="text-[10px] font-black text-text-muted uppercase tracking-widest mb-0.5">{item.label}</p>
                    <div className="flex items-baseline gap-1.5">
                      <p className="text-3xl font-black text-text-primary tracking-tighter">{item.value}</p>
                      <p className="text-[10px] text-text-muted font-medium">mockups</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>


            {/* Recent Devices */}
            <div className="mb-10">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2">
                  <History size={15} className="text-text-muted" />
                  <h2 className="text-[11px] font-bold text-text-muted uppercase tracking-[0.2em]">Recently Used Devices</h2>
                </div>
                <button onClick={() => router.push('/')} className="text-[10px] font-bold text-accent hover:underline uppercase tracking-widest">
                  Open Studio →
                </button>
              </div>

              {recentDevices.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {recentDevices.map(device => (
                    <div key={device.id} className="glass-card rounded-2xl border border-white/30 shadow-sm overflow-hidden">
                      <DeviceCard
                        device={device}
                        isSelected={false}
                        onSelect={() => handleDeviceSelect(device)}
                        onEdit={(device.isCustom && device.owner_user_id === user.id) ? handleDeviceEdit : undefined}
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="glass-card rounded-2xl p-10 border border-dashed border-border/60 flex flex-col items-center justify-center text-center">
                  <div className="w-14 h-14 bg-slate-100 rounded-full flex items-center justify-center text-text-muted/30 mb-3">
                    <Smartphone size={28} />
                  </div>
                  <p className="text-sm font-bold text-text-primary mb-1">No recent devices</p>
                  <button
                    onClick={() => router.push('/')}
                    className="px-5 py-2 bg-accent/10 text-accent rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-accent/20 transition-all"
                  >
                    Browse Catalog
                  </button>
                </div>
              )}
            </div>

            {/* Quick Actions (Smaller Cards) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <button
                onClick={() => {
                  setEditingDevice(null);
                  setIsUploaderOpen(true);
                }}
                className="group relative flex flex-col items-start p-6 bg-gradient-to-br from-indigo-600 via-accent to-purple-600 rounded-[32px] shadow-2xl shadow-accent/20 hover:scale-[1.02] active:scale-[0.98] transition-all overflow-hidden text-left"
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-12 -mt-12 blur-3xl group-hover:bg-white/20 transition-colors" />
                <div className="w-10 h-10 bg-white/20 backdrop-blur-md rounded-xl flex items-center justify-center text-white mb-4">
                  <Smartphone size={20} />
                </div>
                <h3 className="text-lg font-bold text-white mb-1">Onboard New Device</h3>
                <p className="text-[10px] text-white/70 mb-6 leading-relaxed max-w-[200px]">Expand your high-fidelity catalog with custom templates.</p>
                <div className="flex items-center gap-2 text-[9px] font-bold text-white uppercase tracking-[0.2em] bg-white/10 px-3 py-1.5 rounded-lg">
                  Get Started <Sparkles size={10} />
                </div>
              </button>

              <div className="glass-card rounded-[32px] p-6 border border-white/20 shadow-xl relative overflow-hidden group flex flex-col items-start">
                <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full -mr-10 -mt-10 blur-3xl group-hover:bg-blue-500/10 transition-colors" />
                <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-text-muted mb-4">
                  <Edit3 size={20} />
                </div>
                <h3 className="text-lg font-bold text-text-primary mb-1">Manage Library</h3>
                <p className="text-[10px] text-text-muted mb-6 leading-relaxed max-w-[200px]">Update metadata or delete the custom devices you've added.</p>
                <button
                  onClick={() => setIsLibraryOpen(true)}
                  className="flex items-center gap-2 px-5 py-2.5 bg-white border border-border text-text-primary rounded-xl text-[9px] font-bold uppercase tracking-widest hover:bg-slate-50 transition-all shadow-sm"
                >
                  My Private Devices <ArrowRight size={12} />
                </button>
              </div>
            </div>

            {/* My Library Modal */}
            <Modal
              isOpen={isLibraryOpen}
              onClose={() => setIsLibraryOpen(false)}
              title="My Device Library"
              maxWidth="max-w-4xl"
            >
              <div className="p-0">
                <TemplateManager 
                  onlyOwned={true}
                  onEditDetails={(device) => {
                    setEditingDevice(device);
                    setIsLibraryOpen(false);
                  }} 
                />
              </div>
            </Modal>

            <Modal
              isOpen={!!editingDevice}
              onClose={() => setEditingDevice(null)}
              title="Engineer Technical Details"
              maxWidth="max-w-4xl"
            >
              {editingDevice && (
                <TemplateEditor
                  device={editingDevice}
                  onSave={() => {
                    setEditingDevice(null);
                    loadCustomDevices();
                  }}
                  onCancel={() => setEditingDevice(null)}
                />
              )}
            </Modal>

            <Modal
              isOpen={isUploaderOpen}
              onClose={() => setIsUploaderOpen(false)}
              title="Engineer Technical Details"
              maxWidth="max-w-4xl"
            >
              <TemplateUploader
                onTemplateCreated={(d) => {
                  loadCustomDevices();
                  setIsUploaderOpen(false);
                  setIsLibraryOpen(false);

                  // Same logic as Sidebar: Select and go to Studio
                  selectDevice(d);
                  useEditorStore.getState().setActivePreviewDevice(d.id);
                  router.push('/');
                }}
                onCancel={() => setIsUploaderOpen(false)}
              />
            </Modal>
          </div>
        </div>
      </main>
    </div>
  );
}

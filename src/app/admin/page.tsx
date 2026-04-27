'use client';

import { useState } from 'react';
import { DeviceTemplate } from '@/types';
import { TemplateUploader } from '@/components/editor/devices/TemplateUploader';
import { TemplateManager } from '@/components/admin/TemplateManager';
import { TemplateEditor } from '@/components/admin/TemplateEditor';
import { UserManagement } from '@/components/admin/UserManagement';
import { LicenseManagement } from '@/components/admin/LicenseManagement';
import { useAuth, signOut } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import {
  Users, Key, Box, LogOut,
  Smartphone, ShieldCheck, PieChart,
  ExternalLink, Menu, X, Plus
} from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';

import { AdminInsights } from '@/components/admin/AdminInsights';

type AdminTab = 'templates' | 'users' | 'licenses' | 'insights';

export default function AdminPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<AdminTab>('templates');
  const [isUploaderOpen, setIsUploaderOpen] = useState(false);
  const [editingDeviceDetails, setEditingDeviceDetails] = useState<DeviceTemplate | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const handleLogout = async () => {
    try {
      await signOut();
      router.push('/login');
    } catch (err) {
      console.error('Logout failed', err);
    }
  };

  const tabs = [
    { id: 'templates' as const, label: 'Device Catalog', icon: Smartphone, description: 'Manage global templates' },
    { id: 'users' as const, label: 'User Directory', icon: Users, description: 'Manage user accounts' },
    { id: 'licenses' as const, label: 'License Keys', icon: Key, description: 'Issuance and monitoring' },
    { id: 'insights' as const, label: 'Platform Insights', icon: PieChart, description: 'Analytics and monitoring' },
  ];

  return (
    <div className="h-screen flex bg-canvas-bg overflow-hidden relative font-sans">

      {/* Mobile Menu Toggle */}
      <button
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 w-12 h-12 flex items-center justify-center bg-white rounded-2xl shadow-xl border border-border text-text-primary active:scale-95 transition-all"
      >
        {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
      </button>


      {/* Mobile Backdrop */}
      {isMobileMenuOpen && (
        <div 
          className="lg:hidden fixed inset-0 z-30 bg-text-primary/20 backdrop-blur-sm animate-in fade-in duration-300"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Premium Sidebar */}
      <aside className={`
        fixed lg:relative inset-y-0 left-0 z-40
        transition-all duration-500 ease-in-out glass-sidebar flex flex-col h-full
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        ${isSidebarOpen ? 'w-[280px] min-w-[280px]' : 'w-0 min-w-0 border-none'}
      `}>
        {/* Sidebar Header */}
        <div className="p-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-accent rounded-xl flex items-center justify-center shadow-lg shadow-accent/30">
              <ShieldCheck size={22} className="text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-sm font-bold text-text-primary uppercase tracking-tight truncate">Super Admin</h1>
              <p className="text-[10px] text-accent font-bold uppercase tracking-widest leading-none">Console v2.0</p>
            </div>
          </div>
        </div>

        <div className="glass-separator px-4" />

        {/* Navigation Section */}
        <div className="flex-1 overflow-y-auto px-3 py-6 space-y-2">
          <p className="px-4 text-[10px] font-bold text-text-muted uppercase tracking-[0.25em] mb-4">Core Management</p>

          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                setIsMobileMenuOpen(false);
              }}
              className={`
                w-full group flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all duration-300
                ${activeTab === tab.id
                  ? 'bg-accent text-white shadow-xl shadow-accent/20'
                  : 'text-text-secondary hover:bg-white hover:shadow-md'
                }
              `}
            >
              <tab.icon size={20} className={`${activeTab === tab.id ? 'text-white' : 'text-text-muted group-hover:text-accent'} transition-colors`} />
              <div className="text-left">
                <p className="text-sm font-bold tracking-tight leading-none">{tab.label}</p>
                <p className={`text-[9px] mt-1 font-semibold ${activeTab === tab.id ? 'text-white/70' : 'text-text-muted'}`}>{tab.description}</p>
              </div>
            </button>
          ))}
        </div>

        {/* Sidebar Footer */}
        <div className="p-4 space-y-4">
          <div className="glass-separator" />

          <div className="px-2 space-y-1">

            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-3 py-2 text-text-muted hover:text-red-500 transition-all text-xs font-semibold"
            >
              <LogOut size={14} />
              Terminate Session
            </button>
          </div>

          <div className="bg-white/50 border border-border/50 rounded-2xl p-4 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-text-muted">
              <Users size={18} />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-bold text-text-primary truncate uppercase tracking-tighter">{user?.email || 'Admin User'}</p>
              <p className="text-[8px] font-semibold text-accent uppercase">Super Admin Access</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto bg-canvas-bg h-full relative">
        <div className="max-w-6xl mx-auto p-6 md:p-10 lg:p-12 pb-24">

          <div className="animate-in fade-in slide-in-from-right-8 duration-700">
            {activeTab === 'templates' && (
              <div className="space-y-10">
                {/* Content Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 px-2">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-accent/10 text-accent rounded-xl shadow-sm">
                      <Smartphone size={20} />
                    </div>
                    <h2 className="text-2xl font-bold text-text-primary tracking-tight">Global Device Catalog</h2>
                  </div>
                  <Button
                    onClick={() => setIsUploaderOpen(true)}
                    className="rounded-[20px] gap-3 h-[52px] px-8 bg-accent text-white font-bold uppercase tracking-widest text-xs shadow-xl shadow-accent/20 transition-all active:scale-95"
                  >
                    <Plus size={20} />
                    Onboard New Device
                  </Button>
                </div>

                <Modal
                  isOpen={isUploaderOpen}
                  onClose={() => setIsUploaderOpen(false)}
                  title="Engineer Technical Details"
                  maxWidth="max-w-4xl"
                >
                  <TemplateUploader
                    onTemplateCreated={(device) => {
                      setIsUploaderOpen(false);
                    }}
                    onCancel={() => setIsUploaderOpen(false)}
                  />
                </Modal>

                <div className="bg-transparent">
                  <TemplateManager
                    onEditDetails={(device) => setEditingDeviceDetails(device)}
                  />
                </div>

                <Modal
                  isOpen={!!editingDeviceDetails}
                  onClose={() => setEditingDeviceDetails(null)}
                  title="Engineer Technical Details"
                  maxWidth="max-w-4xl"
                >
                  {editingDeviceDetails && (
                    <TemplateEditor
                      device={editingDeviceDetails}
                      onSave={() => setEditingDeviceDetails(null)}
                      onCancel={() => setEditingDeviceDetails(null)}
                    />
                  )}
                </Modal>
              </div>
            )}

            {activeTab === 'users' && (
              <UserManagement />
            )}

            {activeTab === 'licenses' && (
              <LicenseManagement />
            )}

            {activeTab === 'insights' && (
              <AdminInsights />
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

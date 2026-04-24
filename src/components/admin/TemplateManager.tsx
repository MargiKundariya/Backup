'use client';

import { useEffect, useState, useMemo } from 'react';
import { DeviceTemplate } from '@/types';
import { useTemplateStore } from '@/lib/templateStore';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import {
  CheckCircle, Globe, Lock, Trash2, Edit2, Loader2, Eye,
  Smartphone, Search, Filter, MoreVertical, AlertTriangle, Layout, XCircle, ShieldCheck, 
  RefreshCw, History, Check, X
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { v5 as uuidv5 } from 'uuid';

interface TemplateManagerProps {
  onEditDetails: (device: DeviceTemplate) => void;
  onlyOwned?: boolean;
}

const NAMESPACE = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';

export function TemplateManager({ onEditDetails, onlyOwned = false }: TemplateManagerProps) {
  const { customDevices, loadCustomDevices, removeCustomDevice, updateCustomDevice, approveDevice, loading } = useTemplateStore();
  const { user } = useAuth();
  const [previewingDevice, setPreviewingDevice] = useState<DeviceTemplate | null>(null);
  const [approvingDeviceId, setApprovingDeviceId] = useState<{id: string, target: boolean} | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadCustomDevices();
  }, [loadCustomDevices]);

  const filteredDevices = customDevices.filter(d => {
    const matchesSearch = d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.brand.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.category.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (onlyOwned) {
      // Show only devices owned by user. 
      // This includes the Global version (if they own it) and the "Original" backup.
      return matchesSearch && d.owner_user_id === user?.id;
    }
    return matchesSearch;
  });

  // Grouping logic for versions (Only for regular users to resolve conflicts)
  const displayDevices = useMemo(() => {
    if (user?.role === 'super_admin') return filteredDevices;

    const processed = new Set<string>();
    const results: (DeviceTemplate & { hasBackup?: DeviceTemplate })[] = [];

    // First pass: Find main devices (Global or just not backups)
    filteredDevices.forEach(d => {
      const backupId = uuidv5(d.id, NAMESPACE);
      const backup = filteredDevices.find(bd => bd.id === backupId);
      
      if (!d.id.includes('-old') && !d.name.includes('(Original)')) {
        results.push({ ...d, hasBackup: backup });
        processed.add(d.id);
        if (backup) processed.add(backup.id);
      }
    });

    // Second pass: Add remaining devices (that weren't identified as main devices)
    filteredDevices.forEach(d => {
      if (!processed.has(d.id)) {
        results.push(d);
      }
    });

    return results;
  }, [filteredDevices, user?.role]);

  const handleApprove = async () => {
    if (approvingDeviceId) {
      await approveDevice(approvingDeviceId.id, approvingDeviceId.target);
      setApprovingDeviceId(null);
    }
  };

  if (loading && customDevices.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4 animate-in fade-in duration-500">
        <div className="relative">
          <div className="w-12 h-12 border-4 border-accent/20 border-t-accent rounded-full animate-spin" />
          <Smartphone size={20} className="absolute inset-0 m-auto text-accent animate-pulse" />
        </div>
        <p className="text-sm font-bold text-text-muted uppercase tracking-widest">Initialising Catalog...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 px-2">
        <div className="space-y-1">
          <p className="text-sm text-text-muted font-medium max-w-md leading-relaxed">
            {user?.role === 'super_admin' 
              ? 'Manage global availability and professional user submissions with advanced control.' 
              : 'Manage your personal device catalog and track approval status for global submissions.'}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative group w-full sm:w-64">
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted group-focus-within:text-accent transition-colors" />
            <input
              type="text"
              placeholder="Search devices..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-white border border-border rounded-2xl text-sm focus:ring-2 focus:ring-accent/20 focus:border-accent outline-none transition-all shadow-sm"
            />
          </div>
          <button className="h-11 px-4 bg-white border border-border text-text-secondary rounded-2xl flex items-center gap-2 hover:bg-slate-50 transition-all text-sm font-bold shadow-sm">
            <Filter size={16} />
            Filter
          </button>
        </div>
      </div>

      {/* Main Table Container */}
      <div className="bg-white border border-border rounded-[40px] overflow-hidden shadow-sm relative group/table">
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-accent via-indigo-500 to-purple-500 opacity-0 group-hover/table:opacity-100 transition-opacity duration-700" />

        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 sticky top-0 z-10 backdrop-blur-xl border-b border-border/50">
                <th className="pl-10 py-6 text-[10px] font-bold text-text-muted uppercase tracking-[0.25em]">Preview</th>
                <th className="px-6 py-6 text-[10px] font-bold text-text-muted uppercase tracking-[0.25em]">Identity</th>
                <th className="px-6 py-6 text-[10px] font-bold text-text-muted uppercase tracking-[0.25em]">Classification</th>
                <th className="px-6 py-6 text-[10px] font-bold text-text-muted uppercase tracking-[0.25em]">Status</th>
                <th className="pr-10 py-6 text-[10px] font-bold text-text-muted uppercase tracking-[0.25em] text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30">
              {displayDevices.map((device) => {
                const isGlobal = device.is_approved;
                const hasBackup = (device as any).hasBackup;

                return (
                  <tr
                    key={device.id}
                    className="group hover:bg-slate-50/80 transition-all duration-300"
                  >
                    <td className="pl-10 py-6">
                      <div
                        onClick={() => setPreviewingDevice(device)}
                        className="w-16 h-20 bg-white border border-border rounded-2xl flex items-center justify-center p-2 cursor-pointer group-hover:border-accent/40 shadow-sm transition-all relative overflow-hidden group/thumb"
                      >
                        {device.templatePath && device.templatePath !== "" ? (
                          <img
                            src={device.templatePath}
                            alt={device.name}
                            className="max-w-full max-h-full object-contain drop-shadow-md transition-transform duration-500 group-hover/thumb:scale-110"
                          />
                        ) : (
                          <Smartphone size={24} className="text-text-muted opacity-20" />
                        )}
                        <div className="absolute inset-0 bg-accent/10 opacity-0 group-hover/thumb:opacity-100 flex items-center justify-center text-accent transition-all duration-300 backdrop-blur-[2px]">
                          <Eye size={20} />
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-6">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <p className="text-base font-bold text-text-primary group-hover:text-accent transition-colors leading-tight">
                            {device.name.toLowerCase().startsWith(device.brand.toLowerCase()) 
                              ? device.name.substring(device.brand.length).trim() 
                              : device.name}
                          </p>
                          {hasBackup && (
                            <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-[8px] font-black rounded-full uppercase tracking-tighter">Updated</span>
                          )}
                          {(device.name.includes('(Original)') || device.name.includes('(My Version)')) && (
                            <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-[8px] font-black rounded-full uppercase tracking-tighter">Original</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold text-text-muted uppercase tracking-[0.15em]">{device.brand}</span>
                          <span className="w-1 h-1 rounded-full bg-border" />
                          <span className="text-[10px] font-mono font-bold text-text-muted">{device.dimensions.width}&times;{device.dimensions.height}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-6">
                      <div className="inline-flex flex-col gap-1.5">
                        <span className="px-3 py-1.5 bg-slate-100 text-text-secondary rounded-xl border border-border/50 text-[10px] font-bold uppercase tracking-widest text-center">
                          {device.category}
                        </span>
                        <p className="text-[10px] font-bold text-accent/80 text-center uppercase tracking-tighter">
                          {device.zones.length} Editable Zones
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-6">
                      <div className="space-y-3">
                        {isGlobal ? (
                          <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-50 text-green-700 text-[10px] font-black rounded-2xl border border-green-100 uppercase tracking-[0.1em] shadow-sm">
                            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                            <Globe size={14} /> GLOBAL
                          </div>
                        ) : (
                          <div className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-600 text-[10px] font-black rounded-2xl border border-slate-200 uppercase tracking-[0.1em] shadow-sm">
                            <Lock size={14} /> PRIVATE
                          </div>
                        )}
                        
                        {hasBackup && user?.role !== 'super_admin' && (
                          <div className="p-3 bg-amber-50/50 border border-amber-200/50 rounded-2xl space-y-2">
                            <div className="flex items-center gap-2 text-amber-700">
                              <History size={12} />
                              <span className="text-[9px] font-bold uppercase tracking-tighter">Newer version available</span>
                            </div>
                            <div className="flex gap-2">
                              <button 
                                onClick={() => {
                                  if (window.confirm('This will keep the Admin\'s improved version and delete your original backup. Proceed?')) {
                                    removeCustomDevice(hasBackup.id);
                                  }
                                }}
                                className="flex-1 py-1.5 bg-white border border-amber-200 text-amber-700 text-[8px] font-bold rounded-lg hover:bg-amber-100 transition-all flex items-center justify-center gap-1"
                              >
                                <Check size={10} /> Adopt Admin Version
                              </button>
                              <button 
                                onClick={() => {
                                  if (window.confirm('Keep your original version? This will hide the Admin\'s version from your view.')) {
                                    updateCustomDevice({
                                      ...hasBackup,
                                      name: `${hasBackup.name.replace(' (Original)', '')} (My Version)`
                                    });
                                  }
                                }}
                                className="flex-1 py-1.5 bg-white border border-slate-200 text-slate-600 text-[8px] font-bold rounded-lg hover:bg-slate-50 transition-all flex items-center justify-center gap-1"
                              >
                                <Check size={10} /> Stick with Original
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="pr-10 py-6 text-right">
                      <div className="flex items-center justify-end gap-3">
                        {user?.role === 'super_admin' && !isGlobal && (
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => setApprovingDeviceId({id: device.id, target: true})}
                            className="h-10 px-5 font-bold text-[10px] uppercase tracking-wider bg-green-600 hover:bg-green-700 text-white shadow-lg shadow-green-600/20 rounded-2xl"
                          >
                            <CheckCircle size={16} className="mr-2" />
                            Make Global
                          </Button>
                        )}
                        {(user?.role === 'super_admin' || device.owner_user_id === user?.id) && (
                          <>
                            <button
                              onClick={() => onEditDetails(device)}
                              className="p-2 text-text-muted hover:text-accent hover:bg-accent/5 rounded-xl transition-all"
                              title="Edit Technical Details"
                            >
                              <Edit2 size={18} />
                            </button>
                            <button
                              onClick={() => {
                                if (window.confirm('Are you sure you want to PERMANENTLY delete this template? This cannot be undone.')) {
                                  removeCustomDevice(device.id);
                                }
                              }}
                              className="p-2 text-text-muted hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                              title="Remove from System"
                            >
                              <Trash2 size={18} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        isOpen={!!approvingDeviceId}
        onClose={() => setApprovingDeviceId(null)}
        title={approvingDeviceId?.target ? "Confirm Global Availability" : "Revoke Global Access"}
        maxWidth="max-w-md"
      >
        <div className="p-2 space-y-6">
          <div className="flex flex-col items-center text-center gap-4">
            <div className={`w-16 h-16 ${approvingDeviceId?.target ? 'bg-amber-50 text-amber-500 border-amber-100' : 'bg-red-50 text-red-500 border-red-100'} rounded-3xl flex items-center justify-center border`}>
              <AlertTriangle size={32} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-text-primary leading-tight">
                {approvingDeviceId?.target ? 'Make Device Globally Available?' : 'Revoke Global Availability?'}
              </h3>
              <p className="text-sm text-text-muted mt-2 px-4 leading-relaxed">
                {approvingDeviceId?.target 
                  ? 'This device will be visible to ALL users in the global catalog.' 
                  : 'This device will be hidden from the global catalog and only visible to its owner.'}
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-3 pt-4 border-t border-border/50">
            <Button
              variant="primary"
              onClick={handleApprove}
              className={`w-full py-4 font-bold uppercase tracking-widest text-xs rounded-2xl shadow-xl ${approvingDeviceId?.target ? 'bg-green-600 hover:bg-green-700 shadow-green-600/20' : 'bg-red-600 hover:bg-red-700 shadow-red-600/20'} text-white`}
            >
              {approvingDeviceId?.target ? 'Yes, Make it Global' : 'Yes, Revoke Access'}
            </Button>
            <Button
              variant="secondary"
              onClick={() => setApprovingDeviceId(null)}
              className="w-full py-4 font-bold uppercase tracking-widest text-xs rounded-2xl"
            >
              Cancel
            </Button>
          </div>
        </div>
      </Modal>

      {previewingDevice && (
        <Modal
          isOpen={!!previewingDevice}
          onClose={() => setPreviewingDevice(null)}
          title={`Detailed Preview: ${previewingDevice.name}`}
          maxWidth="max-w-4xl"
        >
          <div className="space-y-8 p-1">
            <div className="aspect-[16/10] rounded-[40px] bg-slate-50 border border-border flex items-center justify-center p-12 overflow-hidden shadow-inner relative group/big">
              <div className="absolute inset-0 bg-gradient-to-br from-white to-transparent pointer-events-none" />
              {previewingDevice.templatePath && previewingDevice.templatePath !== "" ? (
                <img
                  src={previewingDevice.templatePath}
                  alt={previewingDevice.name}
                  className="max-h-full max-w-full object-contain drop-shadow-2xl transition-transform duration-1000 group-hover/big:scale-105"
                />
              ) : (
                <Smartphone size={64} className="text-text-muted opacity-10" />
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                { label: 'Manufacturer', value: previewingDevice.brand, icon: Smartphone },
                { label: 'Category', value: previewingDevice.category, icon: Layout },
                { label: 'Technical Resolution', value: `${previewingDevice.dimensions.width} x ${previewingDevice.dimensions.height} PX`, icon: Globe }
              ].map((item, i) => (
                <div key={i} className="bg-white p-5 rounded-3xl border border-border shadow-sm group/item transition-all hover:border-accent/30 hover:shadow-md">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-8 h-8 rounded-xl bg-slate-50 flex items-center justify-center text-text-muted group-hover/item:text-accent transition-colors">
                      <item.icon size={16} />
                    </div>
                    <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest">{item.label}</p>
                  </div>
                  <p className="text-base font-bold text-text-primary capitalize">{item.value}</p>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-end gap-3 pt-4">
              <Button
                variant="secondary"
                onClick={() => onEditDetails(previewingDevice)}
                className="px-6 py-4 font-bold uppercase tracking-widest text-[10px] rounded-2xl"
              >
                Edit Technicals
              </Button>
              <Button
                variant="primary"
                onClick={() => setPreviewingDevice(null)}
                className="px-8 py-4 bg-text-primary hover:bg-black text-white font-bold uppercase tracking-widest text-[10px] rounded-2xl shadow-xl shadow-black/10"
              >
                Close Preview
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

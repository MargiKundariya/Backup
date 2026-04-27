
'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { DeviceTemplate } from '@/types';
import { useEditorStore } from '@/lib/store';
import { useTemplateStore } from '@/lib/templateStore';
import { DeviceCard } from './DeviceCard';
import { Modal } from '../ui/Modal';
import { TemplateUploader } from '../editor/devices/TemplateUploader';
import { 
  Search, 
  LayoutGrid, 
  Smartphone, 
  Laptop, 
  Monitor,
  Tablet, 
  Watch, 
  ChevronDown, 
  Check, 
  X, 
  Loader2,
  Filter
} from 'lucide-react';

const RECENT_KEY = 'skinmockup-recent-devices';
const MAX_RECENT = 2;

function getRecentDeviceIds(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]');
  } catch {
    return [];
  }
}

function addRecentDevice(id: string) {
  const recent = getRecentDeviceIds().filter((r) => r !== id);
  recent.unshift(id);
  localStorage.setItem(RECENT_KEY, JSON.stringify(recent.slice(0, MAX_RECENT)));
}

export function DeviceCatalog() {
  const { customDevices: allDevices, loading, loadCustomDevices } = useTemplateStore();
  const selectedDevice = useEditorStore((s) => s.selectedDevice);
  const selectedDevices = useEditorStore((s) => s.selectedDevices);
  const selectDevice = useEditorStore((s) => s.selectDevice);
  const zoneDesigns = useEditorStore((s) => s.zoneDesigns);

  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [expanded, setExpanded] = useState(!selectedDevice);
  const [recentIds, setRecentIds] = useState<string[]>([]);
  const [openBrands, setOpenBrands] = useState<Record<string, boolean>>({});

  // Multi-select state
  const router = useRouter();
  const pathname = usePathname();
  const [multiSelectMode, setMultiSelectMode] = useState(false);
  const [selectedListDeviceIds, setSelectedListDeviceIds] = useState<string[]>([]);
  const [isUploaderOpen, setIsUploaderOpen] = useState(false);
  
  const setActiveSidebarSection = useEditorStore((s) => s.setActiveSidebarSection);

  const navigateToEditor = useCallback(() => {
    if (pathname !== '/') {
      router.push('/');
    }
  }, [pathname, router]);

  useEffect(() => {
    loadCustomDevices();
    setRecentIds(getRecentDeviceIds());
  }, [loadCustomDevices]);

  const toggleBrand = (brand: string) => {
    setOpenBrands((prev) => ({ ...prev, [brand]: !prev[brand] }));
  };

  const handleDeviceSelect = useCallback(
    (device: DeviceTemplate) => {
      if (multiSelectMode) {
        setSelectedListDeviceIds((prev) =>
          prev.includes(device.id) ? prev.filter((id) => id !== device.id) : [...prev, device.id]
        );
        return;
      }

      // Add to cumulative selection
      useEditorStore.getState().addSelectedDevice(device);
      
      // Set as active preview
      selectDevice(device);
      useEditorStore.getState().setActivePreviewDevice(device.id);
      
      setActiveSidebarSection('design');
      addRecentDevice(device.id);
      setRecentIds(getRecentDeviceIds());
      setExpanded(false);
      navigateToEditor();
    },
    [multiSelectMode, selectDevice, setActiveSidebarSection, navigateToEditor]
  );

  const confirmMultiSelect = useCallback(() => {
    if (selectedListDeviceIds.length === 0) return;
    const selectedDevicesFull = allDevices.filter((d) => selectedListDeviceIds.includes(d.id));

    useEditorStore.getState().setSelectedDevices(selectedDevicesFull);
    if (selectedDevicesFull[0]) {
      selectDevice(selectedDevicesFull[0]);
      useEditorStore.getState().setActivePreviewDevice(selectedDevicesFull[0].id);
      setActiveSidebarSection('design');
      addRecentDevice(selectedDevicesFull[0].id);
      navigateToEditor();
    }

    setRecentIds(getRecentDeviceIds());
    setMultiSelectMode(false);
    setSelectedListDeviceIds([]);
    setExpanded(false);
  }, [selectedListDeviceIds, allDevices, selectDevice, setActiveSidebarSection, navigateToEditor]);

  const filtered = useMemo(() => {
    let devices = [...allDevices];
    if (categoryFilter !== 'all') devices = devices.filter((d) => d.category === categoryFilter);
    if (search) {
      const q = search.toLowerCase();
      devices = devices.filter((d) => 
        (d.name?.toLowerCase() || '').includes(q) || 
        (d.brand?.toLowerCase() || '').includes(q) ||
        (d.model?.toLowerCase() || '').includes(q)
      );
    }
    return devices;
  }, [allDevices, categoryFilter, search]);

  // Simplify: Flatten view when searching or filtering to make it easier to find devices
  const isFlattened = search.length > 0 || categoryFilter !== 'all';

  const grouped = useMemo(() => {
    if (isFlattened) return null;
    const groups: Record<string, DeviceTemplate[]> = {};
    for (const d of filtered) {
      if (!groups[d.brand]) groups[d.brand] = [];
      groups[d.brand].push(d);
    }
    return groups;
  }, [filtered, isFlattened]);

  const selectedDeviceNames = useMemo(() => {
    return allDevices
      .filter((d) => selectedListDeviceIds.includes(d.id))
      .map((d) => d.name)
      .join(', ');
  }, [allDevices, selectedListDeviceIds]);

  const handleLongPress = useCallback((device: DeviceTemplate) => {
    if (multiSelectMode) return;
    setMultiSelectMode(true);
    setSelectedListDeviceIds([device.id]);
  }, [multiSelectMode]);

  const categories = [
    { id: 'all', label: 'All', icon: LayoutGrid },
    { id: 'phone', label: 'Phones', icon: Smartphone },
    { id: 'tablet', label: 'Tablets', icon: Tablet },
    { id: 'laptop', label: 'Laptops', icon: Monitor },
    { id: 'watch', label: 'Watches', icon: Watch },
  ];

  return (
    <div className="space-y-4">
      {/* COMPACT MODE */}
      {selectedDevice && !expanded && (
        <div
          className="flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all hover:bg-slate-100 bg-white border border-border shadow-sm"
          onClick={() => setExpanded(true)}
        >
          <div className="w-10 h-14 flex-shrink-0 rounded-lg flex items-center justify-center bg-slate-50 border border-border overflow-hidden">
            {selectedDevice.templatePath && selectedDevice.templatePath !== "" ? (
              <img src={selectedDevice.templatePath} alt={selectedDevice.name} className="max-w-full max-h-full object-contain" />
            ) : (
              <Smartphone size={20} className="text-text-muted opacity-20" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            {selectedDevices.length > 1 ? (
              <>
                <p className="text-sm font-bold truncate text-text-primary">
                  {selectedDevices.map(d => d.name).join(', ')}
                </p>
                <p className="text-[10px] truncate text-text-muted uppercase font-bold tracking-tight">
                  {selectedDevices.length} Devices Selected
                </p>
              </>
            ) : (
              <>
                <p className="text-sm font-bold truncate text-text-primary">{selectedDevice.name}</p>
                <p className="text-[10px] truncate text-text-muted uppercase font-bold tracking-tight">{selectedDevice.brand} · {selectedDevice.category}</p>
              </>
            )}
          </div>
          <ChevronDown size={16} className="text-text-muted" />
        </div>
      )}

      {/* EXPANDED MODE */}
      {expanded && (
        <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
              <input
                type="text"
                placeholder="Search by name, brand, or model..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 text-sm rounded-xl bg-slate-50 border border-border text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/20 transition-all font-medium"
              />
              {search && (
                <button 
                  onClick={() => setSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary"
                >
                  <X size={14} />
                </button>
              )}
            </div>
            {multiSelectMode ? (
              <button
                onClick={() => {
                  setMultiSelectMode(false);
                  setSelectedListDeviceIds([]);
                }}
                className="p-2.5 bg-slate-100 text-text-secondary rounded-xl hover:bg-slate-200 transition-all"
                title="Exit Selection"
              >
                <X size={18} />
              </button>
            ) : (
              <button
                onClick={() => setMultiSelectMode(true)}
                className="p-2.5 bg-slate-50 text-text-muted border border-border rounded-xl hover:bg-slate-100 transition-all"
                title="Select Multiple"
              >
                <Filter size={18} />
              </button>
            )}
          </div>

          {/* Current Selection Section (if multiple) */}
          {selectedDevices.length > 1 && !search && categoryFilter === 'all' && (
            <div className="space-y-2">
              <p className="text-[10px] font-bold text-accent uppercase tracking-widest px-1">Current Selection</p>
              <div className="grid grid-cols-1 gap-2">
                {selectedDevices.map((device) => (
                  <DeviceCard
                    key={`selected-${device.id}`}
                    device={device}
                    isSelected={true}
                    onSelect={() => handleDeviceSelect(device)}
                    onLongPress={handleLongPress}
                    showCheckbox={multiSelectMode}
                  />
                ))}
              </div>
              <div className="glass-separator my-4 opacity-50" />
            </div>
          )}

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar">
            {categories.map((cat) => {
              const Icon = cat.icon;
              const isActive = categoryFilter === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setCategoryFilter(cat.id)}
                  className={`flex items-center gap-2 px-4 py-2 text-[10px] font-bold rounded-lg whitespace-nowrap transition-all border ${isActive
                      ? 'bg-accent border-accent text-white shadow-md'
                      : 'bg-white text-text-secondary border-border hover:bg-slate-50'
                    }`}
                >
                  <Icon size={12} />
                  {cat.label}
                </button>
              );
            })}
          </div>

          <Modal
            isOpen={isUploaderOpen}
            onClose={() => setIsUploaderOpen(false)}
            title="Create Custom Template"
            maxWidth="max-w-4xl"
          >
            <TemplateUploader
              onTemplateCreated={(d) => {
                selectDevice(d);
                useEditorStore.getState().setActivePreviewDevice(d.id);
                setActiveSidebarSection('design');
                setIsUploaderOpen(false);
                setExpanded(false);
                navigateToEditor();
              }}
              onCancel={() => setIsUploaderOpen(false)}
            />
          </Modal>

          {loading && (
            <div className="flex flex-col items-center justify-center py-12 gap-3 text-text-muted">
              <Loader2 size={24} className="animate-spin text-accent" />
              <p className="text-xs font-medium uppercase tracking-widest">Refreshing catalog...</p>
            </div>
          )}

          {!loading && (
            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
              {isFlattened ? (
                // FLAT LIST FOR SEARCH/FILTER
                <div className="grid grid-cols-1 gap-2">
                  <div className="flex items-center justify-between px-1 mb-2">
                    <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest">
                      Results ({filtered.length})
                    </p>
                    {multiSelectMode && filtered.length > 0 && (
                       <button 
                        onClick={() => {
                          const allVisibleIds = filtered.map(d => d.id);
                          setSelectedListDeviceIds(prev => Array.from(new Set([...prev, ...allVisibleIds])));
                        }}
                        className="text-[10px] font-bold text-accent hover:underline"
                       >
                         Select All Results
                       </button>
                    )}
                  </div>
                  {filtered.map((device) => (
                    <DeviceCard
                      key={device.id}
                      device={device}
                      isSelected={multiSelectMode ? selectedListDeviceIds.includes(device.id) : selectedDevice?.id === device.id}
                      onSelect={() => handleDeviceSelect(device)}
                      onLongPress={handleLongPress}
                      showCheckbox={multiSelectMode}
                    />
                  ))}
                </div>
              ) : (
                // GROUPED BY BRAND
                grouped && Object.entries(grouped).map(([brand, devices]) => (
                  <div key={brand} className="space-y-3">
                    <button
                      onClick={() => toggleBrand(brand)}
                      className="w-full flex items-center justify-between group p-1"
                    >
                      <span className="text-[10px] font-bold uppercase tracking-widest text-text-muted group-hover:text-text-primary transition-colors">
                        {brand} ({devices.length})
                      </span>
                      <ChevronDown
                        size={14}
                        className={`text-text-muted transition-transform duration-200 ${openBrands[brand] ? 'rotate-180' : ''}`}
                      />
                    </button>

                    {openBrands[brand] && (
                      <div className="grid grid-cols-1 gap-2">
                        {devices.map((device) => (
                          <DeviceCard
                            key={device.id}
                            device={device}
                            isSelected={multiSelectMode ? selectedListDeviceIds.includes(device.id) : selectedDevice?.id === device.id}
                            onSelect={() => handleDeviceSelect(device)}
                            onLongPress={handleLongPress}
                            showCheckbox={multiSelectMode}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                ))
              )}

              {filtered.length === 0 && !loading && (
                <div className="py-12 text-center space-y-2 bg-slate-50/50 rounded-2xl border border-dashed border-border">
                  <p className="text-sm font-bold text-text-primary">No devices found</p>
                  <p className="text-xs text-text-muted">Try a different search or category.</p>
                </div>
              )}
            </div>
          )}

          {multiSelectMode && (
            <div className="sticky bottom-0 p-4 bg-white border border-border rounded-2xl shadow-2xl flex flex-col gap-3 animate-in slide-in-from-bottom-2 z-10">
              <div className="flex items-center justify-between">
                <div className="flex flex-col">
                  <p className="text-xs font-bold text-text-primary uppercase tracking-tight">
                    {selectedListDeviceIds.length} Devices Selected
                  </p>
                  <p className="text-[10px] text-text-muted font-medium truncate max-w-[180px]">
                    {selectedDeviceNames || 'None selected'}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedListDeviceIds([])}
                  className="text-[10px] font-bold text-red-500 hover:bg-red-50 px-2 py-1 rounded-lg transition-colors"
                >
                  Clear All
                </button>
              </div>
              <div className="flex items-center gap-2 pt-1">
                <button
                  onClick={confirmMultiSelect}
                  disabled={selectedListDeviceIds.length === 0}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-accent text-white text-[11px] font-black uppercase tracking-widest rounded-xl shadow-lg shadow-accent/20 hover:bg-accent-hover disabled:opacity-50 disabled:shadow-none transition-all"
                >
                  <Check size={14} />
                  Proceed to Design
                </button>
              </div>
            </div>
          )}

          {selectedDevice && !multiSelectMode && (
            <button
              onClick={() => setExpanded(false)}
              className="w-full py-2 text-[10px] font-bold uppercase tracking-widest text-text-muted hover:text-text-primary transition-colors border-t border-border mt-2 pt-4"
            >
              Close Catalog
            </button>
          )}
        </div>
      )}
    </div>
  );
}
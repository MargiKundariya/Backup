'use client';

import { useState, useCallback, useMemo, useRef } from 'react';
import { useDropzone } from 'react-dropzone';
import { Smartphone, Upload, X, Check, ArrowRight, Loader2, Info, Sparkles, Monitor, Tablet, Watch, ChevronDown, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useTemplateStore } from '@/lib/templateStore';
import { DeviceTemplate } from '@/types';
import { v4 as uuidv4 } from 'uuid';
import { useAuth } from '@/hooks/useAuth';

interface TemplateUploaderProps {
  onTemplateCreated: (device: DeviceTemplate) => void;
  onCancel: () => void;
  device?: DeviceTemplate; // Optional for editing
}

const BRAND_MODELS: Record<string, string[]> = {
  'Apple': ['iPhone 15 Pro', 'iPhone 15', 'iPhone 14 Pro', 'iPad Pro 11"', 'iPad Air', 'MacBook Pro 14"', 'Apple Watch S9'],
  'Samsung': ['Galaxy S24 Ultra', 'Galaxy S23', 'Galaxy Z Fold 5', 'Galaxy Tab S9', 'Galaxy Watch 6'],
  'Google': ['Pixel 8 Pro', 'Pixel 7', 'Pixel Tablet', 'Pixel Watch 2'],
  'Microsoft': ['Surface Pro 9', 'Surface Laptop 5'],
};

export function TemplateUploader({ onTemplateCreated, onCancel, device }: TemplateUploaderProps) {
  const { user } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(device?.templatePath || null);
  const [brand, setBrand] = useState(device?.brand || '');
  const [model, setModel] = useState(device?.model || '');
  const [category, setCategory] = useState<DeviceTemplate['category']>(device?.category || 'phone');
  const [loading, setLoading] = useState(false);
  const [dimensions, setDimensions] = useState(device?.dimensions || { width: 0, height: 0 });
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { addCustomDevice, updateCustomDevice } = useTemplateStore();

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    setFile(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      setPreview(dataUrl);

      // Get dimensions
      const img = new Image();
      img.onload = () => {
        setDimensions({ width: img.width, height: img.height });
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  }, []);

  const { getRootProps, getInputProps, isDragActive, open: openFilePicker } = useDropzone({
    onDrop,
    accept: { 'image/png': ['.png'] },
    multiple: false,
    noClick: !!preview,
  });

  const handleUpload = async () => {
    if (!preview || !brand || !model) return;

    setErrorMessage(null);
    setLoading(true);
    try {
      // Find existing brand to match case
      const existingBrand = dynamicBrands.find(b => b.toLowerCase() === brand.toLowerCase());
      const finalBrand = existingBrand || brand;

      const displayName = model; // Do not prepend brand, keep it separate.
      if (device) {
        const updated: DeviceTemplate = {
          ...device,
          name: displayName,
          brand: finalBrand,
          model,
          category,
          dimensions,
          templatePath: preview,
        };
        await updateCustomDevice(updated);
        onTemplateCreated(updated);
      } else {
        // Generate default zones based on category
        const defaultZones = [];
        const zoneCount = category === 'laptop' ? 3 : 1;
        for (let i = 0; i < zoneCount; i++) {
          defaultZones.push({
            id: `zone-${i + 1}`,
            name: category === 'laptop' 
              ? (i === 0 ? 'Lid' : i === 1 ? 'Palmrest' : 'Bottom') 
              : 'Body',
            bounds: { x: 0, y: 0, width: dimensions.width, height: dimensions.height },
            maskPath: '', // To be filled by user/system later if needed
          });
        }

        const newDevice: DeviceTemplate = {
          id: uuidv4(),
          name: displayName,
          brand: finalBrand,
          model,
          category,
          templatePath: preview,
          dimensions,
          zones: defaultZones,
          isCustom: true
        };
        await addCustomDevice(newDevice, preview);
        onTemplateCreated(newDevice);
      }
    } catch (err: any) {
      console.error('Upload failed', err);
      setErrorMessage(err.message || 'Failed to save device. Please check file size or connectivity.');
    } finally {
      setLoading(false);
    }
  };

  const categories = [
    { id: 'phone' as const, label: 'PHONE', icon: Smartphone },
    { id: 'tablet' as const, label: 'TABLET', icon: Tablet },
    { id: 'watch' as const, label: 'WATCH', icon: Watch },
    { id: 'laptop' as const, label: 'LAPTOP', icon: Monitor },
  ];

  const { customDevices } = useTemplateStore();

  const dynamicBrands = useMemo(() => {
    const brands = new Set(Object.keys(BRAND_MODELS));
    customDevices.forEach(d => {
      if (d.brand) brands.add(d.brand);
    });
    return Array.from(brands);
  }, [customDevices]);

  const modelsForBrand = useMemo(() => {
    const models = new Set(BRAND_MODELS[brand] || []);
    customDevices.forEach(d => {
      if (d.brand.toLowerCase() === brand.toLowerCase() && d.model) {
        models.add(d.model);
      }
    });
    return Array.from(models);
  }, [brand, customDevices]);

  return (
    <div className="p-0 space-y-0 max-h-[85vh] overflow-y-auto custom-scrollbar bg-white">
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-0">
          
          {/* Left Side: Form */}
          <div className="p-10 space-y-8 border-r border-border/50">
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-3">
                <label className="text-[10px] font-black text-text-muted uppercase tracking-[0.25em] ml-1">Brand</label>
                <div className="relative">
                  <input 
                    list="brand-list"
                    value={brand} 
                    onChange={(e) => {
                      setBrand(e.target.value);
                      setModel('');
                    }} 
                    placeholder="Apple"
                    className="w-full px-6 py-4 bg-slate-50 border border-border rounded-[20px] text-sm font-bold focus:ring-4 focus:ring-accent/10 focus:border-accent transition-all outline-none"
                  />
                  <datalist id="brand-list">
                    {dynamicBrands.map(b => (
                      <option key={b} value={b} />
                    ))}
                  </datalist>
                  <ChevronDown size={14} className="absolute right-5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none opacity-40" />
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black text-text-muted uppercase tracking-[0.25em] ml-1">Model</label>
                <div className="relative">
                  <input 
                    list="model-list"
                    value={model} 
                    onChange={(e) => setModel(e.target.value)} 
                    placeholder="e.g. 15 Pro"
                    className="w-full px-6 py-4 bg-slate-50 border border-border rounded-[20px] text-sm font-bold focus:ring-4 focus:ring-accent/10 focus:border-accent transition-all outline-none"
                  />
                  <datalist id="model-list">
                    {modelsForBrand.map(m => (
                      <option key={m} value={m} />
                    ))}
                  </datalist>
                  <ChevronDown size={14} className="absolute right-5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none opacity-40" />
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-[10px] font-black text-text-muted uppercase tracking-[0.25em] ml-1">Template Asset</label>
              <div className="flex gap-3">
                <div className="flex-1 px-6 py-4 bg-slate-50 border border-border rounded-[20px] text-[10px] font-mono font-bold text-text-muted transition-all outline-none truncate flex items-center">
                  {preview ? "File loaded successfully" : "Awaiting selection..."}
                </div>
                {preview ? (
                  <button 
                    onClick={() => { setFile(null); setPreview(null); }}
                    className="w-14 h-14 bg-red-50 border border-red-100 rounded-[20px] flex items-center justify-center text-red-500 hover:bg-red-100 transition-all shadow-sm active:scale-95"
                    title="Clear file"
                  >
                    <X size={20} />
                  </button>
                ) : (
                  <button 
                    onClick={openFilePicker}
                    className="w-14 h-14 bg-white border border-border rounded-[20px] flex items-center justify-center text-text-muted hover:text-accent hover:border-accent transition-all shadow-sm active:scale-95"
                    title="Browse file"
                  >
                    <Upload size={20} />
                  </button>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <label className="text-[10px] font-black text-text-muted uppercase tracking-[0.25em] ml-1">Classification</label>
              <div className="grid grid-cols-4 gap-3">
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setCategory(cat.id)}
                    className={`
                      flex flex-col items-center justify-center gap-3 p-5 rounded-[24px] border-2 transition-all group
                      ${category === cat.id 
                        ? 'bg-accent border-accent text-white shadow-xl shadow-accent/20 scale-[1.02]' 
                        : 'bg-white border-slate-100 text-text-muted hover:border-border hover:bg-slate-50'}
                    `}
                  >
                    <cat.icon size={24} className={`${category === cat.id ? 'text-white' : 'text-text-muted group-hover:text-accent'} transition-colors`} />
                    <span className="text-[9px] font-black tracking-[0.1em]">{cat.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Right Side: Preview & Specs */}
          <div className="p-10 bg-slate-50/30 space-y-8 flex flex-col">
            <div className="space-y-3 flex-1 flex flex-col">
              <label className="text-[10px] font-black text-text-muted uppercase tracking-[0.25em] ml-1">Asset Preview</label>
              
              <div 
                {...getRootProps()} 
                className={`
                  flex-1 w-full bg-white rounded-[40px] border-2 shadow-inner flex flex-col items-center justify-center p-8 overflow-hidden transition-all relative group
                  ${!preview ? 'border-dashed border-border hover:border-accent/40 cursor-pointer' : 'border-solid border-border'}
                `}
              >
                <input {...getInputProps()} />
                
                {preview && preview !== "" ? (
                  <img src={preview} alt="Preview" className="max-h-full max-w-full object-contain drop-shadow-2xl transition-transform duration-700 group-hover:scale-105" />
                ) : (
                  <div className="flex flex-col items-center gap-4 animate-in fade-in zoom-in duration-500">
                    <div className="w-20 h-20 bg-slate-100 rounded-[24px] flex items-center justify-center text-text-muted shadow-inner group-hover:scale-110 transition-transform">
                      <Upload size={40} />
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-black text-text-primary uppercase tracking-[0.2em]">Drop Template PNG</p>
                      <p className="text-[10px] text-text-muted mt-2 font-medium">High resolution assets (e.g. 2000px+) recommended</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-4">
              {errorMessage && (
                <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-start gap-3 animate-in shake duration-500">
                  <AlertCircle size={16} className="text-red-500 shrink-0 mt-0.5" />
                  <p className="text-[11px] font-bold text-red-700 leading-relaxed uppercase tracking-tight">{errorMessage}</p>
                </div>
              )}

              <div className="p-6 bg-accent/5 border border-accent/10 rounded-[32px] flex items-start gap-4 shadow-sm">
                <div className="p-3 bg-accent/10 text-accent rounded-[18px] shadow-sm">
                  <Sparkles size={20} />
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-black text-accent uppercase tracking-wider">Technical Specifications</p>
                  <p className="text-[11px] font-medium text-text-muted leading-relaxed">
                    Native Resolution: <span className="text-text-primary font-bold">{dimensions.width} &times; {dimensions.height} PX</span>. 
                    Contains <span className="text-text-primary font-bold">{device?.zones.length || 0} mapped zones</span> for skin customization.
                  </p>
                </div>
              </div>

              {user?.role === 'super_admin' ? (
                <div className="p-5 bg-green-50 border border-green-100 rounded-[24px] flex items-center justify-between shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                    <p className="text-[10px] font-black text-green-700 uppercase tracking-widest">Initialization Status</p>
                  </div>
                  <span className="px-4 py-1.5 bg-green-600 text-white text-[9px] font-black rounded-xl uppercase tracking-widest shadow-lg shadow-green-600/20">Globally</span>
                </div>
              ) : (
                <div className="p-5 bg-blue-50 border border-blue-100 rounded-[24px] flex items-center justify-between shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-blue-500 rounded-full" />
                    <p className="text-[10px] font-black text-blue-700 uppercase tracking-widest">Initialization Status</p>
                  </div>
                  <span className="px-4 py-1.5 bg-blue-600 text-white text-[9px] font-black rounded-xl uppercase tracking-widest shadow-lg shadow-blue-600/20">Private</span>
                </div>
              )}
            </div>

            <div className="flex gap-4 pt-4">
              <Button
                variant="secondary"
                onClick={onCancel}
                className="flex-1 py-4 rounded-2xl font-black text-[11px] uppercase tracking-widest bg-white"
              >
                Discard
              </Button>
              <Button
                variant="primary"
                onClick={handleUpload}
                disabled={loading || !preview || !brand || !model}
                className="flex-[2] py-4 rounded-2xl gap-3 shadow-xl shadow-accent/20 font-black text-[11px] uppercase tracking-widest"
              >
                {loading ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <>
                    <Check size={18} /> 
                    {device ? 'Commit Updates' : 'Initialize Device'}
                  </>
                )}
              </Button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

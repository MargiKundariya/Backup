'use client';

import { useState, useMemo } from 'react';
import { DeviceTemplate } from '@/types';
import { useTemplateStore } from '@/lib/templateStore';
import { Smartphone, Tablet, Watch, Laptop, Loader2, Save, X, Upload, Sparkles, ChevronDown } from 'lucide-react';
import { useRef } from 'react';
import { Button } from '@/components/ui/Button';

interface TemplateEditorProps {
  device: DeviceTemplate;
  onSave: () => void;
  onCancel: () => void;
}

const BRAND_MODELS: Record<string, string[]> = {
  'Apple': ['iPhone 15 Pro', 'iPhone 15', 'iPhone 14 Pro', 'iPad Pro 11"', 'iPad Air', 'MacBook Pro 14"', 'Apple Watch S9'],
  'Samsung': ['Galaxy S24 Ultra', 'Galaxy S23', 'Galaxy Z Fold 5', 'Galaxy Tab S9', 'Galaxy Watch 6'],
  'Google': ['Pixel 8 Pro', 'Pixel 7', 'Pixel Tablet', 'Pixel Watch 2'],
  'Microsoft': ['Surface Pro 9', 'Surface Laptop 5'],
};

export function TemplateEditor({ device, onSave, onCancel }: TemplateEditorProps) {
  const { updateCustomDevice } = useTemplateStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    brand: device.brand,
    model: device.model || '',
    category: device.category,
    templatePath: device.templatePath,
  });

  const categories = [
    { id: 'phone', label: 'Phone', icon: Smartphone },
    { id: 'tablet', label: 'Tablet', icon: Tablet },
    { id: 'watch', label: 'Watch', icon: Watch },
    { id: 'laptop', label: 'Laptop', icon: Laptop },
  ];

  const modelsForBrand = useMemo(() => {
    return BRAND_MODELS[formData.brand] || [];
  }, [formData.brand]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData({ ...formData, templatePath: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      await updateCustomDevice({
        ...device,
        ...formData,
        name: `${formData.brand} ${formData.model}`, // Automatically generate name
      });
      onSave();
    } catch (err) {
      console.error('Failed to save device', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest ml-1">Brand</label>
              <div className="relative">
                <input
                  list="brand-list-edit"
                  value={formData.brand}
                  onChange={(e) => setFormData({ ...formData, brand: e.target.value, model: '' })}
                  className="w-full px-5 py-3.5 text-sm bg-slate-50 border border-border rounded-2xl focus:ring-4 focus:ring-accent/10 focus:border-accent outline-none transition-all font-medium"
                  placeholder="Select or Type Brand"
                />
                <datalist id="brand-list-edit">
                  {Object.keys(BRAND_MODELS).map(b => (
                    <option key={b} value={b} />
                  ))}
                </datalist>
                <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none opacity-40" />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest ml-1">Model</label>
              <div className="relative">
                <input
                  list="model-list-edit"
                  value={formData.model}
                  onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                  className="w-full px-5 py-3.5 text-sm bg-slate-50 border border-border rounded-2xl focus:ring-4 focus:ring-accent/10 focus:border-accent outline-none transition-all font-medium"
                  placeholder="Select or Type Model"
                />
                <datalist id="model-list-edit">
                  {modelsForBrand.map(m => (
                    <option key={m} value={m} />
                  ))}
                </datalist>
                <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none opacity-40" />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest ml-1">Template Asset</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={formData.templatePath.length > 50 ? formData.templatePath.substring(0, 50) + '...' : formData.templatePath}
                readOnly
                className="flex-1 px-5 py-3.5 text-sm bg-slate-50 border border-border rounded-2xl focus:ring-4 focus:ring-accent/10 focus:border-accent outline-none transition-all font-mono text-[10px] font-bold text-text-muted"
                placeholder="Image URL or Base64..."
              />
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                className="hidden"
                accept="image/*"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-5 bg-white border border-border rounded-2xl hover:border-accent hover:bg-accent/5 transition-all flex items-center justify-center group/upload shadow-sm"
                title="Upload local image"
              >
                <Upload size={18} className="text-text-muted group-hover/upload:text-accent transition-colors" />
              </button>
            </div>
          </div>

          <div className="space-y-3">
            <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest ml-1">Classification</label>
            <div className="grid grid-cols-4 gap-3">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setFormData({ ...formData, category: cat.id as any })}
                  className={`flex flex-col items-center gap-3 p-4 rounded-2xl border transition-all ${formData.category === cat.id
                      ? 'bg-accent text-white border-accent shadow-lg shadow-accent/20 scale-[1.02]'
                      : 'bg-white border-border text-text-muted hover:border-slate-300 hover:bg-slate-50'
                    }`}
                >
                  <cat.icon size={18} />
                  <span className="text-[9px] font-bold uppercase tracking-tight">{cat.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest ml-1">Asset Preview</label>
          <div className="aspect-[4/3] bg-slate-100/50 border border-border rounded-[32px] flex items-center justify-center p-8 overflow-hidden shadow-inner">
            {formData.templatePath && formData.templatePath !== "" ? (
              <img src={formData.templatePath} alt={formData.model} className="max-h-full max-w-full object-contain drop-shadow-2xl transition-all duration-500" />
            ) : (
              <div className="text-text-muted text-[10px] font-bold uppercase tracking-widest">No Preview</div>
            )}
          </div>
          <div className="p-5 bg-accent/5 border border-accent/10 rounded-2xl flex items-start gap-4">
            <div className="p-2.5 bg-accent/10 text-accent rounded-xl">
              <Sparkles size={18} />
            </div>
            <div className="space-y-1">
              <p className="text-xs font-bold text-accent uppercase tracking-wider">Technical Specifications</p>
              <p className="text-[11px] font-medium text-text-muted leading-relaxed">
                Native Resolution: <span className="text-text-primary font-bold">{device.dimensions.width} &times; {device.dimensions.height} PX</span>.
                Contains <span className="text-text-primary font-bold">{device.zones.length} mapped zones</span> for skin customization.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="pt-8 flex gap-4 border-t border-border/50">
        <Button
          variant="secondary"
          onClick={onCancel}
          className="flex-1 py-4 rounded-2xl font-bold text-[10px] uppercase tracking-widest"
        >
          Discard Changes
        </Button>
        <Button
          onClick={handleSave}
          disabled={loading || !formData.brand || !formData.model}
          className="flex-[2] py-4 rounded-2xl gap-3 shadow-xl shadow-accent/20 font-bold text-[10px] uppercase tracking-widest bg-accent hover:bg-accent-hover text-white"
        >
          {loading ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              Syncing...
            </>
          ) : (
            <>
              <Save size={18} />
              Commit Global Update
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

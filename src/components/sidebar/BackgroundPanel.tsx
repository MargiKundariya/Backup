'use client';

import { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { useEditorStore } from '@/lib/store';
import { backgroundScenes } from '@/data/backgrounds';
import { Upload, Trash2, Image as ImageIcon } from 'lucide-react';

export function BackgroundPanel() {
  const backgroundScene          = useEditorStore((s) => s.backgroundScene);
  const setBackground            = useEditorStore((s) => s.setBackground);
  const customBackgroundImage    = useEditorStore((s) => s.customBackgroundImage);
  const setCustomBackgroundImage = useEditorStore((s) => s.setCustomBackgroundImage);

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (acceptedFiles.length === 0) return;
      const file = acceptedFiles[0];
      const reader = new FileReader();
      reader.onload = () => {
        setCustomBackgroundImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    },
    [setCustomBackgroundImage],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.png', '.jpg', '.jpeg', '.webp'] },
    multiple: false,
  });

  return (
    <div className="space-y-6">
      {/* ── Background presets ────────────────────────────────────────── */}
      <div className="space-y-3">
        <p className="text-[10px] font-black text-text-muted uppercase tracking-[0.25em] ml-1">Studio Scenes</p>
        <div className="grid grid-cols-3 gap-2">
          {backgroundScenes.map((scene) => (
            <button
              key={scene.id}
              onClick={() => setBackground(scene.id)}
              className={`relative aspect-[4/3] rounded-xl overflow-hidden border-2 transition-all duration-300 group ${
                backgroundScene === scene.id && !customBackgroundImage
                  ? 'border-accent shadow-xl shadow-accent/20 scale-[1.02]'
                  : 'border-border hover:border-accent/40'
              }`}
            >
              <div
                className="w-full h-full transition-transform duration-500 group-hover:scale-110"
                style={{
                  background:
                    scene.type === 'gradient'
                      ? scene.value
                      : scene.type === 'solid' && scene.value !== 'transparent'
                      ? scene.value
                      : undefined,
                }}
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors" />
              <span className="absolute bottom-0 left-0 right-0 text-center text-[9px] font-bold bg-black/40 backdrop-blur-[2px] text-white py-1 uppercase tracking-tighter">
                {scene.name}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Upload dropzone ───────────────────────────────────────────── */}
      <div className="space-y-3">
        <p className="text-[10px] font-black text-text-muted uppercase tracking-[0.25em] ml-1">Custom Backdrop</p>
        <div
          {...getRootProps()}
          className={`relative border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all duration-300 group ${
            isDragActive
              ? 'border-accent bg-accent/5 ring-4 ring-accent/10'
              : 'border-border bg-slate-50/50 hover:border-accent/40 hover:bg-slate-50'
          }`}
        >
          <input {...getInputProps()} />
          {customBackgroundImage ? (
            <div className="space-y-3">
              <div className="relative inline-block">
                <img
                  src={customBackgroundImage}
                  alt="Custom background preview"
                  className="max-h-24 mx-auto rounded-xl shadow-lg border border-white"
                />
                <div className="absolute inset-0 rounded-xl ring-1 ring-inset ring-black/10" />
              </div>
              <p className="text-[10px] font-bold text-accent uppercase tracking-widest">Image Uploaded</p>
            </div>
          ) : (
            <div className="space-y-2 py-2">
              <div className="w-10 h-10 bg-white rounded-xl shadow-sm border border-border flex items-center justify-center mx-auto text-text-muted group-hover:text-accent group-hover:scale-110 transition-all">
                <Upload size={20} />
              </div>
              <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest group-hover:text-text-primary transition-colors">
                {isDragActive ? 'Drop image here' : 'Drop PNG or JPG'}
              </p>
            </div>
          )}
        </div>

        {customBackgroundImage && (
          <button
            onClick={() => {
              setCustomBackgroundImage(null);
              setBackground('white');
            }}
            className="w-full flex items-center justify-center gap-2 py-3 text-[10px] font-bold text-red-500 hover:bg-red-50 rounded-xl border border-transparent hover:border-red-100 transition-all uppercase tracking-widest"
          >
            <Trash2 size={12} />
            Reset to Default
          </button>
        )}
      </div>

      {/* Helper Tip */}
      <div className="p-4 bg-slate-50 rounded-2xl border border-border/50 flex gap-3">
        <div className="w-8 h-8 rounded-lg bg-white shadow-sm flex items-center justify-center text-accent shrink-0">
          <ImageIcon size={16} />
        </div>
        <p className="text-[10px] font-medium text-text-muted leading-relaxed">
          Upload high-resolution landscape images for the best results. Backgrounds are automatically scaled to fit your canvas.
        </p>
      </div>
    </div>
  );
}
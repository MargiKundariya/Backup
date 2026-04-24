'use client';

import { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { useEditorStore } from '@/lib/store';
import { backgroundScenes } from '@/data/backgrounds';
import { Upload, Trash2 } from 'lucide-react';

const SIZE_OPTIONS: {
  value: 'autofit' | 'cover' | 'contain' | 'custom';
  label: string;
  description: string;
}[] = [
  { value: 'autofit', label: 'Auto Fit', description: 'Scales image to fill the canvas automatically' },
  { value: 'cover',   label: 'Cover',    description: 'Crops and fills the entire canvas' },
  { value: 'contain', label: 'Contain',  description: 'Fits the whole image inside the canvas' },
  { value: 'custom',  label: 'Custom',   description: 'Manually set the scale with the slider' },
];

export function BackgroundPanel() {
  const backgroundScene          = useEditorStore((s) => s.backgroundScene);
  const setBackground            = useEditorStore((s) => s.setBackground);
  const customBackgroundImage    = useEditorStore((s) => s.customBackgroundImage);
  const setCustomBackgroundImage = useEditorStore((s) => s.setCustomBackgroundImage);

  const backgroundSize  = useEditorStore((s) => s.backgroundSize);
  const setBackgroundSize = useEditorStore((s) => s.setBackgroundSize);
  const backgroundScale = useEditorStore((s) => s.backgroundScale);
  const setBackgroundScale = useEditorStore((s) => s.setBackgroundScale);

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (acceptedFiles.length === 0) return;
      const file = acceptedFiles[0];
      const reader = new FileReader();
      reader.onload = () => {
        setCustomBackgroundImage(reader.result as string);
        // Store resets backgroundSize to 'autofit' automatically on upload
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
    <div className="space-y-3">

      {/* ── Background presets ────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-1.5">
        {backgroundScenes.map((scene) => (
          <button
            key={scene.id}
            onClick={() => setBackground(scene.id)}
            className={`relative aspect-square rounded-xl overflow-hidden border-2 transition-all duration-200 ${
              backgroundScene === scene.id && !customBackgroundImage
                ? 'border-accent shadow-[0_0_0_2px_var(--accent-muted)]'
                : 'border-border hover:border-text-muted hover:shadow-sm'
            }`}
          >
            <div
              className="w-full h-full"
              style={{
                background:
                  scene.type === 'gradient'
                    ? scene.value
                    : scene.type === 'solid' && scene.value !== 'transparent'
                    ? scene.value
                    : undefined,
              }}
            />
            <span className="absolute bottom-0 left-0 right-0 text-center text-[9px] bg-black/50 text-white py-0.5">
              {scene.name}
            </span>
          </button>
        ))}
      </div>

      {/* ── Upload dropzone ───────────────────────────────────────────── */}
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-xl p-3 text-center cursor-pointer transition-colors duration-150 ${
          isDragActive
            ? 'border-accent bg-accent/5'
            : 'border-border hover:border-text-muted'
        }`}
      >
        <input {...getInputProps()} />
        {customBackgroundImage ? (
          <img
            src={customBackgroundImage}
            alt="Custom background preview"
            className="max-h-12 mx-auto rounded"
          />
        ) : (
          <>
            <Upload size={16} className="mx-auto mb-1 opacity-60" />
            <p className="text-xs opacity-60">
              {isDragActive ? 'Drop to upload' : 'Upload background'}
            </p>
          </>
        )}
      </div>

      {/* ── Remove custom image ───────────────────────────────────────── */}
      {customBackgroundImage && (
        <button
          onClick={() => {
            setCustomBackgroundImage(null);
            setBackground('white');
          }}
          className="w-full flex items-center justify-center gap-1 text-xs text-red-500 hover:text-red-600 transition-colors"
        >
          <Trash2 size={12} />
          Remove custom background
        </button>
      )}

      {/* ── Background Fit ────────────────────────────────────────────── */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium">Background Fit</p>
          {/* Live badge showing the active mode */}
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-accent/10 text-accent font-medium capitalize">
            {SIZE_OPTIONS.find((o) => o.value === backgroundSize)?.label ?? backgroundSize}
          </span>
        </div>

        {/* Mode buttons */}
        <div className="grid grid-cols-2 gap-1.5">
          {SIZE_OPTIONS.map(({ value, label, description }) => (
            <button
              key={value}
              onClick={() => setBackgroundSize(value)}
              title={description}
              className={`px-2 py-1.5 text-xs rounded-lg border transition-all duration-150 text-left leading-tight ${
                backgroundSize === value
                  ? 'border-accent bg-accent text-white shadow-sm'
                  : 'border-border bg-muted hover:border-text-muted'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Custom scale slider — only shown when 'custom' is active */}
        {backgroundSize === 'custom' && (
          <div className="space-y-1 pt-1">
            <div className="flex items-center justify-between text-[10px] opacity-60">
              <span>Scale</span>
              <span>{backgroundScale}%</span>
            </div>
            <input
              type="range"
              min={50}
              max={200}
              step={1}
              value={backgroundScale}
              onChange={(e) => setBackgroundScale(Number(e.target.value))}
              className="w-full accent-[var(--accent)]"
            />
            <div className="flex justify-between text-[9px] opacity-40">
              <span>50%</span>
              <span>100%</span>
              <span>200%</span>
            </div>
          </div>
        )}

        {/* Helper hint for the active non-custom modes */}
        {backgroundSize !== 'custom' && (
          <p className="text-[10px] opacity-40 leading-snug">
            {SIZE_OPTIONS.find((o) => o.value === backgroundSize)?.description}
          </p>
        )}
      </div>
    </div>
  );
}
'use client';

import { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Info, X } from 'lucide-react';

type ToastType = 'success' | 'error' | 'info';

interface ToastMessage {
  id: number;
  message: string;
  type: ToastType;
  createdAt: number;
  duration: number;
}

type Listener = (toasts: ToastMessage[]) => void;

let toasts: ToastMessage[] = [];
let nextId = 0;
const listeners = new Set<Listener>();

function notify() {
  for (const fn of listeners) fn([...toasts]);
}

function dismiss(id: number) {
  toasts = toasts.filter((t) => t.id !== id);
  notify();
}

export function toast(message: string, type: ToastType = 'info', duration = 3500) {
  const id = nextId++;
  // Keep max 3 visible
  if (toasts.length >= 3) toasts = toasts.slice(-2);
  toasts = [...toasts, { id, message, type, createdAt: Date.now(), duration }];
  notify();
  setTimeout(() => dismiss(id), duration);
}

const icons: Record<ToastType, React.ElementType> = {
  success: CheckCircle,
  error: XCircle,
  info: Info,
};

const styles: Record<ToastType, { bg: string; icon: string; bar: string }> = {
  success: { bg: 'bg-white/95 border-green-500/30', icon: 'text-green-500', bar: 'bg-green-500' },
  error: { bg: 'bg-white/95 border-red-500/30', icon: 'text-red-500', bar: 'bg-red-500' },
  info: { bg: 'bg-white/95 border-accent/30', icon: 'text-accent', bar: 'bg-accent' },
};

function ToastItem({ t }: { t: ToastMessage }) {
  const [progress, setProgress] = useState(100);
  const Icon = icons[t.type];
  const s = styles[t.type];

  useEffect(() => {
    const start = t.createdAt;
    const end = start + t.duration;
    const tick = () => {
      const now = Date.now();
      const remaining = Math.max(0, (end - now) / t.duration * 100);
      setProgress(remaining);
      if (remaining > 0) requestAnimationFrame(tick);
    };
    const raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [t.createdAt, t.duration]);

  return (
    <div className={`relative overflow-hidden backdrop-blur-xl shadow-lg shadow-black/8 rounded-xl border ${s.bg} max-w-xs animate-[toast-enter_0.25s_ease-out]`}>
      <div className="flex items-start gap-2.5 px-3.5 py-2.5">
        <Icon size={16} className={`${s.icon} flex-shrink-0 mt-0.5`} />
        <p className="text-[12px] text-text-primary font-medium flex-1 leading-relaxed">{t.message}</p>
        <button
          onClick={() => dismiss(t.id)}
          className="text-text-muted hover:text-text-secondary transition-colors flex-shrink-0 mt-0.5"
        >
          <X size={12} />
        </button>
      </div>
      {/* Progress bar */}
      <div className="h-[2px] w-full bg-black/5">
        <div className={`h-full ${s.bar} transition-none`} style={{ width: `${progress}%` }} />
      </div>
    </div>
  );
}

export function ToastContainer() {
  const [items, setItems] = useState<ToastMessage[]>([]);

  useEffect(() => {
    listeners.add(setItems);
    return () => { listeners.delete(setItems); };
  }, []);

  if (items.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      {items.map((t) => (
        <ToastItem key={t.id} t={t} />
      ))}
    </div>
  );
}

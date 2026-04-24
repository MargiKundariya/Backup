'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signInWithEmail } from '@/hooks/useAuth';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { user } = await signInWithEmail(email, password);
      if (user.role === 'super_admin') {
        window.location.href = '/admin';
      } else {
        window.location.href = '/dashboard';
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-canvas-bg overflow-hidden relative">
      {/* Decorative background elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-accent/5 rounded-full blur-[120px]" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-accent/5 rounded-full blur-[120px]" />

      <div className="w-full max-w-sm relative z-10 px-6">
        {/* Logo / title */}
        <div className="text-center mb-10">
          <div className="w-14 h-14 bg-accent rounded-[22px] mx-auto mb-5 flex items-center justify-center shadow-2xl shadow-accent/20">
            <svg viewBox="0 0 24 24" className="w-7 h-7 text-white fill-current">
              <path d="M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2zm0 2c4.41 0 8 3.59 8 8s-3.59 8-8 8-8-3.59-8-8 3.59-8 8-8z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-text-primary tracking-tight">SkinMockup</h1>
          <p className="text-sm text-text-muted mt-2 font-medium">The Ultimate Device Mockup Software</p>
        </div>

        {/* Card */}
        <div className="glass-elevated rounded-[40px] p-10 shadow-2xl border border-white/20">
          <div className="mb-8">
            <h2 className="text-xl font-bold text-text-primary tracking-tight">Welcome Back</h2>
            <p className="text-xs text-text-muted mt-1.5 font-medium">Please enter your credentials to continue</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label htmlFor="email" className="block text-[10px] font-bold text-text-muted uppercase tracking-[0.2em] ml-1">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@company.com"
                className="w-full px-5 py-4 text-sm rounded-2xl border border-border bg-white/60 focus:outline-none focus:ring-4 focus:ring-accent/10 focus:border-accent transition-all font-medium placeholder:text-text-muted/40"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="password" className="block text-[10px] font-bold text-text-muted uppercase tracking-[0.2em] ml-1">
                Security Password
              </label>
              <input
                id="password"
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-5 py-4 text-sm rounded-2xl border border-border bg-white/60 focus:outline-none focus:ring-4 focus:ring-accent/10 focus:border-accent transition-all font-medium"
              />
            </div>

            {error && (
              <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                <p className="text-xs text-red-600 bg-red-50/80 rounded-xl px-4 py-3 border border-red-100/50 font-medium">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4.5 bg-accent text-white text-xs font-bold uppercase tracking-[0.2em] rounded-2xl hover:bg-accent-hover shadow-xl shadow-accent/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-[0.98] mt-2 flex items-center justify-center gap-3"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Authenticating...
                </>
              ) : (
                'Sign In To Account'
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-[11px] text-text-muted mt-10 font-medium tracking-wide">
          &copy; 2026 SkinMockup Studio &bull; Precision Designing
        </p>
      </div>
    </div>
  );
}

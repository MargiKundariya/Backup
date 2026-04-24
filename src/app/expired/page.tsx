'use client';

import { useAuth, signOut } from '@/hooks/useAuth';
import { LogOut, AlertOctagon } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function ExpiredPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await signOut();
    } catch (err) {
      console.error(err);
    } finally {
      window.location.href = '/login';
    }
  };

  return (
    <div className="min-h-screen bg-canvas-bg flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-xl border border-border p-8 text-center space-y-6">
        <div className="w-20 h-20 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
          <AlertOctagon size={40} />
        </div>
        
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-text-primary">License Expired</h1>
          <p className="text-sm text-text-secondary leading-relaxed">
            Your software license has expired and you no longer have access to the designer workspace. 
            Please contact the administrator to renew your license or extend your access.
          </p>
        </div>

        {user && (
          <div className="p-4 bg-slate-50 border border-border rounded-xl mt-4">
            <p className="text-xs font-bold text-text-muted uppercase tracking-wider mb-1">Logged in as</p>
            <p className="text-sm font-semibold text-text-primary">{user.email}</p>
          </div>
        )}

        <div className="pt-4">
          <button
            disabled={loggingOut}
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-accent text-white font-bold rounded-xl hover:bg-accent-hover transition-colors shadow-sm disabled:opacity-50"
          >
            <LogOut size={18} />
            {loggingOut ? 'Logging out...' : 'Sign Out'}
          </button>
        </div>
      </div>
    </div>
  );
}

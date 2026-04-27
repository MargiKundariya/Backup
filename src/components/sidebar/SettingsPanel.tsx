'use client';

import { useState } from 'react';
import { toast } from '@/components/ui/Toast';
import { KeyRound, Loader2, CheckCircle2 } from 'lucide-react';

export function SettingsPanel() {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (newPassword.length < 6) {
      toast('Password must be at least 6 characters', 'error');
      return;
    }

    if (newPassword !== confirmPassword) {
      toast('Passwords do not match', 'error');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/user/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPassword }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to update password');
      }
      
      toast('Password updated successfully!', 'success');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      console.error('Password change failed:', err);
      toast(err.message || 'Failed to update password', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 py-2">
      <div className="flex flex-col items-center justify-center gap-3 mb-2">
        <div className="w-12 h-12 bg-accent/10 rounded-2xl flex items-center justify-center text-accent">
          <KeyRound size={24} />
        </div>
        <p className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em]">Update Password</p>
      </div>

      <form onSubmit={handlePasswordChange} className="space-y-3">
        <div className="space-y-1.5">
          <label className="text-[10px] font-medium text-text-secondary px-1">New Password</label>
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="••••••••"
            className="w-full px-3 py-2 text-[11px] rounded-xl bg-surface border border-border focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-all"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] font-medium text-text-secondary px-1">Confirm Password</label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="••••••••"
            className="w-full px-3 py-2 text-[11px] rounded-xl bg-surface border border-border focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-all"
          />
        </div>

        <button
          type="submit"
          disabled={loading || !newPassword || !confirmPassword}
          className="w-full flex items-center justify-center gap-2 py-2 text-[11px] font-bold bg-accent text-white rounded-xl hover:bg-accent-hover disabled:opacity-50 transition-all shadow-lg shadow-accent/20"
        >
          {loading ? (
            <Loader2 size={13} className="animate-spin" />
          ) : (
            <>
              <CheckCircle2 size={13} />
              Update Password
            </>
          )}
        </button>
      </form>

      <p className="text-[9px] text-text-muted px-1 italic">
        * After changing your password, you will remain logged in on this device.
      </p>
    </div>
  );
}

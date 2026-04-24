'use client';

import { useState, useEffect } from 'react';
import { UserWithLicense } from '@/lib/db';
import {
  Calendar, CheckCircle, AlertCircle, User, Mail, ShieldCheck,
  Key, Clock, X, Loader2, Plus, ArrowRight, Shield
} from 'lucide-react';
import { Button } from '@/components/ui/Button';

export function LicenseManagement() {
  const [users, setUsers] = useState<UserWithLicense[]>([]);
  const [loading, setLoading] = useState(true);

  // Extend License State
  const [extendingLicense, setExtendingLicense] = useState<UserWithLicense | null>(null);
  const [newExpiryDate, setNewExpiryDate] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  async function fetchUsers() {
    try {
      const res = await fetch('/api/admin/licenses');
      const data = await res.json();
      if (data.users) setUsers(data.users);
    } catch (err) {
      console.error('Failed to fetch user license status', err);
    } finally {
      setLoading(false);
    }
  }

  const extendBy = (months: number) => {
    if (!extendingLicense) return;
    const current = new Date(extendingLicense.computed_expiry);
    const now = new Date();
    // If already expired, start from now. Otherwise, start from current expiry.
    const baseDate = current < now ? now : current;
    const nextDate = new Date(baseDate);
    nextDate.setMonth(nextDate.getMonth() + months);
    setNewExpiryDate(nextDate.toISOString().split('T')[0]);
  };

  async function handleExtendLicense(e: React.FormEvent) {
    e.preventDefault();
    if (!extendingLicense || !newExpiryDate || !extendingLicense.license_id) return;

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch('/api/admin/licenses', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: extendingLicense.license_id,
          expires_at: new Date(newExpiryDate).toISOString(),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to update license expiry');
      }

      await fetchUsers();
      setExtendingLicense(null);
      setNewExpiryDate('');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  const isExpired = (expiry: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expiryDate = new Date(expiry);
    expiryDate.setHours(0, 0, 0, 0);
    return today > expiryDate;
  };

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header Section */}
      <div className="px-2">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2.5 bg-amber-50 text-amber-600 rounded-2xl shadow-sm">
            <Shield size={20} />
          </div>
          <h2 className="text-2xl font-bold text-text-primary tracking-tight">License Authority</h2>
        </div>
        <p className="text-xs text-text-muted font-medium max-w-xl leading-relaxed">
          Monitor and extend global user entitlements. Manage the 365-day access windows for all organizational accounts.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 pb-20">
        {loading ? (
          [...Array(3)].map((_, i) => (
            <div key={i} className="h-40 bg-white border border-border rounded-[32px] animate-pulse" />
          ))
        ) : users.length === 0 ? (
          <div className="bg-white border border-dashed border-border rounded-[40px] p-24 text-center group">
            <div className="w-20 h-20 bg-slate-50 rounded-[30px] flex items-center justify-center mx-auto mb-6 group-hover:rotate-12 transition-transform duration-500">
              <Key size={20} className="text-text-muted opacity-20" />
            </div>
            <p className="text-lg font-bold text-text-primary">No licenses found</p>
            <p className="text-sm text-text-muted mt-2">Active licenses will appear here as users are onboarded.</p>
          </div>
        ) : (
          users.map((u) => {
            const expired = isExpired(u.computed_expiry);
            return (
              <div
                key={u.id}
                className={`bg-white border rounded-[32px] p-8 transition-all duration-300 shadow-sm hover:shadow-xl hover:shadow-accent/5 group ${expired ? 'border-red-100' : 'border-border'
                  }`}
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8">
                  <div className="flex items-center gap-6">
                    <div className={`w-16 h-16 rounded-[24px] flex items-center justify-center shrink-0 shadow-sm ${expired ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'
                      }`}>
                      {expired ? <AlertCircle size={20} /> : <ShieldCheck size={20} />}
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-center gap-3">
                        <h4 className="text-base font-bold text-text-primary">{u.full_name || 'Legacy User'}</h4>
                        <span className={`px-3 py-1 text-[10px] uppercase font-bold tracking-wider rounded-full border shadow-sm ${expired ? 'bg-red-50 text-red-700 border-red-100' : 'bg-green-50 text-green-700 border-green-100'
                          }`}>
                          {expired ? 'License Expired' : 'Active Account'}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-xs font-medium text-text-muted">
                        <span className="flex items-center gap-1.5">
                          <Mail size={14} className="opacity-50" />
                          {u.email}
                        </span>
                        <span className="w-1 h-1 rounded-full bg-border" />
                        <span className="flex items-center gap-1.5 font-mono text-[11px] tracking-tighter bg-slate-50 px-2 py-0.5 rounded-lg border border-border/50">
                          <Key size={12} className="opacity-50" />
                          {u.license_key || 'SYSTEM_MANAGED'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row items-center gap-10">
                    <div className="grid grid-cols-2 gap-10">
                      <div className="space-y-1 text-center sm:text-left">
                        <p className="text-[10px] font-bold text-text-muted uppercase tracking-[0.2em]">Registered</p>
                        <p className="text-[12px] font-bold text-text-primary flex items-center justify-center sm:justify-start gap-2">
                          <Calendar size={14} className="text-text-muted" />
                          {new Date(u.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </p>
                      </div>
                      <div className="space-y-1 text-center sm:text-left">
                        <p className="text-[10px] font-bold text-text-muted uppercase tracking-[0.2em]">Termination</p>
                        <p className={`text-[12px] font-bold flex items-center justify-center sm:justify-start gap-2 ${expired ? 'text-red-600' : 'text-text-primary'}`}>
                          <Clock size={14} className="text-text-muted" />
                          {new Date(u.computed_expiry).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </p>
                      </div>
                    </div>

                    <Button
                      onClick={() => {
                        setExtendingLicense(u);
                        setNewExpiryDate(new Date(u.computed_expiry).toISOString().split('T')[0]);
                      }}
                      className="w-full sm:w-auto h-11 px-6 rounded-2xl bg-text-primary hover:bg-black text-white transition-all font-bold text-[11px] uppercase tracking-widest flex items-center justify-center gap-3 group/btn shadow-xl shadow-black/5 active:scale-95 border-0"
                    >
                      Manage Expiry
                      <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform opacity-70" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Extend License Modal */}
      {extendingLicense && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-text-primary/60 backdrop-blur-xl animate-in fade-in duration-500">
          <div className="bg-white rounded-[48px] shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-500 my-auto border border-white/20">
            <div className="px-10 py-8 border-b border-border/50 flex items-center justify-between bg-slate-50/50 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full -mr-16 -mt-16 blur-2xl" />
              <div className="relative z-10 flex items-center gap-3">
                <div className="p-2 bg-amber-500 text-white rounded-xl shadow-lg shadow-amber-500/20">
                  <Clock size={20} />
                </div>
                <h3 className="text-2xl font-bold text-text-primary tracking-tight">Adjust Expiration</h3>
              </div>
              <button
                onClick={() => setExtendingLicense(null)}
                className="relative z-10 p-3 hover:bg-slate-200 rounded-2xl transition-all duration-300 text-text-muted"
              >
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleExtendLicense} className="p-10 space-y-8">
              <div className="p-6 bg-slate-50 rounded-3xl border border-border/60 relative overflow-hidden">
                <div className="relative z-10">
                  <p className="text-[10px] text-text-muted uppercase font-bold tracking-[0.2em] mb-1">Target Account</p>
                  <p className="text-base font-bold text-text-primary">{extendingLicense.full_name || extendingLicense.email}</p>
                  <p className="text-xs text-text-muted mt-2 flex items-center gap-2">
                    <Shield size={12} className="opacity-50" />
                    Current Termination: {new Date(extendingLicense.computed_expiry).toLocaleDateString()}
                  </p>
                </div>
              </div>

              {error && (
                <div className="p-4 bg-red-50 text-red-600 text-sm font-bold rounded-2xl border border-red-100 flex items-center gap-3">
                  <AlertCircle size={18} />
                  {error}
                </div>
              )}

              <div className="space-y-4">
                <p className="text-[10px] font-bold text-text-muted uppercase tracking-[0.2em] ml-2">Quick Extension</p>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: '+1 Month', value: 1 },
                    { label: '+3 Months', value: 3 },
                    { label: '+6 Months', value: 6 },
                    { label: '+1 Year', value: 12 },
                  ].map((option) => (
                    <button
                      key={option.label}
                      type="button"
                      onClick={() => extendBy(option.value)}
                      className="px-4 py-4 text-xs font-bold border border-border bg-white text-text-primary rounded-[20px] hover:border-accent hover:text-accent transition-all flex items-center justify-center gap-2 active:scale-95"
                    >
                      <Plus size={14} />
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3 pt-2">
                <label className="text-[10px] font-bold text-text-muted uppercase tracking-[0.2em] ml-2">Manual Override</label>
                <input
                  required
                  type="date"
                  value={newExpiryDate}
                  min={new Date().toISOString().split('T')[0]}
                  onChange={(e) => setNewExpiryDate(e.target.value)}
                  className="w-full px-6 py-4 bg-slate-50 border border-border rounded-[20px] focus:ring-4 focus:ring-accent/10 focus:border-accent outline-none transition-all font-bold text-sm"
                />
              </div>

              <div className="pt-6 flex gap-4">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setExtendingLicense(null)}
                  className="flex-1 rounded-[20px] py-6 font-bold uppercase tracking-widest text-[11px] h-auto"
                >
                  Discard
                </Button>
                <Button
                  disabled={submitting}
                  type="submit"
                  className="flex-1 rounded-[20px] py-6 gap-3 text-[11px] font-bold uppercase tracking-widest h-auto bg-text-primary hover:bg-black text-white shadow-xl shadow-black/10"
                >
                  {submitting ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Saving...
                    </>
                  ) : 'Confirm Extension'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

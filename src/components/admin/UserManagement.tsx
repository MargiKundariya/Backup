'use client';

import { useState, useEffect } from 'react';
import { User } from '@/lib/db';
import {
  Users, Shield, UserCircle, Search, Plus, X, Loader2,
  CheckCircle2, Key, Filter, MoreHorizontal, Mail,
  Building2, Phone, MapPin, Globe, Sparkles, Edit2, Trash2
} from 'lucide-react';
import { Button } from '@/components/ui/Button';

export function UserManagement() {
  const [users, setUsers] = useState<(User & { expired?: boolean })[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Modal States
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingUser, setEditingUser] = useState<(User & { expired?: boolean }) | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    full_name: '',
    company_name: '',
    phone_number: '',
    address: '',
    logo: ''
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  async function fetchUsers() {
    try {
      const res = await fetch('/api/admin/users');
      const data = await res.json();
      if (data.users) setUsers(data.users);
    } catch (err) {
      console.error('Failed to fetch users', err);
    } finally {
      setLoading(false);
    }
  }

  // Pre-fill form when editing
  useEffect(() => {
    if (editingUser) {
      setFormData({
        email: editingUser.email,
        password: '', // Don't show password
        full_name: editingUser.full_name || '',
        company_name: editingUser.company_name || '',
        phone_number: editingUser.phone_number || '',
        address: editingUser.address || '',
        logo: editingUser.logo_url || ''
      });
    } else {
      setFormData({ email: '', password: '', full_name: '', company_name: '', phone_number: '', address: '', logo: '' });
    }
  }, [editingUser]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccess(null);

    const action = editingUser ? 'update' : 'create';
    const url = '/api/admin/users';

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          id: editingUser?.id,
          action
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || `Failed to ${action} user`);
      }

      setSuccess(editingUser ? 'User updated successfully' : `User created successfully with key: ${data.license.key}`);
      fetchUsers();

      // Close modal after delay
      setTimeout(() => {
        setShowAddModal(false);
        setEditingUser(null);
        setSuccess(null);
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeleteUser(id: string) {
    if (!window.confirm('Are you sure you want to delete this user? This will also revoke their license.')) return;

    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', id }),
      });

      if (res.ok) {
        fetchUsers();
      }
    } catch (err) {
      console.error('Failed to delete user', err);
    }
  }

  const filteredUsers = users.filter(u =>
    u.email.toLowerCase().includes(search.toLowerCase()) ||
    (u.full_name?.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header Section */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8 px-2">
        <div className="space-y-2">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2.5 bg-accent/10 text-accent rounded-2xl shadow-sm">
              <Users size={20} />
            </div>
            <h2 className="text-2xl font-bold text-text-primary tracking-tight">User Directory</h2>
          </div>
          <p className="text-xs text-text-muted font-medium max-w-xl leading-relaxed">
            Manage global access, platform administrators, and user licenses with high-fidelity control.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-4">
          <div className="relative group w-full sm:w-80">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted group-focus-within:text-accent transition-colors" size={20} />
            <input
              type="text"
              placeholder="Filter by name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-12 pr-6 py-4 text-sm bg-white border border-border rounded-[24px] focus:ring-2 focus:ring-accent/20 focus:border-accent outline-none shadow-sm transition-all font-medium"
            />
          </div>
          <Button
            onClick={() => setShowAddModal(true)}
            className="w-full sm:w-auto rounded-[24px] gap-3 h-[56px] px-8 bg-text-primary hover:bg-black text-white font-bold uppercase tracking-widest text-xs shadow-xl shadow-black/10 transition-all active:scale-95"
          >
            <Plus size={20} />
            Add New User
          </Button>
        </div>
      </div>

      {/* Main Table Container */}
      <div className="bg-white border border-border rounded-[40px] overflow-hidden shadow-sm relative group/table transition-all hover:shadow-xl hover:shadow-accent/5">
        <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-purple-500 via-accent to-blue-500 opacity-0 group-hover/table:opacity-100 transition-opacity duration-1000" />

        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-border/50">
                <th className="pl-8 py-5 text-[10px] font-bold text-text-muted uppercase tracking-[0.2em]">User Profile</th>
                <th className="px-4 py-5 text-[10px] font-bold text-text-muted uppercase tracking-[0.2em]">Organization</th>
                <th className="px-4 py-5 text-[10px] font-bold text-text-muted uppercase tracking-[0.2em]">Access Level</th>
                <th className="px-4 py-5 text-[10px] font-bold text-text-muted uppercase tracking-[0.2em]">Joined</th>
                <th className="px-4 py-5 text-[10px] font-bold text-text-muted uppercase tracking-[0.2em]">Status</th>
                <th className="pr-8 py-5 text-[10px] font-bold text-text-muted uppercase tracking-[0.2em] text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30">
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={6} className="px-10 py-8">
                      <div className="flex items-center gap-5">
                        <div className="w-14 h-14 bg-slate-100 rounded-2xl" />
                        <div className="space-y-3">
                          <div className="w-48 h-5 bg-slate-100 rounded-lg" />
                          <div className="w-32 h-3 bg-slate-50 rounded-lg" />
                        </div>
                      </div>
                    </td>
                  </tr>
                ))
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-10 py-32 text-center">
                    <div className="max-w-xs mx-auto space-y-5">
                      <div className="w-24 h-24 bg-slate-50 rounded-[32px] flex items-center justify-center mx-auto border border-dashed border-border group-hover/table:rotate-12 transition-transform duration-500">
                        <Users size={40} className="text-text-muted opacity-20" />
                      </div>
                      <div>
                        <p className="text-lg font-bold text-text-primary">No accounts found</p>
                        <p className="text-sm text-text-muted mt-2 leading-relaxed">We couldn't find any users matching your current criteria.</p>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-50/80 transition-all duration-300 group/row">
                    <td className="pl-8 py-4">
                      <div className="flex items-center gap-4">
                        <div className="w-9 h-9 bg-white border border-border rounded-xl flex items-center justify-center text-slate-400 overflow-hidden shrink-0 shadow-sm transition-all duration-500">
                          {user.logo_url || user.avatar_url ? (
                            <img src={user.logo_url || user.avatar_url || ''} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <UserCircle size={18} />
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="font-bold text-text-primary text-sm truncate">{user.full_name || 'Individual User'}</div>
                          <div className="text-[10px] text-text-muted font-bold truncate opacity-70">{user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="space-y-0.5">
                        <div className="text-xs font-bold text-text-primary truncate max-w-[140px]">
                          {user.company_name || 'Individual'}
                        </div>
                        <div className="text-[10px] text-text-muted font-bold opacity-60">
                          {user.phone_number || 'No Phone'}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[9px] font-bold uppercase tracking-wider border ${user.role === 'super_admin'
                        ? 'bg-purple-50 text-purple-700 border-purple-100'
                        : 'bg-blue-50 text-blue-700 border-blue-100'
                        }`}>
                        {user.role === 'super_admin' ? <Shield size={12} /> : <UserCircle size={12} />}
                        {user.role === 'super_admin' ? 'Super Admin' : 'Active User'}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="text-[11px] font-bold text-text-secondary whitespace-nowrap">
                        {new Date(user.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      {user.expired && user.role !== 'super_admin' ? (
                        <span className="inline-flex items-center gap-1.5 text-red-600 text-[9px] font-bold uppercase tracking-wider bg-red-50 px-3 py-1.5 rounded-full border border-red-100">
                          <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
                          Inactive
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-green-600 text-[9px] font-bold uppercase tracking-wider bg-green-50 px-3 py-1.5 rounded-full border border-green-100">
                          <div className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                          Active
                        </span>
                      )}
                    </td>
                    <td className="pr-8 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setEditingUser(user)}
                          className="p-2 text-text-muted hover:text-accent hover:bg-accent/5 rounded-xl transition-all"
                          title="Edit User"
                        >
                          <Edit2 size={18} />
                        </button>
                        <button
                          onClick={() => handleDeleteUser(user.id)}
                          className="p-2 text-text-muted hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                          title="Delete User"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit User Modal */}
      {(showAddModal || editingUser) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-text-primary/60 backdrop-blur-xl overflow-y-auto animate-in fade-in duration-500">
          <div className="bg-white rounded-[48px] shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-500 my-auto border border-white/20">
            <div className="px-12 py-10 border-b border-border/50 flex items-center justify-between bg-slate-50/50 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-accent/5 rounded-full -mr-16 -mt-16 blur-2xl" />
              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-accent text-white rounded-xl shadow-lg shadow-accent/20">
                    <Sparkles size={20} />
                  </div>
                  <h3 className="text-3xl font-bold text-text-primary tracking-tight">
                    {editingUser ? 'Update User Account' : 'Onboard New User'}
                  </h3>
                </div>
                <p className="text-sm text-text-muted font-medium">
                  {editingUser ? 'Modify account details and organizational settings.' : 'Provision high-fidelity access for new users.'}
                </p>
              </div>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setEditingUser(null);
                }}
                className="relative z-10 p-4 hover:bg-slate-200 rounded-3xl transition-all duration-300 text-text-muted hover:rotate-90"
              >
                <X size={28} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="px-12 py-10">
              <div className="space-y-8">
                {error && (
                  <div className="p-5 bg-red-50 text-red-600 text-sm font-bold rounded-3xl border border-red-100 flex items-center gap-4 animate-in slide-in-from-top-4 duration-500">
                    <X size={20} className="shrink-0 p-1 bg-red-600 text-white rounded-full" />
                    {error}
                  </div>
                )}
                {success && (
                  <div className="p-5 bg-green-50 text-green-700 text-sm font-bold rounded-3xl border border-green-100 flex items-start gap-4 animate-in slide-in-from-top-4 duration-500">
                    <CheckCircle2 size={20} className="mt-0.5 shrink-0 text-green-600" />
                    {success}
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-8">
                  <div className="space-y-3">
                    <label className="text-[10px] font-bold text-text-muted uppercase tracking-[0.3em] ml-2">Full Name</label>
                    <input
                      required
                      type="text"
                      placeholder="e.g. Johnathan Doe"
                      value={formData.full_name}
                      onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                      className="w-full px-6 py-4 bg-slate-50 border border-border rounded-[20px] focus:ring-4 focus:ring-accent/10 focus:border-accent outline-none transition-all font-bold text-sm placeholder:text-slate-300"
                    />
                  </div>

                  <div className="space-y-3">
                    <label className="text-[10px] font-bold text-text-muted uppercase tracking-[0.3em] ml-2">Email Address</label>
                    <input
                      required
                      type="email"
                      placeholder="user@domain.com"
                      disabled={!!editingUser}
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-6 py-4 bg-slate-50 border border-border rounded-[20px] focus:ring-4 focus:ring-accent/10 focus:border-accent outline-none transition-all font-bold text-sm placeholder:text-slate-300 disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                  </div>

                  <div className="space-y-3">
                    <label className="text-[10px] font-bold text-text-muted uppercase tracking-[0.3em] ml-2">Organization</label>
                    <input
                      type="text"
                      placeholder="Company Name"
                      value={formData.company_name}
                      onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                      className="w-full px-6 py-4 bg-slate-50 border border-border rounded-[20px] focus:ring-4 focus:ring-accent/10 focus:border-accent outline-none transition-all font-bold text-sm placeholder:text-slate-300"
                    />
                  </div>

                  <div className="space-y-3">
                    <label className="text-[10px] font-bold text-text-muted uppercase tracking-[0.3em] ml-2">Phone Number</label>
                    <input
                      type="text"
                      placeholder="+1 000 000 000"
                      value={formData.phone_number}
                      onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                      className="w-full px-6 py-4 bg-slate-50 border border-border rounded-[20px] focus:ring-4 focus:ring-accent/10 focus:border-accent outline-none transition-all font-bold text-sm placeholder:text-slate-300"
                    />
                  </div>

                  <div className="space-y-3 md:col-span-2">
                    <label className="text-[10px] font-bold text-text-muted uppercase tracking-[0.3em] ml-2">Physical Location</label>
                    <div className="relative group">
                      <MapPin className="absolute left-5 top-1/2 -translate-y-1/2 text-text-muted group-focus-within:text-accent transition-colors" size={18} />
                      <input
                        type="text"
                        placeholder="HQ Address, City, Region"
                        value={formData.address}
                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                        className="w-full pl-14 pr-6 py-4 bg-slate-50 border border-border rounded-[20px] focus:ring-4 focus:ring-accent/10 focus:border-accent outline-none transition-all font-bold text-sm placeholder:text-slate-300"
                      />
                    </div>
                  </div>

                  {!editingUser && (
                    <div className="space-y-3 md:col-span-2">
                      <label className="text-[10px] font-bold text-text-muted uppercase tracking-[0.3em] ml-2">Initial Password</label>
                      <input
                        required
                        type="password"
                        placeholder="Minimum 8 characters"
                        minLength={8}
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        className="w-full px-6 py-4 bg-slate-50 border border-border rounded-[20px] focus:ring-4 focus:ring-accent/10 focus:border-accent outline-none transition-all font-bold text-sm placeholder:text-slate-300"
                      />
                      <div className="flex items-center gap-3 mt-3 ml-2">
                        <div className="p-1.5 bg-accent/10 text-accent rounded-lg">
                          <Key size={14} />
                        </div>
                        <p className="text-[11px] text-text-muted font-bold italic tracking-tight">
                          Platform will automatically provision a <span className="text-accent underline decoration-accent/30 decoration-2">365-day license</span> upon creation.
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="pt-10 flex flex-col sm:flex-row gap-4">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => {
                      setShowAddModal(false);
                      setEditingUser(null);
                    }}
                    className="flex-1 rounded-[24px] py-6 font-bold uppercase tracking-widest text-[11px] h-auto transition-all active:scale-95 border-border/60"
                  >
                    Discard Changes
                  </Button>
                  <Button
                    disabled={submitting || !!success}
                    type="submit"
                    className="flex-1 rounded-[24px] py-6 gap-4 text-xs font-bold uppercase tracking-widest h-auto bg-accent hover:bg-accent-hover text-white shadow-xl shadow-accent/20 transition-all active:scale-95"
                  >
                    {submitting ? (
                      <>
                        <Loader2 size={20} className="animate-spin" />
                        Saving Changes...
                      </>
                    ) : (
                      <>
                        <Shield size={20} />
                        {editingUser ? 'Save Account Details' : 'Establish User Seat'}
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

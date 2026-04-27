'use client';

import { useState, useEffect } from 'react';
import {
  Users, Smartphone, Package, CheckCircle2, AlertCircle,
  TrendingUp, Calendar, ArrowUpRight, ArrowDownRight,
  Activity, Zap, BarChart3, Clock, Loader2
} from 'lucide-react';

import { Modal } from '@/components/ui/Modal';

interface StatsSummary {
  total_users: number;
  total_designs: number;
  total_devices: number;
  pending_approvals: number;
  active_licenses: number;
}

interface ActivityPoint {
  date: string;
  count: number;
}

interface DetailedStats {
  expiringThisWeek: any[];
  expiringThisMonth: any[];
  newThisWeek: any[];
  newThisMonth: any[];
}

export function AdminInsights() {
  const [summary, setSummary] = useState<StatsSummary | null>(null);
  const [detailedStats, setDetailedStats] = useState<DetailedStats | null>(null);
  const [activity, setActivity] = useState<ActivityPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeListId, setActiveListId] = useState<keyof DetailedStats | null>(null);

  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await fetch('/api/admin/stats');
        if (res.ok) {
          const data = await res.json();
          setSummary(data.summary);
          setActivity(data.activity);
          setDetailedStats(data.detailedStats);
        }
      } catch (err) {
        console.error('Failed to fetch admin stats:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <Loader2 size={32} className="text-accent animate-spin" />
        <p className="text-[10px] font-black text-text-muted uppercase tracking-widest">Compiling Analytics...</p>
      </div>
    );
  }

  const statCards = [
    { label: 'Platform Users', value: summary?.total_users ?? 0, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50', trend: '+12%' },
    { label: 'Active Licenses', value: summary?.active_licenses ?? 0, icon: Zap, color: 'text-yellow-600', bg: 'bg-yellow-50', trend: '+5%' },
    { label: 'Global Catalog', value: summary?.total_devices ?? 0, icon: Smartphone, color: 'text-purple-600', bg: 'bg-purple-50', trend: 'Steady' },
    { label: 'Pending Approvals', value: summary?.pending_approvals ?? 0, icon: AlertCircle, color: 'text-rose-600', bg: 'bg-rose-50', trend: 'Action Needed' },
  ];

  const licenseActivityCards = [
    { id: 'expiringThisMonth', label: 'Expiring This Month', value: detailedStats?.expiringThisMonth.length ?? 0, icon: Calendar, color: 'text-orange-600', bg: 'bg-orange-50' },
    { id: 'expiringThisWeek', label: 'Expiring This Week', value: detailedStats?.expiringThisWeek.length ?? 0, icon: Clock, color: 'text-red-600', bg: 'bg-red-50' },
    { id: 'newThisMonth', label: 'New Users This Month', value: detailedStats?.newThisMonth.length ?? 0, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
    { id: 'newThisWeek', label: 'New Users This Week', value: detailedStats?.newThisWeek.length ?? 0, icon: Zap, color: 'text-green-600', bg: 'bg-green-50' },
  ];

  const getListTitle = (id: string | null) => {
    switch (id) {
      case 'expiringThisMonth': return 'Licenses Expiring This Month';
      case 'expiringThisWeek': return 'Licenses Expiring This Week';
      case 'newThisMonth': return 'New Users This Month';
      case 'newThisWeek': return 'New Users This Week';
      default: return 'User Details';
    }
  };

  const activeUsers = activeListId ? (detailedStats?.[activeListId] || []) : [];

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-8 duration-700">

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, i) => (
          <div key={i} className="bg-white rounded-[32px] p-6 border border-border/50 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group">
            <div className="flex justify-between items-start mb-6">
              <div className={`p-4 rounded-2xl ${stat.bg} ${stat.color} transition-transform group-hover:scale-110 duration-300`}>
                <stat.icon size={24} />
              </div>
              <div className="flex items-center gap-1 text-[10px] font-black text-green-500 bg-green-50 px-2 py-1 rounded-full">
                {stat.trend} <ArrowUpRight size={10} />
              </div>
            </div>
            <p className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] mb-1">{stat.label}</p>
            <h3 className="text-3xl font-black text-text-primary tracking-tighter">{stat.value.toLocaleString()}</h3>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* User Signups Velocity */}
        <div className="lg:col-span-2 bg-white rounded-[40px] p-8 border border-border/50 shadow-sm overflow-hidden relative">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-accent/10 text-accent rounded-xl">
                <BarChart3 size={20} />
              </div>
              <div>
                <h3 className="text-lg font-black text-text-primary tracking-tight">Platform Growth Velocity</h3>
                <p className="text-[10px] text-text-muted font-bold uppercase tracking-widest">User Signups Last 14 Days</p>
              </div>
            </div>
            <div className="flex gap-2">
              <span className="px-3 py-1 bg-slate-50 text-text-muted text-[9px] font-black rounded-full uppercase tracking-tighter border border-border">Daily</span>
            </div>
          </div>

          <div className="h-64 flex items-end gap-2 px-2">
            {activity.length > 0 ? (
              activity.map((point, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-2 group/bar">
                  <div className="w-full relative h-full flex items-end">
                    <div
                      className="w-full bg-accent/20 group-hover/bar:bg-accent rounded-t-lg transition-all duration-500"
                      style={{ height: `${Math.max(10, (point.count / Math.max(...activity.map(p => p.count), 1)) * 100)}%` }}
                    >
                      <div className="absolute -top-8 left-1/2 -translate-x-1/2 opacity-0 group-hover/bar:opacity-100 transition-all bg-text-primary text-white text-[9px] font-black px-2 py-1 rounded-md shadow-xl z-10">
                        {point.count}
                      </div>
                    </div>
                  </div>
                  <span className="text-[8px] font-black text-text-muted uppercase tracking-tighter opacity-40 group-hover/bar:opacity-100 transition-opacity">
                    {new Date(point.date).toLocaleDateString(undefined, { weekday: 'narrow' })}
                  </span>
                </div>
              ))
            ) : (
              <div className="w-full h-full flex items-center justify-center border-2 border-dashed border-slate-100 rounded-3xl">
                <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest opacity-30">No activity data available yet</p>
              </div>
            )}
          </div>
        </div>

        {/* License Activity Graph */}
        <div className="bg-white rounded-[40px] p-8 border border-border/50 shadow-sm overflow-hidden relative flex flex-col">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-yellow-50 text-yellow-600 rounded-xl">
                <Activity size={20} />
              </div>
              <div>
                <h3 className="text-lg font-black text-text-primary tracking-tight">License Activity</h3>
                <p className="text-[10px] text-text-muted font-bold uppercase tracking-widest">Distribution</p>
              </div>
            </div>
          </div>
          
          <div className="flex-1 space-y-4">
            {licenseActivityCards.map((stat, i) => (
              <div 
                key={i} 
                onClick={() => setActiveListId(stat.id as any)}
                className="bg-slate-50 rounded-2xl p-4 border border-border/50 hover:bg-white hover:border-accent/30 hover:shadow-md transition-all cursor-pointer flex items-center justify-between group"
              >
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-xl ${stat.bg} ${stat.color} flex items-center justify-center shrink-0`}>
                    <stat.icon size={16} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-text-primary group-hover:text-accent transition-colors">{stat.label}</p>
                    
                    {/* User Mini Previews */}
                    <div className="flex items-center mt-1 -space-x-2">
                      {(detailedStats?.[stat.id as keyof DetailedStats] || []).slice(0, 3).map((u: any, idx: number) => (
                        <div key={idx} className="w-5 h-5 rounded-md border-2 border-slate-50 overflow-hidden bg-white">
                          {u.logo_url || u.avatar_url ? (
                            <img src={u.logo_url || u.avatar_url} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full bg-accent/20 text-accent flex items-center justify-center text-[6px] font-black uppercase">
                              {(u.full_name || u.email).substring(0, 1)}
                            </div>
                          )}
                        </div>
                      ))}
                      {(detailedStats?.[stat.id as keyof DetailedStats] || []).length > 3 && (
                        <span className="pl-3 text-[8px] font-black text-text-muted">
                          +{(detailedStats?.[stat.id as keyof DetailedStats] || []).length - 3}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <h3 className="text-xl font-black text-text-primary">{stat.value}</h3>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* User Details Modal */}
      <Modal
        isOpen={!!activeListId}
        onClose={() => setActiveListId(null)}
        title={getListTitle(activeListId)}
        maxWidth="max-w-3xl"
      >
        <div className="p-6 max-h-[60vh] overflow-y-auto custom-scrollbar">
          {activeUsers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Users size={32} className="text-text-muted opacity-30 mb-4" />
              <p className="text-sm font-medium text-text-muted">No users found for this category.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {activeUsers.map((u: any) => (
                <div key={u.id} className="flex items-center justify-between p-4 bg-slate-50 border border-border/50 rounded-2xl hover:bg-white hover:border-border transition-all">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center overflow-hidden border border-border/50">
                      {u.logo_url || u.avatar_url ? (
                        <img 
                          src={u.logo_url || u.avatar_url} 
                          alt={u.full_name || 'User'} 
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-accent/10 text-accent flex items-center justify-center font-black uppercase text-xs">
                          {(u.full_name || u.email).substring(0, 2)}
                        </div>
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-text-primary tracking-tight">{u.full_name || 'Legacy Account'}</p>
                      <p className="text-[10px] font-medium text-text-muted">{u.email}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest mb-0.5">Joined</p>
                    <p className="text-xs font-semibold text-text-primary">{new Date(u.created_at).toLocaleDateString()}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Modal>

    </div>
  );
}

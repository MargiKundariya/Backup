'use client';

import {
  Users, Key, Smartphone, ShieldCheck, PieChart,
  ArrowUpRight, Clock, CheckCircle, Activity,
  Smartphone as DeviceIcon, Plus, Info, Layout
} from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface AdminOverviewProps {
  onAddUser: () => void;
  onAddDevice: () => void;
  onIssueKeys: () => void;
}

export function AdminOverview({ onAddUser, onAddDevice, onIssueKeys }: AdminOverviewProps) {
  const stats = [
    { label: 'Total Active Users', value: '1,284', change: '+12%', icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Licensed Devices', value: '4,892', change: '+5%', icon: Smartphone, color: 'text-purple-600', bg: 'bg-purple-50' },
    { label: 'Total Revenue', value: '$12,450', change: '+18%', icon: ShieldCheck, color: 'text-green-600', bg: 'bg-green-50' },
    { label: 'System Uptime', value: '99.9%', change: 'Stable', icon: Activity, color: 'text-amber-600', bg: 'bg-amber-50' },
  ];

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-8 duration-1000">
      {/* Top Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, i) => (
          <div key={i} className="bg-white p-6 rounded-[32px] border border-border shadow-sm hover:shadow-md transition-all group">
            <div className="flex items-center justify-between mb-4">
              <div className={`p-3 rounded-2xl ${stat.bg} ${stat.color} group-hover:scale-110 transition-transform`}>
                <stat.icon size={22} />
              </div>
              <span className={`text-[10px] font-bold px-2 py-1 rounded-lg ${stat.change.includes('+') ? 'bg-green-50 text-green-600' : 'bg-slate-50 text-slate-500'}`}>
                {stat.change}
              </span>
            </div>
            <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest mb-1">{stat.label}</p>
            <p className="text-2xl font-black text-text-primary tracking-tight">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Quick Actions Card */}
        <div className="space-y-6">
          <div className="bg-gradient-to-br from-accent to-indigo-600 rounded-[40px] p-8 text-white shadow-xl shadow-accent/20 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full -mr-24 -mt-24 blur-3xl group-hover:scale-150 transition-transform duration-1000" />
            <div className="relative z-10">
              <h3 className="text-xl font-bold mb-2 tracking-tight">Management Console</h3>
              <p className="text-white/70 text-xs mb-8 leading-relaxed font-medium">Streamlined administrative control over users, devices, and global assets.</p>
              
              <div className="space-y-3">
                <button 
                  onClick={onAddUser}
                  className="w-full py-4 px-6 bg-white/10 hover:bg-white text-white hover:text-accent rounded-2xl border border-white/20 hover:border-transparent transition-all flex items-center gap-4 text-xs font-black uppercase tracking-widest backdrop-blur-sm active:scale-[0.98]"
                >
                  <Users size={18} />
                  Provision New Account
                </button>
                <button 
                  onClick={onAddDevice}
                  className="w-full py-4 px-6 bg-white/10 hover:bg-white text-white hover:text-accent rounded-2xl border border-white/20 hover:border-transparent transition-all flex items-center gap-4 text-xs font-black uppercase tracking-widest backdrop-blur-sm active:scale-[0.98]"
                >
                  <DeviceIcon size={18} />
                  Onboard Global Device
                </button>
                <button 
                  onClick={onIssueKeys}
                  className="w-full py-4 px-6 bg-white/10 hover:bg-white text-white hover:text-accent rounded-2xl border border-white/20 hover:border-transparent transition-all flex items-center gap-4 text-xs font-black uppercase tracking-widest backdrop-blur-sm active:scale-[0.98]"
                >
                  <Key size={18} />
                  Issue Enterprise Keys
                </button>
              </div>
            </div>
          </div>

          <div className="bg-white border border-border rounded-[32px] p-8 shadow-sm space-y-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
                <Info size={18} />
              </div>
              <h4 className="text-xs font-black text-text-primary uppercase tracking-widest">Platform Notice</h4>
            </div>
            <p className="text-[11px] text-text-muted leading-relaxed font-medium">
              The platform is currently operating in <span className="text-green-600 font-bold uppercase">Optimal State</span>. 
              No critical updates or maintenance windows are scheduled for the next 48 hours.
            </p>
          </div>
        </div>

        {/* Activity Feed / System Logs Placeholder */}
        <div className="lg:col-span-2 bg-white border border-border rounded-[40px] p-10 shadow-sm space-y-8 relative overflow-hidden group/card">
          <div className="absolute top-0 right-0 p-8 opacity-5 group-hover/card:opacity-10 transition-opacity">
            <Layout size={120} className="text-accent" />
          </div>

          <div className="flex items-center justify-between relative z-10">
            <div>
              <h3 className="text-xl font-bold text-text-primary tracking-tight">Recent System Pulse</h3>
              <p className="text-xs text-text-muted font-medium mt-1">Real-time overview of platform interactions.</p>
            </div>
            <button className="p-3 bg-slate-50 text-text-muted hover:text-accent rounded-2xl transition-all">
              <ArrowUpRight size={20} />
            </button>
          </div>

          <div className="space-y-6 relative z-10">
            {[
              { type: 'user', msg: 'New user registration from Mumbai, India', time: '2 mins ago', icon: Users, color: 'text-blue-500', bg: 'bg-blue-50' },
              { type: 'device', msg: 'Global template "iPhone 15 Pro" updated by System', time: '14 mins ago', icon: Smartphone, color: 'text-purple-500', bg: 'bg-purple-50' },
              { type: 'license', msg: 'Bulk license pack (20 seats) issued to PixelStudio', time: '1 hour ago', icon: Key, color: 'text-green-500', bg: 'bg-green-50' },
              { type: 'security', msg: 'Admin login detected from recognized IP address', time: '3 hours ago', icon: ShieldCheck, color: 'text-amber-500', bg: 'bg-amber-50' },
            ].map((item, i) => (
              <div key={i} className="flex items-center justify-between group/item p-2 hover:bg-slate-50 rounded-2xl transition-all">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-xl ${item.bg} ${item.color} flex items-center justify-center group-hover/item:scale-110 transition-transform`}>
                    <item.icon size={20} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-text-primary tracking-tight">{item.msg}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Clock size={10} className="text-text-muted" />
                      <span className="text-[10px] text-text-muted font-medium uppercase tracking-tighter">{item.time}</span>
                    </div>
                  </div>
                </div>
                <div className="w-2 h-2 rounded-full bg-slate-200 group-hover/item:bg-accent transition-colors" />
              </div>
            ))}
          </div>
          
          <Button variant="secondary" className="w-full rounded-[24px] py-4 font-black uppercase tracking-widest text-[10px] gap-2">
            View Full System Logs
            <ArrowUpRight size={14} />
          </Button>
        </div>
      </div>
    </div>
  );
}

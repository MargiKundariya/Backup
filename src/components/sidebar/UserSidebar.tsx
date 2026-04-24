'use client';

import { usePathname, useRouter } from 'next/navigation';
import { 
  Layout, 
  Smartphone, 
  Package, 
  Coins, 
  Settings, 
  LogOut, 
  ShieldCheck,
  ChevronRight,
  PieChart,
  User,
  ExternalLink
} from 'lucide-react';
import { useAuth, signOut } from '@/hooks/useAuth';
import { useCredits } from '@/hooks/useCredits';

export function UserSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuth();
  const { balance } = useCredits();

  const handleLogout = async () => {
    try {
      await signOut();
      router.push('/login');
    } catch (err) {
      console.error('Logout failed', err);
    }
  };

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: PieChart, path: '/dashboard', description: 'Overview & Activity' },
    { id: 'library', label: 'My Library', icon: Package, path: '/projects', description: 'Saved Designs' },
    { id: 'credits', label: 'Billing', icon: Coins, path: '/credits', description: 'Tokens & Plans' },
  ];

  return (
    <aside className="w-[280px] flex-shrink-0 glass-sidebar flex flex-col h-full transition-all duration-300 border-r border-border/50">
      {/* Sidebar Header */}
      <div className="p-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-accent rounded-xl flex items-center justify-center shadow-lg shadow-accent/30">
            <Layout size={22} className="text-white" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-text-primary uppercase tracking-tight">SkinMockup</h1>
            <p className="text-[10px] text-accent font-bold uppercase tracking-widest leading-none">Studio v2.4</p>
          </div>
        </div>
      </div>

      <div className="glass-separator px-4" />

      {/* Navigation Section */}
      <div className="flex-1 overflow-y-auto px-3 py-6 space-y-2">
        <p className="px-4 text-[10px] font-bold text-text-muted uppercase tracking-[0.25em] mb-4">Main Menu</p>

        {menuItems.map((item) => {
          const isActive = pathname === item.path;
          return (
            <button
              key={item.id}
              onClick={() => router.push(item.path)}
              className={`
                w-full group flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all duration-300
                ${isActive
                  ? 'bg-accent text-white shadow-xl shadow-accent/20'
                  : 'text-text-secondary hover:bg-white hover:shadow-md'
                }
              `}
            >
              <item.icon size={20} className={`${isActive ? 'text-white' : 'text-text-muted group-hover:text-accent'} transition-colors`} />
              <div className="text-left flex-1">
                <p className="text-sm font-bold tracking-tight leading-none">{item.label}</p>
                <p className={`text-[9px] mt-1 font-semibold ${isActive ? 'text-white/70' : 'text-text-muted'}`}>{item.description}</p>
              </div>
              {isActive && <ChevronRight size={14} className="text-white/50" />}
            </button>
          );
        })}

        <div className="pt-8 space-y-2">
          <p className="px-4 text-[10px] font-bold text-text-muted uppercase tracking-[0.25em] mb-4">Support</p>
          <button className="w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl text-text-secondary hover:bg-white hover:shadow-md transition-all">
            <Settings size={20} className="text-text-muted" />
            <span className="text-sm font-bold tracking-tight">Settings</span>
          </button>
        </div>
      </div>

      {/* Sidebar Footer */}
      <div className="p-4 space-y-4">
        <div className="glass-separator" />

        <div className="px-2 space-y-1">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2 text-text-muted hover:text-red-500 transition-all text-xs font-semibold"
          >
            <LogOut size={14} />
            Sign Out
          </button>
        </div>

        {/* User Badge */}
        <div className="bg-white/50 border border-border/50 rounded-2xl p-4 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-accent">
            <User size={18} />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-bold text-text-primary truncate uppercase tracking-tighter">{user?.email || 'Guest User'}</p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <Coins size={10} className="text-accent" />
              <p className="text-[8px] font-bold text-accent uppercase">{balance} Credits</p>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}

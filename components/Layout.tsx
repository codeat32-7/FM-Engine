
import React from 'react';
import {
  LayoutDashboard,
  Wrench,
  MapPin,
  Package,
  Settings,
  Wifi,
  WifiOff,
  Users,
  UserCheck,
  LogOut
} from 'lucide-react';
import { TabConfig } from '../types';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  onTabChange: (tab: string) => void;
  onLogout: () => void;
  dbStatus: 'connecting' | 'connected' | 'error';
  tabConfigs: TabConfig[];
  orgName?: string;
}

const iconMap = {
  LayoutDashboard,
  Wrench,
  MapPin,
  Package,
  Users,
  UserCheck
};

const Layout: React.FC<LayoutProps> = ({ children, activeTab, onTabChange, onLogout, dbStatus, tabConfigs, orgName }) => {
  const visibleTabs = tabConfigs.filter(t => t.isVisible);

  return (
    <div className="flex flex-col min-h-screen bg-fm-canvas text-fm-ink md:flex-row">
      <aside className="hidden md:flex flex-col fixed inset-y-0 left-0 w-[260px] bg-fm-navy text-slate-200 z-30 border-r border-slate-800/80">
        <div className="p-6 border-b border-slate-800/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-fm-accent flex items-center justify-center shadow-lg shadow-fm-accent/25">
              <span className="text-white font-bold text-lg">F</span>
            </div>
            <div>
              <h1 className="text-sm font-bold tracking-tight text-white leading-tight">FM Engine</h1>
              <p className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">Work orders</p>
            </div>
          </div>
          <div className="mt-5 p-3 rounded-xl bg-slate-800/60 border border-slate-700/50">
            <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-0.5">Organization</p>
            <p className="text-sm font-semibold text-white truncate">{orgName || '—'}</p>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {visibleTabs.map((tab) => {
            const Icon = iconMap[tab.iconName] || LayoutDashboard;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onTabChange(tab.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-fm-accent/15 text-fm-accent border border-fm-accent/25'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/80'
                }`}
              >
                <Icon size={18} className={isActive ? 'text-fm-accent' : 'text-slate-500'} />
                <span className="truncate">{tab.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="p-3 border-t border-slate-800/80 space-y-1">
          <div className="flex items-center gap-2 px-3 py-2">
            <span
              className={`w-2 h-2 rounded-full shrink-0 ${
                dbStatus === 'connected' ? 'bg-fm-success' : dbStatus === 'error' ? 'bg-red-500' : 'bg-fm-warning animate-pulse'
              }`}
            />
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              {dbStatus === 'connected' ? 'Live sync' : dbStatus === 'error' ? 'Disconnected' : 'Connecting'}
            </span>
          </div>
          <button
            type="button"
            onClick={() => onTabChange('settings')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'settings' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:bg-slate-800/80 hover:text-white'
            }`}
          >
            <Settings size={18} />
            Settings
          </button>
          <button
            type="button"
            onClick={onLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-red-400 hover:bg-red-950/40 transition-colors"
          >
            <LogOut size={18} />
            Log out
          </button>
        </div>
      </aside>

      <div className="flex-1 md:pl-[260px] flex flex-col min-h-screen">
        <header className="md:hidden flex items-center justify-between px-4 py-3 bg-fm-surface border-b border-fm-border sticky top-0 z-20 shadow-sm">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-fm-accent flex items-center justify-center shrink-0">
              <span className="text-white font-bold text-sm">F</span>
            </div>
            <div className="min-w-0">
              <h1 className="text-sm font-bold text-fm-ink leading-none truncate">FM Engine</h1>
              <p className="text-[10px] font-medium text-fm-muted truncate">{orgName}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <div
              className={`p-2 rounded-lg ${dbStatus === 'connected' ? 'bg-emerald-50 text-fm-success' : 'bg-red-50 text-red-600'}`}
            >
              {dbStatus === 'connected' ? <Wifi size={18} /> : <WifiOff size={18} />}
            </div>
            <button type="button" onClick={onLogout} className="p-2 text-fm-muted hover:text-red-600 rounded-lg" aria-label="Log out">
              <LogOut size={18} />
            </button>
          </div>
        </header>

        <main className="flex-1 p-4 md:p-8 max-w-7xl mx-auto w-full pb-28 md:pb-10">{children}</main>
      </div>

      <nav className="md:hidden fixed bottom-0 inset-x-0 bg-fm-surface border-t border-fm-border flex justify-around px-1 pt-1 pb-[max(0.5rem,env(safe-area-inset-bottom))] z-40 shadow-[0_-4px_24px_rgba(12,18,34,0.08)]">
        {visibleTabs.map((tab) => {
          const Icon = iconMap[tab.iconName] || LayoutDashboard;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onTabChange(tab.id)}
              className={`flex flex-col items-center gap-0.5 py-2 px-1 flex-1 min-w-0 rounded-lg transition-colors ${
                isActive ? 'text-fm-accent' : 'text-fm-muted'
              }`}
            >
              <Icon size={20} />
              <span className="text-[9px] font-semibold uppercase tracking-wide truncate w-full text-center">{tab.label.split(' ')[0]}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
};

export default Layout;

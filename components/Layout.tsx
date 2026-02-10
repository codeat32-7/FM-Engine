
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
  Building,
  UserCheck
} from 'lucide-react';
import { TabConfig } from '../types';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  onTabChange: (tab: string) => void;
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

const Layout: React.FC<LayoutProps> = ({ children, activeTab, onTabChange, dbStatus, tabConfigs, orgName }) => {
  const visibleTabs = tabConfigs.filter(t => t.isVisible);

  return (
    <div className="flex flex-col min-h-screen bg-[#F8FAFC] text-slate-900 md:flex-row">
      <aside className="hidden md:flex flex-col fixed inset-y-0 left-0 w-64 bg-white border-r border-slate-200 shadow-sm z-30">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">F</span>
            </div>
            <h1 className="text-xl font-bold tracking-tight text-slate-800">FM Engine</h1>
          </div>
          
          <div className="mt-4 p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center gap-3">
             <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm text-slate-400 border border-slate-200">
               <Building size={20} />
             </div>
             <div className="flex-1 min-w-0">
               <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Organization</p>
               <p className="text-xs font-black text-slate-800 truncate">{orgName || 'Setup Pending'}</p>
             </div>
          </div>
        </div>
        
        <nav className="flex-1 px-4 space-y-1 mt-4">
          {visibleTabs.map((tab) => {
            // Fix: Fallback to LayoutDashboard if icon is not found to prevent React Error #130
            const Icon = iconMap[tab.iconName] || LayoutDashboard;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all text-sm font-medium ${
                  isActive 
                    ? 'bg-blue-50 text-blue-700 border border-blue-100 shadow-sm' 
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                }`}
              >
                <Icon size={18} className={isActive ? 'text-blue-600' : 'text-slate-400'} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-100">
          <div className="flex items-center gap-2 px-4 mb-4">
            <div className={`w-2 h-2 rounded-full ${
              dbStatus === 'connected' ? 'bg-emerald-500' : 
              dbStatus === 'error' ? 'bg-red-500' : 'bg-amber-400 animate-pulse'
            }`} />
            <span className={`text-[10px] font-bold uppercase tracking-wider ${
              dbStatus === 'connected' ? 'text-emerald-600' : 'text-red-600'
            }`}>
              {dbStatus === 'connected' ? 'Systems Live' : 'Reconnecting...'}
            </span>
          </div>
          <button 
             onClick={() => onTabChange('settings')}
             className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
               activeTab === 'settings' ? 'bg-slate-100 text-slate-900' : 'text-slate-500 hover:bg-slate-50'
             }`}
           >
            <Settings size={18} />
            <span>Settings</span>
          </button>
        </div>
      </aside>

      <div className="flex-1 md:pl-64 flex flex-col min-h-screen">
        <header className="md:hidden flex items-center justify-between p-4 bg-white border-b border-slate-200 sticky top-0 z-20">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-slate-900 rounded flex items-center justify-center">
              <span className="text-white font-bold text-sm">F</span>
            </div>
            <div className="flex flex-col">
              <h1 className="text-sm font-black text-slate-800 leading-none">FM Engine</h1>
              <p className="text-[10px] font-bold text-slate-400 uppercase truncate max-w-[120px]">{orgName}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
             <div className={`p-1.5 rounded-full ${dbStatus === 'connected' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                {dbStatus === 'connected' ? <Wifi size={16} /> : <WifiOff size={16} />}
             </div>
          </div>
        </header>

        <main className="flex-1 p-4 md:p-8 max-w-7xl mx-auto w-full pb-24 md:pb-10">
          {children}
        </main>
      </div>

      <nav className="md:hidden fixed bottom-0 inset-x-0 bg-white border-t border-slate-200 flex justify-around p-2 pb-safe z-40 shadow-2xl shadow-black">
        {visibleTabs.map((tab) => {
          const Icon = iconMap[tab.iconName] || LayoutDashboard;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`flex flex-col items-center gap-1 p-2 transition-all flex-1 ${
                isActive ? 'text-blue-600' : 'text-slate-400'
              }`}
            >
              <Icon size={20} />
              <span className="text-[9px] font-bold uppercase tracking-wider">{tab.label.split(' ')[0]}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
};

export default Layout;

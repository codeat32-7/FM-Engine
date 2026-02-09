
import React from 'react';
import { 
  LayoutDashboard, 
  Wrench, 
  MapPin, 
  Package, 
  Settings,
  Wifi,
  WifiOff
} from 'lucide-react';
import { TabConfig } from '../types';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  onTabChange: (tab: string) => void;
  dbStatus: 'connecting' | 'connected' | 'error';
  tabConfigs: TabConfig[];
}

const iconMap = {
  LayoutDashboard,
  Wrench,
  MapPin,
  Package
};

const Layout: React.FC<LayoutProps> = ({ children, activeTab, onTabChange, dbStatus, tabConfigs }) => {
  const visibleTabs = tabConfigs.filter(t => t.isVisible);

  return (
    <div className="flex flex-col min-h-screen bg-[#F8FAFC] text-slate-900 md:flex-row">
      <aside className="hidden md:flex flex-col fixed inset-y-0 left-0 w-64 bg-white border-r border-slate-200 shadow-sm z-30">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-8 h-8 bg-[#2563EB] rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">F</span>
            </div>
            <h1 className="text-xl font-bold tracking-tight text-slate-800">FM-Engine</h1>
          </div>
          <div className="flex items-center gap-2 px-1">
            <div className={`w-2 h-2 rounded-full ${
              dbStatus === 'connected' ? 'bg-emerald-500' : 
              dbStatus === 'error' ? 'bg-red-500' : 'bg-amber-400 animate-pulse'
            }`} />
            <span className={`text-[10px] font-bold uppercase tracking-wider ${
              dbStatus === 'connected' ? 'text-emerald-600' : 
              dbStatus === 'error' ? 'text-red-600' : 'text-amber-600'
            }`}>
              {dbStatus === 'connected' ? 'Connected' : 
               dbStatus === 'error' ? 'Error' : 'Connecting...'}
            </span>
          </div>
        </div>
        
        <nav className="flex-1 px-4 space-y-1 mt-4">
          {visibleTabs.map((tab) => {
            const Icon = iconMap[tab.iconName];
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all text-sm font-medium ${
                  isActive 
                    ? 'bg-blue-50 text-blue-700 border border-blue-100' 
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
            <div className="w-7 h-7 bg-blue-600 rounded flex items-center justify-center">
              <span className="text-white font-bold text-sm">F</span>
            </div>
            <h1 className="text-lg font-bold text-slate-800">FM-Engine</h1>
          </div>
          <div className="flex items-center gap-3">
             <div className={`p-1.5 rounded-full ${dbStatus === 'connected' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                {dbStatus === 'connected' ? <Wifi size={16} /> : <WifiOff size={16} />}
             </div>
          </div>
        </header>

        <main className="flex-1 p-4 md:p-10 max-w-7xl mx-auto w-full pb-24 md:pb-10">
          {children}
        </main>
      </div>

      <nav className="md:hidden fixed bottom-0 inset-x-0 bg-white border-t border-slate-200 flex justify-around p-2 pb-safe z-40">
        {visibleTabs.map((tab) => {
          const Icon = iconMap[tab.iconName];
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
              <span className="text-[10px] font-semibold uppercase tracking-wider">{tab.label.split(' ')[0]}</span>
            </button>
          );
        })}
        <button
          onClick={() => onTabChange('settings')}
          className={`flex flex-col items-center gap-1 p-2 transition-all flex-1 ${
            activeTab === 'settings' ? 'text-blue-600' : 'text-slate-400'
          }`}
        >
          <Settings size={20} />
          <span className="text-[10px] font-semibold uppercase tracking-wider">Settings</span>
        </button>
      </nav>
    </div>
  );
};

export default Layout;

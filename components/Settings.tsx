
import React from 'react';
import { TabConfig } from '../types';
import { ChevronUp, ChevronDown, Eye, EyeOff, LogOut, LayoutGrid } from 'lucide-react';

interface SettingsProps {
  configs: TabConfig[];
  setConfigs: (configs: TabConfig[]) => void;
  onLogout: () => void;
}

const Settings: React.FC<SettingsProps> = ({ configs, setConfigs, onLogout }) => {
  const moveTab = (index: number, direction: 'up' | 'down') => {
    const newConfigs = [...configs];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newConfigs.length) return;
    [newConfigs[index], newConfigs[targetIndex]] = [newConfigs[targetIndex], newConfigs[index]];
    setConfigs(newConfigs);
  };

  const toggleVisibility = (index: number) => {
    const newConfigs = [...configs];
    newConfigs[index].isVisible = !newConfigs[index].isVisible;
    setConfigs(newConfigs);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-10 animate-in fade-in duration-500 pb-24">
      <div>
        <h2 className="text-3xl font-black text-slate-900">Settings</h2>
        <p className="text-slate-500 font-medium">Personalize your facility manager workspace.</p>
      </div>

      <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-8 border-b border-slate-50 flex items-center gap-3">
          <LayoutGrid className="text-blue-600" size={24} />
          <h3 className="text-xl font-black text-slate-900">Navigation Tabs</h3>
        </div>
        <div className="divide-y divide-slate-50">
          {configs.map((tab, idx) => (
            <div key={tab.id} className="p-6 flex items-center justify-between hover:bg-slate-50 transition-all">
              <div className="flex items-center gap-4">
                <div className={`p-2.5 rounded-xl ${tab.isVisible ? 'bg-blue-50 text-blue-600' : 'bg-slate-100 text-slate-400'}`}>
                   <span className="font-bold text-xs uppercase tracking-tighter">{tab.label.slice(0, 2)}</span>
                </div>
                <div>
                   <p className={`font-black ${tab.isVisible ? 'text-slate-900' : 'text-slate-400'}`}>{tab.label}</p>
                   <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{tab.id}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                 <div className="flex flex-col gap-1 mr-4">
                    <button onClick={() => moveTab(idx, 'up')} className="p-1.5 hover:bg-white rounded-lg border border-slate-100 text-slate-400 hover:text-blue-600 transition-all"><ChevronUp size={16} /></button>
                    <button onClick={() => moveTab(idx, 'down')} className="p-1.5 hover:bg-white rounded-lg border border-slate-100 text-slate-400 hover:text-blue-600 transition-all"><ChevronDown size={16} /></button>
                 </div>
                 <button 
                  onClick={() => toggleVisibility(idx)}
                  className={`p-3 rounded-2xl transition-all ${tab.isVisible ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}
                 >
                   {tab.isVisible ? <Eye size={20} /> : <EyeOff size={20} />}
                 </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-red-50 rounded-[32px] p-8 border border-red-100 flex items-center justify-between">
         <div>
            <h4 className="text-red-900 font-black text-xl">Sign Out</h4>
            <p className="text-red-600 font-medium text-sm">Clear session and logout from this device.</p>
         </div>
         <button onClick={onLogout} className="bg-red-600 text-white px-8 py-4 rounded-2xl font-black flex items-center gap-3 shadow-lg shadow-red-200 active:scale-95 transition-all">
            <LogOut size={20} /> Logout
         </button>
      </div>
    </div>
  );
};

export default Settings;

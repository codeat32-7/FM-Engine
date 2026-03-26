
import React from 'react';
import { TabConfig } from '../types';
import { ChevronUp, ChevronDown, Eye, EyeOff, LogOut, LayoutGrid } from 'lucide-react';
import TwilioLive from './TwilioLive';

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
    <div className="max-w-3xl mx-auto space-y-10 fm-animate-in pb-24">
      <div>
        <p className="text-xs font-semibold text-fm-accent uppercase tracking-wider">Workspace</p>
        <h2 className="text-2xl font-bold text-fm-ink mt-1">Settings</h2>
        <p className="text-fm-muted text-sm mt-1">Navigation order, visibility, and integrations.</p>
      </div>

      <div className="bg-fm-surface rounded-xl border border-fm-border shadow-fm overflow-hidden">
        <div className="p-6 border-b border-fm-border flex items-center gap-3">
          <LayoutGrid className="text-fm-accent" size={22} />
          <h3 className="text-lg font-bold text-fm-ink">Sidebar tabs</h3>
        </div>
        <div className="divide-y divide-fm-border">
          {configs.map((tab, idx) => (
            <div key={tab.id} className="p-4 flex items-center justify-between gap-3 hover:bg-fm-canvas/50 transition-colors">
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className={`p-2 rounded-lg shrink-0 ${tab.isVisible ? 'bg-fm-accentsoft text-fm-accent' : 'bg-fm-canvas text-fm-muted'}`}
                >
                  <span className="font-bold text-[10px] uppercase">{tab.label.slice(0, 2)}</span>
                </div>
                <div className="min-w-0">
                  <p className={`font-semibold truncate ${tab.isVisible ? 'text-fm-ink' : 'text-fm-muted'}`}>{tab.label}</p>
                  <p className="text-[10px] font-medium text-fm-muted uppercase tracking-wider">{tab.id}</p>
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <div className="flex flex-col gap-0.5 mr-2">
                  <button
                    type="button"
                    onClick={() => moveTab(idx, 'up')}
                    className="p-1 rounded-md border border-fm-border text-fm-muted hover:text-fm-accent hover:border-fm-accent/30"
                    aria-label="Move up"
                  >
                    <ChevronUp size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => moveTab(idx, 'down')}
                    className="p-1 rounded-md border border-fm-border text-fm-muted hover:text-fm-accent hover:border-fm-accent/30"
                    aria-label="Move down"
                  >
                    <ChevronDown size={14} />
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => toggleVisibility(idx)}
                  className={`p-2.5 rounded-xl transition-colors ${tab.isVisible ? 'bg-teal-50 text-teal-700' : 'bg-red-50 text-red-700'}`}
                  aria-label={tab.isVisible ? 'Hide tab' : 'Show tab'}
                >
                  {tab.isVisible ? <Eye size={18} /> : <EyeOff size={18} />}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <TwilioLive />

      <div className="bg-red-50 rounded-xl p-6 border border-red-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h4 className="text-red-900 font-bold">Sign out</h4>
          <p className="text-red-700/90 text-sm mt-0.5">End session on this device.</p>
        </div>
        <button
          type="button"
          onClick={onLogout}
          className="bg-red-600 text-white px-6 py-3 rounded-xl font-semibold inline-flex items-center justify-center gap-2 shadow-sm hover:bg-red-700 transition-colors shrink-0"
        >
          <LogOut size={18} /> Log out
        </button>
      </div>
    </div>
  );
};

export default Settings;

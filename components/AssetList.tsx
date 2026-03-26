
import React, { useMemo, useState } from 'react';
import { Asset, Site, Block, Status } from '../types';
import { Plus, Search, Package, MapPin, Layers, Trash2 } from 'lucide-react';

interface AssetListProps {
  assets: Asset[];
  sites: Site[];
  blocks?: Block[];
  onAdd: () => void;
  onDelete: (id: string) => void;
}

const AssetList: React.FC<AssetListProps> = ({ assets, sites, blocks = [], onAdd, onDelete }) => {
  const [q, setQ] = useState('');
  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return assets;
    return assets.filter(
      a => a.name.toLowerCase().includes(s) || (a.code || '').toLowerCase().includes(s) || (a.type || '').toLowerCase().includes(s)
    );
  }, [assets, q]);

  return (
    <div className="space-y-6 fm-animate-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <p className="text-xs font-semibold text-fm-accent uppercase tracking-wider">Register</p>
          <h2 className="text-2xl font-bold text-fm-ink mt-1">Assets</h2>
          <p className="text-fm-muted text-sm mt-1">Equipment linked to sites for work order routing.</p>
        </div>
        <button
          type="button"
          onClick={onAdd}
          className="bg-blue-600 text-white px-5 py-3 rounded-xl font-semibold text-sm flex items-center gap-2 shadow-fm hover:bg-blue-700 shrink-0"
        >
          <Plus size={18} /> Add asset
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-fm-muted" size={18} />
        <input
          type="search"
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder="Search by name, code, or type…"
          className="w-full bg-fm-surface border border-fm-border rounded-xl py-3.5 pl-12 pr-4 outline-none focus:border-fm-accent focus:ring-2 focus:ring-fm-accent/15 text-sm text-fm-ink shadow-sm"
        />
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 pb-20">
        {filtered.map(asset => (
          <div
            key={asset.id}
            className="bg-fm-surface p-6 rounded-xl border border-fm-border shadow-fm hover:border-fm-accent/25 transition-colors group relative"
          >
            <button
              type="button"
              onClick={() => onDelete(asset.id)}
              className="absolute top-4 right-4 p-2 text-fm-muted hover:text-red-600 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
              aria-label="Delete asset"
            >
              <Trash2 size={18} />
            </button>
            <div className="flex justify-between items-start mb-4">
              <div className="w-12 h-12 bg-fm-canvas rounded-xl flex items-center justify-center text-fm-muted group-hover:bg-blue-50 group-hover:text-blue-700 transition-colors">
                <Package size={24} />
              </div>
              <span
                className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold uppercase tracking-wide ${
                  asset.status === Status.ACTIVE ? 'bg-teal-50 text-teal-800' : 'bg-slate-100 text-slate-600'
                }`}
              >
                {asset.status}
              </span>
            </div>
            <h3 className="text-lg font-bold text-fm-ink">{asset.name}</h3>
            <p className="font-mono text-[11px] text-fm-muted mt-0.5">{asset.code}</p>
            <div className="space-y-2 mt-4 pt-4 border-t border-fm-border text-sm text-fm-muted">
              <div className="flex items-center gap-2">
                <MapPin size={14} className="shrink-0" />
                <span className="font-medium text-fm-ink">{sites.find(s => s.id === asset.site_id)?.name || '—'}</span>
              </div>
              {asset.block_id && (
                <div className="flex items-center gap-2">
                  <Layers size={14} className="shrink-0" />
                  <span>{blocks.find(b => b.id === asset.block_id)?.name || 'Space'}</span>
                </div>
              )}
            </div>
          </div>
        ))}

        {filtered.length === 0 && (
          <div className="col-span-full py-16 text-center bg-fm-surface rounded-xl border border-dashed border-fm-border">
            <Package className="w-10 h-10 text-fm-border mx-auto mb-3" />
            <p className="text-fm-muted font-medium text-sm">No assets match your search.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AssetList;

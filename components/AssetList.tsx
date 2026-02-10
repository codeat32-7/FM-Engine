
import React from 'react';
import { Asset, Site, Block, Status } from '../types';
import { Plus, Search, Package, MapPin, Layers } from 'lucide-react';

interface AssetListProps {
  assets: Asset[];
  sites: Site[];
  blocks: Block[];
  onAdd: () => void;
}

const AssetList: React.FC<AssetListProps> = ({ assets, sites, blocks, onAdd }) => {
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-black text-slate-900">Assets</h2>
          <p className="text-slate-500 font-medium text-sm">Equipment and facility infrastructure</p>
        </div>
        <button onClick={onAdd} className="bg-slate-900 text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 shadow-lg shadow-slate-200 active:scale-95 transition-all">
          <Plus size={20} /> Add Asset
        </button>
      </div>

      <div className="relative mb-8">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
        <input 
          type="text" 
          placeholder="Search assets by name or code..." 
          className="w-full bg-white border-2 border-slate-100 rounded-2xl py-4 pl-12 pr-4 outline-none focus:border-blue-500 transition-all font-medium text-slate-700" 
        />
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 pb-20">
        {assets.map(asset => (
          <div key={asset.id} className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm hover:shadow-xl transition-all group">
            <div className="flex justify-between items-start mb-6">
              <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 group-hover:bg-blue-600 group-hover:text-white transition-all">
                <Package size={28} />
              </div>
              <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                asset.status === Status.ACTIVE ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
              }`}>
                {asset.status}
              </span>
            </div>
            <h3 className="text-xl font-black text-slate-900 mb-1">{asset.name}</h3>
            <p className="text-[10px] font-bold text-slate-400 tracking-widest uppercase mb-6">{asset.code}</p>
            
            <div className="space-y-3 pt-6 border-t border-slate-50">
              <div className="flex items-center gap-3 text-slate-500">
                 <MapPin size={14} className="text-slate-400" />
                 <span className="text-sm font-bold">{sites.find(s => s.id === asset.site_id)?.name || 'Unknown Site'}</span>
              </div>
              {asset.block_id && (
                <div className="flex items-center gap-3 text-slate-500">
                   <Layers size={14} className="text-slate-400" />
                   <span className="text-sm font-medium">{blocks.find(b => b.id === asset.block_id)?.name || 'Space'}</span>
                </div>
              )}
            </div>
          </div>
        ))}

        {assets.length === 0 && (
          <div className="col-span-full py-20 text-center bg-white rounded-[32px] border-2 border-dashed border-slate-100">
            <Package className="w-12 h-12 text-slate-200 mx-auto mb-4" />
            <p className="text-slate-400 font-bold">No assets cataloged yet.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AssetList;

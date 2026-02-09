
import React, { useState } from 'react';
import { ServiceRequest, SRStatus, SRSource, Site, Asset } from '../types';
import { Search, Filter, MessageSquare, Monitor, ChevronRight, Plus } from 'lucide-react';

interface SRListProps {
  srs: ServiceRequest[];
  sites: Site[];
  assets: Asset[];
  onSelect: (sr: ServiceRequest) => void;
  onNewRequest: () => void;
}

const SRList: React.FC<SRListProps> = ({ srs, sites, assets, onSelect, onNewRequest }) => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All Statuses');

  const filteredSRs = srs.filter(sr => {
    const matchesSearch = sr.title.toLowerCase().includes(search.toLowerCase()) || 
                          sr.id.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'All Statuses' || sr.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getSiteName = (id: string | null) => sites.find(s => s.id === id)?.name || 'Unknown Site';
  const getAssetName = (id: string | null) => assets.find(a => a.id === id)?.name || 'Unknown Asset';

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-slate-800 mb-1">Service Requests</h2>
          <p className="text-slate-500 text-sm">Manage incoming maintenance tickets</p>
        </div>
        <button 
          onClick={onNewRequest}
          className="bg-slate-900 text-white px-5 py-2.5 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-slate-800 transition-all shadow-md active:scale-95"
        >
          <Plus size={18} />
          <span>New Request</span>
        </button>
      </div>

      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4 items-center">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text"
            placeholder="Search by ID, title, or description..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[#F8FAFC] border-none rounded-lg py-2.5 pl-10 pr-4 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>
        <div className="flex gap-2 w-full md:w-auto">
           <button className="p-2.5 bg-[#F8FAFC] text-slate-500 rounded-lg border border-slate-100 hover:bg-slate-50">
             <Filter size={18} />
           </button>
           <select 
             value={statusFilter}
             onChange={(e) => setStatusFilter(e.target.value)}
             className="flex-1 md:w-48 bg-[#F8FAFC] border-none rounded-lg py-2.5 px-4 text-sm font-medium text-slate-700 outline-none focus:ring-2 focus:ring-blue-500"
           >
             <option>All Statuses</option>
             {Object.values(SRStatus).map(s => <option key={s}>{s}</option>)}
           </select>
        </div>
      </div>

      <div className="space-y-4">
        {filteredSRs.map(sr => (
          <div 
            key={sr.id}
            onClick={() => onSelect(sr)}
            className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:border-blue-200 transition-all cursor-pointer group"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-slate-400 tracking-widest uppercase">#{sr.id}</span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                  sr.status === SRStatus.NEW ? 'bg-blue-100 text-blue-700' :
                  sr.status === SRStatus.IN_PROGRESS ? 'bg-amber-100 text-amber-700' :
                  sr.status === SRStatus.RESOLVED ? 'bg-emerald-100 text-emerald-700' :
                  'bg-slate-100 text-slate-600'
                }`}>
                  {sr.status}
                </span>
              </div>
              <span className="text-[11px] font-medium text-slate-400">{new Date(sr.created_at).toLocaleDateString()}</span>
            </div>

            <h3 className="text-lg font-bold text-slate-800 mb-1 group-hover:text-blue-600 transition-colors">{sr.title}</h3>
            <p className="text-sm text-slate-500 mb-6">{sr.description}</p>

            <div className="flex flex-wrap gap-2">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-slate-100 rounded-lg">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">Site:</span>
                <span className="text-xs font-semibold text-slate-700">{getSiteName(sr.site_id)}</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-slate-100 rounded-lg">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">Asset:</span>
                <span className="text-xs font-semibold text-slate-700">{getAssetName(sr.asset_id)}</span>
              </div>
              <div className={`ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wider ${
                sr.source === SRSource.WHATSAPP ? 'text-emerald-600 bg-emerald-50' : 'text-slate-500 bg-slate-50'
              }`}>
                {sr.source === SRSource.WHATSAPP ? <MessageSquare size={14} /> : <Monitor size={14} />}
                {sr.source}
              </div>
            </div>
          </div>
        ))}

        {filteredSRs.length === 0 && (
          <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-slate-300">
            <p className="text-slate-400">No service requests found.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SRList;

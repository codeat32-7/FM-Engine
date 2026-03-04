
import React, { useState } from 'react';
import { ServiceRequest, SRStatus, SRSource, Site, Asset, Tenant, Requester } from '../types';
import { Search, Filter, MessageSquare, Monitor, ChevronRight, Plus, Trash2, Calendar, MapPin, Package, User } from 'lucide-react';

interface SRListProps {
  srs: ServiceRequest[];
  sites: Site[];
  assets: Asset[];
  tenants: Tenant[];
  requesters: Requester[];
  onSelect: (sr: ServiceRequest) => void;
  onNewRequest: () => void;
  onDelete: (id: string) => void;
}

const SRList: React.FC<SRListProps> = ({ srs, sites, assets, tenants, requesters, onSelect, onNewRequest, onDelete }) => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All Statuses');

  const filteredSRs = srs.filter(sr => {
    const matchesSearch = sr.title.toLowerCase().includes(search.toLowerCase()) || 
                          sr.id.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'All Statuses' || sr.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getSiteName = (id: string | null) => sites.find(s => s.id === id)?.name || 'Pending Site';
  const getAssetName = (id: string | null) => assets.find(a => a.id === id)?.name || 'General';

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

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-bottom border-slate-100">
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">ID & Status</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Request Details</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Site & Asset</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Requester</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Source</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Date</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredSRs.map(sr => (
                <tr key={sr.id} onClick={() => onSelect(sr)} className="hover:bg-slate-50/50 transition-colors group cursor-pointer">
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-1.5">
                      <span className="text-xs font-bold text-slate-400 tracking-widest uppercase">#{sr.id}</span>
                      <span className={`inline-flex px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider w-fit ${
                        sr.status === SRStatus.NEW ? 'bg-blue-100 text-blue-700' :
                        sr.status === SRStatus.IN_PROGRESS ? 'bg-amber-100 text-amber-700' :
                        sr.status === SRStatus.RESOLVED ? 'bg-emerald-100 text-emerald-700' :
                        'bg-slate-100 text-slate-600'
                      }`}>
                        {sr.status}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 max-w-xs">
                    <h3 className="text-sm font-bold text-slate-800 line-clamp-1">{sr.title}</h3>
                    <p className="text-xs text-slate-500 line-clamp-1">{sr.description}</p>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                        <MapPin size={12} className="text-slate-400" />
                        <span className={!sr.site_id ? 'text-amber-600 italic' : ''}>{getSiteName(sr.site_id)}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                        <Package size={12} className="text-slate-400" />
                        <span>{getAssetName(sr.asset_id)}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 bg-slate-100 rounded-full flex items-center justify-center text-slate-400">
                        <User size={14} />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-700">
                          {tenants.find(t => t.phone === sr.requester_phone)?.name || 
                           requesters.find(r => r.phone === sr.requester_phone)?.name || 
                           'Unknown'}
                        </p>
                        <p className="text-[10px] text-slate-400 font-medium">{sr.requester_phone || 'No phone'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${
                      sr.source === SRSource.WHATSAPP ? 'text-emerald-600 bg-emerald-50' : 'text-slate-500 bg-slate-50'
                    }`}>
                      {sr.source === SRSource.WHATSAPP ? <MessageSquare size={12} /> : <Monitor size={12} />}
                      {sr.source}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1.5 text-xs text-slate-500">
                      <Calendar size={12} className="text-slate-400" />
                      {new Date(sr.created_at).toLocaleDateString()}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button 
                        onClick={() => onSelect(sr)}
                        className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                      >
                        <ChevronRight size={18} />
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); onDelete(sr.id); }}
                        className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredSRs.length === 0 && (
          <div className="text-center py-20">
            <p className="text-slate-400 font-medium">No service requests found.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SRList;

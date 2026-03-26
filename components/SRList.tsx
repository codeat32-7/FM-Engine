
import React, { useMemo, useState } from 'react';
import { ServiceRequest, SRStatus, SRSource, Site, Asset, Tenant, Requester } from '../types';
import { Search, MessageSquare, Monitor, ChevronRight, Plus, Trash2, Calendar, MapPin, Package, User } from 'lucide-react';
import { phonesMatch, formatPhoneDisplay } from '../lib/phone';

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

function requesterLabel(sr: ServiceRequest, tenants: Tenant[], requesters: Requester[]): { name: string; phone: string } {
  const t = tenants.find(x => phonesMatch(x.phone, sr.requester_phone));
  const r = requesters.find(x => phonesMatch(x.phone, sr.requester_phone));
  return {
    name: t?.name || r?.name || 'Unknown',
    phone: formatPhoneDisplay(sr.requester_phone)
  };
}

const SRList: React.FC<SRListProps> = ({ srs, sites, assets, tenants, requesters, onSelect, onNewRequest, onDelete }) => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All Statuses');

  const filteredSRs = useMemo(() => {
    const q = search.trim().toLowerCase();
    return srs.filter(sr => {
      const matchesSearch =
        !q ||
        sr.title.toLowerCase().includes(q) ||
        (sr.description || '').toLowerCase().includes(q) ||
        sr.id.toLowerCase().includes(q);
      const matchesStatus = statusFilter === 'All Statuses' || sr.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [srs, search, statusFilter]);

  const getSiteName = (id: string | null) => sites.find(s => s.id === id)?.name || 'Unassigned';
  const getAssetName = (id: string | null) => assets.find(a => a.id === id)?.name || '—';

  const statusChip = (status: SRStatus) => {
    const map: Record<string, string> = {
      [SRStatus.NEW]: 'bg-blue-50 text-blue-800 border-blue-100',
      [SRStatus.IN_PROGRESS]: 'bg-amber-50 text-amber-900 border-amber-100',
      [SRStatus.RESOLVED]: 'bg-teal-50 text-teal-900 border-teal-100',
      [SRStatus.CLOSED]: 'bg-slate-100 text-slate-600 border-slate-200'
    };
    return map[status] || 'bg-slate-100 text-slate-600 border-slate-200';
  };

  return (
    <div className="space-y-6 fm-animate-in">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold text-fm-accent uppercase tracking-wider">Work orders</p>
          <h2 className="text-2xl font-bold text-fm-ink mt-1">Service requests</h2>
          <p className="text-fm-muted text-sm mt-1">Triage, assign, and close the maintenance backlog.</p>
        </div>
        <button
          type="button"
          onClick={onNewRequest}
          className="inline-flex items-center justify-center gap-2 bg-fm-navy text-white px-5 py-3 rounded-xl font-semibold text-sm shadow-fm hover:bg-slate-800 transition-colors shrink-0"
        >
          <Plus size={18} />
          New request
        </button>
      </div>

      <div className="bg-fm-surface rounded-xl border border-fm-border p-4 shadow-fm flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-fm-muted" size={18} />
          <input
            type="search"
            placeholder="Search title, description, or WO #…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-fm-canvas border border-fm-border rounded-lg py-2.5 pl-10 pr-3 text-sm focus:ring-2 focus:ring-fm-accent/20 focus:border-fm-accent outline-none text-fm-ink"
          />
        </div>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="md:w-52 bg-fm-canvas border border-fm-border rounded-lg py-2.5 px-3 text-sm font-medium text-fm-ink outline-none focus:ring-2 focus:ring-fm-accent/20 focus:border-fm-accent"
        >
          <option>All Statuses</option>
          {Object.values(SRStatus).map(s => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      <div className="bg-fm-surface rounded-xl border border-fm-border shadow-fm overflow-hidden">
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="bg-fm-canvas border-b border-fm-border text-[10px] font-semibold uppercase tracking-wider text-fm-muted">
                <th className="px-4 py-3">Work order</th>
                <th className="px-4 py-3">Summary</th>
                <th className="px-4 py-3">Site / asset</th>
                <th className="px-4 py-3">Requester</th>
                <th className="px-4 py-3">Source</th>
                <th className="px-4 py-3">Opened</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-fm-border">
              {filteredSRs.map(sr => {
                const req = requesterLabel(sr, tenants, requesters);
                return (
                  <tr key={sr.id} className="hover:bg-fm-canvas/80 cursor-pointer group" onClick={() => onSelect(sr)}>
                    <td className="px-4 py-3 align-top">
                      <span className="font-mono text-xs font-semibold text-fm-muted block">{sr.id}</span>
                      <span
                        className={`inline-flex mt-1 px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wide border ${statusChip(sr.status)}`}
                      >
                        {sr.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 align-top max-w-xs">
                      <p className="font-semibold text-fm-ink line-clamp-1">{sr.title}</p>
                      <p className="text-fm-muted text-xs line-clamp-1 mt-0.5">{sr.description}</p>
                    </td>
                    <td className="px-4 py-3 align-top">
                      <div className="flex items-center gap-1.5 text-xs text-fm-ink">
                        <MapPin size={12} className="text-fm-muted shrink-0" />
                        <span className={!sr.site_id ? 'text-amber-700' : ''}>{getSiteName(sr.site_id)}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[11px] text-fm-muted mt-1">
                        <Package size={12} className="shrink-0" />
                        {getAssetName(sr.asset_id)}
                      </div>
                    </td>
                    <td className="px-4 py-3 align-top">
                      <p className="font-medium text-fm-ink text-xs">{req.name}</p>
                      <p className="text-[11px] text-fm-muted font-mono">{req.phone}</p>
                    </td>
                    <td className="px-4 py-3 align-top">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-semibold uppercase tracking-wide ${
                          sr.source === SRSource.WHATSAPP ? 'bg-emerald-50 text-emerald-800' : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {sr.source === SRSource.WHATSAPP ? <MessageSquare size={11} /> : <Monitor size={11} />}
                        {sr.source}
                      </span>
                    </td>
                    <td className="px-4 py-3 align-top text-xs text-fm-muted whitespace-nowrap">
                      <div className="flex items-center gap-1">
                        <Calendar size={12} />
                        {new Date(sr.created_at).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right align-top">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={e => {
                            e.stopPropagation();
                            onSelect(sr);
                          }}
                          className="p-2 text-fm-muted hover:text-fm-accent rounded-lg"
                          aria-label="Open"
                        >
                          <ChevronRight size={18} />
                        </button>
                        <button
                          type="button"
                          onClick={e => {
                            e.stopPropagation();
                            onDelete(sr.id);
                          }}
                          className="p-2 text-fm-muted hover:text-red-600 rounded-lg opacity-0 group-hover:opacity-100"
                          aria-label="Delete"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="md:hidden divide-y divide-fm-border">
          {filteredSRs.map(sr => {
            const req = requesterLabel(sr, tenants, requesters);
            return (
              <button
                key={sr.id}
                type="button"
                onClick={() => onSelect(sr)}
                className="w-full text-left p-4 hover:bg-fm-canvas/60 transition-colors"
              >
                <div className="flex justify-between items-start gap-2">
                  <span className="font-mono text-[10px] text-fm-muted">{sr.id}</span>
                  <span className={`px-2 py-0.5 rounded-md text-[9px] font-semibold uppercase border ${statusChip(sr.status)}`}>
                    {sr.status}
                  </span>
                </div>
                <h3 className="font-semibold text-fm-ink text-sm mt-2 leading-snug">{sr.title}</h3>
                <div className="flex flex-wrap gap-3 mt-2 text-[11px] text-fm-muted">
                  <span className="flex items-center gap-1">
                    <MapPin size={11} /> {getSiteName(sr.site_id)}
                  </span>
                  <span className="flex items-center gap-1">
                    <User size={11} /> {req.name}
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {filteredSRs.length === 0 && (
          <div className="text-center py-16 px-4">
            <p className="text-fm-muted font-medium">No work orders match your filters.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SRList;


import React, { useMemo, useState } from 'react';
import { Tenant, Site, Status } from '../types';
import { Plus, Search, User, Phone, MapPin, Trash2 } from 'lucide-react';
import { formatPhoneDisplay } from '../lib/phone';

interface TenantListProps {
  tenants: Tenant[];
  sites: Site[];
  onAdd: () => void;
  onDelete: (id: string) => void;
}

const TenantList: React.FC<TenantListProps> = ({ tenants, sites, onAdd, onDelete }) => {
  const [q, setQ] = useState('');
  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return tenants;
    return tenants.filter(
      t =>
        t.name.toLowerCase().includes(s) ||
        (t.phone || '').replace(/\D/g, '').includes(s.replace(/\D/g, '')) ||
        formatPhoneDisplay(t.phone).toLowerCase().includes(s)
    );
  }, [tenants, q]);

  return (
    <div className="space-y-6 fm-animate-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <p className="text-xs font-semibold text-fm-accent uppercase tracking-wider">Occupants</p>
          <h2 className="text-2xl font-bold text-fm-ink mt-1">Tenants</h2>
          <p className="text-fm-muted text-sm mt-1">Residents linked to sites and work order history.</p>
        </div>
        <button
          type="button"
          onClick={onAdd}
          className="bg-fm-navy text-white px-5 py-3 rounded-xl font-semibold text-sm flex items-center gap-2 shadow-fm hover:bg-slate-800 shrink-0"
        >
          <Plus size={18} /> Add tenant
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-fm-muted" size={18} />
        <input
          type="search"
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder="Search name or phone…"
          className="w-full bg-fm-surface border border-fm-border rounded-xl py-3.5 pl-12 pr-4 outline-none focus:border-fm-accent text-sm text-fm-ink shadow-sm"
        />
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(tenant => (
          <div
            key={tenant.id}
            className="bg-fm-surface p-6 rounded-xl border border-fm-border shadow-fm hover:border-fm-accent/25 transition-colors group relative"
          >
            <button
              type="button"
              onClick={() => onDelete(tenant.id)}
              className="absolute top-4 right-4 p-2 text-fm-muted hover:text-red-600 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
              aria-label="Delete tenant"
            >
              <Trash2 size={18} />
            </button>
            <div className="flex justify-between items-start mb-4">
              <div className="w-12 h-12 bg-fm-canvas rounded-xl flex items-center justify-center text-fm-muted group-hover:bg-fm-accentsoft group-hover:text-fm-accent transition-colors">
                <User size={24} />
              </div>
              <span
                className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold uppercase tracking-wide ${
                  tenant.status === Status.ACTIVE ? 'bg-teal-50 text-teal-800' : 'bg-slate-100 text-slate-600'
                }`}
              >
                {tenant.status}
              </span>
            </div>
            <h3 className="text-lg font-bold text-fm-ink">{tenant.name}</h3>
            <div className="space-y-2 mt-4 text-sm text-fm-muted">
              <div className="flex items-center gap-2">
                <Phone size={14} className="shrink-0" />
                <span className="font-mono font-medium text-fm-ink">{formatPhoneDisplay(tenant.phone)}</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin size={14} className="shrink-0" />
                <span>{sites.find(s => s.id === tenant.site_id)?.name || '—'}</span>
              </div>
            </div>
          </div>
        ))}

        {filtered.length === 0 && (
          <div className="col-span-full py-16 text-center bg-fm-surface rounded-xl border border-dashed border-fm-border">
            <User className="w-10 h-10 text-fm-border mx-auto mb-3" />
            <p className="text-fm-muted font-medium text-sm">No tenants match your search.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default TenantList;

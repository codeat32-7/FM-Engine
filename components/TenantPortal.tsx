
import React, { useState, useEffect, useMemo } from 'react';
import { UserProfile, ServiceRequest, Site, Block, Tenant, SRStatus, SRSource } from '../types';
import { supabase } from '../lib/supabase';
import { LogOut, Wrench, MapPin, Layers, CheckCircle, Clock, Plus, MessageSquare, Loader2, X, AlertCircle } from 'lucide-react';
import { phoneSuffix, phonesMatch, digitsOnly } from '../lib/phone';
import { generateServiceRequestId } from '../lib/srId';

interface TenantPortalProps {
  user: UserProfile;
  onLogout: () => void;
}

const TenantPortal: React.FC<TenantPortalProps> = ({ user, onLogout }) => {
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [site, setSite] = useState<Site | null>(null);
  const [block, setBlock] = useState<Block | null>(null);
  const [mySRs, setMySRs] = useState<ServiceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddSR, setShowAddSR] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const suffix = useMemo(() => phoneSuffix(user.phone), [user.phone]);

  useEffect(() => {
    const fetchTenantData = async () => {
      setLoading(true);
      setLoadError(null);
      try {
        const { data: tenantRows, error: tErr } = await supabase
          .from('tenants')
          .select('*')
          .ilike('phone', `%${suffix}%`)
          .limit(5);

        if (tErr) throw tErr;

        const tenantData =
          tenantRows?.find(t => phonesMatch(t.phone, user.phone)) || tenantRows?.[0] || null;

        if (!tenantData) {
          setTenant(null);
          setSite(null);
          setBlock(null);
          setMySRs([]);
          setLoading(false);
          return;
        }

        setTenant(tenantData);

        const [sData, bData, srData] = await Promise.all([
          tenantData.site_id
            ? supabase.from('sites').select('*').eq('id', tenantData.site_id).single()
            : Promise.resolve({ data: null, error: null }),
          tenantData.block_id
            ? supabase.from('blocks').select('*').eq('id', tenantData.block_id).single()
            : Promise.resolve({ data: null, error: null }),
          supabase
            .from('service_requests')
            .select('*')
            .eq('org_id', tenantData.org_id)
            .order('created_at', { ascending: false })
        ]);

        setSite(sData.data as Site | null);
        setBlock(bData.data as Block | null);

        const all = (srData.data || []) as ServiceRequest[];
        setMySRs(all.filter(sr => phonesMatch(sr.requester_phone, user.phone)));
      } catch (err) {
        console.error(err);
        setLoadError(err instanceof Error ? err.message : 'Could not load portal');
      } finally {
        setLoading(false);
      }
    };
    fetchTenantData();
  }, [user.phone, suffix]);

  // Realtime: keep SR list updated while the portal is open.
  // This handles service_requests created by the webhook (Twilio) in real time.
  useEffect(() => {
    if (!tenant?.org_id) return;

    const orgId = tenant.org_id;
    const channel = supabase
      .channel(`tenant-portal-srs-${orgId}-${digitsOnly(user.phone)}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'service_requests',
          filter: `org_id=eq.${orgId}`
        },
        payload => {
          const sr = payload.new as ServiceRequest;
          if (!phonesMatch(sr.requester_phone, user.phone)) return;

          setMySRs(prev => {
            if (prev.some(p => p.id === sr.id)) return prev;
            const next = [sr, ...prev];
            return next.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'service_requests',
          filter: `org_id=eq.${orgId}`
        },
        payload => {
          const sr = payload.new as ServiceRequest;
          if (!phonesMatch(sr.requester_phone, user.phone)) return;

          setMySRs(prev => {
            const next = prev.map(p => (p.id === sr.id ? sr : p));
            return next.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tenant?.org_id, user.phone]);

  if (loading) {
    return (
      <div className="min-h-screen bg-fm-canvas flex flex-col items-center justify-center gap-3">
        <Loader2 className="animate-spin text-fm-accent" size={40} />
        <p className="text-sm text-fm-muted font-medium">Loading your portal…</p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="min-h-screen bg-fm-canvas flex items-center justify-center p-6">
        <div className="max-w-md bg-fm-surface rounded-2xl border border-fm-border p-8 shadow-fm text-center">
          <AlertCircle className="mx-auto text-red-500 mb-3" size={40} />
          <p className="text-fm-ink font-semibold">{loadError}</p>
          <button type="button" onClick={onLogout} className="mt-6 text-fm-accent font-semibold text-sm">
            Sign out
          </button>
        </div>
      </div>
    );
  }

  if (!tenant) {
    return (
      <div className="min-h-screen bg-fm-canvas flex flex-col items-center justify-center p-6">
        <div className="max-w-md bg-fm-surface rounded-2xl border border-fm-border p-8 shadow-fm text-center">
          <div className="w-14 h-14 bg-amber-50 text-amber-700 rounded-xl flex items-center justify-center mx-auto mb-4">
            <AlertCircle size={28} />
          </div>
          <h2 className="text-lg font-bold text-fm-ink">No active tenancy</h2>
          <p className="text-fm-muted text-sm mt-2 leading-relaxed">
            Your number is not linked to a site yet. Ask your facility manager to approve your access from the Approvals queue.
          </p>
          <button
            type="button"
            onClick={onLogout}
            className="mt-6 w-full py-3 rounded-xl bg-blue-600 text-white font-semibold text-sm hover:bg-blue-700 transition-colors"
          >
            Sign out
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-fm-canvas pb-24">
      <header className="bg-fm-surface border-b border-fm-border sticky top-0 z-20 shadow-sm">
        <div className="max-w-3xl mx-auto px-5 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 bg-fm-accent rounded-xl flex items-center justify-center text-white font-bold shrink-0">F</div>
            <div className="min-w-0">
              <h1 className="text-base font-bold text-fm-ink leading-tight truncate">Resident portal</h1>
              <p className="text-[11px] font-semibold text-fm-muted uppercase tracking-wide truncate">{tenant.name}</p>
            </div>
          </div>
          <button type="button" onClick={onLogout} className="p-2.5 text-fm-muted hover:text-red-600 rounded-lg transition-colors shrink-0" aria-label="Sign out">
            <LogOut size={20} />
          </button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto p-5 space-y-8">
        <div className="bg-white rounded-2xl p-6 md:p-8 text-slate-900 relative overflow-hidden border border-slate-200 shadow-fm">
          <div className="absolute top-0 right-0 w-56 h-56 bg-fm-accent/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none" />
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 px-2.5 py-1 bg-blue-50 rounded-lg border border-blue-100">
                <CheckCircle size={12} className="text-fm-success" />
                <span className="text-[10px] font-semibold uppercase tracking-wider text-blue-700">Verified resident</span>
              </div>
              <h2 className="text-2xl font-bold tracking-tight">{site?.name || 'Your site'}</h2>
              <div className="flex flex-wrap gap-4 text-sm text-slate-400">
                <span className="flex items-center gap-1.5">
                  <MapPin size={14} /> {site?.location || '—'}
                </span>
                {block && (
                  <span className="flex items-center gap-1.5">
                    <Layers size={14} /> {block.name} ({block.type})
                  </span>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowAddSR(true)}
              className="bg-blue-600 text-white px-6 py-3.5 rounded-xl font-semibold text-sm shadow-lg hover:bg-blue-700 transition-colors shrink-0 inline-flex items-center justify-center gap-2"
            >
              <Plus size={18} /> Report issue
            </button>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-fm-ink">Your work orders</h3>
            <span className="text-sm font-medium text-fm-muted flex items-center gap-1.5">
              <Wrench size={14} /> {mySRs.length}
            </span>
          </div>
          <div className="space-y-3">
            {mySRs.map(sr => (
              <div key={sr.id} className="bg-fm-surface p-5 rounded-xl border border-fm-border shadow-sm">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="font-mono text-[10px] text-fm-muted">{sr.id}</span>
                  <span
                    className={`px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wide ${
                      sr.status === SRStatus.RESOLVED || sr.status === SRStatus.CLOSED
                        ? 'bg-teal-50 text-teal-800'
                        : 'bg-blue-50 text-blue-800'
                    }`}
                  >
                    {sr.status}
                  </span>
                </div>
                <h4 className="font-semibold text-fm-ink">{sr.title}</h4>
                <p className="text-sm text-fm-muted line-clamp-2 mt-1">{sr.description}</p>
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-fm-border text-xs text-fm-muted">
                  <span className="flex items-center gap-1">
                    <Clock size={12} /> {new Date(sr.created_at).toLocaleDateString()}
                  </span>
                  {sr.source === SRSource.WHATSAPP && (
                    <span className="flex items-center gap-1 text-emerald-700 font-semibold">
                      <MessageSquare size={12} /> WhatsApp
                    </span>
                  )}
                </div>
              </div>
            ))}
            {mySRs.length === 0 && (
              <div className="text-center py-16 bg-fm-surface rounded-xl border border-dashed border-fm-border">
                <p className="text-fm-muted font-medium text-sm">No reports yet. Tap Report issue when something needs attention.</p>
              </div>
            )}
          </div>
        </div>
      </main>

      {showAddSR && (
        <div className="fixed inset-0 z-[100] bg-slate-900/20 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={async e => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              const payload = {
                id: generateServiceRequestId(),
                org_id: tenant.org_id,
                site_id: tenant.site_id,
                block_id: tenant.block_id ?? null,
                title: fd.get('title'),
                description: fd.get('description'),
                status: SRStatus.NEW,
                source: SRSource.WEB,
                requester_phone: digitsOnly(user.phone),
                created_at: new Date().toISOString()
              };
              const { data, error } = await supabase.from('service_requests').insert([payload]).select();
              if (error) {
                alert(error.message);
                return;
              }
              if (data?.[0]) setMySRs(prev => [data[0] as ServiceRequest, ...prev]);
              setShowAddSR(false);
            }}
            className="bg-fm-surface w-full max-w-lg rounded-2xl p-8 shadow-fm border border-fm-border space-y-6"
          >
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-bold text-fm-ink">New report</h3>
              <button type="button" onClick={() => setShowAddSR(false)} className="p-2 rounded-lg hover:bg-fm-canvas text-fm-muted">
                <X size={22} />
              </button>
            </div>
            <div className="space-y-3">
              <input required name="title" className="w-full bg-fm-canvas border border-fm-border rounded-xl p-4 outline-none font-medium text-fm-ink focus:border-fm-accent" placeholder="What needs attention?" />
              <textarea name="description" className="w-full bg-fm-canvas border border-fm-border rounded-xl p-4 outline-none text-sm min-h-[120px] text-fm-ink focus:border-fm-accent" placeholder="Location, urgency, access notes…" />
            </div>
            <button type="submit" className="w-full bg-fm-accent text-white py-4 rounded-xl font-semibold hover:opacity-90">
              Submit work order
            </button>
          </form>
        </div>
      )}
    </div>
  );
};

export default TenantPortal;

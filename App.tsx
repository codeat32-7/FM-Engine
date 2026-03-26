
import React, { useState, useEffect, useCallback } from 'react';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import SRList from './components/SRList';
import TenantList from './components/TenantList';
import AssetList from './components/AssetList';
import Settings from './components/Settings';
import Auth from './components/Auth';
import TenantPortal from './components/TenantPortal';
import SRDetail from './components/SRDetail';
import { Site, Asset, ServiceRequest, SRStatus, Status, SRSource, TabConfig, UserProfile, Tenant, Organization, Requester, Block } from './types';
import { supabase, checkSchemaReady } from './lib/supabase';
import { generateServiceRequestId } from './lib/srId';
import { digitsOnly, phonesMatch, formatPhoneDisplay } from './lib/phone';
import { 
  X, MapPin, Plus, Loader2, ArrowRight, CheckCircle, AlertCircle, RefreshCw, Phone, UserCheck, Rocket, Sparkles, Hash, Trash2
} from 'lucide-react';

const DEFAULT_TABS: TabConfig[] = [
  { id: 'dashboard', label: 'Dashboard', iconName: 'LayoutDashboard', isVisible: true },
  { id: 'srs', label: 'Service Requests', iconName: 'Wrench', isVisible: true },
  { id: 'sites', label: 'Sites', iconName: 'MapPin', isVisible: true },
  { id: 'tenants', label: 'Tenants', iconName: 'Users', isVisible: true },
  { id: 'requesters', label: 'Approvals', iconName: 'UserCheck', isVisible: true },
  { id: 'assets', label: 'Assets', iconName: 'Package', isVisible: true },
];

const Onboarding: React.FC<{ user: UserProfile, onComplete: (user: UserProfile) => void }> = ({ user, onComplete }) => {
  const [step, setStep] = useState(1);
  const [adminName, setAdminName] = useState('');
  const [orgName, setOrgName] = useState('');
  const [siteName, setSiteName] = useState('');
  const [siteLocation, setSiteLocation] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSetup = async () => {
    setLoading(true);
    try {
      const cleanPhone = user.phone.replace(/[^0-9]/g, '');
      const { data: org, error: orgErr } = await supabase.from('organizations').insert([{ name: orgName }]).select().single();
      if (orgErr) throw orgErr;

      const { data: site, error: siteErr } = await supabase.from('sites').insert([{
        org_id: org.id,
        name: siteName,
        location: siteLocation,
        code: `SITE-${Math.floor(1000 + Math.random() * 9000)}`,
        status: Status.ACTIVE
      }]).select().single();
      if (siteErr) throw siteErr;

      const { error: profErr } = await supabase.from('profiles').upsert({
        id: user.id,
        org_id: org.id,
        site_id: site.id,
        phone: cleanPhone,
        full_name: adminName,
        role: 'admin'
      }, { onConflict: 'id' });
      
      if (profErr) throw profErr;

      const updatedUser: UserProfile = {
        ...user,
        phone: cleanPhone,
        full_name: adminName,
        org_id: org.id,
        onboarded: true,
        role: 'admin'
      };

      localStorage.setItem('fm_engine_user', JSON.stringify(updatedUser));
      onComplete(updatedUser);
    } catch (err: any) {
      alert("Setup failed: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-fm-navy flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-fm-surface rounded-2xl p-10 shadow-fm border border-fm-border space-y-8 fm-animate-in relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-fm-accent/5 to-transparent pointer-events-none" />
        <div className="flex justify-between items-center relative z-10">
          <div className="flex gap-2">
            {[1, 2, 3].map(i => (
              <div key={i} className={`h-1.5 w-8 rounded-full transition-all ${step >= i ? 'bg-fm-accent' : 'bg-fm-border'}`} />
            ))}
          </div>
          <span className="text-[10px] font-semibold text-fm-muted uppercase tracking-widest">Step {step} of 3</span>
        </div>
        {step === 1 && (
          <div className="space-y-6 relative z-10">
            <div>
              <p className="text-xs font-semibold text-fm-accent uppercase tracking-wider mb-1">Facility setup</p>
              <h2 className="text-2xl font-bold text-fm-ink leading-tight">Your name</h2>
              <p className="text-sm text-fm-muted mt-1">Shown on work orders and resident communications.</p>
            </div>
            <input autoFocus className="w-full bg-fm-canvas border border-fm-border focus:border-fm-accent focus:ring-2 focus:ring-fm-accent/20 rounded-xl p-4 outline-none font-medium text-fm-ink" placeholder="Full name" value={adminName} onChange={e => setAdminName(e.target.value)} />
            <button disabled={!adminName} onClick={() => setStep(2)} className="w-full bg-fm-navy text-white py-4 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all hover:bg-slate-800 disabled:opacity-40">Continue <ArrowRight size={18} /></button>
          </div>
        )}
        {step === 2 && (
          <div className="space-y-6 relative z-10">
            <div>
              <p className="text-xs font-semibold text-fm-accent uppercase tracking-wider mb-1">Organization</p>
              <h2 className="text-2xl font-bold text-fm-ink">Company or portfolio</h2>
              <p className="text-sm text-fm-muted mt-1">One org can hold many sites and assets.</p>
            </div>
            <input autoFocus className="w-full bg-fm-canvas border border-fm-border focus:border-fm-accent focus:ring-2 focus:ring-fm-accent/20 rounded-xl p-4 outline-none font-medium text-fm-ink" placeholder="e.g. Acme Facilities Ltd" value={orgName} onChange={e => setOrgName(e.target.value)} />
            <button disabled={!orgName} onClick={() => setStep(3)} className="w-full bg-fm-navy text-white py-4 rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-slate-800 disabled:opacity-40">Continue <ArrowRight size={18} /></button>
          </div>
        )}
        {step === 3 && (
          <div className="space-y-6 relative z-10">
            <div>
              <p className="text-xs font-semibold text-fm-accent uppercase tracking-wider mb-1">Primary site</p>
              <h2 className="text-2xl font-bold text-fm-ink">First facility</h2>
              <p className="text-sm text-fm-muted mt-1">You can add more sites after onboarding.</p>
            </div>
            <div className="space-y-3">
              <input autoFocus className="w-full bg-fm-canvas border border-fm-border focus:border-fm-accent rounded-xl p-4 outline-none font-medium text-fm-ink" placeholder="Site name" value={siteName} onChange={e => setSiteName(e.target.value)} />
              <input className="w-full bg-fm-canvas border border-fm-border focus:border-fm-accent rounded-xl p-4 outline-none font-medium text-fm-ink" placeholder="Address or city" value={siteLocation} onChange={e => setSiteLocation(e.target.value)} />
            </div>
            <button disabled={loading || !siteName || !siteLocation} onClick={handleSetup} className="w-full bg-fm-accent text-white py-4 rounded-xl font-semibold flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-40">
              {loading ? <Loader2 className="animate-spin" /> : <>Complete setup <Rocket size={18} /></>}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => {
    const saved = localStorage.getItem('fm_engine_user');
    return saved ? JSON.parse(saved) : null;
  });
  
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [sites, setSites] = useState<Site[]>([]);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [requesters, setRequesters] = useState<Requester[]>([]);
  const [srs, setSrs] = useState<ServiceRequest[]>([]);
  const [selectedSr, setSelectedSr] = useState<ServiceRequest | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [dbStatus, setDbStatus] = useState<'connecting' | 'connected' | 'error' | 'needs_setup'>('connecting');

  const [tabConfigs, setTabConfigs] = useState<TabConfig[]>(() => {
    const saved = localStorage.getItem('fm_tabs');
    if (!saved) return DEFAULT_TABS;
    try {
      const parsed: TabConfig[] = JSON.parse(saved);
      const merged = [...DEFAULT_TABS];
      parsed.forEach(p => {
        const idx = merged.findIndex(m => m.id === p.id);
        if (idx !== -1) merged[idx] = p;
      });
      return merged;
    } catch { return DEFAULT_TABS; }
  });

  const [showAddSite, setShowAddSite] = useState(false);
  const [showAddSR, setShowAddSR] = useState(false);
  const [showApproveModal, setShowApproveModal] = useState<Requester | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem('fm_tabs', JSON.stringify(tabConfigs));
    } catch { /* ignore */ }
  }, [tabConfigs]);

  useEffect(() => {
    const init = async () => {
      const status = await checkSchemaReady();
      if (status.needsSetup) {
        setDbStatus('needs_setup');
      } else if (status.error) {
        setDbStatus('error');
      } else {
        setDbStatus('connected');
      }
    };
    init();
  }, []);

  const fetchOrgData = useCallback(async (silent: boolean = false) => {
    if (!currentUser?.org_id) return;
    if (!silent) setIsLoading(true);
    try {
      const { data: orgData } = await supabase.from('organizations').select('*').eq('id', currentUser.org_id).single();
      if (orgData) setOrganization(orgData);

      const [siteData, assetData, tenantData, srData, reqData] = await Promise.all([
        supabase.from('sites').select('*').eq('org_id', currentUser.org_id),
        supabase.from('assets').select('*').eq('org_id', currentUser.org_id),
        supabase.from('tenants').select('*').eq('org_id', currentUser.org_id),
        supabase.from('service_requests').select('*').eq('org_id', currentUser.org_id),
        supabase.from('requesters').select('*').eq('org_id', currentUser.org_id).eq('status', 'pending')
      ]);

      const siteRows = siteData.data || [];
      const siteIds = siteRows.map(s => s.id);
      let blockRows: Block[] = [];
      if (siteIds.length > 0) {
        const { data: b, error: blockErr } = await supabase.from('blocks').select('*').in('site_id', siteIds);
        if (!blockErr && b) blockRows = b as Block[];
      }

      setSites(siteRows);
      setBlocks(blockRows);
      setAssets(assetData.data || []);
      setTenants(tenantData.data || []);
      setRequesters(reqData.data || []);
      setSrs((srData.data || []).sort((a,b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
      setDbStatus('connected');
    } catch { 
      setDbStatus('error');
    } finally { if (!silent) setIsLoading(false); }
  }, [currentUser?.org_id]);

  useEffect(() => {
    if (!currentUser?.org_id) return;

    const channel = supabase
      .channel(`org-${currentUser.org_id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'service_requests', filter: `org_id=eq.${currentUser.org_id}` }, (payload) => {
        if (payload.eventType === 'INSERT') {
          const newSR = payload.new as ServiceRequest;
          setSrs(prev => [newSR, ...prev].sort((a,b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
        } else if (payload.eventType === 'UPDATE') {
          const updated = payload.new as ServiceRequest;
          setSrs(prev => prev.map(sr => sr.id === updated.id ? updated : sr));
          setSelectedSr(prev => (prev?.id === updated.id ? updated : prev));
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'requesters', filter: `org_id=eq.${currentUser.org_id}` }, (payload) => {
        if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
          const req = payload.new as Requester;
          if (req.status === 'pending') {
            setRequesters(prev => [req, ...prev.filter(r => r.id !== req.id)]);
          } else {
            setRequesters(prev => prev.filter(r => r.id !== req.id));
          }
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [currentUser?.org_id]);

  useEffect(() => {
    if (currentUser?.org_id) {
      fetchOrgData();
    }
  }, [currentUser?.org_id, fetchOrgData]);

  const handleAddItem = async (table: string, payload: any, setter: (prev: any) => void, closeFn: () => void) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.from(table).insert([{ ...payload, org_id: currentUser?.org_id }]).select();
      if (error) throw error;
      if (data) { setter((prev: any) => [data[0], ...prev]); closeFn(); }
    } catch (e: any) { alert(e.message); }
    finally { setIsLoading(false); }
  };

  const handleDeleteItem = async (table: string, id: string | number, setter: (prev: any) => void) => {
    // Connection checks
    if (table === 'sites') {
      const isPrimary = sites.length > 0 && sites[0].id === id;
      if (isPrimary) {
        alert("Cannot delete the primary site. Every organization must have at least one site.");
        return;
      }
      const hasAssets = assets.some(a => a.site_id === id);
      const hasTenants = tenants.some(t => t.site_id === id);
      const hasSRs = srs.some(sr => sr.site_id === id);
      if (hasAssets || hasTenants || hasSRs) {
        if (!confirm("This site has connected assets, tenants, or service requests. Deleting it will leave them without a site assignment. Proceed?")) return;
      }
    }

    if (table === 'tenants') {
      const tenant = tenants.find(t => t.id === id);
      const hasSRs = srs.some(sr => phonesMatch(sr.requester_phone, tenant?.phone));
      if (hasSRs) {
        if (!confirm("This tenant has active service requests. Deleting the tenant will disconnect them from their history. Proceed?")) return;
      }
    }

    if (!confirm("Are you sure you want to delete this item?")) return;
    setIsLoading(true);
    try {
      const { error } = await supabase.from(table).delete().eq('id', id);
      if (error) throw error;
      setter((prev: any) => prev.filter((item: any) => item.id !== id));
    } catch (e: any) { alert(e.message); }
    finally { setIsLoading(false); }
  };

  const handleApproveTenant = async (requester: Requester, formData: FormData) => {
    setIsLoading(true);
    try {
      const name = formData.get('name') as string;
      const siteId = formData.get('site_id') as string;

      const cleanReqPhone = digitsOnly(requester.phone);
      const { data: profile, error: profErr } = await supabase.from('profiles').insert([{
        phone: cleanReqPhone,
        org_id: currentUser?.org_id,
        full_name: name,
        role: 'tenant'
      }]).select().single();
      if (profErr) throw profErr;

      const { data: tenant, error: tenantErr } = await supabase.from('tenants').insert([{
        org_id: currentUser?.org_id,
        site_id: siteId,
        name: name,
        phone: cleanReqPhone,
        status: Status.ACTIVE,
        profile_id: profile.id
      }]).select().single();
      if (tenantErr) throw tenantErr;

      await supabase.from('requesters').update({ status: 'approved' }).eq('id', requester.id);

      setTenants(prev => [tenant, ...prev]);
      setRequesters(prev => prev.filter(r => r.id !== requester.id));
      setShowApproveModal(null);
    } catch (err: any) { alert("Activation failed: " + err.message); }
    finally { setIsLoading(false); }
  };

  if (dbStatus === 'connecting') {
    return (
      <div className="min-h-screen bg-fm-navy flex flex-col items-center justify-center gap-4">
        <Loader2 className="animate-spin text-fm-accent" size={40} />
        <p className="text-sm text-slate-400 font-medium">Connecting to operations database…</p>
      </div>
    );
  }

  if (dbStatus === 'needs_setup') {
    const sqlScript = `-- 1. Organizations
CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Sites
CREATE TABLE IF NOT EXISTS sites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  code TEXT UNIQUE NOT NULL,
  location TEXT,
  status TEXT DEFAULT 'ACTIVE',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Profiles
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  site_id UUID REFERENCES sites(id) ON DELETE SET NULL,
  phone TEXT UNIQUE NOT NULL,
  full_name TEXT,
  role TEXT DEFAULT 'admin',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Assets
CREATE TABLE IF NOT EXISTS assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  site_id UUID REFERENCES sites(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  type TEXT,
  status TEXT DEFAULT 'ACTIVE',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Tenants
CREATE TABLE IF NOT EXISTS tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  site_id UUID REFERENCES sites(id) ON DELETE SET NULL,
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  status TEXT DEFAULT 'ACTIVE',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Service Requests
CREATE TABLE IF NOT EXISTS service_requests (
  id TEXT PRIMARY KEY,
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  site_id UUID REFERENCES sites(id) ON DELETE SET NULL,
  asset_id UUID REFERENCES assets(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'New',
  source TEXT DEFAULT 'Web',
  requester_phone TEXT,
  resolution_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  in_progress_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ
);

-- 7. SR Messages (Chat)
CREATE TABLE IF NOT EXISTS sr_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  sr_id TEXT REFERENCES service_requests(id) ON DELETE CASCADE,
  sender_id TEXT NOT NULL,
  sender_role TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  is_whatsapp BOOLEAN DEFAULT FALSE
);

-- 8. Requesters
CREATE TABLE IF NOT EXISTS requesters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  phone TEXT NOT NULL,
  name TEXT,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ENABLE RLS
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE sites ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE sr_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE requesters ENABLE ROW LEVEL SECURITY;

-- POLICIES
CREATE POLICY "Public Access" ON organizations FOR ALL USING (true);
CREATE POLICY "Public Access" ON sites FOR ALL USING (true);
CREATE POLICY "Public Access" ON profiles FOR ALL USING (true);
CREATE POLICY "Public Access" ON assets FOR ALL USING (true);
CREATE POLICY "Public Access" ON tenants FOR ALL USING (true);
CREATE POLICY "Public Access" ON service_requests FOR ALL USING (true);
CREATE POLICY "Public Access" ON sr_messages FOR ALL USING (true);
CREATE POLICY "Public Access" ON requesters FOR ALL USING (true);
  
-- Ensure missing columns exist in case of partial setup
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS site_id UUID REFERENCES sites(id) ON DELETE SET NULL;
ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS site_id UUID REFERENCES sites(id) ON DELETE SET NULL;
ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS asset_id UUID REFERENCES assets(id) ON DELETE SET NULL;`;

    return (
      <div className="min-h-screen bg-fm-navy flex items-center justify-center p-6 text-white">
        <div className="max-w-3xl w-full bg-slate-800/90 backdrop-blur rounded-2xl p-10 border border-slate-600/50 shadow-fm space-y-8 fm-animate-in">
          <div className="flex items-start gap-5">
            <div className="p-3 rounded-xl bg-fm-accent/20 text-fm-accent shrink-0">
              <AlertCircle size={36} />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Database setup required</h1>
              <p className="text-slate-400 text-sm mt-2 leading-relaxed">Run the bootstrap script in the Supabase SQL Editor, then refresh. Afterward, tighten RLS policies for production.</p>
            </div>
          </div>
          <div className="space-y-3">
            <div className="bg-black/35 rounded-xl p-6 font-mono text-[11px] text-emerald-400/95 border border-white/10 relative group max-h-[min(420px,50vh)] overflow-auto">
              <div className="sticky top-0 float-right mb-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  type="button"
                  onClick={() => { navigator.clipboard.writeText(sqlScript); alert('SQL copied'); }}
                  className="bg-slate-700 hover:bg-slate-600 text-white text-xs font-semibold px-3 py-2 rounded-lg"
                >
                  Copy
                </button>
              </div>
              <pre className="whitespace-pre-wrap pr-2">{sqlScript}</pre>
            </div>
          </div>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="w-full bg-fm-accent hover:opacity-90 text-white py-4 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all"
          >
            <RefreshCw size={20} /> Refresh after running SQL
          </button>
        </div>
      </div>
    );
  }

  if (!currentUser) return <Auth onSignIn={(u) => { localStorage.setItem('fm_engine_user', JSON.stringify(u)); setCurrentUser(u); }} />;

  if (!currentUser.org_id && currentUser.role === 'admin') return <Onboarding user={currentUser} onComplete={setCurrentUser} />;
  if (currentUser.role === 'tenant') return <TenantPortal user={currentUser} onLogout={() => { localStorage.removeItem('fm_engine_user'); setCurrentUser(null); }} />;

  return (
    <Layout 
      activeTab={activeTab} 
      onTabChange={setActiveTab} 
      onLogout={() => { localStorage.removeItem('fm_engine_user'); setCurrentUser(null); }}
      dbStatus={dbStatus === 'error' ? 'error' : (dbStatus === 'connected' ? 'connected' : 'connecting')} 
      tabConfigs={tabConfigs.map(t => t.id === 'requesters' && requesters.length > 0 ? { ...t, label: `Approvals (${requesters.length})` } : t)} 
      orgName={organization?.name}
    >
      {activeTab === 'dashboard' && <Dashboard srs={srs} onNewRequest={() => setShowAddSR(true)} assets={assets} organization={organization} sites={sites} />}
      {activeTab === 'srs' && <SRList srs={srs} sites={sites} assets={assets} tenants={tenants} requesters={requesters} onSelect={setSelectedSr} onNewRequest={() => setShowAddSR(true)} onDelete={(id) => handleDeleteItem('service_requests', id, setSrs)} />}
      {activeTab === 'tenants' && <TenantList tenants={tenants} sites={sites} onAdd={() => {}} onDelete={(id) => handleDeleteItem('tenants', id, setTenants)} />}
      
      {selectedSr && (
        <SRDetail 
          sr={selectedSr} 
          sites={sites} 
          assets={assets} 
          tenants={tenants}
          requesters={requesters}
          currentUser={currentUser}
          onClose={() => setSelectedSr(null)} 
          onUpdate={(updated) => {
            setSrs(prev => prev.map(sr => sr.id === updated.id ? updated : sr));
            setSelectedSr(updated);
          }} 
        />
      )}
      
      {activeTab === 'requesters' && (
        <div className="space-y-8 fm-animate-in">
          <div>
            <p className="text-xs font-semibold text-fm-accent uppercase tracking-wider">Access control</p>
            <h2 className="text-2xl font-bold text-fm-ink mt-1">Pending identities</h2>
            <p className="text-fm-muted text-sm mt-1 max-w-xl">Residents who messaged your WhatsApp line before being linked to a unit. Verify and assign a site to activate their portal.</p>
          </div>
          <div className="grid md:grid-cols-2 gap-5">
            {requesters.map(req => (
              <div key={req.id} className="bg-fm-surface p-6 rounded-xl border border-fm-border shadow-fm flex flex-col gap-5 hover:border-fm-accent/30 transition-colors relative group">
                <button
                  type="button"
                  onClick={() => handleDeleteItem('requesters', req.id, setRequesters)}
                  className="absolute top-4 right-4 p-2 text-fm-muted hover:text-red-600 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                  aria-label="Dismiss request"
                >
                  <Trash2 size={18} />
                </button>
                <div className="flex items-center gap-4">
                  <div className="w-11 h-11 bg-fm-accentsoft text-fm-accent rounded-xl flex items-center justify-center"><Phone size={22} /></div>
                  <div>
                    <p className="font-mono text-sm font-semibold text-fm-ink">{formatPhoneDisplay(req.phone)}</p>
                    <p className="text-[10px] font-semibold text-fm-muted uppercase tracking-wider">Unverified contact</p>
                  </div>
                </div>
                <button type="button" onClick={() => setShowApproveModal(req)} className="w-full bg-fm-navy text-white py-3.5 rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-slate-800 transition-colors">
                  <UserCheck size={18} /> Verify &amp; activate
                </button>
              </div>
            ))}
            {requesters.length === 0 && (
              <div className="col-span-full py-20 text-center bg-fm-surface rounded-xl border border-dashed border-fm-border">
                <Sparkles className="text-fm-border mx-auto mb-3" size={40} />
                <p className="text-fm-ink font-semibold">Queue is clear</p>
                <p className="text-fm-muted text-sm mt-1 max-w-md mx-auto">New WhatsApp senders who are not yet tenants will appear here for your review.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'assets' && <AssetList assets={assets} sites={sites} blocks={blocks} onAdd={() => {}} onDelete={(id) => handleDeleteItem('assets', id, setAssets)} />}
      {activeTab === 'settings' && <Settings configs={tabConfigs} setConfigs={setTabConfigs} onLogout={() => { localStorage.removeItem('fm_engine_user'); window.location.reload(); }} />}
      {activeTab === 'sites' && (
        <div className="space-y-8 pb-20 fm-animate-in">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <p className="text-xs font-semibold text-fm-accent uppercase tracking-wider">Portfolio</p>
              <h2 className="text-2xl font-bold text-fm-ink mt-1">Sites &amp; facilities</h2>
              <p className="text-fm-muted text-sm mt-1">Each site has a registration code for WhatsApp sandbox onboarding.</p>
            </div>
            <button type="button" onClick={() => setShowAddSite(true)} className="bg-fm-navy text-white px-5 py-3 rounded-xl font-semibold flex items-center justify-center gap-2 shadow-fm hover:bg-slate-800 transition-colors shrink-0"><Plus size={20} /> Add site</button>
          </div>
          <div className="grid md:grid-cols-2 gap-5">
            {sites.map(site => (
              <div key={site.id} className="bg-fm-surface p-8 rounded-xl border border-fm-border shadow-fm relative overflow-hidden group">
                <button
                  type="button"
                  onClick={() => handleDeleteItem('sites', site.id, setSites)}
                  className="absolute top-5 right-5 p-2 text-fm-muted hover:text-red-600 rounded-lg opacity-0 group-hover:opacity-100 z-20 transition-opacity"
                  aria-label="Delete site"
                >
                  <Trash2 size={18} />
                </button>
                <div className="flex justify-between items-start gap-4 mb-6">
                  <div className="p-4 bg-fm-canvas text-fm-accent rounded-xl border border-fm-border"><MapPin size={28} /></div>
                  <div className="text-right min-w-0">
                    <span className="text-[10px] font-semibold text-fm-muted uppercase tracking-wider block mb-1">WhatsApp join code</span>
                    <div className="inline-flex items-center gap-2 px-3 py-2 bg-fm-navy text-white rounded-lg font-mono text-sm font-semibold">
                      <Hash size={14} className="text-fm-accent shrink-0" />
                      <span className="truncate">{site.code}</span>
                    </div>
                  </div>
                </div>
                <h3 className="text-xl font-bold text-fm-ink mb-1">{site.name}</h3>
                <p className="text-fm-muted text-sm">{site.location}</p>
                <div className="mt-6 pt-5 border-t border-fm-border flex items-center gap-2 text-xs font-semibold text-fm-success uppercase tracking-wide">
                  <CheckCircle size={14} />
                  Active site
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {showAddSR && (
        <div className="fixed inset-0 z-[1000] bg-fm-navy/55 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={async (e) => { e.preventDefault(); const fd = new FormData(e.currentTarget); await handleAddItem('service_requests', { id: generateServiceRequestId(), title: fd.get('title'), description: fd.get('description'), site_id: fd.get('site_id') || null, status: SRStatus.NEW, source: SRSource.WEB, created_at: new Date().toISOString() }, setSrs, () => setShowAddSR(false)); }} className="bg-fm-surface w-full max-w-lg rounded-2xl p-8 shadow-fm border border-fm-border space-y-6 fm-animate-in">
            <div className="flex justify-between items-start gap-4">
              <div>
                <p className="text-xs font-semibold text-fm-accent uppercase tracking-wider">Work order</p>
                <h3 className="text-xl font-bold text-fm-ink mt-0.5">Log internal request</h3>
              </div>
              <button type="button" onClick={() => setShowAddSR(false)} className="p-2 rounded-lg hover:bg-fm-canvas text-fm-muted" aria-label="Close"><X size={22} /></button>
            </div>
            <div className="space-y-3">
              <input required name="title" className="w-full bg-fm-canvas border border-fm-border rounded-xl p-4 outline-none font-medium focus:border-fm-accent focus:ring-2 focus:ring-fm-accent/15 text-fm-ink" placeholder="Short summary (e.g. Lobby AC weak)" />
              <textarea name="description" className="w-full bg-fm-canvas border border-fm-border rounded-xl p-4 outline-none text-sm min-h-[120px] focus:border-fm-accent focus:ring-2 focus:ring-fm-accent/15 text-fm-ink" placeholder="Details, location in building, priority notes…" />
              <select name="site_id" className="w-full bg-fm-canvas border border-fm-border rounded-xl p-4 outline-none font-medium text-fm-ink focus:border-fm-accent">
                <option value="">Select site (optional)</option>
                {sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <button type="submit" disabled={isLoading} className="w-full bg-fm-accent text-white py-4 rounded-xl font-semibold hover:opacity-90 disabled:opacity-50">{isLoading ? <Loader2 className="animate-spin mx-auto" /> : 'Create work order'}</button>
          </form>
        </div>
      )}

      {showAddSite && (
        <div className="fixed inset-0 z-[1000] bg-fm-navy/55 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={(e) => { e.preventDefault(); const fd = new FormData(e.currentTarget); handleAddItem('sites', { name: fd.get('name'), location: fd.get('location'), code: `SITE-${Math.floor(1000 + Math.random() * 9000)}`, status: Status.ACTIVE }, setSites, () => setShowAddSite(false)); }} className="bg-fm-surface w-full max-w-md rounded-2xl p-8 shadow-fm border border-fm-border space-y-6 fm-animate-in">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-semibold text-fm-accent uppercase tracking-wider">Portfolio</p>
                <h3 className="text-xl font-bold text-fm-ink mt-0.5">Add site</h3>
              </div>
              <button type="button" onClick={() => setShowAddSite(false)} className="p-2 rounded-lg hover:bg-fm-canvas text-fm-muted"><X size={22} /></button>
            </div>
            <div className="space-y-3">
              <input required name="name" className="w-full bg-fm-canvas border border-fm-border rounded-xl p-4 outline-none font-medium focus:border-fm-accent text-fm-ink" placeholder="Site name" />
              <input required name="location" className="w-full bg-fm-canvas border border-fm-border rounded-xl p-4 outline-none font-medium focus:border-fm-accent text-fm-ink" placeholder="Address / region" />
            </div>
            <button type="submit" disabled={isLoading} className="w-full bg-fm-navy text-white py-4 rounded-xl font-semibold hover:bg-slate-800 disabled:opacity-50">Save site</button>
          </form>
        </div>
      )}

      {showApproveModal && (
        <div className="fixed inset-0 z-[1000] bg-fm-navy/55 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={async (e) => { e.preventDefault(); await handleApproveTenant(showApproveModal, new FormData(e.currentTarget)); }} className="bg-fm-surface w-full max-w-lg rounded-2xl p-8 shadow-fm border border-fm-border space-y-6 fm-animate-in">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-semibold text-fm-accent uppercase tracking-wider">Resident</p>
                <h3 className="text-xl font-bold text-fm-ink mt-0.5">Activate access</h3>
              </div>
              <button type="button" onClick={() => setShowApproveModal(null)} className="p-2 rounded-lg hover:bg-fm-canvas text-fm-muted"><X size={22} /></button>
            </div>
            <div className="p-4 bg-fm-canvas border border-fm-border rounded-xl flex items-center gap-3 text-fm-ink">
              <Phone size={22} className="text-fm-accent shrink-0" />
              <span className="font-mono font-semibold">{formatPhoneDisplay(showApproveModal.phone)}</span>
            </div>
            <div className="space-y-3">
              <input required name="name" className="w-full bg-fm-canvas border border-fm-border rounded-xl p-4 outline-none font-medium focus:border-fm-accent text-fm-ink" placeholder="Full name" />
              <select required name="site_id" className="w-full bg-fm-canvas border border-fm-border rounded-xl p-4 outline-none font-medium text-fm-ink focus:border-fm-accent">
                <option value="">Assign to site…</option>
                {sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <button type="submit" disabled={isLoading} className="w-full bg-fm-success text-white py-4 rounded-xl font-semibold hover:opacity-90 disabled:opacity-50">
              {isLoading ? <Loader2 className="animate-spin mx-auto" /> : 'Confirm activation'}
            </button>
          </form>
        </div>
      )}
    </Layout>
  );
};

export default App;

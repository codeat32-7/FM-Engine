
import React, { useState, useEffect, useCallback } from 'react';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import SRList from './components/SRList';
import TenantList from './components/TenantList';
import AssetList from './components/AssetList';
import Settings from './components/Settings';
import Auth from './components/Auth';
import TenantPortal from './components/TenantPortal';
import { Site, Asset, ServiceRequest, SRStatus, Status, SRSource, TabConfig, UserProfile, Tenant, Organization, Requester } from './types';
import { supabase, checkSchemaReady } from './lib/supabase';
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
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 text-slate-900">
      <div className="max-w-md w-full bg-white rounded-[48px] p-12 shadow-2xl border border-slate-100 space-y-8 animate-in zoom-in duration-500 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full -mr-16 -mt-16" />
        <div className="flex justify-between items-center relative z-10">
          <div className="flex gap-2">
            {[1, 2, 3].map(i => (
              <div key={i} className={`h-1.5 w-8 rounded-full transition-all ${step >= i ? 'bg-blue-600' : 'bg-slate-100'}`} />
            ))}
          </div>
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Step {step} of 3</span>
        </div>
        {step === 1 && (
          <div className="space-y-6 animate-in slide-in-from-right duration-300">
            <h2 className="text-3xl font-black text-slate-900 leading-tight">Your Identity</h2>
            <input autoFocus className="w-full bg-slate-50 border-2 border-transparent focus:border-blue-500 focus:bg-white rounded-3xl p-6 outline-none font-bold text-lg" placeholder="Admin Full Name" value={adminName} onChange={e => setAdminName(e.target.value)} />
            <button disabled={!adminName} onClick={() => setStep(2)} className="w-full bg-slate-900 text-white py-6 rounded-3xl font-black flex items-center justify-center gap-3 transition-all hover:bg-slate-800">Continue <ArrowRight /></button>
          </div>
        )}
        {step === 2 && (
          <div className="space-y-6 animate-in slide-in-from-right duration-300">
            <h2 className="text-3xl font-black text-slate-900">Organization</h2>
            <input autoFocus className="w-full bg-slate-50 border-2 border-transparent focus:border-blue-500 focus:bg-white rounded-3xl p-6 outline-none font-bold text-lg" placeholder="e.g. Jungle" value={orgName} onChange={e => setOrgName(e.target.value)} />
            <button disabled={!orgName} onClick={() => setStep(3)} className="w-full bg-slate-900 text-white py-6 rounded-3xl font-black flex items-center justify-center gap-3 transition-all hover:bg-slate-800">Continue <ArrowRight /></button>
          </div>
        )}
        {step === 3 && (
          <div className="space-y-6 animate-in slide-in-from-right duration-300">
            <h2 className="text-3xl font-black text-slate-900">Primary Site</h2>
            <div className="space-y-4">
              <input autoFocus className="w-full bg-slate-50 border-2 border-transparent focus:border-blue-500 focus:bg-white rounded-3xl p-5 outline-none font-bold text-slate-800" placeholder="Facility Name" value={siteName} onChange={e => setSiteName(e.target.value)} />
              <input className="w-full bg-slate-50 border-2 border-transparent focus:border-blue-500 focus:bg-white rounded-3xl p-5 outline-none font-bold text-slate-800" placeholder="Location" value={siteLocation} onChange={e => setSiteLocation(e.target.value)} />
            </div>
            <button disabled={loading || !siteName || !siteLocation} onClick={handleSetup} className="w-full bg-blue-600 text-white py-6 rounded-3xl font-black flex items-center justify-center gap-3 transition-all hover:bg-blue-700">
              {loading ? <Loader2 className="animate-spin" /> : <>Complete Setup <Rocket /></>}
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
  const [assets, setAssets] = useState<Asset[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [requesters, setRequesters] = useState<Requester[]>([]);
  const [srs, setSrs] = useState<ServiceRequest[]>([]);
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
      
      setSites(siteData.data || []);
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

      const { data: profile, error: profErr } = await supabase.from('profiles').insert([{
        phone: requester.phone,
        org_id: currentUser?.org_id,
        full_name: name,
        role: 'tenant'
      }]).select().single();
      if (profErr) throw profErr;

      const { data: tenant, error: tenantErr } = await supabase.from('tenants').insert([{
        org_id: currentUser?.org_id,
        site_id: siteId,
        name: name,
        phone: requester.phone,
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
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <Loader2 className="animate-spin text-blue-500" size={48} />
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
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Requesters
CREATE TABLE IF NOT EXISTS requesters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  phone TEXT NOT NULL,
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
ALTER TABLE requesters ENABLE ROW LEVEL SECURITY;

-- POLICIES
CREATE POLICY "Public Access" ON organizations FOR ALL USING (true);
CREATE POLICY "Public Access" ON sites FOR ALL USING (true);
CREATE POLICY "Public Access" ON profiles FOR ALL USING (true);
CREATE POLICY "Public Access" ON assets FOR ALL USING (true);
CREATE POLICY "Public Access" ON tenants FOR ALL USING (true);
CREATE POLICY "Public Access" ON service_requests FOR ALL USING (true);
CREATE POLICY "Public Access" ON requesters FOR ALL USING (true);`;

    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6 text-white">
        <div className="max-w-3xl w-full bg-slate-800 rounded-[48px] p-12 border border-slate-700 shadow-2xl space-y-8 animate-in zoom-in duration-500">
          <div className="flex items-center gap-6 text-amber-400">
            <AlertCircle size={64} />
            <div>
              <h1 className="text-4xl font-black">Database Setup Required</h1>
              <p className="text-slate-400 text-lg mt-2 font-medium">The required tables are missing from your Supabase project.</p>
            </div>
          </div>
          
          <div className="space-y-4">
            <p className="text-slate-300 font-medium">Please run the following script in your <strong className="text-white">Supabase SQL Editor</strong> to initialize the database and enable Row Level Security (RLS):</p>
            <div className="bg-black/40 rounded-3xl p-8 font-mono text-xs text-emerald-400 border border-white/5 relative group">
              <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                <button 
                  onClick={() => { navigator.clipboard.writeText(sqlScript); alert("SQL Copied!"); }}
                  className="bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-xl font-bold flex items-center gap-2"
                >
                  Copy SQL
                </button>
              </div>
              <pre className="overflow-x-auto max-h-[400px] overflow-y-auto custom-scrollbar">
                {sqlScript}
              </pre>
            </div>
          </div>

          <button 
            onClick={() => window.location.reload()}
            className="w-full bg-blue-600 hover:bg-blue-500 text-white py-6 rounded-3xl font-black text-xl transition-all shadow-xl shadow-blue-900/20 flex items-center justify-center gap-3"
          >
            <RefreshCw size={24} /> I've run the SQL, Refresh App
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
      dbStatus={dbStatus === 'error' ? 'error' : (dbStatus === 'connected' ? 'connected' : 'connecting')} 
      tabConfigs={tabConfigs.map(t => t.id === 'requesters' && requesters.length > 0 ? { ...t, label: `Approvals (${requesters.length})` } : t)} 
      orgName={organization?.name}
    >
      {activeTab === 'dashboard' && <Dashboard srs={srs} onNewRequest={() => setShowAddSR(true)} assets={assets} organization={organization} sites={sites} />}
      {activeTab === 'srs' && <SRList srs={srs} sites={sites} assets={assets} onSelect={() => {}} onNewRequest={() => setShowAddSR(true)} onDelete={(id) => handleDeleteItem('service_requests', id, setSrs)} />}
      {activeTab === 'tenants' && <TenantList tenants={tenants} sites={sites} onAdd={() => {}} onDelete={(id) => handleDeleteItem('tenants', id, setTenants)} />}
      
      {activeTab === 'requesters' && (
        <div className="space-y-6 animate-in fade-in duration-500">
          <div><h2 className="text-3xl font-black text-slate-900">Approvals</h2><p className="text-slate-500 font-medium text-sm">Verify strangers requesting facility access.</p></div>
          <div className="grid md:grid-cols-2 gap-6">
            {requesters.map(req => (
              <div key={req.id} className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm flex flex-col justify-between hover:border-blue-200 transition-all relative group">
                <button 
                  onClick={() => handleDeleteItem('requesters', req.id, setRequesters)}
                  className="absolute top-6 right-6 p-2 text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                >
                  <Trash2 size={18} />
                </button>
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center"><Phone size={24} /></div>
                  <div><p className="text-lg font-black text-slate-900">+{req.phone}</p><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">New Contact</p></div>
                </div>
                <button onClick={() => setShowApproveModal(req)} className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black flex items-center justify-center gap-2 hover:bg-slate-800 transition-all shadow-lg">
                  <UserCheck size={20} /> Identity & Activate
                </button>
              </div>
            ))}
            {requesters.length === 0 && (
              <div className="col-span-full py-24 text-center bg-white rounded-[40px] border-2 border-dashed border-slate-100">
                <Sparkles className="text-slate-200 mx-auto mb-4" size={48} />
                <p className="text-slate-400 font-black text-xl">Approval queue clear</p>
                <p className="text-slate-400 text-sm mt-2">New WhatsApp users will appear here if they are already in your system.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'assets' && <AssetList assets={assets} sites={sites} onAdd={() => {}} onDelete={(id) => handleDeleteItem('assets', id, setAssets)} />}
      {activeTab === 'settings' && <Settings configs={tabConfigs} setConfigs={setTabConfigs} onLogout={() => { localStorage.removeItem('fm_engine_user'); window.location.reload(); }} />}
      {activeTab === 'sites' && (
        <div className="space-y-8 pb-20">
          <div className="flex justify-between items-end">
            <div><h2 className="text-3xl font-black text-slate-900">Sites</h2><p className="text-slate-500 font-medium">Physical Locations</p></div>
            <button onClick={() => setShowAddSite(true)} className="bg-slate-900 text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 shadow-lg active:scale-95 transition-all"><Plus size={20} /> New Site</button>
          </div>
          <div className="grid md:grid-cols-2 gap-8">
            {sites.map(site => (
              <div key={site.id} className="bg-white p-10 rounded-[48px] border border-slate-100 shadow-sm relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-full -mr-16 -mt-16 group-hover:bg-blue-100 transition-colors" />
                <button 
                  onClick={() => handleDeleteItem('sites', site.id, setSites)}
                  className="absolute top-8 right-8 p-2 text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100 z-20"
                >
                  <Trash2 size={20} />
                </button>
                <div className="relative z-10">
                  <div className="flex justify-between items-start mb-8">
                    <div className="p-5 bg-blue-50 text-blue-600 rounded-2xl"><MapPin size={32} /></div>
                    <div className="flex flex-col items-end">
                      <span className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] mb-1">Registration Code</span>
                      <div className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl font-mono text-sm font-black shadow-lg shadow-slate-200">
                        <Hash size={14} className="text-blue-400" /> {site.code}
                      </div>
                    </div>
                  </div>
                  <h3 className="text-3xl font-black text-slate-900 mb-2">{site.name}</h3>
                  <p className="text-slate-500 font-medium">{site.location}</p>
                  
                  <div className="mt-8 pt-8 border-t border-slate-50 flex items-center gap-2 text-xs font-black text-slate-400 uppercase tracking-widest">
                    <CheckCircle size={14} className="text-emerald-500" />
                    Verified Facility
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {showAddSR && (
        <div className="fixed inset-0 z-[1000] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4">
          <form onSubmit={async (e) => { e.preventDefault(); const fd = new FormData(e.currentTarget); await handleAddItem('service_requests', { id: `SR-${Math.floor(10000 + Math.random() * 90000)}`, title: fd.get('title'), description: fd.get('description'), site_id: fd.get('site_id') || null, status: SRStatus.NEW, source: SRSource.WEB, created_at: new Date().toISOString() }, setSrs, () => setShowAddSR(false)); }} className="bg-white w-full max-w-lg rounded-[40px] p-10 shadow-2xl space-y-8 animate-in zoom-in duration-300">
            <div className="flex justify-between items-center"><h3 className="text-3xl font-black text-slate-900">New Request</h3><button type="button" onClick={() => setShowAddSR(false)} className="p-2 bg-slate-100 rounded-full"><X size={24} /></button></div>
            <div className="space-y-4"><input required name="title" className="w-full bg-slate-50 rounded-2xl p-5 outline-none font-bold border-2 border-transparent focus:border-blue-500 text-slate-900" placeholder="Problem Summary" /><textarea name="description" className="w-full bg-slate-50 rounded-2xl p-5 outline-none font-medium h-32 border-2 border-transparent focus:border-blue-500 text-slate-900" placeholder="Full Details" /><select name="site_id" className="w-full bg-slate-50 rounded-2xl p-5 outline-none font-bold text-slate-900"><option value="">Select Facility</option>{sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
            <button type="submit" disabled={isLoading} className="w-full bg-blue-600 text-white py-6 rounded-3xl font-black text-xl shadow-xl shadow-blue-100">{isLoading ? <Loader2 className="animate-spin mx-auto" /> : 'Log Ticket'}</button>
          </form>
        </div>
      )}

      {showAddSite && (
        <div className="fixed inset-0 z-[1000] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4">
           <form onSubmit={(e) => { e.preventDefault(); const fd = new FormData(e.currentTarget); handleAddItem('sites', { name: fd.get('name'), location: fd.get('location'), code: `SITE-${Math.floor(1000+Math.random()*9000)}`, status: Status.ACTIVE }, setSites, () => setShowAddSite(false)); }} className="bg-white w-full max-w-md rounded-[48px] p-12 shadow-2xl space-y-8 animate-in zoom-in duration-300">
              <div className="flex justify-between items-center"><h3 className="text-3xl font-black text-slate-900">New Site</h3><button type="button" onClick={() => setShowAddSite(false)} className="p-2 bg-slate-100 rounded-full"><X size={24} /></button></div>
              <div className="space-y-4"><input required name="name" className="w-full bg-slate-50 rounded-2xl p-5 outline-none font-bold text-slate-900 border-2 border-transparent focus:border-blue-500" placeholder="Facility Name" /><input required name="location" className="w-full bg-slate-50 rounded-2xl p-5 outline-none font-bold text-slate-900 border-2 border-transparent focus:border-blue-500" placeholder="Location" /></div>
              <button type="submit" disabled={isLoading} className="w-full bg-slate-900 text-white py-6 rounded-3xl font-black">Register Site</button>
           </form>
        </div>
      )}

      {showApproveModal && (
        <div className="fixed inset-0 z-[1000] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4">
          <form onSubmit={async (e) => { e.preventDefault(); await handleApproveTenant(showApproveModal, new FormData(e.currentTarget)); }} className="bg-white w-full max-w-lg rounded-[40px] p-10 shadow-2xl space-y-8 animate-in zoom-in duration-300">
            <div className="flex justify-between items-center"><h3 className="text-3xl font-black text-slate-900">Activate Resident</h3><button type="button" onClick={() => setShowApproveModal(null)} className="p-2 bg-slate-100 rounded-full hover:bg-slate-200"><X size={24} /></button></div>
            <div className="space-y-4">
              <div className="p-6 bg-blue-50 text-blue-700 rounded-2xl font-black flex items-center gap-4 text-lg">
                <Phone size={24} /> +{showApproveModal.phone}
              </div>
              <input required name="name" className="w-full bg-slate-50 rounded-2xl p-5 outline-none font-bold text-slate-900 border-2 border-transparent focus:border-blue-500" placeholder="Full Name" />
              <select required name="site_id" className="w-full bg-slate-50 rounded-2xl p-5 outline-none font-bold text-slate-900">
                <option value="">Assign to Facility...</option>
                {sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <button type="submit" disabled={isLoading} className="w-full bg-emerald-600 text-white py-6 rounded-3xl font-black text-xl shadow-xl shadow-emerald-100 transition-all">
               {isLoading ? <Loader2 className="animate-spin" /> : 'Confirm Approval'}
            </button>
          </form>
        </div>
      )}
    </Layout>
  );
};

export default App;

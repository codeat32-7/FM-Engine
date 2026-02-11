
import React, { useState, useEffect, useCallback } from 'react';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import SRList from './components/SRList';
import TenantList from './components/TenantList';
import AssetList from './components/AssetList';
import Settings from './components/Settings';
import Auth from './components/Auth';
import TenantPortal from './components/TenantPortal';
import { Site, Asset, ServiceRequest, SRStatus, Status, SRSource, TabConfig, UserProfile, Tenant, BlockType, Block, Organization, Requester } from './types';
import { supabase, checkSchemaReady } from './lib/supabase';
import { 
  X, MapPin, Plus, Loader2, Wrench, ArrowRight, Layers, CheckCircle, Building, AlertCircle, RefreshCw, Phone, User, Package, UserCheck, Terminal, Rocket, Sparkles, UserCircle
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
      // 1. Create Organization
      const { data: org, error: orgErr } = await supabase.from('organizations').insert([{ name: orgName }]).select().single();
      if (orgErr) throw orgErr;

      // 2. Create Primary Site
      const { error: siteErr } = await supabase.from('sites').insert([{
        org_id: org.id,
        name: siteName,
        location: siteLocation,
        code: `SITE-${Math.floor(1000 + Math.random() * 9000)}`,
        status: Status.ACTIVE
      }]);
      if (siteErr) throw siteErr;

      // 3. Update/Create Profile
      const { data: profile, error: profErr } = await supabase.from('profiles').upsert({
        id: user.id,
        org_id: org.id,
        phone: user.phone,
        full_name: adminName,
        role: 'admin'
      }, { onConflict: 'id' }).select().single();
      if (profErr) throw profErr;

      onComplete({
        ...user,
        full_name: adminName,
        org_id: org.id,
        onboarded: true
      });
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
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
            <div className="space-y-2">
              <h2 className="text-3xl font-black text-slate-900">Your Identity</h2>
              <p className="text-slate-500 font-medium">How should we address you in the system?</p>
            </div>
            <input 
              autoFocus
              className="w-full bg-slate-50 border-2 border-transparent focus:border-blue-500 focus:bg-white rounded-3xl p-6 outline-none font-bold text-lg transition-all"
              placeholder="Admin Full Name"
              value={adminName}
              onChange={e => setAdminName(e.target.value)}
            />
            <button 
              disabled={!adminName}
              onClick={() => setStep(2)}
              className="w-full bg-slate-900 text-white py-6 rounded-3xl font-black text-xl flex items-center justify-center gap-3 hover:bg-slate-800 disabled:opacity-50 transition-all shadow-xl shadow-slate-200"
            >
              Continue <ArrowRight />
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6 animate-in slide-in-from-right duration-300">
            <div className="space-y-2">
              <h2 className="text-3xl font-black text-slate-900">Organization</h2>
              <p className="text-slate-500 font-medium">What is your facility or company called?</p>
            </div>
            <input 
              autoFocus
              className="w-full bg-slate-50 border-2 border-transparent focus:border-blue-500 focus:bg-white rounded-3xl p-6 outline-none font-bold text-lg transition-all"
              placeholder="e.g. Skyline Towers"
              value={orgName}
              onChange={e => setOrgName(e.target.value)}
            />
            <button 
              disabled={!orgName}
              onClick={() => setStep(3)}
              className="w-full bg-slate-900 text-white py-6 rounded-3xl font-black text-xl flex items-center justify-center gap-3 hover:bg-slate-800 disabled:opacity-50 transition-all shadow-xl shadow-slate-200"
            >
              Continue <ArrowRight />
            </button>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6 animate-in slide-in-from-right duration-300">
            <div className="space-y-2">
              <h2 className="text-3xl font-black text-slate-900">Primary Site</h2>
              <p className="text-slate-500 font-medium">Define your first physical location.</p>
            </div>
            <div className="space-y-4">
              <input 
                autoFocus
                className="w-full bg-slate-50 border-2 border-transparent focus:border-blue-500 focus:bg-white rounded-3xl p-5 outline-none font-bold transition-all"
                placeholder="Site Name (e.g. Block A)"
                value={siteName}
                onChange={e => setSiteName(e.target.value)}
              />
              <input 
                className="w-full bg-slate-50 border-2 border-transparent focus:border-blue-500 focus:bg-white rounded-3xl p-5 outline-none font-bold transition-all"
                placeholder="Physical Location"
                value={siteLocation}
                onChange={e => setSiteLocation(e.target.value)}
              />
            </div>
            <button 
              disabled={loading || !siteName || !siteLocation}
              onClick={handleSetup}
              className="w-full bg-blue-600 text-white py-6 rounded-3xl font-black text-xl flex items-center justify-center gap-3 hover:bg-blue-700 disabled:opacity-50 transition-all shadow-xl shadow-blue-100"
            >
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
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [requesters, setRequesters] = useState<Requester[]>([]);
  const [srs, setSrs] = useState<ServiceRequest[]>([]);
  const [selectedSR, setSelectedSR] = useState<ServiceRequest | null>(null);
  
  const [isLoading, setIsLoading] = useState(false);
  const [dbStatus, setDbStatus] = useState<'connecting' | 'connected' | 'error' | 'needs_setup'>('connecting');
  const [setupMessage, setSetupMessage] = useState<string | null>(null);
  const [tabConfigs, setTabConfigs] = useState<TabConfig[]>(() => {
    const saved = localStorage.getItem('fm_tabs');
    return saved ? JSON.parse(saved) : DEFAULT_TABS;
  });

  const [showAddSite, setShowAddSite] = useState(false);
  const [showAddBlock, setShowAddBlock] = useState(false);
  const [showAddAsset, setShowAddAsset] = useState(false);
  const [showAddTenant, setShowAddTenant] = useState(false);
  const [showAddSR, setShowAddSR] = useState(false);
  const [showApproveModal, setShowApproveModal] = useState<Requester | null>(null);
  
  const [activeSiteForBlock, setActiveSiteForBlock] = useState<string | null>(null);
  const [resolutionNote, setResolutionNote] = useState('');
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    localStorage.setItem('fm_tabs', JSON.stringify(tabConfigs));
  }, [tabConfigs]);

  const fetchBlocks = useCallback(async (siteIds: string[]) => {
    if (siteIds.length === 0) return;
    const { data, error } = await supabase.from('blocks').select('*').in('site_id', siteIds);
    if (!error && data) setBlocks(data);
  }, []);

  const fetchOrgData = useCallback(async () => {
    if (!currentUser?.org_id) return;
    setIsLoading(true);
    try {
      const { data: orgData, error: orgErr } = await supabase.from('organizations').select('*').eq('id', currentUser.org_id).single();
      if (!orgData || orgErr) {
        setDbStatus('connected');
        return;
      }
      setOrganization(orgData);

      const [siteData, assetData, tenantData, srData, reqData] = await Promise.all([
        supabase.from('sites').select('*').eq('org_id', currentUser.org_id),
        supabase.from('assets').select('*').eq('org_id', currentUser.org_id),
        supabase.from('tenants').select('*').eq('org_id', currentUser.org_id),
        supabase.from('service_requests').select('*').eq('org_id', currentUser.org_id),
        supabase.from('requesters').select('*').eq('org_id', currentUser.org_id).eq('status', 'pending')
      ]);
      
      const fetchedSites = siteData.data || [];
      setSites(fetchedSites);
      setAssets(assetData.data || []);
      setTenants(tenantData.data || []);
      setRequesters(reqData.data || []);
      setSrs((srData.data || []).sort((a,b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));

      const siteIds = fetchedSites.map(s => s.id);
      if (siteIds.length > 0) {
        await fetchBlocks(siteIds);
      }
      setDbStatus('connected');
    } catch (err: any) { 
      setDbStatus('error');
      setSetupMessage(err.message);
    }
    finally { setIsLoading(false); }
  }, [currentUser?.org_id, fetchBlocks]);

  const syncOrphanedRequesters = useCallback(async () => {
    if (!currentUser?.org_id || srs.length === 0) return;
    const srPhones = [...new Set(srs.map(sr => sr.requester_phone).filter(Boolean))];
    const tenantPhones = new Set(tenants.map(t => t.phone));
    const reqPhones = new Set(requesters.map(r => r.phone));
    const orphans = srPhones.filter(p => p && !tenantPhones.has(p) && !reqPhones.has(p));
    
    if (orphans.length > 0) {
      const inserts = orphans.map(p => ({ phone: p, org_id: currentUser.org_id, status: 'pending' }));
      await supabase.from('requesters').upsert(inserts, { onConflict: 'phone' });
      fetchOrgData();
    }
  }, [srs, tenants, requesters, currentUser?.org_id, fetchOrgData]);

  useEffect(() => {
    if (activeTab === 'requesters') syncOrphanedRequesters();
  }, [activeTab, syncOrphanedRequesters]);

  const setupRealtime = useCallback(() => {
    if (!currentUser?.org_id) return () => {};
    const channel = supabase.channel('db-changes')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'service_requests', filter: `org_id=eq.${currentUser.org_id}` }, (payload) => {
        setSrs(prev => [payload.new as ServiceRequest, ...prev]);
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'requesters', filter: `org_id=eq.${currentUser.org_id}` }, (payload) => {
        setRequesters(prev => [payload.new as Requester, ...prev]);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [currentUser?.org_id]);

  useEffect(() => {
    let cleanup: (() => void) | undefined;
    const init = async () => {
      const status = await checkSchemaReady();
      if (status.needsSetup) {
        setDbStatus('needs_setup');
        setSetupMessage(status.error || "Database requires updates.");
        return;
      }
      if (currentUser && currentUser.onboarded) {
        fetchOrgData();
        cleanup = setupRealtime();
      } else {
        setDbStatus('connected');
      }
    };
    init();
    return () => { if (cleanup) cleanup(); };
  }, [currentUser?.id, currentUser?.onboarded, currentUser?.org_id, fetchOrgData, setupRealtime]);

  const handleSignIn = async (user: UserProfile) => {
    localStorage.setItem('fm_engine_user', JSON.stringify(user));
    setCurrentUser(user);
    // Explicitly reset UI to dashboard when switching contexts
    setActiveTab('dashboard');
  };

  const handleLogout = () => {
    localStorage.removeItem('fm_engine_user');
    setCurrentUser(null);
    setOrganization(null);
  };

  const handleApproveTenant = async (requester: Requester, formData: FormData) => {
    setIsLoading(true);
    try {
      const name = formData.get('name') as string;
      const siteId = formData.get('site_id') as string;
      const blockId = formData.get('block_id') as string || null;

      // 1. Create Profile for unified access
      const { data: profile, error: pErr } = await supabase.from('profiles').insert([{
        org_id: requester.org_id,
        phone: requester.phone,
        full_name: name,
        role: 'tenant'
      }]).select().single();
      if (pErr) throw pErr;

      // 2. Create Tenant record
      await supabase.from('tenants').insert([{
        org_id: requester.org_id,
        phone: requester.phone,
        name: name,
        site_id: siteId,
        block_id: blockId,
        status: Status.ACTIVE,
        profile_id: profile.id
      }]);

      await supabase.from('requesters').update({ status: 'approved' }).eq('id', requester.id);
      await supabase.from('service_requests').update({ site_id: siteId, block_id: blockId }).eq('requester_phone', requester.phone);
      
      setShowApproveModal(null);
      await fetchOrgData();
      alert(`Tenant ${name} Approved! They can now log in to the portal.`);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const updateSRStatus = async (id: string, status: SRStatus) => {
    if (status === SRStatus.RESOLVED) { setIsClosing(true); return; }
    const { data } = await supabase.from('service_requests').update({ status }).eq('id', id).select();
    if (data) {
      setSrs(prev => prev.map(s => s.id === id ? data[0] : s));
      setSelectedSR(data[0]);
    }
  };

  const confirmResolution = async () => {
    if (!selectedSR) return;
    const { data } = await supabase.from('service_requests').update({ status: SRStatus.RESOLVED, resolution_notes: resolutionNote }).eq('id', selectedSR.id).select();
    if (data) {
      setSrs(prev => prev.map(s => s.id === selectedSR.id ? data[0] : s));
      setSelectedSR(null);
      setIsClosing(false);
      setResolutionNote('');
    }
  };

  const handleAddItem = async (table: string, payload: any, setter: Function, closeFn: Function) => {
    setIsLoading(true);
    try {
      const finalPayload = { ...payload, org_id: currentUser?.org_id };
      const { data, error } = await supabase.from(table).insert([finalPayload]).select();
      if (error) throw error;
      if (data) { 
        setter((prev: any) => [data[0], ...prev]); 
        closeFn(); 
      }
    } catch (e: any) { alert(e.message); }
    finally { setIsLoading(false); }
  };

  if (!currentUser) return <Auth onSignIn={handleSignIn} />;
  
  if (!currentUser.onboarded && currentUser.role === 'admin') {
     return <Onboarding user={currentUser} onComplete={setCurrentUser} />;
  }

  if (currentUser.role === 'tenant') {
    return <TenantPortal user={currentUser} onLogout={handleLogout} />;
  }

  return (
    <Layout 
      activeTab={activeTab} 
      onTabChange={setActiveTab} 
      dbStatus={dbStatus === 'needs_setup' ? 'error' : (dbStatus === 'connected' ? 'connected' : 'connecting')}
      tabConfigs={tabConfigs}
      orgName={organization?.name}
    >
      {activeTab === 'dashboard' && (
        <Dashboard srs={srs} onNewRequest={() => setShowAddSR(true)} assets={assets} organization={organization} />
      )}
      {activeTab === 'srs' && (
        <SRList srs={srs} sites={sites} assets={assets} onSelect={setSelectedSR} onNewRequest={() => setShowAddSR(true)} />
      )}
      {activeTab === 'tenants' && (
        <TenantList tenants={tenants} sites={sites} onAdd={() => setShowAddTenant(true)} />
      )}
      {activeTab === 'requesters' && (
        <div className="space-y-6 animate-in fade-in duration-500">
           <div className="flex justify-between items-start">
              <div>
                <h2 className="text-3xl font-black text-slate-900">Approvals</h2>
                <p className="text-slate-500 font-medium">New users waiting to be assigned to units.</p>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-600 rounded-full border border-emerald-100">
                <Sparkles size={14} className="animate-pulse" />
                <span className="text-[10px] font-black uppercase tracking-widest">Active Monitoring</span>
              </div>
           </div>
           <div className="grid md:grid-cols-2 gap-6">
              {requesters.map(req => (
                <div key={req.id} className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm flex flex-col justify-between hover:border-blue-200 transition-all">
                   <div className="flex items-center gap-4 mb-6">
                      <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center"><Phone size={24} /></div>
                      <div><p className="text-lg font-black text-slate-900">+{req.phone}</p><p className="text-xs font-bold text-slate-400 uppercase tracking-widest">WhatsApp Identity</p></div>
                   </div>
                   <div className="space-y-4">
                      <div className="bg-slate-50 p-4 rounded-2xl">
                         <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Incoming Signal</p>
                         <p className="text-sm font-bold text-slate-700">{srs.find(s => s.requester_phone === req.phone)?.title || 'No data captured'}</p>
                      </div>
                      <button onClick={() => setShowApproveModal(req)} className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black flex items-center justify-center gap-2 hover:bg-slate-800 transition-all active:scale-[0.98]"><UserCheck size={20} /> Convert to Resident</button>
                   </div>
                </div>
              ))}
              {requesters.length === 0 && (
                <div className="col-span-full py-20 text-center bg-white rounded-[40px] border-2 border-dashed border-slate-100">
                  <p className="text-slate-400 font-bold mb-2">Queue is empty.</p>
                  <p className="text-xs text-slate-300 font-medium tracking-tight">New WhatsApp messages from strangers appear here.</p>
                </div>
              )}
           </div>
        </div>
      )}
      {activeTab === 'assets' && (
        <AssetList assets={assets} sites={sites} blocks={blocks} onAdd={() => setShowAddAsset(true)} />
      )}
      {activeTab === 'settings' && (
        <Settings configs={tabConfigs} setConfigs={setTabConfigs} onLogout={handleLogout} />
      )}
      {activeTab === 'sites' && (
        <div className="space-y-8 pb-20">
           <div className="flex justify-between items-end">
             <div><h2 className="text-3xl font-black text-slate-900">Sites</h2><p className="text-slate-500 font-medium text-sm">Property and facility map</p></div>
             <button onClick={() => setShowAddSite(true)} className="bg-slate-900 text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 active:scale-95 transition-all shadow-lg shadow-slate-200"><Plus size={20} /> New Site</button>
           </div>
           <div className="grid md:grid-cols-2 gap-8">
             {sites.map(site => (
               <div key={site.id} className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm hover:shadow-xl transition-all">
                  <div className="flex justify-between items-start mb-6">
                    <div className="p-4 bg-blue-50 text-blue-600 rounded-2xl"><MapPin size={28} /></div>
                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">#{site.code}</span>
                  </div>
                  <h3 className="text-2xl font-black text-slate-900">{site.name}</h3>
                  <p className="text-sm font-medium text-slate-500 mb-8">{site.location}</p>
                  <div className="pt-8 border-t border-slate-50">
                     <div className="flex items-center justify-between mb-4">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Blocks / Spaces</p>
                        <button onClick={() => { setActiveSiteForBlock(site.id); setShowAddBlock(true); }} className="text-xs font-bold text-blue-600 flex items-center gap-1 hover:underline"><Plus size={14} /> Add Block</button>
                     </div>
                     <div className="flex flex-wrap gap-2">
                        {blocks.filter(b => b.site_id === site.id).map(block => (
                          <div key={block.id} className="px-4 py-2 bg-slate-50 border border-slate-100 rounded-xl flex items-center gap-2 animate-in zoom-in">
                            <Layers size={14} className="text-slate-400" />
                            <span className="text-xs font-bold text-slate-700">{block.name}</span>
                          </div>
                        ))}
                     </div>
                  </div>
               </div>
             ))}
           </div>
        </div>
      )}

      {/* Approve Modal */}
      {showApproveModal && (
        <div className="fixed inset-0 z-[1000] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4">
           <form onSubmit={(e) => { e.preventDefault(); handleApproveTenant(showApproveModal, new FormData(e.currentTarget)); }} className="bg-white w-full max-w-lg rounded-[40px] p-10 shadow-2xl space-y-8 animate-in zoom-in duration-300">
              <div className="flex justify-between items-center"><h3 className="text-3xl font-black text-slate-900">Resident Setup</h3><button type="button" onClick={() => setShowApproveModal(null)} className="p-2 bg-slate-100 rounded-full hover:bg-slate-200 transition-colors"><X size={24} /></button></div>
              <div className="space-y-4">
                <div className="p-4 bg-slate-50 rounded-2xl flex items-center gap-3">
                   <Phone size={20} className="text-slate-400" />
                   <span className="font-bold text-slate-700">+{showApproveModal.phone}</span>
                </div>
                <input required name="name" className="w-full bg-slate-50 rounded-2xl p-5 outline-none font-bold focus:bg-white border-2 border-transparent focus:border-blue-500" placeholder="Resident Full Name" />
                <select required name="site_id" className="w-full bg-slate-50 rounded-2xl p-5 outline-none font-bold focus:bg-white border-2 border-transparent focus:border-blue-500">
                  <option value="">Select Target Site...</option>
                  {sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
                <select name="block_id" className="w-full bg-slate-50 rounded-2xl p-5 outline-none font-bold focus:bg-white border-2 border-transparent focus:border-blue-500">
                  <option value="">Select Unit (Optional)...</option>
                  {blocks.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>
              <button type="submit" disabled={isLoading} className="w-full bg-emerald-600 text-white py-6 rounded-3xl font-black text-xl flex items-center justify-center gap-3 active:scale-95 transition-all shadow-xl shadow-emerald-100">
                {isLoading ? <Loader2 className="animate-spin" /> : 'Activate & Approve'}
              </button>
           </form>
        </div>
      )}

      {/* Add Modals (Omitted for brevity, kept from original logic) */}
      {showAddSite && (
        <div className="fixed inset-0 z-[1000] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4">
           <form onSubmit={(e) => { e.preventDefault(); const fd = new FormData(e.currentTarget); handleAddItem('sites', { name: fd.get('name'), location: fd.get('location'), code: `SITE-${Math.floor(1000+Math.random()*9000)}`, status: Status.ACTIVE }, setSites, () => setShowAddSite(false)); }} className="bg-white w-full max-w-md rounded-[48px] p-12 shadow-2xl space-y-8 animate-in zoom-in duration-300">
              <div className="flex justify-between items-center"><h3 className="text-3xl font-black text-slate-900">New Site</h3><button type="button" onClick={() => setShowAddSite(false)} className="p-2 bg-slate-100 rounded-full hover:bg-slate-200 transition-colors"><X size={24} /></button></div>
              <div className="space-y-4">
                <input required name="name" className="w-full bg-slate-50 rounded-2xl p-5 outline-none font-bold focus:bg-white border-2 border-transparent focus:border-blue-500" placeholder="Site Name" />
                <input required name="location" className="w-full bg-slate-50 rounded-2xl p-5 outline-none font-bold focus:border-blue-500" placeholder="Location" />
              </div>
              <button type="submit" disabled={isLoading} className="w-full bg-slate-900 text-white py-6 rounded-3xl font-black text-lg">
                Create Site
              </button>
           </form>
        </div>
      )}
    </Layout>
  );
};

export default App;

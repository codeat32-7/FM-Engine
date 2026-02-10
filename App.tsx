
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
  X, MapPin, Plus, Loader2, Wrench, ArrowRight, Layers, CheckCircle, Building, AlertCircle, RefreshCw, Phone, User, Package, UserCheck, Terminal, Rocket
} from 'lucide-react';

const DEFAULT_TABS: TabConfig[] = [
  { id: 'dashboard', label: 'Dashboard', iconName: 'LayoutDashboard', isVisible: true },
  { id: 'srs', label: 'Service Requests', iconName: 'Wrench', isVisible: true },
  { id: 'sites', label: 'Sites', iconName: 'MapPin', isVisible: true },
  { id: 'tenants', label: 'Tenants', iconName: 'Users', isVisible: true },
  { id: 'requesters', label: 'Approvals', iconName: 'UserCheck', isVisible: true },
  { id: 'assets', label: 'Assets', iconName: 'Package', isVisible: true },
];

const Onboarding: React.FC<{ user: UserProfile, onComplete: (org: Organization) => void }> = ({ user, onComplete }) => {
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;
    setLoading(true);
    try {
      // 1. Create Org
      const { data: org, error: orgErr } = await supabase.from('organizations').insert([{ name }]).select().single();
      if (orgErr) throw orgErr;

      // 2. Create/Update Profile
      const { error: profErr } = await supabase.from('profiles').upsert({
        id: user.id,
        org_id: org.id,
        phone: user.phone,
        full_name: user.full_name || 'Admin'
      }, { onConflict: 'id' });
      if (profErr) throw profErr;

      onComplete(org);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white rounded-[48px] p-12 shadow-2xl border border-slate-100 text-center space-y-8 animate-in zoom-in duration-500">
        <div className="w-20 h-20 bg-blue-600 rounded-3xl mx-auto flex items-center justify-center text-white shadow-xl shadow-blue-100">
          <Rocket size={40} strokeWidth={2.5} />
        </div>
        <div className="space-y-2">
          <h2 className="text-3xl font-black text-slate-900">Let's Get Started</h2>
          <p className="text-slate-500 font-medium">Create your first facility organization.</p>
        </div>
        <form onSubmit={handleSetup} className="space-y-6">
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1 text-left">Organization Name</label>
            <input 
              required
              autoFocus
              className="w-full bg-slate-50 border-2 border-transparent focus:border-blue-500 focus:bg-white rounded-3xl p-6 outline-none font-bold text-lg transition-all"
              placeholder="e.g. Cyberspace Towers"
              value={name}
              onChange={e => setName(e.target.value)}
            />
          </div>
          <button 
            disabled={loading || !name}
            className="w-full bg-slate-900 text-white py-6 rounded-3xl font-black text-xl flex items-center justify-center gap-3 hover:bg-slate-800 disabled:opacity-50 transition-all shadow-xl shadow-slate-200"
          >
            {loading ? <Loader2 className="animate-spin" /> : <>Launch Platform <ArrowRight /></>}
          </button>
        </form>
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
      const { data: orgData } = await supabase.from('organizations').select('*').eq('id', currentUser.org_id).single();
      if (orgData) setOrganization(orgData);

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

  const setupRealtime = useCallback(() => {
    if (!currentUser?.org_id) return () => {};
    
    const channel = supabase.channel('db-changes')
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'service_requests', 
        filter: `org_id=eq.${currentUser.org_id}` 
      }, (payload) => {
        setSrs(prev => [payload.new as ServiceRequest, ...prev]);
      })
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'requesters', 
        filter: `org_id=eq.${currentUser.org_id}` 
      }, (payload) => {
        setRequesters(prev => [payload.new as Requester, ...prev]);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
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
    return () => {
      if (cleanup) cleanup();
    };
  }, [currentUser?.id, currentUser?.onboarded, fetchOrgData, setupRealtime]);

  const handleSignIn = async (user: UserProfile) => {
    localStorage.setItem('fm_engine_user', JSON.stringify(user));
    setCurrentUser(user);
  };

  const handleLogout = () => {
    localStorage.removeItem('fm_engine_user');
    setCurrentUser(null);
  };

  const handleOnboardingComplete = (org: Organization) => {
    if (!currentUser) return;
    const updatedUser = { ...currentUser, org_id: org.id, onboarded: true };
    localStorage.setItem('fm_engine_user', JSON.stringify(updatedUser));
    setCurrentUser(updatedUser);
    setOrganization(org);
  };

  const handleApproveTenant = async (requester: Requester, formData: FormData) => {
    setIsLoading(true);
    try {
      const tenantData = {
        org_id: requester.org_id,
        phone: requester.phone,
        name: formData.get('name') as string,
        site_id: formData.get('site_id') as string,
        block_id: (formData.get('block_id') as string) || null,
        status: Status.ACTIVE
      };

      const { data: newTenant, error: tErr } = await supabase.from('tenants').insert([tenantData]).select().single();
      if (tErr) throw tErr;

      await supabase.from('requesters').update({ status: 'approved' }).eq('id', requester.id);
      
      await supabase.from('service_requests')
        .update({ site_id: tenantData.site_id, block_id: tenantData.block_id })
        .eq('requester_phone', requester.phone);
      
      setShowApproveModal(null);
      await fetchOrgData();
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
  if (currentUser.role === 'tenant') return <TenantPortal user={currentUser} onLogout={handleLogout} />;
  
  // New Onboarding Logic
  if (!currentUser.onboarded) return <Onboarding user={currentUser} onComplete={handleOnboardingComplete} />;

  return (
    <Layout 
      activeTab={activeTab} 
      onTabChange={setActiveTab} 
      dbStatus={dbStatus === 'needs_setup' ? 'error' : (dbStatus === 'connected' ? 'connected' : 'connecting')}
      tabConfigs={tabConfigs}
      orgName={organization?.name}
    >
      {dbStatus === 'needs_setup' && (
        <div className="bg-amber-50 border-2 border-amber-200 rounded-[32px] p-8 mb-8 animate-in slide-in-from-top duration-500">
           <div className="flex items-start gap-4 text-amber-900">
              <AlertCircle className="shrink-0 mt-1" size={24} />
              <div className="space-y-4">
                 <h3 className="text-xl font-black">Database Setup Required</h3>
                 <p className="font-medium text-amber-800">{setupMessage}</p>
                 <div className="bg-slate-900 rounded-2xl p-4 text-emerald-400 font-mono text-xs overflow-x-auto">
                    <code>ALTER TABLE service_requests ADD COLUMN requester_phone TEXT;</code>
                 </div>
                 <button onClick={() => window.location.reload()} className="bg-amber-900 text-white px-6 py-2 rounded-xl font-bold flex items-center gap-2 text-sm hover:bg-amber-950 transition-colors"><RefreshCw size={16} /> Check Again</button>
              </div>
           </div>
        </div>
      )}

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
           <h2 className="text-3xl font-black text-slate-900">Pending Approvals</h2>
           <p className="text-slate-500 font-medium -mt-4">Mobile numbers waiting to be assigned to units.</p>
           <div className="grid md:grid-cols-2 gap-6">
              {requesters.map(req => (
                <div key={req.id} className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm flex flex-col justify-between hover:border-blue-200 transition-all">
                   <div className="flex items-center gap-4 mb-6">
                      <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center"><Phone size={24} /></div>
                      <div><p className="text-lg font-black text-slate-900">+{req.phone}</p><p className="text-xs font-bold text-slate-400 uppercase tracking-widest">WhatsApp ID</p></div>
                   </div>
                   <div className="space-y-4">
                      <div className="bg-slate-50 p-4 rounded-2xl">
                         <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Recent Activity</p>
                         <p className="text-sm font-bold text-slate-700">{srs.find(s => s.requester_phone === req.phone)?.title || 'No tickets yet'}</p>
                      </div>
                      <button onClick={() => setShowApproveModal(req)} className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black flex items-center justify-center gap-2 hover:bg-slate-800"><UserCheck size={20} /> Convert to Tenant</button>
                   </div>
                </div>
              ))}
              {requesters.length === 0 && <div className="col-span-full py-20 text-center bg-white rounded-[40px] border-2 border-dashed border-slate-100"><p className="text-slate-400 font-bold">No pending numbers to approve.</p></div>}
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
             <div><h2 className="text-3xl font-black text-slate-900">Sites</h2><p className="text-slate-500 font-medium">Facility portfolio</p></div>
             <button onClick={() => setShowAddSite(true)} className="bg-slate-900 text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 active:scale-95"><Plus size={20} /> Add Site</button>
           </div>
           <div className="grid md:grid-cols-2 gap-8">
             {sites.map(site => (
               <div key={site.id} className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm hover:shadow-lg transition-all">
                  <div className="flex justify-between items-start mb-6">
                    <div className="p-4 bg-blue-50 text-blue-600 rounded-2xl"><MapPin size={28} /></div>
                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">ID: {site.code}</span>
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
                        {blocks.filter(b => b.site_id === site.id).length === 0 && <p className="text-[10px] text-slate-400 font-bold italic">No units assigned.</p>}
                     </div>
                  </div>
               </div>
             ))}
             {sites.length === 0 && (
               <div className="col-span-full py-20 text-center bg-white border-2 border-dashed border-slate-100 rounded-[40px]">
                  <MapPin className="mx-auto text-slate-200 mb-4" size={48} />
                  <p className="text-slate-400 font-bold">No sites created yet.</p>
               </div>
             )}
           </div>
        </div>
      )}

      {/* Modals */}
      {showApproveModal && (
        <div className="fixed inset-0 z-[1000] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4">
           <form onSubmit={(e) => { e.preventDefault(); handleApproveTenant(showApproveModal, new FormData(e.currentTarget)); }} className="bg-white w-full max-w-lg rounded-[40px] p-10 shadow-2xl space-y-8 animate-in zoom-in duration-300">
              <div className="flex justify-between items-center"><h3 className="text-3xl font-black text-slate-900">Approve Access</h3><button type="button" onClick={() => setShowApproveModal(null)} className="p-2 bg-slate-100 rounded-full hover:bg-slate-200 transition-colors"><X size={24} /></button></div>
              <div className="space-y-4">
                <input required name="name" className="w-full bg-slate-50 rounded-2xl p-5 outline-none font-bold focus:bg-white border-2 border-transparent focus:border-blue-500" placeholder="Resident Full Name" />
                <select required name="site_id" className="w-full bg-slate-50 rounded-2xl p-5 outline-none font-bold focus:bg-white border-2 border-transparent focus:border-blue-500">
                  <option value="">Select Target Site...</option>
                  {sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
                <select name="block_id" className="w-full bg-slate-50 rounded-2xl p-5 outline-none font-bold focus:bg-white border-2 border-transparent focus:border-blue-500">
                  <option value="">Select Unit/Block (Optional)...</option>
                  {blocks.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>
              <button type="submit" disabled={isLoading} className="w-full bg-emerald-600 text-white py-6 rounded-3xl font-black text-xl flex items-center justify-center gap-3">
                {isLoading ? <Loader2 className="animate-spin" /> : 'Confirm Approval'}
              </button>
           </form>
        </div>
      )}

      {showAddSR && (
        <div className="fixed inset-0 z-[1000] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4">
          <form onSubmit={(e) => { e.preventDefault(); const fd = new FormData(e.currentTarget); handleAddItem('service_requests', { id: `SR-${Math.floor(1000 + Math.random() * 9000)}`, title: fd.get('title'), description: fd.get('description'), site_id: fd.get('site_id'), asset_id: fd.get('asset_id') || null, status: SRStatus.NEW, source: SRSource.WEB, created_at: new Date().toISOString() }, setSrs, () => setShowAddSR(false)); }} className="bg-white w-full max-w-lg rounded-[40px] p-10 shadow-2xl space-y-8 animate-in zoom-in duration-300">
            <div className="flex justify-between items-center"><h3 className="text-3xl font-black text-slate-900">New Request</h3><button type="button" onClick={() => setShowAddSR(false)} className="p-2 bg-slate-100 rounded-full hover:bg-slate-200 transition-colors"><X size={24} /></button></div>
            <div className="space-y-4">
              <input required name="title" className="w-full bg-slate-50 rounded-2xl p-5 outline-none font-bold focus:bg-white border-2 border-transparent focus:border-blue-500" placeholder="Problem Title (e.g. Broken AC)" />
              <textarea name="description" className="w-full bg-slate-50 rounded-2xl p-5 outline-none font-medium h-32 focus:bg-white border-2 border-transparent focus:border-blue-500" placeholder="Describe the issue in detail..." />
              {sites.length > 0 ? (
                <select required name="site_id" className="w-full bg-slate-50 rounded-2xl p-5 outline-none font-bold focus:bg-white border-2 border-transparent focus:border-blue-500">
                  <option value="">Select Site...</option>
                  {sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              ) : (
                <div className="p-4 bg-amber-50 text-amber-700 text-sm font-bold rounded-2xl border border-amber-100 flex items-center gap-2">
                  <AlertCircle size={18} /> Create a Site first in the 'Sites' tab.
                </div>
              )}
            </div>
            <button type="submit" disabled={isLoading || sites.length === 0} className="w-full bg-blue-600 text-white py-6 rounded-3xl font-black text-xl flex items-center justify-center gap-3 shadow-xl shadow-blue-200 disabled:opacity-50">
              {isLoading ? <Loader2 className="animate-spin" /> : 'Submit Request'}
            </button>
          </form>
        </div>
      )}

      {showAddSite && (
        <div className="fixed inset-0 z-[1000] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4">
           <form onSubmit={(e) => { e.preventDefault(); const fd = new FormData(e.currentTarget); handleAddItem('sites', { name: fd.get('name'), location: fd.get('location'), code: `SITE-${Math.floor(1000+Math.random()*9000)}`, status: Status.ACTIVE }, setSites, () => setShowAddSite(false)); }} className="bg-white w-full max-w-md rounded-[48px] p-12 shadow-2xl space-y-8 animate-in zoom-in duration-300">
              <div className="flex justify-between items-center"><h3 className="text-3xl font-black text-slate-900">New Site</h3><button type="button" onClick={() => setShowAddSite(false)} className="p-2 bg-slate-50 rounded-full hover:bg-slate-200 transition-colors"><X size={24} /></button></div>
              <div className="space-y-4">
                <input required name="name" className="w-full bg-slate-50 rounded-2xl p-5 outline-none font-bold focus:bg-white border-2 border-transparent focus:border-blue-500" placeholder="Site Name" />
                <input required name="location" className="w-full bg-slate-50 rounded-2xl p-5 outline-none font-bold focus:border-blue-500" placeholder="Location" />
              </div>
              <button type="submit" disabled={isLoading} className="w-full bg-slate-900 text-white py-6 rounded-3xl font-black text-lg">
                {isLoading ? <Loader2 className="animate-spin" /> : 'Create Site'}
              </button>
           </form>
        </div>
      )}

      {showAddBlock && (
        <div className="fixed inset-0 z-[1000] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4">
           <form onSubmit={(e) => { e.preventDefault(); const fd = new FormData(e.currentTarget); handleAddItem('blocks', { name: fd.get('name'), type: fd.get('type'), site_id: activeSiteForBlock }, setBlocks, () => { setShowAddBlock(false); setActiveSiteForBlock(null); }); }} className="bg-white w-full max-w-md rounded-[48px] p-12 shadow-2xl space-y-8 animate-in zoom-in duration-300">
              <div className="flex justify-between items-center"><h3 className="text-3xl font-black text-slate-900">New Unit</h3><button type="button" onClick={() => setShowAddBlock(false)} className="p-2 bg-slate-100 rounded-full hover:bg-slate-200 transition-colors"><X size={24} /></button></div>
              <div className="space-y-4">
                <input required name="name" className="w-full bg-slate-50 rounded-2xl p-5 outline-none font-bold focus:bg-white border-2 border-transparent focus:border-blue-500" placeholder="e.g. Unit 101" />
                <select required name="type" className="w-full bg-slate-50 rounded-2xl p-5 outline-none font-bold focus:bg-white border-2 border-transparent focus:border-blue-500">
                  {Object.values(BlockType).map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <button type="submit" disabled={isLoading} className="w-full bg-blue-600 text-white py-6 rounded-3xl font-black text-lg">
                {isLoading ? <Loader2 className="animate-spin" /> : 'Save Unit'}
              </button>
           </form>
        </div>
      )}

      {showAddAsset && (
        <div className="fixed inset-0 z-[1000] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4">
           <form onSubmit={(e) => { e.preventDefault(); const fd = new FormData(e.currentTarget); handleAddItem('assets', { name: fd.get('name'), type: fd.get('type'), site_id: fd.get('site_id'), code: `AST-${Math.floor(1000+Math.random()*9000)}`, status: Status.ACTIVE }, setAssets, () => setShowAddAsset(false)); }} className="bg-white w-full max-w-md rounded-[48px] p-12 shadow-2xl space-y-8 animate-in zoom-in duration-300">
              <div className="flex justify-between items-center"><h3 className="text-3xl font-black text-slate-900">New Asset</h3><button type="button" onClick={() => setShowAddAsset(false)} className="p-2 bg-slate-100 rounded-full hover:bg-slate-200 transition-colors"><X size={24} /></button></div>
              <div className="space-y-4">
                <input required name="name" className="w-full bg-slate-50 rounded-2xl p-5 outline-none font-bold focus:bg-white border-2 border-transparent focus:border-blue-500" placeholder="Equipment Name" />
                <select required name="site_id" className="w-full bg-slate-50 rounded-2xl p-5 outline-none font-bold focus:bg-white border-2 border-transparent focus:border-blue-500">
                  <option value="">Select Site...</option>
                  {sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <button type="submit" disabled={isLoading || sites.length === 0} className="w-full bg-slate-900 text-white py-6 rounded-3xl font-black text-lg">
                {isLoading ? <Loader2 className="animate-spin" /> : 'Add Asset'}
              </button>
           </form>
        </div>
      )}

      {showAddTenant && (
        <div className="fixed inset-0 z-[1000] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4">
           <form onSubmit={(e) => { e.preventDefault(); const fd = new FormData(e.currentTarget); handleAddItem('tenants', { name: fd.get('name'), phone: fd.get('phone'), site_id: fd.get('site_id'), status: Status.ACTIVE }, setTenants, () => setShowAddTenant(false)); }} className="bg-white w-full max-w-md rounded-[48px] p-12 shadow-2xl space-y-8 animate-in zoom-in duration-300">
              <div className="flex justify-between items-center"><h3 className="text-3xl font-black text-slate-900">Add Resident</h3><button type="button" onClick={() => setShowAddTenant(false)} className="p-2 bg-slate-100 rounded-full hover:bg-slate-200 transition-colors"><X size={24} /></button></div>
              <div className="space-y-4">
                <input required name="name" className="w-full bg-slate-50 rounded-2xl p-5 outline-none font-bold focus:bg-white border-2 border-transparent focus:border-blue-500" placeholder="Full Name" />
                <input required name="phone" className="w-full bg-slate-50 rounded-2xl p-5 outline-none font-bold focus:bg-white border-2 border-transparent focus:border-blue-500" placeholder="Phone Number" />
                <select required name="site_id" className="w-full bg-slate-50 rounded-2xl p-5 outline-none font-bold focus:bg-white border-2 border-transparent focus:border-blue-500">
                  <option value="">Select Site...</option>
                  {sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <button type="submit" disabled={isLoading || sites.length === 0} className="w-full bg-blue-600 text-white py-6 rounded-3xl font-black text-lg">
                {isLoading ? <Loader2 className="animate-spin" /> : 'Register Resident'}
              </button>
           </form>
        </div>
      )}

      {selectedSR && (
        <div className="fixed inset-0 z-[1000] bg-slate-900/60 backdrop-blur-md flex items-end md:items-center justify-center p-0 md:p-6">
           <div className="bg-white w-full max-w-2xl md:rounded-[48px] shadow-2xl flex flex-col max-h-[95vh] overflow-hidden animate-in slide-in-from-bottom duration-300">
              <div className="p-8 border-b border-slate-50 flex items-center justify-between sticky top-0 bg-white">
                 <div className="flex items-center gap-4">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">#{selectedSR.id}</span>
                    <span className={`px-4 py-1.5 text-[10px] font-black uppercase rounded-full tracking-widest ${selectedSR.status === 'Resolved' ? 'bg-emerald-50 text-emerald-700' : 'bg-blue-50 text-blue-700'}`}>{selectedSR.status}</span>
                 </div>
                 <button onClick={() => setSelectedSR(null)} className="p-3 hover:bg-slate-50 rounded-full transition-colors"><X size={28} /></button>
              </div>
              <div className="flex-1 overflow-y-auto p-12 space-y-10">
                 <h2 className="text-4xl font-black text-slate-900 leading-tight">{selectedSR.title}</h2>
                 <p className="text-lg text-slate-500 font-medium leading-relaxed">{selectedSR.description}</p>
                 <div className="grid grid-cols-2 gap-4">
                    <button onClick={() => updateSRStatus(selectedSR.id, SRStatus.IN_PROGRESS)} className="bg-slate-900 text-white py-6 rounded-3xl font-black text-lg active:scale-95 transition-transform">Start Work</button>
                    <button onClick={() => updateSRStatus(selectedSR.id, SRStatus.RESOLVED)} className="bg-blue-600 text-white py-6 rounded-3xl font-black text-lg active:scale-95 transition-transform">Resolve</button>
                 </div>
              </div>
           </div>
        </div>
      )}

      {isClosing && (
        <div className="fixed inset-0 z-[1100] bg-slate-900/60 backdrop-blur-xl flex items-center justify-center p-6">
           <div className="bg-white w-full max-w-md rounded-[48px] p-12 shadow-2xl space-y-10 animate-in zoom-in duration-300">
              <h3 className="text-3xl font-black text-slate-900">Resolution Details</h3>
              <textarea autoFocus rows={4} className="w-full bg-slate-50 rounded-[32px] p-8 outline-none font-medium text-lg border-2 border-transparent focus:border-blue-500" placeholder="Describe the resolution..." value={resolutionNote} onChange={e => setResolutionNote(e.target.value)} />
              <div className="flex gap-4"><button onClick={() => setIsClosing(false)} className="flex-1 py-4 font-bold text-slate-400">Cancel</button><button onClick={confirmResolution} className="flex-2 bg-blue-600 text-white px-8 py-5 rounded-3xl font-black shadow-lg shadow-blue-200 active:scale-95 transition-transform">Close Ticket</button></div>
           </div>
        </div>
      )}
    </Layout>
  );
};

export default App;


import React, { useState, useEffect } from 'react';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import SRList from './components/SRList';
import TenantList from './components/TenantList';
import AssetList from './components/AssetList';
import Auth from './components/Auth';
import { Site, Asset, ServiceRequest, SRStatus, Status, SRSource, TabConfig, UserProfile, Tenant, BlockType, Block, Organization } from './types';
import { supabase, checkSchemaReady } from './lib/supabase';
import { 
  X, MapPin, Plus, Loader2, Wrench, ArrowRight, Layers, CheckCircle, Building, AlertCircle, RefreshCw, Phone, User, Package
} from 'lucide-react';

const DEFAULT_TABS: TabConfig[] = [
  { id: 'dashboard', label: 'Dashboard', iconName: 'LayoutDashboard', isVisible: true },
  { id: 'srs', label: 'Service Requests', iconName: 'Wrench', isVisible: true },
  { id: 'sites', label: 'Sites', iconName: 'MapPin', isVisible: true },
  { id: 'tenants', label: 'Tenants', iconName: 'Users', isVisible: true },
  { id: 'assets', label: 'Assets', iconName: 'Package', isVisible: true },
];

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
  const [srs, setSrs] = useState<ServiceRequest[]>([]);
  const [selectedSR, setSelectedSR] = useState<ServiceRequest | null>(null);
  
  const [isLoading, setIsLoading] = useState(false);
  const [dbStatus, setDbStatus] = useState<'connecting' | 'connected' | 'error' | 'needs_setup'>('connecting');
  const [tabConfigs] = useState<TabConfig[]>(() => DEFAULT_TABS);

  const [onboardingStep, setOnboardingStep] = useState(1);
  const [onboardingData, setOnboardingData] = useState({ userName: '', orgName: '', siteName: '' });
  
  // Modal States
  const [showAddSite, setShowAddSite] = useState(false);
  const [showAddBlock, setShowAddBlock] = useState(false);
  const [showAddAsset, setShowAddAsset] = useState(false);
  const [showAddTenant, setShowAddTenant] = useState(false);
  const [showAddSR, setShowAddSR] = useState(false);
  
  const [activeSiteForBlock, setActiveSiteForBlock] = useState<string | null>(null);
  const [resolutionNote, setResolutionNote] = useState('');
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    const init = async () => {
      const status = await checkSchemaReady();
      if (status.needsSetup) {
        setDbStatus('needs_setup');
        return;
      }
      
      if (currentUser && currentUser.onboarded) {
        fetchOrgData();
        setupRealtime();
      } else {
        setDbStatus('connected');
      }
    };
    init();
  }, [currentUser?.id, currentUser?.onboarded]);

  const setupRealtime = () => {
    if (!currentUser?.org_id) return;

    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'service_requests', filter: `org_id=eq.${currentUser.org_id}` },
        (payload) => {
          setSrs(prev => [payload.new as ServiceRequest, ...prev]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const fetchOrgData = async () => {
    if (!currentUser?.org_id) return;
    setIsLoading(true);
    try {
      const { data: orgData, error: orgError } = await supabase.from('organizations').select('*').eq('id', currentUser.org_id).single();
      if (orgError) throw orgError;
      if (orgData) setOrganization(orgData);

      const [siteData, assetData, tenantData, srData] = await Promise.all([
        supabase.from('sites').select('*').eq('org_id', currentUser.org_id),
        supabase.from('assets').select('*').eq('org_id', currentUser.org_id),
        supabase.from('tenants').select('*').eq('org_id', currentUser.org_id),
        supabase.from('service_requests').select('*').eq('org_id', currentUser.org_id)
      ]);
      
      setSites(siteData.data || []);
      setAssets(assetData.data || []);
      setTenants(tenantData.data || []);
      setSrs(srData.data || []);

      const siteIds = (siteData.data || []).map(s => s.id);
      if (siteIds.length > 0) {
        const { data: blockData } = await supabase.from('blocks').select('*').in('site_id', siteIds);
        setBlocks(blockData || []);
      }

      setDbStatus('connected');
    } catch (err) {
      console.error(err);
      setDbStatus('error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignIn = (phone: string) => {
    const user: UserProfile = { id: crypto.randomUUID(), org_id: null, phone, full_name: '', onboarded: false };
    localStorage.setItem('fm_engine_user', JSON.stringify(user));
    setCurrentUser(user);
    setOnboardingStep(1);
  };

  const handleOnboardingNext = async () => {
    if (onboardingStep === 1 && !onboardingData.userName) return;
    if (onboardingStep === 2 && !onboardingData.orgName) return;

    if (onboardingStep < 3) {
      setOnboardingStep(prev => prev + 1);
    } else {
      if (!onboardingData.siteName) return;
      setIsLoading(true);
      try {
        const { data: orgData, error: orgErr } = await supabase.from('organizations').insert([{ name: onboardingData.orgName }]).select().single();
        if (orgErr) throw orgErr;
        const orgId = orgData.id;

        await supabase.from('sites').insert([{
          org_id: orgId,
          name: onboardingData.siteName,
          location: 'Main Site',
          code: `SITE-${Math.floor(1000 + Math.random() * 9000)}`,
          status: Status.ACTIVE
        }]);
        
        const updatedUser = { ...currentUser!, full_name: onboardingData.userName, org_id: orgId, onboarded: true };
        localStorage.setItem('fm_engine_user', JSON.stringify(updatedUser));
        setCurrentUser(updatedUser);
      } catch (err: any) {
        alert(`Setup Failed: ${err.message}`);
      } finally { setIsLoading(false); }
    }
  };

  const updateSRStatus = async (id: string, status: SRStatus) => {
    if (status === SRStatus.RESOLVED) {
      setIsClosing(true);
      return;
    }
    const { data } = await supabase.from('service_requests').update({ status }).eq('id', id).select();
    if (data) {
      setSrs(prev => prev.map(s => s.id === id ? data[0] : s));
      setSelectedSR(data[0]);
    }
  };

  const confirmResolution = async () => {
    if (!selectedSR) return;
    const { data } = await supabase.from('service_requests').update({ 
      status: SRStatus.RESOLVED, 
      resolution_notes: resolutionNote 
    }).eq('id', selectedSR.id).select();
    
    if (data) {
      setSrs(prev => prev.map(s => s.id === selectedSR.id ? data[0] : s));
      setSelectedSR(null);
      setIsClosing(false);
      setResolutionNote('');
    }
  };

  // Helper for generic Add functions
  const handleAddItem = async (table: string, payload: any, setter: Function, closeFn: Function) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.from(table).insert([{ ...payload, org_id: currentUser?.org_id }]).select();
      if (error) throw error;
      if (data) {
        setter((prev: any) => [...prev, data[0]]);
        closeFn();
      }
    } catch (e: any) { alert(e.message); }
    finally { setIsLoading(false); }
  };

  if (dbStatus === 'needs_setup') {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6 text-white text-center">
        <div className="max-w-md w-full bg-slate-800 rounded-[40px] p-12 border border-slate-700 shadow-2xl space-y-8">
           <AlertCircle size={64} className="mx-auto text-amber-400" />
           <h1 className="text-3xl font-black">Database Setup Required</h1>
           <p className="text-slate-400 font-medium text-lg">Please run the Final SQL script in your Supabase SQL Editor to continue.</p>
           <button onClick={() => window.location.reload()} className="w-full bg-blue-600 py-4 rounded-3xl font-black flex items-center justify-center gap-3 active:scale-95 transition-all">
             <RefreshCw size={20} /> Refresh App
           </button>
        </div>
      </div>
    );
  }

  if (!currentUser) return <Auth onSignIn={handleSignIn} />;

  if (!currentUser.onboarded) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
         <div className="w-full max-w-lg bg-white rounded-[48px] p-12 shadow-2xl border border-slate-100 space-y-10 relative">
            {isLoading && (
              <div className="absolute inset-0 bg-white/60 backdrop-blur-sm flex items-center justify-center rounded-[48px] z-20">
                <Loader2 className="animate-spin text-blue-600" size={48} />
              </div>
            )}
            <div className="flex items-center justify-between">
              <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white font-black text-xl">F</div>
              <div className="flex gap-2">
                 {[1,2,3].map(s => (<div key={s} className={`w-8 h-2 rounded-full transition-all ${onboardingStep >= s ? 'bg-blue-600' : 'bg-slate-100'}`} />))}
              </div>
            </div>
            <div className="space-y-3">
               <h2 className="text-4xl font-black text-slate-900">{onboardingStep === 1 ? 'Hello!' : onboardingStep === 2 ? 'Company' : 'Facility'}</h2>
               <p className="text-slate-500 font-medium text-lg">{onboardingStep === 1 ? 'What is your name?' : onboardingStep === 2 ? 'What is your organization called?' : 'Name your first site.'}</p>
            </div>
            <div className="space-y-4">
              {onboardingStep === 1 && (<input autoFocus className="w-full bg-slate-50 rounded-2xl p-6 outline-none font-bold text-xl border-2 border-transparent focus:border-blue-500" placeholder="Your Name" value={onboardingData.userName} onChange={e => setOnboardingData({...onboardingData, userName: e.target.value})} />)}
              {onboardingStep === 2 && (<input autoFocus className="w-full bg-slate-50 rounded-2xl p-6 outline-none font-bold text-xl border-2 border-transparent focus:border-blue-500" placeholder="e.g. Acme CMMS" value={onboardingData.orgName} onChange={e => setOnboardingData({...onboardingData, orgName: e.target.value})} />)}
              {onboardingStep === 3 && (<input autoFocus className="w-full bg-slate-50 rounded-2xl p-6 outline-none font-bold text-xl border-2 border-transparent focus:border-blue-500" placeholder="e.g. Building A" value={onboardingData.siteName} onChange={e => setOnboardingData({...onboardingData, siteName: e.target.value})} />)}
              <button onClick={handleOnboardingNext} disabled={isLoading} className="w-full bg-blue-600 text-white py-6 rounded-3xl font-black text-xl flex items-center justify-center gap-3 active:scale-95 disabled:opacity-50">
                 {onboardingStep === 3 ? 'Finish Setup' : 'Continue'} <ArrowRight size={24} />
              </button>
            </div>
         </div>
      </div>
    );
  }

  return (
    <Layout 
      activeTab={activeTab} 
      onTabChange={setActiveTab} 
      dbStatus={dbStatus === 'error' ? 'error' : dbStatus === 'connected' ? 'connected' : 'connecting'}
      tabConfigs={tabConfigs}
      orgName={organization?.name}
    >
      {activeTab === 'dashboard' && <Dashboard srs={srs} onNewRequest={() => setShowAddSR(true)} />}
      {activeTab === 'srs' && <SRList srs={srs} sites={sites} assets={assets} onSelect={setSelectedSR} onNewRequest={() => setShowAddSR(true)} />}
      {activeTab === 'tenants' && <TenantList tenants={tenants} sites={sites} onAdd={() => setShowAddTenant(true)} />}
      {activeTab === 'assets' && <AssetList assets={assets} sites={sites} blocks={blocks} onAdd={() => setShowAddAsset(true)} />}
      
      {activeTab === 'sites' && (
        <div className="space-y-8 pb-20">
           <div className="flex justify-between items-end">
             <div>
               <h2 className="text-3xl font-black text-slate-900">Sites</h2>
               <p className="text-slate-500 font-medium">Facility portfolio for {organization?.name}</p>
             </div>
             <button onClick={() => setShowAddSite(true)} className="bg-slate-900 text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 active:scale-95">
               <Plus size={20} /> Add Site
             </button>
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
                        <button onClick={() => { setActiveSiteForBlock(site.id); setShowAddBlock(true); }} className="text-xs font-bold text-blue-600 flex items-center gap-1 hover:underline">
                          <Plus size={14} /> Add Block
                        </button>
                     </div>
                     <div className="flex flex-wrap gap-2">
                        {blocks.filter(b => b.site_id === site.id).map(block => (
                          <div key={block.id} className="px-4 py-2 bg-slate-50 border border-slate-100 rounded-xl flex items-center gap-2">
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

      {/* --- MODALS --- */}

      {/* SR Detail Modal */}
      {selectedSR && (
        <div className="fixed inset-0 z-[150] bg-slate-900/40 backdrop-blur-sm flex items-end md:items-center justify-center p-0 md:p-6">
           <div className="bg-white w-full max-w-2xl md:rounded-[48px] shadow-2xl flex flex-col max-h-[95vh] overflow-hidden">
              <div className="p-8 border-b border-slate-50 flex items-center justify-between sticky top-0 bg-white">
                 <div className="flex items-center gap-4">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">#{selectedSR.id}</span>
                    <span className={`px-4 py-1.5 text-[10px] font-black uppercase rounded-full tracking-widest ${selectedSR.status === 'Resolved' ? 'bg-emerald-50 text-emerald-700' : 'bg-blue-50 text-blue-700'}`}>
                      {selectedSR.status}
                    </span>
                 </div>
                 <button onClick={() => setSelectedSR(null)} className="p-3 hover:bg-slate-50 rounded-full transition-colors"><X size={28} /></button>
              </div>
              <div className="flex-1 overflow-y-auto p-12 space-y-10">
                 <div>
                    <h2 className="text-4xl font-black text-slate-900 mb-6">{selectedSR.title}</h2>
                    <p className="text-lg text-slate-500 font-medium leading-relaxed">{selectedSR.description}</p>
                 </div>
                 <div className="grid grid-cols-2 gap-4">
                    <button onClick={() => updateSRStatus(selectedSR.id, SRStatus.IN_PROGRESS)} className="bg-slate-900 text-white py-6 rounded-3xl font-black text-lg active:scale-95 transition-all">Start Work</button>
                    <button onClick={() => updateSRStatus(selectedSR.id, SRStatus.RESOLVED)} className="bg-blue-600 text-white py-6 rounded-3xl font-black text-lg active:scale-95 transition-all">Resolve</button>
                 </div>
              </div>
           </div>
        </div>
      )}

      {/* Resolution Modal */}
      {isClosing && (
        <div className="fixed inset-0 z-[250] bg-slate-900/60 backdrop-blur-xl flex items-center justify-center p-6">
           <div className="bg-white w-full max-w-md rounded-[48px] p-12 shadow-2xl space-y-10">
              <h3 className="text-3xl font-black text-slate-900">Resolution Details</h3>
              <textarea autoFocus rows={4} className="w-full bg-slate-50 rounded-[32px] p-8 outline-none font-medium text-lg border-2 border-transparent focus:border-blue-500" placeholder="Describe the resolution..." value={resolutionNote} onChange={e => setResolutionNote(e.target.value)} />
              <div className="flex gap-4">
                 <button onClick={() => setIsClosing(false)} className="flex-1 py-4 font-bold text-slate-400">Cancel</button>
                 <button onClick={confirmResolution} className="flex-2 bg-blue-600 text-white px-8 py-5 rounded-3xl font-black shadow-lg shadow-blue-200">Close Ticket</button>
              </div>
           </div>
        </div>
      )}

      {/* Add Site Modal */}
      {showAddSite && (
        <div className="fixed inset-0 z-[300] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-6">
           <form onSubmit={(e) => {
             e.preventDefault();
             const fd = new FormData(e.currentTarget);
             handleAddItem('sites', { 
               name: fd.get('name'), 
               location: fd.get('location'), 
               code: `SITE-${Math.floor(1000+Math.random()*9000)}`, 
               status: Status.ACTIVE 
             }, setSites, () => setShowAddSite(false));
           }} className="bg-white w-full max-w-md rounded-[48px] p-12 shadow-2xl space-y-8">
              <div className="flex justify-between items-center">
                <h3 className="text-3xl font-black text-slate-900">New Site</h3>
                <button type="button" onClick={() => setShowAddSite(false)} className="p-2 bg-slate-50 rounded-full"><X size={24} /></button>
              </div>
              <div className="space-y-4">
                <input required name="name" className="w-full bg-slate-50 rounded-2xl p-5 outline-none font-bold" placeholder="Site Name" />
                <input required name="location" className="w-full bg-slate-50 rounded-2xl p-5 outline-none font-bold" placeholder="Location/City" />
              </div>
              <button type="submit" disabled={isLoading} className="w-full bg-slate-900 text-white py-6 rounded-3xl font-black text-lg flex items-center justify-center gap-3">
                {isLoading ? <Loader2 className="animate-spin" /> : <><CheckCircle size={20} /> Create Site</>}
              </button>
           </form>
        </div>
      )}

      {/* Add Tenant Modal */}
      {showAddTenant && (
        <div className="fixed inset-0 z-[300] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-6">
           <form onSubmit={(e) => {
             e.preventDefault();
             const fd = new FormData(e.currentTarget);
             handleAddItem('tenants', { 
               name: fd.get('name'), 
               phone: fd.get('phone'), 
               site_id: fd.get('site_id'),
               status: Status.ACTIVE 
             }, setTenants, () => setShowAddTenant(false));
           }} className="bg-white w-full max-w-md rounded-[48px] p-12 shadow-2xl space-y-8">
              <div className="flex justify-between items-center">
                <h3 className="text-3xl font-black text-slate-900">Add Tenant</h3>
                <button type="button" onClick={() => setShowAddTenant(false)} className="p-2 bg-slate-50 rounded-full"><X size={24} /></button>
              </div>
              <div className="space-y-4">
                <div className="flex items-center bg-slate-50 rounded-2xl px-5">
                   <User className="text-slate-400" size={20} />
                   <input required name="name" className="flex-1 bg-transparent p-5 outline-none font-bold" placeholder="Full Name" />
                </div>
                <div className="flex items-center bg-slate-50 rounded-2xl px-5">
                   <Phone className="text-slate-400" size={20} />
                   <input required name="phone" className="flex-1 bg-transparent p-5 outline-none font-bold" placeholder="Phone (e.g. +12345)" />
                </div>
                <select required name="site_id" className="w-full bg-slate-50 rounded-2xl p-5 outline-none font-bold appearance-none">
                  <option value="">Select Building</option>
                  {sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <button type="submit" disabled={isLoading} className="w-full bg-blue-600 text-white py-6 rounded-3xl font-black text-lg flex items-center justify-center gap-3">
                {isLoading ? <Loader2 className="animate-spin" /> : <><CheckCircle size={20} /> Register Tenant</>}
              </button>
           </form>
        </div>
      )}

      {/* Add Asset Modal */}
      {showAddAsset && (
        <div className="fixed inset-0 z-[300] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-6">
           <form onSubmit={(e) => {
             e.preventDefault();
             const fd = new FormData(e.currentTarget);
             handleAddItem('assets', { 
               name: fd.get('name'), 
               type: fd.get('type'), 
               site_id: fd.get('site_id'),
               code: `AST-${Math.floor(1000+Math.random()*9000)}`,
               status: Status.ACTIVE 
             }, setAssets, () => setShowAddAsset(false));
           }} className="bg-white w-full max-w-md rounded-[48px] p-12 shadow-2xl space-y-8">
              <div className="flex justify-between items-center">
                <h3 className="text-3xl font-black text-slate-900">New Asset</h3>
                <button type="button" onClick={() => setShowAddAsset(false)} className="p-2 bg-slate-50 rounded-full"><X size={24} /></button>
              </div>
              <div className="space-y-4">
                <div className="flex items-center bg-slate-50 rounded-2xl px-5">
                   <Package className="text-slate-400" size={20} />
                   <input required name="name" className="flex-1 bg-transparent p-5 outline-none font-bold" placeholder="Asset Name" />
                </div>
                <input required name="type" className="w-full bg-slate-50 rounded-2xl p-5 outline-none font-bold" placeholder="Type (e.g. HVAC, Lift)" />
                <select required name="site_id" className="w-full bg-slate-50 rounded-2xl p-5 outline-none font-bold appearance-none">
                  <option value="">Select Building</option>
                  {sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <button type="submit" disabled={isLoading} className="w-full bg-slate-900 text-white py-6 rounded-3xl font-black text-lg flex items-center justify-center gap-3">
                {isLoading ? <Loader2 className="animate-spin" /> : <><CheckCircle size={20} /> Add to Catalog</>}
              </button>
           </form>
        </div>
      )}

      {/* Add Block Modal */}
      {showAddBlock && (
        <div className="fixed inset-0 z-[300] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-6">
           <form onSubmit={(e) => {
             e.preventDefault();
             const fd = new FormData(e.currentTarget);
             handleAddItem('blocks', { 
               name: fd.get('name'), 
               type: fd.get('type'), 
               site_id: activeSiteForBlock
             }, setBlocks, () => { setShowAddBlock(false); setActiveSiteForBlock(null); });
           }} className="bg-white w-full max-w-md rounded-[48px] p-12 shadow-2xl space-y-8">
              <div className="flex justify-between items-center">
                <h3 className="text-3xl font-black text-slate-900">New Block</h3>
                <button type="button" onClick={() => setShowAddBlock(false)} className="p-2 bg-slate-50 rounded-full"><X size={24} /></button>
              </div>
              <div className="space-y-4">
                <input required name="name" className="w-full bg-slate-50 rounded-2xl p-5 outline-none font-bold" placeholder="e.g. 1st Floor, Unit 101" />
                <select required name="type" className="w-full bg-slate-50 rounded-2xl p-5 outline-none font-bold appearance-none">
                  {Object.values(BlockType).map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <button type="submit" disabled={isLoading} className="w-full bg-blue-600 text-white py-6 rounded-3xl font-black text-lg">Create Block</button>
           </form>
        </div>
      )}

    </Layout>
  );
};

export default App;

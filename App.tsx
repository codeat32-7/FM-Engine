
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
  X, MapPin, Plus, Loader2, Wrench, ArrowRight, Layers, CheckCircle, Building, Database, AlertCircle, Terminal
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

  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingStep, setOnboardingStep] = useState(1);
  const [onboardingData, setOnboardingData] = useState({ 
    userName: '', 
    orgName: '', 
    siteName: '' 
  });
  
  const [showAddSite, setShowAddSite] = useState(false);
  const [showAddBlock, setShowAddBlock] = useState(false);
  const [showAddAsset, setShowAddAsset] = useState(false);
  const [showAddTenant, setShowAddTenant] = useState(false);
  const [showAddSR, setShowAddSR] = useState(false);
  
  const [activeSiteForBlock, setActiveSiteForBlock] = useState<string | null>(null);
  const [resolutionNote, setResolutionNote] = useState('');
  const [isClosing, setIsClosing] = useState(false);

  // Form States
  const [newAsset, setNewAsset] = useState({ name: '', type: 'General', site_id: '', block_id: '' });
  const [newBlock, setNewBlock] = useState({ name: '', type: BlockType.BUILDING });
  const [newTenant, setNewTenant] = useState({ name: '', phone: '', site_id: '', block_id: '' });
  const [newSR, setNewSR] = useState({ title: '', description: '', site_id: '', block_id: '', asset_id: '' });

  useEffect(() => {
    const init = async () => {
      const status = await checkSchemaReady();
      if (status.needsSetup) {
        setDbStatus('needs_setup');
        return;
      }
      
      if (currentUser) {
        if (!currentUser.onboarded) setShowOnboarding(true);
        fetchOrgData();
      } else {
        setDbStatus('connected');
      }
    };
    init();
  }, [currentUser]);

  const fetchOrgData = async () => {
    if (!currentUser?.org_id) return;
    setIsLoading(true);
    try {
      const { data: orgData, error: orgError } = await supabase.from('organizations').select('*').eq('id', currentUser.org_id).single();
      
      if (orgError) {
        if (orgError.code === 'PGRST205') {
          setDbStatus('needs_setup');
          return;
        }
        throw orgError;
      }

      if (orgData) setOrganization(orgData);

      const [siteData, assetData, tenantData, srData] = await Promise.all([
        supabase.from('sites').select('*').eq('org_id', currentUser.org_id),
        supabase.from('assets').select('*').eq('org_id', currentUser.org_id),
        supabase.from('tenants').select('*').eq('org_id', currentUser.org_id),
        supabase.from('service_requests').select('*').eq('org_id', currentUser.org_id)
      ]);
      
      const fetchedSites = siteData.data || [];
      setSites(fetchedSites);
      setAssets(assetData.data || []);
      setTenants(tenantData.data || []);
      setSrs(srData.data || []);

      if (fetchedSites.length > 0) {
        const siteIds = fetchedSites.map(s => s.id);
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
    const user: UserProfile = {
      id: crypto.randomUUID(),
      org_id: null,
      phone,
      full_name: '',
      onboarded: false
    };
    localStorage.setItem('fm_engine_user', JSON.stringify(user));
    setCurrentUser(user);
  };

  const handleOnboardingNext = async () => {
    if (onboardingStep < 3) {
      setOnboardingStep(prev => prev + 1);
    } else {
      setIsLoading(true);
      try {
        const orgId = crypto.randomUUID();
        const { error: orgErr } = await supabase.from('organizations').insert([{ id: orgId, name: onboardingData.orgName }]);
        if (orgErr) throw orgErr;

        const siteId = crypto.randomUUID();
        const firstSite: Site = {
          id: siteId,
          org_id: orgId,
          name: onboardingData.siteName,
          location: 'HQ',
          code: `SITE-${Math.floor(100 + Math.random() * 900)}`,
          status: Status.ACTIVE
        };
        const { error: siteErr } = await supabase.from('sites').insert([firstSite]);
        if (siteErr) throw siteErr;

        const updatedUser = { 
          ...currentUser!, 
          full_name: onboardingData.userName, 
          org_id: orgId,
          onboarded: true 
        };
        setCurrentUser(updatedUser);
        localStorage.setItem('fm_engine_user', JSON.stringify(updatedUser));
        setShowOnboarding(false);
        fetchOrgData();
      } catch (err: any) {
        console.error(err);
        if (err.code === 'PGRST205') setDbStatus('needs_setup');
      } finally {
        setIsLoading(false);
      }
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

  if (dbStatus === 'needs_setup') {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6 text-white">
        <div className="max-w-2xl w-full bg-slate-800 rounded-[40px] p-12 border border-slate-700 shadow-2xl space-y-8 animate-in zoom-in-95 duration-500">
           <div className="flex items-center gap-4 text-amber-400 mb-2">
              <AlertCircle size={48} />
              <h1 className="text-4xl font-black">Database Setup Required</h1>
           </div>
           <p className="text-slate-400 text-lg leading-relaxed">
             The organization-centric schema is missing. Please run the migration script in your <strong>Supabase SQL Editor</strong> to enable Client/Organization multi-tenancy.
           </p>
           
           <div className="bg-black/40 rounded-3xl p-6 font-mono text-xs text-blue-300 border border-white/5 space-y-4 max-h-60 overflow-y-auto">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                 <span className="flex items-center gap-2"><Terminal size={14} /> Migration Script</span>
              </div>
              <code className="block whitespace-pre">
{`CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Note: Ensure ALL tables have org_id columns!`}
              </code>
           </div>
           
           <button 
             onClick={() => window.location.reload()}
             className="w-full bg-blue-600 hover:bg-blue-500 text-white py-5 rounded-3xl font-black text-xl transition-all shadow-xl shadow-blue-900/20"
           >
             I've run the SQL, Refresh App
           </button>
        </div>
      </div>
    );
  }

  if (!currentUser) return <Auth onSignIn={handleSignIn} />;

  return (
    <Layout 
      activeTab={activeTab} 
      onTabChange={setActiveTab} 
      dbStatus={dbStatus === 'error' ? 'error' : dbStatus === 'connected' ? 'connected' : 'connecting'}
      tabConfigs={tabConfigs}
      orgName={organization?.name}
    >
      {isLoading && !showOnboarding && (
        <div className="fixed inset-0 z-[50] bg-white/50 backdrop-blur-sm flex items-center justify-center">
          <Loader2 className="animate-spin text-blue-600" size={48} />
        </div>
      )}

      {activeTab === 'dashboard' && <Dashboard srs={srs} onNewRequest={() => setShowAddSR(true)} />}
      {activeTab === 'srs' && <SRList srs={srs} sites={sites} assets={assets} onSelect={setSelectedSR} onNewRequest={() => setShowAddSR(true)} />}
      {activeTab === 'tenants' && <TenantList tenants={tenants} sites={sites} onAdd={() => setShowAddTenant(true)} />}
      {activeTab === 'assets' && <AssetList assets={assets} sites={sites} blocks={blocks} onAdd={() => setShowAddAsset(true)} />}
      
      {activeTab === 'sites' && (
        <div className="space-y-8 pb-20">
           <div className="flex justify-between items-end">
             <div>
               <h2 className="text-3xl font-black text-slate-900">Sites & Spaces</h2>
               <p className="text-slate-500 font-medium">Manage buildings for {organization?.name || 'Client'}</p>
             </div>
             <button onClick={() => setShowAddSite(true)} className="bg-slate-900 text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 shadow-lg active:scale-95 transition-all">
               <Plus size={20} /> Add Site
             </button>
           </div>
           <div className="grid md:grid-cols-2 gap-8">
             {sites.map(site => (
               <div key={site.id} className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm hover:shadow-md transition-all">
                  <div className="flex justify-between items-start mb-6">
                    <div className="p-4 bg-blue-50 text-blue-600 rounded-2xl"><MapPin size={28} /></div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">ID: {site.code}</span>
                  </div>
                  <h3 className="text-2xl font-black text-slate-900 mb-1">{site.name}</h3>
                  <p className="text-sm font-medium text-slate-500 mb-8">{site.location}</p>
                  
                  <div className="pt-8 border-t border-slate-50 space-y-4">
                     <div className="flex items-center justify-between">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Blocks / Sub-Spaces</p>
                        <button 
                          onClick={() => { setActiveSiteForBlock(site.id); setShowAddBlock(true); }}
                          className="text-xs font-bold text-blue-600 flex items-center gap-1 hover:underline"
                        >
                          <Plus size={14} /> Add Block
                        </button>
                     </div>
                     <div className="flex flex-wrap gap-2">
                        {blocks.filter(b => b.site_id === site.id).map(block => (
                          <div key={block.id} className="px-4 py-2 bg-slate-50 border border-slate-100 rounded-xl flex items-center gap-2 group">
                             <Layers size={14} className="text-slate-400" />
                             <span className="text-xs font-bold text-slate-700">{block.name}</span>
                             <span className="text-[8px] font-black text-slate-300 uppercase">{block.type}</span>
                          </div>
                        ))}
                     </div>
                  </div>
               </div>
             ))}
           </div>
        </div>
      )}

      {/* Onboarding Flow: User -> Org -> Site */}
      {showOnboarding && (
        <div className="fixed inset-0 z-[300] bg-slate-50 flex items-center justify-center p-6">
           <div className="w-full max-w-lg bg-white rounded-[48px] p-12 shadow-2xl space-y-10 animate-in fade-in zoom-in duration-500">
              <div className="space-y-3">
                 <h2 className="text-4xl font-black text-slate-900">
                   {onboardingStep === 1 ? 'Welcome aboard!' : onboardingStep === 2 ? 'The Organization' : 'The First Site'}
                 </h2>
                 <p className="text-slate-500 font-medium text-lg leading-relaxed">
                   {onboardingStep === 1 ? 'Tell us your name.' : onboardingStep === 2 ? 'What is your company or apartment complex called?' : 'Where will we start maintenance?'}
                 </p>
              </div>

              {onboardingStep === 1 && (
                 <input autoFocus className="w-full bg-slate-50 rounded-2xl p-5 outline-none font-bold text-xl border-2 border-transparent focus:border-blue-500" placeholder="Full Name" value={onboardingData.userName} onChange={e => setOnboardingData({...onboardingData, userName: e.target.value})} />
              )}
              {onboardingStep === 2 && (
                 <input autoFocus className="w-full bg-slate-50 rounded-2xl p-5 outline-none font-bold text-xl border-2 border-transparent focus:border-blue-500" placeholder="Organization Name" value={onboardingData.orgName} onChange={e => setOnboardingData({...onboardingData, orgName: e.target.value})} />
              )}
              {onboardingStep === 3 && (
                 <input autoFocus className="w-full bg-slate-50 rounded-2xl p-5 outline-none font-bold text-xl border-2 border-transparent focus:border-blue-500" placeholder="Site Name (e.g. Tower B)" value={onboardingData.siteName} onChange={e => setOnboardingData({...onboardingData, siteName: e.target.value})} />
              )}

              <button onClick={handleOnboardingNext} className="w-full bg-blue-600 text-white py-5 rounded-3xl font-black text-xl shadow-2xl shadow-blue-200 flex items-center justify-center gap-3 hover:scale-[1.02] transition-transform">
                 Next Step <ArrowRight size={24} />
              </button>
           </div>
        </div>
      )}

      {/* Selected SR Details & Workflow */}
      {selectedSR && (
        <div className="fixed inset-0 z-[150] bg-slate-900/40 backdrop-blur-sm flex items-end md:items-center justify-center p-0 md:p-6">
           <div className="bg-white w-full max-w-2xl md:rounded-[48px] shadow-2xl flex flex-col max-h-[95vh] overflow-hidden animate-in slide-in-from-bottom-20 duration-500">
              <div className="p-8 border-b border-slate-50 flex items-center justify-between sticky top-0 bg-white">
                 <div className="flex items-center gap-4">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">#{selectedSR.id}</span>
                    <span className="px-4 py-1.5 bg-blue-50 text-blue-700 text-[10px] font-black uppercase rounded-full tracking-widest">{selectedSR.status}</span>
                 </div>
                 <button onClick={() => setSelectedSR(null)} className="p-3 hover:bg-slate-50 rounded-full transition-colors"><X size={28} /></button>
              </div>
              <div className="flex-1 overflow-y-auto p-12 space-y-10">
                 <div>
                    <h2 className="text-4xl font-black text-slate-900 mb-6">{selectedSR.title}</h2>
                    <p className="text-lg text-slate-500 font-medium leading-relaxed">{selectedSR.description}</p>
                 </div>
                 <div className="grid grid-cols-2 gap-6">
                    <div className="p-8 bg-slate-50 rounded-[32px] space-y-1">
                       <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Site</p>
                       <p className="font-bold text-slate-800">{sites.find(s => s.id === selectedSR.site_id)?.name || 'Facility'}</p>
                    </div>
                    <div className="p-8 bg-slate-50 rounded-[32px] space-y-1">
                       <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Created</p>
                       <p className="font-bold text-slate-800">{new Date(selectedSR.created_at).toLocaleDateString()}</p>
                    </div>
                 </div>

                 <div className="space-y-6">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Update Workflow</p>
                    <div className="grid grid-cols-2 gap-4">
                       {selectedSR.status === SRStatus.NEW && (
                          <button onClick={() => updateSRStatus(selectedSR.id, SRStatus.IN_PROGRESS)} className="col-span-2 bg-slate-900 text-white py-6 rounded-3xl font-black text-lg flex items-center justify-center gap-3">Start Work <Wrench size={20} /></button>
                       )}
                       {selectedSR.status === SRStatus.IN_PROGRESS && (
                          <>
                             <button onClick={() => updateSRStatus(selectedSR.id, SRStatus.RESOLVED)} className="bg-blue-600 text-white py-6 rounded-3xl font-black text-lg">Mark Resolved</button>
                             <button onClick={() => updateSRStatus(selectedSR.id, SRStatus.CLOSED)} className="bg-slate-100 text-slate-900 py-6 rounded-3xl font-black">Close Case</button>
                          </>
                       )}
                       {selectedSR.status === SRStatus.RESOLVED && (
                          <div className="col-span-2 p-8 bg-emerald-50 rounded-[32px] text-center">
                             <CheckCircle className="mx-auto mb-3 text-emerald-500" size={32} />
                             <p className="font-black text-emerald-800 uppercase tracking-widest text-sm">Issue Resolved</p>
                             {selectedSR.resolution_notes && (
                                <p className="mt-4 text-sm text-emerald-600 font-medium italic">"{selectedSR.resolution_notes}"</p>
                             )}
                          </div>
                       )}
                    </div>
                 </div>
              </div>
           </div>
        </div>
      )}

      {/* Resolution Notes Input */}
      {isClosing && (
        <div className="fixed inset-0 z-[250] bg-slate-900/60 backdrop-blur-xl flex items-center justify-center p-6">
           <div className="bg-white w-full max-w-md rounded-[48px] p-12 shadow-2xl space-y-10">
              <div className="space-y-3">
                 <h3 className="text-3xl font-black text-slate-900">Resolution Details</h3>
                 <p className="text-slate-500 font-medium">Document the fix for history.</p>
              </div>
              <textarea autoFocus rows={4} className="w-full bg-slate-50 border-2 border-transparent focus:border-blue-500 rounded-[32px] p-8 outline-none font-medium text-slate-800 text-lg resize-none" placeholder="What was the fix?" value={resolutionNote} onChange={e => setResolutionNote(e.target.value)} />
              <div className="flex gap-4">
                 <button onClick={() => setIsClosing(false)} className="flex-1 py-4 font-bold text-slate-400">Back</button>
                 <button onClick={confirmResolution} className="flex-2 bg-blue-600 text-white px-8 py-5 rounded-3xl font-black shadow-xl">Complete Ticket</button>
              </div>
           </div>
        </div>
      )}
    </Layout>
  );
};

export default App;

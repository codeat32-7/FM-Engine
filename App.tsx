
import React, { useState, useEffect } from 'react';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import SRList from './components/SRList';
import { Site, Asset, ServiceRequest, SRStatus, Status, SRSource, TabConfig } from './types';
import { supabase, checkConnection } from './lib/supabase';
import { 
  X, MapPin, Package, CheckCircle, Trash2, Edit3, 
  Archive, AlertTriangle, Plus, Search, Loader2, 
  Github, ExternalLink, ShieldCheck, ArrowUp, ArrowDown, Eye, EyeOff, GripVertical, Wrench, LayoutDashboard 
} from 'lucide-react';

const DEFAULT_TABS: TabConfig[] = [
  { id: 'dashboard', label: 'Dashboard', iconName: 'LayoutDashboard', isVisible: true },
  { id: 'srs', label: 'Service Requests', iconName: 'Wrench', isVisible: true },
  { id: 'sites', label: 'Sites', iconName: 'MapPin', isVisible: true },
  { id: 'assets', label: 'Assets', iconName: 'Package', isVisible: true },
];

const iconMap = {
  LayoutDashboard,
  Wrench,
  MapPin,
  Package
};

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [sites, setSites] = useState<Site[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [srs, setSrs] = useState<ServiceRequest[]>([]);
  const [selectedSR, setSelectedSR] = useState<ServiceRequest | null>(null);
  const [dbStatus, setDbStatus] = useState<'connecting' | 'connected' | 'error' | 'needs_setup'>('connecting');
  const [dbErrorMessage, setDbErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  // Customization state
  const [tabConfigs, setTabConfigs] = useState<TabConfig[]>(() => {
    const saved = localStorage.getItem('mainti_tab_config');
    return saved ? JSON.parse(saved) : DEFAULT_TABS;
  });

  // Modals state
  const [showAddSite, setShowAddSite] = useState(false);
  const [showAddAsset, setShowAddAsset] = useState(false);
  const [showAddSR, setShowAddSR] = useState(false);

  // Form State
  const [newSite, setNewSite] = useState({ name: '', location: '' });
  const [newAsset, setNewAsset] = useState({ name: '', type: 'General', site_id: '' });
  const [newSR, setNewSR] = useState({ title: '', description: '', site_id: '', asset_id: '' });

  useEffect(() => {
    localStorage.setItem('mainti_tab_config', JSON.stringify(tabConfigs));
  }, [tabConfigs]);

  const fetchData = async () => {
    setIsLoading(true);
    setDbErrorMessage(null);
    
    const status = await checkConnection();
    
    if (status.needsSetup) {
      setDbStatus('needs_setup');
      setDbErrorMessage("Database connected, but tables are missing.");
      setIsLoading(false);
      return;
    }

    if (!status.connected) {
      setDbStatus('error');
      setDbErrorMessage(status.error || "Failed to connect to Supabase.");
      setIsLoading(false);
      return;
    }

    setDbStatus('connected');
    try {
      const [sitesRes, assetsRes, srsRes] = await Promise.all([
        supabase.from('sites').select('*').order('name'),
        supabase.from('assets').select('*').order('name'),
        supabase.from('service_requests').select('*').order('created_at', { ascending: false })
      ]);

      if (sitesRes.error) throw sitesRes.error;
      if (assetsRes.error) throw assetsRes.error;
      if (srsRes.error) throw srsRes.error;

      if (sitesRes.data) setSites(sitesRes.data);
      if (assetsRes.data) setAssets(assetsRes.data);
      if (srsRes.data) setSrs(srsRes.data);
    } catch (err: any) {
      setDbStatus('error');
      setDbErrorMessage(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'service_requests' },
        (payload) => {
          setSrs(current => [payload.new as ServiceRequest, ...current]);
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'service_requests' },
        (payload) => {
          setSrs(current => current.map(sr => sr.id === payload.new.id ? payload.new as ServiceRequest : sr));
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'service_requests' },
        (payload) => {
          setSrs(current => current.filter(sr => sr.id !== payload.old.id));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const moveTab = (index: number, direction: 'up' | 'down') => {
    const newTabs = [...tabConfigs];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newTabs.length) return;
    
    const temp = newTabs[index];
    newTabs[index] = newTabs[targetIndex];
    newTabs[targetIndex] = temp;
    setTabConfigs(newTabs);
  };

  const toggleTabVisibility = (id: string) => {
    setTabConfigs(current => current.map(t => 
      t.id === id ? { ...t, isVisible: !t.isVisible } : t
    ));
  };

  const handleCreateSite = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    const site: Site = {
      id: crypto.randomUUID(),
      name: newSite.name,
      location: newSite.location,
      code: `SITE-${Math.floor(100 + Math.random() * 900)}`,
      status: Status.ACTIVE
    };

    const { error } = await supabase.from('sites').insert([site]);
    if (!error) {
      setSites(prev => [...prev, site]);
      setShowAddSite(false);
      setNewSite({ name: '', location: '' });
    }
    setIsSaving(false);
  };

  const handleCreateAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    const asset: Asset = {
      id: crypto.randomUUID(),
      name: newAsset.name,
      type: newAsset.type,
      site_id: newAsset.site_id,
      code: `AST-${Math.floor(1000 + Math.random() * 9000)}`,
      status: Status.ACTIVE
    };

    const { error } = await supabase.from('assets').insert([asset]);
    if (!error) {
      setAssets(prev => [...prev, asset]);
      setShowAddAsset(false);
      setNewAsset({ name: '', type: 'General', site_id: '' });
    }
    setIsSaving(false);
  };

  const handleCreateSR = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    const sr: ServiceRequest = {
      id: `SR-${Math.floor(1000 + Math.random() * 9000)}`,
      title: newSR.title,
      description: newSR.description,
      site_id: newSR.site_id || null,
      asset_id: newSR.asset_id || null,
      status: SRStatus.NEW,
      source: SRSource.WEB,
      created_at: new Date().toISOString()
    };

    const { error } = await supabase.from('service_requests').insert([sr]);
    if (!error) {
      setShowAddSR(false);
      setNewSR({ title: '', description: '', site_id: '', asset_id: '' });
    }
    setIsSaving(false);
  };

  const updateSRStatus = async (id: string, status: SRStatus) => {
    await supabase.from('service_requests').update({ status }).eq('id', id);
    if (selectedSR?.id === id) setSelectedSR(prev => prev ? { ...prev, status } : null);
  };

  const deleteSR = async (id: string) => {
    await supabase.from('service_requests').delete().eq('id', id);
    setSelectedSR(null);
  };

  const renderContent = () => {
    if (isLoading) return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
        <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
        <p className="text-slate-400 font-medium animate-pulse">Synchronizing with Cloud DB...</p>
      </div>
    );

    switch (activeTab) {
      case 'dashboard':
        return <Dashboard srs={srs} />;
      case 'srs':
        return <SRList srs={srs} sites={sites} assets={assets} onSelect={setSelectedSR} onNewRequest={() => setShowAddSR(true)} />;
      case 'sites':
        return (
          <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex justify-between items-end">
              <div>
                <h2 className="text-3xl font-bold text-slate-800 mb-1">Sites</h2>
                <p className="text-slate-500 text-sm">Manage physical locations</p>
              </div>
              <button onClick={() => setShowAddSite(true)} className="bg-slate-900 text-white px-5 py-2.5 rounded-lg text-sm font-bold flex items-center gap-2 shadow-md hover:bg-slate-800 transition-all active:scale-95">
                <Plus size={18} /> Add Site
              </button>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {sites.map(site => (
                <div key={site.id} className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between hover:shadow-md transition-all group">
                  <div className="mb-6">
                    <div className="flex justify-between items-start mb-4">
                      <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                        <MapPin size={24} />
                      </div>
                      <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 text-[10px] font-bold uppercase rounded tracking-wider">
                        {site.status}
                      </span>
                    </div>
                    <h3 className="text-xl font-bold text-slate-800 mb-0.5">{site.name}</h3>
                    <p className="text-[11px] font-bold text-slate-400 tracking-widest uppercase mb-4">{site.code}</p>
                    <p className="text-sm text-slate-500 font-medium">{site.location}</p>
                  </div>
                </div>
              ))}
              {sites.length === 0 && (
                <div className="col-span-full py-20 text-center bg-white rounded-2xl border border-dashed border-slate-200">
                  <p className="text-slate-400">No sites found.</p>
                </div>
              )}
            </div>
          </div>
        );
      case 'assets':
        return (
          <div className="space-y-6 animate-in fade-in duration-500">
             <div className="flex justify-between items-end">
              <div>
                <h2 className="text-3xl font-bold text-slate-800 mb-1">Assets</h2>
                <p className="text-slate-500 text-sm">Equipment items</p>
              </div>
              <button onClick={() => setShowAddAsset(true)} className="bg-slate-900 text-white px-5 py-2.5 rounded-lg text-sm font-bold flex items-center gap-2 shadow-md hover:bg-slate-800 transition-all active:scale-95">
                <Plus size={18} /> Add Asset
              </button>
            </div>
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden overflow-x-auto">
              <table className="w-full text-left min-w-[600px]">
                <thead className="text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-50">
                  <tr>
                    <th className="px-6 py-4">Asset</th>
                    <th className="px-6 py-4">Site</th>
                    <th className="px-6 py-4">Type</th>
                    <th className="px-6 py-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {assets.map(asset => (
                    <tr key={asset.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-slate-100 text-slate-400 rounded-lg">
                            <Package size={20} />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-slate-800">{asset.name}</p>
                            <p className="text-[10px] text-slate-400 font-bold tracking-widest uppercase">{asset.code}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-slate-600">
                        {sites.find(s => s.id === asset.site_id)?.name || 'Unknown'}
                      </td>
                      <td className="px-6 py-4"><span className="px-2 py-1 bg-slate-100 text-slate-600 text-[10px] font-bold uppercase rounded">{asset.type}</span></td>
                      <td className="px-6 py-4 text-xs font-bold text-emerald-600 uppercase">{asset.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      case 'settings':
        return (
          <div className="max-w-2xl mx-auto space-y-8 animate-in fade-in duration-500 pb-12">
             <h2 className="text-3xl font-bold text-slate-800">Settings</h2>
             
             {/* Navigation Customization Card */}
             <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm space-y-6">
                <div>
                   <h3 className="text-lg font-bold text-slate-800 mb-1 flex items-center gap-2">
                     Navigation Sidebar
                   </h3>
                   <p className="text-sm text-slate-500 mb-6">Reorder or hide tabs in your sidebar.</p>
                   
                   <div className="space-y-3">
                     {tabConfigs.map((tab, index) => {
                       const Icon = iconMap[tab.iconName];
                       return (
                         <div key={tab.id} className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100 transition-all hover:border-blue-200 group">
                            <GripVertical size={16} className="text-slate-300 group-hover:text-slate-400" />
                            <div className="p-2 bg-white rounded-xl text-slate-600 shadow-sm">
                               <Icon size={18} />
                            </div>
                            <div className="flex-1">
                               <p className="text-sm font-bold text-slate-800">{tab.label}</p>
                               <p className="text-[10px] text-slate-400 font-medium uppercase tracking-tight">Tab ID: {tab.id}</p>
                            </div>
                            <div className="flex items-center gap-2">
                               <button 
                                 onClick={() => moveTab(index, 'up')}
                                 disabled={index === 0}
                                 className="p-2 text-slate-400 hover:text-blue-600 disabled:opacity-30 disabled:hover:text-slate-400 transition-colors"
                               >
                                 <ArrowUp size={18} />
                               </button>
                               <button 
                                 onClick={() => moveTab(index, 'down')}
                                 disabled={index === tabConfigs.length - 1}
                                 className="p-2 text-slate-400 hover:text-blue-600 disabled:opacity-30 disabled:hover:text-slate-400 transition-colors"
                               >
                                 <ArrowDown size={18} />
                               </button>
                               <button 
                                 onClick={() => toggleTabVisibility(tab.id)}
                                 className={`p-2 transition-colors ${tab.isVisible ? 'text-blue-500 hover:text-blue-700' : 'text-slate-300 hover:text-slate-400'}`}
                               >
                                 {tab.isVisible ? <Eye size={18} /> : <EyeOff size={18} />}
                               </button>
                            </div>
                         </div>
                       );
                     })}
                   </div>
                </div>
             </div>

             <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm space-y-6">
                <div>
                   <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                     <ShieldCheck className="text-blue-500" size={20} />
                     Database Connection
                   </h3>
                   <div className={`p-4 rounded-2xl border flex flex-col gap-4 ${
                     dbStatus === 'connected' ? 'bg-emerald-50 border-emerald-100' : 'bg-red-50 border-red-100'
                   }`}>
                      <div className="flex items-center justify-between w-full">
                        <div className="flex items-center gap-3">
                          <div className={`w-3 h-3 rounded-full ${
                            dbStatus === 'connected' ? 'bg-emerald-500' : 'bg-red-500'
                          }`} />
                          <span className={`font-bold text-sm ${
                            dbStatus === 'connected' ? 'text-emerald-700' : 'text-red-700'
                          }`}>
                            {dbStatus === 'connected' ? 'Supabase Online' : 'Supabase Offline'}
                          </span>
                        </div>
                        <button onClick={fetchData} className="text-xs font-bold text-blue-600 uppercase hover:underline">Refresh</button>
                      </div>
                   </div>
                </div>
             </div>
          </div>
        )
      default:
        return null;
    }
  };

  return (
    <Layout 
      activeTab={activeTab} 
      onTabChange={setActiveTab} 
      dbStatus={dbStatus === 'connected' ? 'connected' : (dbStatus === 'connecting' ? 'connecting' : 'error')}
      tabConfigs={tabConfigs}
    >
      {renderContent()}

      {(showAddSite || showAddAsset || showAddSR) && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[60] animate-in fade-in duration-200" onClick={() => { setShowAddSite(false); setShowAddAsset(false); setShowAddSR(false); }} />
      )}

      {showAddSite && (
        <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white rounded-3xl shadow-2xl z-[70] p-8 animate-in zoom-in-95 duration-200">
          <h3 className="text-xl font-bold text-slate-800 mb-6">Add New Site</h3>
          <form onSubmit={handleCreateSite} className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Site Name</label>
              <input required type="text" placeholder="e.g. North Wing" className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500" value={newSite.name} onChange={e => setNewSite({...newSite, name: e.target.value})} />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Location</label>
              <input required type="text" placeholder="e.g. New York" className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500" value={newSite.location} onChange={e => setNewSite({...newSite, location: e.target.value})} />
            </div>
            <div className="flex gap-3 pt-4">
              <button type="button" onClick={() => setShowAddSite(false)} className="flex-1 py-3 text-sm font-bold text-slate-500">Cancel</button>
              <button disabled={isSaving} type="submit" className="flex-1 bg-blue-600 text-white py-3 rounded-xl text-sm font-bold shadow-lg hover:bg-blue-700 transition-all flex items-center justify-center">
                {isSaving ? <Loader2 size={18} className="animate-spin" /> : 'Create Site'}
              </button>
            </div>
          </form>
        </div>
      )}

      {showAddAsset && (
        <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white rounded-3xl shadow-2xl z-[70] p-8 animate-in zoom-in-95 duration-200">
          <h3 className="text-xl font-bold text-slate-800 mb-6">Add New Asset</h3>
          <form onSubmit={handleCreateAsset} className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Asset Name</label>
              <input required type="text" placeholder="e.g. AC Unit" className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500" value={newAsset.name} onChange={e => setNewAsset({...newAsset, name: e.target.value})} />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Type</label>
              <select className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500" value={newAsset.type} onChange={e => setNewAsset({...newAsset, type: e.target.value})}>
                <option>General</option>
                <option>Electrical</option>
                <option>Mechanical</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Site</label>
              <select required className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500" value={newAsset.site_id} onChange={e => setNewAsset({...newAsset, site_id: e.target.value})}>
                <option value="">Select a Site...</option>
                {sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div className="flex gap-3 pt-4">
              <button type="button" onClick={() => setShowAddAsset(false)} className="flex-1 py-3 text-sm font-bold text-slate-500">Cancel</button>
              <button disabled={isSaving} type="submit" className="flex-1 bg-blue-600 text-white py-3 rounded-xl text-sm font-bold shadow-lg hover:bg-blue-700 transition-all flex items-center justify-center">
                {isSaving ? <Loader2 size={18} className="animate-spin" /> : 'Create Asset'}
              </button>
            </div>
          </form>
        </div>
      )}

      {showAddSR && (
        <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg bg-white rounded-3xl shadow-2xl z-[70] p-8 animate-in zoom-in-95 duration-200">
          <h3 className="text-xl font-bold text-slate-800 mb-6">Create Service Request</h3>
          <form onSubmit={handleCreateSR} className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Short Title</label>
              <input required type="text" className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500" value={newSR.title} onChange={e => setNewSR({...newSR, title: e.target.value})} />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Description</label>
              <textarea rows={3} className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 resize-none" value={newSR.description} onChange={e => setNewSR({...newSR, description: e.target.value})} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Site</label>
                <select className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500" value={newSR.site_id} onChange={e => setNewSR({...newSR, site_id: e.target.value})}>
                  <option value="">Unknown</option>
                  {sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Asset</label>
                <select className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500" value={newSR.asset_id} onChange={e => setNewSR({...newSR, asset_id: e.target.value})}>
                  <option value="">Unknown</option>
                  {assets.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </div>
            </div>
            <div className="flex gap-3 pt-4">
              <button type="button" onClick={() => setShowAddSR(false)} className="flex-1 py-3 text-sm font-bold text-slate-500">Cancel</button>
              <button disabled={isSaving} type="submit" className="flex-1 bg-blue-600 text-white py-3 rounded-xl text-sm font-bold shadow-lg hover:bg-blue-700 transition-all flex items-center justify-center">
                {isSaving ? <Loader2 size={18} className="animate-spin" /> : 'Log Request'}
              </button>
            </div>
          </form>
        </div>
      )}

      {selectedSR && (
        <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center p-0 md:p-6 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-lg md:rounded-3xl shadow-2xl flex flex-col max-h-[95vh] animate-in slide-in-from-bottom-10 duration-500 overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-10">
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-slate-400 tracking-widest uppercase">#{selectedSR.id}</span>
                <span className={`px-2.5 py-1 text-[10px] font-bold uppercase rounded tracking-wider ${
                  selectedSR.status === SRStatus.NEW ? 'bg-blue-100 text-blue-700' :
                  selectedSR.status === SRStatus.IN_PROGRESS ? 'bg-amber-100 text-amber-700' :
                  selectedSR.status === SRStatus.RESOLVED ? 'bg-emerald-100 text-emerald-700' :
                  'bg-slate-100 text-slate-600'
                }`}>
                  {selectedSR.status}
                </span>
              </div>
              <button onClick={() => setSelectedSR(null)} className="p-2 hover:bg-slate-50 rounded-full text-slate-400">
                <X size={20} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-8 space-y-8">
               <div>
                  <h2 className="text-2xl font-bold text-slate-900 mb-3">{selectedSR.title}</h2>
                  <div className="flex flex-wrap gap-4 text-xs font-medium text-slate-400">
                    <span>{new Date(selectedSR.created_at).toLocaleString()}</span>
                    <span>•</span>
                    <span className="flex items-center gap-1 uppercase tracking-wider">Source: {selectedSR.source}</span>
                  </div>
               </div>
               <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">Description</p>
                  <div className="p-5 bg-slate-50 border border-slate-100 rounded-2xl text-sm leading-relaxed text-slate-700 whitespace-pre-line">
                    {selectedSR.description}
                  </div>
               </div>
               <div className="space-y-4">
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Update Status</p>
                  <div className="grid grid-cols-2 gap-2">
                    {Object.values(SRStatus).map(s => (
                      <button 
                        key={s} 
                        onClick={() => updateSRStatus(selectedSR.id, s)}
                        className={`p-3 rounded-xl text-xs font-bold transition-all border ${
                          selectedSR.status === s ? 'bg-blue-600 border-blue-600 text-white shadow-lg' : 'bg-white border-slate-200 text-slate-600'
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
               </div>
            </div>
            <div className="p-6 bg-slate-50 border-t border-slate-100 flex gap-4">
               <button onClick={() => setSelectedSR(null)} className="flex-1 bg-white border border-slate-200 py-3 rounded-xl font-bold text-sm hover:bg-slate-50 transition-colors">Close</button>
               <button onClick={() => deleteSR(selectedSR.id)} className="w-14 h-14 bg-red-50 text-red-500 rounded-xl flex items-center justify-center hover:bg-red-100 transition-all active:scale-90"><Trash2 size={22} /></button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default App;

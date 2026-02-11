
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
  X, MapPin, Plus, Loader2, Wrench, ArrowRight, Layers, CheckCircle, Building, AlertCircle, RefreshCw, Phone, User, Package, UserCheck, Terminal, Rocket, Sparkles, UserCircle, UserMinus
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
      const { data: org, error: orgErr } = await supabase.from('organizations').insert([{ name: orgName }]).select().single();
      if (orgErr) throw orgErr;

      const { error: siteErr } = await supabase.from('sites').insert([{
        org_id: org.id,
        name: siteName,
        location: siteLocation,
        code: `SITE-${Math.floor(1000 + Math.random() * 9000)}`,
        status: Status.ACTIVE
      }]);
      if (siteErr) throw siteErr;

      const { error: profErr } = await supabase.from('profiles').upsert({
        id: user.id,
        org_id: org.id,
        phone: user.phone,
        full_name: adminName,
        role: 'admin'
      }, { onConflict: 'id' });
      
      if (profErr) throw profErr;

      const updatedUser: UserProfile = {
        ...user,
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
            <h2 className="text-3xl font-black text-slate-900 leading-tight">Your Identity</h2>
            <input autoFocus className="w-full bg-slate-50 border-2 border-transparent focus:border-blue-500 focus:bg-white rounded-3xl p-6 outline-none font-bold text-lg" placeholder="Admin Full Name" value={adminName} onChange={e => setAdminName(e.target.value)} />
            <button disabled={!adminName} onClick={() => setStep(2)} className="w-full bg-slate-900 text-white py-6 rounded-3xl font-black flex items-center justify-center gap-3">Continue <ArrowRight /></button>
          </div>
        )}
        {step === 2 && (
          <div className="space-y-6 animate-in slide-in-from-right duration-300">
            <h2 className="text-3xl font-black text-slate-900">Organization</h2>
            <input autoFocus className="w-full bg-slate-50 border-2 border-transparent focus:border-blue-500 focus:bg-white rounded-3xl p-6 outline-none font-bold text-lg" placeholder="e.g. Skyline Towers" value={orgName} onChange={e => setOrgName(e.target.value)} />
            <button disabled={!orgName} onClick={() => setStep(3)} className="w-full bg-slate-900 text-white py-6 rounded-3xl font-black flex items-center justify-center gap-3">Continue <ArrowRight /></button>
          </div>
        )}
        {step === 3 && (
          <div className="space-y-6 animate-in slide-in-from-right duration-300">
            <h2 className="text-3xl font-black text-slate-900">Primary Site</h2>
            <div className="space-y-4">
              <input autoFocus className="w-full bg-slate-50 border-2 border-transparent focus:border-blue-500 focus:bg-white rounded-3xl p-5 outline-none font-bold" placeholder="Site Name" value={siteName} onChange={e => setSiteName(e.target.value)} />
              <input className="w-full bg-slate-50 border-2 border-transparent focus:border-blue-500 focus:bg-white rounded-3xl p-5 outline-none font-bold" placeholder="Location" value={siteLocation} onChange={e => setSiteLocation(e.target.value)} />
            </div>
            <button disabled={loading || !siteName || !siteLocation} onClick={handleSetup} className="w-full bg-blue-600 text-white py-6 rounded-3xl font-black flex items-center justify-center gap-3">
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
    } catch {
      return DEFAULT_TABS;
    }
  });

  const [showAddSite, setShowAddSite] = useState(false);
  const [showAddBlock, setShowAddBlock] = useState(false);
  const [showAddAsset, setShowAddAsset] = useState(false);
  const [showAddTenant, setShowAddTenant] = useState(false);
  const [showAddSR, setShowAddSR] = useState(false);
  const [showApproveModal, setShowApproveModal] = useState<Requester | null>(null);
  const [activeSiteForBlock, setActiveSiteForBlock] = useState<string | null>(null);

  const fetchBlocks = useCallback(async (siteIds: string[]) => {
    if (siteIds.length === 0) return;
    const { data } = await supabase.from('blocks').select('*').in('site_id', siteIds);
    if (data) setBlocks(data);
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
      
      setSites(siteData.data || []);
      setAssets(assetData.data || []);
      setTenants(tenantData.data || []);
      setRequesters(reqData.data || []);
      setSrs((srData.data || []).sort((a,b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));

      if (siteData.data && siteData.data.length > 0) {
        await fetchBlocks(siteData.data.map(s => s.id));
      }
      setDbStatus('connected');
    } catch (err: any) { 
      setDbStatus('error');
    } finally { setIsLoading(false); }
  }, [currentUser?.org_id, fetchBlocks]);

  const syncOrphanedRequesters = useCallback(async () => {
    if (!currentUser?.org_id) return;
    
    // 1. Get all tickets sent via WhatsApp
    const { data: whatsappSRs } = await supabase
      .from('service_requests')
      .select('requester_phone')
      .eq('org_id', currentUser.org_id)
      .eq('source', 'WhatsApp');
      
    if (!whatsappSRs) return;

    const phones = [...new Set(whatsappSRs.map(sr => sr.requester_phone).filter(Boolean))];
    if (phones.length === 0) return;

    // 2. Identify phones that aren't yet in our requester log AT ALL (any status)
    const { data: existingRequesters } = await supabase.from('requesters').select('phone').in('phone', phones);
    const loggedPhones = new Set(existingRequesters?.map(r => r.phone) || []);
    
    // 3. Identify phones that aren't registered tenants
    const { data: existingTenants } = await supabase.from('tenants').select('phone').in('phone', phones);
    const registeredPhones = new Set(existingTenants?.map(t => t.phone) || []);
    
    const unknownPhones = phones.filter(p => p && !registeredPhones.has(p) && !loggedPhones.has(p));

    // 4. Populate Approval queue ONLY for truly unknown WhatsApp users
    if (unknownPhones.length > 0) {
      const inserts = unknownPhones.map(p => ({ 
        phone: p, 
        org_id: currentUser.org_id, 
        status: 'pending' 
      }));
      await supabase.from('requesters').upsert(inserts, { onConflict: 'phone' });
      
      const { data: updatedReqs } = await supabase.from('requesters').select('*').eq('org_id', currentUser.org_id).eq('status', 'pending');
      if (updatedReqs) setRequesters(updatedReqs);
    }
  }, [currentUser?.org_id]);

  useEffect(() => {
    if (currentUser?.org_id) {
      fetchOrgData();
      syncOrphanedRequesters();
    }
  }, [currentUser?.org_id, fetchOrgData, syncOrphanedRequesters]);

  const handleSignIn = (user: UserProfile) => {
    localStorage.setItem('fm_engine_user', JSON.stringify(user));
    setCurrentUser(user);
    setActiveTab('dashboard');
  };

  const handleLogout = () => {
    localStorage.removeItem('fm_engine_user');
    setCurrentUser(null);
  };

  const handleAddItem = async (table: string, payload: any, setter: Function, closeFn: Function) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.from(table).insert([{ ...payload, org_id: currentUser?.org_id }]).select();
      if (error) throw error;
      if (data) { setter((prev: any) => [data[0], ...prev]); closeFn(); }
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

  const handleRejectRequester = async (requester: Requester) => {
    if (!confirm(`Are you sure you want to reject +${requester.phone}? They will no longer appear in the queue.`)) return;
    setIsLoading(true);
    try {
      await supabase.from('requesters').update({ status: 'rejected' }).eq('id', requester.id);
      setRequesters(prev => prev.filter(r => r.id !== requester.id));
    } catch (err: any) { alert("Action failed: " + err.message); }
    finally { setIsLoading(false); }
  };

  if (!currentUser) return <Auth onSignIn={handleSignIn} />;
  if (!currentUser.org_id && currentUser.role === 'admin') return <Onboarding user={currentUser} onComplete={setCurrentUser} />;
  if (currentUser.role === 'tenant') return <TenantPortal user={currentUser} onLogout={handleLogout} />;

  return (
    <Layout activeTab={activeTab} onTabChange={setActiveTab} dbStatus={dbStatus === 'error' ? 'error' : (dbStatus === 'connected' ? 'connected' : 'connecting')} tabConfigs={tabConfigs} orgName={organization?.name}>
      {activeTab === 'dashboard' && <Dashboard srs={srs} onNewRequest={() => setShowAddSR(true)} assets={assets} organization={organization} />}
      {activeTab === 'srs' && <SRList srs={srs} sites={sites} assets={assets} onSelect={() => {}} onNewRequest={() => setShowAddSR(true)} />}
      {activeTab === 'tenants' && <TenantList tenants={tenants} sites={sites} onAdd={() => setShowAddTenant(true)} />}
      
      {activeTab === 'requesters' && (
        <div className="space-y-6 animate-in fade-in duration-500">
          <div>
            <h2 className="text-3xl font-black text-slate-900">Approvals</h2>
            <p className="text-slate-500 font-medium">Strangers who messaged on WhatsApp.</p>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            {requesters.map(req => (
              <div key={req.id} className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm flex flex-col justify-between hover:border-blue-200 transition-all">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center"><Phone size={24} /></div>
                  <div>
                    <p className="text-lg font-black text-slate-900">+{req.phone}</p>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">WhatsApp Request</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <button onClick={() => setShowApproveModal(req)} className="flex-1 bg-slate-900 text-white py-4 rounded-2xl font-black flex items-center justify-center gap-2 hover:bg-slate-800 transition-all active:scale-95">
                    <UserCheck size={20} /> Approve
                  </button>
                  <button onClick={() => handleRejectRequester(req)} className="p-4 bg-red-50 text-red-600 rounded-2xl hover:bg-red-100 transition-all active:scale-95">
                    <UserMinus size={20} />
                  </button>
                </div>
              </div>
            ))}
            {requesters.length === 0 && (
              <div className="col-span-full py-24 text-center bg-white rounded-[40px] border-2 border-dashed border-slate-100">
                <Sparkles className="text-slate-200 mx-auto mb-4" size={32} />
                <p className="text-slate-400 font-bold text-lg">No pending approvals</p>
                <p className="text-slate-400 text-xs mt-1">Rejected or approved users will never reappear here.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'assets' && <AssetList assets={assets} sites={sites} blocks={blocks} onAdd={() => setShowAddAsset(true)} />}
      {activeTab === 'settings' && <Settings configs={tabConfigs} setConfigs={setTabConfigs} onLogout={handleLogout} />}
      {activeTab === 'sites' && (
        <div className="space-y-8 pb-20">
          <div className="flex justify-between items-end">
            <div><h2 className="text-3xl font-black text-slate-900">Sites</h2><p className="text-slate-500 font-medium">Physical Infrastructure</p></div>
            <button onClick={() => setShowAddSite(true)} className="bg-slate-900 text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 shadow-lg active:scale-95 transition-all"><Plus size={20} /> New Site</button>
          </div>
          <div className="grid md:grid-cols-2 gap-8">
            {sites.map(site => (
              <div key={site.id} className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm">
                <div className="flex justify-between items-start mb-6"><div className="p-4 bg-blue-50 text-blue-600 rounded-2xl"><MapPin size={28} /></div><span className="text-[10px] font-black uppercase text-slate-400">#{site.code}</span></div>
                <h3 className="text-2xl font-black text-slate-900">{site.name}</h3>
                <p className="text-sm font-medium text-slate-500 mb-8">{site.location}</p>
                <div className="pt-8 border-t border-slate-50">
                  <button onClick={() => { setActiveSiteForBlock(site.id); setShowAddBlock(true); }} className="text-xs font-bold text-blue-600 flex items-center gap-1 mb-4 hover:underline"><Plus size={14} /> Add Block</button>
                  <div className="flex flex-wrap gap-2">{blocks.filter(b => b.site_id === site.id).map(block => (<div key={block.id} className="px-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold text-slate-700 flex items-center gap-2"><Layers size={14} /> {block.name}</div>))}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODALS */}
      {showAddSR && (
        <div className="fixed inset-0 z-[1000] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4">
          <form onSubmit={async (e) => { e.preventDefault(); const fd = new FormData(e.currentTarget); await handleAddItem('service_requests', { id: `SR-${Math.floor(1000 + Math.random() * 9000)}`, title: fd.get('title'), description: fd.get('description'), site_id: fd.get('site_id') || null, status: SRStatus.NEW, source: SRSource.WEB, created_at: new Date().toISOString() }, setSrs, () => setShowAddSR(false)); }} className="bg-white w-full max-w-lg rounded-[40px] p-10 shadow-2xl space-y-8 animate-in zoom-in duration-300">
            <div className="flex justify-between items-center"><h3 className="text-3xl font-black text-slate-900">New Request</h3><button type="button" onClick={() => setShowAddSR(false)} className="p-2 bg-slate-100 rounded-full"><X size={24} /></button></div>
            <div className="space-y-4"><input required name="title" className="w-full bg-slate-50 rounded-2xl p-5 outline-none font-bold border-2 border-transparent focus:border-blue-500" placeholder="Summary" /><textarea name="description" className="w-full bg-slate-50 rounded-2xl p-5 outline-none font-medium h-32 border-2 border-transparent focus:border-blue-500" placeholder="Details" /><select name="site_id" className="w-full bg-slate-50 rounded-2xl p-5 outline-none font-bold"><option value="">Select Facility</option>{sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
            <button type="submit" disabled={isLoading} className="w-full bg-blue-600 text-white py-6 rounded-3xl font-black text-xl shadow-xl">{isLoading ? <Loader2 className="animate-spin mx-auto" /> : 'Log Ticket'}</button>
          </form>
        </div>
      )}

      {showAddAsset && (
        <div className="fixed inset-0 z-[1000] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4">
          <form onSubmit={async (e) => { e.preventDefault(); const fd = new FormData(e.currentTarget); await handleAddItem('assets', { name: fd.get('name'), type: fd.get('type'), code: `AST-${Math.floor(Math.random()*9000)}`, site_id: fd.get('site_id'), status: Status.ACTIVE }, setAssets, () => setShowAddAsset(false)); }} className="bg-white w-full max-w-lg rounded-[40px] p-10 shadow-2xl space-y-8 animate-in zoom-in duration-300">
            <div className="flex justify-between items-center"><h3 className="text-3xl font-black text-slate-900">Add Asset</h3><button type="button" onClick={() => setShowAddAsset(false)} className="p-2 bg-slate-100 rounded-full"><X size={24} /></button></div>
            <div className="space-y-4"><input required name="name" className="w-full bg-slate-50 rounded-2xl p-5 outline-none font-bold" placeholder="Asset Name" /><input name="type" className="w-full bg-slate-50 rounded-2xl p-5 outline-none font-bold" placeholder="Category" /><select required name="site_id" className="w-full bg-slate-50 rounded-2xl p-5 outline-none font-bold"><option value="">Site</option>{sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
            <button type="submit" disabled={isLoading} className="w-full bg-slate-900 text-white py-6 rounded-3xl font-black">{isLoading ? <Loader2 className="animate-spin mx-auto" /> : 'Register Asset'}</button>
          </form>
        </div>
      )}

      {showAddTenant && (
        <div className="fixed inset-0 z-[1000] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4">
          <form onSubmit={async (e) => { e.preventDefault(); const fd = new FormData(e.currentTarget); await handleAddItem('tenants', { name: fd.get('name'), phone: fd.get('phone'), site_id: fd.get('site_id'), status: Status.ACTIVE }, setTenants, () => setShowAddTenant(false)); }} className="bg-white w-full max-w-lg rounded-[40px] p-10 shadow-2xl space-y-8 animate-in zoom-in duration-300">
            <div className="flex justify-between items-center"><h3 className="text-3xl font-black text-slate-900">Add Resident</h3><button type="button" onClick={() => setShowAddTenant(false)} className="p-2 bg-slate-100 rounded-full"><X size={24} /></button></div>
            <div className="space-y-4"><input required name="name" className="w-full bg-slate-50 rounded-2xl p-5 outline-none font-bold" placeholder="Full Name" /><input required name="phone" className="w-full bg-slate-50 rounded-2xl p-5 outline-none font-bold" placeholder="Mobile" /><select required name="site_id" className="w-full bg-slate-50 rounded-2xl p-5 outline-none font-bold"><option value="">Site</option>{sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
            <button type="submit" disabled={isLoading} className="w-full bg-slate-900 text-white py-6 rounded-3xl font-black">Save</button>
          </form>
        </div>
      )}

      {showAddSite && (
        <div className="fixed inset-0 z-[1000] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4">
           <form onSubmit={(e) => { e.preventDefault(); const fd = new FormData(e.currentTarget); handleAddItem('sites', { name: fd.get('name'), location: fd.get('location'), code: `SITE-${Math.floor(1000+Math.random()*9000)}`, status: Status.ACTIVE }, setSites, () => setShowAddSite(false)); }} className="bg-white w-full max-w-md rounded-[48px] p-12 shadow-2xl space-y-8 animate-in zoom-in duration-300">
              <div className="flex justify-between items-center"><h3 className="text-3xl font-black text-slate-900">New Site</h3><button type="button" onClick={() => setShowAddSite(false)} className="p-2 bg-slate-100 rounded-full"><X size={24} /></button></div>
              <div className="space-y-4"><input required name="name" className="w-full bg-slate-50 rounded-2xl p-5 outline-none font-bold" placeholder="Name" /><input required name="location" className="w-full bg-slate-50 rounded-2xl p-5 outline-none font-bold" placeholder="Location" /></div>
              <button type="submit" disabled={isLoading} className="w-full bg-slate-900 text-white py-6 rounded-3xl font-black">Create</button>
           </form>
        </div>
      )}

      {showApproveModal && (
        <div className="fixed inset-0 z-[1000] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4">
          <form onSubmit={async (e) => { e.preventDefault(); await handleApproveTenant(showApproveModal, new FormData(e.currentTarget)); }} className="bg-white w-full max-w-lg rounded-[40px] p-10 shadow-2xl space-y-8 animate-in zoom-in duration-300">
            <div className="flex justify-between items-center"><h3 className="text-3xl font-black text-slate-900">Activate Resident</h3><button type="button" onClick={() => setShowApproveModal(null)} className="p-2 bg-slate-100 rounded-full"><X size={24} /></button></div>
            <div className="space-y-4"><div className="p-6 bg-blue-50 text-blue-700 rounded-2xl font-black flex items-center gap-4 text-lg"><Phone size={24} /> +{showApproveModal.phone}</div><input required name="name" className="w-full bg-slate-50 rounded-2xl p-5 outline-none font-bold" placeholder="Full Display Name" /><select required name="site_id" className="w-full bg-slate-50 rounded-2xl p-5 outline-none font-bold"><option value="">Facility Site...</option>{sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
            <button type="submit" disabled={isLoading} className="w-full bg-emerald-600 text-white py-6 rounded-3xl font-black text-xl flex items-center justify-center gap-3 active:scale-95 shadow-xl shadow-emerald-100">Activate Account</button>
          </form>
        </div>
      )}
    </Layout>
  );
};

export default App;

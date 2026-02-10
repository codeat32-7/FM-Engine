
import React, { useState, useEffect } from 'react';
import { UserProfile, ServiceRequest, Site, Block, Tenant, SRStatus, SRSource } from '../types';
import { supabase } from '../lib/supabase';
import { LogOut, Wrench, MapPin, Layers, CheckCircle, Clock, Plus, MessageSquare, Loader2, X } from 'lucide-react';

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

  useEffect(() => {
    const fetchTenantData = async () => {
      setLoading(true);
      try {
        const { data: tenantData } = await supabase.from('tenants').select('*').eq('phone', user.phone).single();
        if (tenantData) {
          setTenant(tenantData);
          const [sData, bData, srData] = await Promise.all([
            supabase.from('sites').select('*').eq('id', tenantData.site_id).single(),
            tenantData.block_id ? supabase.from('blocks').select('*').eq('id', tenantData.block_id).single() : { data: null },
            supabase.from('service_requests').select('*').eq('requester_phone', user.phone).order('created_at', { ascending: false })
          ]);
          setSite(sData.data);
          setBlock(bData.data);
          setMySRs(srData.data || []);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchTenantData();
  }, [user.phone]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="animate-spin text-blue-600" size={48} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-20">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-20">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white font-black text-xl">F</div>
             <div>
                <h1 className="text-lg font-black text-slate-900 leading-none">Resident Portal</h1>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{tenant?.name}</p>
             </div>
          </div>
          <button onClick={onLogout} className="p-3 text-slate-400 hover:text-red-600 transition-colors">
            <LogOut size={20} />
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-6 space-y-8">
        {/* Unit Info Card */}
        <div className="bg-slate-900 rounded-[40px] p-10 text-white relative overflow-hidden shadow-2xl">
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 blur-3xl rounded-full"></div>
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
             <div className="space-y-4">
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 rounded-full border border-white/5">
                   <CheckCircle size={12} className="text-emerald-400" />
                   <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">Approved Resident</span>
                </div>
                <h2 className="text-3xl font-black tracking-tight">{site?.name}</h2>
                <div className="flex flex-wrap gap-4">
                   <div className="flex items-center gap-2 text-slate-400">
                      <MapPin size={16} />
                      <span className="text-sm font-medium">{site?.location}</span>
                   </div>
                   {block && (
                     <div className="flex items-center gap-2 text-slate-400">
                        <Layers size={16} />
                        <span className="text-sm font-medium">{block.name} ({block.type})</span>
                     </div>
                   )}
                </div>
             </div>
             <button 
              onClick={() => setShowAddSR(true)}
              className="bg-white text-slate-900 px-8 py-4 rounded-2xl font-black flex items-center justify-center gap-2 shadow-xl hover:bg-slate-50 transition-all active:scale-95"
             >
               <Plus size={20} /> Report Issue
             </button>
          </div>
        </div>

        {/* SR Section */}
        <div className="space-y-6">
           <div className="flex items-center justify-between">
              <h3 className="text-xl font-black text-slate-900">Your Tickets</h3>
              <div className="flex items-center gap-2 text-slate-400">
                 <Wrench size={16} />
                 <span className="text-sm font-bold">{mySRs.length} total</span>
              </div>
           </div>

           <div className="space-y-4">
              {mySRs.map(sr => (
                <div key={sr.id} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col gap-4">
                   <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                         <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">#{sr.id}</span>
                         <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest ${
                            sr.status === SRStatus.RESOLVED ? 'bg-emerald-50 text-emerald-700' : 'bg-blue-50 text-blue-700'
                         }`}>
                            {sr.status}
                         </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-slate-400 text-xs font-bold">
                         <Clock size={12} />
                         {new Date(sr.created_at).toLocaleDateString()}
                      </div>
                   </div>
                   <div>
                      <h4 className="font-black text-slate-900 text-lg mb-1">{sr.title}</h4>
                      <p className="text-sm text-slate-500 line-clamp-2">{sr.description}</p>
                   </div>
                   {sr.source === SRSource.WHATSAPP && (
                     <div className="flex items-center gap-2 text-emerald-600 text-[10px] font-black uppercase tracking-widest pt-2 border-t border-slate-50">
                        <MessageSquare size={14} /> Reported via WhatsApp
                     </div>
                   )}
                </div>
              ))}
              {mySRs.length === 0 && (
                <div className="text-center py-20 bg-white rounded-3xl border-2 border-dashed border-slate-100">
                   <p className="text-slate-400 font-bold">No maintenance reports found.</p>
                </div>
              )}
           </div>
        </div>
      </main>

      {/* Report Issue Modal */}
      {showAddSR && (
        <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4">
           <form 
            onSubmit={async (e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              const payload = {
                id: `SR-${Math.floor(1000 + Math.random() * 9000)}`,
                org_id: tenant?.org_id,
                site_id: tenant?.site_id,
                block_id: tenant?.block_id,
                title: fd.get('title'),
                description: fd.get('description'),
                status: SRStatus.NEW,
                source: SRSource.WEB,
                requester_phone: user.phone,
                created_at: new Date().toISOString()
              };
              const { data } = await supabase.from('service_requests').insert([payload]).select();
              if (data) setMySRs(prev => [data[0], ...prev]);
              setShowAddSR(false);
            }}
            className="bg-white w-full max-w-lg rounded-[40px] p-10 shadow-2xl space-y-8"
           >
              <div className="flex justify-between items-center">
                <h3 className="text-3xl font-black text-slate-900">Report Issue</h3>
                <button type="button" onClick={() => setShowAddSR(false)} className="p-2 bg-slate-100 rounded-full"><X size={24} /></button>
              </div>
              <div className="space-y-4">
                <input required name="title" className="w-full bg-slate-50 rounded-2xl p-5 outline-none font-bold" placeholder="What's the problem?" />
                <textarea name="description" className="w-full bg-slate-50 rounded-2xl p-5 outline-none font-medium h-32" placeholder="Tell us more details..." />
              </div>
              <button type="submit" className="w-full bg-blue-600 text-white py-6 rounded-3xl font-black text-xl flex items-center justify-center gap-2">
                 Submit Ticket
              </button>
           </form>
        </div>
      )}
    </div>
  );
};

export default TenantPortal;

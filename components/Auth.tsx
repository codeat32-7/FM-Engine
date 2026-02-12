
import React, { useState } from 'react';
import { MessageSquare, ArrowRight, Loader2, AlertCircle, ShieldCheck, UserCircle, ChevronRight } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { UserProfile } from '../types';

interface AuthProps {
  onSignIn: (user: UserProfile) => void;
}

interface ProfileWithOrg extends UserProfile {
  org_name?: string;
}

const Auth: React.FC<AuthProps> = ({ onSignIn }) => {
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [discoveredProfiles, setDiscoveredProfiles] = useState<ProfileWithOrg[]>([]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone) return;
    setLoading(true);
    setError(null);
    
    try {
      const cleanPhone = phone.replace(/[^0-9]/g, '');
      const suffix = cleanPhone.slice(-10); // Match last 10 digits
      
      const { data: profiles, error: profErr } = await supabase
        .from('profiles')
        .select('*, organizations(name)')
        .ilike('phone', `%${suffix}`);

      if (profErr) throw profErr;

      if (profiles && profiles.length > 0) {
        const mappedProfiles: ProfileWithOrg[] = profiles.map(p => ({
          id: p.id,
          org_id: p.org_id,
          phone: p.phone,
          full_name: p.full_name || '',
          onboarded: !!p.org_id,
          role: p.role,
          org_name: p.organizations?.name || 'Assigned Facility'
        }));

        if (mappedProfiles.length === 1) {
          onSignIn(mappedProfiles[0]);
        } else {
          setDiscoveredProfiles(mappedProfiles);
          setLoading(false);
        }
      } else {
        onSignIn({
          id: crypto.randomUUID(),
          org_id: null,
          phone: cleanPhone,
          full_name: '',
          onboarded: false,
          role: 'admin'
        });
      }
    } catch (err: any) {
      setError("Login failed. Check connection.");
      setLoading(false);
    }
  };

  if (discoveredProfiles.length > 0) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="w-full max-w-md bg-white rounded-[40px] p-10 shadow-2xl border border-slate-100">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-black text-slate-900">Choose Workspace</h2>
            <p className="text-slate-500 font-medium text-sm">Select which facility you are accessing.</p>
          </div>
          <div className="space-y-3">
            {discoveredProfiles.map((prof) => (
              <button
                key={prof.id}
                onClick={() => onSignIn(prof)}
                className="w-full bg-slate-50 hover:bg-white border-2 border-transparent hover:border-blue-500 rounded-3xl p-5 flex items-center justify-between transition-all group text-left"
              >
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${prof.role === 'admin' ? 'bg-slate-900 text-white' : 'bg-blue-100 text-blue-600'}`}>
                    {prof.role === 'admin' ? <ShieldCheck size={24} /> : <UserCircle size={24} />}
                  </div>
                  <div>
                    <p className="font-black text-slate-900 leading-tight">{prof.org_name}</p>
                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">{prof.role}</span>
                  </div>
                </div>
                <ChevronRight className="text-slate-300 group-hover:text-blue-500 transition-colors" size={20} />
              </button>
            ))}
          </div>
          <button onClick={() => setDiscoveredProfiles([])} className="w-full mt-6 py-4 text-slate-400 font-bold text-xs uppercase tracking-widest hover:text-slate-600">
            Switch Number
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md bg-white rounded-[40px] p-12 shadow-2xl border border-slate-100 relative overflow-hidden text-slate-900">
        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full -mr-16 -mt-16" />
        <div className="flex flex-col items-center text-center mb-10 relative z-10">
          <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-200 mb-6">
            <span className="text-white font-black text-2xl">F</span>
          </div>
          <h1 className="text-3xl font-black mb-1 leading-none">FM Engine</h1>
          <p className="text-slate-500 font-medium text-sm">Zero-Training CMMS</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
          {error && (
            <div className="p-4 bg-red-50 text-red-600 rounded-2xl flex items-start gap-3 text-sm font-bold">
              <AlertCircle size={18} className="shrink-0" /> {error}
            </div>
          )}
          <div className="space-y-4">
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Phone Number</label>
            <div className="relative group">
              <span className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 font-black text-lg">+</span>
              <input
                required
                type="tel"
                placeholder="91 72001 08575"
                className="w-full bg-slate-50 border-2 border-transparent focus:border-blue-500 focus:bg-white rounded-3xl py-5 pl-12 pr-6 outline-none transition-all font-black text-slate-800 text-lg"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
          </div>
          <button disabled={loading || !phone} type="submit" className="w-full bg-slate-900 text-white py-6 rounded-3xl font-black flex items-center justify-center gap-3 hover:bg-slate-800 transition-all active:scale-95 shadow-xl shadow-slate-100">
            {loading ? <Loader2 className="animate-spin" size={24} /> : <>Sign In <ArrowRight size={24} /></>}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Auth;

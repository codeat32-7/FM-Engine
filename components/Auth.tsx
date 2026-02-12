
import React, { useState } from 'react';
import { MessageSquare, ArrowRight, Loader2, AlertCircle, ShieldCheck, Building, UserCircle, ChevronRight, Globe } from 'lucide-react';
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
      
      // We look for a profile where the saved phone matches the suffix of what was entered
      // to handle cases where users might forget the country code or enter it differently.
      const { data: profiles, error: profErr } = await supabase
        .from('profiles')
        .select('*, organizations(name)')
        .like('phone', `%${cleanPhone.slice(-10)}`);

      if (profErr) throw profErr;

      if (profiles && profiles.length > 0) {
        const mappedProfiles: ProfileWithOrg[] = profiles.map(p => ({
          id: p.id,
          org_id: p.org_id,
          phone: p.phone,
          full_name: p.full_name || '',
          onboarded: !!p.org_id,
          role: p.role,
          org_name: p.organizations?.name || 'Unknown Organization'
        }));

        if (mappedProfiles.length === 1) {
          onSignIn(mappedProfiles[0]);
        } else {
          setDiscoveredProfiles(mappedProfiles);
          setLoading(false);
        }
      } else {
        // Start Admin Onboarding
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
      setError("Sync failed. Check your internet connection.");
      setLoading(false);
    }
  };

  const renderSelector = () => (
    <div className="space-y-6 animate-in slide-in-from-right duration-300">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-black text-slate-900">Select Context</h2>
        <p className="text-slate-500 font-medium text-sm">We found multiple accounts for this number.</p>
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
                <div className="flex items-center gap-2 mt-1">
                  <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded ${prof.role === 'admin' ? 'bg-slate-200 text-slate-700' : 'bg-blue-50 text-blue-600'}`}>
                    {prof.role}
                  </span>
                  {prof.full_name && <span className="text-[10px] font-bold text-slate-400">as {prof.full_name}</span>}
                </div>
              </div>
            </div>
            <ChevronRight className="text-slate-300 group-hover:text-blue-500 transition-colors" size={20} />
          </button>
        ))}
      </div>

      <button 
        onClick={() => setDiscoveredProfiles([])}
        className="w-full py-4 text-slate-400 font-bold text-xs uppercase tracking-widest hover:text-slate-600 transition-colors"
      >
        Back to Phone Entry
      </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md bg-white rounded-[40px] p-10 md:p-12 shadow-2xl border border-slate-100 animate-in fade-in zoom-in duration-500 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full -mr-16 -mt-16" />
        
        {discoveredProfiles.length === 0 ? (
          <>
            <div className="flex flex-col items-center text-center mb-10 relative z-10">
              <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-200 mb-6">
                <span className="text-white font-black text-2xl">F</span>
              </div>
              <h1 className="text-3xl font-black text-slate-900 mb-2 leading-none">FM Engine</h1>
              <p className="text-slate-500 font-medium text-sm">Lightweight Facility Management</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
              {error && (
                <div className="p-4 bg-red-50 text-red-600 rounded-2xl flex items-start gap-3 text-sm font-bold border border-red-100">
                  <AlertCircle size={18} className="shrink-0" />
                  {error}
                </div>
              )}

              <div className="space-y-4">
                <div className="flex justify-between items-center ml-1">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Phone Number</label>
                  <div className="flex items-center gap-1 text-[9px] font-black text-blue-600 uppercase tracking-widest">
                    <Globe size={10} /> Use Full Format
                  </div>
                </div>
                <div className="relative group">
                  <span className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 font-black text-lg transition-colors group-focus-within:text-blue-600">+</span>
                  <input
                    required
                    type="tel"
                    placeholder="91 72001 08575"
                    className="w-full bg-slate-50 border-2 border-transparent focus:border-blue-500 focus:bg-white rounded-3xl py-5 pl-12 pr-6 outline-none transition-all font-black text-slate-800 text-lg shadow-inner"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>
                <p className="text-[9px] text-slate-400 font-bold px-2 italic text-center">Important: Always include your country code (e.g. 91 for India) to match WhatsApp data.</p>
              </div>

              <button
                disabled={loading || !phone}
                type="submit"
                className="w-full bg-slate-900 text-white py-6 rounded-3xl font-black flex items-center justify-center gap-3 hover:bg-slate-800 transition-all active:scale-[0.98] shadow-2xl shadow-slate-300 disabled:opacity-50"
              >
                {loading ? <Loader2 className="animate-spin" size={24} /> : (
                  <>
                    Enter Platform <ArrowRight size={24} strokeWidth={3} />
                  </>
                )}
              </button>
            </form>
          </>
        ) : renderSelector()}
      </div>
    </div>
  );
};

export default Auth;

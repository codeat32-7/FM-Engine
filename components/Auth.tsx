
import React, { useState } from 'react';
import { MessageSquare, ArrowRight, Loader2, AlertCircle, ShieldCheck } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { UserProfile } from '../types';

interface AuthProps {
  onSignIn: (user: UserProfile) => void;
}

const Auth: React.FC<AuthProps> = ({ onSignIn }) => {
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone) return;
    setLoading(true);
    setError(null);
    
    try {
      const cleanPhone = phone.replace(/[^0-9]/g, '');
      
      // 1. Unified Identity Check via Profiles
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('phone', cleanPhone)
        .maybeSingle();

      if (profile) {
        onSignIn({
          id: profile.id,
          org_id: profile.org_id,
          phone: cleanPhone,
          full_name: profile.full_name || '',
          onboarded: !!profile.org_id,
          role: profile.role // 'admin' or 'tenant'
        });
      } else {
        // First contact: Start Admin Onboarding
        // Note: In a production app, you'd trigger an SMS OTP here
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
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md bg-white rounded-[40px] p-12 shadow-2xl border border-slate-100 animate-in fade-in zoom-in duration-500 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full -mr-16 -mt-16" />
        
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
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Phone Identification</label>
            <div className="relative group">
              <span className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 font-black text-lg transition-colors group-focus-within:text-blue-600">+</span>
              <input
                required
                type="tel"
                placeholder="1 234 567 890"
                className="w-full bg-slate-50 border-2 border-transparent focus:border-blue-500 focus:bg-white rounded-3xl py-5 pl-12 pr-6 outline-none transition-all font-black text-slate-800 text-lg shadow-inner"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
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

        <div className="mt-12 flex flex-col items-center justify-center gap-4 relative z-10">
          <div className="flex items-center gap-3 bg-emerald-50 px-4 py-2 rounded-full border border-emerald-100">
            <ShieldCheck className="text-emerald-500" size={16} />
            <p className="text-[10px] font-black text-emerald-700 uppercase tracking-widest">Secure Unified Portal</p>
          </div>
          <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Admins & Residents Only</p>
        </div>
      </div>
    </div>
  );
};

export default Auth;

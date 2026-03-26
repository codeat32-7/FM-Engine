
import React, { useState } from 'react';
import { ArrowRight, Loader2, AlertCircle, ShieldCheck, UserCircle, ChevronRight } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { UserProfile } from '../types';
import { phoneSuffix } from '../lib/phone';

interface AuthProps {
  onSignIn: (user: UserProfile) => void;
}

interface ProfileWithOrg extends UserProfile {
  org_name?: string;
}

const generateUUID = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

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
      const cleanPhone = phone.replace(/\D/g, '');
      const suffix = phoneSuffix(cleanPhone);

      const { data: profiles, error: profErr } = await supabase
        .from('profiles')
        .select('*, organizations(name)')
        .ilike('phone', `%${suffix}%`);

      if (profErr) {
        console.error('Supabase Error:', profErr);
        throw new Error(profErr.message);
      }

      if (profiles && profiles.length > 0) {
        const mappedProfiles: ProfileWithOrg[] = profiles.map(p => ({
          id: p.id,
          org_id: p.org_id,
          phone: p.phone,
          full_name: p.full_name || '',
          onboarded: !!p.org_id,
          role: p.role,
          org_name: (p.organizations as { name?: string } | null)?.name || 'Workspace'
        }));

        if (mappedProfiles.length === 1) {
          onSignIn(mappedProfiles[0]);
        } else {
          setDiscoveredProfiles(mappedProfiles);
          setLoading(false);
        }
      } else {
        onSignIn({
          id: generateUUID(),
          org_id: null,
          phone: cleanPhone,
          full_name: '',
          onboarded: false,
          role: 'admin'
        });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Check connection';
      setError(`Sign-in failed: ${msg}`);
      setLoading(false);
    }
  };

  if (discoveredProfiles.length > 0) {
    return (
      <div className="min-h-screen bg-fm-canvas flex items-center justify-center p-6">
        <div className="w-full max-w-md bg-fm-surface rounded-2xl p-8 shadow-fm border border-fm-border fm-animate-in">
          <div className="text-center mb-8">
            <p className="text-xs font-semibold text-fm-accent uppercase tracking-wider mb-2">Multiple access</p>
            <h2 className="text-xl font-bold text-fm-ink">Choose workspace</h2>
            <p className="text-fm-muted text-sm mt-2">This number is linked to more than one profile.</p>
          </div>
          <div className="space-y-2">
            {discoveredProfiles.map(prof => (
              <button
                key={prof.id}
                type="button"
                onClick={() => onSignIn(prof)}
                className="w-full bg-fm-canvas hover:bg-white border border-fm-border hover:border-fm-accent/40 rounded-xl p-4 flex items-center justify-between transition-colors text-left group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
                      prof.role === 'admin' ? 'bg-blue-50 text-blue-700' : 'bg-fm-accentsoft text-fm-accent'
                    }`}
                  >
                    {prof.role === 'admin' ? <ShieldCheck size={22} /> : <UserCircle size={22} />}
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-fm-ink truncate">{prof.org_name}</p>
                    <span className="text-[10px] font-semibold text-fm-muted uppercase tracking-wider">{prof.role}</span>
                  </div>
                </div>
                <ChevronRight className="text-fm-muted group-hover:text-fm-accent shrink-0" size={20} />
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setDiscoveredProfiles([])}
            className="w-full mt-6 py-3 text-fm-muted text-xs font-semibold uppercase tracking-wider hover:text-fm-ink"
          >
            Use different number
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-fm-canvas flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md bg-fm-surface rounded-2xl p-8 md:p-10 shadow-fm border border-fm-border fm-animate-in relative overflow-hidden">
        <div className="absolute top-0 right-0 w-40 h-40 bg-fm-accent/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />
        <div className="relative z-10 flex flex-col items-center text-center mb-8">
          <div className="w-14 h-14 bg-fm-accent rounded-2xl flex items-center justify-center shadow-lg shadow-fm-accent/30 mb-5">
            <span className="text-white font-bold text-2xl">F</span>
          </div>
          <h1 className="text-2xl font-bold text-fm-ink tracking-tight">FM Engine</h1>
          <p className="text-fm-muted text-sm mt-1">Facility maintenance &amp; work orders</p>
        </div>
        <form onSubmit={handleSubmit} className="relative z-10 space-y-5">
          {error && (
            <div className="p-4 bg-red-50 text-red-700 rounded-xl flex items-start gap-3 text-sm font-medium border border-red-100">
              <AlertCircle size={18} className="shrink-0 mt-0.5" />
              {error}
            </div>
          )}
          <div className="space-y-2">
            <label className="block text-[10px] font-semibold text-fm-muted uppercase tracking-wider ml-1">Mobile number</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-fm-muted font-semibold">+</span>
              <input
                required
                type="tel"
                autoComplete="tel"
                placeholder="Country code and number"
                className="w-full bg-fm-canvas border border-fm-border focus:border-fm-accent focus:ring-2 focus:ring-fm-accent/15 rounded-xl py-4 pl-9 pr-4 outline-none transition-all font-medium text-fm-ink"
                value={phone}
                onChange={e => setPhone(e.target.value)}
              />
            </div>
          </div>
          <button
            disabled={loading || !phone}
            type="submit"
            className="w-full bg-blue-600 text-white py-4 rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-blue-700 transition-colors disabled:opacity-40"
          >
            {loading ? <Loader2 className="animate-spin" size={22} /> : <>Continue <ArrowRight size={20} /></>}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Auth;

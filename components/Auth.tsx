
import React, { useState } from 'react';
import { MessageSquare, ArrowRight, Loader2 } from 'lucide-react';

interface AuthProps {
  onSignIn: (phone: string) => void;
}

const Auth: React.FC<AuthProps> = ({ onSignIn }) => {
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone) return;
    setLoading(true);
    setTimeout(() => {
      onSignIn(phone);
      setLoading(false);
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md bg-white rounded-[32px] p-10 shadow-2xl border border-slate-100 animate-in fade-in zoom-in duration-500">
        <div className="flex flex-col items-center text-center mb-10">
          <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-200 mb-6">
            <span className="text-white font-black text-2xl">F</span>
          </div>
          <h1 className="text-3xl font-black text-slate-900 mb-2">FM Engine</h1>
          <p className="text-slate-500 font-medium">Log in with your WhatsApp number</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Phone Number</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">+</span>
              <input
                required
                type="tel"
                placeholder="1 234 567 8900"
                className="w-full bg-slate-50 border-2 border-transparent focus:border-blue-500 focus:bg-white rounded-2xl py-4 pl-8 pr-4 outline-none transition-all font-bold text-slate-800"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
          </div>

          <button
            disabled={loading}
            type="submit"
            className="w-full bg-slate-900 text-white py-5 rounded-2xl font-bold flex items-center justify-center gap-3 hover:bg-slate-800 transition-all active:scale-[0.98] shadow-xl shadow-slate-200"
          >
            {loading ? <Loader2 className="animate-spin" size={20} /> : (
              <>
                Continue <ArrowRight size={20} />
              </>
            )}
          </button>
        </form>

        <div className="mt-10 flex items-center justify-center gap-3">
          <div className="p-2 bg-emerald-50 rounded-lg">
            <MessageSquare className="text-emerald-500" size={18} />
          </div>
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-tight">Connected via WhatsApp Sandbox</p>
        </div>
      </div>
    </div>
  );
};

export default Auth;

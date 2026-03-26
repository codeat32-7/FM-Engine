
import React, { useMemo } from 'react';
import { ServiceRequest, SRStatus, Asset, Organization, Status } from '../types';
import { Plus, Share2, ShieldCheck } from 'lucide-react';
import { meanResolutionHours, formatMeanResolution } from '../lib/metrics';
import type { Site } from '../types';

interface DashboardProps {
  srs: ServiceRequest[];
  onNewRequest: () => void;
  assets: Asset[];
  organization: Organization | null;
  sites?: Site[];
}

const Dashboard: React.FC<DashboardProps> = ({ srs, onNewRequest, assets, organization, sites = [] }) => {
  const resolvedCount = srs.filter(sr => sr.status === SRStatus.RESOLVED || sr.status === SRStatus.CLOSED).length;
  const activeCount = srs.filter(sr => sr.status === SRStatus.NEW || sr.status === SRStatus.IN_PROGRESS).length;
  const activeAssets = assets.filter(a => a.status === Status.ACTIVE).length;
  const uptime = assets.length > 0 ? `${((activeAssets / assets.length) * 100).toFixed(0)}%` : '—';

  const avgResolve = useMemo(() => formatMeanResolution(meanResolutionHours(srs)), [srs]);

  // Twilio sandbox requires their exact keyword phrase (e.g. `join bad-color`)
  const sandboxJoin =
    (import.meta.env.VITE_TWILIO_SANDBOX_JOIN as string | undefined)?.trim() || 'join bad-color';
  const waDigits =
    (import.meta.env.VITE_TWILIO_WHATSAPP_NUMBER as string | undefined)?.replace(/\\D/g, '') || '14155238886';
  const whatsappUrl = `https://wa.me/${waDigits}?text=${encodeURIComponent(sandboxJoin)}`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(whatsappUrl)}&ecc=M&margin=10`;

  const handleShare = async () => {
    const shareText = `*${organization?.name || 'Facility'}* Maintenance Support\\n\\nReport an issue via WhatsApp:\\n\\n👉 ${whatsappUrl}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Report maintenance', text: shareText, url: whatsappUrl });
      } catch {
        window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`, '_blank');
      }
    } else {
      window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`, '_blank');
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">Overview</h2>
          <p className="text-slate-500 font-medium text-sm">Work order status & resident intake</p>
        </div>
        <button
          onClick={onNewRequest}
          className="bg-blue-600 text-white px-8 py-4 rounded-2xl font-bold flex items-center justify-center gap-3 hover:bg-blue-700 transition-all shadow-xl shadow-blue-100 active:scale-95 text-lg"
        >
          <Plus size={24} strokeWidth={3} /> Log Service Request
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-[24px] border border-slate-100 shadow-sm flex flex-col justify-between h-28">
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Active Tickets</p>
          <p className="text-2xl font-black text-slate-900">{activeCount}</p>
        </div>
        <div className="bg-white p-5 rounded-[24px] border border-slate-100 shadow-sm flex flex-col justify-between h-28">
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Resolved</p>
          <p className="text-2xl font-black text-blue-600">{resolvedCount}</p>
        </div>
        <div className="bg-white p-5 rounded-[24px] border border-slate-100 shadow-sm flex flex-col justify-between h-28">
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Avg Resolve Time</p>
          <p className="text-2xl font-black text-slate-900">{avgResolve}</p>
        </div>
        <div className="bg-white p-5 rounded-[24px] border border-slate-100 shadow-sm flex flex-col justify-between h-28">
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Asset Coverage</p>
          <p className="text-2xl font-black text-blue-600">{uptime}</p>
        </div>
      </div>

      {/* Single merged card: WhatsApp message + QR */}
      <div className="bg-white rounded-[40px] p-6 md:p-10 text-slate-900 relative overflow-hidden shadow-2xl border border-slate-100">
        <div className="absolute top-0 right-0 w-[420px] h-[420px] bg-blue-500/10 blur-[110px] rounded-full -mr-28 -mt-28 opacity-90" />

        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8 md:gap-12">
          <div className="flex-1 space-y-6 text-center md:text-left">
            <div className="flex items-center gap-3 justify-center md:justify-start">
              <div className="w-12 h-12 bg-blue-600 text-white rounded-xl flex items-center justify-center shadow-lg shadow-blue-900/20">
                <span className="font-black text-xl">FM</span>
              </div>
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-500/10 border border-blue-500/20 rounded-full mb-2">
                  <ShieldCheck size={12} className="text-blue-600" />
                  <span className="text-[8px] font-black uppercase tracking-[0.2em] text-blue-700 leading-none">
                    FM Engine Official
                  </span>
                </div>
                <h3 className="text-2xl md:text-4xl font-black tracking-tight leading-tight">
                  WhatsApp Support
                  <br />
                  <span className="text-blue-700">Work Orders</span>
                </h3>
              </div>
            </div>

            <p className="text-slate-600 text-sm md:text-base font-medium leading-relaxed max-w-sm mx-auto md:mx-0">
              Scan to message the WhatsApp line. Twilio sandbox will prefill with:
              <span className="font-mono text-blue-700 font-semibold"> {sandboxJoin}</span>
            </p>

            <div className="flex flex-wrap gap-3 pt-1 justify-center md:justify-start">
              <button
                type="button"
                onClick={handleShare}
                className="bg-blue-600 text-white px-6 py-3 rounded-[16px] font-black flex items-center gap-2 hover:bg-blue-700 transition-all active:scale-95 shadow-lg shadow-blue-500/20 group text-sm"
              >
                <Share2 size={18} className="group-hover:rotate-12 transition-transform" />
                <span>Share intake link</span>
              </button>
            </div>
          </div>

          <div className="bg-white p-6 rounded-[40px] flex flex-col items-center gap-4 text-center shadow-3xl border border-slate-100 shrink-0">
            <div className="w-44 h-44 rounded-2xl flex items-center justify-center p-2 relative overflow-hidden border border-slate-100 shadow-inner bg-white">
              <img src={qrUrl} alt="WhatsApp QR Code" className="w-full h-full object-contain" loading="lazy" />
            </div>
            <div className="space-y-0.5">
              <p className="text-[10px] font-black text-slate-950 uppercase tracking-[0.2em] leading-none">Scan to report</p>
              <p className="text-[8px] font-bold text-slate-500 uppercase tracking-tight">
                {organization?.name}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;


import React, { useMemo } from 'react';
import { ServiceRequest, SRStatus, Asset, Organization, Status, Site } from '../types';
import { Plus, Share2, ClipboardList, Timer, Layers, CheckCircle2 } from 'lucide-react';
import { meanResolutionHours, formatMeanResolution } from '../lib/metrics';

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

  /** Twilio sandbox requires their exact keyword phrase (e.g. `join bad-color`).
   * We append the first site's code as a routing hint so the webhook can assign the right org/site.
   */
  const sandboxJoin =
    (import.meta.env.VITE_TWILIO_SANDBOX_JOIN as string | undefined)?.trim() || 'join bad-color';
  const primarySiteCode = sites[0]?.code;
  const sandboxJoinWithSiteHint = primarySiteCode ? `${sandboxJoin} ${primarySiteCode}` : sandboxJoin;
  const waDigits =
    (import.meta.env.VITE_TWILIO_WHATSAPP_NUMBER as string | undefined)?.replace(/\D/g, '') || '14155238886';
  const whatsappUrl = `https://wa.me/${waDigits}?text=${encodeURIComponent(sandboxJoinWithSiteHint)}`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=280x280&data=${encodeURIComponent(whatsappUrl)}&ecc=M&margin=8&color=0c1222`;

  const handleShare = async () => {
    const shareText = `${organization?.name || 'Our facility'} — report maintenance via WhatsApp:\n${whatsappUrl}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Maintenance intake', text: shareText, url: whatsappUrl });
      } catch {
        window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`, '_blank');
      }
    } else {
      window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`, '_blank');
    }
  };

  return (
    <div className="space-y-8 fm-animate-in">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
        <div>
          <p className="text-xs font-semibold text-fm-accent uppercase tracking-wider">Operations</p>
          <h2 className="text-2xl md:text-3xl font-bold text-fm-ink tracking-tight mt-1">Command center</h2>
          <p className="text-fm-muted text-sm mt-1 max-w-xl">Work order throughput, asset coverage, and resident intake in one view.</p>
        </div>
        <button
          type="button"
          onClick={onNewRequest}
          className="inline-flex items-center justify-center gap-2 bg-fm-accent text-white px-6 py-3.5 rounded-xl font-semibold shadow-fm hover:opacity-90 transition-opacity shrink-0"
        >
          <Plus size={20} strokeWidth={2.5} />
          New work order
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        {[
          { label: 'Open', value: String(activeCount), icon: ClipboardList, tone: 'text-fm-accent' },
          { label: 'Closed', value: String(resolvedCount), icon: CheckCircle2, tone: 'text-fm-success' },
          { label: 'Avg. resolve', value: avgResolve, icon: Timer, tone: 'text-fm-ink' },
          { label: 'Assets up', value: uptime, icon: Layers, tone: 'text-fm-ink' }
        ].map(({ label, value, icon: Icon, tone }) => (
          <div
            key={label}
            className="bg-fm-surface rounded-xl border border-fm-border p-4 md:p-5 shadow-fm flex flex-col gap-2 min-h-[100px] justify-between"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] md:text-[11px] font-semibold text-fm-muted uppercase tracking-wider">{label}</span>
              <Icon size={16} className="text-fm-muted shrink-0 opacity-70" />
            </div>
            <p className={`text-2xl md:text-3xl font-bold tabular-nums ${tone}`}>{value}</p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-5 gap-6 items-stretch">
        <div className="lg:col-span-3 bg-fm-navy rounded-2xl p-6 md:p-8 text-white relative overflow-hidden border border-slate-800 shadow-fm">
          <div className="absolute top-0 right-0 w-72 h-72 bg-fm-accent/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none" />
          <div className="relative z-10 space-y-5">
            <div>
              <p className="text-[10px] font-semibold text-fm-accent uppercase tracking-widest">Resident intake</p>
              <h3 className="text-xl md:text-2xl font-bold mt-2 leading-snug">WhatsApp maintenance line</h3>
              <p className="text-slate-400 text-sm mt-2 max-w-md leading-relaxed">
                QR/link pre-fills WhatsApp for Twilio sandbox with:{' '}
                <span className="text-white font-mono font-semibold">{sandboxJoinWithSiteHint}</span>
              </p>
            </div>
            <button
              type="button"
              onClick={handleShare}
              className="inline-flex items-center gap-2 bg-white text-fm-navy px-5 py-3 rounded-xl font-semibold text-sm hover:bg-slate-100 transition-colors"
            >
              <Share2 size={18} />
              Share intake link
            </button>
          </div>
        </div>
        <div className="lg:col-span-2 bg-fm-surface rounded-2xl border border-fm-border p-6 flex flex-col items-center justify-center text-center shadow-fm gap-3">
          <div className="w-44 h-44 md:w-48 md:h-48 rounded-xl border border-fm-border bg-white p-2 shadow-inner">
            <img src={qrUrl} alt="WhatsApp QR code" className="w-full h-full object-contain" loading="lazy" />
          </div>
          <p className="text-[10px] font-semibold text-fm-muted uppercase tracking-widest">Scan to message</p>
          <p className="text-xs text-fm-ink font-medium truncate max-w-full px-2">{organization?.name}</p>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

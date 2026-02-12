
import React from 'react';
import { ServiceRequest, SRStatus, Asset, Organization, Status, Site } from '../types';
import { Plus, Share2, ShieldCheck } from 'lucide-react';

interface DashboardProps {
  srs: ServiceRequest[];
  onNewRequest: () => void;
  assets: Asset[];
  organization: Organization | null;
  sites?: Site[];
}

const Dashboard: React.FC<DashboardProps> = ({ srs, onNewRequest, assets, organization }) => {
  const resolvedCount = srs.filter(sr => sr.status === SRStatus.RESOLVED || sr.status === SRStatus.CLOSED).length;
  const activeCount = srs.filter(sr => sr.status === SRStatus.NEW || sr.status === SRStatus.IN_PROGRESS).length;
  
  const activeAssets = assets.filter(a => a.status === Status.ACTIVE).length;
  const uptime = assets.length > 0 ? `${((activeAssets / assets.length) * 100).toFixed(1)}%` : "0%";

  // Clean WhatsApp Portal: No site codes, just a pure link to report.
  const whatsappUrl = 'https://wa.me/14155238886'; 

  const handleShare = async () => {
    const shareText = `*${organization?.name} Maintenance Support*\n\nReport an issue directly via WhatsApp here:\n\n👉 ${whatsappUrl}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Report Maintenance',
          text: shareText,
          url: whatsappUrl,
        });
      } catch (err) {
        window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`, '_blank');
      }
    } else {
      window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`, '_blank');
    }
  };

  const qrBase64 = "PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAzMyAzMyIgc2hhcGUtcmVuZGVyaW5nPSJjcmlzcEVkZ2VzIj48cGF0aCBmaWxsPSIjZmZmZmZmIiBkPSJNMCAwaDMzdjMzSDB6Ii8+PHBhdGggc3Ryb2tlPSIjMDAwMDAwIiBkPSJNMCAwLjVoN20xIDBoMW0yIDBoOW0zIDBoMm0xIDBoN00wIDEuNWgxbTUgMGgxbTEgMGgxbTEgMGgybTEgMGgxbTEgMGgxbTIgMGgxbTEgMGg1bTEgMGgxbTUgMGgxTTAgMi41aDFtMSAwaDNtMSAwaDFtMyAwaDJtNSAwaDFtMSAwaDFtMSAwaDRtMSAwaDFtMSAwaDNtMSAwaDFNMCAzLjVoMW0xIDBoM20xIDBoMW0xIDBoMm0xIDBoMW0yIDBoM20yIDBoNm0xIDBoMW0xIDBoM20xIDBoMU0wIDQuNWgxbTEgMGgzbTEgMGgxbTIgMGgxbTEgMGg0bTUgMGgybTEgMGgxbTIgMGgxbTEgMGgzbTEgMGgxTTAgNS41aDFtNSAwaDFtMyAwaDFtMyAwaDFtMyAwaDVtMyAwaDFtNSAwaDFNMCA2LjVoN20xIDBoMW0xIDBoMW0xIDBoMW0xIDBoMW0xIDBoMW0xIDBoMW0xIDBoMW0xIDBoMW0xIDBoMW0xIDBoN004IDcuNWgxbTIgMGgxbTEgMGgybTIgMGgxbTIgMGgxbTEgMGgzTTAgOC41aDFtMSAwaDJtMSAwaDNtNSAwaDJtMiAwaDNtMiAwaDFtMyAwaDFtMiAwaDFtMSAwaDJNMSA5LjVoMm0xIDBoMW0yIDBoMW0xIDBoMm0xIDBoMW0xIDBoM20zIDBoN20yIDBoMm0xIDBoMU0wIDEwLjVoNW0xIDBoMm0xIDBoMW0xIDBoMm0xIDBoMm0xIDBoMW0xIDBoMm0yIDBoMm0yIDBoM20xIDBoMk04IDExLjVoMW0xIDBoN20xIDBoMW01IDBoMW0xIDBoMW0xIDBoMm0yIDBoMW0yIDBoMU0zIDEyLjVoNW0xIDBoMW04IDBoMm0xIDBoMW0yIDBoM20yIDBoMW0yIDBoMU0zIDEzLjVoMW0xIDBoMW0yIDBoNG0xIDBoMW0yIDBoMW0xIDBoMW0zIDBoMW0xIDBoMW0xIDBoMm0zIDBoMU0wIDE0LjVoMm0yIDBoMW0xIDBoM202IDBoNG0zIDBoMm00IDBoMU0yIDE1LjVoNG0xIDBoMm0yIDBoMW0xIDBoMW0yIDBoNm0xIDBoMW0xIDBoNk0xIDE2LjVoMW0zIDBoNG0yIDBoMW0yIDBoM20xIDBoNG0zIDBoMm0xIDBoM20xMCAxNy41aDFtMSAwaDJtMSAwaDFtMSAwaDFtMSAwaDhtMSAwaDJtMSAwaDFNMiAxOC41aDNtMSAwaDFtMiAwaDFtMiAwaDJtMSAwaDFtMSAwaDFtNCAwaDFtMiAwaDFtMiAwaDFtMSAwaDJNMCAxOS41aDFtMiAwaDJtMiAwaDFtMSAwaDFtMSAwaDRtNSAwaDJtMSAwaDJtMiAwaDJtMyAwaDFNMCAyMC41aDFtMSAwaDFtMiAwaDRtMSAwaDFtMyAwaDJtMiAwaDFtMSAwaDFtMiAwaDJtMSAwaDFtMSAwaDNtMSAwaDFNMCAyMS41aDNtMiAwaDFtMiAwaDFtMSAwaDNtMiAwaDFtMSAwaDJtNiAwaDFtMiAwaDFtMSAwaDFtMSAwaDFNMiAyMi41aDJtMSAwaDNtNSAwaDJtMSAwaDJtNCAwaDFtMyAwaDFtMSAwaDJtMSAwaDJNMSAyMy41aDFtMSAwaDFtMyAwaDNtMSAwaDJtMyAwaDJtMSAwaDFtMSAwaDJtNSAwaDVNMCAyNC41aDFtMSAwaDFtMSAwaDNtMSAwaDFtMyAwaDFtMSAwaDJtNCAwaDJtMSAwaDZtMSAwaDNNOCAyNS41aDFtMSAwaDJtMSAwaDVtMiAwaDFtMiAwaDJtMyAwaDJtMSAwaDJNMCAyNi41aDdtMSAwaDFtMyAwaDFtMiAwaDJtMiAwaDFtMiAwaDNtMSAwaDFtMSAwaDFtMyAwaDFNMCAyNy41aDFtNSAwaDFtMSAwaDFtMSAwaDFtMyAwaDJtMyAwaDFtMSAwaDRtMyAwaDFtMSAwaDFtMSAwaDFNMCAyOC41aDFtMSAwaDNtMSAwaDFtMiAwaDRtMSAwaDFtMiAwaDFtMSAwaDJtMiAwaDZtMSAwaDFtMSAwaDFNMCAyOS41aDFtMSAwaDNtMSAwaDFtMSAwaDFtMSAwaDFtMSAwaDFtNCAwaDVtMiAwaDJtMyAwaDFtMSAwaDFNMCAzMC41aDFtMSAwaDNtMSAwaDFtMSAwaDFtMSAwaDFtMSAwaDNtMiAwaDNtMSAwaDNtMiAwaDJtMiAwaDFNMCAzMS41aDFtNSAwaDFtNSAwaDJtMSAwaDJtMiAwaDFtMSAwaDJtMiAwaDFtMiAwaDFtMSAwaDFtMSAwaDFNMCAzMi41aDdtMSAwaDNtMSAwaDRtMSAwaDJtMyAwaDUiLz48L3N2Zz4=";

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">Overview</h2>
          <p className="text-slate-500 font-medium">Facility performance at a glance.</p>
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
           <p className="text-2xl font-black text-emerald-600">{resolvedCount}</p>
        </div>
        <div className="bg-white p-5 rounded-[24px] border border-slate-100 shadow-sm flex flex-col justify-between h-28">
           <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Avg Time</p>
           <p className="text-2xl font-black text-slate-900">4.2h</p>
        </div>
        <div className="bg-white p-5 rounded-[24px] border border-slate-100 shadow-sm flex flex-col justify-between h-28">
           <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Asset Health</p>
           <p className="text-2xl font-black text-blue-600">{uptime}</p>
        </div>
      </div>

      <div className="bg-[#0A0A0A] rounded-[40px] p-6 md:p-10 text-white relative overflow-hidden shadow-2xl border border-white/5">
        <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-emerald-500/10 blur-[100px] rounded-full -mr-32 -mt-32 opacity-80"></div>
        
        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8 md:gap-12">
          <div className="flex-1 space-y-6 text-center md:text-left">
            <div className="flex flex-col md:flex-row items-center md:items-start gap-4">
              <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center text-black shadow-lg">
                <span className="font-black text-xl">FM</span>
              </div>
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full mb-2">
                  <ShieldCheck size={12} className="text-emerald-400" />
                  <span className="text-[8px] font-black uppercase tracking-[0.2em] text-emerald-400 leading-none">FM Engine Official</span>
                </div>
                <h3 className="text-2xl md:text-4xl font-black tracking-tighter leading-tight">
                  WhatsApp Support <br />
                  <span className="text-emerald-400">Portal</span>
                </h3>
              </div>
            </div>
            
            <p className="text-slate-400 text-sm md:text-base font-medium leading-relaxed max-w-sm mx-auto md:mx-0">
              Zero-friction reporting. No login or training required. Share this portal with your residents to start receiving tickets instantly.
            </p>

            <div className="flex flex-wrap gap-3 pt-1 justify-center md:justify-start">
              <button 
                onClick={handleShare}
                className="bg-emerald-500 text-black px-6 py-3 rounded-[16px] font-black flex items-center gap-2 hover:bg-emerald-400 transition-all active:scale-95 shadow-lg shadow-emerald-500/20 group text-sm"
              >
                <Share2 size={18} className="group-hover:rotate-12 transition-transform" /> 
                <span>Share Portal</span>
              </button>
            </div>
          </div>
          
          <div className="bg-white p-6 md:p-8 rounded-[40px] flex flex-col items-center gap-4 text-center shadow-3xl transform hover:scale-[1.02] transition-transform duration-500 shrink-0">
             <div className="w-36 h-36 md:w-44 md:h-44 bg-white rounded-2xl flex items-center justify-center p-1 relative overflow-hidden">
                <img 
                  src={`data:image/svg+xml;base64,${qrBase64}`} 
                  alt="WhatsApp QR Code"
                  className="w-full h-full object-contain"
                />
             </div>
             <div className="space-y-0.5">
                <p className="text-[10px] font-black uppercase text-slate-950 tracking-[0.2em] leading-none">Scan to report</p>
                <p className="text-[8px] font-bold text-slate-400 uppercase tracking-tight">{organization?.name}</p>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

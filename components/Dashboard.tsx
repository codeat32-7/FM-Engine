
import React from 'react';
import { ServiceRequest, SRStatus, SRSource } from '../types';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid } from 'recharts';
import { CheckCircle, Activity, Clock, MessageSquare, Monitor, Plus, Mic, ArrowRight } from 'lucide-react';

interface DashboardProps {
  srs: ServiceRequest[];
  onNewRequest: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ srs, onNewRequest }) => {
  const resolvedCount = srs.filter(sr => sr.status === SRStatus.RESOLVED || sr.status === SRStatus.CLOSED).length;
  const activeCount = srs.filter(sr => sr.status === SRStatus.NEW || sr.status === SRStatus.IN_PROGRESS).length;

  const recentActivity = srs.slice(0, 5).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">Overview</h2>
          <p className="text-slate-500 font-medium">Welcome back to your dashboard.</p>
        </div>
        <button 
          onClick={onNewRequest}
          className="bg-blue-600 text-white px-8 py-4 rounded-2xl font-bold flex items-center justify-center gap-3 hover:bg-blue-700 transition-all shadow-xl shadow-blue-100 active:scale-95 text-lg"
        >
          <Plus size={24} strokeWidth={3} /> Log Service Request
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-[24px] border border-slate-100 shadow-sm flex flex-col justify-between h-36">
           <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Active Tickets</p>
           <p className="text-4xl font-black text-slate-900">{activeCount}</p>
        </div>
        <div className="bg-white p-6 rounded-[24px] border border-slate-100 shadow-sm flex flex-col justify-between h-36">
           <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Resolved Tickets</p>
           <p className="text-4xl font-black text-emerald-600">{resolvedCount}</p>
        </div>
        <div className="bg-white p-6 rounded-[24px] border border-slate-100 shadow-sm flex flex-col justify-between h-36">
           <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Avg Completion</p>
           <p className="text-4xl font-black text-blue-600">8.2<span className="text-sm font-bold text-slate-400 ml-1">hrs</span></p>
        </div>
      </div>

      {/* WhatsApp Guide Board */}
      <div className="bg-slate-900 rounded-[32px] p-8 text-white relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 blur-[80px] rounded-full -mr-20 -mt-20"></div>
        <div className="relative z-10 flex flex-col md:flex-row gap-8 items-center">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 bg-emerald-500 rounded-xl">
                <MessageSquare size={24} className="text-white" />
              </div>
              <h3 className="text-2xl font-black">WhatsApp Intake Enabled</h3>
            </div>
            <p className="text-slate-400 font-medium mb-6 leading-relaxed">
              Anyone can create a request by sending a message or a <span className="text-emerald-400 font-bold">voice note</span>. Our AI instantly converts them into structured tickets.
            </p>
            <div className="flex flex-wrap gap-4">
               <div className="flex items-center gap-3 bg-white/5 border border-white/10 px-5 py-3 rounded-2xl">
                  <span className="text-[10px] font-bold text-slate-500 uppercase">Sandbox Number</span>
                  <span className="font-mono text-emerald-400 font-bold">+1 415 523 8886</span>
               </div>
               <div className="flex items-center gap-3 bg-white/5 border border-white/10 px-5 py-3 rounded-2xl">
                  <span className="text-[10px] font-bold text-slate-500 uppercase">Code</span>
                  <span className="font-mono text-white font-bold">join [your-sandbox-name]</span>
               </div>
            </div>
          </div>
          <div className="hidden md:flex flex-col gap-3">
             <div className="p-4 bg-white/5 border border-white/10 rounded-2xl flex items-center gap-4 w-64">
                <div className="p-2 bg-emerald-500/20 rounded-lg"><Mic size={18} className="text-emerald-500" /></div>
                <span className="text-sm font-medium">Try voice notes</span>
             </div>
             <div className="p-4 bg-white/5 border border-white/10 rounded-2xl flex items-center gap-4 w-64">
                <div className="p-2 bg-blue-500/20 rounded-lg"><Monitor size={18} className="text-blue-500" /></div>
                <span className="text-sm font-medium">Automatic Site Mapping</span>
             </div>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-8 pb-10">
        <div className="lg:col-span-2 bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm">
          <h3 className="text-xl font-black text-slate-900 mb-8">Recent Tickets</h3>
          <div className="space-y-4">
            {recentActivity.map((activity, idx) => (
              <div key={idx} className="flex items-center gap-5 p-5 bg-slate-50 rounded-2xl hover:bg-white hover:shadow-md hover:border-blue-100 border border-transparent transition-all group">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                  activity.status === SRStatus.NEW ? 'bg-blue-100 text-blue-600' : 'bg-emerald-100 text-emerald-600'
                }`}>
                   {activity.source === SRSource.WHATSAPP ? <MessageSquare size={20} /> : <Monitor size={20} />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-slate-900 truncate">{activity.title}</p>
                  <p className="text-xs font-medium text-slate-400 uppercase tracking-tight">{new Date(activity.created_at).toDateString()}</p>
                </div>
                <div className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest ${
                  activity.status === SRStatus.NEW ? 'bg-blue-50 text-blue-700' : 'bg-emerald-50 text-emerald-700'
                }`}>
                   {activity.status}
                </div>
                <ArrowRight size={18} className="text-slate-300 group-hover:text-blue-500 group-hover:translate-x-1 transition-all" />
              </div>
            ))}
          </div>
        </div>
        
        <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm flex flex-col">
          <h3 className="text-xl font-black text-slate-900 mb-6">Asset Health</h3>
          <div className="flex-1 flex flex-col items-center justify-center text-center space-y-4">
             <div className="relative w-32 h-32 flex items-center justify-center">
                <svg className="w-full h-full" viewBox="0 0 36 36">
                  <path className="text-slate-100" strokeWidth="3" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                  <path className="text-emerald-500" strokeDasharray="85, 100" strokeWidth="3" strokeLinecap="round" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                </svg>
                <div className="absolute flex flex-col items-center">
                   <span className="text-2xl font-black">85%</span>
                   <span className="text-[8px] font-bold text-slate-400 uppercase">Uptime</span>
                </div>
             </div>
             <p className="text-sm font-medium text-slate-500 leading-relaxed px-4">All mechanical systems are performing within expected limits.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

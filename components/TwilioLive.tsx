
import React from 'react';
import { Wifi, MessageSquare, ExternalLink, ShieldCheck, Copy, Check, Info } from 'lucide-react';

const TwilioLive: React.FC = () => {
  const [copied, setCopied] = React.useState(false);
  const webhookUrl = `${window.location.origin}/api/webhook`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(webhookUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-slate-800 mb-1 flex items-center gap-3">
            <MessageSquare className="text-emerald-500" /> WhatsApp Integration
          </h2>
          <p className="text-slate-500 text-sm">Follow these exact steps to connect your Twilio Sandbox.</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-600 rounded-full border border-emerald-100">
           <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
           <span className="text-xs font-bold uppercase tracking-wider">Edge Webhook Active</span>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-800">1. Twilio Webhook URL</h3>
              <span className="px-2 py-1 bg-blue-100 text-blue-700 text-[10px] font-bold rounded uppercase">Step 1</span>
            </div>
            
            <div className="flex items-center gap-2 p-4 bg-slate-50 rounded-2xl border border-slate-100 group">
              <code className="text-xs font-mono text-blue-600 truncate flex-1">{webhookUrl}</code>
              <button 
                onClick={copyToClipboard}
                className="p-2 hover:bg-white rounded-lg transition-all text-slate-400 hover:text-blue-600 shadow-sm bg-slate-50 border border-slate-100"
              >
                {copied ? <Check size={16} className="text-emerald-500" /> : <Copy size={16} />}
              </button>
            </div>

            <div className="bg-slate-900 text-white p-6 rounded-2xl space-y-4">
              <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                <Info size={16} /> Exact Twilio Path:
              </div>
              <ol className="text-xs text-slate-300 space-y-3 list-decimal pl-4">
                <li>Go to <strong>Messaging</strong> &gt; <strong>Try it out</strong> &gt; <strong>Send a WhatsApp message</strong>.</li>
                <li>At the top of the main window, click the <strong>"Sandbox Settings"</strong> tab (middle tab).</li>
                <li>Paste the URL above into the <strong>"When a message comes in"</strong> field.</li>
                <li>Set the dropdown next to it to <strong>POST</strong>.</li>
                <li>Click <strong>Save</strong> at the bottom of the Twilio page.</li>
              </ol>
            </div>
          </div>

          <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-800">2. Enable Realtime Feed</h3>
              <span className="px-2 py-1 bg-purple-100 text-purple-700 text-[10px] font-bold rounded uppercase">Step 2</span>
            </div>
            
            <div className="bg-purple-50 p-6 rounded-2xl border border-purple-100 space-y-4">
              <div className="flex items-center gap-2 text-purple-700 font-bold text-sm">
                <Info size={16} /> Exact Supabase Path:
              </div>
              <ol className="text-xs text-purple-800/80 space-y-3 list-decimal pl-4 font-medium">
                <li>Click the <strong>Database</strong> (cylinder) icon in the left sidebar.</li>
                <li>Click <strong>Publications</strong> (located 3 items above 'Replication').</li>
                <li>Click on the row named <strong>"supabase_realtime"</strong>.</li>
                <li>Click <strong>Select Tables</strong> and toggle <strong>service_requests</strong> to ON.</li>
                <li>Click <strong>Save</strong>.</li>
              </ol>
            </div>
          </div>
        </div>

        <div className="space-y-6">
           <div className="bg-slate-900 p-6 rounded-3xl text-white shadow-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 blur-2xl rounded-full"></div>
              <ShieldCheck className="text-emerald-400 mb-4" size={32} />
              <h3 className="font-bold mb-2">Live Monitor</h3>
              <p className="text-xs text-slate-400 mb-6">Once you save the Twilio settings, send a text like "AC is leaking at Site A" to see it appear here instantly.</p>
              
              <div className="space-y-3">
                <a 
                  href="https://console.twilio.com" 
                  target="_blank" 
                  className="w-full py-3 bg-white text-slate-900 rounded-xl text-center text-xs font-bold flex items-center justify-center gap-2 hover:bg-slate-100 transition-all"
                >
                  Open Twilio Console <ExternalLink size={14} />
                </a>
                <a 
                  href="https://supabase.com/dashboard" 
                  target="_blank" 
                  className="w-full py-3 bg-slate-800 text-white rounded-xl text-center text-xs font-bold flex items-center justify-center gap-2 hover:bg-slate-700 transition-all border border-slate-700"
                >
                  Open Supabase <ExternalLink size={14} />
                </a>
              </div>
           </div>

           <div className="p-6 border border-dashed border-slate-200 rounded-3xl text-center flex flex-col items-center justify-center space-y-3 py-12">
              <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center">
                <Wifi className="text-slate-300 animate-pulse" />
              </div>
              <p className="text-xs text-slate-400 font-medium tracking-tight">Listening for incoming data...</p>
           </div>
        </div>
      </div>
    </div>
  );
};

export default TwilioLive;

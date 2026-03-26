
import React from 'react';
import { Wifi, MessageSquare, ExternalLink, Copy, Check, Info } from 'lucide-react';

const TwilioLive: React.FC = () => {
  const [copied, setCopied] = React.useState(false);
  const webhookUrl = `${window.location.origin}/api/webhook`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(webhookUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-fm-surface rounded-xl border border-fm-border shadow-fm overflow-hidden">
      <div className="p-6 border-b border-fm-border flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-fm-ink flex items-center gap-2">
            <MessageSquare className="text-fm-accent" size={22} />
            WhatsApp &amp; realtime
          </h2>
          <p className="text-fm-muted text-sm mt-1">Connect Twilio inbound to this deployment and enable Supabase Realtime for work orders.</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-2 bg-teal-50 text-teal-800 rounded-lg border border-teal-100 text-xs font-semibold uppercase tracking-wide shrink-0">
          <span className="w-2 h-2 bg-teal-500 rounded-full animate-pulse" />
          Edge webhook
        </div>
      </div>

      <div className="p-6 space-y-6">
        <div>
          <div className="flex items-center justify-between gap-2 mb-3">
            <h3 className="text-sm font-bold text-fm-ink">1. Twilio webhook URL</h3>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-fm-accent bg-fm-accentsoft px-2 py-0.5 rounded">Step 1</span>
          </div>
          <div className="flex items-center gap-2 p-3 bg-fm-canvas rounded-xl border border-fm-border">
            <code className="text-xs font-mono text-fm-ink truncate flex-1">{webhookUrl}</code>
            <button
              type="button"
              onClick={copyToClipboard}
              className="p-2 rounded-lg bg-fm-surface border border-fm-border text-fm-muted hover:text-fm-accent transition-colors shrink-0"
              aria-label="Copy URL"
            >
              {copied ? <Check size={16} className="text-fm-success" /> : <Copy size={16} />}
            </button>
          </div>
          <div className="mt-4 bg-fm-navy text-slate-200 p-5 rounded-xl space-y-3 text-sm">
            <div className="flex items-center gap-2 text-fm-accent font-semibold text-xs uppercase tracking-wide">
              <Info size={14} /> Twilio console
            </div>
            <ol className="text-xs text-slate-400 space-y-2 list-decimal pl-4 leading-relaxed">
              <li>
                <strong className="text-slate-200">Messaging</strong> → <strong className="text-slate-200">Try it out</strong> → <strong className="text-slate-200">Send a WhatsApp message</strong>
              </li>
              <li>Open the <strong className="text-slate-200">Sandbox Settings</strong> tab.</li>
              <li>Paste the URL into <strong className="text-slate-200">When a message comes in</strong>, method <strong className="text-slate-200">POST</strong>, then Save.</li>
            </ol>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between gap-2 mb-3">
            <h3 className="text-sm font-bold text-fm-ink">2. Supabase Realtime</h3>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-fm-muted bg-fm-canvas px-2 py-0.5 rounded">Step 2</span>
          </div>
          <div className="bg-fm-canvas p-5 rounded-xl border border-fm-border text-sm text-fm-muted space-y-2">
            <p className="flex items-center gap-2 font-semibold text-fm-ink text-xs uppercase tracking-wide">
              <Info size={14} className="text-fm-accent" /> Publications
            </p>
            <ol className="text-xs space-y-2 list-decimal pl-4 leading-relaxed">
              <li>Supabase Dashboard → <strong className="text-fm-ink">Database</strong> → <strong className="text-fm-ink">Publications</strong></li>
              <li>Open <strong className="text-fm-ink">supabase_realtime</strong> and include <strong className="text-fm-ink">service_requests</strong> (and <strong className="text-fm-ink">sr_messages</strong> for chat sync).</li>
            </ol>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <a
            href="https://console.twilio.com"
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 py-3 px-4 bg-fm-navy text-white rounded-xl text-center text-sm font-semibold flex items-center justify-center gap-2 hover:bg-slate-800 transition-colors"
          >
            Twilio Console <ExternalLink size={14} />
          </a>
          <a
            href="https://supabase.com/dashboard"
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 py-3 px-4 bg-fm-canvas text-fm-ink border border-fm-border rounded-xl text-center text-sm font-semibold flex items-center justify-center gap-2 hover:border-fm-accent/40 transition-colors"
          >
            Supabase <ExternalLink size={14} />
          </a>
        </div>

        <div className="flex items-center justify-center gap-2 py-4 border border-dashed border-fm-border rounded-xl text-fm-muted text-xs">
          <Wifi size={16} className="animate-pulse opacity-50" />
          Deploy this app on Vercel so <code className="font-mono text-[11px] bg-fm-canvas px-1.5 py-0.5 rounded">/api/webhook</code> is reachable from Twilio.
        </div>
      </div>
    </div>
  );
};

export default TwilioLive;

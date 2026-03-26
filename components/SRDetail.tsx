
import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Clock,
  CheckCircle2,
  Play,
  CheckCircle,
  MessageSquare,
  UserPlus,
  Send,
  MapPin,
  Package,
  Phone,
  Calendar
} from 'lucide-react';
import { ServiceRequest, SRStatus, SRMessage, Site, Asset, Tenant, Requester, UserProfile } from '../types';
import { supabase } from '../lib/supabase';
import { formatDistanceToNow } from 'date-fns';
import { phonesMatch, digitsOnly, formatPhoneDisplay } from '../lib/phone';

interface SRDetailProps {
  sr: ServiceRequest;
  sites: Site[];
  assets: Asset[];
  tenants: Tenant[];
  requesters: Requester[];
  currentUser: UserProfile | null;
  onClose: () => void;
  onUpdate: (updatedSr: ServiceRequest) => void;
}

const SRDetail: React.FC<SRDetailProps> = ({
  sr,
  sites,
  assets,
  tenants,
  requesters,
  currentUser,
  onClose,
  onUpdate
}) => {
  const [messages, setMessages] = useState<SRMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [showTagModal, setShowTagModal] = useState(false);
  const [elapsedTime, setElapsedTime] = useState<string>('00:00:00');
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const site = sites.find(s => s.id === sr.site_id);
  const asset = assets.find(a => a.id === sr.asset_id);

  const taggedTenant = tenants.find(t => phonesMatch(t.phone, sr.requester_phone));
  const taggedRequester = requesters.find(r => phonesMatch(r.phone, sr.requester_phone));
  const taggedName = taggedTenant?.name || taggedRequester?.name || 'Unassigned';

  useEffect(() => {
    const run = async () => {
      const { data } = await supabase
        .from('sr_messages')
        .select('*')
        .eq('sr_id', sr.id)
        .order('created_at', { ascending: true });
      if (data) setMessages(data);
    };
    run();

    const subscription = supabase
      .channel(`sr-messages-${sr.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'sr_messages', filter: `sr_id=eq.${sr.id}` },
        payload => {
          setMessages(prev => [...prev, payload.new as SRMessage]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [sr.id]);

  useEffect(() => {
    if (sr.status === SRStatus.IN_PROGRESS && sr.in_progress_at) {
      const start = new Date(sr.in_progress_at).getTime();
      timerRef.current = setInterval(() => {
        const diff = Date.now() - start;
        const hours = Math.floor(diff / 3600000);
        const minutes = Math.floor((diff % 3600000) / 60000);
        const seconds = Math.floor((diff % 60000) / 1000);
        setElapsedTime(
          `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
        );
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      setElapsedTime('00:00:00');
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [sr.status, sr.in_progress_at]);

  const handleStatusChange = async (newStatus: SRStatus) => {
    const updates: Partial<ServiceRequest> = { status: newStatus };
    const now = new Date().toISOString();
    if (newStatus === SRStatus.IN_PROGRESS) updates.in_progress_at = now;
    if (newStatus === SRStatus.RESOLVED) updates.resolved_at = now;
    if (newStatus === SRStatus.CLOSED) updates.closed_at = now;

    try {
      const { data, error } = await supabase.from('service_requests').update(updates).eq('id', sr.id).select().single();
      if (error) throw error;
      if (data) onUpdate(data);
      await supabase.from('sr_messages').insert([
        {
          sr_id: sr.id,
          org_id: sr.org_id,
          sender_id: currentUser?.id || 'system',
          sender_role: 'system',
          content: `Status → ${newStatus}`,
          is_whatsapp: false
        }
      ]);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Update failed');
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || isSending) return;
    setIsSending(true);
    try {
      const text = newMessage.trim();
      const { error } = await supabase.from('sr_messages').insert([
        {
          sr_id: sr.id,
          org_id: sr.org_id,
          sender_id: currentUser?.id || '',
          sender_role: 'admin',
          content: text,
          is_whatsapp: true
        }
      ]);
      if (error) throw error;

      if (sr.requester_phone) {
        const response = await fetch('/api/send-message', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone: sr.requester_phone, content: `[${sr.id}] ${text}` })
        });
        if (!response.ok) {
          let msg = 'Send failed';
          try {
            const errorData = (await response.json()) as { error?: string };
            msg = errorData.error || msg;
          } catch { /* ignore */ }
          console.error('WhatsApp send:', msg);
          alert(`WhatsApp: ${msg}`);
        }
      }
      setNewMessage('');
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Send failed');
    } finally {
      setIsSending(false);
    }
  };

  const handleTagPerson = async (rawPhone: string, name: string, type: 'tenant' | 'requester') => {
    const normalized = digitsOnly(rawPhone);
    if (!normalized) {
      alert('Enter a valid phone number');
      return;
    }
    try {
      if (type === 'requester') {
        const existing = requesters.find(r => phonesMatch(r.phone, normalized));
        if (!existing) {
          await supabase.from('requesters').insert([
            { org_id: sr.org_id, phone: normalized, name, status: 'pending' }
          ]);
        }
      }

      const { data, error } = await supabase
        .from('service_requests')
        .update({ requester_phone: normalized })
        .eq('id', sr.id)
        .select()
        .single();

      if (error) throw error;
      if (data) onUpdate(data);
      setShowTagModal(false);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Tag failed');
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-50 flex items-center justify-center p-0 md:p-5">
      <div className="bg-fm-surface w-full max-w-5xl h-full md:h-[min(90vh,880px)] md:rounded-2xl shadow-fm border border-fm-border overflow-hidden flex flex-col md:flex-row">
        <div className="flex-1 overflow-y-auto p-6 md:p-8 border-b md:border-b-0 md:border-r border-fm-border">
          <div className="flex justify-between items-start gap-4 mb-6">
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span className="font-mono text-xs text-fm-muted">{sr.id}</span>
                <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wide bg-fm-canvas text-fm-ink border border-fm-border">
                  {sr.status}
                </span>
              </div>
              <h2 className="text-xl md:text-2xl font-bold text-fm-ink leading-tight">{sr.title}</h2>
            </div>
            <button type="button" onClick={onClose} className="p-2 rounded-lg hover:bg-fm-canvas text-fm-muted shrink-0" aria-label="Close">
              <X size={22} />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-6">
            {[
              { icon: MapPin, label: 'Site', value: site?.name || 'Unassigned' },
              { icon: Package, label: 'Asset', value: asset?.name || '—' },
              { icon: Calendar, label: 'Opened', value: formatDistanceToNow(new Date(sr.created_at), { addSuffix: true }) },
              { icon: Phone, label: 'Requester', value: formatPhoneDisplay(sr.requester_phone), action: true }
            ].map(({ icon: Icon, label, value, action }) => (
              <div key={label} className="bg-fm-canvas rounded-xl p-4 border border-fm-border">
                <div className="flex items-center gap-1.5 text-fm-muted mb-1">
                  <Icon size={12} />
                  <span className="text-[10px] font-semibold uppercase tracking-wider">{label}</span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <p className="font-semibold text-fm-ink text-sm leading-snug">{action ? taggedName : value}</p>
                  {action && (
                    <button type="button" onClick={() => setShowTagModal(true)} className="text-fm-accent p-1 rounded hover:bg-white/80">
                      <UserPlus size={16} />
                    </button>
                  )}
                </div>
                {action && <p className="text-[11px] font-mono text-fm-muted mt-1">{formatPhoneDisplay(sr.requester_phone)}</p>}
              </div>
            ))}
          </div>

          <div className="mb-6">
            <h4 className="text-[10px] font-semibold uppercase tracking-wider text-fm-muted mb-2">Description</h4>
            <div className="bg-fm-canvas rounded-xl p-5 border border-fm-border text-sm text-fm-ink leading-relaxed whitespace-pre-wrap">
              {sr.description || '—'}
            </div>
          </div>

          <div className="pt-6 border-t border-fm-border">
            <h4 className="text-[10px] font-semibold uppercase tracking-wider text-fm-muted mb-3">Workflow</h4>
            <div className="flex flex-wrap gap-2">
              {sr.status === SRStatus.NEW && (
                <button
                  type="button"
                  onClick={() => handleStatusChange(SRStatus.IN_PROGRESS)}
                  className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-xl font-semibold text-sm hover:bg-blue-700 transition-colors"
                >
                  <Play size={16} /> Start work
                </button>
              )}
              {sr.status === SRStatus.IN_PROGRESS && (
                <>
                  <div className="inline-flex items-center gap-2 bg-amber-50 text-amber-900 px-4 py-2.5 rounded-xl font-mono text-sm border border-amber-100">
                    <Clock size={16} className="animate-pulse" /> {elapsedTime}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleStatusChange(SRStatus.RESOLVED)}
                    className="inline-flex items-center gap-2 bg-fm-success text-white px-4 py-2.5 rounded-xl font-semibold text-sm hover:opacity-90"
                  >
                    <CheckCircle2 size={16} /> Resolve
                  </button>
                </>
              )}
              {sr.status === SRStatus.RESOLVED && (
                <button
                  type="button"
                  onClick={() => handleStatusChange(SRStatus.CLOSED)}
                  className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-xl font-semibold text-sm hover:bg-blue-700 transition-colors"
                >
                  <CheckCircle size={16} /> Close
                </button>
              )}
              {sr.status === SRStatus.CLOSED && (
                <span className="text-fm-muted text-sm font-medium flex items-center gap-2">
                  <CheckCircle size={16} /> Closed
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="w-full md:w-[380px] bg-fm-canvas flex flex-col min-h-[40vh] md:min-h-0">
          <div className="p-4 border-b border-fm-border bg-fm-surface flex items-center gap-2">
            <MessageSquare size={18} className="text-fm-muted" />
            <h3 className="font-semibold text-fm-ink text-sm">Correspondence</h3>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.length === 0 ? (
              <div className="h-full min-h-[160px] flex flex-col items-center justify-center text-center px-4">
                <MessageSquare size={28} className="text-fm-border mb-2" />
                <p className="text-xs font-semibold text-fm-muted uppercase tracking-wide">No thread yet</p>
                <p className="text-[11px] text-fm-muted mt-1">Tag a requester to sync outbound WhatsApp.</p>
              </div>
            ) : (
              messages.map(msg => (
                <div
                  key={msg.id}
                  className={`flex flex-col ${msg.sender_role === 'admin' ? 'items-end' : msg.sender_role === 'system' ? 'items-center' : 'items-start'}`}
                >
                  {msg.sender_role === 'system' ? (
                    <div className="bg-white/80 text-fm-muted text-[9px] font-semibold uppercase tracking-wide px-3 py-1 rounded-full border border-fm-border">
                      {msg.content}
                    </div>
                  ) : (
                    <div
                      className={`max-w-[92%] p-3 rounded-xl text-sm font-medium ${
                        msg.sender_role === 'admin'
                          ? 'bg-blue-600 text-white rounded-tr-sm'
                          : 'bg-fm-surface text-fm-ink border border-fm-border rounded-tl-sm shadow-sm'
                      }`}
                    >
                      {msg.content}
                      <div
                        className={`text-[9px] mt-1 opacity-60 flex items-center gap-1 ${msg.sender_role === 'admin' ? 'justify-end' : ''}`}
                      >
                        {msg.is_whatsapp && <Phone size={10} />}
                        {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
          <div className="p-4 bg-fm-surface border-t border-fm-border">
            <div className="relative">
              <input
                type="text"
                value={newMessage}
                onChange={e => setNewMessage(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && sendMessage()}
                placeholder={sr.requester_phone ? 'Message requester (WhatsApp)…' : 'Tag requester first…'}
                disabled={!sr.requester_phone || isSending}
                className="w-full bg-fm-canvas border border-fm-border focus:border-fm-accent rounded-xl py-3.5 pl-3 pr-12 outline-none text-sm text-fm-ink disabled:opacity-50"
              />
              <button
                type="button"
                onClick={sendMessage}
                disabled={!newMessage.trim() || !sr.requester_phone || isSending}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-40 transition-colors"
                aria-label="Send"
              >
                <Send size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {showTagModal && (
        <div className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-fm-surface w-full max-w-md rounded-2xl p-6 shadow-fm border border-fm-border">
            <div className="flex justify-between items-center mb-5">
              <h3 className="text-lg font-bold text-fm-ink">Link requester</h3>
              <button type="button" onClick={() => setShowTagModal(false)} className="p-2 rounded-lg hover:bg-fm-canvas text-fm-muted">
                <X size={20} />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-semibold text-fm-muted uppercase tracking-wider mb-2">Tenant</label>
                <select
                  className="w-full bg-fm-canvas border border-fm-border rounded-xl py-3 px-3 text-sm font-medium text-fm-ink focus:border-fm-accent outline-none"
                  defaultValue=""
                  onChange={e => {
                    const t = tenants.find(x => x.id === e.target.value);
                    if (t) handleTagPerson(t.phone, t.name, 'tenant');
                  }}
                >
                  <option value="">Select tenant…</option>
                  {tenants.map(t => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({formatPhoneDisplay(t.phone)})
                    </option>
                  ))}
                </select>
              </div>
              <div className="relative py-2">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-fm-border" />
                </div>
                <div className="relative flex justify-center text-[10px] uppercase font-semibold text-fm-muted bg-fm-surface px-2">Or manual</div>
              </div>
              <div className="space-y-3">
                <input
                  type="text"
                  placeholder="Full name"
                  id="tag-new-name"
                  className="w-full bg-fm-canvas border border-fm-border rounded-xl py-3 px-3 text-sm outline-none focus:border-fm-accent"
                />
                <input
                  type="tel"
                  placeholder="Phone (with country code)"
                  id="tag-new-phone"
                  className="w-full bg-fm-canvas border border-fm-border rounded-xl py-3 px-3 text-sm outline-none focus:border-fm-accent"
                />
                <button
                  type="button"
                  onClick={() => {
                    const name = (document.getElementById('tag-new-name') as HTMLInputElement).value;
                    const phone = (document.getElementById('tag-new-phone') as HTMLInputElement).value;
                    if (name && phone) handleTagPerson(phone, name, 'requester');
                  }}
                  className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold text-sm hover:bg-blue-700 transition-colors"
                >
                  Save &amp; link
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SRDetail;

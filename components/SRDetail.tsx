
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
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const site = sites.find(s => s.id === sr.site_id);
  const asset = assets.find(a => a.id === sr.asset_id);
  
  // Find tagged person
  const taggedTenant = tenants.find(t => t.phone === sr.requester_phone);
  const taggedRequester = requesters.find(r => r.phone === sr.requester_phone);
  const taggedName = taggedTenant?.name || taggedRequester?.name || 'Unknown Requester';

  useEffect(() => {
    fetchMessages();
    const subscription = supabase
      .channel(`sr-messages-${sr.id}`)
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'sr_messages', 
        filter: `sr_id=eq.${sr.id}` 
      }, (payload) => {
        setMessages(prev => [...prev, payload.new as SRMessage]);
      })
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
        const now = Date.now();
        const diff = now - start;
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

  const fetchMessages = async () => {
    const { data } = await supabase
      .from('sr_messages')
      .select('*')
      .eq('sr_id', sr.id)
      .order('created_at', { ascending: true });
    
    if (data) setMessages(data);
  };

  const handleStatusChange = async (newStatus: SRStatus) => {
    const updates: Partial<ServiceRequest> = { status: newStatus };
    const now = new Date().toISOString();

    if (newStatus === SRStatus.IN_PROGRESS) updates.in_progress_at = now;
    if (newStatus === SRStatus.RESOLVED) updates.resolved_at = now;
    if (newStatus === SRStatus.CLOSED) updates.closed_at = now;

    try {
      const { data, error } = await supabase
        .from('service_requests')
        .update(updates)
        .eq('id', sr.id)
        .select()
        .single();

      if (error) throw error;
      if (data) onUpdate(data);
      
      // Add system message
      await supabase.from('sr_messages').insert([{
        sr_id: sr.id,
        org_id: sr.org_id,
        sender_id: currentUser?.id || 'system',
        sender_role: 'system',
        content: `Status changed to ${newStatus}`,
        is_whatsapp: false
      }]);

    } catch (err: any) {
      alert(err.message);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || isSending) return;
    setIsSending(true);

    try {
      const messageData = {
        sr_id: sr.id,
        org_id: sr.org_id,
        sender_id: currentUser?.id || '',
        sender_role: 'admin',
        content: newMessage.trim(),
        is_whatsapp: true // Admin messages go to WhatsApp
      };

      const { error } = await supabase.from('sr_messages').insert([messageData]);
      if (error) throw error;

      // Simulate WhatsApp sending logic
      console.log(`Sending WhatsApp to ${sr.requester_phone}: ${newMessage}`);
      
      setNewMessage('');
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsSending(false);
    }
  };

  const handleTagPerson = async (phone: string, name: string, type: 'tenant' | 'requester') => {
    try {
      if (type === 'requester') {
        const existing = requesters.find(r => r.phone === phone);
        if (!existing) {
          await supabase.from('requesters').insert([{
            org_id: sr.org_id,
            phone,
            name,
            status: 'pending'
          }]);
        }
      }

      const { data, error } = await supabase
        .from('service_requests')
        .update({ requester_phone: phone })
        .eq('id', sr.id)
        .select()
        .single();

      if (error) throw error;
      if (data) onUpdate(data);
      setShowTagModal(false);
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-0 md:p-6">
      <div className="bg-white w-full max-w-5xl h-full md:h-[90vh] rounded-none md:rounded-[40px] shadow-2xl overflow-hidden flex flex-col md:flex-row">
        
        {/* Left Side: SR Info */}
        <div className="flex-1 overflow-y-auto p-8 border-r border-slate-100">
          <div className="flex justify-between items-start mb-8">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                  sr.status === SRStatus.NEW ? 'bg-blue-100 text-blue-600' :
                  sr.status === SRStatus.IN_PROGRESS ? 'bg-amber-100 text-amber-600' :
                  sr.status === SRStatus.RESOLVED ? 'bg-emerald-100 text-emerald-600' :
                  'bg-slate-100 text-slate-600'
                }`}>
                  {sr.status}
                </span>
                <span className="text-slate-400 text-xs font-bold">#{sr.id.slice(0, 8)}</span>
              </div>
              <h2 className="text-3xl font-black text-slate-900 leading-tight">{sr.title}</h2>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
              <X size={24} className="text-slate-400" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-6 mb-8">
            <div className="bg-slate-50 p-4 rounded-2xl">
              <div className="flex items-center gap-2 text-slate-400 mb-1">
                <MapPin size={14} />
                <span className="text-[10px] font-black uppercase tracking-widest">Site</span>
              </div>
              <p className="font-bold text-slate-900">{site?.name || 'Not assigned'}</p>
            </div>
            <div className="bg-slate-50 p-4 rounded-2xl">
              <div className="flex items-center gap-2 text-slate-400 mb-1">
                <Package size={14} />
                <span className="text-[10px] font-black uppercase tracking-widest">Asset</span>
              </div>
              <p className="font-bold text-slate-900">{asset?.name || 'General Facility'}</p>
            </div>
            <div className="bg-slate-50 p-4 rounded-2xl">
              <div className="flex items-center gap-2 text-slate-400 mb-1">
                <Calendar size={14} />
                <span className="text-[10px] font-black uppercase tracking-widest">Reported</span>
              </div>
              <p className="font-bold text-slate-900">{formatDistanceToNow(new Date(sr.created_at))} ago</p>
            </div>
            <div className="bg-slate-50 p-4 rounded-2xl">
              <div className="flex items-center gap-2 text-slate-400 mb-1">
                <Phone size={14} />
                <span className="text-[10px] font-black uppercase tracking-widest">Requester</span>
              </div>
              <div className="flex items-center justify-between">
                <p className="font-bold text-slate-900">{taggedName}</p>
                <button 
                  onClick={() => setShowTagModal(true)}
                  className="text-blue-600 hover:text-blue-700 transition-colors"
                >
                  <UserPlus size={16} />
                </button>
              </div>
            </div>
          </div>

          <div className="mb-8">
            <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">Description</h4>
            <div className="bg-slate-50 p-6 rounded-3xl text-slate-700 font-medium leading-relaxed">
              {sr.description}
            </div>
          </div>

          {/* State Flow Controls */}
          <div className="mt-auto pt-8 border-t border-slate-100">
            <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4">Workflow Actions</h4>
            <div className="flex flex-wrap gap-3">
              {sr.status === SRStatus.NEW && (
                <button 
                  onClick={() => handleStatusChange(SRStatus.IN_PROGRESS)}
                  className="bg-slate-900 text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 hover:bg-slate-800 transition-all shadow-lg shadow-slate-200"
                >
                  <Play size={18} /> Start Work
                </button>
              )}
              {sr.status === SRStatus.IN_PROGRESS && (
                <>
                  <div className="bg-amber-50 text-amber-600 px-6 py-3 rounded-2xl font-mono font-bold flex items-center gap-3 border border-amber-100">
                    <Clock size={18} className="animate-pulse" /> {elapsedTime}
                  </div>
                  <button 
                    onClick={() => handleStatusChange(SRStatus.RESOLVED)}
                    className="bg-emerald-600 text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100"
                  >
                    <CheckCircle2 size={18} /> Mark Resolved
                  </button>
                </>
              )}
              {sr.status === SRStatus.RESOLVED && (
                <button 
                  onClick={() => handleStatusChange(SRStatus.CLOSED)}
                  className="bg-slate-900 text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 hover:bg-slate-800 transition-all shadow-lg shadow-slate-200"
                >
                  <CheckCircle size={18} /> Close Ticket
                </button>
              )}
              {sr.status === SRStatus.CLOSED && (
                <div className="flex items-center gap-2 text-slate-400 font-bold italic">
                  <CheckCircle size={18} /> Ticket Closed
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Side: Chat */}
        <div className="w-full md:w-96 bg-slate-50 flex flex-col">
          <div className="p-6 border-b border-slate-200 bg-white flex items-center gap-3">
            <MessageSquare size={20} className="text-slate-400" />
            <h3 className="font-black text-slate-900">Requester Chat</h3>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-8">
                <div className="w-12 h-12 bg-slate-200 rounded-full flex items-center justify-center mb-4">
                  <MessageSquare size={20} className="text-slate-400" />
                </div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">No messages yet</p>
                <p className="text-[10px] text-slate-400 mt-1">Tag a requester to start chatting via WhatsApp.</p>
              </div>
            ) : (
              messages.map(msg => (
                <div key={msg.id} className={`flex flex-col ${msg.sender_role === 'admin' ? 'items-end' : msg.sender_role === 'system' ? 'items-center' : 'items-start'}`}>
                  {msg.sender_role === 'system' ? (
                    <div className="bg-slate-200/50 text-slate-500 text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full">
                      {msg.content}
                    </div>
                  ) : (
                    <div className={`max-w-[85%] p-4 rounded-2xl text-sm font-medium ${
                      msg.sender_role === 'admin' 
                        ? 'bg-slate-900 text-white rounded-tr-none shadow-md' 
                        : 'bg-white text-slate-900 rounded-tl-none shadow-sm border border-slate-100'
                    }`}>
                      {msg.content}
                      <div className={`text-[8px] mt-1 opacity-50 flex items-center gap-1 ${msg.sender_role === 'admin' ? 'justify-end' : 'justify-start'}`}>
                        {msg.is_whatsapp && <Phone size={8} />}
                        {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          <div className="p-6 bg-white border-t border-slate-200">
            <div className="relative">
              <input 
                type="text" 
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                placeholder={sr.requester_phone ? "Send WhatsApp message..." : "Tag a person first..."}
                disabled={!sr.requester_phone || isSending}
                className="w-full bg-slate-50 border-2 border-transparent focus:border-blue-500 rounded-2xl py-4 pl-4 pr-12 outline-none transition-all font-medium text-slate-700 disabled:opacity-50"
              />
              <button 
                onClick={sendMessage}
                disabled={!newMessage.trim() || !sr.requester_phone || isSending}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-all disabled:opacity-50"
              >
                <Send size={18} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Tag Modal */}
      {showTagModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-[32px] p-8 shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-black text-slate-900">Tag Requester</h3>
              <button onClick={() => setShowTagModal(false)} className="p-2 hover:bg-slate-100 rounded-full">
                <X size={20} className="text-slate-400" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Select Existing Tenant</label>
                <select 
                  className="w-full bg-slate-50 border-2 border-transparent focus:border-blue-500 rounded-2xl py-4 px-4 outline-none font-bold text-slate-700"
                  onChange={(e) => {
                    const t = tenants.find(t => t.id === e.target.value);
                    if (t) handleTagPerson(t.phone, t.name, 'tenant');
                  }}
                >
                  <option value="">Choose a tenant...</option>
                  {tenants.map(t => (
                    <option key={t.id} value={t.id}>{t.name} ({t.phone})</option>
                  ))}
                </select>
              </div>

              <div className="relative py-4">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-100"></div></div>
                <div className="relative flex justify-center text-[10px] uppercase font-black text-slate-300 bg-white px-2">Or Add New</div>
              </div>

              <div className="space-y-4">
                <input 
                  type="text" 
                  placeholder="Full Name" 
                  id="new-name"
                  className="w-full bg-slate-50 border-2 border-transparent focus:border-blue-500 rounded-2xl py-4 px-4 outline-none font-bold text-slate-700"
                />
                <input 
                  type="tel" 
                  placeholder="Phone Number" 
                  id="new-phone"
                  className="w-full bg-slate-50 border-2 border-transparent focus:border-blue-500 rounded-2xl py-4 px-4 outline-none font-bold text-slate-700"
                />
                <button 
                  onClick={() => {
                    const name = (document.getElementById('new-name') as HTMLInputElement).value;
                    const phone = (document.getElementById('new-phone') as HTMLInputElement).value;
                    if (name && phone) handleTagPerson(phone, name, 'requester');
                  }}
                  className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black hover:bg-slate-800 transition-all"
                >
                  Add & Tag
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

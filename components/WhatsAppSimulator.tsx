
import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, Loader2, Phone, Video, MoreVertical, CheckCheck } from 'lucide-react';
import { extractSRInfo } from '../services/geminiService';
import { SRSource, SRStatus, ServiceRequest, Site, Asset } from '../types';

interface WhatsAppSimulatorProps {
  onNewSR: (sr: ServiceRequest) => void;
  sites: Site[];
  assets: Asset[];
}

const WhatsAppSimulator: React.FC<WhatsAppSimulatorProps> = ({ onNewSR, sites, assets }) => {
  const [message, setMessage] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [chatHistory, setChatHistory] = useState<{sender: 'user' | 'bot', text: string, time: string}[]>([
    { sender: 'bot', text: 'Welcome to FM-Engine WhatsApp Intake.\n\nPlease describe your maintenance issue, including the location or equipment name.', time: '09:00 AM' }
  ]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [chatHistory, isProcessing]);

  const handleSend = async () => {
    if (!message.trim() || isProcessing) return;

    const userText = message;
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setMessage('');
    setChatHistory(prev => [...prev, { sender: 'user', text: userText, time }]);
    setIsProcessing(true);

    try {
      // AI Extraction
      const extracted = await extractSRInfo(userText);
      
      // Advanced Fuzzy Match
      const matchedSite = sites.find(s => 
        userText.toLowerCase().includes(s.name.toLowerCase()) || 
        userText.toLowerCase().includes(s.location.toLowerCase()) ||
        s.name.toLowerCase().includes(extracted.siteNameHint.toLowerCase())
      );

      const matchedAsset = assets.find(a => 
        userText.toLowerCase().includes(a.name.toLowerCase()) || 
        userText.toLowerCase().includes(a.code.toLowerCase()) ||
        a.name.toLowerCase().includes(extracted.assetNameHint.toLowerCase())
      );

      const newSR: ServiceRequest = {
        id: `SR-${Math.floor(Math.random() * 9000) + 1000}`,
        title: extracted.title,
        description: userText,
        site_id: matchedSite?.id || null,
        asset_id: matchedAsset?.id || null,
        status: SRStatus.NEW,
        source: SRSource.WHATSAPP,
        created_at: new Date().toISOString()
      };

      setTimeout(() => {
        onNewSR(newSR);
        setChatHistory(prev => [...prev, { 
          sender: 'bot', 
          text: `✅ Request Logged Successfully!\n\nID: ${newSR.id}\nTitle: ${newSR.title}\nSite: ${matchedSite?.name || 'Unknown'}\nAsset: ${matchedAsset?.name || 'Unknown'}\n\nOur team has been notified.`,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }]);
        setIsProcessing(false);
      }, 1500);
    } catch (e) {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-160px)]">
      <div className="w-full max-w-[450px] h-[750px] bg-white rounded-[40px] shadow-2xl overflow-hidden border-[10px] border-slate-900 flex flex-col relative">
        {/* Notch */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-slate-900 rounded-b-2xl z-20"></div>

        {/* Header */}
        <div className="bg-[#075E54] p-4 pt-8 text-white flex items-center justify-between shadow-md">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center overflow-hidden">
               <Bot size={24} className="text-white" />
             </div>
             <div>
               <h3 className="font-bold text-sm">FM-Engine Intake</h3>
               <p className="text-[10px] text-emerald-100 flex items-center gap-1 leading-none">
                 <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse"></span> Online
               </p>
             </div>
          </div>
          <div className="flex items-center gap-4 text-white/80">
             <Video size={18} />
             <Phone size={18} />
             <MoreVertical size={18} />
          </div>
        </div>

        {/* Chat Canvas */}
        <div ref={scrollRef} className="flex-1 bg-[#E5DDD5] overflow-y-auto p-4 space-y-4 custom-scrollbar">
           {chatHistory.map((chat, i) => (
             <div key={i} className={`flex ${chat.sender === 'user' ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-2 duration-300`}>
               <div className={`max-w-[85%] p-3 rounded-2xl relative shadow-sm text-sm leading-relaxed ${
                 chat.sender === 'user' ? 'bg-[#DCF8C6] rounded-tr-none' : 'bg-white rounded-tl-none'
               }`}>
                 <p className="whitespace-pre-line text-slate-800">{chat.text}</p>
                 <div className="flex items-center justify-end gap-1 mt-1">
                   <span className="text-[9px] text-slate-400">{chat.time}</span>
                   {chat.sender === 'user' && <CheckCheck size={12} className="text-blue-400" />}
                 </div>
               </div>
             </div>
           ))}
           {isProcessing && (
              <div className="flex justify-start">
                <div className="bg-white p-3 rounded-2xl rounded-tl-none shadow-sm flex items-center gap-2">
                  <div className="flex gap-1">
                    <span className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce delay-0"></span>
                    <span className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce delay-150"></span>
                    <span className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce delay-300"></span>
                  </div>
                </div>
              </div>
           )}
        </div>

        {/* Input Dock */}
        <div className="p-3 bg-[#F0F0F0] flex items-center gap-2">
           <div className="flex-1 bg-white rounded-full flex items-center px-4 py-2.5 shadow-sm border border-slate-200">
              <input 
                type="text" 
                placeholder="Type a message" 
                className="flex-1 border-none outline-none text-sm text-slate-800"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              />
           </div>
           <button 
             onClick={handleSend}
             disabled={!message.trim() || isProcessing}
             className="w-11 h-11 bg-[#075E54] text-white rounded-full flex items-center justify-center shadow-lg active:scale-90 transition-all disabled:bg-slate-300"
           >
             <Send size={18} fill="white" />
           </button>
        </div>
      </div>
    </div>
  );
};

export default WhatsAppSimulator;

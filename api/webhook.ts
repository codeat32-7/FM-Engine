
import { GoogleGenAI, Type } from "@google/genai";
import { createClient } from '@supabase/supabase-js';

export const config = {
  runtime: 'edge',
};

export default async function handler(req: Request) {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  const supabase = createClient(
    process.env.SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || ''
  );

  try {
    const formData = await req.formData();
    const body = formData.get('Body') as string || '';
    const from = formData.get('From') as string || ''; 

    if (!body) return new Response('No body found', { status: 400 });

    const cleanFrom = from.replace('whatsapp:', '').replace('+', '');

    // 1. Resolve Organization & Site context
    let orgId: string | null = null;
    let siteId: string | null = null;
    let senderName: string = 'Anonymous';

    // A. Check for existing tenant (Resident)
    const { data: tenant } = await supabase.from('tenants').select('org_id, site_id, name').eq('phone', cleanFrom).maybeSingle();
    
    if (tenant) {
      orgId = tenant.org_id;
      siteId = tenant.site_id;
      senderName = tenant.name;
    } else {
      // B. Check for existing requester
      const { data: existingReq } = await supabase.from('requesters').select('org_id').eq('phone', cleanFrom).maybeSingle();
      
      if (existingReq) {
        orgId = existingReq.org_id;
      } else {
        // C. Fallback: Get most recently active Organization
        const { data: activeOrgs } = await supabase.from('organizations').select('id').order('created_at', { ascending: false }).limit(1);
        orgId = activeOrgs?.[0]?.id || null;
      }

      // 2. CRITICAL: Ensure Requester Entry Exists
      if (orgId) {
        // We do a manual check-and-insert to be 100% sure the Edge function completes it
        const { data: check } = await supabase.from('requesters').select('id').eq('phone', cleanFrom).maybeSingle();
        if (!check) {
          const { error: insErr } = await supabase.from('requesters').insert([{
            phone: cleanFrom,
            org_id: orgId,
            status: 'pending',
            created_at: new Date().toISOString()
          }]);
          if (insErr) console.error("Requester create failed:", insErr.message);
        } else {
           // Ensure it's active for the right org if it exists but was unlinked
           await supabase.from('requesters').update({ org_id: orgId }).eq('phone', cleanFrom);
        }
      }
    }

    if (!orgId) {
      return new Response(`<?xml version="1.0" encoding="UTF-8"?><Response><Message>⚠️ Setup Required: Please initialize your FM Engine dashboard first.</Message></Response>`, {
        headers: { 'Content-Type': 'text/xml' },
      });
    }

    // 3. AI Title Generation
    let title = body.length > 40 ? body.slice(0, 40) + "..." : body;
    try {
      if (process.env.API_KEY && body.length > 5) {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const aiRes = await ai.models.generateContent({
          model: 'gemini-3-flash-preview',
          contents: `Create a 3-word subject for this repair request: "${body}"`,
        });
        if (aiRes.text) title = aiRes.text.trim().replace(/[".*]/g, '');
      }
    } catch (e) { console.warn("AI title failed"); }

    // 4. Log Service Request
    const srId = `SR-${Math.floor(Math.random() * 9000) + 1000}`;
    const { error: srErr } = await supabase.from('service_requests').insert([{
      id: srId,
      org_id: orgId,
      site_id: siteId,
      title: title,
      description: body,
      requester_phone: cleanFrom,
      status: 'New',
      source: 'WhatsApp',
      created_at: new Date().toISOString()
    }]);

    if (srErr) throw srErr;

    const reply = tenant 
      ? `✅ Ticket ${srId} logged for ${senderName}.\n\nIssue: ${title}`
      : `✅ Ticket ${srId} received from +${cleanFrom}. Please wait for admin approval to link your unit.`;

    return new Response(`<?xml version="1.0" encoding="UTF-8"?><Response><Message>${reply}</Message></Response>`, {
      headers: { 'Content-Type': 'text/xml' },
    });

  } catch (err: any) {
    return new Response(`<?xml version="1.0" encoding="UTF-8"?><Response><Message>❌ Error: ${err.message}</Message></Response>`, {
      headers: { 'Content-Type': 'text/xml' },
    });
  }
}

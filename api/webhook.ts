
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
    process.env.SUPABASE_ANON_KEY || ''
  );

  try {
    const formData = await req.formData();
    const body = formData.get('Body') as string || '';
    const from = formData.get('From') as string || ''; 

    if (!body) return new Response('No body found', { status: 400 });

    const cleanFrom = from.replace('whatsapp:', '').replace('+', '');

    // 1. Determine the Organization context
    let orgId: string | null = null;
    let siteId: string | null = null;
    let senderName: string = 'Anonymous';

    // Priority 1: Check if they are a known tenant
    const { data: tenant } = await supabase.from('tenants').select('org_id, site_id, name').eq('phone', cleanFrom).maybeSingle();
    
    if (tenant) {
      orgId = tenant.org_id;
      siteId = tenant.site_id;
      senderName = tenant.name;
    } else {
      // Priority 2: Check if they have messaged before as a requester (keep them in the same Org)
      const { data: existingReq } = await supabase.from('requesters').select('org_id').eq('phone', cleanFrom).maybeSingle();
      
      if (existingReq) {
        orgId = existingReq.org_id;
      } else {
        // Priority 3: Use the most recently created Organization in the system
        const { data: orgs } = await supabase.from('organizations').select('id').order('created_at', { ascending: false }).limit(1);
        orgId = orgs?.[0]?.id || null;
      }

      // If we found an Org, ensure the Requester record is present/updated
      if (orgId) {
        await supabase.from('requesters').upsert({
          phone: cleanFrom,
          org_id: orgId,
          status: 'pending'
        }, { onConflict: 'phone' });
      }
    }

    if (!orgId) {
      return new Response(`<?xml version="1.0" encoding="UTF-8"?><Response><Message>⚠️ Setup Error: No organization found in the database. Please log in to the web dashboard first.</Message></Response>`, {
        headers: { 'Content-Type': 'text/xml' },
      });
    }

    // 2. AI Intelligence for title
    let title = body.slice(0, 45);
    try {
      if (process.env.API_KEY && body.length > 5) {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const response = await ai.models.generateContent({
          model: 'gemini-3-flash-preview',
          contents: `Summarize this maintenance request into a 3-word title: "${body}"`,
        });
        if (response.text) title = response.text.trim().replace(/[".*]/g, '');
      }
    } catch (e) { console.warn("AI extraction skipped"); }

    // 3. Insert Service Request
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

    if (srErr) {
      return new Response(`<?xml version="1.0" encoding="UTF-8"?><Response><Message>❌ DB Error: ${srErr.message}</Message></Response>`, {
        headers: { 'Content-Type': 'text/xml' },
      });
    }

    const reply = tenant 
      ? `✅ Ticket ${srId} logged for ${senderName}.\n\nIssue: ${title}`
      : `✅ Ticket ${srId} received. Please wait for an administrator to approve your access for +${cleanFrom}.`;

    return new Response(`<?xml version="1.0" encoding="UTF-8"?><Response><Message>${reply}</Message></Response>`, {
      headers: { 'Content-Type': 'text/xml' },
    });

  } catch (error: any) {
    return new Response(`<?xml version="1.0" encoding="UTF-8"?><Response><Message>🔥 Webhook Error: ${error.message}</Message></Response>`, {
      headers: { 'Content-Type': 'text/xml' },
    });
  }
}

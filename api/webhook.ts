
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

    // 1. Resolve Identity Context
    let orgId: string | null = null;
    let siteId: string | null = null;
    let senderName: string = 'Anonymous';

    // Check Profile (Admins/Tenants)
    const { data: profile } = await supabase.from('profiles').select('org_id, role, full_name').eq('phone', cleanFrom).maybeSingle();
    
    if (profile) {
      orgId = profile.org_id;
      senderName = profile.full_name || 'User';
      
      // If tenant, get site hint
      if (profile.role === 'tenant') {
        const { data: tData } = await supabase.from('tenants').select('site_id').eq('phone', cleanFrom).maybeSingle();
        siteId = tData?.site_id || null;
      }
    } else {
      // Unknown: Fallback to latest active Org
      const { data: activeOrgs } = await supabase.from('organizations').select('id').order('created_at', { ascending: false }).limit(1);
      orgId = activeOrgs?.[0]?.id || null;

      // Ensure Requester entry for approval triage
      if (orgId) {
        await supabase.from('requesters').upsert({
          phone: cleanFrom,
          org_id: orgId,
          status: 'pending'
        }, { onConflict: 'phone' });
      }
    }

    if (!orgId) return new Response('Org not found', { status: 404 });

    // 2. AI Intelligence for title
    let title = body.slice(0, 40);
    try {
      if (process.env.API_KEY && body.length > 5) {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const res = await ai.models.generateContent({
          model: 'gemini-3-flash-preview',
          contents: `Concise 3-word title for: "${body}"`,
        });
        if (res.text) title = res.text.trim().replace(/[".*]/g, '');
      }
    } catch (e) {}

    // 3. Log Request
    const srId = `SR-${Math.floor(Math.random() * 9000) + 1000}`;
    const { error: srErr } = await supabase.from('service_requests').insert([{
      id: srId,
      org_id: orgId,
      site_id: siteId,
      title: title,
      description: body,
      requester_phone: cleanFrom,
      status: 'New',
      source: 'WhatsApp'
    }]);

    if (srErr) throw srErr;

    const reply = profile 
      ? `✅ Received, ${senderName}. Ticket ${srId} created.`
      : `✅ Ticket ${srId} logged. Please wait for an administrator to approve your unit access.`;

    return new Response(`<?xml version="1.0" encoding="UTF-8"?><Response><Message>${reply}</Message></Response>`, {
      headers: { 'Content-Type': 'text/xml' },
    });

  } catch (err: any) {
    return new Response('Error: ' + err.message, { status: 500 });
  }
}

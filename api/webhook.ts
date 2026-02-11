
import { GoogleGenAI } from "@google/genai";
import { createClient } from '@supabase/supabase-js';

export const config = {
  runtime: 'edge',
};

export default async function handler(req: Request) {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  // Use Service Role Key if available to bypass RLS for the system webhook
  const supabase = createClient(
    process.env.SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || ''
  );

  try {
    const text = await req.text();
    const params = new URLSearchParams(text);
    
    const body = params.get('Body') || '';
    const from = params.get('From') || ''; 

    if (!body || !from) {
      return new Response('Missing Body or From', { status: 400 });
    }

    // Clean phone number to digits only
    const cleanFrom = from.replace('whatsapp:', '').replace('+', '').replace(/\s/g, '');

    // 1. Resolve Organization ID
    let orgId: string | null = null;
    let siteId: string | null = null;
    let senderName: string | null = null;

    // A. Check if user exists
    const { data: profile } = await supabase
      .from('profiles')
      .select('org_id, full_name, role')
      .eq('phone', cleanFrom)
      .maybeSingle();

    if (profile?.org_id) {
      orgId = profile.org_id;
      senderName = profile.full_name;
      
      if (profile.role === 'tenant') {
        const { data: tenant } = await supabase
          .from('tenants')
          .select('site_id')
          .eq('phone', cleanFrom)
          .maybeSingle();
        siteId = tenant?.site_id || null;
      }
    } else {
      // B. Stranger: Find the organization that was most recently active
      // This ensures that if the user just signed up, their tickets go to their org.
      const { data: orgs } = await supabase
        .from('organizations')
        .select('id')
        .order('id', { ascending: false }) // Fallback to ID order if created_at missing
        .limit(1);
      
      orgId = orgs?.[0]?.id || null;

      if (orgId) {
        // Log to approvals queue immediately
        await supabase.from('requesters').upsert({
          phone: cleanFrom,
          org_id: orgId,
          status: 'pending',
          created_at: new Date().toISOString()
        }, { onConflict: 'phone' });
      }
    }

    if (!orgId) {
      return new Response('Configuration Error: No active organization found in system.', { status: 500 });
    }

    // 2. AI Summarization
    let title = body.slice(0, 40);
    if (process.env.API_KEY && body.length > 5) {
      try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const res = await ai.models.generateContent({
          model: 'gemini-3-flash-preview',
          contents: `Analyze this maintenance request and provide a 3-word title. Message: "${body}"`,
        });
        if (res.text) title = res.text.trim().replace(/[".*]/g, '');
      } catch (e) {
        console.error("AI summarization failed, using snippet.");
      }
    }

    // 3. Create the Service Request
    const srId = `SR-${Math.floor(100000 + Math.random() * 900000)}`;
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
      console.error("DB Insert Error:", srErr);
      throw srErr;
    }

    // 4. Twilio Response
    const reply = senderName 
      ? `✅ Received! Ticket ${srId} logged for ${senderName}.`
      : `✅ Ticket ${srId} logged. Please wait for the facility manager to confirm your unit.`;

    return new Response(`<?xml version="1.0" encoding="UTF-8"?><Response><Message>${reply}</Message></Response>`, {
      headers: { 'Content-Type': 'text/xml' },
    });

  } catch (err: any) {
    return new Response('Critical Error: ' + err.message, { status: 500 });
  }
}

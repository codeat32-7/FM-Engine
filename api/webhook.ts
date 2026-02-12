
import { GoogleGenAI } from "@google/genai";
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
    const text = await req.text();
    const params = new URLSearchParams(text);
    
    const body = params.get('Body') || '';
    const from = params.get('From') || ''; 

    if (!body || !from) {
      return new Response('Missing Body or From', { status: 400 });
    }

    // CRITICAL: Standardize phone to digits only (e.g., 917200108575)
    // Twilio sends 'whatsapp:+91...', this cleans it to '91...'
    const cleanFrom = from.replace(/[^0-9]/g, '');

    // 1. HARD SELECTION: Resolve Identity from Profiles table
    const { data: profile, error: profErr } = await supabase
      .from('profiles')
      .select('org_id, full_name, role')
      .eq('phone', cleanFrom)
      .maybeSingle();

    if (profErr) throw profErr;

    // If no profile is found, we DO NOT guess. We reject.
    if (!profile || !profile.org_id) {
      const errorMsg = `❌ Access Denied: The number +${cleanFrom} is not registered with any facility on FM Engine. Please contact your facility manager.`;
      return new Response(`<?xml version="1.0" encoding="UTF-8"?><Response><Message>${errorMsg}</Message></Response>`, {
        headers: { 'Content-Type': 'text/xml' },
      });
    }

    const orgId = profile.org_id;
    const senderName = profile.full_name;
    let siteId: string | null = null;

    // If they are a tenant, try to find their pre-assigned site
    if (profile.role === 'tenant') {
      const { data: tenant } = await supabase
        .from('tenants')
        .select('site_id')
        .eq('phone', cleanFrom)
        .maybeSingle();
      siteId = tenant?.site_id || null;
    }

    // 2. AI Summarization
    let title = body.slice(0, 40);
    if (process.env.API_KEY && body.length > 5) {
      try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const res = await ai.models.generateContent({
          model: 'gemini-3-flash-preview',
          contents: `Provide a 3-word title for this maintenance ticket: "${body}"`,
        });
        if (res.text) title = res.text.trim().replace(/[".*]/g, '');
      } catch (e) {
        console.error("AI Title extraction skipped");
      }
    }

    // 3. Create the Service Request (Bound to the confirmed orgId)
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

    if (srErr) throw srErr;

    // 4. Confirmation
    const reply = `✅ Ticket ${srId} logged for ${senderName || 'your unit'}. We have notified the maintenance team at ${orgId.slice(0,5)}...`;

    return new Response(`<?xml version="1.0" encoding="UTF-8"?><Response><Message>${reply}</Message></Response>`, {
      headers: { 'Content-Type': 'text/xml' },
    });

  } catch (err: any) {
    console.error("Webhook Error:", err.message);
    return new Response('Internal error', { status: 500 });
  }
}

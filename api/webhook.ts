
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

    if (!body || !from) return new Response('Bad Request', { status: 400 });

    // 1. Standardize Phone
    const cleanFrom = from.replace(/[^0-9]/g, '');
    // EXTRACT LAST 10 DIGITS - This is the "Zero Friction" key
    const phoneSuffix = cleanFrom.slice(-10);

    // 2. Resolve Identity via Suffix Match
    // This fixes the "+91" vs "91" vs "72..." mismatch immediately
    let { data: profile } = await supabase
      .from('profiles')
      .select('org_id, full_name, role')
      .ilike('phone', `%${phoneSuffix}`)
      .maybeSingle();

    let orgId = profile?.org_id;
    let siteId: string | null = null;

    // 3. HARD SELECTION (No Guessing): If unknown, look for the Site Code in the pre-filled text
    if (!orgId) {
      const siteCodeMatch = body.match(/SITE-\d{4}/i);
      if (siteCodeMatch) {
        const code = siteCodeMatch[0].toUpperCase();
        const { data: site } = await supabase
          .from('sites')
          .select('id, org_id')
          .eq('code', code)
          .maybeSingle();

        if (site) {
          orgId = site.org_id;
          siteId = site.id;
          
          // AUTO-REGISTER: Link this phone number to this Org permanently
          // This ensures their NEXT message doesn't need a code.
          await supabase.from('profiles').insert([{
            phone: cleanFrom, // Save the full number from Twilio
            org_id: orgId,
            role: 'tenant',
            full_name: 'WhatsApp User'
          }]);
          
          // Also add to approval queue for the admin to refine the name/unit
          await supabase.from('requesters').upsert({
            phone: cleanFrom,
            org_id: orgId,
            status: 'pending',
            created_at: new Date().toISOString()
          }, { onConflict: 'phone' });
        }
      }
    }

    // 4. Final Denial (If no profile found and no site code in text)
    if (!orgId) {
      const errorMsg = `❌ Unrecognized Facility. 
      
Your number (+${cleanFrom}) is not registered. Please use the official QR code provided at your facility to report an issue.`;
      
      return new Response(`<?xml version="1.0" encoding="UTF-8"?><Response><Message>${errorMsg}</Message></Response>`, {
        headers: { 'Content-Type': 'text/xml' },
      });
    }

    // 5. AI Title Generation
    let title = body.replace(/SITE-\d{4}:?/gi, '').trim().slice(0, 40);
    if (process.env.API_KEY && body.length > 5) {
      try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const res = await ai.models.generateContent({
          model: 'gemini-3-flash-preview',
          contents: `Summarize this maintenance request into a 3-word title (ignore site codes): "${body}"`,
        });
        if (res.text) title = res.text.trim().replace(/[".*]/g, '');
      } catch (e) { }
    }

    // 6. Log the Service Request
    const srId = `SR-${Math.floor(100000 + Math.random() * 900000)}`;
    await supabase.from('service_requests').insert([{
      id: srId,
      org_id: orgId,
      site_id: siteId,
      title: title || 'Maintenance Request',
      description: body,
      requester_phone: cleanFrom,
      status: 'New',
      source: 'WhatsApp',
      created_at: new Date().toISOString()
    }]);

    const reply = `✅ Ticket ${srId} logged. ${profile ? `Thanks ${profile.full_name}!` : 'We have identified your facility and notified the team.'}`;

    return new Response(`<?xml version="1.0" encoding="UTF-8"?><Response><Message>${reply}</Message></Response>`, {
      headers: { 'Content-Type': 'text/xml' },
    });

  } catch (err: any) {
    return new Response('Error', { status: 500 });
  }
}

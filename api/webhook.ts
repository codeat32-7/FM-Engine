
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
    const formData = await req.formData();
    const body = formData.get('Body') as string || '';
    const from = formData.get('From') as string || ''; 

    if (!body) return new Response('No body found', { status: 400 });

    // Clean phone number to digits only
    const cleanFrom = from.replace('whatsapp:', '').replace('+', '').replace(/\s/g, '');

    // 1. Resolve Identity Context
    let orgId: string | null = null;
    let siteId: string | null = null;
    let senderName: string = 'User';

    // Step A: Check if this phone belongs to a known Profile
    const { data: profiles } = await supabase
      .from('profiles')
      .select('org_id, role, full_name')
      .eq('phone', cleanFrom);
    
    const activeProfile = profiles?.find(p => p.org_id) || profiles?.[0];
    
    if (activeProfile && activeProfile.org_id) {
      orgId = activeProfile.org_id;
      senderName = activeProfile.full_name || 'User';
      
      if (activeProfile.role === 'tenant') {
        const { data: tData } = await supabase.from('tenants').select('site_id').eq('phone', cleanFrom).maybeSingle();
        siteId = tData?.site_id || null;
      }
    } else {
      // Step B: Stranger detected. Find the organization to "host" this request.
      // We look for the most recently created organization as the likely active one.
      const { data: latestOrgs } = await supabase
        .from('organizations')
        .select('id')
        .order('created_at', { ascending: false })
        .limit(1);
      
      orgId = latestOrgs?.[0]?.id || null;

      if (orgId) {
        // Step C: Immediately add to Requesters queue if not already there
        // Use upsert to handle existing records without erroring
        await supabase.from('requesters').upsert({
          phone: cleanFrom,
          org_id: orgId,
          status: 'pending'
        }, { onConflict: 'phone' }); 
      }
    }

    if (!orgId) {
      return new Response('System not initialized. Please create an organization first.', { status: 404 });
    }

    // 2. AI Intelligence for ticket title
    let title = body.slice(0, 40);
    try {
      if (process.env.API_KEY && body.length > 5) {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const res = await ai.models.generateContent({
          model: 'gemini-3-flash-preview',
          contents: `Summarize this maintenance request into 3 words: "${body}"`,
        });
        if (res.text) title = res.text.trim().replace(/[".*]/g, '');
      }
    } catch (e) {}

    // 3. Log Service Request
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

    const reply = activeProfile?.org_id 
      ? `✅ Ticket ${srId} logged for ${senderName}. We are on it!`
      : `✅ Ticket ${srId} logged. We've added you to our approval queue. Please wait for the facility manager to confirm your unit.`;

    return new Response(`<?xml version="1.0" encoding="UTF-8"?><Response><Message>${reply}</Message></Response>`, {
      headers: { 'Content-Type': 'text/xml' },
    });

  } catch (err: any) {
    return new Response('Error: ' + err.message, { status: 500 });
  }
}

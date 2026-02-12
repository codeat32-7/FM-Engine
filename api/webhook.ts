
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

    const cleanFrom = from.replace(/[^0-9]/g, '');
    const phoneSuffix = cleanFrom.slice(-10);

    // STEP 1: FORCE ROUTING TO THE LATEST ORGANIZATION (Demo Mode)
    // We ignore all previous routing logic and just grab the newest org in the DB.
    const { data: latestOrg } = await supabase
      .from('organizations')
      .select('id, name')
      .order('id', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!latestOrg) {
      console.error('No organization found in the database.');
      return new Response('Configuration Error: No Org Found', { status: 500 });
    }

    const targetOrgId = latestOrg.id;

    // STEP 2: USER IDENTIFICATION FOR THIS SPECIFIC ORG
    
    // Check if the sender is an existing Admin or Tenant for THIS organization
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, full_name, role')
      .eq('org_id', targetOrgId)
      .ilike('phone', `%${phoneSuffix}`)
      .maybeSingle();

    let isNewToOrg = false;

    if (!profile) {
      // Not a formal profile, check if they are already in the requester (approval) table for THIS org
      const { data: requester } = await supabase
        .from('requesters')
        .select('id, status')
        .eq('org_id', targetOrgId)
        .ilike('phone', `%${phoneSuffix}`)
        .maybeSingle();

      if (!requester) {
        // First time this number has messaged this specific organization
        await supabase.from('requesters').insert([{
          phone: cleanFrom,
          org_id: targetOrgId,
          status: 'pending',
          created_at: new Date().toISOString()
        }]);
        isNewToOrg = true;
      }
    }

    // STEP 3: LOG THE SERVICE REQUEST
    // Remove "join" keywords often sent during Twilio sandbox setup
    const cleanBody = body.replace(/join\s+[a-z-]+\s*/gi, '').trim();
    let title = cleanBody.slice(0, 40) || 'Maintenance Request';
    
    // AI Title Generation (Gemini 3 Flash)
    if (process.env.API_KEY && cleanBody.length > 5) {
      try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const res = await ai.models.generateContent({
          model: 'gemini-3-flash-preview',
          contents: `Summarize this maintenance issue into a 3-word title: "${cleanBody}"`,
        });
        if (res.text) title = res.text.trim().replace(/[".*]/g, '');
      } catch (e) {
        console.error('Gemini Title Generation Failed:', e);
      }
    }

    const srId = `SR-${Math.floor(100000 + Math.random() * 900000)}`;
    await supabase.from('service_requests').insert([{
      id: srId,
      org_id: targetOrgId,
      title: title,
      description: cleanBody,
      requester_phone: cleanFrom,
      status: 'New',
      source: 'WhatsApp',
      created_at: new Date().toISOString()
    }]);

    // STEP 4: PREPARE WHATSAPP REPLY
    let reply = `✅ Ticket ${srId} logged for ${latestOrg.name}.`;
    
    if (profile) {
      reply = `✅ Hello ${profile.full_name}! Ticket ${srId} logged to your ${profile.role} dashboard for ${latestOrg.name}.`;
    } else if (isNewToOrg) {
      reply = `✅ Welcome! Ticket ${srId} logged for ${latestOrg.name}. Since you are new to this facility, an admin will review your contact for approval.`;
    }

    return new Response(`<?xml version="1.0" encoding="UTF-8"?><Response><Message>${reply}</Message></Response>`, {
      headers: { 'Content-Type': 'text/xml' },
    });

  } catch (err: any) {
    console.error('Webhook Runtime Error:', err);
    return new Response('Internal Webhook Error', { status: 500 });
  }
}


import { GoogleGenAI } from "@google/genai";
import { createClient } from '@supabase/supabase-js';

export const config = {
  runtime: 'edge',
};

export default async function handler(req: Request) {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  // Use Service Role key if available to bypass RLS for webhook operations
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

    // STEP 1: IDENTIFY THE LATEST ORGANIZATION
    // We strictly use the most recently created organization for this demo.
    const { data: latestOrg, error: orgError } = await supabase
      .from('organizations')
      .select('id, name')
      .order('id', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (orgError || !latestOrg) {
      console.error('Organization fetch error:', orgError);
      return new Response('Error: No active organization found in database.', { status: 500 });
    }

    const targetOrgId = latestOrg.id;

    // STEP 2: CHECK IDENTITY WITHIN THIS ORGANIZATION ONLY
    
    // Check if phone belongs to a Profile (Admin/Tenant) of the LATEST org
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, full_name, role')
      .eq('org_id', targetOrgId)
      .ilike('phone', `%${phoneSuffix}`)
      .maybeSingle();

    let userStatus: 'profile' | 'existing_requester' | 'new_requester' = 'profile';

    if (!profile) {
      // Check if phone is already a known Requester for the LATEST org
      const { data: requester } = await supabase
        .from('requesters')
        .select('id, status')
        .eq('org_id', targetOrgId)
        .ilike('phone', `%${phoneSuffix}`)
        .maybeSingle();

      if (requester) {
        userStatus = 'existing_requester';
      } else {
        // Brand new contact for this specific org - create a pending approval
        await supabase.from('requesters').insert([{
          phone: cleanFrom,
          org_id: targetOrgId,
          status: 'pending',
          created_at: new Date().toISOString()
        }]);
        userStatus = 'new_requester';
      }
    }

    // STEP 3: LOG THE SERVICE REQUEST
    // Clean Twilio join keywords
    const cleanBody = body.replace(/join\s+[a-z-]+\s*/gi, '').trim();
    let title = cleanBody.slice(0, 40) || 'Maintenance Request';
    
    // AI Title Generation (Gemini 3 Flash)
    if (process.env.API_KEY && cleanBody.length > 5) {
      try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const res = await ai.models.generateContent({
          model: 'gemini-3-flash-preview',
          contents: `Create a 3-word title for this maintenance report: "${cleanBody}"`,
        });
        if (res.text) title = res.text.trim().replace(/[".*]/g, '');
      } catch (e) {
        console.error('AI Title Failed:', e);
      }
    }

    const srId = `SR-${Math.floor(100000 + Math.random() * 900000)}`;
    const { error: srError } = await supabase.from('service_requests').insert([{
      id: srId,
      org_id: targetOrgId,
      title: title,
      description: cleanBody,
      requester_phone: cleanFrom,
      status: 'New',
      source: 'WhatsApp',
      created_at: new Date().toISOString()
    }]);

    if (srError) {
      console.error('SR Insert Error:', srError);
      return new Response('Error saving ticket', { status: 500 });
    }

    // STEP 4: PREPARE RESPONSE
    let reply = `✅ Ticket ${srId} logged for ${latestOrg.name}.`;
    
    if (userStatus === 'profile' && profile) {
      reply = `✅ Hello ${profile.full_name}! Ticket ${srId} logged to your ${profile.role} dashboard for ${latestOrg.name}.`;
    } else if (userStatus === 'new_requester') {
      reply = `✅ Welcome to ${latestOrg.name}! Ticket ${srId} logged. Since you are a new contact, an administrator will verify your access shortly.`;
    } else if (userStatus === 'existing_requester') {
      reply = `✅ Ticket ${srId} logged for ${latestOrg.name}. Your contact is currently pending approval.`;
    }

    return new Response(`<?xml version="1.0" encoding="UTF-8"?><Response><Message>${reply}</Message></Response>`, {
      headers: { 'Content-Type': 'text/xml' },
    });

  } catch (err: any) {
    console.error('Webhook Fatal Error:', err);
    return new Response('Internal Server Error', { status: 500 });
  }
}

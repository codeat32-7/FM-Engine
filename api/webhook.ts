
import { GoogleGenAI } from "@google/genai";
import { createClient } from '@supabase/supabase-js';

export const config = {
  runtime: 'edge',
};

export default async function handler(req: Request) {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  // Use Service Role key to bypass RLS for webhook logic
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

    // 1. SELECT THE LATEST ORGANIZATION (Demo Scope)
    const { data: latestOrg, error: orgError } = await supabase
      .from('organizations')
      .select('id, name')
      .order('id', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (orgError || !latestOrg) {
      console.error('Org Error:', orgError);
      return new Response('No organization found.', { status: 500 });
    }

    const targetOrgId = latestOrg.id;

    // 2. IDENTIFY SENDER WITHIN THIS SPECIFIC ORGANIZATION
    let identifiedUser: { name?: string; role?: string; isNew: boolean } = { isNew: false };

    // A. Search in Profiles for Admin/Tenant within this org
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, full_name, role')
      .eq('org_id', targetOrgId)
      .ilike('phone', `%${phoneSuffix}`)
      .maybeSingle();

    if (profile) {
      identifiedUser = { 
        name: profile.full_name, 
        role: profile.role, 
        isNew: false 
      };
    } else {
      // B. Search in Requesters table for this org
      const { data: requester } = await supabase
        .from('requesters')
        .select('id, status')
        .eq('org_id', targetOrgId)
        .ilike('phone', `%${phoneSuffix}`)
        .maybeSingle();

      if (requester) {
        identifiedUser = { 
          role: 'requester', 
          isNew: false 
        };
      } else {
        // C. Completely new contact -> Create Requester record (Approval)
        await supabase.from('requesters').insert([{
          phone: cleanFrom,
          org_id: targetOrgId,
          status: 'pending',
          created_at: new Date().toISOString()
        }]);
        identifiedUser = { isNew: true };
      }
    }

    // 3. LOG THE SERVICE REQUEST
    const cleanBody = body.replace(/join\s+[a-z-]+\s*/gi, '').trim();
    let title = cleanBody.slice(0, 40) || 'Maintenance Request';
    
    // AI Title Generation (Gemini 3 Flash)
    if (process.env.API_KEY && cleanBody.length > 5) {
      try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const res = await ai.models.generateContent({
          model: 'gemini-3-flash-preview',
          contents: `Summarize this maintenance request into a 3-word title: "${cleanBody}"`,
        });
        if (res.text) title = res.text.trim().replace(/[".*]/g, '');
      } catch (e) {
        console.error('AI Title Failure:', e);
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

    // 4. PREPARE TWILIO RESPONSE
    let reply = "";
    if (identifiedUser.isNew) {
      reply = `✅ Ticket ${srId} logged for ${latestOrg.name}. Welcome! Since this is your first time, an administrator will verify your access shortly.`;
    } else if (identifiedUser.role === 'admin' || identifiedUser.role === 'tenant') {
      reply = `✅ Hello ${identifiedUser.name || 'Resident'}! Ticket ${srId} has been logged to the ${latestOrg.name} dashboard.`;
    } else {
      reply = `✅ Ticket ${srId} logged for ${latestOrg.name}. We will notify you once your contact is approved and the ticket is assigned.`;
    }

    return new Response(`<?xml version="1.0" encoding="UTF-8"?><Response><Message>${reply}</Message></Response>`, {
      headers: { 'Content-Type': 'text/xml' },
    });

  } catch (err: any) {
    console.error('Webhook Fatal Error:', err);
    return new Response('Internal Server Error', { status: 500 });
  }
}

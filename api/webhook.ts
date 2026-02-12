
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

    // 1. Standardize Phone (Last 10 digits only for matching)
    const cleanFrom = from.replace(/[^0-9]/g, '');
    const phoneSuffix = cleanFrom.slice(-10);

    // 2. Resolve Identity (Check if Admin or Tenant exists)
    let { data: profile } = await supabase
      .from('profiles')
      .select('org_id, full_name, role')
      .ilike('phone', `%${phoneSuffix}`)
      .maybeSingle();

    let orgId = profile?.org_id;

    // 3. Check if already in Approvals queue
    if (!orgId) {
      const { data: existingReq } = await supabase
        .from('requesters')
        .select('org_id')
        .ilike('phone', `%${phoneSuffix}`)
        .eq('status', 'pending')
        .maybeSingle();
      
      if (existingReq) orgId = existingReq.org_id;
    }

    // 4. Stranger Path (No ID, no existing request)
    if (!orgId) {
      // Fallback: For demo/testing, assign to the most recently created organization
      // In a production multi-tenant app, you'd use a unique WhatsApp number per Org 
      // or a keyword, but for this MVP we route to the latest one.
      const { data: latestOrg } = await supabase
        .from('organizations')
        .select('id')
        .order('id', { ascending: false })
        .limit(1)
        .maybeSingle();

      orgId = latestOrg?.id;

      if (orgId) {
        // Create requester entry for the Admin's Approval list
        await supabase.from('requesters').upsert({
          phone: cleanFrom,
          org_id: orgId,
          status: 'pending',
          created_at: new Date().toISOString()
        }, { onConflict: 'phone' });
      }
    }

    if (!orgId) return new Response('No Org found', { status: 404 });

    // 5. Generate Title with AI
    let title = body.trim().slice(0, 40) || 'Maintenance Request';
    if (process.env.API_KEY && body.length > 5) {
      try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const res = await ai.models.generateContent({
          model: 'gemini-3-flash-preview',
          contents: `Summarize this issue into a 3-word title: "${body}"`,
        });
        if (res.text) title = res.text.trim().replace(/[".*]/g, '');
      } catch (e) {}
    }

    // 6. Create Service Request
    const srId = `SR-${Math.floor(100000 + Math.random() * 900000)}`;
    await supabase.from('service_requests').insert([{
      id: srId,
      org_id: orgId,
      title: title,
      description: body,
      requester_phone: cleanFrom,
      status: 'New',
      source: 'WhatsApp',
      created_at: new Date().toISOString()
    }]);

    const reply = profile?.role === 'admin' 
      ? `✅ Admin: Ticket ${srId} logged to your facility.`
      : `✅ Ticket ${srId} logged. Our maintenance team has been notified.`;

    return new Response(`<?xml version="1.0" encoding="UTF-8"?><Response><Message>${reply}</Message></Response>`, {
      headers: { 'Content-Type': 'text/xml' },
    });

  } catch (err: any) {
    return new Response('Error', { status: 500 });
  }
}

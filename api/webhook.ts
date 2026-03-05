
import { GoogleGenAI } from "@google/genai";
import { createClient } from '@supabase/supabase-js';

export const config = {
  runtime: 'edge',
};

export default async function handler(req: Request) {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  // Initialize Supabase with Service Role to ensure we can search across the database
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

    // STEP 1: EXTRACT AND NORMALIZE PHONE NUMBER
    // Extract digits and take the last 10 digits
    const rawDigits = from.replace(/[^0-9]/g, '');
    const phoneSuffix = rawDigits.slice(-10);

    let targetOrgId: string | null = null;
    let targetSiteId: string | null = null;
    let identifiedUserType: 'admin' | 'tenant' | 'pending' | 'new' = 'new';
    let userName = '';
    let adminSiteCount = 0;
    let orgSites: { id: string, name: string }[] = [];

    // STEP 2: IDENTIFY USER
    // Check Profiles (Admin/Staff)
    const { data: profiles } = await supabase
      .from('profiles')
      .select('org_id, full_name')
      .ilike('phone', `%${phoneSuffix}`)
      .limit(1);

    if (profiles && profiles.length > 0) {
      const profile = profiles[0];
      targetOrgId = profile.org_id;
      identifiedUserType = 'admin';
      userName = profile.full_name || '';

      // For Admins, check how many sites they have
      const { data: sites } = await supabase
        .from('sites')
        .select('id, name')
        .eq('org_id', targetOrgId);
      
      orgSites = sites || [];
      adminSiteCount = orgSites.length;

      if (adminSiteCount === 1) {
        targetSiteId = orgSites[0].id;
      }
      // If > 1, targetSiteId remains null (Admin will assign in dashboard)
    } else {
      // Check Tenants (Residents)
      const { data: tenants } = await supabase
        .from('tenants')
        .select('org_id, name, site_id')
        .ilike('phone', `%${phoneSuffix}`)
        .limit(1);

      if (tenants && tenants.length > 0) {
        const tenant = tenants[0];
        targetOrgId = tenant.org_id;
        targetSiteId = tenant.site_id;
        identifiedUserType = 'tenant';
        userName = tenant.name || '';
      } else {
        // Check Requesters (Pending)
        const { data: requesters } = await supabase
          .from('requesters')
          .select('org_id')
          .ilike('phone', `%${phoneSuffix}`)
          .limit(1);

        if (requesters && requesters.length > 0) {
          targetOrgId = requesters[0].org_id;
          identifiedUserType = 'pending';
        }
      }
    }

    // STEP 3: HANDLE NEW USERS
    if (!targetOrgId) {
      const { data: latestOrg } = await supabase
        .from('organizations')
        .select('id, name')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!latestOrg) {
        return new Response('Configuration Error: No organizations exist.', { status: 500 });
      }

      targetOrgId = latestOrg.id;
      identifiedUserType = 'new';

      await supabase.from('requesters').insert([{
        phone: rawDigits,
        org_id: targetOrgId,
        status: 'pending',
        created_at: new Date().toISOString()
      }]);
    }

    // GET ORG NAME FOR RESPONSE
    const { data: orgInfo } = await supabase
      .from('organizations')
      .select('name')
      .eq('id', targetOrgId)
      .single();

    // STEP 3: IDENTIFY INTENT WITH AI
    let intent: 'NEW' | 'UPDATE' | 'QUERY' = 'NEW';
    let targetSrId: string | null = null;
    let aiTitle = '';

    // Fetch open SRs for this phone to provide context to AI
    const { data: openSrs } = await supabase
      .from('service_requests')
      .select('id, title, status')
      .ilike('requester_phone', `%${phoneSuffix}`)
      .neq('status', 'Closed')
      .order('created_at', { ascending: false });

    const geminiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
    if (geminiKey) {
      try {
        const ai = new GoogleGenAI({ apiKey: geminiKey });
        const context = openSrs && openSrs.length > 0 
          ? `User Name: ${userName || 'Unknown'}. Active tickets for this user: ${openSrs.map(s => `[${s.id}: ${s.title}]`).join(', ')}`
          : `User Name: ${userName || 'Unknown'}. No active tickets.`;

        const prompt = `
          User Message: "${body}"
          ${context}
          
          Classify this message into one of these types:
          1. NEW: User is reporting a new issue.
          2. UPDATE: User is providing more info or asking about an existing ticket listed above.
          3. QUERY: General greeting or question not related to a specific maintenance issue.

          If UPDATE, specify which Ticket ID it refers to.
          If NEW, provide a 3-word title for the request.

          Return ONLY a JSON object: {"type": "NEW" | "UPDATE" | "QUERY", "ticketId": "SR-XXXXXX" | null, "title": "string" | null}
        `;

        const res = await ai.models.generateContent({
          model: 'gemini-3-flash-preview',
          contents: prompt,
          config: { responseMimeType: 'application/json' }
        });

        if (res.text) {
          const result = JSON.parse(res.text);
          intent = result.type;
          targetSrId = result.ticketId;
          aiTitle = result.title || '';
        }
      } catch (e) {
        console.error('AI Classification Error:', e);
      }
    }

    // STEP 4: EXECUTE INTENT
    let reply = '';
    const cleanBody = body.replace(/join\s+[a-z-]+\s*/gi, '').trim();

    if (intent === 'UPDATE' && targetSrId) {
      // Add message to existing SR
      await supabase.from('sr_messages').insert([{
        sr_id: targetSrId,
        org_id: targetOrgId,
        sender_id: from,
        sender_role: 'tenant',
        content: cleanBody,
        is_whatsapp: true
      }]);
      reply = `📝 Message added to Ticket ${targetSrId}. We'll get back to you soon!`;
    } else if (intent === 'QUERY') {
      reply = `👋 Hello! I'm the FM Engine assistant for ${orgInfo?.name}. To report a maintenance issue, just describe it here.`;
    } else {
      // Create NEW SR
      const srId = `SR-${Math.floor(100000 + Math.random() * 900000)}`;
      await supabase.from('service_requests').insert([{
        id: srId,
        org_id: targetOrgId,
        site_id: targetSiteId,
        title: aiTitle || cleanBody.slice(0, 40),
        description: cleanBody,
        requester_phone: from,
        status: 'New',
        source: 'WhatsApp',
        created_at: new Date().toISOString()
      }]);

      if (identifiedUserType === 'new') {
        reply = `✅ Welcome! Ticket ${srId} logged for ${orgInfo?.name}. An administrator will verify your access shortly.`;
      } else {
        reply = `✅ Ticket ${srId} logged for ${orgInfo?.name}. We'll update you as we progress.`;
      }
    }

    return new Response(`<?xml version="1.0" encoding="UTF-8"?><Response><Message>${reply}</Message></Response>`, {
      headers: { 'Content-Type': 'text/xml' },
    });

  } catch (err: any) {
    console.error('Webhook Runtime Error:', err);
    return new Response('Internal Server Error', { status: 500 });
  }
}

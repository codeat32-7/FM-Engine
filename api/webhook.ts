
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
    let identifiedUserType: 'profile' | 'tenant' | 'requester' | 'new' = 'new';
    let userName = '';

    // STEP 2: CHECK PROFILES TABLE
    const { data: profile } = await supabase
      .from('profiles')
      .select('org_id, full_name, site_id')
      .ilike('phone', `%${phoneSuffix}`)
      .maybeSingle();

    if (profile && profile.org_id) {
      targetOrgId = profile.org_id;
      identifiedUserType = 'profile';
      userName = profile.full_name || '';
      targetSiteId = profile.site_id;
      
      // Try to find a site for this profile via tenant table if not in profile
      if (!targetSiteId) {
        const { data: tenantForProfile } = await supabase
          .from('tenants')
          .select('site_id')
          .ilike('phone', `%${phoneSuffix}`)
          .maybeSingle();
        if (tenantForProfile) targetSiteId = tenantForProfile.site_id;
      }
    }

    // STEP 3: IF NOT FOUND IN PROFILES (OR NO SITE FOUND FOR PROFILE), CHECK TENANT TABLE
    if (!targetSiteId) {
      const { data: tenant } = await supabase
        .from('tenants')
        .select('org_id, name, site_id')
        .ilike('phone', `%${phoneSuffix}`)
        .maybeSingle();

      if (tenant && tenant.org_id) {
        targetOrgId = tenant.org_id;
        identifiedUserType = 'tenant';
        userName = tenant.name || '';
        targetSiteId = tenant.site_id;
      }
    }

    // STEP 4: IF STILL NOT FOUND, CHECK REQUESTER TABLE
    if (!targetOrgId) {
      const { data: requester } = await supabase
        .from('requesters')
        .select('org_id')
        .ilike('phone', `%${phoneSuffix}`)
        .maybeSingle();

      if (requester && requester.org_id) {
        targetOrgId = requester.org_id;
        identifiedUserType = 'requester';
      }
    }

    // STEP 5: IF NO MATCH EXISTS IN ANY TABLE (NEW USER)
    if (!targetOrgId) {
      // Retrieve the most recently created Organization
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

      // Create a new Requester record
      await supabase.from('requesters').insert([{
        phone: rawDigits,
        org_id: targetOrgId,
        status: 'pending',
        created_at: new Date().toISOString()
      }]);
    }

    // FALLBACK FOR SITE ID: If we still don't have a site_id (e.g. new user or profile with no tenant record)
    // assign the most recently created site in the organization
    if (targetOrgId && !targetSiteId) {
      const { data: latestSite } = await supabase
        .from('sites')
        .select('id')
        .eq('org_id', targetOrgId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (latestSite) targetSiteId = latestSite.id;
    }

    // GET ORG NAME FOR RESPONSE
    const { data: orgInfo } = await supabase
      .from('organizations')
      .select('name')
      .eq('id', targetOrgId)
      .single();

    // LOG THE SERVICE REQUEST
    const cleanBody = body.replace(/join\s+[a-z-]+\s*/gi, '').trim();
    let title = cleanBody.slice(0, 40) || 'Maintenance Request';
    
    // AI Title Generation
    if (process.env.API_KEY && cleanBody.length > 5) {
      try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const res = await ai.models.generateContent({
          model: 'gemini-3-flash-preview',
          contents: `Summarize this maintenance request into a 3-word title: "${cleanBody}"`,
        });
        if (res.text) title = res.text.trim().replace(/[".*]/g, '');
      } catch (e) {
        console.error('AI Processing Error:', e);
      }
    }

    const srId = `SR-${Math.floor(100000 + Math.random() * 900000)}`;
    await supabase.from('service_requests').insert([{
      id: srId,
      org_id: targetOrgId,
      site_id: targetSiteId,
      title: title,
      description: cleanBody,
      requester_phone: from,
      status: 'New',
      source: 'WhatsApp',
      created_at: new Date().toISOString()
    }]);

    // PREPARE TWILIO RESPONSE
    let reply = `✅ Ticket ${srId} logged for ${orgInfo?.name || 'Facility'}.`;
    
    if (identifiedUserType === 'new') {
      reply = `✅ Welcome! Ticket ${srId} logged for ${orgInfo?.name}. As you are a new contact, an administrator will verify your access shortly.`;
    } else if (identifiedUserType === 'profile' || identifiedUserType === 'tenant') {
      reply = `✅ Hello ${userName || 'Resident'}! Ticket ${srId} has been logged to the ${orgInfo?.name} dashboard.`;
    } else if (identifiedUserType === 'requester') {
      reply = `✅ Ticket ${srId} logged for ${orgInfo?.name}. Note: Your contact is still pending administrator approval.`;
    }

    return new Response(`<?xml version="1.0" encoding="UTF-8"?><Response><Message>${reply}</Message></Response>`, {
      headers: { 'Content-Type': 'text/xml' },
    });

  } catch (err: any) {
    console.error('Webhook Runtime Error:', err);
    return new Response('Internal Server Error', { status: 500 });
  }
}

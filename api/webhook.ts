
import { GoogleGenAI, Type } from "@google/genai";
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
    process.env.SUPABASE_ANON_KEY || ''
  );

  try {
    const formData = await req.formData();
    const body = formData.get('Body') as string || '';
    const from = formData.get('From') as string || ''; 

    if (!body) return new Response('No body found', { status: 400 });

    const cleanFrom = from.replace('whatsapp:', '').replace('+', '');

    // 1. Determine the Organization ID
    let orgId: string | null = null;
    let siteId: string | null = null;
    let senderName: string = 'New Requester';

    // Try finding tenant
    const { data: tenant, error: tenantErr } = await supabase.from('tenants').select('org_id, site_id, name').eq('phone', cleanFrom).maybeSingle();
    
    if (tenant) {
      orgId = tenant.org_id;
      siteId = tenant.site_id;
      senderName = tenant.name;
    } else {
      // Try finding existing requester
      const { data: requester, error: requesterLookupErr } = await supabase.from('requesters').select('org_id').eq('phone', cleanFrom).maybeSingle();
      
      if (requester) {
        orgId = requester.org_id;
      } else {
        // Fallback: Pick any organization if none found (for sandbox/demo)
        const { data: orgs, error: orgLookupErr } = await supabase.from('organizations').select('id').limit(1);
        orgId = orgs?.[0]?.id || null;
        
        if (orgId) {
          // Attempt to create requester, but don't fail the whole SR if this table is missing
          const { error: insErr } = await supabase.from('requesters').insert([{
            phone: cleanFrom,
            org_id: orgId,
            status: 'pending',
            created_at: new Date().toISOString()
          }]);
          
          if (insErr) {
             console.error("Requester Insert Error:", insErr);
             // If table is missing, we inform the user via WhatsApp for debugging
             if (insErr.message.includes('does not exist')) {
               return new Response(`<?xml version="1.0" encoding="UTF-8"?><Response><Message>⚠️ Database Error: The 'requesters' table is missing. Admin needs to run the SQL migration in Supabase Editor.</Message></Response>`, {
                 headers: { 'Content-Type': 'text/xml' },
               });
             }
          }
        }
      }
    }

    if (!orgId) {
      return new Response(`<?xml version="1.0" encoding="UTF-8"?><Response><Message>⚠️ Setup Error: No organization found. Please log in to the FM Engine web app first to create your organization.</Message></Response>`, {
        headers: { 'Content-Type': 'text/xml' },
      });
    }

    // 2. AI Extraction
    let title = body.slice(0, 40);
    try {
      if (process.env.API_KEY && body.length > 10) {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const response = await ai.models.generateContent({
          model: 'gemini-3-flash-preview',
          contents: `Extract a short title for this maintenance issue: "${body}"`,
          config: {
            systemInstruction: "Return only a 3-5 word title. No JSON, just plain text.",
          }
        });
        if (response.text) title = response.text.trim();
      }
    } catch (e) { console.warn("AI Title Fail", e); }

    // 3. Create Service Request
    const srId = `SR-${Math.floor(Math.random() * 9000) + 1000}`;
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
      return new Response(`<?xml version="1.0" encoding="UTF-8"?><Response><Message>❌ DB Error: ${srErr.message}</Message></Response>`, {
        headers: { 'Content-Type': 'text/xml' },
      });
    }

    const confirmationMsg = `✅ Ticket ${srId} logged: "${title}".\n\nStatus: Pending Review.`;

    return new Response(`<?xml version="1.0" encoding="UTF-8"?><Response><Message>${confirmationMsg}</Message></Response>`, {
      headers: { 'Content-Type': 'text/xml' },
    });

  } catch (error: any) {
    return new Response(`<?xml version="1.0" encoding="UTF-8"?><Response><Message>🔥 Critical Webhook Error: ${error.message}</Message></Response>`, {
      headers: { 'Content-Type': 'text/xml' },
    });
  }
}

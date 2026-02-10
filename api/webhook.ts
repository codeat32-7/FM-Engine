
import { GoogleGenAI, Type } from "@google/genai";
import { createClient } from '@supabase/supabase-js';

export const config = {
  runtime: 'edge',
};

export default async function handler(req: Request) {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  try {
    const formData = await req.formData();
    const body = formData.get('Body') as string;
    const from = formData.get('From') as string; // e.g. "whatsapp:+1234567890"

    if (!body) return new Response('No body found', { status: 400 });

    const cleanFrom = from.replace('whatsapp:', '').replace('+', '');
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const supabase = createClient(
      process.env.SUPABASE_URL || '',
      process.env.SUPABASE_ANON_KEY || ''
    );

    // 1. Handle "join [sandbox-code]" specifically
    if (body.toLowerCase().trim().startsWith('join')) {
      const { data: existingTenant } = await supabase.from('tenants').select('id').eq('phone', cleanFrom).maybeSingle();
      if (existingTenant) {
        return new Response(`<?xml version="1.0" encoding="UTF-8"?><Response><Message>👋 You are already an approved tenant! Use this chat to report issues anytime.</Message></Response>`, {
          headers: { 'Content-Type': 'text/xml' },
        });
      }

      const { data: existingRequester } = await supabase.from('requesters').select('id').eq('phone', cleanFrom).maybeSingle();
      
      if (!existingRequester) {
        const { data: orgs } = await supabase.from('organizations').select('id').limit(1);
        const orgId = orgs?.[0]?.id;

        await supabase.from('requesters').insert([{
          phone: cleanFrom,
          org_id: orgId,
          status: 'pending',
          created_at: new Date().toISOString()
        }]);
      }

      return new Response(`<?xml version="1.0" encoding="UTF-8"?><Response><Message>🚀 Welcome to FM Engine! Your request to join has been logged. Our manager will approve your access shortly. You can still report issues by texting them here!</Message></Response>`, {
        headers: { 'Content-Type': 'text/xml' },
      });
    }

    // 2. Identify sender (Tenant or Requester)
    const { data: tenant } = await supabase.from('tenants').select('org_id, site_id, name').eq('phone', cleanFrom).maybeSingle();
    let requester = null;
    let orgId = null;

    if (tenant) {
      orgId = tenant.org_id;
    } else {
      const { data: existingRequester } = await supabase.from('requesters').select('org_id, phone').eq('phone', cleanFrom).maybeSingle();
      requester = existingRequester;
      
      if (!requester) {
        // Auto-create requester if number is unknown so we can log the ticket
        const { data: orgs } = await supabase.from('organizations').select('id').limit(1);
        orgId = orgs?.[0]?.id;
        
        const { data: newReq, error: reqErr } = await supabase.from('requesters').insert([{
          phone: cleanFrom,
          org_id: orgId,
          status: 'pending',
          created_at: new Date().toISOString()
        }]).select().single();
        
        if (!reqErr) requester = newReq;
      } else {
        orgId = requester.org_id;
      }
    }

    const siteId = tenant?.site_id || null;
    const senderName = tenant?.name || 'New User';

    // 3. AI Extraction
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Extract maintenance info from this WhatsApp message: "${body}"`,
      config: {
        systemInstruction: "You are a maintenance dispatcher assistant. Extract a concise title and an asset name hint (if any) from the message. Return as valid JSON.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            assetNameHint: { type: Type.STRING },
          },
          required: ["title", "assetNameHint"]
        }
      }
    });

    const extracted = JSON.parse(response.text || '{}');

    // 4. Save Ticket
    const srId = `SR-${Math.floor(Math.random() * 9000) + 1000}`;
    const newSR = {
      id: srId,
      org_id: orgId,
      site_id: siteId,
      title: extracted.title || 'WhatsApp Request',
      description: `[From ${senderName}]: ${body}`,
      requester_phone: cleanFrom,
      status: 'New',
      source: 'WhatsApp',
      created_at: new Date().toISOString(),
    };

    const { error: srErr } = await supabase.from('service_requests').insert([newSR]);
    if (srErr) throw srErr;

    const confirmationMsg = tenant 
      ? `✅ Ticket ${srId} logged for ${tenant.name}.\nTitle: ${newSR.title}`
      : `✅ Ticket ${srId} logged. Please wait for manager approval to access your resident portal.`;

    return new Response(`<?xml version="1.0" encoding="UTF-8"?><Response><Message>${confirmationMsg}</Message></Response>`, {
      headers: { 'Content-Type': 'text/xml' },
    });
  } catch (error: any) {
    console.error('Webhook Error:', error);
    return new Response(`Error: ${error.message}`, { status: 500 });
  }
}

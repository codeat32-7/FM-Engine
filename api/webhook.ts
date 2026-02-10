
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

    const cleanFrom = from.replace('whatsapp:', '');

    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const supabase = createClient(
      process.env.SUPABASE_URL || '',
      process.env.SUPABASE_ANON_KEY || ''
    );

    // 1. Identify Organization by looking up the sender (Tenant)
    const { data: tenant } = await supabase
      .from('tenants')
      .select('org_id, site_id, name')
      .eq('phone', cleanFrom)
      .single();

    if (!tenant) {
      // For MVP: Log the request but we might want to reject unknown numbers
      // In a real app, we'd send a reply asking them to register.
      return new Response(`<?xml version="1.0" encoding="UTF-8"?><Response><Message>⚠️ Number not recognized. Please contact your facility manager to register ${cleanFrom}.</Message></Response>`, {
        headers: { 'Content-Type': 'text/xml' },
      });
    }

    // 2. AI Extraction for details
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Extract maintenance info from: "${body}"`,
      config: {
        systemInstruction: "Analyze the message and return a concise JSON title and assetNameHint. If no asset, use 'General'.",
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

    // 3. Save Ticket under Tenant's Org/Site
    const srId = `SR-${Math.floor(Math.random() * 9000) + 1000}`;
    const newSR = {
      id: srId,
      org_id: tenant.org_id,
      site_id: tenant.site_id,
      title: extracted.title || 'WhatsApp Request',
      description: `[Reported by ${tenant.name}]: ${body}`,
      status: 'New',
      source: 'WhatsApp',
      created_at: new Date().toISOString(),
    };

    const { error } = await supabase.from('service_requests').insert([newSR]);
    if (error) throw error;

    const twiml = `<?xml version="1.0" encoding="UTF-8"?><Response><Message>✅ Logged for ${tenant.name} at Site: ${srId}\nTitle: ${newSR.title}</Message></Response>`;
    
    return new Response(twiml, {
      headers: { 'Content-Type': 'text/xml' },
    });
  } catch (error: any) {
    console.error('Webhook Error:', error);
    return new Response(`Error: ${error.message}`, { status: 500 });
  }
}

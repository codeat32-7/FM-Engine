
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
    const from = formData.get('From') as string;

    if (!body) return new Response('No body found', { status: 400 });

    // 1. Initialize Gemini & Supabase (Using env vars injected by Vercel)
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
    const supabase = createClient(
      process.env.SUPABASE_URL || '',
      process.env.SUPABASE_ANON_KEY || ''
    );

    // 2. AI Extraction
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Extract maintenance info from: "${body}"`,
      config: {
        systemInstruction: "Extract a concise 'title' and identify 'siteNameHint' and 'assetNameHint' from this maintenance request message. Return JSON.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            siteNameHint: { type: Type.STRING },
            assetNameHint: { type: Type.STRING },
          },
          required: ["title", "siteNameHint", "assetNameHint"]
        }
      }
    });

    const extracted = JSON.parse(response.text || '{}');

    // 3. Simple Fuzzy Matching (Optional - could be improved by querying DB first)
    // For this MVP, we save the raw hints and the AI-generated title.
    
    const newSR = {
      id: `SR-${Math.floor(Math.random() * 9000) + 1000}`,
      title: extracted.title || 'Untitled Request',
      description: `[WhatsApp from ${from}]: ${body}`,
      status: 'New',
      source: 'WhatsApp',
      created_at: new Date().toISOString(),
      // In a real app, you'd look up site_id and asset_id based on hints here.
    };

    const { error } = await supabase.from('service_requests').insert([newSR]);

    if (error) throw error;

    // 4. Return TwiML (Optional - tells Twilio what to reply)
    const twiml = `<?xml version="1.0" encoding="UTF-8"?><Response><Message>✅ Request Logged: ${newSR.id}\nTitle: ${newSR.title}\nStatus: New</Message></Response>`;
    
    return new Response(twiml, {
      headers: { 'Content-Type': 'text/xml' },
    });
  } catch (error: any) {
    console.error('Webhook Error:', error);
    return new Response(`Error: ${error.message}`, { status: 500 });
  }
}

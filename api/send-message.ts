import { toWhatsAppAddress } from '../lib/phone';

export const config = {
  runtime: 'edge',
};

export default async function handler(req: Request) {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  try {
    const { phone, content } = await req.json();

    if (!phone || !content) {
      return new Response('Missing phone or content', { status: 400 });
    }

    // 1. Trigger Twilio Outbound
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    let from = process.env.TWILIO_PHONE_NUMBER;

    if (accountSid && authToken && from) {
      if (!from.startsWith('whatsapp:')) from = `whatsapp:${from}`;
      const auth = btoa(`${accountSid}:${authToken}`);
      const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
      
      const toPhone = toWhatsAppAddress(phone);
      
      const params = new URLSearchParams();
      params.append('To', toPhone);
      params.append('From', from);
      params.append('Body', content);

      const twilioRes = await fetch(twilioUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
      });

      const responseData = await twilioRes.json();

      if (!twilioRes.ok) {
        console.error('Twilio API Error Details:', responseData);
        return new Response(JSON.stringify({ 
          success: false, 
          error: responseData.message,
          code: responseData.code 
        }), { 
          status: twilioRes.status,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      console.log(`[OUTBOUND WHATSAPP] Sent successfully to ${toPhone}. SID: ${responseData.sid}`);
    } else {
      console.warn('[OUTBOUND WHATSAPP] Twilio credentials missing, skipping real send.');
      console.log(`[SIMULATED] To: ${phone}, Content: ${content}`);
    }

    // 2. Log the message in Supabase (if not already logged by the frontend)
    // The frontend usually logs it first, but we can ensure it here if needed.
    
    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (err: any) {
    console.error('Send Message Error:', err);
    return new Response('Internal Server Error', { status: 500 });
  }
}

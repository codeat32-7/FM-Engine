# Mainti - Real-Time CMMS

## 🚀 Correct Setup Path

### 1. Twilio Webhook (Crucial)
1. Log in to [Twilio Console](https://www.twilio.com/console).
2. Go to **Messaging** > **Try it out** > **Send a WhatsApp message**.
3. **DO NOT** use the guided message steps. Look at the top tabs and click **"Sandbox Settings"**.
4. Paste your Vercel URL: `https://[YOUR_VERCEL_DOMAIN]/api/webhook` into the **"When a message comes in"** box.
5. Set the method to **POST** and click **Save**.

### 2. Supabase Realtime
1. Go to your [Supabase Dashboard](https://supabase.com).
2. Click the **Database** icon in the left sidebar.
3. Click **Publications** (NOT Replication).
4. Select `supabase_realtime`.
5. Add the `service_requests` table to the publication and save.

### 3. Vercel Environment Variables
Add these keys in Vercel Project Settings:
- `API_KEY`: Google Gemini API Key.
- `SUPABASE_URL`: Your Supabase Project URL.
- `SUPABASE_ANON_KEY`: Your Supabase Anon Key.

/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  readonly VITE_TWILIO_WHATSAPP_NUMBER: string;
  /** Exact Twilio sandbox prefill, e.g. `join bad-color` from Sandbox Settings */
  readonly VITE_TWILIO_SANDBOX_JOIN: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

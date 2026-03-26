
import { createClient } from '@supabase/supabase-js';

export function getSupabaseConfig(): { url: string; anonKey: string } {
  const meta = import.meta.env;
  const win =
    typeof window !== 'undefined'
      ? ((window as unknown as { process?: { env?: Record<string, string> } }).process?.env || {})
      : {};
  return {
    url: (meta.VITE_SUPABASE_URL || win.SUPABASE_URL || '') as string,
    anonKey: (meta.VITE_SUPABASE_ANON_KEY || win.SUPABASE_ANON_KEY || '') as string,
  };
}

const { url, anonKey } = getSupabaseConfig();
export const supabase = createClient(
  url || 'https://local.invalid',
  anonKey || 'invalid-key'
);

export interface ConnectionStatus {
  connected: boolean;
  error?: string;
  needsSetup?: boolean;
}

export const checkSchemaReady = async (): Promise<ConnectionStatus> => {
  const { url: u, anonKey: k } = getSupabaseConfig();
  if (!u?.trim() || !k?.trim()) {
    return {
      connected: false,
      error: 'Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env (or SUPABASE_URL / SUPABASE_ANON_KEY).',
    };
  }
  try {
    const { error: orgErr } = await supabase.from('organizations').select('id').limit(1);

    if (orgErr) {
      if (orgErr.message?.includes('does not exist') || orgErr.code === '42P01') {
        return { connected: false, needsSetup: true, error: "Missing 'organizations' table." };
      }
      return { connected: false, error: orgErr.message };
    }

    const { error: profErr } = await supabase.from('profiles').select('id, site_id').limit(1);
    if (profErr) {
      if (profErr.message?.includes('does not exist') || profErr.code === '42P01') {
        return { connected: false, needsSetup: true, error: 'Profiles table not found.' };
      }
      if (profErr.message?.includes('column "site_id" does not exist') || profErr.code === '42703' || profErr.message?.includes('site_id')) {
        return { connected: false, needsSetup: true, error: "Profiles table is missing 'site_id' column." };
      }
    }

    const { error: srErr } = await supabase.from('service_requests').select('id, site_id, asset_id').limit(1);
    if (srErr) {
      if (srErr.message?.includes('does not exist') || srErr.code === '42P01') {
        return { connected: false, needsSetup: true, error: 'Service Requests table not found.' };
      }
      if (srErr.message?.includes('column') || srErr.code === '42703') {
        return { connected: false, needsSetup: true, error: 'Service Requests table is missing columns.' };
      }
    }

    return { connected: true };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    return { connected: false, error: msg };
  }
};
